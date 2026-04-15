import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} from "../middleware/rate-limiter";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email-service";
import { computeUserCapabilities } from "./capabilities";
import { generateArtistCode } from "../utils/artist-code";

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if an email is whitelisted as TSR (Technical Service Representative).
 * Returns true if found in tsr_whitelist with is_active = true.
 */
async function isTsrWhitelisted(email: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT id FROM tsr_whitelist WHERE email = ${email.toLowerCase()} AND is_active = true LIMIT 1`,
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function getTokenFromRequest(req: Request): string | null {
  // 1. Try Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
  // 2. Try HttpOnly cookie
  if (req.cookies?.auth_token) return req.cookies.auth_token as string;
  return null;
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Don't set domain — browser defaults to exact current host (works on any deployment)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

// ─── Session management helpers ───────────────────────────────────────────────

/**
 * Hash a JWT to store in active_sessions (SHA-256, hex).
 * We never store the raw token server-side.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Parse a User-Agent string into a human-readable device label.
 */
function parseDevice(ua?: string): string {
  if (!ua) return "Unknown device";
  const browser =
    ua.match(
      /(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\/\s]?([\d.]+)?/i,
    )?.[0] || "Browser";
  const os =
    ua
      .match(
        /(Windows|Mac OS X|Linux|Android|iPhone|iPad|iPod)[\/\s]?([\d._]+)?/i,
      )?.[0]
      ?.replace(/_/g, ".") || "OS";
  return `${browser} on ${os}`;
}

/**
 * Create a session record after successful login.
 * Optionally revokes all other sessions for the same user (single-session mode).
 */
async function createSession(
  userId: number | string,
  token: string,
  req: Request,
  opts: { revokeOthers?: boolean } = {},
): Promise<void> {
  try {
    const tHash = hashToken(token);
    const numericUserId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;

    // Skip for test/gate users with id 0 or non-numeric ids
    if (isNaN(numericUserId) || numericUserId === 0) return;

    const device = parseDevice(req.headers["user-agent"]);
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    // Decode JWT to get expiry
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Optionally revoke all other active sessions for this user
    if (opts.revokeOthers) {
      await db
        .update(schema.activeSessions)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "new_login",
        })
        .where(
          and(
            eq(schema.activeSessions.userId, numericUserId),
            eq(schema.activeSessions.isRevoked, false),
          ),
        );
    }

    // Insert new session
    await db.insert(schema.activeSessions).values({
      userId: numericUserId,
      tokenHash: tHash,
      device,
      ip,
      country: null, // Could be enriched via IP lookup later
      city: null,
      isRevoked: false,
      expiresAt,
    });
  } catch (err) {
    // Non-fatal — log but don't block login
    console.warn("[SESSION] Failed to create session record:", err);
  }
}

/**
 * Revoke a session by token hash.
 */
async function revokeSessionByHash(
  tokenHash: string,
  reason: string,
): Promise<void> {
  await db
    .update(schema.activeSessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(eq(schema.activeSessions.tokenHash, tokenHash));
}

/**
 * Check if a token is revoked.
 * Returns true if the session exists AND is revoked.
 * Returns false if not found (legacy tokens before session tracking) or not revoked.
 */
async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const tHash = hashToken(token);
    const [session] = await db
      .select({ isRevoked: schema.activeSessions.isRevoked })
      .from(schema.activeSessions)
      .where(eq(schema.activeSessions.tokenHash, tHash))
      .limit(1);
    // If no session record found, it's a legacy token — allow it through
    if (!session) return false;
    return session.isRevoked === true;
  } catch {
    // If active_sessions table doesn't exist yet, don't block
    return false;
  }
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(50)
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  businessName: z.string().max(200).optional(),
  businessType: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ─── Constants ────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS =
  process.env.NODE_ENV === "production"
    ? 15 * 60 * 1000 // 15 minutes in production
    : 2 * 60 * 1000; // 2 minutes in development
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ─── Superadmin Passepartout ──────────────────────────────────────────────────
// This account bypasses verification checks and is never restricted
// SECURITY: Must be set via SUPERADMIN_EMAIL env var in production
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

/** Returns true if the given email is the superadmin passepartout account */
function isSuperadmin(email: string): boolean {
  // If no superadmin email is configured, no one can be superadmin via this check
  if (!SUPERADMIN_EMAIL) return false;
  return email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Create a new user account with hashed password
 */
router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const {
      email,
      password,
      username,
      firstName,
      lastName,
      businessName,
      businessType,
      phone,
    } = parsed.data;

    // Check duplicate email
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      // Generic message to avoid user enumeration
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const derivedUsername = username || email.split("@")[0];
    const autoVerify = isSuperadmin(email);

    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        username: derivedUsername,
        password: hashedPassword,
        role: autoVerify ? "superuser" : "user",
        isVerified: autoVerify, // only superadmin is auto-verified; all others must verify email
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      });

    // Superadmin passepartout — auto-verified, return token immediately
    if (autoVerify) {
      const token = jwt.sign(
        {
          userId: String(newUser.id),
          email: newUser.email,
          role: newUser.role || "superuser",
        },
        getJwtSecret(),
        { expiresIn: JWT_EXPIRES_IN },
      );
      setAuthCookie(res, token);
      await createSession(newUser.id, token, req);
      res.status(201).json({
        success: true,
        token,
        user: {
          id: String(newUser.id),
          email: newUser.email,
          name: derivedUsername,
          role: newUser.role,
        },
      });
      return;
    }

    // All non-superadmin accounts must verify their email before logging in
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(schema.verificationTokens).values({
      userId: newUser.id,
      token: verificationToken,
      type: "email_verification",
      expiresAt: tokenExpiry,
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(email.toLowerCase(), verificationToken)
      .then((sent) => {
        if (sent) {
          console.log(`[AUTH] Verification email sent to ${email}`);
        } else {
          console.warn(`[AUTH] Failed to send verification email to ${email}`);
        }
      })
      .catch((err) => {
        console.error(`[AUTH] Verification email error for ${email}:`, err);
      });

    // Do NOT auto-login — user must verify email first
    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Account created! Check your email for a verification link.",
      user: {
        id: String(newUser.id),
        email: newUser.email,
        role: newUser.role || "user",
      },
    });
  }),
);

/**
 * POST /auth/login
 * Login with email + password. Validates against DB with bcrypt.
 */
router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    // Bypass Drizzle type issues with parameterized raw SQL query
    const result = await db.execute(
      sql`SELECT id, username, email, password, role, is_verified, display_name,
                 failed_login_attempts, locked_until,
                 subscription_tier, subscription_status, trial_tier, trial_started_at, trial_expires_at
          FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`,
    );

    const user = result.rows?.[0] as any;

    // Account lockout check
    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const unlockMins = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 60000,
      );
      res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${unlockMins} minute(s).`,
      });
      return;
    }

    // Generic invalid-credential message to prevent user enumeration
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Detect OAuth-only users (they have random hex passwords, not user-set)
    const oauthCheck = await db.execute(
      sql`SELECT oauth_provider FROM users WHERE id = ${user.id} AND oauth_provider IS NOT NULL LIMIT 1`,
    );
    if ((oauthCheck.rows?.length ?? 0) > 0) {
      const provider = (oauthCheck.rows[0] as any).oauth_provider;
      res.status(400).json({
        success: false,
        message: `This account uses ${provider} sign-in. Please sign in with ${provider} instead.`,
        oauthProvider: provider,
      });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

      await db
        .update(schema.users)
        .set({
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MS)
            : null,
        })
        .where(eq(schema.users.id, user.id));

      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Check email verification — all unverified users blocked (superadmin auto-bypasses)
    if (!user.is_verified && !isSuperadmin(email)) {
      res.status(403).json({
        success: false,
        requiresVerification: true,
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        email: user.email,
      });
      return;
    }

    // Successful login — reset failure counters
    await db
      .update(schema.users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id));

    // TSR whitelist check: if user is whitelisted + high-tier, upgrade role
    let effectiveLoginRole = user.role || "user";
    const userTier = (user.subscription_tier || "free").toLowerCase();
    if (
      effectiveLoginRole === "user" &&
      ["max", "enterprise"].includes(userTier) &&
      (await isTsrWhitelisted(user.email))
    ) {
      effectiveLoginRole = "tsr";
      // Persist role upgrade on first match
      if (user.role !== "tsr") {
        await db
          .update(schema.users)
          .set({ role: "tsr" })
          .where(eq(schema.users.id, user.id));
      }
    }

    const token = jwt.sign(
      {
        userId: String(user.id),
        email: user.email,
        role: effectiveLoginRole,
        subscriptionTier: user.subscription_tier || "free",
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);
    await createSession(user.id, token, req, { revokeOthers: true });

    // Compute capabilities for portal access info
    let capabilities: any = null;
    try {
      capabilities = await computeUserCapabilities(user.id);
    } catch (e) {
      console.warn("[AUTH] Could not compute capabilities on login:", e);
    }

    const displayName = user.display_name || null;

    res.json({
      success: true,
      token,
      needsDisplayName: !displayName, // true when the user hasn't set their name yet
      user: {
        id: String(user.id),
        email: user.email,
        name: displayName || user.username || null,
        username: user.username || null,
        role: effectiveLoginRole,
        subscriptionTier: user.subscription_tier || "free",
        subscriptionStatus: user.subscription_status || "active",
        trialTier: user.trial_tier || null,
        trialExpiresAt: user.trial_expires_at || null,
        portals: capabilities?.portals || ["general"],
        hasArtistProfile: capabilities?.hasArtistProfile || false,
        isContractor: capabilities?.isContractor || false,
      },
    });
  }),
);

/**
 * POST /auth/logout
 * Clears the auth cookie server-side and revokes the current session
 */
router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response) => {
    // Revoke the current session
    const token = getTokenFromRequest(req);
    if (token) {
      try {
        await revokeSessionByHash(hashToken(token), "logout");
      } catch (e) {
        console.warn("[SESSION] Failed to revoke session on logout:", e);
      }
    }
    res.clearCookie("auth_token", { path: "/" });
    res.json({ success: true });
  }),
);

/**
 * GET /auth/verify-email
 * Verifies user's email via token from the verification email link.
 * Marks user as verified, deletes token, redirects to login page.
 */
router.get(
  "/verify-email",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      // Redirect to signin with error
      const appUrl = (
        process.env.APP_PUBLIC_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.VERSOAIR_URL ||
        ""
      ).replace(/\/$/, "");
      res.redirect(`${appUrl}/signin?verification=invalid`);
      return;
    }

    // Find token in database
    const result = await db.execute(
      sql`SELECT vt.id, vt.user_id, vt.expires_at, u.email, u.is_verified 
          FROM verification_tokens vt 
          JOIN users u ON u.id = vt.user_id 
          WHERE vt.token = ${token} AND vt.type = 'email_verification' 
          LIMIT 1`,
    );

    const tokenRecord = result.rows?.[0] as any;

    if (!tokenRecord) {
      const appUrl = (
        process.env.APP_PUBLIC_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.VERSOAIR_URL ||
        ""
      ).replace(/\/$/, "");
      res.redirect(`${appUrl}/signin?verification=invalid`);
      return;
    }

    // Check if already verified
    if (tokenRecord.is_verified) {
      // Delete the token and redirect to login
      await db.execute(
        sql`DELETE FROM verification_tokens WHERE id = ${tokenRecord.id}`,
      );
      const appUrl = (
        process.env.APP_PUBLIC_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.VERSOAIR_URL ||
        ""
      ).replace(/\/$/, "");
      res.redirect(`${appUrl}/signin?verification=already`);
      return;
    }

    // Check token expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await db.execute(
        sql`DELETE FROM verification_tokens WHERE id = ${tokenRecord.id}`,
      );
      const appUrl = (
        process.env.APP_PUBLIC_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.VERSOAIR_URL ||
        ""
      ).replace(/\/$/, "");
      res.redirect(`${appUrl}/signin?verification=expired`);
      return;
    }

    // Mark user as verified
    await db
      .update(schema.users)
      .set({ isVerified: true, verifiedAt: new Date() })
      .where(eq(schema.users.id, tokenRecord.user_id));

    // Delete used token
    await db.execute(
      sql`DELETE FROM verification_tokens WHERE user_id = ${tokenRecord.user_id} AND type = 'email_verification'`,
    );

    console.log(`[AUTH] Email verified for user ${tokenRecord.email}`);

    // --- Auto-login the newly verified user ---
    // Fetch full user record for JWT payload
    const verifiedUserResult = await db.execute(
      sql`SELECT id, email, role, subscription_tier, display_name, username FROM users WHERE id = ${tokenRecord.user_id} LIMIT 1`,
    );
    const verifiedUser = verifiedUserResult.rows?.[0] as any;

    const appUrl = (
      process.env.APP_PUBLIC_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.VERSOAIR_URL ||
      ""
    ).replace(/\/$/, "");

    if (verifiedUser) {
      const verifyToken = jwt.sign(
        {
          userId: String(verifiedUser.id),
          email: verifiedUser.email,
          role: verifiedUser.role || "user",
          subscriptionTier: verifiedUser.subscription_tier || "free",
        },
        getJwtSecret(),
        { expiresIn: JWT_EXPIRES_IN },
      );
      setAuthCookie(res, verifyToken);
      await createSession(verifiedUser.id, verifyToken, req, {
        revokeOthers: true,
      });

      const displayName =
        verifiedUser.display_name || verifiedUser.username || "";
      const needsName = !verifiedUser.display_name;
      const userName = encodeURIComponent(
        displayName || verifiedUser.email.split("@")[0],
      );
      res.redirect(
        `${appUrl}/signin?verification=success&autologin=1&name=${userName}&needsName=${needsName ? "1" : "0"}&role=${verifiedUser.role || "user"}`,
      );
    } else {
      // Fallback: no user found (shouldn't happen) — redirect to signin
      res.redirect(`${appUrl}/signin?verification=success`);
    }
  }),
);

/**
 * POST /auth/resend-verification
 * Resends the verification email for unverified accounts
 */
router.post(
  "/resend-verification",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    // Find user
    const result = await db.execute(
      sql`SELECT id, email, is_verified FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`,
    );
    const user = result.rows?.[0] as any;

    if (!user) {
      // Generic message to prevent user enumeration
      res.json({
        success: true,
        message:
          "If that email is registered, a verification link has been sent.",
      });
      return;
    }

    if (user.is_verified) {
      res.json({
        success: true,
        message: "This email is already verified. You can log in.",
      });
      return;
    }

    // Delete old verification tokens for this user
    await db.execute(
      sql`DELETE FROM verification_tokens WHERE user_id = ${user.id} AND type = 'email_verification'`,
    );

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(schema.verificationTokens).values({
      userId: user.id,
      token: verificationToken,
      type: "email_verification",
      expiresAt: tokenExpiry,
    });

    // Send verification email
    const sent = await sendVerificationEmail(user.email, verificationToken);

    if (sent) {
      console.log(`[AUTH] Verification email resent to ${user.email}`);
    } else {
      console.warn(
        `[AUTH] Failed to resend verification email to ${user.email}`,
      );
    }

    res.json({
      success: true,
      message:
        "If that email is registered, a verification link has been sent.",
    });
  }),
);

/**
 * GET /auth/verify
 * Verify token validity (checks cookie or Authorization header)
 */
router.get(
  "/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return;
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      res.json({ success: true, user: decoded });
    } catch {
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }
  }),
);

/**
 * GET /auth/session
 * Return current user info from token (JWT only — base64 geo-admin tokens removed)
 */
router.get(
  "/session",
  asyncHandler(async (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return;
    }

    try {
      // Try to verify as JWT
      const decoded: any = jwt.verify(token, getJwtSecret());
      const userId = decoded.userId || decoded.sub;

      // Query DB for up-to-date subscription fields
      const dbResult = await db.execute(
        sql`SELECT id, username, email, role, subscription_tier, subscription_status,
                   trial_tier, trial_started_at, trial_expires_at
            FROM users WHERE id = ${Number(userId)} LIMIT 1`,
      );
      const dbUser = dbResult.rows?.[0] as any;

      const isAdmin =
        (dbUser?.role || decoded.role) === "admin" ||
        (dbUser?.role || decoded.role) === "superuser" ||
        (dbUser?.role || decoded.role) === "moderator";

      // Fetch capabilities for portal access detection
      let capabilities: any = null;
      try {
        capabilities = await computeUserCapabilities(Number(userId));
      } catch (e) {
        console.warn("[AUTH] Could not compute capabilities:", e);
      }

      res.json({
        success: true,
        user: {
          id: userId,
          email: dbUser?.email || decoded.email || "",
          username: dbUser?.username || null,
          name:
            dbUser?.username ||
            decoded.name ||
            decoded.email?.split("@")[0] ||
            "User",
          isAdmin,
          role: dbUser?.role || decoded.role || "user",
          subscriptionTier: dbUser?.subscription_tier || "free",
          subscriptionStatus: dbUser?.subscription_status || "active",
          trialTier: dbUser?.trial_tier || null,
          trialStartedAt: dbUser?.trial_started_at || null,
          trialExpiresAt: dbUser?.trial_expires_at || null,
          // Portal capabilities
          portals: capabilities?.portals || ["general"],
          hasArtistProfile: capabilities?.hasArtistProfile || false,
          isContractor: capabilities?.isContractor || false,
          hasOAuthAccount: capabilities?.hasOAuthAccount || false,
          canAccessBlog: capabilities?.canAccessBlog || false,
        },
      });
    } catch {
      res
        .status(401)
        .json({ success: false, user: null, message: "Not authenticated" });
    }
  }),
);

/**
 * POST /auth/forgot-password
 * Generate a time-limited password reset token and (in production) send email
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    // Always respond 200 to prevent email enumeration
    const GENERIC_OK = {
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    };

    const [user] = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.email, parsed.data.email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.json(GENERIC_OK);
      return;
    }

    // Sign a short-lived reset token containing the user id
    const resetToken = jwt.sign(
      { userId: String(user.id), purpose: "password_reset" },
      getJwtSecret(),
      { expiresIn: "1h" } as any,
    );

    // Store hashed reset token in DB
    const hashedResetToken = await bcrypt.hash(resetToken, 8);
    await db
      .update(schema.users)
      .set({
        passwordResetToken: hashedResetToken,
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      })
      .where(eq(schema.users.id, user.id));

    // Send reset email (silently fails if SMTP not configured — token is still valid)
    const sent = await sendPasswordResetEmail(user.email, resetToken);
    if (!sent) {
      console.warn(
        `[AUTH] SMTP not configured — password reset requested for ${user.email} but email could not be sent.`,
      );
    }

    res.json(GENERIC_OK);
  }),
);

/**
 * POST /auth/admin-gate
 * Issues a JWT for users who have a gate_username set in the DB.
 * Requires the user's account password for verification.
 * The frontend auto-fills the gate_username; user only types their password.
 */
router.post(
  "/admin-gate",
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username) {
      return res.status(403).json({
        success: false,
        message: "Username is required.",
      });
    }

    if (!password) {
      return res.status(403).json({
        success: false,
        message: "Password is required.",
      });
    }

    // ─── Admin gate credentials from environment variables ──────────────────────
    // Reads ADMIN_GATE_1_EMAIL/USERNAME/PASSWORD/ROLE through ADMIN_GATE_3_*
    // Falls back to empty — if env vars not set, gate credentials simply won't match.
    const GATE_CREDENTIALS: Record<
      string,
      { password: string; role: string; email: string }
    > = {};
    for (let i = 1; i <= 3; i++) {
      const email = process.env[`ADMIN_GATE_${i}_EMAIL`] || "";
      const uname = process.env[`ADMIN_GATE_${i}_USERNAME`] || "";
      const pass = process.env[`ADMIN_GATE_${i}_PASSWORD`] || "";
      const role = process.env[`ADMIN_GATE_${i}_ROLE`] || "user";
      if (uname && pass) {
        GATE_CREDENTIALS[uname.toLowerCase()] = { password: pass, role, email };
      }
    }

    let testKey = username.toLowerCase();
    let testMatch = GATE_CREDENTIALS[testKey];
    // Also allow login by email (user may type email in username field)
    if (!testMatch) {
      const byEmail = Object.entries(GATE_CREDENTIALS).find(
        ([_, cred]) => cred.email.toLowerCase() === username.toLowerCase(),
      );
      if (byEmail) {
        testKey = byEmail[0];
        testMatch = byEmail[1];
      }
    }
    if (testMatch && password === testMatch.password) {
      const token = jwt.sign(
        {
          userId: "test-" + testKey,
          email: testMatch.email,
          role: testMatch.role,
          subscriptionTier: "enterprise",
        },
        getJwtSecret(),
        { expiresIn: JWT_EXPIRES_IN },
      );
      setAuthCookie(res, token);
      // Test/gate users have id=0 — session creation skips non-numeric ids
      await createSession(0, token, req);
      return res.json({
        success: true,
        token,
        user: {
          id: 0,
          email: testMatch.email,
          username: testKey,
          role: testMatch.role,
          subscriptionTier: "enterprise",
        },
      });
    }
    // ─── End hardcoded test credentials ─────────────────────────────────────────

    // Look up user by gate_username
    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        password: schema.users.password,
        role: schema.users.role,
        subscriptionTier: schema.users.subscriptionTier,
      })
      .from(schema.users)
      .where(eq(schema.users.gateUsername, username.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // 🔒 Verify password — no more username-only access
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(403).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // � .test email enforcement — GeoAdmin accounts must use .test domain
    if (user.email && !user.email.endsWith(".test")) {
      return res.status(403).json({
        success: false,
        message:
          "GeoAdmin access requires a .test email domain. Please register a .test account.",
      });
    }

    // �🛡️ Role gate — admin, superuser & moderator may enter
    const allowedRoles = ["admin", "superuser", "moderator"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin, CEO, or Moderator clearance required.",
      });
    }

    const token = jwt.sign(
      {
        userId: String(user.id),
        email: user.email,
        role: user.role || "admin",
        subscriptionTier: user.subscriptionTier || "enterprise",
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);
    await createSession(user.id, token, req, { revokeOthers: true });

    // Compute capabilities for portal access
    let capabilities: any = null;
    try {
      capabilities = await computeUserCapabilities(user.id);
    } catch (e) {
      console.warn("[AUTH] Could not compute capabilities on admin-gate:", e);
    }

    res.json({
      success: true,
      token,
      user: {
        id: String(user.id),
        email: user.email,
        username: username,
        role: user.role || "admin",
        portals: capabilities?.portals || ["general"],
      },
    });
  }),
);

/**
 * POST /auth/geo-admin
 * ⛔ DISABLED — This endpoint previously issued admin JWTs with a weak 7-char password.
 * All admin access now requires proper authentication via /auth/login.
 * Only superuser accounts have unrestricted access.
 */
router.post(
  "/geo-admin",
  asyncHandler(async (req: Request, res: Response) => {
    res.status(403).json({
      success: false,
      message:
        "Geo-admin gate is disabled. Use standard login with proper credentials.",
    });
  }),
);

/**
 * POST /auth/register-geoadmin
 * Create a new GeoAdmin account — .test email domain REQUIRED.
 * Sets role to 'admin', assigns gate_username, grants geo-admin portal access.
 */
const registerGeoAdminSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(254)
    .refine((e) => e.endsWith(".test"), {
      message: "GeoAdmin accounts must use a .test email domain",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  gateUsername: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(50)
    .regex(
      /^[a-z0-9_]+$/,
      "Username must be lowercase alphanumeric with underscores only",
    ),
});

router.post(
  "/register-geoadmin",
  registerLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerGeoAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
    }

    const { email, password, gateUsername } = parsed.data;

    // Block non-.test domains (double-check)
    if (!email.endsWith(".test")) {
      return res.status(403).json({
        success: false,
        message:
          "Only .test email domains are allowed for GeoAdmin registration.",
      });
    }

    // Check duplicate email
    const existingEmail = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Check duplicate gate_username
    const existingGate = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.gateUsername, gateUsername.toLowerCase()))
      .limit(1);

    if (existingGate.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This admin username is already taken.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        username: gateUsername.toLowerCase(),
        password: hashedPassword,
        role: "admin",
        isVerified: true, // .test accounts are auto-verified
        gateUsername: gateUsername.toLowerCase(),
        portalAccess: ["general", "geo-admin"],
        subscriptionTier: "enterprise",
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      });

    // Issue JWT immediately
    const token = jwt.sign(
      {
        userId: String(newUser.id),
        email: newUser.email,
        role: newUser.role || "admin",
        subscriptionTier: "enterprise",
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);
    await createSession(newUser.id, token, req);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: String(newUser.id),
        email: newUser.email,
        username: gateUsername.toLowerCase(),
        role: newUser.role,
      },
    });
  }),
);

/**
 * POST /auth/reset-password
 * Validate reset token and set new hashed password
 */
router.post(
  "/reset-password",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { token, password } = parsed.data;

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired.",
      });
      return;
    }

    if (decoded.purpose !== "password_reset") {
      res.status(400).json({ success: false, message: "Invalid reset token." });
      return;
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, Number(decoded.userId)))
      .limit(1);

    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired.",
      });
      return;
    }

    if (new Date(user.passwordResetExpires) < new Date()) {
      res.status(400).json({
        success: false,
        message: "Reset link has expired. Request a new one.",
      });
      return;
    }

    const tokenValid = await bcrypt.compare(token, user.passwordResetToken);
    if (!tokenValid) {
      res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await db
      .update(schema.users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(schema.users.id, user.id));

    res.clearCookie("auth_token", { path: "/" });
    res.json({
      success: true,
      message: "Password has been reset. Please sign in.",
    });
  }),
);

/**
 * POST /auth/start-trial
 * Start a 7-day free trial for the authenticated user.
 * Body: { tier: "essential" | "verified" | "max" | "enterprise" }
 * Only one trial is allowed — re-trials are blocked.
 */
const startTrialSchema = z.object({
  tier: z.enum(["essential", "verified", "max", "enterprise"]),
});

router.post(
  "/start-trial",
  asyncHandler(async (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
      return;
    }

    const userId = Number(decoded.userId);
    if (!userId || isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user session" });
      return;
    }

    const parsed = startTrialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Valid tier required (essential, verified, max, enterprise)",
      });
      return;
    }

    // Check if user already used a trial
    const userResult = await db.execute(
      sql`SELECT id, trial_tier, trial_started_at, subscription_tier FROM users WHERE id = ${userId} LIMIT 1`,
    );
    const user = userResult.rows?.[0] as any;

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (user.trial_started_at) {
      res.status(409).json({
        success: false,
        message: "You have already used your free trial. Upgrade to continue.",
      });
      return;
    }

    // Activate 7-day trial
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db
      .update(schema.users)
      .set({
        trialTier: parsed.data.tier,
        trialStartedAt: now,
        trialExpiresAt: expiresAt,
      })
      .where(eq(schema.users.id, userId));

    console.log(
      `[AUTH] Trial started: user ${userId} → tier ${parsed.data.tier} until ${expiresAt.toISOString()}`,
    );

    res.json({
      success: true,
      trial: {
        tier: parsed.data.tier,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// � USER ACCOUNT — self-service profile, password, and preferences
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /auth/account/profile
 * Get current user's profile information
 */
router.get(
  "/account/profile",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const [user] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        role: schema.users.role,
        isVerified: schema.users.isVerified,
        subscriptionTier: schema.users.subscriptionTier,
        subscriptionStatus: schema.users.subscriptionStatus,
        oauthProvider: schema.users.oauthProvider,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.json({ success: true, profile: user });
  }),
);

/**
 * PUT /auth/account/profile
 * Update current user's display name (username)
 */
router.put(
  "/account/profile",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const { username } = req.body;
    if (
      !username ||
      typeof username !== "string" ||
      username.trim().length < 2
    ) {
      res.status(400).json({
        success: false,
        message: "Username must be at least 2 characters",
      });
      return;
    }
    // Check uniqueness
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(eq(schema.users.username, username.trim()), sql`id != ${userId}`),
      )
      .limit(1);
    if (existing.length > 0) {
      res
        .status(409)
        .json({ success: false, message: "Username already taken" });
      return;
    }
    await db
      .update(schema.users)
      .set({ username: username.trim() })
      .where(eq(schema.users.id, userId));
    res.json({ success: true, message: "Profile updated" });
  }),
);

/**
 * POST /auth/account/set-display-name
 * Set or update the user's display name.
 * First-time set (displayName is null) — no password required.
 * Subsequent changes — requires current password for security.
 */
router.post(
  "/account/set-display-name",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { displayName, currentPassword } = req.body;

    if (
      !displayName ||
      typeof displayName !== "string" ||
      displayName.trim().length < 2
    ) {
      res.status(400).json({
        success: false,
        message: "Display name must be at least 2 characters",
      });
      return;
    }

    if (displayName.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "Display name cannot exceed 50 characters",
      });
      return;
    }

    // Fetch current user
    const [user] = await db
      .select({
        displayName: schema.users.displayName,
        password: schema.users.password,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // If display name already exists, require password verification
    if (user.displayName) {
      if (!currentPassword) {
        res.status(400).json({
          success: false,
          requiresPassword: true,
          message:
            "Please enter your current password to change your display name",
        });
        return;
      }

      const passwordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!passwordValid) {
        res.status(403).json({
          success: false,
          message: "Current password is incorrect",
        });
        return;
      }
    }

    // Update display name
    await db
      .update(schema.users)
      .set({ displayName: displayName.trim() })
      .where(eq(schema.users.id, userId));

    res.json({
      success: true,
      message: user.displayName
        ? "Display name updated"
        : "Welcome aboard! Your name is set.",
      displayName: displayName.trim(),
    });
  }),
);

/**
 * POST /auth/account/change-password
 * Authenticated user changes their own password
 */
router.post(
  "/account/change-password",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Both current and new password required",
      });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
      return;
    }
    const [user] = await db
      .select({
        password: schema.users.password,
        oauthProvider: schema.users.oauthProvider,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    if (user.oauthProvider) {
      res.status(400).json({
        success: false,
        message: `Cannot change password for ${user.oauthProvider} accounts`,
      });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
      return;
    }
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db
      .update(schema.users)
      .set({ password: hashed })
      .where(eq(schema.users.id, userId));

    // Revoke ALL sessions on password change (security best practice)
    try {
      await db
        .update(schema.activeSessions)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "password_change",
        })
        .where(
          and(
            eq(schema.activeSessions.userId, userId),
            eq(schema.activeSessions.isRevoked, false),
          ),
        );
    } catch (e) {
      console.warn(
        "[SESSION] Failed to revoke sessions on password change:",
        e,
      );
    }

    res.json({ success: true, message: "Password changed successfully" });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 SESSION MANAGEMENT — View, revoke, and manage active sessions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /auth/sessions
 * List all active sessions for the current user.
 * Returns device info, IP, location, and timestamps.
 */
router.get(
  "/sessions",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const numericId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (isNaN(numericId) || numericId === 0) {
      return res.json({ success: true, sessions: [] });
    }

    const sessions = await db
      .select({
        id: schema.activeSessions.id,
        device: schema.activeSessions.device,
        ip: schema.activeSessions.ip,
        country: schema.activeSessions.country,
        city: schema.activeSessions.city,
        isRevoked: schema.activeSessions.isRevoked,
        revokedReason: schema.activeSessions.revokedReason,
        lastActive: schema.activeSessions.lastActive,
        expiresAt: schema.activeSessions.expiresAt,
        createdAt: schema.activeSessions.createdAt,
      })
      .from(schema.activeSessions)
      .where(eq(schema.activeSessions.userId, numericId))
      .orderBy(sql`created_at DESC`)
      .limit(20);

    // Mark the current session
    const currentToken = getTokenFromRequest(req);
    const currentHash = currentToken ? hashToken(currentToken) : null;

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        // Check if this is the current session by matching hash
        let isCurrent = false;
        if (currentHash) {
          const [match] = await db
            .select({ tokenHash: schema.activeSessions.tokenHash })
            .from(schema.activeSessions)
            .where(
              and(
                eq(schema.activeSessions.id, s.id),
                eq(schema.activeSessions.tokenHash, currentHash),
              ),
            )
            .limit(1);
          isCurrent = !!match;
        }
        return { ...s, isCurrent };
      }),
    );

    res.json({ success: true, sessions: enriched });
  }),
);

/**
 * POST /auth/logout-all
 * Revokes ALL sessions for the current user (including current).
 * Clears the auth cookie.
 */
router.post(
  "/logout-all",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const numericId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (!isNaN(numericId) && numericId > 0) {
      await db
        .update(schema.activeSessions)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "logout_all",
        })
        .where(
          and(
            eq(schema.activeSessions.userId, numericId),
            eq(schema.activeSessions.isRevoked, false),
          ),
        );

      // Emit socket event to force-disconnect all tabs/devices
      try {
        const { getIO } = require("../websocket/socket-config");
        const io = getIO();
        if (io) {
          io.to(`user_${numericId}`).emit("force_logout", {
            reason: "All sessions revoked",
          });
        }
      } catch (e) {
        console.warn("[SESSION] Failed to emit force_logout:", e);
      }
    }

    res.clearCookie("auth_token", { path: "/" });
    res.json({ success: true, message: "All sessions revoked" });
  }),
);

/**
 * POST /auth/logout/:sessionId
 * Revokes a specific session by its ID.
 */
router.post(
  "/logout/:sessionId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const numericId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session ID" });
    }

    // Only allow revoking own sessions (unless admin)
    const userRole = (req as any).user?.role;
    const whereConditions = [eq(schema.activeSessions.id, sessionId)];
    if (userRole !== "superuser" && userRole !== "admin") {
      whereConditions.push(eq(schema.activeSessions.userId, numericId));
    }

    const result = await db
      .update(schema.activeSessions)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "manual_revoke",
      })
      .where(and(...whereConditions))
      .returning({
        id: schema.activeSessions.id,
        userId: schema.activeSessions.userId,
      });

    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Force-disconnect the revoked session's user via Socket.io
    try {
      const { getIO } = require("../websocket/socket-config");
      const io = getIO();
      if (io) {
        io.to(`user_${result[0].userId}`).emit("session_revoked", {
          sessionId,
          reason: "Session manually revoked",
        });
      }
    } catch (e) {
      console.warn("[SESSION] Failed to emit session_revoked:", e);
    }

    res.json({ success: true, message: "Session revoked" });
  }),
);

/**
 * GET /auth/admin/sessions
 * Admin-only: list all active sessions across all users.
 * Used for the admin session monitor panel.
 */
router.get(
  "/admin/sessions",
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    if (!userRole || !["superuser", "admin", "moderator"].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const sessions = await db.execute(sql`
      SELECT 
        s.id, s.user_id, s.device, s.ip, s.country, s.city,
        s.is_revoked, s.revoked_reason, s.last_active, s.expires_at, s.created_at,
        u.email, u.username, u.role
      FROM active_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.is_revoked = false AND s.expires_at > NOW()
      ORDER BY s.last_active DESC
      LIMIT 100
    `);

    res.json({ success: true, sessions: sessions.rows || [] });
  }),
);

/**
 * GET /auth/account/preferences
 * Get current user's preferences (stored as user_settings with sector='account')
 */
router.get(
  "/account/preferences",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(
        and(
          eq(schema.userSettings.userId, userId),
          eq(schema.userSettings.sector, "account"),
        ),
      );
    // Convert to a simple key-value object
    const prefs: Record<string, any> = {};
    for (const s of settings) {
      try {
        prefs[s.settingKey] =
          s.dataType === "boolean"
            ? s.settingValue === "true"
            : s.dataType === "number"
              ? Number(s.settingValue)
              : s.dataType === "json"
                ? JSON.parse(s.settingValue || "{}")
                : s.settingValue;
      } catch {
        prefs[s.settingKey] = s.settingValue;
      }
    }
    res.json({ success: true, preferences: prefs });
  }),
);

/**
 * PUT /auth/account/preferences
 * Save user preferences (bulk upsert)
 */
router.put(
  "/account/preferences",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== "object") {
      res
        .status(400)
        .json({ success: false, message: "preferences object required" });
      return;
    }
    // Upsert each preference key
    for (const [key, value] of Object.entries(preferences)) {
      const dataType =
        typeof value === "boolean"
          ? "boolean"
          : typeof value === "number"
            ? "number"
            : typeof value === "object"
              ? "json"
              : "string";
      const settingValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      await db
        .insert(schema.userSettings)
        .values({
          userId,
          sector: "account",
          settingKey: key,
          settingValue,
          dataType,
        })
        .onConflictDoUpdate({
          target: [
            schema.userSettings.userId,
            schema.userSettings.sector,
            schema.userSettings.settingKey,
          ],
          set: { settingValue, dataType, updatedAt: new Date() },
        });
    }
    res.json({ success: true, message: "Preferences saved" });
  }),
);

/**
 * DELETE /auth/account
 * Soft-delete: user can request account deletion
 */
router.delete(
  "/account",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    // Soft delete: scramble email & username, mark as deactivated
    const scramble = `deleted_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await db
      .update(schema.users)
      .set({
        email: `${scramble}@deleted.versoair.local`,
        username: scramble,
        role: "deleted",
        isVerified: false,
      })
      .where(eq(schema.users.id, userId));
    res.json({ success: true, message: "Account deleted" });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// �🔐 SUPERUSER ADMIN ENDPOINTS — credential & user management from Vault
// ═══════════════════════════════════════════════════════════════════════════════

/** Middleware: verify the caller is an authenticated superuser */
function requireSuperuser(req: Request, res: Response, next: Function) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (decoded.role !== "superuser") {
      res
        .status(403)
        .json({ success: false, message: "Superuser role required" });
      return;
    }
    (req as any).superuserId = decoded.userId;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

/**
 * GET /auth/admin/users
 * List all users with their account status (for Vault management panel)
 */
router.get(
  "/admin/users",
  requireSuperuser,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await db.execute(
      sql`SELECT id, username, email, role, is_verified, subscription_tier, subscription_status,
                 failed_login_attempts, locked_until, created_at
          FROM users ORDER BY id`,
    );
    res.json({
      success: true,
      users: result.rows.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role || "user",
        isVerified: u.is_verified,
        subscriptionTier: u.subscription_tier || "free",
        subscriptionStatus: u.subscription_status || "active",
        failedLoginAttempts: u.failed_login_attempts || 0,
        lockedUntil: u.locked_until,
        isLocked: u.locked_until
          ? new Date(u.locked_until) > new Date()
          : false,
        createdAt: u.created_at,
      })),
    });
  }),
);

/**
 * POST /auth/admin/unlock-user
 * Instantly unlock a locked account and reset failed attempts
 */
router.post(
  "/admin/unlock-user",
  requireSuperuser,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }
    await db
      .update(schema.users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, Number(userId)));
    console.log(
      `[ADMIN] User ${userId} unlocked by superuser ${(req as any).superuserId}`,
    );
    res.json({ success: true, message: "Account unlocked" });
  }),
);

/**
 * POST /auth/admin/change-password
 * Superuser changes any user's password directly (no old password needed)
 */
router.post(
  "/admin/change-password",
  requireSuperuser,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      res.status(400).json({
        success: false,
        message: "userId and newPassword are required",
      });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
      return;
    }
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db
      .update(schema.users)
      .set({ password: hashed, failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, Number(userId)));
    console.log(
      `[ADMIN] Password changed for user ${userId} by superuser ${(req as any).superuserId}`,
    );
    res.json({ success: true, message: "Password changed successfully" });
  }),
);

/**
 * POST /auth/admin/change-role
 * Superuser changes any user's role
 */
router.post(
  "/admin/change-role",
  requireSuperuser,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, newRole } = req.body;
    const validRoles = [
      "superuser",
      "admin",
      "moderator",
      "business_owner",
      "user",
    ];
    if (!userId || !newRole || !validRoles.includes(newRole)) {
      res.status(400).json({
        success: false,
        message: `userId and valid role required (${validRoles.join(", ")})`,
      });
      return;
    }
    await db
      .update(schema.users)
      .set({ role: newRole })
      .where(eq(schema.users.id, Number(userId)));
    console.log(
      `[ADMIN] Role changed for user ${userId} to ${newRole} by superuser ${(req as any).superuserId}`,
    );
    res.json({ success: true, message: `Role changed to ${newRole}` });
  }),
);

/**
 * POST /auth/admin/verify-user
 * Superuser manually verifies a user's email
 */
router.post(
  "/admin/verify-user",
  requireSuperuser,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }
    await db
      .update(schema.users)
      .set({ isVerified: true })
      .where(eq(schema.users.id, Number(userId)));
    console.log(
      `[ADMIN] User ${userId} verified by superuser ${(req as any).superuserId}`,
    );
    res.json({ success: true, message: "User verified" });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎵 ARTIST PORTAL AUTH — Real JWT authentication for StreamRoyale artists
// ═══════════════════════════════════════════════════════════════════════════════

const artistRegisterSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  stageName: z.string().min(1, "Stage name is required").max(100),
  legalName: z.string().max(200).optional(),
  genre: z.array(z.string()).max(3, "Maximum 3 genres").optional(),
  country: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  spotifyUrl: z.string().url().optional().or(z.literal("")),
  instagramHandle: z.string().max(100).optional(),
  artistRole: z
    .enum(["rapper", "composer", "dj", "producer", "singer", "sound_engineer"])
    .optional(),
});

const artistLoginSchema = z.union([
  z.object({
    email: z.string().email("Invalid email address").max(254),
    password: z.string().min(1, "Password is required").max(128),
  }),
  z.object({
    artistCode: z.string().min(3, "Artist code is required").max(100),
  }),
]);

// Hardcoded superuser artist code (exact case sensitive)
const SUPERUSER_ARTIST_CODE = "VA-jdcz-SYS_MASTER";

/**
 * POST /auth/artist/register
 * Create an artist account + artist_profiles row
 */
router.post(
  "/artist/register",
  registerLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = artistRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const {
      email,
      password,
      stageName,
      legalName,
      genre,
      country,
      bio,
      spotifyUrl,
      instagramHandle,
      artistRole,
    } = parsed.data;

    // Check duplicate email
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const derivedUsername = `artist_${email.split("@")[0]}`;

    // Create user with artist role + portal access
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        username: derivedUsername,
        password: hashedPassword,
        role: "artist",
        portalAccess: ["artist", "general"],
        isVerified: isSuperadmin(email), // superadmin auto-verified
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      });

    // Send verification email
    try {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      await db.insert(schema.verificationTokens).values({
        userId: newUser.id,
        token: verificationToken,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      await sendVerificationEmail(email.toLowerCase(), verificationToken);
    } catch (e) {
      console.error("[ARTIST AUTH] Failed to send verification email:", e);
    }

    // Determine league from country
    let leagueId: number | undefined;
    if (country) {
      try {
        const leagueResult = await db.execute(
          sql`SELECT id FROM regional_leagues LIMIT 1`,
        );
        // Auto-assign based on country — simplified mapping
        const countryLower = country.toLowerCase();
        let leagueName = "Americas"; // default
        const africaCountries = [
          "nigeria",
          "ghana",
          "kenya",
          "south africa",
          "senegal",
          "cameroon",
          "ethiopia",
          "tanzania",
          "morocco",
          "egypt",
          "algeria",
          "tunisia",
          "congo",
          "ivory coast",
          "uganda",
        ];
        const europeCountries = [
          "france",
          "germany",
          "uk",
          "united kingdom",
          "spain",
          "italy",
          "portugal",
          "netherlands",
          "belgium",
          "sweden",
          "norway",
          "denmark",
          "finland",
          "ireland",
          "austria",
          "switzerland",
          "poland",
          "czech",
          "romania",
          "greece",
        ];
        const asiaCountries = [
          "japan",
          "china",
          "korea",
          "india",
          "indonesia",
          "thailand",
          "vietnam",
          "philippines",
          "malaysia",
          "singapore",
          "australia",
          "new zealand",
          "pakistan",
          "bangladesh",
        ];
        const middleEastCountries = [
          "saudi",
          "uae",
          "qatar",
          "kuwait",
          "bahrain",
          "oman",
          "jordan",
          "lebanon",
          "israel",
          "turkey",
          "iran",
          "iraq",
        ];

        if (africaCountries.some((c) => countryLower.includes(c)))
          leagueName = "Africa";
        else if (europeCountries.some((c) => countryLower.includes(c)))
          leagueName = "Europe";
        else if (asiaCountries.some((c) => countryLower.includes(c)))
          leagueName = "Asia-Pacific";
        else if (middleEastCountries.some((c) => countryLower.includes(c)))
          leagueName = "Middle East";

        const league = await db.execute(
          sql`SELECT id FROM regional_leagues WHERE name = ${leagueName} LIMIT 1`,
        );
        if ((league.rows as any[]).length > 0) {
          leagueId = (league.rows[0] as any).id;
        }
      } catch (e) {
        // League table might not exist yet, skip
      }
    }

    // Create artist profile
    try {
      const artistCode = generateArtistCode(
        stageName,
        "discovery",
        new Date(),
        undefined,
        undefined,
        country || 0,
        "MOD",
        "x",
      );
      await db.insert(schema.artistProfiles).values({
        userId: newUser.id,
        stageName,
        legalName: legalName || null,
        genre: genre || [],
        country: country || null,
        bio: bio || null,
        spotifyUrl: spotifyUrl || null,
        instagramHandle: instagramHandle || null,
        artistRole: artistRole || null,
        leagueId: leagueId || null,
        payoutEmail: email.toLowerCase(),
        artistCode,
        division: "discovery",
        evaluationStatus: "pending",
        contractAccess: "none",
      });
    } catch (e) {
      // If artist_profiles table doesn't exist yet, continue — will be created on db:push
      console.warn("[ARTIST AUTH] Could not create artist profile:", e);
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Artist account created! Check your email to verify before logging in.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: "artist",
        stageName,
        genre: genre || [],
        country: country || null,
        artistCode: undefined as string | undefined,
      },
    });
  }),
);

/**
 * POST /auth/artist/login
 * Authenticate an artist and return JWT
 */
router.post(
  "/artist/login",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = artistLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const data = parsed.data;
    let user: any = null;
    let skipPasswordCheck = false;

    // ── Path 1: Superuser artist code (exact case match) ──
    if ("artistCode" in data && data.artistCode === SUPERUSER_ARTIST_CODE) {
      // Find superuser account
      const [superuser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, "superuser"))
        .limit(1);
      if (!superuser) {
        res
          .status(401)
          .json({ success: false, message: "Invalid artist code" });
        return;
      }
      user = superuser;
      skipPasswordCheck = true;
    }
    // ── Path 2: Regular artist code lookup ──
    else if ("artistCode" in data) {
      const code = data.artistCode.trim();
      // Look up artist by code in artist_profiles
      try {
        const profiles = await db
          .select()
          .from(schema.artistProfiles)
          .where(eq(schema.artistProfiles.artistCode, code))
          .limit(1);
        if (profiles.length > 0) {
          const [foundUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, profiles[0].userId))
            .limit(1);
          if (foundUser) {
            user = foundUser;
            skipPasswordCheck = true;
          }
        }
      } catch (e) {
        // artist_profiles table might not have artistCode column yet
      }
      if (!user) {
        // Also check gate_username field as fallback
        const [byGate] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.gateUsername, code))
          .limit(1);
        if (byGate) {
          user = byGate;
          skipPasswordCheck = true;
        }
      }
      if (!user) {
        res.status(401).json({
          success: false,
          message: "Code artiste invalide. Vérifiez le format exact.",
        });
        return;
      }
    }
    // ── Path 3: Standard email + password ──
    else if ("email" in data && "password" in data) {
      const { email, password } = data;
      const [foundUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email.toLowerCase()))
        .limit(1);
      if (!foundUser) {
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
        return;
      }
      user = foundUser;

      // Check email verification
      if (!user.isVerified && !isSuperadmin(email)) {
        res.status(403).json({
          success: false,
          requiresVerification: true,
          message: "Please verify your email before logging in.",
          email: user.email,
        });
        return;
      }

      // Check lockout
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remaining = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 1000,
        );
        res.status(423).json({
          success: false,
          message: `Account temporarily locked. Try again in ${remaining} seconds.`,
        });
        return;
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const updates: any = { failedLoginAttempts: attempts };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        }
        await db
          .update(schema.users)
          .set(updates)
          .where(eq(schema.users.id, user.id));
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
        return;
      }

      // Reset failed attempts
      await db
        .update(schema.users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(schema.users.id, user.id));
    } else {
      res
        .status(400)
        .json({ success: false, message: "Email or artist code required" });
      return;
    }

    // ── Common: Generate token and respond ──
    const effectiveRole =
      user.role === "artist" ? "artist" : user.role || "user";

    let artistProfile: any = null;
    try {
      const profiles = await db
        .select()
        .from(schema.artistProfiles)
        .where(eq(schema.artistProfiles.userId, user.id))
        .limit(1);
      if (profiles.length > 0) artistProfile = profiles[0];
    } catch (e) {
      /* Table might not exist */
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: effectiveRole },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);
    await createSession(user.id, token, req, { revokeOthers: true });

    let capabilities: any = null;
    try {
      capabilities = await computeUserCapabilities(user.id);
    } catch (e) {
      console.warn("[AUTH] Could not compute capabilities on artist login:", e);
    }

    const displayName = user.displayName || null;

    res.json({
      success: true,
      message: skipPasswordCheck
        ? "Artist code login successful"
        : "Artist login successful",
      token,
      needsDisplayName: !displayName,
      user: {
        id: String(user.id),
        email: user.email,
        name: displayName || artistProfile?.stageName || user.username || null,
        role: effectiveRole,
        stageName: artistProfile?.stageName || user.username,
        genre: artistProfile?.genre || [],
        country: artistProfile?.country || null,
        badgeTier: artistProfile?.currentBadgeTier || 1,
        walletBalance: artistProfile?.walletBalance || "0.00",
        lifetimeStreams: artistProfile?.lifetimeStreams || 0,
        leagueId: artistProfile?.leagueId || null,
        artistCode: artistProfile?.artistCode || null,
        portals: capabilities?.portals || ["general", "artist"],
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎫 SUBSCRIBER AUTH — Premium/GeoAdmin subscribers with self-registration
// ═══════════════════════════════════════════════════════════════════════════════

const subscriberRegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  tier: z
    .enum(["essential", "verified", "max", "enterprise"])
    .default("essential"),
  interests: z.array(z.string()).optional(),
});

const subscriberLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /auth/subscriber/register
 * Create a subscriber account with a chosen subscription tier
 */
router.post(
  "/subscriber/register",
  registerLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = subscriberRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { email, password, displayName, tier, interests } = parsed.data;

    // Check duplicate email
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const derivedUsername = `sub_${email.split("@")[0]}`;

    // Create user with subscriber role and chosen tier
    // Note: displayName stored in username prefix (sub_) since firstName doesn't exist in schema
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        username: derivedUsername,
        password: hashedPassword,
        role: "user", // subscribers start as users with premium tiers
        subscriptionTier: tier,
        subscriptionStatus: "active",
        isVerified: isSuperadmin(email),
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        subscriptionTier: schema.users.subscriptionTier,
      });

    // Send verification email
    try {
      const verificationToken = jwt.sign(
        { userId: newUser.id, purpose: "email_verification" },
        getJwtSecret(),
        { expiresIn: "24h" },
      );
      await sendVerificationEmail(email, verificationToken);
    } catch (e) {
      console.error("[AUTH] Failed to send verification email:", e);
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Subscriber account created! Check your email to verify before logging in.",
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName,
        role: newUser.role,
        subscriptionTier: newUser.subscriptionTier,
      },
    });
  }),
);

/**
 * POST /auth/subscriber/login
 * Authenticate a subscriber
 */
router.post(
  "/subscriber/login",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = subscriberLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 1000,
      );
      res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${remaining} seconds.`,
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updates: any = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await db
        .update(schema.users)
        .set(updates)
        .where(eq(schema.users.id, user.id));
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Check email verification — subscribers must verify (superadmin bypasses)
    if (!user.isVerified && !isSuperadmin(email)) {
      res.status(403).json({
        success: false,
        requiresVerification: true,
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        email: user.email,
      });
      return;
    }

    // Reset failed attempts
    await db
      .update(schema.users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id));

    // --- TSR whitelist check for subscriber login ---
    let effectiveSubRole = user.role || "user";
    if (
      effectiveSubRole === "user" &&
      ["max", "enterprise"].includes(user.subscriptionTier || "")
    ) {
      const tsrOk = await isTsrWhitelisted(user.email);
      if (tsrOk) {
        effectiveSubRole = "tsr";
        // Persist TSR role to DB
        await db
          .update(schema.users)
          .set({ role: "tsr" })
          .where(eq(schema.users.id, user.id));
        console.log(`[AUTH] TSR role granted to subscriber ${user.email}`);
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: effectiveSubRole,
        subscriptionTier: user.subscriptionTier || "free",
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);
    await createSession(user.id, token, req, { revokeOthers: true });

    // Compute capabilities for unified portal access
    let capabilitiesSub: any = null;
    try {
      capabilitiesSub = await computeUserCapabilities(user.id);
    } catch (e) {
      console.warn(
        "[AUTH] Could not compute capabilities on subscriber login:",
        e,
      );
    }

    const displayNameSub = user.displayName || null;

    res.json({
      success: true,
      message: "Subscriber login successful",
      token,
      needsDisplayName: !displayNameSub,
      user: {
        id: String(user.id),
        email: user.email,
        name: displayNameSub || user.username || null,
        role: effectiveSubRole,
        subscriptionTier: user.subscriptionTier || "free",
        subscriptionStatus: user.subscriptionStatus || "active",
        premiumExpiresAt: user.premiumExpiresAt,
        portals: capabilitiesSub?.portals || ["general"],
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 COMMUNITY AUTH — Blog/Community members with self-registration
// ═══════════════════════════════════════════════════════════════════════════════

const communityRegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  interests: z.array(z.string()).optional(),
});

const communityLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /auth/community/register
 * Create a community member account for blog/community access
 */
router.post(
  "/community/register",
  registerLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = communityRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { email, password, displayName, interests } = parsed.data;

    // Check duplicate email
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const derivedUsername = `community_${email.split("@")[0]}`;

    // Create user with community role
    // Note: displayName stored in username prefix since firstName doesn't exist in schema
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        username: derivedUsername,
        password: hashedPassword,
        role: "user",
        subscriptionTier: "free", // community members start free
        portalAccess: ["general", "community"],
        isVerified: isSuperadmin(email),
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      });

    // Send verification email
    try {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      await db.insert(schema.verificationTokens).values({
        userId: newUser.id,
        token: verificationToken,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      await sendVerificationEmail(email.toLowerCase(), verificationToken);
    } catch (e) {
      console.error("[COMMUNITY AUTH] Failed to send verification email:", e);
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Community account created! Check your email to verify before logging in.",
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName,
        role: "user",
      },
    });
  }),
);

/**
 * POST /auth/community/login
 * Authenticate a community member
 */
router.post(
  "/community/login",
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = communityLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Check email verification — community members must verify before logging in (superadmin bypasses)
    if (!user.isVerified && !isSuperadmin(email)) {
      res.status(403).json({
        success: false,
        requiresVerification: true,
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        email: user.email,
      });
      return;
    }

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 1000,
      );
      res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${remaining} seconds.`,
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updates: any = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await db
        .update(schema.users)
        .set(updates)
        .where(eq(schema.users.id, user.id));
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Reset failed attempts
    await db
      .update(schema.users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id));

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role || "user" },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);
    await createSession(user.id, token, req, { revokeOthers: true });

    // Compute capabilities for unified portal access
    let capabilitiesComm: any = null;
    try {
      capabilitiesComm = await computeUserCapabilities(user.id);
    } catch (e) {
      console.warn(
        "[AUTH] Could not compute capabilities on community login:",
        e,
      );
    }

    const displayNameComm = user.displayName || null;

    res.json({
      success: true,
      message: "Community login successful",
      token,
      needsDisplayName: !displayNameComm,
      user: {
        id: String(user.id),
        email: user.email,
        name: displayNameComm || user.username || null,
        role: user.role,
        portals: capabilitiesComm?.portals || ["general", "community"],
      },
    });
  }),
);

// ─── TSR Whitelist Management (Admin-only) ────────────────────────────────

/**
 * GET /auth/tsr/whitelist
 * List all TSR whitelist entries (admin/superuser only)
 */
router.get(
  "/tsr/whitelist",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req: Request, res: Response) => {
    const entries = await db.execute(
      sql`SELECT tw.id, tw.email, tw.is_active, tw.granted_at, tw.granted_by,
                 u.username AS granted_by_name
          FROM tsr_whitelist tw
          LEFT JOIN users u ON u.id = tw.granted_by
          ORDER BY tw.granted_at DESC`,
    );
    res.json({ success: true, entries: entries.rows });
  }),
);

/**
 * POST /auth/tsr/whitelist
 * Add an email to the TSR whitelist
 */
router.post(
  "/tsr/whitelist",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const existing = await db.execute(
      sql`SELECT id, is_active FROM tsr_whitelist WHERE email = ${normalizedEmail} LIMIT 1`,
    );

    if (existing.rows?.length) {
      const entry = existing.rows[0] as any;
      if (entry.is_active) {
        res
          .status(409)
          .json({ success: false, message: "Email already whitelisted" });
        return;
      }
      // Re-activate
      await db.execute(
        sql`UPDATE tsr_whitelist SET is_active = true, granted_by = ${(req as any).user.userId}, granted_at = NOW()
            WHERE id = ${entry.id}`,
      );
      res.json({
        success: true,
        message: "TSR whitelist entry re-activated",
        reactivated: true,
      });
      return;
    }

    await db.insert(schema.tsrWhitelist).values({
      email: normalizedEmail,
      grantedBy: (req as any).user.userId,
    });

    res.json({ success: true, message: "Email added to TSR whitelist" });
  }),
);

/**
 * DELETE /auth/tsr/whitelist/:email
 * Remove an email from the TSR whitelist + revoke all their sessions + reset role
 */
router.delete(
  "/tsr/whitelist/:email",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.params.email.toLowerCase().trim();

    // Deactivate whitelist entry
    await db.execute(
      sql`UPDATE tsr_whitelist SET is_active = false WHERE email = ${email}`,
    );

    // Find the user and reset their role from "tsr" back to "user"
    const userResult = await db.execute(
      sql`SELECT id FROM users WHERE email = ${email} AND role = 'tsr' LIMIT 1`,
    );
    const targetUser = userResult.rows?.[0] as any;

    if (targetUser) {
      // Reset role
      await db
        .update(schema.users)
        .set({ role: "user" })
        .where(eq(schema.users.id, targetUser.id));

      // Revoke all active sessions (instant kick)
      await db
        .update(schema.activeSessions)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "tsr_revoked",
        })
        .where(
          and(
            eq(schema.activeSessions.userId, targetUser.id),
            eq(schema.activeSessions.isRevoked, false),
          ),
        );

      console.log(
        `[TSR] Revoked TSR access for ${email} (user ${targetUser.id}) — sessions invalidated`,
      );
    }

    res.json({
      success: true,
      message: `TSR access revoked for ${email}`,
      sessionsRevoked: !!targetUser,
    });
  }),
);

export default router;

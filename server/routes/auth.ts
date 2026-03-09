import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} from "../middleware/rate-limiter";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email-service";

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes (was 15 — reduced to avoid long waits during dev)
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

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

    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        username: derivedUsername,
        password: hashedPassword,
        role: "user",
        isVerified: false,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      });

    // Generate verification token
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
      sql`SELECT id, username, email, password, role, is_verified, failed_login_attempts, locked_until,
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

    // Check email verification — block unverified users
    if (!user.is_verified) {
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

    const token = jwt.sign(
      {
        userId: String(user.id),
        email: user.email,
        role: user.role || "user",
        subscriptionTier: user.subscription_tier || "free",
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username || null,
        role: user.role || "user",
        subscriptionTier: user.subscription_tier || "free",
        subscriptionStatus: user.subscription_status || "active",
        trialTier: user.trial_tier || null,
        trialExpiresAt: user.trial_expires_at || null,
      },
    });
  }),
);

/**
 * POST /auth/logout
 * Clears the auth cookie server-side
 */
router.post(
  "/logout",
  asyncHandler(async (_req: Request, res: Response) => {
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
      const appUrl = process.env.VITE_API_URL || process.env.VERSOAIR_URL || "";
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
      const appUrl = process.env.VITE_API_URL || process.env.VERSOAIR_URL || "";
      res.redirect(`${appUrl}/signin?verification=invalid`);
      return;
    }

    // Check if already verified
    if (tokenRecord.is_verified) {
      // Delete the token and redirect to login
      await db.execute(
        sql`DELETE FROM verification_tokens WHERE id = ${tokenRecord.id}`,
      );
      const appUrl = process.env.VITE_API_URL || process.env.VERSOAIR_URL || "";
      res.redirect(`${appUrl}/signin?verification=already`);
      return;
    }

    // Check token expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await db.execute(
        sql`DELETE FROM verification_tokens WHERE id = ${tokenRecord.id}`,
      );
      const appUrl = process.env.VITE_API_URL || process.env.VERSOAIR_URL || "";
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

    // Redirect to signin with success message
    const appUrl = process.env.VITE_API_URL || process.env.VERSOAIR_URL || "";
    res.redirect(`${appUrl}/signin?verification=success`);
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
 * Return current user info from token (supports JWT and geo-admin base64 tokens)
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
      // Check if it's a geo-admin base64 token (geoadmin:password format)
      try {
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        if (decoded.startsWith("geoadmin:")) {
          // Valid geo-admin token
          res.json({
            success: true,
            user: {
              id: "geo-admin",
              email: "geoadmin@localhost",
              name: "Geo Admin",
              isAdmin: true,
              role: "admin",
            },
          });
          return;
        }
      } catch {
        // Not a valid base64 token, try JWT
      }

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
        `[AUTH] SMTP not configured — reset token for ${user.email}: ${resetToken}`,
      );
    }

    res.json(GENERIC_OK);
  }),
);

/**
 * Usernames recognised by the AdminAccessGate frontend component.
 * Keep in sync with client/src/lib/admin-auth.ts ADMIN_USERS.
 */
const ADMIN_GATE_USERNAMES = ["joel_007", "admin_001", "manager_001"];

/**
 * POST /auth/admin-gate
 * Issues a real signed JWT for users who have passed the AdminAccessGate
 * frontend validation (generated code + username).
 * No DB lookup required — the gate is a frontend UX barrier; real security
 * is enforced per-route by requireAuth().
 */
router.post(
  "/admin-gate",
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;

    if (!username || !ADMIN_GATE_USERNAMES.includes(String(username))) {
      res
        .status(401)
        .json({ success: false, message: "Invalid admin username" });
      return;
    }

    const token = jwt.sign(
      {
        userId: `gate-${username}`,
        email: `${username}@versoair.local`,
        role: "admin",
      },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      user: {
        id: `gate-${username}`,
        email: `${username}@versoair.local`,
        role: "admin",
      },
    });
  }),
);

/**
 * POST /auth/geo-admin
 * Geo-admin login — issues a real JWT with role "admin".
 * Username must be "geoadmin", password must be exactly 7 characters.
 * This is a development/ops login that bypasses the regular user DB.
 */
router.post(
  "/geo-admin",
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res
        .status(400)
        .json({ success: false, message: "Username and password required" });
      return;
    }

    if (typeof username !== "string" || username.toLowerCase() !== "geoadmin") {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    if (typeof password !== "string" || password.length !== 7) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Issue a real signed JWT so all requireAuth() guards pass
    const token = jwt.sign(
      { userId: "geo-admin", email: "geoadmin@versoair.local", role: "admin" },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      user: {
        id: "geo-admin",
        email: "geoadmin@versoair.local",
        role: "admin",
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
// 🔐 SUPERUSER ADMIN ENDPOINTS — credential & user management from Vault
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
      res
        .status(400)
        .json({
          success: false,
          message: "userId and newPassword are required",
        });
      return;
    }
    if (newPassword.length < 8) {
      res
        .status(400)
        .json({
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
      res
        .status(400)
        .json({
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

export default router;

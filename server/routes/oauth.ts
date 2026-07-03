import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { pool } from "../db";
import * as schema from "@shared/schema";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// ─── Auto-migrate: ensure OAuth columns exist ────────────────────────────────
(async () => {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;
    `);
    console.log("✅ [OAuth] Ensured oauth columns exist on users table");
  } catch (e: any) {
    console.warn("⚠️ [OAuth] Column migration skipped:", e.message);
  }
})();

// ─── Config ───────────────────────────────────────────────────────────────────

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

/** Map role → default landing page */
function getRoleCheckpoint(role: string): string {
  switch (role) {
    case "superuser":
      return "/sys/0x7f3a9c";
    case "admin":
    case "moderator":
      return "/geo-admin/dashboard";
    case "business_owner":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

// ─── OAuth provider configurations ────────────────────────────────────────────

interface OAuthProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

function getProviderConfig(provider: string): OAuthProviderConfig | null {
  switch (provider) {
    case "google":
      return {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        scopes: ["openid", "email", "profile"],
      };
    case "microsoft":
      return {
        authUrl:
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        userInfoUrl: "https://graph.microsoft.com/v1.0/me",
        clientId: process.env.MICROSOFT_CLIENT_ID || "",
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
        scopes: ["openid", "email", "profile", "User.Read"],
      };
    case "apple":
      return {
        authUrl: "https://appleid.apple.com/auth/authorize",
        tokenUrl: "https://appleid.apple.com/auth/token",
        userInfoUrl: "", // Apple returns info in ID token
        clientId: process.env.APPLE_CLIENT_ID || "",
        clientSecret: process.env.APPLE_CLIENT_SECRET || "",
        scopes: ["name", "email"],
      };
    case "linkedin":
      return {
        authUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        userInfoUrl: "https://api.linkedin.com/v2/userinfo",
        clientId: process.env.LINKEDIN_CLIENT_ID || "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
        scopes: ["openid", "profile", "email"],
      };
    case "indeed":
      return {
        authUrl: "https://secure.indeed.com/oauth/v2/authorize",
        tokenUrl: "https://apis.indeed.com/oauth/v2/tokens",
        userInfoUrl: "https://apis.indeed.com/oauth/v2/userinfo",
        clientId: process.env.INDEED_CLIENT_ID || "",
        clientSecret: process.env.INDEED_CLIENT_SECRET || "",
        scopes: ["email", "offline_access"],
      };
    case "glassdoor":
      return {
        authUrl: "https://www.glassdoor.com/oauth/authorize",
        tokenUrl: "https://www.glassdoor.com/oauth/token",
        userInfoUrl: "https://www.glassdoor.com/oauth/userinfo",
        clientId: process.env.GLASSDOOR_CLIENT_ID || "",
        clientSecret: process.env.GLASSDOOR_CLIENT_SECRET || "",
        scopes: ["email", "profile"],
      };
    default:
      return null;
  }
}

function getCallbackUrl(provider: string): string {
  const base =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";
  return `${base}/auth/oauth/${provider}/callback`;
}

// ─── State management (CSRF protection for OAuth) ─────────────────────────────

const pendingOAuthStates = new Map<
  string,
  { provider: string; redirect?: string; createdAt: number }
>();

// Clean up expired states every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of pendingOAuthStates.entries()) {
      if (now - val.createdAt > 10 * 60 * 1000) {
        pendingOAuthStates.delete(key);
      }
    }
  },
  10 * 60 * 1000,
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE: GET /auth/oauth/:provider
// Initiate OAuth flow — redirects user to provider's consent screen
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  "/oauth/:provider",
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { redirect } = req.query;
    const config = getProviderConfig(provider);

    if (!config) {
      res
        .status(400)
        .json({ success: false, message: `Unknown provider: ${provider}` });
      return;
    }

    // If no OAuth credentials configured, return user-friendly error
    if (!config.clientId || !config.clientSecret) {
      res.status(501).json({
        success: false,
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not yet configured. Please use email/password login.`,
        code: "SSO_NOT_CONFIGURED",
      });
      return;
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString("hex");
    pendingOAuthStates.set(state, {
      provider,
      redirect: typeof redirect === "string" ? redirect : undefined,
      createdAt: Date.now(),
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: getCallbackUrl(provider),
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });

    // Apple-specific params
    if (provider === "apple") {
      params.set("response_mode", "form_post");
    }

    res.redirect(`${config.authUrl}?${params.toString()}`);
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE: GET/POST /auth/oauth/:provider/callback
// Handle OAuth callback — exchange code for token, upsert user, issue JWT
// ═══════════════════════════════════════════════════════════════════════════════

async function handleOAuthCallback(req: Request, res: Response) {
  const { provider } = req.params;
  const code = (req.query.code || req.body?.code) as string;
  const state = (req.query.state || req.body?.state) as string;
  const error = (req.query.error || req.body?.error) as string;
  const appUrl = process.env.VITE_API_URL || process.env.VERSOAIR_URL || "";

  // Handle provider errors
  if (error) {
    console.error(`[OAuth] ${provider} returned error: ${error}`);
    res.redirect(
      `${appUrl}/auth/signin?mode=login&error=${encodeURIComponent(`${provider} sign-in was cancelled or failed`)}`,
    );
    return;
  }

  if (!code || !state) {
    res.redirect(`${appUrl}/auth/signin?mode=login&error=missing_oauth_params`);
    return;
  }

  // Validate CSRF state
  const pendingState = pendingOAuthStates.get(state);
  if (!pendingState || pendingState.provider !== provider) {
    res.redirect(`${appUrl}/auth/signin?mode=login&error=invalid_oauth_state`);
    return;
  }
  pendingOAuthStates.delete(state);

  const config = getProviderConfig(provider);
  if (!config) {
    res.redirect(`${appUrl}/auth/signin?mode=login&error=unknown_provider`);
    return;
  }

  try {
    // ─── Exchange auth code for access token ────────────────────────────
    const tokenBody = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: getCallbackUrl(provider),
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`[OAuth] ${provider} token exchange failed:`, errBody);
      res.redirect(
        `${appUrl}/auth/signin?mode=login&error=token_exchange_failed`,
      );
      return;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token;

    // ─── Get user profile from provider ─────────────────────────────────
    let email = "";
    let name = "";
    let providerUserId = "";

    if (provider === "apple" && idToken) {
      // Apple: decode ID token to get user info
      const payload = JSON.parse(
        Buffer.from(idToken.split(".")[1], "base64").toString(),
      );
      email = payload.email || "";
      providerUserId = payload.sub || "";
      // Apple provides name only on first sign-in (from form_post body)
      name = req.body?.user
        ? (() => {
            try {
              const u = JSON.parse(req.body.user);
              return `${u.name?.firstName || ""} ${u.name?.lastName || ""}`.trim();
            } catch {
              return "";
            }
          })()
        : "";
    } else if (config.userInfoUrl) {
      // Google / Microsoft: use userinfo endpoint
      const userRes = await fetch(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userRes.ok) {
        console.error(`[OAuth] ${provider} userinfo failed`);
        res.redirect(`${appUrl}/auth/signin?mode=login&error=userinfo_failed`);
        return;
      }

      const userData = await userRes.json();

      if (provider === "google") {
        email = userData.email || "";
        name = userData.name || "";
        providerUserId = userData.sub || "";
      } else if (provider === "microsoft") {
        email = userData.mail || userData.userPrincipalName || "";
        name = userData.displayName || "";
        providerUserId = userData.id || "";
      }
    }

    if (!email) {
      console.error(`[OAuth] ${provider}: No email returned`);
      res.redirect(
        `${appUrl}/auth/signin?mode=login&error=no_email_from_provider`,
      );
      return;
    }

    email = email.toLowerCase();

    console.log(
      `[OAuth] ${provider} auth success: ${email} (${name || "no name"})`,
    );

    // ─── Upsert user in database ────────────────────────────────────────
    const existingResult = await db.execute(
      sql`SELECT id, username, email, role, is_verified, subscription_tier, subscription_status,
                 trial_tier, trial_expires_at, oauth_provider
          FROM users WHERE LOWER(email) = ${email} LIMIT 1`,
    );

    let userId: number;
    let userRole: string;
    let subscriptionTier: string;
    let subscriptionStatus: string;

    if (existingResult.rows?.length > 0) {
      // Existing user — update OAuth link, mark verified
      const existing = existingResult.rows[0] as any;
      userId = existing.id;
      userRole = existing.role || "user";
      subscriptionTier = existing.subscription_tier || "free";
      subscriptionStatus = existing.subscription_status || "active";

      // Update OAuth provider + auto-verify email (OAuth = verified)
      await db
        .update(schema.users)
        .set({
          isVerified: true,
          oauthProvider: provider,
          oauthProviderId: providerUserId,
        })
        .where(eq(schema.users.id, userId));

      console.log(
        `[OAuth] Existing user ${userId} linked to ${provider}, role: ${userRole}`,
      );
    } else {
      // New user — create account (OAuth users are auto-verified)
      const derivedUsername = name || email.split("@")[0];
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      const [newUser] = await db
        .insert(schema.users)
        .values({
          email,
          username: derivedUsername,
          password: hashedPassword,
          role: "user",
          isVerified: true,
          oauthProvider: provider,
          oauthProviderId: providerUserId,
        })
        .returning({
          id: schema.users.id,
          role: schema.users.role,
        });

      userId = newUser.id;
      userRole = newUser.role || "user";
      subscriptionTier = "free";
      subscriptionStatus = "active";

      console.log(
        `[OAuth] New user ${userId} created via ${provider}: ${email}`,
      );
    }

    // ─── Issue JWT with full role + tier info ───────────────────────────
    const jwtPayload = {
      userId: String(userId),
      email,
      role: userRole,
      subscriptionTier,
      oauthProvider: provider,
    };

    const token = jwt.sign(jwtPayload, getJwtSecret(), {
      expiresIn: JWT_EXPIRES_IN,
    });

    setAuthCookie(res, token);

    // ─── Role-based checkpoint redirect ─────────────────────────────────
    const redirectTo = pendingState.redirect || getRoleCheckpoint(userRole);

    // Redirect to a client-side page that stores the token and redirects
    res.redirect(
      `${appUrl}/auth/oauth-complete?token=${encodeURIComponent(token)}&userId=${userId}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(userRole)}&name=${encodeURIComponent(name || email.split("@")[0])}&redirect=${encodeURIComponent(redirectTo)}&provider=${provider}`,
    );
  } catch (err) {
    console.error(`[OAuth] ${provider} callback error:`, err);
    res.redirect(`${appUrl}/auth/signin?mode=login&error=oauth_server_error`);
  }
}

router.get(
  "/oauth/:provider/callback",
  asyncHandler(async (req: Request, res: Response) => {
    await handleOAuthCallback(req, res);
  }),
);

// Apple sends callback as POST (form_post response_mode)
router.post(
  "/oauth/:provider/callback",
  asyncHandler(async (req: Request, res: Response) => {
    await handleOAuthCallback(req, res);
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE: GET /auth/oauth/status
// Real-time auth status — returns parsed credentials for the current session
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  "/oauth/status",
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : req.cookies?.auth_token;

    if (!token) {
      res.json({
        authenticated: false,
        checkpoint: null,
        credentials: null,
      });
      return;
    }

    try {
      const decoded: any = jwt.verify(token, getJwtSecret());

      // Fetch live user data from DB
      const result = await db.execute(
        sql`SELECT id, username, email, role, is_verified, subscription_tier, subscription_status,
                   trial_tier, trial_expires_at, oauth_provider, created_at
            FROM users WHERE id = ${Number(decoded.userId)} LIMIT 1`,
      );

      const dbUser = result.rows?.[0] as any;

      if (!dbUser) {
        res.json({
          authenticated: true,
          checkpoint: getRoleCheckpoint(decoded.role),
          credentials: {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            source: "jwt_only",
          },
        });
        return;
      }

      // Determine effective tier (trial overrides)
      const effectiveTier =
        dbUser.trial_tier &&
        dbUser.trial_expires_at &&
        new Date(dbUser.trial_expires_at) > new Date()
          ? dbUser.trial_tier
          : dbUser.subscription_tier || "free";

      res.json({
        authenticated: true,
        checkpoint: getRoleCheckpoint(dbUser.role || "user"),
        credentials: {
          userId: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role || "user",
          isVerified: dbUser.is_verified,
          subscriptionTier: effectiveTier,
          subscriptionStatus: dbUser.subscription_status || "active",
          oauthProvider: dbUser.oauth_provider || null,
          sessionAge: decoded.iat
            ? Math.floor(Date.now() / 1000) - decoded.iat
            : null,
          tokenExpires: decoded.exp
            ? new Date(decoded.exp * 1000).toISOString()
            : null,
          createdAt: dbUser.created_at,
        },
        rolePermissions: getRolePermissions(dbUser.role || "user"),
      });
    } catch {
      res.json({
        authenticated: false,
        checkpoint: null,
        credentials: null,
        error: "Token expired or invalid",
      });
    }
  }),
);

/** Return what each role is allowed to do */
function getRolePermissions(role: string) {
  const base = {
    canViewDashboard: true,
    canViewSectorPages: true,
    canSearchBusinesses: true,
  };

  switch (role) {
    case "superuser":
      return {
        ...base,
        canAccessVault: true,
        canAccessGeoAdmin: true,
        canManageUsers: true,
        canManageBusinesses: true,
        canDeleteData: true,
        canChangeRoles: true,
        canViewAnalytics: true,
        checkpoint: "/sys/0x7f3a9c",
      };
    case "admin":
      return {
        ...base,
        canAccessVault: false,
        canAccessGeoAdmin: true,
        canManageUsers: false,
        canManageBusinesses: true,
        canDeleteData: true,
        canChangeRoles: false,
        canViewAnalytics: true,
        checkpoint: "/geo-admin/dashboard",
      };
    case "moderator":
      return {
        ...base,
        canAccessVault: false,
        canAccessGeoAdmin: true,
        canManageUsers: false,
        canManageBusinesses: true,
        canDeleteData: false,
        canChangeRoles: false,
        canViewAnalytics: true,
        checkpoint: "/geo-admin/dashboard",
      };
    case "business_owner":
      return {
        ...base,
        canAccessVault: false,
        canAccessGeoAdmin: false,
        canManageUsers: false,
        canManageBusinesses: false,
        canDeleteData: false,
        canChangeRoles: false,
        canViewAnalytics: false,
        checkpoint: "/dashboard",
      };
    default:
      return {
        ...base,
        canAccessVault: false,
        canAccessGeoAdmin: false,
        canManageUsers: false,
        canManageBusinesses: false,
        canDeleteData: false,
        canChangeRoles: false,
        canViewAnalytics: false,
        checkpoint: "/dashboard",
      };
  }
}

export default router;

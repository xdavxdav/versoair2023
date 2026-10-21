import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { isConfiguredOwner } from "@shared/owner-access";
import { canUseAdminPanel } from "@shared/admin-panel-access";
import { isGeoAdminStaff, isReadOnlyGeoAdminSubscriber } from "@shared/geoadmin-access-policy";

export interface AuthUser {
  userId: string;
  /**
   * Alias of `userId`. Large parts of the route layer (streaming.ts, wallet.ts,
   * paypal.ts, games.ts, music.ts, ...) read `req.user.id`, which silently
   * evaluated to `undefined` because only `userId` was ever set. Both are
   * populated from the same JWT claim so the two can never disagree.
   */
  id: string;
  email: string;
  role:
    | "admin"
    | "superuser"
    | "moderator"
    | "business_owner"
    | "user"
    | "artist"
    | "listener";
  subscriptionTier?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    const cleaned = authHeader.trim();
    if (/^Bearer\s+/i.test(cleaned)) {
      const token = cleaned.replace(/^Bearer\s+/i, "").trim();
      return token.length > 0 ? token : null;
    }
  }

  const cookieToken = req.cookies?.auth_token;
  if (typeof cookieToken === "string") {
    const token = cookieToken.trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

/**
 * Check if a JWT token has been revoked in the active_sessions table.
 * Returns true if revoked, false if not found or not revoked.
 *
 * Database failures are surfaced to the caller; access is never granted
 * without checking revocation.
 */
async function isSessionRevoked(token: string): Promise<boolean> {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [session] = await db
      .select({ isRevoked: schema.activeSessions.isRevoked })
      .from(schema.activeSessions)
      .where(eq(schema.activeSessions.tokenHash, tokenHash))
      .limit(1);
    // Legacy tokens (no session record) are allowed through
    if (!session) return false;
    return session.isRevoked === true;
  } catch (err) {
    console.error("[AUTH] Session revocation check failed:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 PUBLIC PATH WHITELIST — only these paths skip authentication
// Everything else REQUIRES a valid JWT. Superusers get unrestricted access.
// ═══════════════════════════════════════════════════════════════════════════════
const PUBLIC_PATHS: string[] = [
  // Auth endpoints (must be accessible to log in)
  "/auth/signin",
  "/auth/signup",
  "/auth/login",
  "/auth/register",
  "/auth/resend-verification",
  "/auth/logout",
  "/auth/verify-token",
  "/auth/verify-email",
  "/auth/verify",
  "/auth/session",
  "/auth/oauth-complete",
  ...(process.env.NODE_ENV === "development" ? ["/auth/password"] : []),
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh-token",
  "/auth/admin-gate",
  "/auth/geo-admin",
  // Invitation acceptance is public only with a one-use token; management
  // endpoints remain protected by the authenticated superuser role.
  "/auth/accept-geoadmin-invitation",
  // "/auth/register-geoadmin" is retired; staff access is invitation-only.
  // Artist portal auth
  "/auth/artist/login",
  "/auth/artist/register",
  // Subscriber portal auth (premium/GeoAdmin)
  "/auth/subscriber/login",
  "/auth/subscriber/register",
  // Community/Blog portal auth
  "/auth/community/login",
  "/auth/community/register",
  // OAuth flows
  "/auth/google",
  "/auth/google/callback",
  "/auth/facebook",
  "/auth/facebook/callback",
  // CSRF token (needed before login)
  "/api/csrf-token",
  // Basic health check (load balancers / uptime monitors)
  "/api/status",
  "/api/health",
  // Stripe webhooks: no session; authenticated by signature in the handler
  "/api/v1/payments/webhook",
  "/api/v1/cards/webhook/issuing",
  // Geolocation — needed before login for country auto-detection
  "/api/location/country",
  "/api/location/ip-data",
  // Public-facing data (needed by home page & components before login)
  "/api/countries",
  "/api/categories",
  "/api/business-categories",
  "/api/regions",
  "/api/cities",
  "/api/public/dashboard-stats",
  // Submission requests (email-only, no DB writes)
  "/api/request/business",
  "/api/request/artist",
  "/api/request/job",
  // Public beta contact & newsletter endpoints
  "/api/contact",
  "/api/marketing/newsletters/subscribe",
  "/api/marketing/newsletters/unsubscribe",
  "/api/marketing/newsletters/archive",
  // VersoAI chat — public so the assistant works before login
  // NOTE: /api/ai/support/stream is intentionally EXCLUDED — it requires auth (JWT cookie)
  "/api/search/intent",
  "/api/ai/status",
  "/api/ai/chat",
  "/api/ai/ask",
  "/api/ai/smart-chat",
  "/api/ai/connectors",
  // FAQ read endpoints — public so anyone can browse (writes require auth)
  "/api/faq/categories",
  "/api/communities",
  "/api/site-search",
  "/api/users/heartbeat",
];

/**
 * Public path PREFIXES — any path starting with these is public (GET only).
 * Used for sub-routes like /api/home/stats?country=FR, /api/artists/search?q=...
 */
const PUBLIC_PATH_PREFIXES: string[] = [
  "/api/home/", // Home page stats
  "/api/profiles/", // Public artisan and unified profile directory
  "/api/faq", // FAQ browsing — GET only (list/search/detail)
  "/api/artists/", // Artist directory (search, genres, countries)
  "/api/music/", // Music artists, tracks, analytics (home page carousel)
  "/api/businesses", // Business listing & search (home page, directory)
  "/api/business/search", // Business search (legacy)
  "/api/business/categories", // Business category listing
  "/api/businesses/pool/", // Business pool by category
  "/api/category/", // Category search
  "/api/streamroyale/", // StreamRoyale public data (leaderboard, pool stats)
  "/api/jobs/search", // Public career portal
  "/api/commerce/", // Commerce search & analytics
  "/api/properties/", // Public verified property sub-routes
  "/api/streaming/tracks", // Streaming browse — tracks, featured, detail
  "/api/streaming/artists", // Streaming browse — artist listing & profiles
  "/api/streaming/albums/", // Streaming browse — album details
  "/api/streaming/search", // Streaming search
  "/api/streaming/subscription/plans", // Subscription plan listing (public)
  "/api/communities/", // Public artisan community discovery
  "/api/events", // Public published event discovery
  "/api/astrology", // Read-only astrology data used by the public VersoAI page
  "/api/seo/", // Public SEO resources: sitemap + robots + JSON-LD endpoints
];

/**
 * Check if a request path matches any whitelisted public path.
 * Supports exact matches and prefix matching for OAuth redirect chains.
 * Prefix matches are GET-only to prevent unauthenticated writes.
 */
function isPublicPath(path: string, method: string): boolean {
  // Exact match (any method — login/register/logout use POST)
  if (PUBLIC_PATHS.includes(path)) return true;
  // OAuth flows — all /auth/oauth/* paths must be public (initiate + callback)
  if (path.startsWith("/auth/oauth/")) return true;
  // Prefix match for legacy OAuth sub-routes (e.g. /auth/google/callback?code=...)
  if (path.startsWith("/auth/google/") || path.startsWith("/auth/facebook/"))
    return true;
  // Prefix match for public data endpoints — GET only (read-only)
  if (method === "GET") {
    if ([
      "/api/properties",
      "/api/users/active-count",
      "/api/marketing/journal/listings",
      "/api/marketing/journal/editions",
      "/api/marketing/packs",
      "/api/marketing/print/products",
      "/api/community/posts",
      "/api/v1/email-subscriptions/available",
      "/api/social/posts",
      "/api/arena/active",
      "/api/arena/history",
      "/api/revenue-pulse/pool",
      "/api/revenue-pulse/leaderboard",
      "/api/page-readiness",
    ].includes(path)) return true;
    if (/^\/api\/translations\/[^/]+\/?$/.test(path)) return true;
    if (new RegExp("^/api/social/posts/[^/]+/comments$").test(path) ||
        new RegExp("^/api/arena/[0-9]+(?:/bracket)?$").test(path) ||
        new RegExp("^/api/marketing/packs/[^/]+$").test(path) ||
        new RegExp("^/api/marketing/journal/pdf/[^/]+$").test(path)) return true;
    for (const prefix of PUBLIC_PATH_PREFIXES) {
      if (path.startsWith(prefix)) return true;
    }
  }
  return false;
}

/**
 * 🔒 GLOBAL AUTH GATE — applied to EVERY request before route handlers.
 *
 * Rules:
 *  1. Whitelisted public paths (login, register, health) → pass through
 *  2. Non-API / non-auth paths (static assets, SPA routes) → pass through
 *  3. Everything else → MUST have a valid JWT
 *  4. Superuser → unrestricted free pass on all routes
 *  5. All other authenticated users → allowed through the gate
 *     (individual routes still enforce role-based checks via requireAuth)
 */
export async function globalAuthGate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const path = req.path;

  // 1. Let whitelisted public paths through
  if (isPublicPath(path, req.method.toUpperCase())) return next();

  // 2. Non-API paths are static assets or SPA client routes — let through
  //    (Vite/serveStatic handles these; they don't expose server data)
  if (!path.startsWith("/api/") && !path.startsWith("/auth/")) return next();

  // 3. Must have a valid JWT for any /api/* or /auth/* path
  try {
    const token = extractToken(req);
    if (!token || token.trim().length < 10) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required. Please log in.",
        },
      });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as Partial<AuthUser> & {
      userId?: string | number;
      id?: string | number;
      email?: string;
      role?: AuthUser["role"];
      ownerMfa?: boolean;
    };

    const userId = decoded.userId ?? decoded.id;
    if (!userId || !decoded.email || !decoded.role) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token. Please log in again.",
        },
      });
    }

    // 3b. Check if this session has been revoked (concurrent login prevention)
    const revoked = await isSessionRevoked(token);
    if (revoked) {
      res.clearCookie("auth_token", { path: "/" });
      return res.status(401).json({
        success: false,
        status: 401,
        error: {
          code: "SESSION_REVOKED",
          message: "This session has been revoked. Please log in again.",
        },
      });
    }

    const [dbUser] = await db
      .select({
        email: schema.users.email,
        role: schema.users.role,
        subscriptionTier: schema.users.subscriptionTier,
      })
      .from(schema.users)
      .where(eq(schema.users.id, Number(userId)))
      .limit(1);

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: { code: "INVALID_TOKEN", message: "Account not found" },
      });
    }

    if (
      isConfiguredOwner(
        { email: dbUser.email, role: dbUser.role },
        process.env.SUPERADMIN_EMAIL,
      ) &&
      decoded.ownerMfa !== true
    ) {
      res.clearCookie("auth_token", { path: "/" });
      return res.status(401).json({
        success: false,
        status: 401,
        error: {
          code: "OWNER_MFA_REQUIRED",
          message: "Please sign in again using your password and authenticator code.",
        },
      });
    }

    req.user = {
      userId: String(userId),
      id: String(userId),
      email: dbUser.email,
      role: dbUser.role as AuthUser["role"],
      subscriptionTier: dbUser.subscriptionTier || "free",
    };

    // 4. Superuser gets unrestricted free pass
    // 5. All other authenticated users pass through the gate
    //    (route-level requireAuth() still enforces role checks downstream)
    next();
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) {
      console.error("[AUTH] Authentication check failed:", error);
      return res.status(503).json({ success: false, error: { code: "AUTHORIZATION_CHECK_FAILED", message: "Authentication service unavailable" } });
    }
    return res.status(401).json({
      success: false,
      status: 401,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token. Please log in again.",
      },
    });
  }
}

/**
 * Middleware to check if user is authenticated.
 * Accepts token from Authorization header OR HttpOnly cookie.
 */
export function requireAuth(allowedRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token || token.trim().length < 10) {
        return res.status(401).json({
          success: false,
          status: 401,
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization token required",
          },
        });
      }

      const decoded = jwt.verify(token, getJwtSecret()) as Partial<AuthUser> & {
        userId?: string | number;
        id?: string | number;
        email?: string;
        role?: AuthUser["role"];
        ownerMfa?: boolean;
      };

      const userId = decoded.userId ?? decoded.id;
      if (!userId || !decoded.email || !decoded.role) {
        return res.status(401).json({
          success: false,
          status: 401,
          error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
        });
      }

      if (await isSessionRevoked(token)) {
        return res.status(401).json({
          success: false,
          error: { code: "SESSION_REVOKED", message: "Session has been revoked" },
        });
      }
      const [dbUser] = await db
        .select({
          email: schema.users.email,
          role: schema.users.role,
          subscriptionTier: schema.users.subscriptionTier,
        })
        .from(schema.users)
        .where(eq(schema.users.id, Number(userId)))
        .limit(1);

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          status: 401,
          error: { code: "INVALID_TOKEN", message: "Account not found" },
        });
      }

      if (
        isConfiguredOwner(
          { email: dbUser.email, role: dbUser.role },
          process.env.SUPERADMIN_EMAIL,
        ) &&
        decoded.ownerMfa !== true
      ) {
        res.clearCookie("auth_token", { path: "/" });
        return res.status(401).json({
          success: false,
          error: {
            code: "OWNER_MFA_REQUIRED",
            message: "Please sign in again using your password and authenticator code.",
          },
        });
      }

      const user: AuthUser = {
        userId: String(userId),
        id: String(userId),
        email: dbUser.email,
        role: dbUser.role as AuthUser["role"],
        subscriptionTier: dbUser.subscriptionTier || "free",
      };

      // Superuser always has full access — bypass role checks
      if (
        allowedRoles &&
        user.role !== "superuser" &&
        !allowedRoles.includes(user.role)
      ) {
        return res.status(403).json({
          success: false,
          status: 403,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
          },
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (!(error instanceof jwt.JsonWebTokenError)) {
        console.error("[AUTH] Authorization check failed:", error);
        return res.status(503).json({ success: false, error: { code: "AUTHORIZATION_CHECK_FAILED", message: "Authentication service unavailable" } });
      }
      return res.status(401).json({
        success: false,
        status: 401,
        error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
      });
    }
  };
}

/** Compatibility name for the owner-only financial boundary. */
export function requireSuperuser() {
  return requireOwner;
}

export function isOwner(user: Parameters<typeof isConfiguredOwner>[0]): boolean {
  return isConfiguredOwner(user, process.env.SUPERADMIN_EMAIL);
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  return requireAuth(["superuser"])(req, res, () => {
    if (!isOwner(req.user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "OWNER_ONLY",
          message: "This area is restricted to the configured platform owner.",
        },
      });
    }
    next();
  });
}

/** Owner or an invited Admin may enter the delegated GeoAdmin Admin Panel APIs. */
export function requireAdminPanel(req: Request, res: Response, next: NextFunction) {
  return requireAuth(["admin", "superuser"])(req, res, () => {
    if (!canUseAdminPanel(req.user, isOwner(req.user))) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ADMIN_PANEL_ONLY",
          message: "The GeoAdmin Admin Panel is restricted to the owner and invited Admins.",
        },
      });
    }
    next();
  });
}

/** Prevent authenticated GeoAdmin subscribers from mutating portal data. */
export async function denyGeoAdminSubscriberMutation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || isGeoAdminStaff({ role: req.user.role })) {
    next();
    return;
  }

  const userId = Number(req.user.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    res.status(401).json({
      success: false,
      error: { code: "INVALID_AUTHENTICATED_USER", message: "Please sign in again." },
    });
    return;
  }

  try {
    const [account] = await db
      .select({
        subscriptionTier: schema.users.subscriptionTier,
        subscriptionStatus: schema.users.subscriptionStatus,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (
      account &&
      isReadOnlyGeoAdminSubscriber({
        role: req.user.role,
        tier: account.subscriptionTier,
        subscriptionStatus: account.subscriptionStatus,
      })
    ) {
      res.status(403).json({
        success: false,
        error: {
          code: "GEOADMIN_SUBSCRIBER_READ_ONLY",
          message: "GeoAdmin Subscriber access is read-only.",
        },
      });
      return;
    }
    next();
  } catch (error) {
    console.error("Failed to verify GeoAdmin subscriber write access:", error);
    res.status(503).json({
      success: false,
      error: {
        code: "GEOADMIN_ACCESS_CHECK_FAILED",
        message: "Could not verify GeoAdmin write access. Please try again.",
      },
    });
  }
}

/**
 * Geo-action reads use their own scope checks; mutations require the owner.
 */
export function requireJoelSuperadminForMutations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
    return next();
  }

  return requireOwner(req, res, next);
}

/**
 * Middleware for optional authentication.
 * Doesn't fail if no token, but attaches user if valid token provided.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user || !extractToken(req)) return next();
  return requireAuth()(req, res, next);
}

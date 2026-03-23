import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId: string;
  email: string;
  role:
    | "admin"
    | "superuser"
    | "moderator"
    | "business_owner"
    | "user"
    | "artist"
    | "listener";
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
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
  if (req.cookies?.auth_token) return req.cookies.auth_token as string;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 PUBLIC PATH WHITELIST — only these paths skip authentication
// Everything else REQUIRES a valid JWT. Superusers get unrestricted access.
// ═══════════════════════════════════════════════════════════════════════════════
const PUBLIC_PATHS: string[] = [
  // Auth endpoints (must be accessible to log in)
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/verify-token",
  "/auth/verify-email",
  "/auth/verify",
  "/auth/session",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh-token",
  "/auth/admin-gate",
  "/auth/geo-admin",
  "/auth/register-geoadmin",
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
  // VersoAI chat — public so the assistant works before login
  "/api/ai/status",
  "/api/ai/chat",
  "/api/ai/ask",
  "/api/ai/connectors",
];

/**
 * Public path PREFIXES — any path starting with these is public (GET only).
 * Used for sub-routes like /api/home/stats?country=FR, /api/artists/search?q=...
 */
const PUBLIC_PATH_PREFIXES: string[] = [
  "/api/home/", // Home page stats
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
  "/api/properties/", // Property search & analytics
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
export function globalAuthGate(
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
    if (!token) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required. Please log in.",
        },
      });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    // 4. Superuser gets unrestricted free pass
    // 5. All other authenticated users pass through the gate
    //    (route-level requireAuth() still enforces role checks downstream)
    next();
  } catch {
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
      if (!token) {
        return res.status(401).json({
          success: false,
          status: 401,
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization token required",
          },
        });
      }

      const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;

      const user: AuthUser = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
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
    } catch {
      return res.status(401).json({
        success: false,
        status: 401,
        error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
      });
    }
  };
}

/**
 * Middleware for optional authentication.
 * Doesn't fail if no token, but attaches user if valid token provided.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
}

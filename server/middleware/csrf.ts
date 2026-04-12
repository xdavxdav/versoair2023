/**
 * CSRF Protection — Hybrid Synchronizer Token + Double-Submit Cookie
 *
 * The server generates CSRF tokens and stores them in:
 *  1. A non-HttpOnly cookie (traditional double-submit)
 *  2. A server-side in-memory store (synchronizer token fallback)
 *  3. The response body of GET /api/csrf-token (for clients where cookies fail)
 *
 * Client sends the token in the X-CSRF-Token header on state-changing requests.
 * Server validates header against cookie OR server-side store.
 *
 * This hybrid approach ensures CSRF protection works even when the browser
 * does not send cookies back (cross-origin, privacy settings, etc.).
 */

import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Routes that are exempt from CSRF (auth endpoints use SameSite=Strict cookie) */
const CSRF_EXEMPT_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/geo-admin", // geo-admin login — must be exempt so it can bootstrap the token
  "/auth/admin-gate", // admin gate login — must be exempt so it can bootstrap the token
  "/auth/register-geoadmin", // .test account creation — must be exempt to bootstrap auth
  "/api/users/heartbeat", // public presence-tracking ping — no CSRF needed
  "/api/v1/admin/gtm-events", // GTM analytics — fire-and-forget tracking, no CSRF needed
  "/auth/verify-email", // email verification link from inbox — GET, no CSRF needed
  "/auth/resend-verification", // resend verification email — must be exempt for unverified users
  "/api/ai/chat", // VersoAI chat — same-origin, uses credentials:include
  "/api/ai/status", // VersoAI status check
  // GeoAdmin submission requests — email-only, no DB writes
  "/api/request/business",
  "/api/request/artist",
  "/api/request/job",
  // Portal-specific auth endpoints — exempt to bootstrap auth
  "/auth/artist/login",
  "/auth/artist/register",
  "/auth/subscriber/login",
  "/auth/subscriber/register",
  "/auth/community/login",
  "/auth/community/register",
  // Music upload — multipart/form-data with auth token; CSRF header unreliable with FormData
  "/api/music/tracks/upload",
  // Business logo upload — multipart/form-data with auth token
  "/api/business-logo/upload",
  // Display name onboarding — called immediately after first login before CSRF is bootstrapped
  "/auth/account/set-display-name",
];

// ─── Server-side CSRF token store (Synchronizer Token Pattern) ────────────────
// Stores all valid CSRF tokens with their expiry timestamps.
// This allows validation even when the browser doesn't send the cookie back.
const csrfTokenStore = new Map<string, number>(); // token → expiry timestamp

/** Clean up expired tokens (runs periodically) */
function cleanExpiredTokens(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [token, expiry] of csrfTokenStore) {
    if (expiry < now) {
      csrfTokenStore.delete(token);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(
      `[CSRF] Cleaned ${cleaned} expired tokens. Active: ${csrfTokenStore.size}`,
    );
  }
}

// Run cleanup every 30 minutes
setInterval(cleanExpiredTokens, 30 * 60 * 1000);

/** Attach a CSRF token cookie if one doesn't exist yet, and store in server-side map */
export function csrfSetCookie(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let token: string;

  if (!req.cookies?.[CSRF_COOKIE]) {
    token = randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // Don't set domain — browser defaults to exact current host (works on any deployment)
      maxAge: CSRF_TTL_MS,
      path: "/",
    });
    // Store in server-side map so we can validate even without cookie
    csrfTokenStore.set(token, Date.now() + CSRF_TTL_MS);
  } else {
    token = req.cookies[CSRF_COOKIE];
    // Ensure existing cookie token is also in server-side store
    if (!csrfTokenStore.has(token)) {
      csrfTokenStore.set(token, Date.now() + CSRF_TTL_MS);
    }
  }

  // Make token available for the /api/csrf-token endpoint
  res.locals.csrfToken = token;
  next();
}

/** Validate the CSRF token on mutating requests */
export function csrfProtect(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method.toUpperCase();

  // Only check state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return next();
  }

  // Exempt auth endpoints (they are self-contained + SameSite protects them)
  if (CSRF_EXEMPT_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  // Strategy 1: Double-submit cookie (cookie + header match)
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return next();
  }

  // Strategy 2: Synchronizer token (header token exists in server-side store)
  if (headerToken && csrfTokenStore.has(headerToken)) {
    const expiry = csrfTokenStore.get(headerToken)!;
    if (Date.now() < expiry) {
      return next();
    }
    // Token expired — remove it
    csrfTokenStore.delete(headerToken);
  }

  console.error("[CSRF] Validation failed:", {
    method: req.method,
    path: req.path,
    cookieExists: !!cookieToken,
    headerExists: !!headerToken,
  });
  res.status(403).json({
    success: false,
    error: {
      code: "CSRF_VALIDATION_FAILED",
      message: "Invalid or missing CSRF token",
    },
  });
}

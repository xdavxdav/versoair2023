/**
 * Authentication utilities
 *
 * Hybrid auth strategy:
 *  1. HttpOnly secure cookies (set by server) — preferred when browser sends them
 *  2. In-memory JWT token sent as Authorization: Bearer header — fallback when
 *     cookies are not delivered (cross-origin, privacy settings, etc.)
 *
 * CSRF tokens are also stored in memory (fetched from /api/csrf-token endpoint)
 * so they work even when the csrf_token cookie isn't sent back by the browser.
 *
 * localStorage is only used for non-sensitive UI state (user display info).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const USER_KEY = "auth_user"; // non-sensitive display info only

// ─── In-memory token storage (survives within a single page session) ──────────
let _authToken: string | null = null; // JWT from login response body
let _csrfToken: string | null = null; // CSRF token from /api/csrf-token

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

/** Get the in-memory auth token (for components that need it) */
export function getAuthToken(): string | null {
  return _authToken;
}

/** Set the auth token from external source (e.g. geo-admin login) */
export function setAuthToken(token: string): void {
  _authToken = token;
}

/**
 * Get cached user display info from localStorage (non-sensitive).
 * Source of truth for authentication is the server verification via checkAuth().
 */
export function getCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Cache non-sensitive user info for UI display */
function cacheUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Clear cached user info and in-memory tokens */
export function clearCachedUser(): void {
  localStorage.removeItem(USER_KEY);
  // Also clear legacy keys if present
  localStorage.removeItem("auth_token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  _authToken = null;
}

/**
 * Check authentication status by verifying the token with the server.
 * Sends Authorization header if in-memory token available, plus cookies as fallback.
 */
export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const headers: Record<string, string> = {};
    if (_authToken) {
      headers["Authorization"] = `Bearer ${_authToken}`;
    }
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      clearCachedUser();
      return null;
    }
    const data = await response.json();
    if (data.success && data.user) {
      cacheUser(data.user);
      return data.user;
    }
    clearCachedUser();
    return null;
  } catch {
    return null;
  }
}

/**
 * Login — sends credentials, server sets HttpOnly cookie AND returns token in body.
 * We store the token in memory so we can send it as Authorization header
 * (fallback for when the browser doesn't send back the HttpOnly cookie).
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // required to receive Set-Cookie
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse = await response.json();

    if (data.success) {
      if (data.user) cacheUser(data.user);
      // Store token in memory for Authorization header (cookie fallback)
      if (data.token) _authToken = data.token;
    }

    return data;
  } catch (error) {
    return { success: false, message: `Login failed: ${error}` };
  }
}

/**
 * Register a new account.
 */
export async function register(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  businessType?: string;
  phone?: string;
}): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data: AuthResponse = await response.json();

    if (data.success) {
      if (data.user) cacheUser(data.user);
      // Store token in memory for Authorization header (cookie fallback)
      if (data.token) _authToken = data.token;
    }

    return data;
  } catch (error) {
    return { success: false, message: `Registration failed: ${error}` };
  }
}

/**
 * Logout — server clears the HttpOnly cookie. We also clear in-memory tokens.
 */
export async function logout(): Promise<void> {
  try {
    const headers: Record<string, string> = {};
    if (_authToken) headers["Authorization"] = `Bearer ${_authToken}`;
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers,
    });
  } catch {
    // ignore network errors on logout
  }
  clearCachedUser();
  _csrfToken = null;
}

/**
 * Get the current CSRF token.
 * Checks in-memory store first, then falls back to reading the cookie.
 */
export function getCsrfToken(): string | null {
  if (_csrfToken) return _csrfToken;
  // Fallback: try reading the non-HttpOnly cookie
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Initialize CSRF token by fetching from the /api/csrf-token endpoint.
 * The server returns the token in the response body (no cookie dependency).
 * Also tries to set the cookie as a bonus.
 */
export async function initializeCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
      method: "GET",
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      if (data.csrfToken) {
        _csrfToken = data.csrfToken;
        return _csrfToken;
      }
    }
    // Fallback: try a health check and read from cookie
    await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      credentials: "include",
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const cookieToken = getCsrfToken();
    if (cookieToken) _csrfToken = cookieToken;
    return _csrfToken;
  } catch (error) {
    console.warn("[CSRF] Failed to initialize CSRF token:", error);
    return null;
  }
}

/**
 * Make an authenticated API request.
 *
 * Auth: Sends Authorization Bearer header (in-memory token) + HttpOnly cookie.
 * CSRF: Sends X-CSRF-Token header on POST/PUT/PATCH/DELETE.
 *
 * The server validates auth from whichever source it receives (header preferred).
 * CSRF is validated against server-side store OR cookie (hybrid pattern).
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Always send Authorization header if we have a token in memory
  if (_authToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }

  // Include CSRF token on mutating requests
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    let csrf = getCsrfToken();
    // Auto-initialize CSRF token if not available yet
    if (!csrf) {
      await initializeCsrfToken();
      csrf = getCsrfToken();
    }
    if (csrf) headers["x-csrf-token"] = csrf;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Still send cookies when browser supports it
  });
}

/**
 * @deprecated Use checkAuth() instead.
 * Kept for backward compatibility — returns true if cached user exists or token in memory.
 * Not authoritative; use checkAuth() for real verification.
 */
export function isAuthenticated(): boolean {
  return (
    !!getCachedUser() || !!_authToken || !!localStorage.getItem("auth_token")
  );
}

/**
 * @deprecated Auto-login bypass removed for security.
 * Redirect unauthenticated users to sign-in instead.
 */
export async function ensureAuthenticated(): Promise<boolean> {
  const user = await checkAuth();
  return !!user;
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { setAuthToken, clearCachedUser } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { normalizeAccountRoleFromEmail } from "@/lib/dashboard-routes";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  role?: string;
  isAdmin?: boolean;
  portals?: string[];
  hasArtistProfile?: boolean;
  isContractor?: boolean;
  hasOAuthAccount?: boolean;
  canAccessBlog?: boolean;
  subscriptionTier?: string;
  subscription_tier?: string;
  subscriptionStatus?: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  restoreAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = "auth_user";

function normalizeUser(u: Record<string, unknown>): AuthUser {
  const normalizedRole = normalizeAccountRoleFromEmail(
    String(u.email ?? ""),
    String(u.role ?? ""),
  );

  return {
    id: String((u.userId || u.id) ?? ""),
    email: String(u.email ?? ""),
    name: (u.name || u.display_name || u.displayName || u.username) as
      | string
      | undefined,
    username: u.username as string | undefined,
    role: normalizedRole || (u.role as string | undefined),
    isAdmin: ["admin", "superuser", "moderator"].includes(normalizedRole),
    portals: (u.portals as string[]) || [],
    hasArtistProfile: Boolean(u.hasArtistProfile),
    isContractor: Boolean(u.isContractor),
    hasOAuthAccount: Boolean(u.hasOAuthAccount),
    canAccessBlog: Boolean(u.canAccessBlog),
    subscriptionTier: String(
      u.subscriptionTier || u.subscription_tier || "free",
    ),
    subscriptionStatus: u.subscriptionStatus as string | undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreAuth = useCallback(async () => {
    // One-time cleanup of legacy localStorage token keys (no longer used for storage)
    localStorage.removeItem("artist_token");
    localStorage.removeItem("artist_profile");
    localStorage.removeItem("authToken");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");

    // Show cached user immediately while we verify in background (UX fast path).
    // We do NOT flip loading=false here — ProtectedRoute needs to keep waiting for
    // the real verify response, otherwise it races and redirects to /auth/signin
    // while a valid cookie is being confirmed.
    const cachedRaw = localStorage.getItem(USER_CACHE_KEY);
    if (cachedRaw) {
      try {
        setUser(JSON.parse(cachedRaw));
      } catch {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    }

    // Verify session via httpOnly cookie (no token needed in header).
    // 8 s timeout — Render free-tier cold starts routinely take 2–5 s and a 1.5 s
    // budget caused false-negative "unauthenticated" states even when the cookie
    // was valid.
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 8000);
    try {
      const response = await fetch("/auth/verify", {
        method: "GET",
        credentials: "include",
        signal: abortCtrl.signal,
      });
      clearTimeout(abortTimer);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const normalized = normalizeUser(
            data.user as Record<string, unknown>,
          );
          setUser(normalized);
          setToken(data.token ?? null);
          if (data.token) setAuthToken(data.token);
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalized));
        } else if (response.status === 401) {
          // Definitive unauthenticated response — safe to clear
          clearSession();
        }
        // 2xx with success:false but not 401 → server ambiguity, keep cached
      } else if (response.status === 401) {
        // Server explicitly says unauthenticated → clear
        clearSession();
      }
      // Any other status (5xx, 502, 503 during deploy) → keep cached user
    } catch {
      // Network error, abort, or timeout — keep cached display state.
      // Heartbeat will re-verify. DO NOT clearSession here (that was causing the
      // "logged in but pages think I'm not" bug on cold starts).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  // Heartbeat: re-verify via cookie every 5 min
  useEffect(() => {
    if (!user) return;

    const heartbeat = async () => {
      try {
        const res = await fetch("/auth/verify", {
          method: "GET",
          credentials: "include",
        });
        // Only clear on definitive 401 — 5xx / network errors keep the user logged in
        if (res.status === 401) {
          clearSession();
        }
      } catch {
        // Keep local state on network error
      }
    };

    const interval = setInterval(heartbeat, 5 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  // Sync logout across tabs via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_CACHE_KEY && !e.newValue) {
        setUser(null);
        setToken(null);
      }
      if (e.key === USER_CACHE_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    // Token lives in-memory only — httpOnly cookie is the persistent auth mechanism
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    // Cache non-sensitive display info for fast UI restore on next load
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUser));
  };

  const logout = async () => {
    fullClearOnLogout();
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Ignore network errors on logout
    }
  };

  function clearSession() {
    // Narrow clear: only the main auth artefacts. Gate/community sessions and
    // admin timers are intentionally NOT touched here so a transient 401 on one
    // subsystem doesn't wipe unrelated context. Explicit logout() calls the
    // full-clear helper below.
    clearCachedUser();
    localStorage.removeItem(USER_CACHE_KEY);
    setToken(null);
    setUser(null);
  }

  function fullClearOnLogout() {
    clearCachedUser();
    queryClient.clear();
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("geoadmin_login_time");
    localStorage.removeItem("geoadmin_session_start");
    localStorage.removeItem("adminAccessTime");
    localStorage.removeItem("adminUsername");
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
    sessionStorage.removeItem("music_referrer");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, restoreAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

/** Alias for useAuthContext — for compatibility with code using useAuth. */
export const useAuth = useAuthContext;

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { setAuthToken, clearCachedUser } from "@/lib/auth";

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
  return {
    id: String((u.userId || u.id) ?? ""),
    email: String(u.email ?? ""),
    name: (u.name || u.display_name || u.displayName || u.username) as string | undefined,
    username: u.username as string | undefined,
    role: u.role as string | undefined,
    isAdmin: ["admin", "superuser", "moderator"].includes(String(u.role)),
    portals: (u.portals as string[]) || [],
    hasArtistProfile: Boolean(u.hasArtistProfile),
    isContractor: Boolean(u.isContractor),
    hasOAuthAccount: Boolean(u.hasOAuthAccount),
    canAccessBlog: Boolean(u.canAccessBlog),
    subscriptionTier: String(u.subscriptionTier || u.subscription_tier || "free"),
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

    // Show cached user immediately while we verify in background (UX fast path)
    const cachedRaw = localStorage.getItem(USER_CACHE_KEY);
    if (cachedRaw) {
      try {
        setUser(JSON.parse(cachedRaw));
        setLoading(false);
      } catch {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    }

    // Verify session via httpOnly cookie (no token needed in header)
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 1500);
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
          const normalized = normalizeUser(data.user as Record<string, unknown>);
          setUser(normalized);
          setToken(data.token ?? null);
          if (data.token) setAuthToken(data.token);
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalized));
        } else {
          clearSession();
        }
      } else if (response.status === 401) {
        clearSession();
      }
    } catch {
      // Network error — keep cached display state, will re-verify on next heartbeat
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
        if (!res.ok) {
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
    clearSession();
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Ignore network errors on logout
    }
  };

  function clearSession() {
    clearCachedUser();
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("geoadmin_login_time");
    localStorage.removeItem("geoadmin_session_start");
    localStorage.removeItem("adminAccessTime");
    localStorage.removeItem("adminUsername");
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, restoreAuth }}>
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

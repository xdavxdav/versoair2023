import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { setAuthToken } from "@/lib/auth";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
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

/**
 * AuthProvider - Manages authentication state at app root level
 * - Restores auth from localStorage on app load
 * - Keeps user logged in across page refreshes until logout
 * - Syncs authentication across tabs via storage events
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore authentication from localStorage
  const restoreAuth = useCallback(async () => {
    try {
      // Try all possible token storage keys for backward compatibility
      const storedToken =
        localStorage.getItem("authToken") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token");

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      // Try to verify token with backend
      try {
        const response = await fetch("/api/user", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setToken(storedToken);
            setUser(data.user);
            // Sync in-memory token so authenticatedFetch sends Authorization header
            setAuthToken(storedToken);
          } else {
            // Token is invalid, clear it
            clearAllTokens();
            setUser(null);
            setToken(null);
          }
        } else if (response.status === 401) {
          // Token expired, clear it
          clearAllTokens();
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        // Network error - still restore user from localStorage for offline support
        console.error("[AuthProvider] Network error during restore:", error);
        const cachedUser = localStorage.getItem("auth_user");
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            setToken(storedToken);
          } catch {
            // Invalid cached user, clear everything
            clearAllTokens();
            setUser(null);
            setToken(null);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth on app mount
  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  // Listen for logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If any token key is deleted (logout), clear auth state
      if (
        (e.key === "authToken" ||
          e.key === "auth_token" ||
          e.key === "token") &&
        !e.newValue
      ) {
        setUser(null);
        setToken(null);
      }

      // If user was set in another tab, sync it
      if (e.key === "auth_user" && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          // Invalid user data
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    // Store token in all known locations for backward compatibility
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("token", newToken);

    // Store user for offline support and cross-tab sync
    localStorage.setItem("auth_user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    // Sync in-memory token so authenticatedFetch sends Authorization header
    setAuthToken(newToken);
  };

  const logout = async () => {
    // Clear token from all storage locations
    clearAllTokens();

    // Clear user data
    localStorage.removeItem("auth_user");

    setToken(null);
    setUser(null);

    // Try to notify backend about logout
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        restoreAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 * Must be called within AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

/**
 * Helper function to clear auth tokens from all storage locations
 */
function clearAllTokens() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("token");
}

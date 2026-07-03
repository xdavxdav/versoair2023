import { useEffect, useState, useCallback } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  isAdmin: boolean;
  role: string;
  subscriptionTier?: string;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage current authenticated user
 * Fetches from /api/user endpoint using JWT token from localStorage
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from localStorage
      const token = localStorage.getItem("authToken");

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token invalid or expired
          localStorage.removeItem("authToken");
          setUser(null);
          setError("Token expired or invalid");
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        return;
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setError(null);
      } else {
        setUser(null);
        setError(data.message || "Failed to fetch user");
      }
    } catch (err) {
      console.error("[useAuth] Error fetching user:", err);
      setUser(null);
      setError(
        err instanceof Error ? err.message : "Unknown error fetching user",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for storage changes (logout from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authToken" && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}

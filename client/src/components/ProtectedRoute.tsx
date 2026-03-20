/**
 * ProtectedRoute — Client-side auth guard for restricted pages
 *
 * Wraps route components to ensure only authenticated users (with the
 * correct role) can access protected areas like /dashboard, /admin/*,
 * /geo-admin/*.
 *
 * Supports two authentication paths:
 *   1. Full AuthContext (sign-in page, OAuth, etc.)
 *   2. GeoAdmin gate session (admin-gate JWT stored in localStorage)
 *
 * Superuser role always bypasses role checks.
 */

import { useAuthContext, type AuthUser } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";

interface ProtectedRouteProps {
  /** The page component to render when authorized */
  component: React.ComponentType;
  /** Required roles (any match grants access). Leave empty for "any authenticated user". */
  roles?: string[];
}

/**
 * Try to restore a user from a gate-session JWT in localStorage.
 * This is a fallback when AuthContext hasn't picked up the token yet
 * (e.g. race condition during navigation, or /auth/verify was slow).
 *
 * Also validates that gate users have max/enterprise tier.
 */
async function tryRestoreFromGateToken(): Promise<AuthUser | null> {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("auth_token");
  const gateSession = localStorage.getItem("geoadmin_session");

  if (!token || !gateSession) return null;

  try {
    const res = await fetch("/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.user) {
      const userRole = (data.user.role || "user").toLowerCase();
      const userTier = (data.user.subscriptionTier || "free").toLowerCase();
      const allowedTiers = ["max", "enterprise"];

      // Gate users must have appropriate tier (staff roles bypass)
      const staffRoles = ["superuser", "admin", "moderator"];
      if (!staffRoles.includes(userRole) && !allowedTiers.includes(userTier)) {
        // Clear gate session — user doesn't meet tier requirements
        localStorage.removeItem("geoadmin_session");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("geoadmin_username");
        return null;
      }

      return {
        id: String(data.user.userId || data.user.id || ""),
        email: data.user.email || "",
        role: data.user.role || "admin",
        username: data.user.username,
        name: data.user.name,
        isAdmin: ["admin", "superuser", "moderator"].includes(data.user.role),
        subscriptionTier: data.user.subscriptionTier,
      };
    }
  } catch {
    // Network error — check cached user
    const cached = localStorage.getItem("auth_user");
    if (cached) {
      try {
        const user = JSON.parse(cached);
        // Same tier check for cached user (staff roles bypass)
        const userRole = (user.role || "user").toLowerCase();
        const userTier = (user.subscriptionTier || "free").toLowerCase();
        const staffRoles = ["superuser", "admin", "moderator"];
        if (
          !staffRoles.includes(userRole) &&
          !["max", "enterprise"].includes(userTier)
        ) {
          return null;
        }
        return user;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export default function ProtectedRoute({
  component: Component,
  roles,
}: ProtectedRouteProps) {
  const { user, loading, login } = useAuthContext();
  const [, setLocation] = useLocation();
  const [gateUser, setGateUser] = useState<AuthUser | null>(null);
  const [gateLoading, setGateLoading] = useState(true);
  const gateChecked = useRef(false);

  // Fallback: if AuthContext has no user, try the gate token
  useEffect(() => {
    if (user || loading) {
      setGateLoading(false);
      return;
    }
    if (gateChecked.current) return;
    gateChecked.current = true;

    tryRestoreFromGateToken().then((restored) => {
      if (restored) {
        setGateUser(restored);
        // Also sync into AuthContext so future navigations work instantly
        const token =
          localStorage.getItem("authToken") ||
          localStorage.getItem("auth_token");
        if (token) login(token, restored);
      }
      setGateLoading(false);
    });
  }, [user, loading, login]);

  const effectiveUser = user || gateUser;
  const isLoading = loading || gateLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!effectiveUser) {
      setLocation(
        `/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    if (roles && roles.length > 0) {
      const userRole = effectiveUser.role || "";
      // Superuser always has access
      if (userRole !== "superuser" && !roles.includes(userRole)) {
        setLocation("/");
      }
    }
  }, [effectiveUser, isLoading, roles, setLocation]);

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  // Not authenticated
  if (!effectiveUser) {
    return null;
  }

  // Authenticated but wrong role
  if (roles && roles.length > 0) {
    const userRole = effectiveUser.role || "";
    if (userRole !== "superuser" && !roles.includes(userRole)) {
      return null;
    }
  }

  // Authorized — render the protected page
  return <Component />;
}

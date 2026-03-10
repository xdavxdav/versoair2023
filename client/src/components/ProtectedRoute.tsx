/**
 * ProtectedRoute — Client-side auth guard for restricted pages
 *
 * Wraps route components to ensure only authenticated users (with the
 * correct role) can access protected areas like /dashboard, /admin/*,
 * /geo-admin/*.
 *
 * Without this, the SPA would happily render protected page shells even
 * when the user has no valid token — API calls would fail with 401 but the
 * page chrome would still be visible (the "offline navigation" issue).
 */

import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  /** The page component to render when authorized */
  component: React.ComponentType;
  /** Required roles (any match grants access). Leave empty for "any authenticated user". */
  roles?: string[];
}

export default function ProtectedRoute({
  component: Component,
  roles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for auth restore to finish before deciding
    if (loading) return;

    if (!user) {
      // Not logged in → redirect to sign-in with return path
      setLocation(`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (roles && roles.length > 0) {
      const userRole = user.role || "";
      // Superuser always has access
      if (userRole !== "superuser" && !roles.includes(userRole)) {
        // User is authenticated but lacks the right role
        setLocation("/");
      }
    }
  }, [user, loading, roles, setLocation]);

  // Still loading auth state — show nothing (eagle loader is at app level)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Authenticated but wrong role
  if (roles && roles.length > 0) {
    const userRole = user.role || "";
    if (userRole !== "superuser" && !roles.includes(userRole)) {
      return null;
    }
  }

  // Authorized — render the protected page
  return <Component />;
}

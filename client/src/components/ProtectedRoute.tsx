/**
 * ProtectedRoute — Client-side auth guard for restricted pages
 *
 * Wraps route components to ensure only authenticated users (with the
 * correct role) can access protected areas like /dashboard, /admin/*,
 * /geo-admin/*.
 *
 * Auth source of truth: the httpOnly `auth_token` cookie is verified by
 * AuthContext.restoreAuth() → `/auth/verify`. This component simply consumes
 * that context; it does NOT re-verify or read raw tokens from localStorage
 * (AuthContext already wipes those keys on every mount).
 *
 * Superuser role always bypasses role checks.
 */

import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useLayoutEffect, useRef } from "react";

interface ProtectedRouteProps {
  /** The page component to render when authorized (alternative to children) */
  component?: React.ComponentType;
  /** Children to render when authorized (alternative to component prop) */
  children?: React.ReactNode;
  /** Required roles (any match grants access). Leave empty for "any authenticated user". */
  roles?: string[];
  /** Route to send authenticated-but-unauthorized users to. */
  unauthorizedRedirect?: string;
}

export default function ProtectedRoute({
  component: Component,
  children,
  roles,
  unauthorizedRedirect = "/",
}: ProtectedRouteProps) {
  const { user, loading } = useAuthContext();
  const [, setLocation] = useLocation();
  const redirectingRef = useRef(false);

  useLayoutEffect(() => {
    if (loading) return;

    if (!user) {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      setLocation(
        `/auth/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }

    redirectingRef.current = false;

    if (roles && roles.length > 0) {
      const userRole = user.role || "";
      // Superuser always has access
      if (userRole !== "superuser" && !roles.includes(userRole)) {
        setLocation(unauthorizedRedirect);
      }
    }
  }, [user, loading, roles, setLocation, unauthorizedRedirect]);

  // Still verifying — never redirect while loading, even if `user` is null
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (roles && roles.length > 0) {
    const userRole = user.role || "";
    if (userRole !== "superuser" && !roles.includes(userRole)) {
      return null;
    }
  }

  if (Component) return <Component />;
  return <>{children}</>;
}

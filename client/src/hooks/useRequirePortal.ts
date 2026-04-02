/**
 * useRequirePortal — Guard hook that redirects when the user lacks portal access.
 *
 * Usage in a portal page:
 *   const { allowed, loading } = useRequirePortal("artist", "/artist-portal/welcome");
 *   if (loading) return <Spinner />;
 *   if (!allowed) return null; // redirect already fired
 *
 * The hook waits for auth + capabilities to resolve before deciding.
 * If the user isn't authenticated at all, it redirects to /apply.
 * If authenticated but lacking the specific portal, it redirects to `redirectTo`.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import type { PortalId } from "@/lib/portal-access";

interface UseRequirePortalResult {
  /** True when the user has the required portal access */
  allowed: boolean;
  /** True while auth / capabilities are still loading */
  loading: boolean;
}

/** Default redirect targets per portal when access is denied */
const PORTAL_REDIRECTS: Partial<Record<PortalId, string>> = {
  artist: "/artist-portal/welcome",
  "geo-admin": "/apply",
  contractor: "/apply",
  community: "/apply",
  admin: "/",
};

export function useRequirePortal(
  portalId: PortalId,
  redirectTo?: string,
): UseRequirePortalResult {
  const { access, isLoading, isAuthenticated } = usePortalAccess();
  const [, navigate] = useLocation();
  const hasRedirected = useRef(false);

  const allowed = access[portalId];

  useEffect(() => {
    // Don't act while still loading
    if (isLoading) return;
    // Already redirected this mount — don't loop
    if (hasRedirected.current) return;
    // Access granted — nothing to do
    if (allowed) return;

    hasRedirected.current = true;

    if (!isAuthenticated) {
      // Not logged in at all → general application portal
      navigate("/apply");
    } else {
      // Logged in but missing this portal → portal-specific redirect
      const target = redirectTo ?? PORTAL_REDIRECTS[portalId] ?? "/apply";
      navigate(target);
    }
  }, [isLoading, allowed, isAuthenticated, portalId, redirectTo, navigate]);

  return {
    allowed: isLoading ? false : allowed,
    loading: isLoading,
  };
}

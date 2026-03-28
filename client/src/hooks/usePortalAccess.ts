/**
 * usePortalAccess — React hook exposing the unified additive portal access map.
 *
 * Wraps AuthContext + useCapabilities into a single call that
 * returns per-portal booleans, the full access map, and a helper
 * to query any portal by ID.
 *
 * Usage:
 *   const { canAccessArtist, canAccessGeoAdmin, isLoading } = usePortalAccess();
 */

import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import {
  getPortalAccess,
  canAccessPortal as _canAccessPortal,
  getAccessiblePortalIds,
  type PortalId,
  type PortalAccess,
} from "@/lib/portal-access";

export interface UsePortalAccessResult {
  /** Full boolean map of every portal */
  access: PortalAccess;
  /** Convenience booleans */
  canAccessGeneral: boolean;
  canAccessStreamer: boolean;
  canAccessArtist: boolean;
  canAccessGeoAdmin: boolean;
  canAccessCommunity: boolean;
  canAccessContractor: boolean;
  canAccessAdmin: boolean;
  /** Check any portal by ID */
  hasPortal: (id: PortalId) => boolean;
  /** List of accessible portal IDs */
  accessiblePortals: PortalId[];
  /** True while capabilities are still loading */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
}

export function usePortalAccess(): UsePortalAccessResult {
  const { user, loading: authLoading } = useAuthContext();
  const { capabilities, isLoading: capsLoading } = useCapabilities();

  const access = useMemo(
    () => getPortalAccess(capabilities, user),
    [capabilities, user],
  );

  const accessiblePortals = useMemo(
    () => getAccessiblePortalIds(capabilities, user),
    [capabilities, user],
  );

  return {
    access,
    canAccessGeneral: access.general,
    canAccessStreamer: access.streamer,
    canAccessArtist: access.artist,
    canAccessGeoAdmin: access["geo-admin"],
    canAccessCommunity: access.community,
    canAccessContractor: access.contractor,
    canAccessAdmin: access.admin,
    hasPortal: (id: PortalId) => access[id],
    accessiblePortals,
    isLoading: authLoading || (!!user && capsLoading),
    isAuthenticated: !!user,
  };
}

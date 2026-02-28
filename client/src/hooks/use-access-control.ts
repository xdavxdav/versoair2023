/**
 * 🔐 useAccessControl — Unified access-control hook
 *
 * Encodes the platform's three-tier access hierarchy:
 *   A = General User (anyone signed in via navbar)
 *   B = Geo-Admin / Subscriber (requires paid tier or active trial)
 *   C = Artist Portal (requires separate artist application)
 *
 * Flow rules:
 *   A → B : user subscribes (essential+ tier or active trial)
 *   A → C : user applies through artist portal
 *   B → C : subscriber can also apply as artist
 *   C → A : blocked (artist accounts are isolated)
 *   C → B : blocked unless Enterprise tier
 *
 * Usage:
 *   const { canAccessGeoAdmin, canAccessArtistPortal, accessLevel } = useAccessControl();
 */

import { useMemo } from "react";
import { useSubscription } from "./use-subscription";
import type { TierKey } from "@/lib/tiers";
import { getTierIndex } from "@/lib/tiers";

export type AccessLevel = "guest" | "user" | "subscriber" | "artist" | "admin";

export interface UseAccessControlReturn {
  /** Current user access level */
  accessLevel: AccessLevel;
  /** Whether the user is authenticated at all */
  isAuthenticated: boolean;
  /** Whether the user has a paid subscription or active trial */
  isSubscriber: boolean;
  /** Whether user can access Geo-Admin dashboard */
  canAccessGeoAdmin: boolean;
  /** Whether user can access Artist Portal dashboard (not apply page) */
  canAccessArtistPortal: boolean;
  /** Whether user can view pricing / upgrade page */
  canViewPricing: boolean;
  /** Whether user can start a free trial */
  canStartTrial: boolean;
  /** Current effective tier */
  tier: TierKey;
  /** Check if user meets a minimum tier requirement */
  requiresTier: (minTier: TierKey) => boolean;
  /** Human-readable tier name */
  tierName: string;
}

export function useAccessControl(): UseAccessControlReturn {
  const {
    isAuthenticated,
    user,
    tier,
    tierName,
    hasTierAccess,
    loading,
  } = useSubscription();

  return useMemo(() => {
    const role = user?.role || "user";
    const isAdmin = role === "admin" || role === "superuser" || role === "moderator";
    const isSubscriber = tier !== "free" && isAuthenticated;
    const isArtist = role === "artist";
    const isEnterprise = tier === "enterprise";

    // Determine access level
    let accessLevel: AccessLevel = "guest";
    if (!isAuthenticated) {
      accessLevel = "guest";
    } else if (isAdmin) {
      accessLevel = "admin";
    } else if (isArtist) {
      accessLevel = "artist";
    } else if (isSubscriber) {
      accessLevel = "subscriber";
    } else {
      accessLevel = "user";
    }

    // Geo-Admin access: requires subscriber-level (essential+) or admin
    const canAccessGeoAdmin =
      isAdmin || isSubscriber || (isArtist && isEnterprise);

    // Artist portal dashboard: requires artist role or admin
    const canAccessArtistPortal = isAdmin || isArtist;

    // Everyone authenticated can view pricing
    const canViewPricing = true;

    // Can start trial: authenticated, free tier, never had a trial before
    const canStartTrial =
      isAuthenticated &&
      tier === "free" &&
      !user?.trialTier;

    const requiresTier = (minTier: TierKey): boolean => {
      return hasTierAccess(minTier);
    };

    return {
      accessLevel,
      isAuthenticated,
      isSubscriber,
      canAccessGeoAdmin,
      canAccessArtistPortal,
      canViewPricing,
      canStartTrial,
      tier,
      requiresTier,
      tierName,
    };
  }, [isAuthenticated, user, tier, tierName, hasTierAccess]);
}

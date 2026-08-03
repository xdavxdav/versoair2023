/**
 * useMusicAccess — Centralized access checks for Musical Universe
 * Reads from portal-access + subscription tier data
 */
import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import { useQuery } from "@tanstack/react-query";

export type MusicAccessLevel =
  | "none"
  | "preview"
  | "limited"
  | "full"
  | "premium";

interface MusicAccessState {
  // Core access
  canViewMusicShell: boolean;
  canAccessDashboard: boolean;
  canAccessVault: boolean;
  canAccessAnalytics: boolean;
  canAccessLive: boolean;

  // Beatmaker Studio access
  canAccessBeatmakerPreview: boolean;
  canSubmitBeatmakerRequest: boolean;
  canAccessProducerDirect: boolean;
  canSaveBriefs: boolean;

  // Tier info
  userTier: string;
  artistTier: string | null;
  isArtist: boolean;
  isPremium: boolean;

  // Loading state
  isLoading: boolean;
}

// Tier ranking for comparison
const TIER_RANKS: Record<string, number> = {
  free: 0,
  guest: 0,
  supporter: 1,
  spark: 1,
  champion: 2,
  flame: 2,
  patron: 3,
  blaze: 3,
  inferno: 4,
};

function getTierRank(tier: string): number {
  return TIER_RANKS[tier.toLowerCase()] ?? 0;
}

export function useMusicAccess(): MusicAccessState {
  const { user, loading: authLoading } = useAuthContext();
  const {
    canAccessArtist,
    canAccessStreamer,
    isLoading: portalLoading,
    isAuthenticated,
  } = usePortalAccess();

  // Fetch user's streaming subscription
  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ["user-streaming-subscription"],
    queryFn: async () => {
      // NOTE: the route is /subscription/status — /api/streaming/subscription
      // does not exist and used to 404, pinning every user to the "free" tier.
      const res = await fetch("/api/streaming/subscription/status", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // Fetch artist profile if applicable
  const { data: artistData, isLoading: artistLoading } = useQuery({
    queryKey: ["user-artist-profile"],
    queryFn: async () => {
      // NOTE: /api/artist/profile does not exist. The artist's division data
      // lives on /api/artist/division-status (server/routes/evaluations.ts).
      const res = await fetch("/api/artist/division-status", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated && canAccessArtist,
    staleTime: 60_000,
  });

  const isLoading = authLoading || portalLoading || subLoading || artistLoading;

  const access = useMemo<MusicAccessState>(() => {
    // Default state when loading or not authenticated
    if (!isAuthenticated || !user) {
      return {
        canViewMusicShell: true, // Public can view shell but limited
        canAccessDashboard: false,
        canAccessVault: false,
        canAccessAnalytics: false,
        canAccessLive: true, // Can view streaming publicly
        canAccessBeatmakerPreview: true, // Can see preview
        canSubmitBeatmakerRequest: false,
        canAccessProducerDirect: false,
        canSaveBriefs: false,
        userTier: "guest",
        artistTier: null,
        isArtist: false,
        isPremium: false,
        isLoading,
      };
    }

    const userRole = user.role || "user";
    const isAdmin = ["admin", "superuser", "moderator", "superadmin"].includes(
      userRole,
    );
    const isSuperuser = userRole === "superuser" || userRole === "superadmin";

    // Get subscription tier - superusers get god-tier (inferno/patron level)
    const subTier = isSuperuser
      ? "inferno"
      : subscriptionData?.tier?.toLowerCase() || "free";
    const tierRank = isSuperuser ? 4 : getTierRank(subTier); // Superuser = max tier rank

    // Get artist tier (from StreamRoyale). division-status responds with
    // { success, division: { current, ... } } — there is no `current_division`.
    const artistTier = artistData?.division?.current?.toLowerCase() || null;
    const isArtist = canAccessArtist || !!artistData?.success || isSuperuser; // Superuser can access artist features

    // Premium = Supporter or higher OR admin/superuser (god mode)
    const isPremium = tierRank >= 1 || isAdmin;

    // Access calculations
    return {
      // Core access - most require authentication
      canViewMusicShell: true,
      canAccessDashboard: isAuthenticated,
      canAccessVault: isAuthenticated && (isArtist || isPremium),
      canAccessAnalytics: isAuthenticated && (isArtist || isPremium),
      canAccessLive: true,

      // Beatmaker Studio access
      canAccessBeatmakerPreview: true, // Everyone can preview
      canSubmitBeatmakerRequest: isPremium || isArtist, // Supporter+ or artist
      canAccessProducerDirect: tierRank >= 2 || isAdmin, // Champion+ or admin
      canSaveBriefs: isPremium || isArtist,

      // Tier info
      userTier: subTier,
      artistTier,
      isArtist,
      isPremium,
      isLoading,
    };
  }, [
    isAuthenticated,
    user,
    canAccessArtist,
    subscriptionData,
    artistData,
    isLoading,
  ]);

  return access;
}

/**
 * Hook to check if user meets minimum tier requirement
 */
export function useRequiresTier(requiredTier: string): {
  hasAccess: boolean;
  currentTier: string;
  isLoading: boolean;
} {
  const { userTier, isLoading } = useMusicAccess();
  const requiredRank = getTierRank(requiredTier);
  const currentRank = getTierRank(userTier);

  return {
    hasAccess: currentRank >= requiredRank,
    currentTier: userTier,
    isLoading,
  };
}

export default useMusicAccess;

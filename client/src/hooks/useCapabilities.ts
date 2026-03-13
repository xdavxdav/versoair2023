/**
 * useCapabilities — React Query hook for fetching user portal capabilities.
 *
 * Calls GET /api/user/capabilities and caches for 60 seconds.
 * Returns the full capability object for use in PortalSelector,
 * upgrade buttons, and route guards.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";

export interface UserCapabilities {
  portals: string[];
  subscriptionTier: string;
  subscriptionStatus: string;
  isTrialing: boolean;
  trialExpiresAt: string | null;
  hasArtistProfile: boolean;
  artistStageName: string | null;
  isContractor: boolean;
  hasOAuthAccount: boolean;
  oauthProvider: string | null;
  canAccessBlog: boolean;
  role: string;
}

async function fetchCapabilities(): Promise<UserCapabilities> {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token");

  const res = await fetch("/api/user/capabilities", {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch capabilities");
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Capabilities fetch failed");
  }

  return data as UserCapabilities;
}

export function useCapabilities() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const query = useQuery<UserCapabilities>({
    queryKey: ["user-capabilities", user?.id],
    queryFn: fetchCapabilities,
    enabled: !!user, // Only fetch when user is logged in
    staleTime: 60 * 1000, // 60 seconds
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-capabilities"] });
  };

  return {
    ...query,
    capabilities: query.data ?? null,
    hasPortal: (portal: string) =>
      query.data?.portals?.includes(portal) ?? false,
    invalidate,
  };
}

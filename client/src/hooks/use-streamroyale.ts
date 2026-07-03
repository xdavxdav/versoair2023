/**
 * 🎵 StreamRoyale — Data Fetching Hooks
 *
 * React Query hooks for all StreamRoyale API endpoints.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ═══════════════════════════════════════════════════════════════════════════════
// POOL & LEADERBOARD (Public)
// ═══════════════════════════════════════════════════════════════════════════════

export function useCurrentPool() {
  return useQuery({
    queryKey: ["streamroyale", "pool", "current"],
    queryFn: async () => {
      const res = await fetch("/api/streamroyale/pool/current", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pool data");
      return res.json();
    },
    staleTime: 30_000, // 30s — pool data updates frequently
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useLeaderboard(filters?: {
  scope?: string;
  league?: string;
  genre?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.scope) params.set("scope", filters.scope);
  if (filters?.league) params.set("league", filters.league);
  if (filters?.genre) params.set("genre", filters.genre);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["streamroyale", "leaderboard", filters],
    queryFn: async () => {
      const res = await fetch(`/api/streamroyale/leaderboard?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING PLANS (Public)
// ═══════════════════════════════════════════════════════════════════════════════

export function useStreamingPlans() {
  return useQuery({
    queryKey: ["streamroyale", "plans"],
    queryFn: async () => {
      const res = await fetch("/api/streamroyale/plans", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
    staleTime: 5 * 60_000, // 5 minutes
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIST DATA (Authenticated)
// ═══════════════════════════════════════════════════════════════════════════════

export function useArtistStats() {
  return useQuery({
    queryKey: ["streamroyale", "artist", "me"],
    queryFn: async () => {
      const res = await fetch("/api/streamroyale/artist/me", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch artist stats");
      }
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function usePayoutHistory() {
  return useQuery({
    queryKey: ["streamroyale", "payout", "history"],
    queryFn: async () => {
      const res = await fetch("/api/streamroyale/payout/history", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payout history");
      return res.json();
    },
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTENER DATA (Authenticated)
// ═══════════════════════════════════════════════════════════════════════════════

export function useListenerStatus() {
  return useQuery({
    queryKey: ["streamroyale", "listener", "status"],
    queryFn: async () => {
      const res = await fetch("/api/streamroyale/listener/status", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch listener status");
      return res.json();
    },
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function useBoost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch("/api/streamroyale/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Boost failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["streamroyale", "listener", "status"],
      });
    },
  });
}

export function useTipArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      artistProfileId,
      amount,
    }: {
      artistProfileId: number;
      amount: number;
    }) => {
      const res = await fetch("/api/streamroyale/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ artistProfileId, amount }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Tip failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streamroyale", "pool"] });
    },
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      amount: number;
      method?: string;
      paypalEmail?: string;
      bankDetails?: any;
    }) => {
      const res = await fetch("/api/streamroyale/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Payout request failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["streamroyale", "payout", "history"],
      });
      queryClient.invalidateQueries({
        queryKey: ["streamroyale", "artist", "me"],
      });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT STATUS (Authenticated)
// ═══════════════════════════════════════════════════════════════════════════════

export function useContractStatus() {
  return useQuery({
    queryKey: ["contracts", "my-contract"],
    queryFn: async () => {
      const res = await fetch("/api/contracts/my-contract", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) return null;
        throw new Error("Failed to fetch contract status");
      }
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useStreamRoyaleAdmin() {
  return useQuery({
    queryKey: ["streamroyale", "admin", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/streamroyale/admin/overview", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch admin overview");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useAdminPayouts(status?: string) {
  return useQuery({
    queryKey: ["streamroyale", "admin", "payouts", status],
    queryFn: async () => {
      const params = status && status !== "all" ? `?status=${status}` : "";
      const res = await fetch(`/api/streamroyale/admin/payouts${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch admin payouts");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useProcessPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      payoutId,
      status,
      notes,
    }: {
      payoutId: number;
      status: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/streamroyale/admin/payout/${payoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Processing failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["streamroyale", "admin", "payouts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["streamroyale", "admin", "overview"],
      });
    },
  });
}

export function useManualDistribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params?: {
      weekNumber?: number;
      yearNumber?: number;
    }) => {
      const res = await fetch("/api/streamroyale/admin/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params || {}),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Distribution failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streamroyale"] });
    },
  });
}

export function useAddToPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      description,
    }: {
      amount: number;
      description?: string;
    }) => {
      const res = await fetch("/api/streamroyale/admin/add-to-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, description }),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Failed to add to pool");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streamroyale", "pool"] });
      queryClient.invalidateQueries({ queryKey: ["streamroyale", "admin"] });
    },
  });
}

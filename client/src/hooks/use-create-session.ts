/**
 * React Query hooks for TMU live listening sessions hosted by signed-in users.
 * Statuses are the stored ones: scheduled, live, ended, cancelled.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";

const BASE = "/api/listening-sessions/user";

export type SessionStatus = "scheduled" | "live" | "ended" | "cancelled";

export interface ListeningSession {
  id: number;
  title: string;
  description: string | null;
  hostUserId: number | null;
  startsAt: string;
  endsAt: string;
  gapSeconds: number;
  status: SessionStatus;
  trackCount: number;
  totalDurationSec: number;
}

export interface RateLimitStatus {
  sessionsCreatedToday: number;
  maxPerDay: number;
  nextSessionAvailableAt: string;
}

export interface HostTrack {
  id: number;
  title: string;
  artistName: string | null;
  durationSec: number;
}

export interface HostEligibility {
  registeredArtist: boolean;
  verifiedArtist: boolean;
  canHost: boolean;
  rateLimitStatus: RateLimitStatus;
}

export interface CreateSessionInput {
  title: string;
  description?: string | null;
  startsAt: Date | string;
  gapSeconds?: number;
  trackIds: number[];
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null);
  return new Error(body?.error?.message || fallback);
}

/** Whether the signed-in user may host. */
export function useHostEligibility(enabled = true) {
  return useQuery<HostEligibility>({
    queryKey: ["tmu-host-eligibility"],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const response = await authenticatedFetch(`${BASE}/eligibility`);
      if (!response.ok) throw await readError(response, "Could not check hosting access");
      return response.json();
    },
  });
}

/** Published TMU tracks available for a listening session, optionally filtered by title or artist. */
export function useHostTracks(query: string, enabled = true) {
  return useQuery<{ tracks: HostTrack[] }>({
    queryKey: ["tmu-host-tracks", query],
    enabled,
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${BASE}/tracks?q=${encodeURIComponent(query)}&limit=30`,
      );
      if (!response.ok) throw await readError(response, "Could not load published tracks");
      return response.json();
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const startDate = typeof input.startsAt === "string" ? new Date(input.startsAt) : input.startsAt;
      const response = await authenticatedFetch(`${BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          description: input.description || null,
          startsAt: startDate.toISOString(),
          gapSeconds: input.gapSeconds ?? 0,
          trackIds: input.trackIds,
        }),
      });
      if (!response.ok) throw await readError(response, "Failed to create session");
      return response.json() as Promise<{ success: boolean; session: ListeningSession }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["tmu-host-eligibility"] });
    },
  });
}

export function useUserSessions() {
  return useQuery({
    queryKey: ["user-sessions"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const response = await authenticatedFetch(`${BASE}/my-sessions`);
      if (!response.ok) throw await readError(response, "Failed to fetch sessions");
      return response.json() as Promise<{
        success: boolean;
        sessions: ListeningSession[];
        rateLimitStatus: RateLimitStatus;
      }>;
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await authenticatedFetch(`${BASE}/${sessionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw await readError(response, "Failed to cancel session");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["tmu-host-eligibility"] });
    },
  });
}

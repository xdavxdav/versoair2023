/**
 * React Query hook for creating listening sessions (TMU)
 * Handles verified user session creation with rate limit info
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";

export interface CreateSessionInput {
  title: string;
  description?: string | null;
  startsAt: Date | string;
  gapSeconds?: number;
  tracks: number[];
}

export interface ListeningSession {
  id: number;
  title: string;
  description: string | null;
  hostUserId: number;
  startsAt: string;
  gapSeconds: number;
  status: "live" | "upcoming" | "ended" | "cancelled";
  createdAt: string;
  trackCount: number;
}

export interface RateLimitStatus {
  sessionsCreatedToday: number;
  maxPerDay: number;
  nextSessionAvailableAt: string;
}

/** Mutation hook for creating a session */
export function useCreateSession() {
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const startDate = typeof input.startsAt === "string"
        ? new Date(input.startsAt)
        : input.startsAt;

      const response = await authenticatedFetch(
        "/api/listening-sessions/user/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title,
            description: input.description || null,
            startsAt: startDate.toISOString(),
            gapSeconds: input.gapSeconds ?? 0,
            tracks: input.tracks,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        const message = error.error?.message || "Failed to create session";
        throw new Error(message);
      }

      return response.json() as Promise<{ success: boolean; session: ListeningSession }>;
    },
  });
}

/** Query hook for user's sessions */
export function useUserSessions() {
  return useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const response = await authenticatedFetch("/api/listening-sessions/user/my-sessions");
      
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      return response.json() as Promise<{
        success: boolean;
        sessions: ListeningSession[];
        rateLimitStatus: RateLimitStatus;
      }>;
    },
  });
}

/** Mutation hook for cancelling a session */
export function useCancelSession() {
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await authenticatedFetch(
        `/api/listening-sessions/user/${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to cancel session");
      }

      return response.json();
    },
  });
}

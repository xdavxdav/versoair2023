/**
 * 📬 useEmailSubscriptions — React Query hook for the email subscription system
 *
 * Provides:
 *   - subscriptions: current user's email subscriptions
 *   - tierAccess: what the user's tier allows
 *   - subscribe / update / unsubscribe mutations
 *   - available channels metadata
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

export type SubscriptionType =
  | "job_alerts"
  | "contract_alerts"
  | "reservation_tracking"
  | "geoadmin_reports"
  | "platform_updates";

export type Frequency = "instant" | "daily_digest" | "weekly_digest";

export interface EmailSubscription {
  id: string;
  userId: number;
  type: SubscriptionType;
  frequency: Frequency;
  isActive: boolean;
  filters: Record<string, any>;
  unsubscribeToken: string;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierAccess {
  currentTier: string;
  allowedTypes: SubscriptionType[];
  allowedFrequencies: Frequency[];
  allTypes: SubscriptionType[];
  allFrequencies: Frequency[];
}

export interface ChannelInfo {
  type: SubscriptionType;
  label: string;
  description: string;
  icon: string;
  color: string;
  minTier: string;
}

// ─── API FUNCTIONS ──────────────────────────────────────────────────────────────

async function fetchMySubscriptions(userId: number) {
  const res = await fetch(`/api/v1/email-subscriptions/my?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch subscriptions");
  const data = await res.json();
  return data.data as {
    subscriptions: EmailSubscription[];
    tierAccess: TierAccess;
  };
}

async function fetchAvailableChannels() {
  const res = await fetch("/api/v1/email-subscriptions/available");
  if (!res.ok) throw new Error("Failed to fetch channels");
  const data = await res.json();
  return data.data as ChannelInfo[];
}

async function subscribeToChannel(params: {
  userId: number;
  type: SubscriptionType;
  frequency?: Frequency;
  filters?: Record<string, any>;
}) {
  const res = await fetch("/api/v1/email-subscriptions/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Subscribe failed");
  return data;
}

async function updateSubscription(params: {
  id: string;
  userId: number;
  frequency?: Frequency;
  filters?: Record<string, any>;
  isActive?: boolean;
}) {
  const { id, ...body } = params;
  const res = await fetch(`/api/v1/email-subscriptions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Update failed");
  return data;
}

async function deleteSubscription(params: { id: string; userId: number }) {
  const res = await fetch(`/api/v1/email-subscriptions/${params.id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: params.userId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Unsubscribe failed");
  return data;
}

// ─── HOOK ───────────────────────────────────────────────────────────────────────

export function useEmailSubscriptions(
  userId: number | string | null | undefined,
) {
  const queryClient = useQueryClient();
  const numericUserId = userId ? Number(userId) : null;

  const subscriptionsQuery = useQuery({
    queryKey: ["email-subscriptions", numericUserId],
    queryFn: () => fetchMySubscriptions(numericUserId!),
    enabled: !!numericUserId,
    staleTime: 60_000,
  });

  const channelsQuery = useQuery({
    queryKey: ["email-channels"],
    queryFn: fetchAvailableChannels,
    staleTime: 300_000, // 5 min — rarely changes
  });

  const subscribeMutation = useMutation({
    mutationFn: subscribeToChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-subscriptions", numericUserId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-subscriptions", numericUserId],
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-subscriptions", numericUserId],
      });
    },
  });

  // Helper: check if user is subscribed to a specific channel
  const isSubscribed = (type: SubscriptionType): boolean => {
    if (!subscriptionsQuery.data) return false;
    return subscriptionsQuery.data.subscriptions.some(
      (s) => s.type === type && s.isActive,
    );
  };

  // Helper: get subscription for a specific channel
  const getSubscription = (
    type: SubscriptionType,
  ): EmailSubscription | undefined => {
    if (!subscriptionsQuery.data) return undefined;
    return subscriptionsQuery.data.subscriptions.find((s) => s.type === type);
  };

  // Helper: check if a channel type is available for the user's tier
  const canAccess = (type: SubscriptionType): boolean => {
    if (!subscriptionsQuery.data) return true; // Assume yes while loading
    return subscriptionsQuery.data.tierAccess.allowedTypes.includes(type);
  };

  return {
    // Data
    subscriptions: subscriptionsQuery.data?.subscriptions || [],
    tierAccess: subscriptionsQuery.data?.tierAccess || null,
    channels: channelsQuery.data || [],
    isLoading: subscriptionsQuery.isLoading || channelsQuery.isLoading,

    // Mutations
    subscribe: subscribeMutation.mutate,
    update: updateMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isUpdating: updateMutation.isPending,

    // Helpers
    isSubscribed,
    getSubscription,
    canAccess,
  };
}

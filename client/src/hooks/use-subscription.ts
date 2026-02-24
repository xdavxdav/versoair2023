/**
 * 🔐 useSubscription — Combines auth state + subscription tier
 *
 * Single hook for gating features behind authentication & tier levels.
 * Used by Geo Admin, navbar, home page, and any future gated features.
 *
 * Flow:
 *   1. Check localStorage for auth_token (JWT)
 *   2. If token exists → fetch /api/auth/me for user info
 *   3. Derive subscription tier from user record (default: "free")
 *   4. Expose: isAuthenticated, user, tier, loading, helpers
 */

import { useState, useEffect, useCallback } from "react";
import type { TierKey } from "@/lib/tiers";
import { TIERS, TIER_ORDER, getTierIndex } from "@/lib/tiers";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

export interface SubscriptionUser {
  id: number;
  email: string;
  username?: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
  subscriptionTier: TierKey;
  subscriptionStatus: string;
  trialTier?: TierKey | null;
  trialExpiresAt?: string | null;
}

export interface UseSubscriptionReturn {
  /** Whether initial auth check is still running */
  loading: boolean;
  /** Whether the user has a valid auth token + verified session */
  isAuthenticated: boolean;
  /** The authenticated user (null if not signed in) */
  user: SubscriptionUser | null;
  /** Effective tier — considers active trials */
  tier: TierKey;
  /** Human-readable tier name (e.g., "Pro Verified") */
  tierName: string;
  /** Check if user's effective tier meets a minimum threshold */
  hasTierAccess: (requiredTier: TierKey) => boolean;
  /** Re-fetch user from API */
  refetch: () => Promise<void>;
  /** Sign out — clears token & resets state */
  signOut: () => void;
}

// ─── TOKEN HELPERS ──────────────────────────────────────────────────────────────

const TOKEN_KEY = "auth_token";

function getStoredToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem("authToken") // legacy key used by use-auth.tsx
  );
}

function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("authToken");
}

// ─── HOOK ───────────────────────────────────────────────────────────────────────

export function useSubscription(): UseSubscriptionReturn {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SubscriptionUser | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const token = getStoredToken();

      if (!token) {
        setUser(null);
        return;
      }

      const res = await fetch("/auth/session", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        // Token expired or invalid
        if (res.status === 401) clearStoredTokens();
        setUser(null);
        return;
      }

      const data = await res.json();

      if (data.success && data.user) {
        const u = data.user;
        setUser({
          id: u.id,
          email: u.email,
          username: u.username,
          name: u.name || u.username || u.email,
          role: u.role,
          isAdmin: u.isAdmin || u.role === "admin",
          subscriptionTier: (u.subscriptionTier ||
            u.subscription_tier ||
            "free") as TierKey,
          subscriptionStatus:
            u.subscriptionStatus || u.subscription_status || "active",
          trialTier: (u.trialTier || u.trial_tier || null) as TierKey | null,
          trialExpiresAt: u.trialExpiresAt || u.trial_expires_at || null,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for cross-tab logout
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if ((e.key === TOKEN_KEY || e.key === "authToken") && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ─── Derived values ───────────────────────────────────────────────────────────

  const isAuthenticated = !!user;

  /** Effective tier — if user has an active trial, use trial tier */
  const tier: TierKey = (() => {
    if (!user) return "free";
    if (
      user.trialTier &&
      user.trialExpiresAt &&
      new Date(user.trialExpiresAt) > new Date()
    ) {
      return user.trialTier;
    }
    return user.subscriptionTier || "free";
  })();

  const tierName = TIERS[tier]?.name ?? "Free";

  const hasTierAccess = useCallback(
    (requiredTier: TierKey): boolean => {
      return getTierIndex(tier) >= getTierIndex(requiredTier);
    },
    [tier],
  );

  const signOut = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  return {
    loading,
    isAuthenticated,
    user,
    tier,
    tierName,
    hasTierAccess,
    refetch: fetchUser,
    signOut,
  };
}

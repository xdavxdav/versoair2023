/**
 * 🔐 Tier Gate Middleware
 * Enforces subscription tier requirements on routes.
 *
 * Usage:
 *   router.get("/premium-endpoint", requireTier("verified"), handler);
 *   router.get("/api-endpoint", requireTier("max"), handler);
 */

import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const TIER_ORDER: Record<string, number> = {
  free: 0,
  essential: 1,
  verified: 2,
  max: 3,
  enterprise: 4,
};

/**
 * Get the effective tier for a user (considering active trials).
 */
async function getEffectiveTier(userId: number): Promise<string> {
  const result = await pool.query(
    `SELECT subscription_tier, trial_tier, trial_expires_at FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) return "free";

  const user = result.rows[0];
  if (
    user.trial_tier &&
    user.trial_expires_at &&
    new Date(user.trial_expires_at) > new Date()
  ) {
    return user.trial_tier;
  }
  return user.subscription_tier || "free";
}

/**
 * Middleware factory — requires the user to have at least the specified tier.
 *
 * Looks for userId on:
 *   1. req.userId (set by auth middleware)
 *   2. req.query.userId (fallback for dev)
 *
 * Returns 401 if no user, 403 if tier is too low.
 */
export function requireTier(minimumTier: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || req.query.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const effectiveTier = await getEffectiveTier(Number(userId));
      const userTierLevel = TIER_ORDER[effectiveTier] ?? 0;
      const requiredTierLevel = TIER_ORDER[minimumTier] ?? 0;

      if (userTierLevel < requiredTierLevel) {
        return res.status(403).json({
          success: false,
          error: `This feature requires the ${minimumTier} tier or above. You are on ${effectiveTier}.`,
          currentTier: effectiveTier,
          requiredTier: minimumTier,
          upgradeUrl: "/pricing",
        });
      }

      // Attach tier info for downstream handlers
      (req as any).userTier = effectiveTier;
      next();
    } catch (error: any) {
      console.error("❌ Tier gate error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };
}

/**
 * Middleware — requires a specific feature to be unlocked for the user's tier.
 * featureName maps to keys in the TIER_FEATURES matrix.
 */
export function requireFeature(featureName: string) {
  // Feature → minimum tier mapping
  const FEATURE_MIN_TIER: Record<string, string> = {
    competitorInsights: "verified",
    keywordTracking: "verified",
    revenueSimulator: "verified",
    apiAccess: "max",
    videoShowcase: "max",
    promotedListing: "max",
    categorySpotlight: "max",
    newsletterFeature: "max",
    exportData: "essential",
  };

  const minimumTier = FEATURE_MIN_TIER[featureName] || "enterprise";
  return requireTier(minimumTier);
}

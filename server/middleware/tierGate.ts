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

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS TIER GATE — Gates features by business subscription tier
// (Separate from user subscription — this is for the business listing itself)
// ═══════════════════════════════════════════════════════════════════════════════

const BUSINESS_TIER_ORDER: Record<string, number> = {
  free: 0,
  premium: 1,
  enterprise: 2,
};

/**
 * Middleware factory — requires the business to have at least the specified tier.
 * Expects businessId in req.params.businessId or req.body.businessId.
 */
export function requireBusinessTier(minimumTier: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.businessId || req.body.businessId;
      if (!businessId) {
        return res
          .status(400)
          .json({ success: false, error: "businessId is required" });
      }

      const result = await pool.query(
        `SELECT tier, tier_expires_at FROM businesses WHERE id = $1`,
        [businessId],
      );
      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Business not found" });
      }

      const biz = result.rows[0];
      let effectiveTier = biz.tier || "free";

      // Check if tier has expired
      if (biz.tier_expires_at && new Date(biz.tier_expires_at) < new Date()) {
        effectiveTier = "free";
        // Auto-downgrade expired tiers
        await pool.query(`UPDATE businesses SET tier = 'free' WHERE id = $1`, [
          businessId,
        ]);
      }

      const bizTierLevel = BUSINESS_TIER_ORDER[effectiveTier] ?? 0;
      const requiredLevel = BUSINESS_TIER_ORDER[minimumTier] ?? 0;

      if (bizTierLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: `This feature requires a ${minimumTier} business tier. Current: ${effectiveTier}.`,
          currentTier: effectiveTier,
          requiredTier: minimumTier,
          upgradeUrl: "/settings/billing",
        });
      }

      (req as any).businessTier = effectiveTier;
      next();
    } catch (error: any) {
      console.error("❌ Business tier gate error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };
}

/**
 * Business feature → minimum business tier mapping.
 */
export function requireBusinessFeature(featureName: string) {
  const BUSINESS_FEATURE_MIN: Record<string, string> = {
    verifiedBadge: "premium",
    analyticsDashboard: "premium",
    prioritySearch: "premium",
    responseTimeTracking: "premium",
    photoGallery20: "premium",
    topPlacement: "enterprise",
    customBranding: "enterprise",
    apiAccess: "enterprise",
    unlimitedMedia: "enterprise",
    multiLocation: "enterprise",
    dedicatedSupport: "enterprise",
  };

  const minimumTier = BUSINESS_FEATURE_MIN[featureName] || "enterprise";
  return requireBusinessTier(minimumTier);
}

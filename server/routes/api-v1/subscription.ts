/**
 * 🛸 Business Growth Engine — Subscription API Endpoints
 *
 * Manages tier upgrades/downgrades, trial management, feature access checks,
 * and billing-related queries for the 5-tier subscription system.
 *
 * Tiers: free → essential → verified → max → enterprise
 */

import { Router, Request, Response } from "express";
import { db, pool } from "../../db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

const router = Router();

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const VALID_TIERS = [
  "free",
  "essential",
  "verified",
  "max",
  "enterprise",
] as const;
type TierKey = (typeof VALID_TIERS)[number];

const TIER_ORDER: Record<TierKey, number> = {
  free: 0,
  essential: 1,
  verified: 2,
  max: 3,
  enterprise: 4,
};

const TRIAL_DURATION_DAYS = 7;

/** Feature matrix — aligned with client/src/lib/tiers.ts */
const TIER_FEATURES: Record<TierKey, Record<string, any>> = {
  free: {
    photos: 1,
    analytics: "basic",
    support: "community",
    maxProducts: 5,
    customUrl: false,
    keywordTracking: false,
    competitorInsights: false,
    newsletterFeature: false,
    videoShowcase: false,
    promotedListing: false,
    categorySpotlight: false,
    revenueSimulator: false,
    apiAccess: false,
    exportData: false,
    socialMediaLinks: 1,
    emailChannels: ["job_alerts", "contract_alerts", "platform_updates"],
    instantDelivery: false,
    reservationTracking: false,
    geoAdminReports: false,
  },
  essential: {
    photos: 5,
    analytics: "detailed",
    support: "email",
    maxProducts: 20,
    customUrl: false,
    keywordTracking: false,
    competitorInsights: false,
    newsletterFeature: false,
    videoShowcase: false,
    promotedListing: false,
    categorySpotlight: false,
    revenueSimulator: false,
    apiAccess: false,
    exportData: true,
    socialMediaLinks: 3,
    emailChannels: [
      "job_alerts",
      "contract_alerts",
      "reservation_tracking",
      "platform_updates",
    ],
    instantDelivery: false,
    reservationTracking: true,
    geoAdminReports: false,
  },
  verified: {
    photos: 15,
    analytics: "full",
    support: "priority_email",
    maxProducts: 100,
    customUrl: true,
    keywordTracking: true,
    competitorInsights: true,
    newsletterFeature: false,
    videoShowcase: true,
    promotedListing: true,
    categorySpotlight: false,
    revenueSimulator: true,
    apiAccess: false,
    exportData: true,
    socialMediaLinks: 5,
    emailChannels: [
      "job_alerts",
      "contract_alerts",
      "reservation_tracking",
      "geoadmin_reports",
      "platform_updates",
    ],
    instantDelivery: true,
    reservationTracking: true,
    geoAdminReports: true,
  },
  max: {
    photos: 50,
    analytics: "predictive",
    support: "chat",
    maxProducts: 500,
    customUrl: true,
    keywordTracking: true,
    competitorInsights: true,
    newsletterFeature: true,
    videoShowcase: true,
    promotedListing: true,
    categorySpotlight: true,
    revenueSimulator: true,
    apiAccess: true,
    exportData: true,
    socialMediaLinks: -1,
    emailChannels: [
      "job_alerts",
      "contract_alerts",
      "reservation_tracking",
      "geoadmin_reports",
      "platform_updates",
    ],
    instantDelivery: true,
    reservationTracking: true,
    geoAdminReports: true,
  },
  enterprise: {
    photos: -1, // unlimited
    analytics: "predictive",
    support: "dedicated",
    maxProducts: -1, // unlimited
    customUrl: true,
    keywordTracking: true,
    competitorInsights: true,
    newsletterFeature: true,
    videoShowcase: true,
    promotedListing: true,
    categorySpotlight: true,
    revenueSimulator: true,
    apiAccess: true,
    exportData: true,
    socialMediaLinks: -1,
    emailChannels: [
      "job_alerts",
      "contract_alerts",
      "reservation_tracking",
      "geoadmin_reports",
      "platform_updates",
    ],
    instantDelivery: true,
    reservationTracking: true,
    geoAdminReports: true,
  },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function isValidTier(tier: string): tier is TierKey {
  return VALID_TIERS.includes(tier as TierKey);
}

function getEffectiveTier(user: any): TierKey {
  // If user has an active trial, use the trial tier
  if (
    user.trial_tier &&
    user.trial_expires_at &&
    new Date(user.trial_expires_at) > new Date()
  ) {
    return user.trial_tier as TierKey;
  }
  return (user.subscription_tier || "free") as TierKey;
}

// ─── ENDPOINTS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/subscription/status
 * Returns the current user's subscription status, tier, features, and trial info.
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    // Get userId from auth middleware (globalAuthGate sets req.user)
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT id, username, email, subscription_tier, subscription_status,
              premium_expires_at, trial_tier, trial_started_at, trial_expires_at
       FROM users WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = result.rows[0];
    const effectiveTier = getEffectiveTier(user);
    const features = TIER_FEATURES[effectiveTier];

    const isTrialing =
      user.trial_tier &&
      user.trial_expires_at &&
      new Date(user.trial_expires_at) > new Date();

    res.json({
      success: true,
      data: {
        userId: user.id,
        currentTier: user.subscription_tier || "free",
        effectiveTier,
        subscriptionStatus: user.subscription_status || "active",
        premiumExpiresAt: user.premium_expires_at,
        trial: isTrialing
          ? {
              tier: user.trial_tier,
              startedAt: user.trial_started_at,
              expiresAt: user.trial_expires_at,
              daysRemaining: Math.max(
                0,
                Math.ceil(
                  (new Date(user.trial_expires_at).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                ),
              ),
            }
          : null,
        features,
        tierOrder: TIER_ORDER[effectiveTier],
      },
    });
  } catch (error: any) {
    console.error("❌ Subscription status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/subscription/upgrade
 * Upgrades a user to a new tier (or starts a trial).
 * Body: { userId, targetTier, startTrial?: boolean }
 */
router.post("/upgrade", async (req: Request, res: Response) => {
  try {
    const { userId, targetTier, startTrial = false } = req.body;

    if (!userId || !targetTier) {
      return res
        .status(400)
        .json({ success: false, error: "userId and targetTier are required" });
    }

    if (!isValidTier(targetTier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier: ${targetTier}. Valid: ${VALID_TIERS.join(", ")}`,
      });
    }

    // Fetch current user
    const userResult = await pool.query(
      `SELECT id, subscription_tier, trial_tier, trial_expires_at FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const currentTierOrder =
      TIER_ORDER[(user.subscription_tier || "free") as TierKey];
    const targetTierOrder = TIER_ORDER[targetTier as TierKey];

    if (targetTierOrder <= currentTierOrder && !startTrial) {
      return res.status(400).json({
        success: false,
        error: "Target tier must be higher than current tier for an upgrade",
      });
    }

    if (startTrial) {
      // Check if user already had a trial
      if (user.trial_tier) {
        return res.status(400).json({
          success: false,
          error: "Trial already used. Only one trial per account.",
        });
      }

      const trialExpires = new Date();
      trialExpires.setDate(trialExpires.getDate() + TRIAL_DURATION_DAYS);

      await pool.query(
        `UPDATE users
         SET trial_tier = $1,
             trial_started_at = NOW(),
             trial_expires_at = $2,
             subscription_status = 'trialing'
         WHERE id = $3`,
        [targetTier, trialExpires.toISOString(), userId],
      );

      return res.json({
        success: true,
        message: `${TRIAL_DURATION_DAYS}-day trial of ${targetTier} started!`,
        data: {
          trialTier: targetTier,
          expiresAt: trialExpires.toISOString(),
          daysRemaining: TRIAL_DURATION_DAYS,
        },
      });
    }

    // Direct upgrade (would integrate with payment provider)
    await pool.query(
      `UPDATE users
       SET subscription_tier = $1,
           subscription_status = 'active',
           premium_expires_at = NULL
       WHERE id = $2`,
      [targetTier, userId],
    );

    res.json({
      success: true,
      message: `Upgraded to ${targetTier} successfully!`,
      data: {
        newTier: targetTier,
        features: TIER_FEATURES[targetTier as TierKey],
      },
    });
  } catch (error: any) {
    console.error("❌ Subscription upgrade error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/subscription/downgrade
 * Downgrades a user to a lower tier.
 * Body: { userId, targetTier }
 */
router.post("/downgrade", async (req: Request, res: Response) => {
  try {
    const { userId, targetTier } = req.body;

    if (!userId || !targetTier) {
      return res
        .status(400)
        .json({ success: false, error: "userId and targetTier are required" });
    }

    if (!isValidTier(targetTier)) {
      return res
        .status(400)
        .json({ success: false, error: `Invalid tier: ${targetTier}` });
    }

    const userResult = await pool.query(
      `SELECT id, subscription_tier FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentTier = (userResult.rows[0].subscription_tier ||
      "free") as TierKey;
    if (TIER_ORDER[targetTier as TierKey] >= TIER_ORDER[currentTier]) {
      return res.status(400).json({
        success: false,
        error: "Target tier must be lower than current tier for a downgrade",
      });
    }

    // Schedule downgrade at end of billing period (for now, immediate)
    await pool.query(
      `UPDATE users
       SET subscription_tier = $1,
           subscription_status = 'active'
       WHERE id = $2`,
      [targetTier, userId],
    );

    res.json({
      success: true,
      message: `Downgraded to ${targetTier}. Changes are effective immediately.`,
      data: {
        newTier: targetTier,
        features: TIER_FEATURES[targetTier as TierKey],
      },
    });
  } catch (error: any) {
    console.error("❌ Subscription downgrade error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/subscription/feature-check
 * Quick check if a specific feature is available for a user.
 * Query: ?userId=X&feature=keywordTracking
 */
router.get("/feature-check", async (req: Request, res: Response) => {
  try {
    const { userId, feature } = req.query;

    if (!userId || !feature) {
      return res
        .status(400)
        .json({ success: false, error: "userId and feature are required" });
    }

    const result = await pool.query(
      `SELECT subscription_tier, trial_tier, trial_expires_at FROM users WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = result.rows[0];
    const effectiveTier = getEffectiveTier(user);
    const features = TIER_FEATURES[effectiveTier];
    const featureValue = features[feature as string];

    const hasAccess =
      featureValue === true ||
      featureValue === -1 ||
      (typeof featureValue === "number" && featureValue > 0) ||
      (typeof featureValue === "string" &&
        featureValue !== "none" &&
        featureValue !== "basic");

    // Find minimum tier that unlocks this feature
    let minimumTier: TierKey = "enterprise";
    for (const tier of VALID_TIERS) {
      const val = TIER_FEATURES[tier][feature as string];
      if (
        val === true ||
        val === -1 ||
        (typeof val === "number" && val > 0) ||
        (typeof val === "string" && val !== "none" && val !== "basic")
      ) {
        minimumTier = tier;
        break;
      }
    }

    res.json({
      success: true,
      data: {
        feature: feature as string,
        hasAccess,
        currentTier: effectiveTier,
        featureValue,
        minimumTier,
      },
    });
  } catch (error: any) {
    console.error("❌ Feature check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/subscription/tiers
 * Public endpoint — returns all tier definitions and pricing for the comparison modal.
 */
router.get("/tiers", async (_req: Request, res: Response) => {
  const tiers = VALID_TIERS.map((tier) => ({
    key: tier,
    order: TIER_ORDER[tier],
    features: TIER_FEATURES[tier],
    pricing: {
      free: { monthly: 0, annual: 0 },
      essential: { monthly: 29, annual: 290 },
      verified: { monthly: 79, annual: 790 },
      max: { monthly: 149, annual: 1490 },
      enterprise: { monthly: 499, annual: 4990 },
    }[tier],
  }));

  res.json({ success: true, data: tiers });
});

/**
 * POST /api/v1/subscription/cancel-trial
 * Cancels an active trial and reverts to the base subscription tier.
 * Body: { userId }
 */
router.post("/cancel-trial", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const result = await pool.query(
      `SELECT id, subscription_tier, trial_tier, trial_expires_at FROM users WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = result.rows[0];
    if (!user.trial_tier) {
      return res
        .status(400)
        .json({ success: false, error: "No active trial to cancel" });
    }

    await pool.query(
      `UPDATE users
       SET trial_expires_at = NOW(),
           subscription_status = 'active'
       WHERE id = $1`,
      [userId],
    );

    res.json({
      success: true,
      message: "Trial cancelled. Reverted to base subscription tier.",
      data: {
        baseTier: user.subscription_tier || "free",
      },
    });
  } catch (error: any) {
    console.error("❌ Cancel trial error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

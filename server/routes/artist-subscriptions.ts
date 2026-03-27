/**
 * Artist Subscriptions — "Artist Fuel" Tiers
 *
 * Spark (Free)  → 3 tracks/year, basic analytics, discovery division
 * Flame ($29)   → 24 tracks/year, HD upload, collabs, 5 boosts/mo
 * Blaze ($79)   → Unlimited, FLAC, priority A&R, 15 boosts/mo
 * Inferno ($149) → Unlimited, DM listeners, exclusive contests, 50 boosts/mo
 *
 * Payment via platform wallet (1st), PayPal, crypto (coming soon), mobile money (coming soon)
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// TIER DEFINITIONS — Single source of truth
// ═══════════════════════════════════════════════════════════════════════════════
const ARTIST_TIERS: Record<
  string,
  {
    name: string;
    nameFr: string;
    price: number;
    currency: string;
    period: string;
    uploadLimit: number; // -1 = unlimited
    maxQuality: string;
    boostCreditsPerMonth: number;
    canCollaborate: boolean;
    priorityAR: boolean;
    directMessaging: boolean;
    exclusiveContests: boolean;
    featuredRotation: boolean;
    homepageFeaturing: boolean;
    contractGradeEligible: string[]; // which contract grades this tier unlocks
    description: string;
    descriptionFr: string;
    color: string;
    icon: string;
  }
> = {
  spark: {
    name: "Spark",
    nameFr: "Étincelle",
    price: 0,
    currency: "USD",
    period: "forever",
    uploadLimit: 3,
    maxQuality: "128",
    boostCreditsPerMonth: 0,
    canCollaborate: false,
    priorityAR: false,
    directMessaging: false,
    exclusiveContests: false,
    featuredRotation: false,
    homepageFeaturing: false,
    contractGradeEligible: [],
    description:
      "Start your journey — 3 tracks/year, basic analytics, Discovery division",
    descriptionFr:
      "Commencez votre parcours — 3 titres/an, analytics de base, division Découverte",
    color: "#6B7280",
    icon: "✨",
  },
  flame: {
    name: "Flame",
    nameFr: "Flamme",
    price: 29,
    currency: "USD",
    period: "yearly",
    uploadLimit: 24,
    maxQuality: "320",
    boostCreditsPerMonth: 5,
    canCollaborate: true,
    priorityAR: false,
    directMessaging: false,
    exclusiveContests: false,
    featuredRotation: false,
    homepageFeaturing: false,
    contractGradeEligible: ["C"],
    description:
      "24 tracks/year, HD upload (320kbps), collaboration access, 5 boost credits/mo",
    descriptionFr:
      "24 titres/an, upload HD (320kbps), accès collaborations, 5 crédits boost/mois",
    color: "#F97316",
    icon: "🔥",
  },
  blaze: {
    name: "Blaze",
    nameFr: "Brasier",
    price: 79,
    currency: "USD",
    period: "yearly",
    uploadLimit: -1,
    maxQuality: "flac",
    boostCreditsPerMonth: 15,
    canCollaborate: true,
    priorityAR: true,
    directMessaging: false,
    exclusiveContests: false,
    featuredRotation: true,
    homepageFeaturing: false,
    contractGradeEligible: ["C", "B"],
    description:
      "Unlimited uploads, FLAC quality, priority A&R review, 15 boosts/mo, featured rotation",
    descriptionFr:
      "Uploads illimités, qualité FLAC, évaluation A&R prioritaire, 15 boosts/mois, rotation vedette",
    color: "#EF4444",
    icon: "🔥🔥",
  },
  inferno: {
    name: "Inferno",
    nameFr: "Inferno",
    price: 149,
    currency: "USD",
    period: "yearly",
    uploadLimit: -1,
    maxQuality: "flac",
    boostCreditsPerMonth: 50,
    canCollaborate: true,
    priorityAR: true,
    directMessaging: true,
    exclusiveContests: true,
    featuredRotation: true,
    homepageFeaturing: true,
    contractGradeEligible: ["C", "B", "A"],
    description:
      "Everything + direct listener messaging, exclusive contests, 50 boosts/mo, homepage featuring",
    descriptionFr:
      "Tout inclus + messagerie directe, concours exclusifs, 50 boosts/mois, mise en avant page d'accueil",
    color: "#7C3AED",
    icon: "👑",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /tiers — List all artist subscription tiers
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/tiers", async (_req: Request, res: Response) => {
  const tiers = Object.entries(ARTIST_TIERS).map(([key, tier]) => ({
    id: key,
    ...tier,
    uploadLimit: tier.uploadLimit === -1 ? "Illimité" : tier.uploadLimit,
  }));
  res.json({ success: true, tiers });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /my-subscription — Current artist's subscription
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  "/my-subscription",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user ? parseInt(req.user.userId) : null;
      if (!userId) {
        return res.json({
          success: true,
          subscription: null,
          tier: ARTIST_TIERS.spark,
          tierId: "spark",
        });
      }

      const result = await pool.query(
        `SELECT as2.*, ap.stage_name, ap.artist_code, ap.division
       FROM artist_subscriptions as2
       JOIN artist_profiles ap ON ap.id = as2.artist_profile_id
       WHERE ap.user_id = $1 AND as2.status = 'active'
       LIMIT 1`,
        [userId],
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          subscription: null,
          tier: ARTIST_TIERS.spark,
          tierId: "spark",
        });
      }

      const sub = result.rows[0];
      const tierInfo = ARTIST_TIERS[sub.tier] || ARTIST_TIERS.spark;

      res.json({
        success: true,
        subscription: sub,
        tier: tierInfo,
        tierId: sub.tier,
      });
    } catch (err: any) {
      console.error("[ARTIST-SUB] My subscription error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch subscription" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /subscribe — Subscribe or upgrade tier (wallet-based payment)
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/subscribe",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { tier, paymentMethod } = req.body;

      if (!tier || !ARTIST_TIERS[tier]) {
        return res.status(400).json({
          success: false,
          error: "Invalid tier. Choose: spark, flame, blaze, inferno",
        });
      }

      const tierInfo = ARTIST_TIERS[tier];

      // Spark is always free
      if (tier === "spark") {
        // Ensure artist profile exists
        const profile = await pool.query(
          `SELECT id FROM artist_profiles WHERE user_id = $1`,
          [userId],
        );
        if (profile.rows.length === 0) {
          return res
            .status(400)
            .json({ success: false, error: "Artist profile required" });
        }

        await pool.query(
          `INSERT INTO artist_subscriptions (artist_profile_id, tier, payment_method, status, current_period_start, boost_credits_remaining)
         VALUES ($1, 'spark', 'none', 'active', NOW(), 0)
         ON CONFLICT (artist_profile_id) DO UPDATE SET tier = 'spark', status = 'active', updated_at = NOW()`,
          [profile.rows[0].id],
        );

        return res.json({
          success: true,
          message: "Spark tier activated (free)",
          tier: tierInfo,
        });
      }

      // Paid tiers — debit from platform wallet
      const method = paymentMethod || "wallet";

      if (method === "wallet") {
        // Check wallet balance
        const wallet = await pool.query(
          `SELECT id, balance FROM platform_wallets WHERE user_id = $1 AND status = 'active'`,
          [userId],
        );

        if (
          wallet.rows.length === 0 ||
          parseFloat(wallet.rows[0].balance) < tierInfo.price
        ) {
          return res.status(402).json({
            success: false,
            error: `Insufficient wallet balance. Need $${tierInfo.price}, you have $${wallet.rows[0]?.balance || "0.00"}`,
            required: tierInfo.price,
            balance: wallet.rows[0]?.balance || "0.00",
          });
        }

        const walletId = wallet.rows[0].id;
        const balanceBefore = wallet.rows[0].balance;
        const balanceAfter = (
          parseFloat(balanceBefore) - tierInfo.price
        ).toFixed(2);

        // Debit wallet
        await pool.query(
          `UPDATE platform_wallets SET balance = $1, total_spent = total_spent + $2, last_transaction_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
          [balanceAfter, tierInfo.price, walletId],
        );

        // Record transaction
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, payment_method, description, related_entity_type, status)
         VALUES ($1, $2, 'subscription_payment', $3, $4, $5, 'wallet', $6, 'subscription', 'completed')`,
          [
            walletId,
            userId,
            tierInfo.price,
            balanceBefore,
            balanceAfter,
            `Artist subscription: ${tierInfo.name} tier ($${tierInfo.price}/yr)`,
          ],
        );
      } else if (method === "paypal") {
        // Redirect to PayPal checkout — client calls /api/paypal/create-order
        return res.json({
          success: true,
          redirect: "/api/paypal/create-order",
          paymentMethod: "paypal",
          message: `Proceed to PayPal to pay $${tierInfo.price} for ${tierInfo.name} tier. Call POST /api/paypal/create-order with { amount: ${tierInfo.price}, purpose: 'subscription_${tier}' }`,
          amount: tierInfo.price,
          tier: tier,
        });
      } else if (method === "crypto" || method === "mobile_money") {
        return res.json({
          success: false,
          availableSoon: true,
          message: `${method === "crypto" ? "Crypto payments (BTC, USDT)" : "Mobile Money (Orange Money, MTN, Wave)"} — AVAILABLE SOON`,
        });
      } else if (method === "bank") {
        return res.json({
          success: false,
          message:
            "Bank transfer requires minimum $500 in tracked platform activity. Submit a transfer request via /api/payments/bank-transfer",
        });
      }

      // Upsert subscription
      const profile = await pool.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1`,
        [userId],
      );
      if (profile.rows.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Artist profile required" });
      }

      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await pool.query(
        `INSERT INTO artist_subscriptions (artist_profile_id, tier, payment_method, current_period_start, current_period_end, boost_credits_remaining, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (artist_profile_id) DO UPDATE SET
         tier = $2, payment_method = $3, current_period_start = $4, current_period_end = $5,
         boost_credits_remaining = $6, upload_count_this_period = 0, status = 'active', updated_at = NOW()`,
        [
          profile.rows[0].id,
          tier,
          method,
          periodStart,
          periodEnd,
          tierInfo.boostCreditsPerMonth,
        ],
      );

      res.json({
        success: true,
        message: `Subscribed to ${tierInfo.name} tier!`,
        tier: tierInfo,
        tierId: tier,
        periodStart,
        periodEnd,
      });
    } catch (err: any) {
      console.error("[ARTIST-SUB] Subscribe error:", err);
      res.status(500).json({ success: false, error: "Failed to subscribe" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /cancel — Cancel subscription (reverts to Spark at period end)
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/cancel", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);

    const result = await pool.query(
      `UPDATE artist_subscriptions SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE artist_profile_id = (SELECT id FROM artist_profiles WHERE user_id = $1)
       AND status = 'active'
       RETURNING *`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No active subscription found" });
    }

    res.json({
      success: true,
      message:
        "Subscription cancelled. You'll retain benefits until the end of your current period.",
      endsAt: result.rows[0].current_period_end,
    });
  } catch (err: any) {
    console.error("[ARTIST-SUB] Cancel error:", err);
    res.status(500).json({ success: false, error: "Failed to cancel" });
  }
});

export default router;

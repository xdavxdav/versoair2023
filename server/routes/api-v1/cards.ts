/**
 * 💳 VERSO AIR CARD — Stripe Issuing + Points Rewards
 *
 * Virtual card issuance with tier-based points earning.
 * Users earn points on every Verso Air Card purchase, with multipliers based on subscription tier.
 *
 * ENDPOINTS:
 *   POST /api/v1/cards/cardholder        → Create Stripe Issuing cardholder
 *   POST /api/v1/cards/issue             → Issue a virtual card
 *   GET  /api/v1/cards/my-cards          → List user's issued cards
 *   GET  /api/v1/cards/:cardId/details   → Retrieve full card details (PAN, CVV, exp) — cardholder only
 *   POST /api/v1/cards/:cardId/freeze    → Freeze/unfreeze card
 *   POST /api/v1/cards/:cardId/cancel    → Cancel card permanently
 *
 *   GET  /api/v1/cards/points/balance    → Current points balance + tier multiplier
 *   GET  /api/v1/cards/points/history    → Points ledger history
 *   POST /api/v1/cards/points/redeem     → Redeem points for rewards
 *   GET  /api/v1/cards/points/rewards    → Available redemption options
 *
 *   POST /api/v1/cards/webhook/issuing   → Stripe Issuing webhook (authorization, transactions)
 */

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { pool } from "../../db";

const router = Router();

// ─── STRIPE ISSUING INIT ────────────────────────────────────────────────────────

let stripe: Stripe | null = null;

function initStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as any,
    });
  }
  return stripe;
}

function requireStripe(res: Response): boolean {
  if (!initStripe()) {
    res.status(503).json({
      success: false,
      error: "Stripe not configured — set STRIPE_SECRET_KEY",
    });
    return false;
  }
  return true;
}

// ─── TIER POINTS MULTIPLIERS ────────────────────────────────────────────────────

const TIER_MULTIPLIERS: Record<string, number> = {
  free: 1.0,
  essential: 1.5,
  verified: 2.0,
  max: 3.0,
  enterprise: 5.0,
};

// Category bonuses: extra multiplier on specific merchant categories
const CATEGORY_BONUSES: Record<string, { bonus: number; label: string }> = {
  restaurants: { bonus: 0.5, label: "Dining" },
  travel: { bonus: 0.5, label: "Travel" },
  software: { bonus: 0.5, label: "Software & SaaS" },
  advertising: { bonus: 1.0, label: "Advertising" },
  office_supplies: { bonus: 0.25, label: "Office Supplies" },
  professional_services: { bonus: 0.5, label: "Professional Services" },
};

// Points per $1 spent (base)
const BASE_POINTS_PER_DOLLAR = 10;

// ─── SPENDING LIMITS BY TIER ────────────────────────────────────────────────────

const TIER_SPENDING_LIMITS: Record<
  string,
  { amount: number; interval: string }
> = {
  free: { amount: 500, interval: "monthly" },
  essential: { amount: 2000, interval: "monthly" },
  verified: { amount: 5000, interval: "monthly" },
  max: { amount: 15000, interval: "monthly" },
  enterprise: { amount: 50000, interval: "monthly" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD ISSUANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/cards/cardholder
 * Create a Stripe Issuing cardholder for the authenticated user.
 */
router.post("/cardholder", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    // Get user details
    const userResult = await pool.query(
      `SELECT id, username, email, name, subscription_tier, stripe_customer_id
       FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const { name, line1, city, state, postal_code, country } = req.body;

    // Check if cardholder already exists
    const existingCard = await pool.query(
      `SELECT stripe_cardholder_id FROM issued_cards WHERE user_id = $1 LIMIT 1`,
      [userId],
    );

    let cardholderId: string;

    if (
      existingCard.rows.length > 0 &&
      existingCard.rows[0].stripe_cardholder_id
    ) {
      cardholderId = existingCard.rows[0].stripe_cardholder_id;
    } else {
      // Create Stripe Issuing cardholder
      const cardholder = await stripe!.issuing.cardholders.create({
        name: name || user.name || user.username,
        email: user.email,
        type: "individual",
        billing: {
          address: {
            line1: line1 || "123 Main St",
            city: city || "San Francisco",
            state: state || "CA",
            postal_code: postal_code || "94111",
            country: country || "US",
          },
        },
      });
      cardholderId = cardholder.id;
    }

    res.json({
      success: true,
      data: { cardholderId },
    });
  } catch (error: any) {
    console.error("❌ Create cardholder error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/cards/issue
 * Issue a new virtual card for the authenticated user.
 */
router.post("/issue", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { userId, cardholderId, label } = req.body;
    if (!userId || !cardholderId) {
      return res
        .status(400)
        .json({
          success: false,
          error: "userId and cardholderId are required",
        });
    }

    // Get user tier
    const userResult = await pool.query(
      `SELECT id, username, email, name, subscription_tier FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const tier = user.subscription_tier || "free";
    const spendLimit = TIER_SPENDING_LIMITS[tier] || TIER_SPENDING_LIMITS.free;
    const multiplier = TIER_MULTIPLIERS[tier] || 1.0;

    // Check card limit per user (1 active card for free/essential, 3 for higher)
    const activeCards = await pool.query(
      `SELECT COUNT(*) as count FROM issued_cards WHERE user_id = $1 AND card_status = 'active'`,
      [userId],
    );
    const maxCards = ["verified", "max", "enterprise"].includes(tier) ? 3 : 1;
    if (parseInt(activeCards.rows[0].count) >= maxCards) {
      return res.status(400).json({
        success: false,
        error: `Your ${tier} plan allows up to ${maxCards} active card(s). Cancel an existing card first.`,
      });
    }

    // Issue virtual card via Stripe
    const card = await stripe!.issuing.cards.create({
      cardholder: cardholderId,
      currency: "usd",
      type: "virtual",
      spending_controls: {
        spending_limits: [
          {
            amount: spendLimit.amount * 100, // Stripe uses cents
            interval: spendLimit.interval as any,
          },
        ],
      },
    });

    // Save to DB
    const result = await pool.query(
      `INSERT INTO issued_cards
       (user_id, stripe_card_id, stripe_cardholder_id, card_brand, card_last4,
        card_exp_month, card_exp_year, card_type, card_status,
        spending_limit_amount, spending_limit_interval, currency,
        cardholder_name, tier_at_issuance, points_multiplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'virtual', 'active', $8, $9, 'USD', $10, $11, $12)
       RETURNING *`,
      [
        userId,
        card.id,
        cardholderId,
        card.brand || "Visa",
        card.last4,
        card.exp_month,
        card.exp_year,
        spendLimit.amount,
        spendLimit.interval,
        user.name || user.username,
        tier,
        multiplier,
      ],
    );

    // Award sign-up bonus points
    const bonusPoints = {
      free: 100,
      essential: 250,
      verified: 500,
      max: 1000,
      enterprise: 2500,
    };
    const bonus = bonusPoints[tier as keyof typeof bonusPoints] || 100;

    await pool.query(
      `INSERT INTO points_ledger
       (user_id, issued_card_id, type, points, balance, description, tier_at_earning)
       VALUES ($1, $2, 'bonus', $3, $4, $5, $6)`,
      [
        userId,
        result.rows[0].id,
        bonus,
        bonus,
        `🎉 Welcome bonus — Verso Air Card issued (${tier} tier)`,
        tier,
      ],
    );

    console.log(
      `✅ Verso Air Card issued: ${card.brand} ****${card.last4} → User ${userId} (${tier} tier, ${multiplier}x points)`,
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        welcomeBonus: bonus,
      },
    });
  } catch (error: any) {
    console.error("❌ Issue card error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/cards/my-cards
 * List all issued cards for the authenticated user.
 */
router.get("/my-cards", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT ic.*,
              u.username, u.email, u.subscription_tier as current_tier,
              (SELECT COALESCE(SUM(points), 0) FROM points_ledger WHERE user_id = ic.user_id AND expired_at IS NULL) as total_points
       FROM issued_cards ic
       JOIN users u ON u.id = ic.user_id
       WHERE ic.user_id = $1
       ORDER BY ic.card_status = 'active' DESC, ic.created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("❌ List cards error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/cards/:cardId/details
 * Retrieve FULL card details (PAN, CVC, exp) from Stripe Issuing.
 * This is the endpoint that shows the CVV — only to the cardholder.
 */
router.get("/:cardId/details", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { cardId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    // Verify ownership
    const cardResult = await pool.query(
      `SELECT * FROM issued_cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );

    if (cardResult.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: "Card not found or not yours" });
    }

    const card = cardResult.rows[0];

    // Retrieve full card details from Stripe (includes number + cvc)
    const stripeCard = await stripe!.issuing.cards.retrieve(
      card.stripe_card_id,
      { expand: ["number", "cvc"] },
    );

    res.json({
      success: true,
      data: {
        id: card.id,
        brand: card.card_brand,
        last4: card.card_last4,
        expMonth: card.card_exp_month,
        expYear: card.card_exp_year,
        cardholderName: card.cardholder_name,
        status: card.card_status,
        // Full sensitive details (only via Stripe Issuing)
        number: (stripeCard as any).number, // Full 16-digit PAN
        cvc: (stripeCard as any).cvc, // The CVV/CVC
        // Spending & points
        spendingLimit: card.spending_limit_amount,
        spendingInterval: card.spending_limit_interval,
        pointsMultiplier: card.points_multiplier,
        tier: card.tier_at_issuance,
      },
    });
  } catch (error: any) {
    console.error("❌ Card details error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/cards/:cardId/freeze
 * Toggle freeze/unfreeze on a card.
 */
router.post("/:cardId/freeze", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { cardId } = req.params;
    const userId = req.user?.userId;
    const { freeze } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const cardResult = await pool.query(
      `SELECT * FROM issued_cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );

    if (cardResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: "Card not found" });
    }

    const card = cardResult.rows[0];
    const newStatus = freeze ? "inactive" : "active";

    await stripe!.issuing.cards.update(card.stripe_card_id, {
      status: newStatus,
    });

    await pool.query(
      `UPDATE issued_cards SET card_status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, cardId],
    );

    res.json({
      success: true,
      data: { status: newStatus },
    });
  } catch (error: any) {
    console.error("❌ Freeze card error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/cards/:cardId/cancel
 * Permanently cancel a card.
 */
router.post("/:cardId/cancel", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { cardId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const cardResult = await pool.query(
      `SELECT * FROM issued_cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );

    if (cardResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: "Card not found" });
    }

    const card = cardResult.rows[0];

    await stripe!.issuing.cards.update(card.stripe_card_id, {
      status: "canceled",
    });

    await pool.query(
      `UPDATE issued_cards SET card_status = 'canceled', canceled_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [cardId],
    );

    res.json({
      success: true,
      data: { status: "canceled" },
    });
  } catch (error: any) {
    console.error("❌ Cancel card error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POINTS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/cards/points/balance
 * Get current points balance, tier multiplier, and summary stats.
 */
router.get("/points/balance", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    // Get user tier
    const userResult = await pool.query(
      `SELECT subscription_tier FROM users WHERE id = $1`,
      [userId],
    );
    const tier = userResult.rows[0]?.subscription_tier || "free";
    const multiplier = TIER_MULTIPLIERS[tier] || 1.0;

    // Calculate balance (sum of non-expired points)
    const balanceResult = await pool.query(
      `SELECT
         COALESCE(SUM(points), 0) as total_balance,
         COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END), 0) as total_earned,
         COALESCE(SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END), 0) as total_redeemed,
         COALESCE(SUM(CASE WHEN type = 'bonus' THEN points ELSE 0 END), 0) as total_bonus,
         COALESCE(SUM(CASE WHEN type = 'expiry' THEN ABS(points) ELSE 0 END), 0) as total_expired,
         COUNT(CASE WHEN type = 'earn' THEN 1 END) as total_transactions
       FROM points_ledger
       WHERE user_id = $1 AND expired_at IS NULL`,
      [userId],
    );

    // Points expiring soon (within 30 days)
    const expiringResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as expiring_soon
       FROM points_ledger
       WHERE user_id = $1
         AND expires_at IS NOT NULL
         AND expires_at <= NOW() + INTERVAL '30 days'
         AND expired_at IS NULL
         AND points > 0`,
      [userId],
    );

    // This month's earnings
    const monthResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as month_earned
       FROM points_ledger
       WHERE user_id = $1
         AND type = 'earn'
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [userId],
    );

    const stats = balanceResult.rows[0];

    res.json({
      success: true,
      data: {
        balance: parseInt(stats.total_balance) || 0,
        totalEarned: parseInt(stats.total_earned) || 0,
        totalRedeemed: parseInt(stats.total_redeemed) || 0,
        totalBonus: parseInt(stats.total_bonus) || 0,
        totalExpired: parseInt(stats.total_expired) || 0,
        totalTransactions: parseInt(stats.total_transactions) || 0,
        expiringSoon: parseInt(expiringResult.rows[0]?.expiring_soon) || 0,
        monthEarned: parseInt(monthResult.rows[0]?.month_earned) || 0,
        tier,
        multiplier,
        nextTierMultiplier: getNextTierMultiplier(tier),
        pointsPerDollar: BASE_POINTS_PER_DOLLAR * multiplier,
      },
    });
  } catch (error: any) {
    console.error("❌ Points balance error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function getNextTierMultiplier(
  currentTier: string,
): { tier: string; multiplier: number } | null {
  const order = ["free", "essential", "verified", "max", "enterprise"];
  const idx = order.indexOf(currentTier);
  if (idx === -1 || idx >= order.length - 1) return null;
  const nextTier = order[idx + 1];
  return { tier: nextTier, multiplier: TIER_MULTIPLIERS[nextTier] };
}

/**
 * GET /api/v1/cards/points/history
 * Paginated points ledger history.
 */
router.get("/points/history", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string; // filter by type
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    let whereClause = "WHERE pl.user_id = $1";
    const params: any[] = [userId];

    if (type) {
      params.push(type);
      whereClause += ` AND pl.type = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM points_ledger pl ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.total) || 0;

    const dataResult = await pool.query(
      `SELECT pl.*,
              ic.card_last4, ic.card_brand
       FROM points_ledger pl
       LEFT JOIN issued_cards ic ON ic.id = pl.issued_card_id
       ${whereClause}
       ORDER BY pl.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("❌ Points history error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/cards/points/rewards
 * List available redemption options.
 */
router.get("/points/rewards", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM points_redemptions WHERE is_active = true ORDER BY points_cost ASC`,
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("❌ Rewards list error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/cards/points/redeem
 * Redeem points for a reward.
 */
router.post("/points/redeem", async (req: Request, res: Response) => {
  try {
    const { userId, rewardId } = req.body;
    if (!userId || !rewardId) {
      return res
        .status(400)
        .json({ success: false, error: "userId and rewardId required" });
    }

    // Get reward
    const rewardResult = await pool.query(
      `SELECT * FROM points_redemptions WHERE id = $1 AND is_active = true`,
      [rewardId],
    );

    if (rewardResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Reward not found or inactive" });
    }

    const reward = rewardResult.rows[0];

    // Get current balance
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as balance FROM points_ledger WHERE user_id = $1 AND expired_at IS NULL`,
      [userId],
    );
    const balance = parseInt(balanceResult.rows[0]?.balance) || 0;

    if (balance < reward.points_cost) {
      return res.status(400).json({
        success: false,
        error: `Not enough points. Need ${reward.points_cost}, have ${balance}.`,
      });
    }

    // Debit points
    const newBalance = balance - reward.points_cost;
    await pool.query(
      `INSERT INTO points_ledger
       (user_id, type, points, balance, description)
       VALUES ($1, 'redeem', $2, $3, $4)`,
      [userId, -reward.points_cost, newBalance, `🎁 Redeemed: ${reward.name}`],
    );

    console.log(
      `🎁 Points redeemed: User ${userId} spent ${reward.points_cost} pts for "${reward.name}" (balance: ${newBalance})`,
    );

    res.json({
      success: true,
      data: {
        rewardName: reward.name,
        pointsSpent: reward.points_cost,
        newBalance,
      },
    });
  } catch (error: any) {
    console.error("❌ Redeem error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRIPE ISSUING WEBHOOK — earn points on card transactions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/cards/webhook/issuing
 * Handle Stripe Issuing events (authorization approved → earn points).
 */
router.post("/webhook/issuing", async (req: Request, res: Response) => {
  try {
    const event = req.body;

    switch (event.type) {
      case "issuing_transaction.created": {
        const transaction = event.data.object;

        // Only award points for approved purchases
        if (transaction.type !== "capture") break;

        // Find our card record
        const cardResult = await pool.query(
          `SELECT ic.*, u.subscription_tier
           FROM issued_cards ic
           JOIN users u ON u.id = ic.user_id
           WHERE ic.stripe_card_id = $1`,
          [transaction.card],
        );

        if (cardResult.rows.length === 0) break;

        const card = cardResult.rows[0];
        const tier = card.subscription_tier || card.tier_at_issuance || "free";
        const tierMultiplier = TIER_MULTIPLIERS[tier] || 1.0;

        // Calculate points
        const amountDollars = Math.abs(transaction.amount) / 100;
        const basePoints = Math.round(amountDollars * BASE_POINTS_PER_DOLLAR);

        // Check category bonus
        const merchantCategory = transaction.merchant_data?.category || "";
        const categoryBonus = CATEGORY_BONUSES[merchantCategory]?.bonus || 0;
        const totalMultiplier = tierMultiplier + categoryBonus;
        const earnedPoints = Math.round(basePoints * totalMultiplier);

        // Get current balance
        const balanceResult = await pool.query(
          `SELECT COALESCE(SUM(points), 0) as balance FROM points_ledger WHERE user_id = $1 AND expired_at IS NULL`,
          [card.user_id],
        );
        const currentBalance = parseInt(balanceResult.rows[0]?.balance) || 0;
        const newBalance = currentBalance + earnedPoints;

        // Record points earning
        await pool.query(
          `INSERT INTO points_ledger
           (user_id, issued_card_id, type, points, balance, description,
            stripe_transaction_id, transaction_amount, transaction_currency,
            merchant_name, merchant_category,
            base_points, multiplier, category_bonus, tier_at_earning, expires_at)
           VALUES ($1, $2, 'earn', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() + INTERVAL '12 months')`,
          [
            card.user_id,
            card.id,
            earnedPoints,
            newBalance,
            `💳 ${transaction.merchant_data?.name || "Purchase"} — ${tierMultiplier}x${categoryBonus > 0 ? ` + ${categoryBonus}x bonus` : ""}`,
            transaction.id,
            amountDollars,
            transaction.currency?.toUpperCase() || "USD",
            transaction.merchant_data?.name || null,
            merchantCategory || null,
            basePoints,
            tierMultiplier,
            categoryBonus || null,
            tier,
          ],
        );

        console.log(
          `⭐ Points earned: User ${card.user_id} +${earnedPoints} pts ($${amountDollars} × ${totalMultiplier}x) at ${transaction.merchant_data?.name}`,
        );
        break;
      }

      case "issuing_authorization.request": {
        // Auto-approve (or implement spending controls)
        console.log("📋 Authorization request:", event.data.object.id);
        break;
      }

      case "issuing_card.updated": {
        const updatedCard = event.data.object;
        await pool.query(
          `UPDATE issued_cards SET card_status = $1, updated_at = NOW() WHERE stripe_card_id = $2`,
          [updatedCard.status, updatedCard.id],
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("❌ Issuing webhook error:", error);
    res.status(500).json({ received: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG & MULTIPLIER INFO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/cards/config
 * Public config: tier multipliers, category bonuses, spending limits.
 */
router.get("/config", async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      basePointsPerDollar: BASE_POINTS_PER_DOLLAR,
      tierMultipliers: TIER_MULTIPLIERS,
      categoryBonuses: CATEGORY_BONUSES,
      spendingLimits: TIER_SPENDING_LIMITS,
      welcomeBonuses: {
        free: 100,
        essential: 250,
        verified: 500,
        max: 1000,
        enterprise: 2500,
      },
      cardLimits: {
        free: 1,
        essential: 1,
        verified: 3,
        max: 3,
        enterprise: 3,
      },
    },
  });
});

export default router;

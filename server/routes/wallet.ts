/**
 * Verso Air — Wallet API
 * Credits balance, deposits (future Stripe), game rewards, ad rewards
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { onlinePaymentsEnabled } from "../utils/commercial-gates";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// GET /api/wallet/balance — Get user wallet balance
// ═══════════════════════════════════════════════════════════════════
router.get("/balance", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    // Auto-create wallet if it doesn't exist
    let wallet = await pool.query(
      "SELECT * FROM platform_wallets WHERE user_id = $1",
      [userId],
    );

    if (wallet.rows.length === 0) {
      wallet = await pool.query(
        `INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked)
         VALUES ($1, '0.00', 'USD', true)
         RETURNING *`,
        [userId],
      );
    }

    const w = wallet.rows[0];
    res.json({
      success: true,
      wallet: {
        balance: parseFloat(w.balance || "0"),
        frozenBalance: parseFloat(w.frozen_balance || "0"),
        totalEarned: parseFloat(w.total_earned || "0"),
        totalSpent: parseFloat(w.total_spent || "0"),
        withdrawalLocked: w.withdrawal_locked ?? true,
        currency: w.currency || "USD",
        status: w.status,
      },
    });
  } catch (err: any) {
    console.error("[WALLET] Balance error:", err);
    res.status(500).json({ error: "Failed to get wallet balance" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/wallet/transactions — Transaction history
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/transactions",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const limit = Math.min(parseInt(String(req.query.limit)) || 20, 100);
      const offset = parseInt(String(req.query.offset)) || 0;

      const txns = await pool.query(
        `SELECT * FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );

      res.json({ success: true, transactions: txns.rows });
    } catch (err: any) {
      console.error("[WALLET] Transactions error:", err);
      res.status(500).json({ error: "Failed to get transactions" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════
// POST /api/wallet/deposit — Buy credits with real money (stub for Stripe)
// ═══════════════════════════════════════════════════════════════════
router.post("/deposit", requireAuth(), async (req: Request, res: Response) => {
  try {
    if (!onlinePaymentsEnabled()) {
      return res.status(503).json({
        success: false,
        error: "Wallet deposits are currently unavailable",
      });
    }

    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { amount } = req.body;
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount < 1 || depositAmount > 1000) {
      return res
        .status(400)
        .json({ error: "Amount must be between $1 and $1000" });
    }

    // Bonus schedule: buy more → get more
    let creditAmount = depositAmount;
    if (depositAmount >= 50)
      creditAmount = depositAmount * 1.16; // +16%
    else if (depositAmount >= 25)
      creditAmount = depositAmount * 1.12; // +12%
    else if (depositAmount >= 10) creditAmount = depositAmount * 1.1; // +10%

    // Redirect user to PayPal checkout flow
    res.json({
      success: true,
      redirect: "/api/paypal/create-order",
      message:
        "Use PayPal to complete your deposit. Call POST /api/paypal/create-order with { amount } to start.",
      paymentMethod: "paypal",
      preview: {
        depositAmount,
        creditAmount: Math.round(creditAmount * 100) / 100,
        bonusPercent:
          depositAmount >= 50
            ? 16
            : depositAmount >= 25
              ? 12
              : depositAmount >= 10
                ? 10
                : 0,
      },
    });
  } catch (err: any) {
    console.error("[WALLET] Deposit error:", err);
    res.status(500).json({ error: "Failed to process deposit" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Arbitrary client-supplied game rewards are disabled. Payouts require a
// reviewed, idempotent settlement flow before wagering can be enabled.
router.post("/game-reward", requireAuth(), (_req: Request, res: Response) =>
  res.status(403).json({
    success: false,
    error: "Game rewards are disabled during free beta",
    requiresLegalReview: true,
  }),
);

// ═══════════════════════════════════════════════════════════════════
// POST /api/wallet/ad-reward — Credit from rewarded ad SDK (future Tapjoy/Adjoe postback)
// ═══════════════════════════════════════════════════════════════════
router.post("/ad-reward", async (req: Request, res: Response) => {
  try {
    // This will be called by the ad network's server-to-server postback
    // Validate with a shared secret token
    const { userId, amount, transactionId, secret } = req.body;

    // TODO: Validate secret matches your Tapjoy/Adjoe shared secret
    if (!secret || secret !== process.env.AD_REWARD_SECRET) {
      return res.status(403).json({ error: "Invalid postback secret" });
    }

    if (!userId || !amount) {
      return res.status(400).json({ error: "Missing userId or amount" });
    }

    const creditAmount = Math.round(parseFloat(amount) * 100) / 100;
    const targetUserId = Number(userId);
    if (
      !Number.isInteger(targetUserId) ||
      targetUserId <= 0 ||
      !transactionId ||
      !(creditAmount > 0 && creditAmount <= 5)
    ) {
      return res.status(400).json({ error: "Invalid reward" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialise postbacks for one transaction id so a retry cannot double-credit
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `ad-reward:${transactionId}`,
      ]);
      const existing = await client.query(
        "SELECT id FROM wallet_transactions WHERE external_reference = $1",
        [String(transactionId)],
      );
      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.json({ success: true, message: "Already credited" });
      }

      await client.query(
        `INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked)
         VALUES ($1, '0.00', 'USD', true) ON CONFLICT (user_id) DO NOTHING`,
        [targetUserId],
      );
      const wallet = await client.query(
        "SELECT id, balance FROM platform_wallets WHERE user_id = $1 FOR UPDATE",
        [targetUserId],
      );
      const w = wallet.rows[0];
      const balanceBefore = parseFloat(w.balance || "0");
      const balanceAfter = Math.round((balanceBefore + creditAmount) * 100) / 100;

      await client.query(
        "UPDATE platform_wallets SET balance = $1, total_earned = CAST(total_earned AS NUMERIC) + $2, updated_at = NOW() WHERE id = $3",
        [balanceAfter.toFixed(2), creditAmount.toFixed(2), w.id],
      );
      await client.query(
        `INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description, external_reference, related_entity_type, status)
         VALUES ($1, $2, 'arena_reward', $3, $4, $5, 'Ad reward', $6, 'ad', 'completed')`,
        [
          targetUserId,
          w.id,
          creditAmount.toFixed(2),
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          String(transactionId),
        ],
      );
      await client.query("COMMIT");
      res.json({ success: true, credited: creditAmount });
    } catch (txError) {
      await client.query("ROLLBACK").catch(() => {});
      throw txError;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[WALLET] Ad reward error:", err);
    res.status(500).json({ error: "Failed to credit ad reward" });
  }
});

export default router;

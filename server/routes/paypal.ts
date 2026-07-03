/**
 * Verso Air — PayPal Payment Gateway
 *
 * Uses PayPal REST API v2 (Orders API) for:
 *   - Wallet deposits (buy credits)
 *   - Artist subscription payments
 *   - Track purchases
 *
 * Flow:
 *   1. Client calls POST /api/paypal/create-order { amount, purpose }
 *   2. Server creates PayPal order → returns orderId + approvalUrl
 *   3. Client redirects to PayPal or uses PayPal JS SDK popup
 *   4. After approval, client calls POST /api/paypal/capture-order { orderId }
 *   5. Server captures payment → credits wallet → returns success
 *
 * Env vars required:
 *   PAYPAL_CLIENT_ID     — from https://developer.paypal.com
 *   PAYPAL_CLIENT_SECRET — from https://developer.paypal.com
 *   PAYPAL_MODE          — "sandbox" or "live" (default: sandbox)
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ── PayPal Config ──
const PAYPAL_BASE =
  (process.env.PAYPAL_MODE || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

// Bonus credit schedule (matches wallet.ts)
const BONUS_TIERS = [
  { min: 50, bonus: 0.16, label: "+16%" },
  { min: 25, bonus: 0.12, label: "+12%" },
  { min: 10, bonus: 0.1, label: "+10%" },
  { min: 0, bonus: 0, label: "" },
];

function getBonusRate(amount: number): { rate: number; label: string } {
  for (const tier of BONUS_TIERS) {
    if (amount >= tier.min) return { rate: tier.bonus, label: tier.label };
  }
  return { rate: 0, label: "" };
}

// ── Get OAuth2 access token from PayPal ──
async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[PAYPAL] Token error:", err);
    throw new Error("Failed to get PayPal access token");
  }

  const data = await res.json();
  return data.access_token;
}

// ── Helper: get or create wallet ──
async function getOrCreateWallet(userId: number) {
  let w = await pool.query(
    "SELECT * FROM platform_wallets WHERE user_id = $1",
    [userId],
  );
  if (w.rows.length === 0) {
    w = await pool.query(
      `INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked)
       VALUES ($1, '0.00', 'USD', true) RETURNING *`,
      [userId],
    );
  }
  return w.rows[0];
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/paypal/config — Return client ID for PayPal JS SDK
// ═══════════════════════════════════════════════════════════════════
router.get("/config", (_req: Request, res: Response) => {
  if (!PAYPAL_CLIENT_ID) {
    return res.status(503).json({
      error: "PayPal not configured",
      configured: false,
    });
  }
  res.json({
    configured: true,
    clientId: PAYPAL_CLIENT_ID,
    mode: process.env.PAYPAL_MODE || "sandbox",
    currency: "USD",
    bonusTiers: BONUS_TIERS.filter((t) => t.bonus > 0).map((t) => ({
      minDeposit: t.min,
      bonusPercent: Math.round(t.bonus * 100),
      label: t.label,
    })),
  });
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/paypal/create-order — Create a PayPal order for deposit
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/create-order",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const {
        amount,
        purpose = "wallet_deposit",
        returnUrl,
        cancelUrl,
      } = req.body;
      const depositAmount = parseFloat(amount);

      if (!depositAmount || depositAmount < 5 || depositAmount > 1000) {
        return res
          .status(400)
          .json({ error: "Amount must be between $5 and $1,000 USD" });
      }

      // Calculate bonus
      const { rate, label } = getBonusRate(depositAmount);
      const creditAmount = Math.round(depositAmount * (1 + rate) * 100) / 100;

      const accessToken = await getPayPalAccessToken();

      // Determine description based on purpose
      let description = `Verso Air — ${creditAmount} credits`;
      if (label) description += ` (includes ${label} bonus)`;

      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: depositAmount.toFixed(2),
            },
            description,
            custom_id: `user_${userId}_${purpose}`,
            soft_descriptor: "VERSO AIR",
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Verso Air",
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              return_url:
                returnUrl ||
                `${req.protocol}://${req.get("host")}/api/paypal/success`,
              cancel_url:
                cancelUrl ||
                `${req.protocol}://${req.get("host")}/api/paypal/cancel`,
            },
          },
        },
      };

      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.text();
        console.error("[PAYPAL] Create order error:", errBody);
        return res.status(502).json({ error: "PayPal order creation failed" });
      }

      const order = await orderRes.json();

      // Store pending order in DB for capture verification
      await pool.query(
        `INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, amount, description, external_reference, payment_method, status)
         VALUES ($1, (SELECT id FROM platform_wallets WHERE user_id = $1), 'deposit', $2, $3, $4, 'paypal', 'pending')`,
        [
          userId,
          depositAmount.toFixed(2),
          `PayPal deposit — ${creditAmount} credits${label ? ` (${label})` : ""}`,
          order.id,
        ],
      );

      // Find approval URL
      const approvalUrl = order.links?.find(
        (l: any) => l.rel === "approve" || l.rel === "payer-action",
      )?.href;

      res.json({
        success: true,
        orderId: order.id,
        approvalUrl,
        deposit: {
          amount: depositAmount,
          creditAmount,
          bonusPercent: Math.round(rate * 100),
          currency: "USD",
        },
      });
    } catch (err: any) {
      console.error("[PAYPAL] Create order error:", err);
      res.status(500).json({ error: err.message || "PayPal order failed" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════
// POST /api/paypal/capture-order — Capture approved PayPal payment
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/capture-order",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Missing orderId" });
      }

      // Verify this order belongs to this user (check pending transaction)
      const pendingTxn = await pool.query(
        `SELECT * FROM wallet_transactions
         WHERE user_id = $1 AND external_reference = $2 AND status = 'pending' AND payment_method = 'paypal'
         LIMIT 1`,
        [userId, orderId],
      );

      if (pendingTxn.rows.length === 0) {
        return res.status(404).json({ error: "No pending PayPal order found" });
      }

      const accessToken = await getPayPalAccessToken();

      // Capture the payment
      const captureRes = await fetch(
        `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!captureRes.ok) {
        const errBody = await captureRes.text();
        console.error("[PAYPAL] Capture error:", errBody);

        // Mark transaction as failed
        await pool.query(
          `UPDATE wallet_transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
          [pendingTxn.rows[0].id],
        );

        return res.status(502).json({ error: "PayPal capture failed" });
      }

      const capture = await captureRes.json();

      // Verify capture is COMPLETED
      if (capture.status !== "COMPLETED") {
        await pool.query(
          `UPDATE wallet_transactions SET status = 'failed', description = $1, updated_at = NOW() WHERE id = $2`,
          [`PayPal capture status: ${capture.status}`, pendingTxn.rows[0].id],
        );
        return res.status(400).json({
          error: "Payment not completed",
          paypalStatus: capture.status,
        });
      }

      // Extract actual captured amount
      const capturedAmount = parseFloat(
        capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ||
          pendingTxn.rows[0].amount,
      );

      // Apply bonus
      const { rate, label } = getBonusRate(capturedAmount);
      const creditAmount = Math.round(capturedAmount * (1 + rate) * 100) / 100;

      // Credit wallet
      const wallet = await getOrCreateWallet(userId);
      const balanceBefore = parseFloat(wallet.balance || "0");
      const balanceAfter = balanceBefore + creditAmount;

      await pool.query("BEGIN");

      await pool.query(
        `UPDATE platform_wallets
         SET balance = $1,
             total_earned = CAST(COALESCE(total_earned, '0') AS NUMERIC) + $2,
             updated_at = NOW()
         WHERE user_id = $3`,
        [balanceAfter.toFixed(2), creditAmount.toFixed(2), userId],
      );

      // Update transaction to completed with final amounts
      await pool.query(
        `UPDATE wallet_transactions
         SET status = 'completed',
             amount = $1,
             balance_before = $2,
             balance_after = $3,
             description = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          creditAmount.toFixed(2),
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          `PayPal deposit: $${capturedAmount} → ${creditAmount} credits${label ? ` (${label})` : ""}`,
          pendingTxn.rows[0].id,
        ],
      );

      await pool.query("COMMIT");

      console.log(
        `[PAYPAL] ✅ User ${userId} deposited $${capturedAmount} → ${creditAmount} credits`,
      );

      res.json({
        success: true,
        deposited: capturedAmount,
        credited: creditAmount,
        bonusPercent: Math.round(rate * 100),
        newBalance: balanceAfter,
        paypalOrderId: orderId,
      });
    } catch (err: any) {
      await pool.query("ROLLBACK").catch(() => {});
      console.error("[PAYPAL] Capture error:", err);
      res.status(500).json({ error: err.message || "Capture failed" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════
// GET /api/paypal/success — Auto-capture after PayPal approval redirect
// PayPal redirects here with ?token=ORDER_ID after user approves
// ═══════════════════════════════════════════════════════════════════
router.get("/success", requireAuth, async (req: Request, res: Response) => {
  try {
    const orderId = req.query.token as string;
    const userId = (req as any).user?.id;

    if (!orderId || !userId) {
      return res.redirect("/account/paypal?paypal=error");
    }

    // Check if there's a pending transaction for this order
    const pendingTxn = await pool.query(
      `SELECT * FROM wallet_transactions
       WHERE user_id = $1 AND external_reference = $2 AND status = 'pending' AND payment_method = 'paypal'
       LIMIT 1`,
      [userId, orderId],
    );

    if (pendingTxn.rows.length === 0) {
      return res.redirect("/account/paypal?paypal=error");
    }

    const accessToken = await getPayPalAccessToken();

    // Capture the payment
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!captureRes.ok) {
      await pool.query(
        `UPDATE wallet_transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [pendingTxn.rows[0].id],
      );
      return res.redirect("/account/paypal?paypal=error");
    }

    const capture = await captureRes.json();
    if (capture.status !== "COMPLETED") {
      await pool.query(
        `UPDATE wallet_transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [pendingTxn.rows[0].id],
      );
      return res.redirect("/account/paypal?paypal=error");
    }

    // Extract amount + apply bonus + credit wallet
    const capturedAmount = parseFloat(
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ||
        pendingTxn.rows[0].amount,
    );
    const { rate, label } = getBonusRate(capturedAmount);
    const creditAmount = Math.round(capturedAmount * (1 + rate) * 100) / 100;
    const wallet = await getOrCreateWallet(userId);
    const balanceBefore = parseFloat(wallet.balance || "0");
    const balanceAfter = balanceBefore + creditAmount;

    await pool.query("BEGIN");
    await pool.query(
      `UPDATE platform_wallets
       SET balance = $1, total_earned = CAST(COALESCE(total_earned, '0') AS NUMERIC) + $2, updated_at = NOW()
       WHERE user_id = $3`,
      [balanceAfter.toFixed(2), creditAmount.toFixed(2), userId],
    );
    await pool.query(
      `UPDATE wallet_transactions
       SET status = 'completed', amount = $1, balance_before = $2, balance_after = $3,
           description = $4, updated_at = NOW()
       WHERE id = $5`,
      [
        creditAmount.toFixed(2),
        balanceBefore.toFixed(2),
        balanceAfter.toFixed(2),
        `PayPal deposit: $${capturedAmount} → ${creditAmount} credits${label ? ` (${label})` : ""}`,
        pendingTxn.rows[0].id,
      ],
    );
    await pool.query("COMMIT");

    console.log(
      `[PAYPAL] ✅ User ${userId} deposited $${capturedAmount} → ${creditAmount} credits (via redirect)`,
    );
    res.redirect("/account/paypal?paypal=success");
  } catch (err: any) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("[PAYPAL] Success-redirect capture error:", err);
    res.redirect("/account/paypal?paypal=error");
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/paypal/cancel — Redirect page after PayPal cancellation
// ═══════════════════════════════════════════════════════════════════
router.get("/cancel", (_req: Request, res: Response) => {
  res.redirect("/account/paypal?paypal=cancelled");
});

export default router;

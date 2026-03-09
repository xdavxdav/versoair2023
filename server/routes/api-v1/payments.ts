/**
 * 💳 Stripe Payments API + NGO POS Terminal
 * Handles checkout sessions, webhooks, billing, and NGO POS card management.
 * Connects to `transactions`, `saved_payment_methods`, `ngo_charges` tables.
 *
 * Endpoints — Standard Payments:
 *   POST /api/v1/payments/create-checkout     → Create Stripe Checkout Session
 *   POST /api/v1/payments/webhook             → Stripe webhook handler
 *   GET  /api/v1/payments/billing-history     → User billing history
 *   POST /api/v1/payments/create-portal       → Customer portal session
 *
 * Endpoints — NGO POS Card Management:
 *   POST /api/v1/payments/setup-intent        → Create SetupIntent for card pre-auth
 *   POST /api/v1/payments/save-card           → Save tokenized card to user
 *   GET  /api/v1/payments/cards/:userId       → List saved cards for user
 *   DELETE /api/v1/payments/cards/:cardId     → Remove a saved card
 *   POST /api/v1/payments/charge              → POS charge against saved card
 *   POST /api/v1/payments/refund              → Refund an NGO charge
 *   GET  /api/v1/payments/customers           → List all customers with saved cards
 *   GET  /api/v1/payments/ngo-charges         → List NGO charge history
 *   GET  /api/v1/payments/pos-stats           → POS dashboard stats
 */

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { pool } from "../../db";

const router = Router();

// ─── STRIPE INIT ────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe is optional — if no key, endpoints return 503
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any })
  : null;

// ─── PRICING MAP (mirrors client/src/lib/tiers.ts) ─────────────────────────────

const TIER_PRICING: Record<
  string,
  { monthly: number; annual: number; name: string }
> = {
  essential: { monthly: 2900, annual: 29000, name: "Essential" }, // cents
  verified: { monthly: 7900, annual: 79000, name: "Pro Verified" },
  max: { monthly: 14900, annual: 149000, name: "Pro Max" },
  enterprise: { monthly: 49900, annual: 499000, name: "Enterprise" },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function requireStripe(res: Response): res is Response {
  if (!stripe) {
    res.status(503).json({
      success: false,
      error:
        "Payment processing not configured. Set STRIPE_SECRET_KEY in environment.",
    });
    return false;
  }
  return true;
}

// ─── CREATE CHECKOUT SESSION ────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/create-checkout
 * Creates a Stripe Checkout Session for subscription upgrade.
 * Body: { userId, targetTier, billingCycle: 'monthly' | 'annual' }
 */
router.post("/create-checkout", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { userId, targetTier, billingCycle = "monthly" } = req.body;

    if (!userId || !targetTier) {
      return res
        .status(400)
        .json({ success: false, error: "userId and targetTier are required" });
    }

    const pricing = TIER_PRICING[targetTier];
    if (!pricing) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier: ${targetTier}. Valid: ${Object.keys(TIER_PRICING).join(", ")}`,
      });
    }

    // Fetch user for Stripe customer lookup/creation
    const userResult = await pool.query(
      `SELECT id, email, username, subscription_tier FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const amount = billingCycle === "annual" ? pricing.annual : pricing.monthly;

    // Create Stripe Checkout Session (one-time payment model)
    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Verso Air — ${pricing.name} (${billingCycle})`,
              description: `Business directory ${pricing.name} tier subscription`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: String(userId),
        targetTier,
        billingCycle,
        type: "subscription_fee",
      },
      success_url: `${req.headers.origin || "http://localhost:5003"}/pricing?status=success&tier=${targetTier}`,
      cancel_url: `${req.headers.origin || "http://localhost:5003"}/pricing?status=cancelled`,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error: any) {
    console.error("❌ Stripe checkout error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── STRIPE WEBHOOK ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/webhook
 * Handles Stripe webhook events (payment success, failure).
 * Must receive raw body (express.raw middleware applied in route registration).
 */
router.post("/webhook", async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  let event: Stripe.Event;

  try {
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers["stripe-signature"] as string;
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET,
      );
    } else {
      // Development: trust the event payload directly
      event = req.body as Stripe.Event;
    }
  } catch (err: any) {
    console.error(
      "⚠️ Stripe webhook signature verification failed:",
      err.message,
    );
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, targetTier, billingCycle, type } = session.metadata || {};

      if (!userId || !targetTier) {
        console.error("⚠️ Missing metadata in checkout session:", session.id);
        break;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 1. Record transaction
        await client.query(
          `INSERT INTO transactions (business_id, user_id, amount, type, status, reference)
           VALUES (NULL, $1, $2, $3, 'completed', $4)`,
          [
            userId,
            ((session.amount_total || 0) / 100).toFixed(2),
            type || "subscription_fee",
            session.id,
          ],
        );

        // 2. Upgrade user tier
        const expiresAt = new Date();
        if (billingCycle === "annual") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        await client.query(
          `UPDATE users
           SET subscription_tier = $1,
               subscription_status = 'active',
               premium_expires_at = $2
           WHERE id = $3`,
          [targetTier, expiresAt.toISOString(), userId],
        );

        await client.query("COMMIT");
        console.log(
          `✅ Payment processed: User ${userId} → ${targetTier} (expires ${expiresAt.toISOString()})`,
        );
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("❌ DB error processing payment:", dbError);
      } finally {
        client.release();
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.warn(
        `⚠️ Payment failed for intent ${paymentIntent.id}:`,
        paymentIntent.last_payment_error?.message,
      );
      break;
    }

    default:
      // Unhandled event type — log for visibility
      console.log(`ℹ️ Unhandled Stripe event: ${event.type}`);
  }

  res.json({ received: true });
});

// ─── BILLING HISTORY ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/billing-history
 * Returns transaction history for the authenticated user.
 * Query: ?userId=X&page=1&limit=20
 */
router.get("/billing-history", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || req.query.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM transactions WHERE user_id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT id, amount, type, status, reference, created_at
         FROM transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total) || 0;

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("❌ Billing history error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── CUSTOMER PORTAL ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/create-portal
 * Creates a Stripe Customer Portal session for managing billing.
 * Body: { userId }
 */
router.post("/create-portal", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const userResult = await pool.query(
      `SELECT email FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Find or create Stripe customer
    const customers = await stripe!.customers.list({
      email: userResult.rows[0].email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe!.customers.create({
        email: userResult.rows[0].email,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
    }

    const portalSession = await stripe!.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || "http://localhost:5003"}/pricing`,
    });

    res.json({
      success: true,
      data: { url: portalSession.url },
    });
  } catch (error: any) {
    console.error("❌ Portal session error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ░░░ NGO POS TERMINAL — Card Management & Charge Processing ░░░░░░░░░░░░░░░░░
// ═══════════════════════════════════════════════════════════════════════════════

// ─── HELPER: Get or Create Stripe Customer ──────────────────────────────────────

async function getOrCreateStripeCustomer(
  userId: number,
  email: string,
  name?: string,
): Promise<string> {
  // Check if user already has a Stripe customer ID stored
  const existingResult = await pool.query(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId],
  );

  const existingCustomerId = existingResult.rows[0]?.stripe_customer_id;
  if (existingCustomerId) return existingCustomerId;

  // Check Stripe by email
  const customers = await stripe!.customers.list({ email, limit: 1 });
  let customerId: string;

  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe!.customers.create({
      email,
      name: name || undefined,
      metadata: { userId: String(userId), source: "ngo_pos" },
    });
    customerId = customer.id;
  }

  // Persist to users table
  await pool.query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [
    customerId,
    userId,
  ]);

  return customerId;
}

// ─── SETUP INTENT (Pre-authorize card) ──────────────────────────────────────────

/**
 * POST /api/v1/payments/setup-intent
 * Creates a Stripe SetupIntent so a client can pre-authorize their card.
 * Body: { userId }
 * Returns: { clientSecret, setupIntentId }
 */
router.post("/setup-intent", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const userResult = await pool.query(
      `SELECT id, email, username FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const customerId = await getOrCreateStripeCustomer(
      userId,
      user.email,
      user.username,
    );

    const setupIntent = await stripe!.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        userId: String(userId),
        purpose: "ngo_preauthorization",
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
        customerId,
      },
    });
  } catch (error: any) {
    console.error("❌ SetupIntent error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── SAVE CARD ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/save-card
 * After SetupIntent succeeds, saves the payment method to DB.
 * Body: { userId, paymentMethodId, label?, isDefault?, preauthorized?, maxChargeAmount?, currency? }
 */
router.post("/save-card", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const {
      userId,
      paymentMethodId,
      label,
      isDefault = false,
      preauthorized = true,
      maxChargeAmount,
      currency = "USD",
    } = req.body;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: "userId and paymentMethodId are required",
      });
    }

    // Retrieve payment method details from Stripe
    const pm = await stripe!.paymentMethods.retrieve(paymentMethodId);

    if (!pm.card) {
      return res
        .status(400)
        .json({ success: false, error: "Not a card payment method" });
    }

    // Get customer ID
    const userResult = await pool.query(
      `SELECT id, email, username, stripe_customer_id FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];
    const customerId =
      user.stripe_customer_id ||
      (await getOrCreateStripeCustomer(userId, user.email, user.username));

    // Attach payment method to customer if not already
    try {
      await stripe!.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (attachErr: any) {
      // Already attached — that's fine
      if (!attachErr.message?.includes("already been attached")) {
        throw attachErr;
      }
    }

    // If isDefault, unset other defaults first
    if (isDefault) {
      await pool.query(
        `UPDATE saved_payment_methods SET is_default = false WHERE user_id = $1`,
        [userId],
      );
    }

    // Save to our DB — capture full billing details from Stripe
    const billing = pm.billing_details;
    const result = await pool.query(
      `INSERT INTO saved_payment_methods
       (user_id, stripe_payment_method_id, stripe_customer_id, card_brand, card_last4,
        card_exp_month, card_exp_year, cardholder_name, billing_email, billing_phone,
        billing_address_line1, billing_address_line2, billing_city, billing_state,
        billing_postal_code, billing_country, card_country, card_funding, card_issuer,
        card_fingerprint, cvc_check,
        is_default, label, preauthorized, max_charge_amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'active')
       RETURNING *`,
      [
        userId,
        paymentMethodId,
        customerId,
        pm.card.brand,
        pm.card.last4,
        pm.card.exp_month,
        pm.card.exp_year,
        billing?.name || null,
        billing?.email || null,
        billing?.phone || null,
        billing?.address?.line1 || null,
        billing?.address?.line2 || null,
        billing?.address?.city || null,
        billing?.address?.state || null,
        billing?.address?.postal_code || null,
        billing?.address?.country || null,
        pm.card.country || null,
        pm.card.funding || null,
        (pm.card as any).issuer || null,
        (pm.card as any).fingerprint || null,
        pm.card.checks?.cvc_check || null,
        isDefault,
        label || `${pm.card.brand?.toUpperCase()} •••• ${pm.card.last4}`,
        preauthorized,
        maxChargeAmount || null,
        currency.toUpperCase(),
      ],
    );

    console.log(
      `✅ Card saved: ${pm.card.brand} ****${pm.card.last4} → User ${userId}`,
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("❌ Save card error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── LIST CARDS FOR USER ────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/cards/:userId
 * Lists all saved payment methods for a user.
 */
router.get("/cards/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT spm.*, u.username, u.email
       FROM saved_payment_methods spm
       JOIN users u ON u.id = spm.user_id
       WHERE spm.user_id = $1 AND spm.status != 'deleted'
       ORDER BY spm.is_default DESC, spm.created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error("❌ List cards error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DELETE CARD ────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/payments/cards/:cardId
 * Removes a saved payment method (soft-delete + detach from Stripe).
 */
router.delete("/cards/:cardId", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { cardId } = req.params;

    const cardResult = await pool.query(
      `SELECT * FROM saved_payment_methods WHERE id = $1`,
      [cardId],
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Card not found" });
    }

    const card = cardResult.rows[0];

    // Detach from Stripe
    try {
      await stripe!.paymentMethods.detach(card.stripe_payment_method_id);
    } catch (detachErr: any) {
      console.warn("⚠️ Stripe detach warning:", detachErr.message);
    }

    // Soft-delete in DB
    await pool.query(
      `UPDATE saved_payment_methods SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
      [cardId],
    );

    console.log(
      `🗑️ Card deleted: ID ${cardId} (${card.card_brand} ****${card.card_last4})`,
    );

    res.json({ success: true, message: "Card removed successfully" });
  } catch (error: any) {
    console.error("❌ Delete card error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POS CHARGE ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/charge
 * POS-style charge against a pre-authorized saved card.
 * Body: { cardId, amount, currency?, description?, category?, processedBy? }
 */
router.post("/charge", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const {
      cardId,
      amount,
      currency = "USD",
      description = "NGO Activity Charge",
      category = "activity_fee",
      processedBy,
    } = req.body;

    if (!cardId || !amount) {
      return res
        .status(400)
        .json({ success: false, error: "cardId and amount are required" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    // Fetch the saved card
    const cardResult = await pool.query(
      `SELECT spm.*, u.email, u.username
       FROM saved_payment_methods spm
       JOIN users u ON u.id = spm.user_id
       WHERE spm.id = $1 AND spm.status = 'active'`,
      [cardId],
    );

    if (cardResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Active card not found" });
    }

    const card = cardResult.rows[0];

    // Check pre-authorization
    if (!card.preauthorized) {
      return res.status(403).json({
        success: false,
        error: "Card is not pre-authorized for NGO charges",
      });
    }

    // Check max charge amount
    if (
      card.max_charge_amount &&
      amountNum > parseFloat(card.max_charge_amount)
    ) {
      return res.status(403).json({
        success: false,
        error: `Amount exceeds max charge limit of ${card.currency} ${card.max_charge_amount}`,
      });
    }

    // Create PaymentIntent with saved payment method (off-session charge)
    const paymentIntent = await stripe!.paymentIntents.create({
      amount: Math.round(amountNum * 100), // Convert to cents
      currency: (currency || card.currency || "USD").toLowerCase(),
      customer: card.stripe_customer_id,
      payment_method: card.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description,
      metadata: {
        source: "ngo_pos",
        cardId: String(cardId),
        userId: String(card.user_id),
        category,
        processedBy: processedBy ? String(processedBy) : "system",
      },
    });

    // Record charge in ngo_charges table
    const chargeResult = await pool.query(
      `INSERT INTO ngo_charges
       (payment_method_id, user_id, amount, currency, description, category,
        stripe_payment_intent_id, status, processed_by, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        cardId,
        card.user_id,
        amountNum.toFixed(2),
        (currency || card.currency || "USD").toUpperCase(),
        description,
        category,
        paymentIntent.id,
        paymentIntent.status === "succeeded" ? "succeeded" : "pending",
        processedBy || null,
        null, // receipt URL populated by webhook later
      ],
    );

    // Also record in main transactions table
    await pool.query(
      `INSERT INTO transactions (user_id, amount, type, status, reference)
       VALUES ($1, $2, 'ngo_charge', $3, $4)`,
      [
        card.user_id,
        amountNum.toFixed(2),
        paymentIntent.status === "succeeded" ? "completed" : "pending",
        paymentIntent.id,
      ],
    );

    console.log(
      `💰 POS Charge: ${currency} ${amountNum.toFixed(2)} → ${card.card_brand} ****${card.card_last4} (${card.username}) — ${description}`,
    );

    res.json({
      success: true,
      data: {
        charge: chargeResult.rows[0],
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: amountNum,
          currency: currency.toUpperCase(),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ POS Charge error:", error);

    // Handle card declined or authentication needed
    if (error.type === "StripeCardError") {
      return res.status(402).json({
        success: false,
        error: `Card declined: ${error.message}`,
        code: error.code,
      });
    }

    if (error.code === "authentication_required") {
      return res.status(402).json({
        success: false,
        error: "Card requires authentication. Cannot charge off-session.",
        code: "authentication_required",
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── REFUND NGO CHARGE ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/refund
 * Refund a previous NGO POS charge.
 * Body: { chargeId, reason? }
 */
router.post("/refund", async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { chargeId, reason = "requested_by_customer" } = req.body;

    if (!chargeId) {
      return res
        .status(400)
        .json({ success: false, error: "chargeId is required" });
    }

    const chargeResult = await pool.query(
      `SELECT * FROM ngo_charges WHERE id = $1`,
      [chargeId],
    );

    if (chargeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Charge not found" });
    }

    const charge = chargeResult.rows[0];

    if (charge.status === "refunded") {
      return res
        .status(400)
        .json({ success: false, error: "Charge already refunded" });
    }

    if (!charge.stripe_payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: "No Stripe payment intent for this charge",
      });
    }

    // Process refund via Stripe
    const refund = await stripe!.refunds.create({
      payment_intent: charge.stripe_payment_intent_id,
      reason: reason as Stripe.RefundCreateParams.Reason,
    });

    // Update charge record
    await pool.query(
      `UPDATE ngo_charges
       SET status = 'refunded', refunded_at = NOW(), refund_reason = $2
       WHERE id = $1`,
      [chargeId, reason],
    );

    // Update transaction record
    await pool.query(
      `UPDATE transactions SET status = 'refunded' WHERE reference = $1`,
      [charge.stripe_payment_intent_id],
    );

    console.log(
      `↩️ Refund processed: Charge ${chargeId} — ${charge.currency} ${charge.amount}`,
    );

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        status: refund.status,
        amount: parseFloat(charge.amount),
      },
    });
  } catch (error: any) {
    console.error("❌ Refund error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── LIST ALL CUSTOMERS WITH SAVED CARDS ────────────────────────────────────────

/**
 * GET /api/v1/payments/customers
 * Admin-only: list all users who have saved payment methods.
 * Query: ?search=&page=1&limit=20
 */
router.get("/customers", async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `AND (u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT spm.user_id) as total
       FROM saved_payment_methods spm
       JOIN users u ON u.id = spm.user_id
       WHERE spm.status != 'deleted' ${whereClause}`,
      params,
    );

    const total = parseInt(countResult.rows[0]?.total) || 0;

    const dataResult = await pool.query(
      `SELECT
         u.id as user_id, u.username, u.email, u.subscription_tier,
         u.stripe_customer_id,
         COUNT(spm.id) as card_count,
         json_agg(json_build_object(
           'id', spm.id,
           'brand', spm.card_brand,
           'last4', spm.card_last4,
           'exp_month', spm.card_exp_month,
           'exp_year', spm.card_exp_year,
           'cardholder', spm.cardholder_name,
           'billing_email', spm.billing_email,
           'billing_phone', spm.billing_phone,
           'billing_address_line1', spm.billing_address_line1,
           'billing_address_line2', spm.billing_address_line2,
           'billing_city', spm.billing_city,
           'billing_state', spm.billing_state,
           'billing_postal_code', spm.billing_postal_code,
           'billing_country', spm.billing_country,
           'card_country', spm.card_country,
           'card_funding', spm.card_funding,
           'card_issuer', spm.card_issuer,
           'card_fingerprint', spm.card_fingerprint,
           'cvc_check', spm.cvc_check,
           'label', spm.label,
           'preauthorized', spm.preauthorized,
           'max_charge', spm.max_charge_amount,
           'currency', spm.currency,
           'is_default', spm.is_default,
           'status', spm.status,
           'created_at', spm.created_at
         ) ORDER BY spm.is_default DESC, spm.created_at DESC) as cards
       FROM saved_payment_methods spm
       JOIN users u ON u.id = spm.user_id
       WHERE spm.status != 'deleted' ${whereClause}
       GROUP BY u.id, u.username, u.email, u.subscription_tier, u.stripe_customer_id
       ORDER BY u.username ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("❌ Customers list error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── NGO CHARGE HISTORY ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/ngo-charges
 * Lists all NGO POS charges with filters.
 * Query: ?status=succeeded&category=donation&page=1&limit=50&userId=
 */
router.get("/ngo-charges", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const category = req.query.category as string;
    const userId = req.query.userId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`nc.status = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`nc.category = $${params.length}`);
    }
    if (userId) {
      params.push(userId);
      conditions.push(`nc.user_id = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM ngo_charges nc ${whereClause}`,
      params,
    );

    const total = parseInt(countResult.rows[0]?.total) || 0;

    const dataResult = await pool.query(
      `SELECT nc.*,
              u.username, u.email,
              spm.card_brand, spm.card_last4,
              admin.username as processed_by_name
       FROM ngo_charges nc
       LEFT JOIN users u ON u.id = nc.user_id
       LEFT JOIN saved_payment_methods spm ON spm.id = nc.payment_method_id
       LEFT JOIN users admin ON admin.id = nc.processed_by
       ${whereClause}
       ORDER BY nc.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("❌ NGO charges list error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POS DASHBOARD STATS ────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/pos-stats
 * Summary stats for the POS terminal dashboard.
 */
router.get("/pos-stats", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM saved_payment_methods WHERE status = 'active') as total_customers,
        (SELECT COUNT(*) FROM saved_payment_methods WHERE status = 'active') as total_cards,
        (SELECT COUNT(*) FROM saved_payment_methods WHERE preauthorized = true AND status = 'active') as preauthorized_cards,
        (SELECT COUNT(*) FROM ngo_charges WHERE status = 'succeeded') as successful_charges,
        (SELECT COUNT(*) FROM ngo_charges WHERE status = 'failed') as failed_charges,
        (SELECT COUNT(*) FROM ngo_charges WHERE status = 'refunded') as refunded_charges,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM ngo_charges WHERE status = 'succeeded') as total_revenue,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM ngo_charges WHERE status = 'refunded') as total_refunded,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM ngo_charges WHERE status = 'succeeded'
         AND created_at >= date_trunc('month', CURRENT_DATE)) as revenue_this_month,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM ngo_charges WHERE status = 'succeeded'
         AND created_at >= CURRENT_DATE) as revenue_today
    `);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("❌ POS stats error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

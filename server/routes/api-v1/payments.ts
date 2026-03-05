/**
 * 💳 Stripe Payments API
 * Handles checkout sessions, webhooks, and billing integration.
 * Connects to the existing `transactions` table in shared/schema.ts
 *
 * Endpoints:
 *   POST /api/v1/payments/create-checkout   → Create Stripe Checkout Session
 *   POST /api/v1/payments/webhook           → Stripe webhook handler
 *   GET  /api/v1/payments/billing-history   → User billing history
 *   POST /api/v1/payments/create-portal     → Customer portal session
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

export default router;

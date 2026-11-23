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
import {
  optionalAuth,
  requireAuth,
  requireSuperuser,
  isOwner,
} from "../../middleware/auth";
import {
  billingPortalLimiter,
  cardSetupLimiter,
  offerCheckoutLimiter,
  subscriptionCheckoutLimiter,
} from "../../middleware/rate-limiter";
import {
  commercialSubscriptionsEnabled,
  onlinePaymentsEnabled,
  recurringBillingEnabled,
  rejectUnavailablePayment,
} from "../../utils/commercial-gates";
import { resolveRequestActingUserId } from "../../utils/acting-user";
import { getPublicBaseUrl } from "../../utils/base-url";
import { getPaymentsModeStatus } from "../../utils/payments-mode";
import {
  getStripeClient,
  redactStripeSecrets,
} from "../../utils/stripe-client";
import {
  applyCheckoutSessionCompleted,
  applyCheckoutSessionExpired,
  applyReversalEvent,
} from "../../services/stripe-webhook";
import {
  applyPlanSubscriptionEvent,
  findBillingSubscription,
} from "../../services/plan-subscriptions";
import {
  buildPlanCheckoutParams,
  buildRecurringPlanCheckoutParams,
  resolvePlanSelection,
} from "../../services/plan-checkout";
import { raisePaymentAlert } from "../../services/payment-alerts";
import { ensureStripeCustomer } from "../../services/stripe-customers";
import {
  chargeSavedCard,
  refundNgoCharge,
  type ServiceFailure,
} from "../../services/ngo-charges";
import {
  getPaidOffer,
  hasPurchasedOffer,
  isPaidOfferKey,
  listPaidOffers,
  updatePaidOffer,
  validateOfferUpdate,
} from "../../services/paid-offers";

const router = Router();

// Apply optional auth so req.user is reliably populated from JWT or cookies
router.use(optionalAuth);

// ─── STRIPE INIT ────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_VERSION = "2025-02-24.acacia";

// Stripe is optional — if no key, endpoints return 503
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION as any })
  : null;

// ─── HELPERS ────────────────────────────────────────────────────────────────────

const STRIPE_NOT_CONFIGURED = {
  success: false,
  error:
    "Payment processing not configured. Set STRIPE_SECRET_KEY in environment.",
};

function requireStripe(res: Response): res is Response {
  if (!stripe) {
    res.status(503).json(STRIPE_NOT_CONFIGURED);
    return false;
  }
  return true;
}

// Routes that read the Stripe key per request, so the key and test stubs apply
// when the request runs rather than when this module loads.
function stripeForRequest(res: Response): Stripe | null {
  const client = getStripeClient({ apiVersion: STRIPE_API_VERSION });
  if (!client) {
    res.status(503).json({
      success: false,
      error:
        "Payment processing not configured. Set STRIPE_SECRET_KEY in environment.",
    });
    return null;
  }
  return client;
}

function bodyOf(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object" ? req.body : {};
}

function actorUserId(req: Request): number | null {
  const id = Number(req.user?.userId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendServiceFailure(res: Response, failure: ServiceFailure) {
  const { ok: _ok, status, ...body } = failure;
  return res.status(status).json({ success: false, ...body });
}

// Same per-request lookup under the name the plan-checkout routes use.
const requireStripeClient = stripeForRequest;

/**
 * GET /api/v1/payments/availability
 * Tells the billing page whether card checkout is open, so it never shows a
 * stale "pending" notice. Reports the switch result only, no key or mode.
 */
router.get("/availability", (_req: Request, res: Response) => {
  const { open } = getPaymentsModeStatus();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    data: { cardCheckout: open.subscriptionCheckout },
  });
});

// ─── CREATE CHECKOUT SESSION ────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/create-checkout
 * Creates a Stripe Checkout Session for a plan, charged in CAD (see
 * shared/plan-pricing.ts). Enterprise is quoted individually. The plan is a
 * one-time prepaid payment, or an automatically renewing subscription while
 * RECURRING_BILLING_ENABLED is on.
 * Body: { targetTier: 'essential' | 'verified' | 'max', billingCycle?: 'monthly' | 'annual' }
 */
router.post("/create-checkout", subscriptionCheckoutLimiter, async (req: Request, res: Response) => {
  if (!onlinePaymentsEnabled() || !commercialSubscriptionsEnabled()) {
    rejectUnavailablePayment(res);
    return;
  }
  const stripeClient = requireStripeClient(res);
  if (!stripeClient) return;

  try {
    const authenticatedUserId = req.user?.userId || (req as any).user?.id;
    const { targetTier, billingCycle } = req.body ?? {};

    if (!authenticatedUserId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    if (!targetTier) {
      return res
        .status(400)
        .json({ success: false, error: "targetTier is required" });
    }

    const userId = authenticatedUserId;

    const plan = resolvePlanSelection(targetTier, billingCycle);
    if (!plan.ok) {
      return res.status(400).json({
        success: false,
        error: plan.error,
        ...(plan.code ? { code: plan.code } : {}),
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

    const recurring = recurringBillingEnabled();
    if (recurring && (await findBillingSubscription(pool, Number(userId)))) {
      return res.status(409).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_ACTIVE",
        error:
          "You already have a subscription that renews automatically. Manage it from your billing settings.",
      });
    }

    // Get or create Stripe customer so card is attached to their account
    const customerId = await getOrCreateStripeCustomer(
      Number(userId),
      user.email,
      user.username,
      stripeClient,
    );

    const checkoutInput = {
      userId,
      selection: plan.selection,
      customerId,
      customerEmail: user.email,
      baseUrl: getPublicBaseUrl(),
    };
    const session = await stripeClient.checkout.sessions.create(
      recurring
        ? buildRecurringPlanCheckoutParams(checkoutInput)
        : buildPlanCheckoutParams(checkoutInput),
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error: any) {
    const reason = redactStripeSecrets(error?.message);
    console.error("❌ Stripe checkout error:", reason, {
      type: error?.type,
      code: error?.code,
      requestId: error?.requestId,
    });
    res.status(500).json({ success: false, error: reason });
  }
});

// ─── PAID OFFERS (community join, activity tickets) ────────────────────────────

/** GET /api/v1/payments/offers — active offers and their admin-set prices. */
router.get("/offers", async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await listPaidOffers(pool) });
  } catch (error) {
    console.error("❌ Load offers failed:", error);
    res.status(500).json({ success: false, error: "Failed to load offers" });
  }
});

/** GET /api/v1/payments/offers/mine — offer keys the signed-in user already bought. */
router.get("/offers/mine", async (req: Request, res: Response) => {
  const userId = req.user?.userId || (req as any).user?.id;
  if (!userId) {
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  }
  try {
    await listPaidOffers(pool); // ensures the tables exist
    const result = await pool.query(
      `SELECT DISTINCT offer_key FROM paid_offer_purchases WHERE user_id = $1`,
      [userId],
    );
    res.json({ success: true, data: result.rows.map((r) => r.offer_key) });
  } catch (error) {
    console.error("❌ Load purchases failed:", error);
    res.status(500).json({ success: false, error: "Failed to load purchases" });
  }
});

/** GET /api/v1/payments/offers/admin — every offer, including inactive ones. */
router.get("/offers/admin", requireSuperuser(), async (_req, res) => {
  try {
    const data = await listPaidOffers(pool, { includeInactive: true });
    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Load admin offers failed:", error);
    res.status(500).json({ success: false, error: "Failed to load offers" });
  }
});

/** PUT /api/v1/payments/offers/:key — body { amountCents?, active? }. */
router.put("/offers/:key", requireSuperuser(), async (req, res) => {
  const key = String(req.params.key);
  if (!isPaidOfferKey(key)) {
    return res.status(404).json({ success: false, error: "Unknown offer" });
  }
  const parsed = validateOfferUpdate(req.body || {});
  if (!parsed.ok) {
    return res.status(400).json({ success: false, error: parsed.error });
  }
  try {
    const offer = await updatePaidOffer(pool, key, parsed);
    res.json({ success: true, data: offer });
  } catch (error) {
    console.error("❌ Update offer failed:", error);
    res.status(500).json({ success: false, error: "Failed to update offer" });
  }
});

/**
 * POST /api/v1/payments/create-offer-checkout
 * Body: { offerKey, eventId? }. The amount always comes from the database.
 * Answers 409 when the buyer already holds the offer, so a second Checkout
 * Session (a second charge) is never opened for something already paid for.
 */
router.post(
  "/create-offer-checkout",
  offerCheckoutLimiter,
  async (req: Request, res: Response) => {
    if (!onlinePaymentsEnabled()) {
      rejectUnavailablePayment(res);
      return;
    }
    const stripeClient = requireStripeClient(res);
    if (!stripeClient) return;

    try {
      const userId = req.user?.userId || (req as any).user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Authentication required" });
      }
      const { offerKey, eventId } = req.body || {};
      if (!isPaidOfferKey(offerKey)) {
        return res.status(400).json({ success: false, error: "Invalid offer" });
      }
      const offer = await getPaidOffer(pool, offerKey);
      if (!offer || !offer.active) {
        return res
          .status(400)
          .json({ success: false, error: "This offer is not available" });
      }

      let returnPath = "/community";
      const metadata: Record<string, string> = {
        userId: String(userId),
        type: "paid_offer",
        offerKey,
      };
      if (offerKey === "activity_ticket") {
        const id = Number(eventId);
        if (!Number.isInteger(id) || id <= 0) {
          return res
            .status(400)
            .json({ success: false, error: "eventId is required" });
        }
        const ev = await pool.query(
          `SELECT id, (COALESCE(ends_at, starts_at) < NOW()) AS ended
             FROM events WHERE id = $1 AND status = 'PUBLISHED'`,
          [id],
        );
        if (!ev.rows.length) {
          return res
            .status(404)
            .json({ success: false, error: "Published event not found" });
        }
        if (ev.rows[0].ended) {
          return res.status(409).json({
            success: false,
            code: "EVENT_ENDED",
            error: "This activity has already taken place.",
          });
        }
        if (await hasPurchasedOffer(pool, Number(userId), offerKey, id)) {
          return res.status(409).json({
            success: false,
            code: "ALREADY_PURCHASED",
            error: "You already have a ticket for this activity.",
          });
        }
        const going = await pool.query(
          `SELECT 1 FROM event_attendees
            WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'`,
          [id, userId],
        );
        if (going.rows.length) {
          return res.status(409).json({
            success: false,
            code: "ALREADY_ATTENDING",
            error: "You are already registered for this activity.",
          });
        }
        metadata.eventId = String(id);
        returnPath = `/events/${id}`;
      } else if (await hasPurchasedOffer(pool, Number(userId), offerKey)) {
        return res.status(409).json({
          success: false,
          code: "ALREADY_PURCHASED",
          error: "You are already a community member.",
        });
      }

      const userResult = await pool.query(
        `SELECT id, email, username FROM users WHERE id = $1`,
        [userId],
      );
      if (!userResult.rows.length) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      const user = userResult.rows[0];
      const customerId = await getOrCreateStripeCustomer(
        Number(userId),
        user.email,
        user.username,
        stripeClient,
      );

      const origin = getPublicBaseUrl();
      const session = await stripeClient.checkout.sessions.create({
        billing_address_collection: "required",
        mode: "payment",
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "cad",
              product_data: {
                name: `Verso Air — ${offer.name}`,
                description: offer.description || undefined,
              },
              unit_amount: offer.amountCents,
            },
            quantity: 1,
          },
        ],
        metadata,
        success_url: `${origin}${returnPath}?status=success`,
        cancel_url: `${origin}${returnPath}?status=cancelled`,
      });

      res.json({
        success: true,
        data: { sessionId: session.id, url: session.url },
      });
    } catch (error: any) {
      console.error(
        "❌ Offer checkout error:",
        redactStripeSecrets(error?.message),
      );
      res.status(500).json({ success: false, error: "Could not start checkout" });
    }
  },
);

// ─── STRIPE WEBHOOK ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/webhook
 * Handles Stripe webhook events (payment success, failure).
 * Must receive raw body (express.raw middleware applied in route registration).
 */
router.post("/webhook", async (req: Request, res: Response) => {
  // Resolved per request so a rotated key or webhook secret applies without a restart
  const stripe = getStripeClient({ apiVersion: STRIPE_API_VERSION });
  if (!stripe) {
    return res.status(503).json({ error: "Stripe not configured" });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    // Fail closed in every environment: an unsigned event must never fulfil anything.
    console.error("⚠️ STRIPE_WEBHOOK_SECRET not set - rejecting webhook");
    return res.status(503).json({ error: "Webhook secret not configured" });
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string" || !signature) {
    return res.status(400).json({ error: "Missing Stripe-Signature header" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err: any) {
    const reason = redactStripeSecrets(err?.message);
    console.error("⚠️ Stripe webhook signature verification failed:", reason);
    return res.status(400).json({ error: `Webhook Error: ${reason}` });
  }

  // Handle the event
  switch (event.type) {
    // Delayed methods (bank debits, transfers) complete unpaid and settle later.
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId } = session.metadata || {};

      // Subscription and marketing-order payments are applied exactly once;
      // see applyCheckoutSessionCompleted for the replay and concurrency rules.
      let outcome;
      try {
        outcome = await applyCheckoutSessionCompleted(pool, session);
      } catch (dbError: any) {
        // Nothing was committed, so a 5xx lets Stripe retry safely.
        console.error(
          "❌ DB error processing checkout.session.completed:",
          redactStripeSecrets(dbError?.message),
        );
        return res.status(500).json({ error: "Webhook processing failed" });
      }

      if (outcome.status === "duplicate") {
        console.log(
          `ℹ️ Duplicate checkout.session.completed for ${session.id} ignored`,
        );
        return res.json({ received: true, duplicate: true });
      }
      if (outcome.status === "ignored") break;
      if (outcome.status === "review") {
        // The payment is recorded; a person has to reconcile the order. Stripe
        // is acknowledged so it does not retry into the same state.
        await raisePaymentAlert({
          kind: "marketing_order_needs_review",
          summary: `A paid checkout could not be applied to order ${outcome.orderId} (${outcome.reason})`,
          details: {
            reason: outcome.reason,
            checkoutSessionId: outcome.sessionId,
            orderId: outcome.orderId,
            userId: outcome.userId,
            orderStatus: outcome.orderStatus,
            paidCents: outcome.paidCents,
            paidCurrency: outcome.paidCurrency,
            orderCents: outcome.orderCents,
            orderCurrency: outcome.orderCurrency,
          },
        });
        break;
      }
      if (outcome.status === "processed" && outcome.repeatPurchase) {
        // Both payments are recorded; the second one is a refund candidate.
        await raisePaymentAlert({
          kind: "paid_offer_paid_twice",
          summary:
            "A customer paid twice for the same offer; one payment should be refunded",
          details: {
            checkoutSessionId: session.id,
            userId,
            offerKey: session.metadata?.offerKey,
            eventId: session.metadata?.eventId,
            paidCents: session.amount_total,
          },
        });
      }

      try {
        const numericUserId = parseInt(userId);
        if (
          session.payment_intent &&
          typeof session.payment_intent === "string"
        ) {
          // Payment mode: extract PM from PaymentIntent
          const pi = await stripe!.paymentIntents.retrieve(
            session.payment_intent,
          );
          if (
            pi.payment_method &&
            typeof pi.payment_method === "string" &&
            pi.customer
          ) {
            await autoSavePaymentMethod(
              pi.payment_method,
              numericUserId,
              typeof pi.customer === "string" ? pi.customer : pi.customer.id,
            );
          }
        } else if (
          session.setup_intent &&
          typeof session.setup_intent === "string"
        ) {
          // Setup mode (add-card-session): extract PM from SetupIntent
          const si = await stripe!.setupIntents.retrieve(session.setup_intent);
          if (
            si.payment_method &&
            typeof si.payment_method === "string" &&
            si.customer
          ) {
            await autoSavePaymentMethod(
              si.payment_method,
              numericUserId,
              typeof si.customer === "string" ? si.customer : si.customer.id,
            );
          }
        }
      } catch (autoSaveErr: any) {
        console.error(
          "⚠️ Auto-save card after checkout error:",
          redactStripeSecrets(autoSaveErr?.message),
        );
      }
      break;
    }

    case "checkout.session.expired": {
      // An abandoned checkout releases its pending order; a retry on error is safe.
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        const expiry = await applyCheckoutSessionExpired(pool, session);
        if (expiry.status === "cancelled") {
          console.log(
            `ℹ️ Checkout ${session.id} expired; order ${expiry.orderId} cancelled`,
          );
        }
      } catch (dbError: any) {
        console.error(
          "❌ DB error processing checkout.session.expired:",
          redactStripeSecrets(dbError?.message),
        );
        return res.status(500).json({ error: "Webhook processing failed" });
      }
      break;
    }

    case "setup_intent.succeeded": {
      // Fired when a SetupIntent completes (card added via setup-intent endpoint)
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const siUserId = setupIntent.metadata?.userId;

      if (siUserId && setupIntent.payment_method && setupIntent.customer) {
        try {
          const pmId =
            typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method.id;
          const custId =
            typeof setupIntent.customer === "string"
              ? setupIntent.customer
              : setupIntent.customer.id;

          await autoSavePaymentMethod(pmId, parseInt(siUserId), custId);
        } catch (err: any) {
          console.error(
            "⚠️ Auto-save on setup_intent.succeeded error:",
            err.message,
          );
        }
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

    case "charge.refunded":
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      try {
        const outcome = await applyReversalEvent(pool, stripe, event);
        if (outcome.status === "unmatched") {
          console.warn(
            `ℹ️ ${event.type} ${event.id} does not match a recorded checkout payment`,
          );
        }
      } catch (reversalError: any) {
        // Nothing was committed, so a 5xx lets Stripe retry safely.
        console.error(
          `❌ DB error processing ${event.type}:`,
          redactStripeSecrets(reversalError?.message),
        );
        return res.status(500).json({ error: "Webhook processing failed" });
      }
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed":
    case "customer.subscription.deleted": {
      // Automatic-renewal plans; see services/plan-subscriptions.
      try {
        const outcome = await applyPlanSubscriptionEvent(pool, event);
        if (outcome.status === "duplicate") {
          console.log(`ℹ️ Duplicate ${event.type} ${event.id} ignored`);
        } else if (outcome.status === "ignored") {
          console.log(
            `ℹ️ ${event.type} ${event.id} not applied: ${outcome.reason}`,
          );
        }
      } catch (planError: any) {
        // Nothing was committed, so a 5xx lets Stripe retry safely.
        console.error(
          `❌ DB error processing ${event.type}:`,
          redactStripeSecrets(planError?.message),
        );
        return res.status(500).json({ error: "Webhook processing failed" });
      }
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
    const authenticatedUserId = req.user?.userId || (req as any).user?.id;
    const requestedUserId = req.query.userId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    if (!authenticatedUserId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    if (
      requestedUserId !== undefined &&
      Number(requestedUserId) !== Number(authenticatedUserId)
    ) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: cannot access another user's billing history",
      });
    }

    const userId = Number(authenticatedUserId);

    // Check if transactions table exists before querying
    const tableCheck = await pool.query(
      `SELECT to_regclass('public.transactions') AS tbl`,
    );
    if (!tableCheck.rows[0]?.tbl) {
      return res.json({
        success: true,
        transactions: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM transactions WHERE user_id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT id, amount, type, status, reference AS description, created_at AS "createdAt"
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
      transactions: dataResult.rows,
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
router.post("/create-portal", billingPortalLimiter, async (req: Request, res: Response) => {
  const client = stripeForRequest(res);
  if (!client) return;

  try {
    const authenticatedUserId = req.user?.userId || (req as any).user?.id;
    const requestedUserId = req.body?.userId;

    if (!authenticatedUserId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    if (
      requestedUserId !== undefined &&
      Number(requestedUserId) !== Number(authenticatedUserId)
    ) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: cannot create portal for another user",
      });
    }

    const userId = Number(authenticatedUserId);

    const userResult = await pool.query(
      `SELECT email, username FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const { email, username } = userResult.rows[0];
    const customerId = await ensureStripeCustomer(
      { stripe: client, db: pool },
      { userId, email, name: username, source: "billing_portal" },
    );

    const portalSession = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getPublicBaseUrl()}/pricing`,
    });

    res.json({
      success: true,
      data: { url: portalSession.url },
    });
  } catch (error: any) {
    const reason = redactStripeSecrets(error?.message);
    console.error("❌ Portal session error:", reason);
    res.status(500).json({ success: false, error: reason });
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
  client: Stripe | null = stripe,
): Promise<string> {
  return ensureStripeCustomer(
    { stripe: client!, db: pool },
    { userId, email, name, source: "ngo_pos" },
  );
}

// ─── HELPER: Auto-save a Stripe PaymentMethod to our DB ─────────────────────────

/**
 * Automatically saves a Stripe PaymentMethod to saved_payment_methods.
 * Deduplicates by stripe_payment_method_id so the same card isn't stored twice.
 * Called by webhook handlers when checkout/setup completes.
 */
async function autoSavePaymentMethod(
  pmId: string,
  userId: number,
  customerId: string,
  opts: { isDefault?: boolean; label?: string } = {},
): Promise<void> {
  if (!stripe) return;

  try {
    // Check if already saved
    const existing = await pool.query(
      `SELECT id FROM saved_payment_methods
       WHERE stripe_payment_method_id = $1 AND status != 'deleted'`,
      [pmId],
    );
    if (existing.rows.length > 0) {
      console.log(`ℹ️ Card ${pmId} already saved, skipping duplicate.`);
      return;
    }

    // Retrieve full card details from Stripe
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (!pm.card) {
      console.warn(`⚠️ PM ${pmId} is not a card, skipping.`);
      return;
    }

    // Attach to customer if not already
    try {
      await stripe.paymentMethods.attach(pmId, { customer: customerId });
    } catch (attachErr: any) {
      if (!attachErr.message?.includes("already been attached")) {
        console.warn(`⚠️ Attach warning for ${pmId}:`, attachErr.message);
      }
    }

    // If setting as default, unset others first
    if (opts.isDefault) {
      await pool.query(
        `UPDATE saved_payment_methods SET is_default = false, updated_at = NOW() WHERE user_id = $1`,
        [userId],
      );
    }

    // Check if this is the user's first card → auto-set as default
    const cardCount = await pool.query(
      `SELECT COUNT(*) as cnt FROM saved_payment_methods WHERE user_id = $1 AND status != 'deleted'`,
      [userId],
    );
    const isFirstCard = parseInt(cardCount.rows[0]?.cnt) === 0;
    const makeDefault = opts.isDefault || isFirstCard;

    const billing = pm.billing_details;
    const autoLabel =
      opts.label || `${pm.card.brand?.toUpperCase()} •••• ${pm.card.last4}`;

    await pool.query(
      `INSERT INTO saved_payment_methods
       (user_id, stripe_payment_method_id, stripe_customer_id, card_brand, card_last4,
        card_exp_month, card_exp_year, cardholder_name, billing_email, billing_phone,
        billing_address_line1, billing_address_line2, billing_city, billing_state,
        billing_postal_code, billing_country, card_country, card_funding, card_issuer,
        card_fingerprint, cvc_check,
        is_default, label, preauthorized, currency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'active')`,
      [
        userId,
        pmId,
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
        makeDefault,
        autoLabel,
        true,
        "USD",
      ],
    );

    console.log(
      `✅ Auto-saved card: ${pm.card.brand} ****${pm.card.last4} → User ${userId}${makeDefault ? " (default)" : ""}`,
    );
  } catch (error: any) {
    console.error(`❌ Auto-save PM error for ${pmId}:`, error.message);
  }
}

// ─── ADD CARD SESSION (Stripe-hosted card collection) ───────────────────────────

/**
 * POST /api/v1/payments/add-card-session
 * Creates a Stripe Checkout Session in 'setup' mode.
 * Redirects user to Stripe's secure hosted page to enter card details.
 * On completion, webhook auto-saves the card. No raw card numbers touch our server.
 */
router.post("/add-card-session", cardSetupLimiter, async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const userId = req.user?.userId || (req as any).user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
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
      Number(userId),
      user.email,
      user.username,
    );

    const origin = getPublicBaseUrl();

    const session = await stripe!.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        userId: String(userId),
        type: "card_vault_add",
      },
      success_url: `${origin}/account/cards?card_added=true`,
      cancel_url: `${origin}/account/cards?card_added=false`,
    });

    res.json({
      success: true,
      data: { url: session.url },
    });
  } catch (error: any) {
    console.error("❌ Add card session error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── SETUP INTENT (Pre-authorize card) ──────────────────────────────────────────

/**
 * POST /api/v1/payments/setup-intent
 * Creates a Stripe SetupIntent so a client can pre-authorize their card.
 * Body: { userId }
 * Returns: { clientSecret, setupIntentId }
 */
router.post("/setup-intent", requireAuth(), cardSetupLimiter, async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestActingUserId(req, res, req.body?.userId);
    if (userId === null) return;
    if (!requireStripe(res)) return;

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
router.post("/save-card", requireAuth(), async (req: Request, res: Response) => {
  try {
    const {
      paymentMethodId,
      label,
      isDefault = false,
      preauthorized = true,
      maxChargeAmount,
      currency = "USD",
    } = req.body;

    const userId = resolveRequestActingUserId(req, res, req.body?.userId);
    if (userId === null) return;
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: "paymentMethodId is required",
      });
    }
    if (!requireStripe(res)) return;

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

// ─── MY CARDS (auth-aware) ──────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/my-cards
 * Lists all saved payment methods for the authenticated user.
 * Uses JWT userId from auth middleware — no URL param needed.
 */
router.get("/my-cards", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || (req as any).user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT id, card_brand, card_last4, card_exp_month, card_exp_year,
              cardholder_name, billing_email, card_funding, is_default,
              label, status, created_at
       FROM saved_payment_methods
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY is_default DESC, created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error("❌ My cards error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/payments/cards/:cardId/default
 * Set a card as default payment method for the authenticated user.
 */
router.put("/cards/:cardId/default", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || (req as any).user?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    // Verify card belongs to this user
    const cardResult = await pool.query(
      `SELECT id FROM saved_payment_methods WHERE id = $1 AND user_id = $2 AND status != 'deleted'`,
      [cardId, userId],
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Card not found" });
    }

    // Unset all defaults for user, then set this one
    await pool.query(
      `UPDATE saved_payment_methods SET is_default = false, updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
    await pool.query(
      `UPDATE saved_payment_methods SET is_default = true, updated_at = NOW() WHERE id = $1`,
      [cardId],
    );

    res.json({ success: true, message: "Default card updated" });
  } catch (error: any) {
    console.error("❌ Set default card error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── LIST CARDS FOR USER ────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/cards/:userId
 * Lists all saved payment methods for a user.
 * Only returns cards belonging to the authenticated user (or admin).
 */
router.get(
  "/cards/:userId",
  requireSuperuser(),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = req.user?.userId || (req as any).user?.id;
      if (!authenticatedUserId) {
        return res
          .status(401)
          .json({ success: false, error: "Authentication required" });
      }

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
  },
);

// ─── DELETE CARD ────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/payments/cards/:cardId
 * Removes a saved payment method (soft-delete + detach from Stripe).
 */
router.delete("/cards/:cardId", requireAuth(), async (req: Request, res: Response) => {
  if (!requireStripe(res)) return;

  try {
    const { cardId } = req.params;
    const callerId = String(req.user?.userId || (req as any).user?.id || "");

    const cardResult = await pool.query(
      `SELECT * FROM saved_payment_methods WHERE id = $1`,
      [cardId],
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Card not found" });
    }

    const card = cardResult.rows[0];

    // Only the cardholder or configured owner may remove a card.
    if (String(card.user_id) !== callerId && !isOwner(req.user)) {
      return res.status(404).json({ success: false, error: "Card not found" });
    }

    await stripe!.paymentMethods.detach(card.stripe_payment_method_id);

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
 * Staff-initiated charge against a saved card; only the owner can call it.
 * Body: { cardId, amount, currency?, description?, category?, idempotencyKey? }
 * Retry with the same idempotencyKey so the card is never charged twice.
 */
router.post(
  "/charge",
  requireSuperuser(),
  async (req: Request, res: Response) => {
    if (!onlinePaymentsEnabled()) {
      rejectUnavailablePayment(res);
      return;
    }
    const client = stripeForRequest(res);
    if (!client) return;

    try {
      const result = await chargeSavedCard(
        { db: pool, stripe: client },
        { ...bodyOf(req), actorUserId: actorUserId(req) },
      );
      if (!result.ok) return sendServiceFailure(res, result);

      res.json({
        success: true,
        data: {
          charge: result.charge,
          paymentIntent: result.paymentIntent,
          replayed: result.replayed,
        },
      });
    } catch (error: any) {
      const message = redactStripeSecrets(error?.message);
      console.error("❌ POS Charge error:", message);
      res.status(500).json({ success: false, error: message });
    }
  },
);

// ─── REFUND NGO CHARGE ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/refund
 * Refund a previous NGO POS charge in full. Deliberately not behind the
 * online-payments switch: turning charging off must never block giving money
 * back. Safe to retry; Stripe issues at most one refund per charge.
 * Body: { chargeId, reason? } where reason is duplicate, fraudulent or
 * requested_by_customer (the default).
 */
router.post(
  "/refund",
  requireSuperuser(),
  async (req: Request, res: Response) => {
    const client = stripeForRequest(res);
    if (!client) return;

    try {
      const result = await refundNgoCharge(
        { db: pool, stripe: client },
        bodyOf(req),
      );
      if (!result.ok) return sendServiceFailure(res, result);

      res.json({
        success: true,
        data: {
          refundId: result.refundId,
          status: result.status,
          amount: result.amount,
        },
      });
    } catch (error: any) {
      const message = redactStripeSecrets(error?.message);
      console.error("❌ Refund error:", message);
      res.status(500).json({ success: false, error: message });
    }
  },
);

// ─── LIST ALL CUSTOMERS WITH SAVED CARDS ────────────────────────────────────────

/**
 * GET /api/v1/payments/customers
 * Admin-only: list all users who have saved payment methods.
 * Query: ?search=&page=1&limit=20
 */
router.get(
  "/customers",
  requireSuperuser(),
  async (req: Request, res: Response) => {
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
  },
);

// ─── NGO CHARGE HISTORY ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/ngo-charges
 * Lists all NGO POS charges with filters.
 * Query: ?status=succeeded&category=donation&page=1&limit=50&userId=
 */
router.get(
  "/ngo-charges",
  requireSuperuser(),
  async (req: Request, res: Response) => {
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
  },
);

// ─── POS DASHBOARD STATS ────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/pos-stats
 * Summary stats for the POS terminal dashboard. Admin-only.
 */
router.get(
  "/pos-stats",
  requireSuperuser(),
  async (req: Request, res: Response) => {
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
  },
);

export default router;

/**
 * Idempotent handling of Stripe checkout.session.completed.
 *
 * transactions.reference is UNIQUE, so the Checkout Session id doubles as the
 * ledger of processed payments: the claiming INSERT and every side effect
 * (order paid, cart cleared, tier upgrade) share one database transaction. A
 * replay or a concurrent duplicate finds the claim already present and does
 * nothing; a failure rolls the claim back so Stripe's retry processes it.
 *
 * A paid marketing session is only applied to an order that is still pending
 * and whose total and currency match what Stripe collected. Anything else keeps
 * the payment recorded and is reported as "review", so goods are never released
 * against a payment that does not cover them and a human reconciles the rest.
 */
import type Stripe from "stripe";
import { inTransaction } from "./db-transaction";
import { ensurePaidOfferTables } from "./paid-offers";
import type { Queryable, TxClient, TxPool } from "./marketing-checkout";

export type CheckoutReviewReason =
  | "order_not_found"
  | "order_not_pending"
  | "amount_mismatch"
  | "currency_mismatch";

export interface CheckoutReview {
  status: "review";
  kind: "marketing_order";
  reason: CheckoutReviewReason;
  sessionId: string;
  userId: number;
  orderId: number;
  paidCents: number | null;
  paidCurrency: string | null;
  orderCents: number | null;
  orderCurrency: string | null;
  orderStatus: string | null;
}

export type CheckoutCompletion =
  | { status: "processed"; kind: "subscription" | "marketing_order" | "paid_offer" }
  | CheckoutReview
  | { status: "duplicate" }
  | { status: "unhandled" }
  | { status: "ignored"; reason: string };

export type CheckoutExpiry =
  | { status: "cancelled"; orderId: number }
  | { status: "ignored"; reason: string };

export function positiveInt(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Plan-subscription handlers import the shared transaction helper from here.
export { inTransaction };

// The field moved between Stripe API versions, so accept either location.
function describeShipping(session: Stripe.Checkout.Session): string | null {
  const details =
    (session as any).collected_information?.shipping_details ??
    (session as any).shipping_details;
  const address = details?.address;
  if (!address) return null;
  const parts = [
    details.name,
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ].filter((part) => typeof part === "string" && part.trim() !== "");
  return parts.length ? `Ship to: ${parts.join(", ")}` : null;
}

// Claims the session id. Zero rows means another delivery already did.
export async function claimSession(
  client: TxClient,
  userId: number,
  amount: string,
  type: string,
  sessionId: string,
): Promise<boolean> {
  const claim = await client.query(
    `INSERT INTO transactions (business_id, user_id, amount, type, status, reference)
     VALUES (NULL, $1, $2, $3, 'completed', $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, amount, type, sessionId],
  );
  return claim.rows.length > 0;
}

export async function applyCheckoutSessionCompleted(
  db: TxPool,
  session: Stripe.Checkout.Session,
): Promise<CheckoutCompletion> {
  // Recurring plans are fulfilled by their invoices (services/plan-subscriptions).
  // The session carries the same targetTier metadata as a prepaid one, so
  // granting here too would apply and ledger the first payment twice.
  if (session.mode === "subscription") {
    console.log(
      `ℹ️ Subscription checkout ${session.id} is fulfilled by its invoice.paid event`,
    );
    return { status: "ignored", reason: "recurring_subscription" };
  }

  const { userId, targetTier, billingCycle, type, orderId } =
    session.metadata || {};

  if (!userId) {
    console.error("⚠️ Missing userId in checkout session:", session.id);
    return { status: "ignored", reason: "missing_user_id" };
  }
  const userIdNumber = positiveInt(userId);
  if (userIdNumber === null) {
    console.error("⚠️ Invalid userId in checkout session:", session.id);
    return { status: "ignored", reason: "invalid_user_id" };
  }
  if (session.payment_status === "unpaid") {
    console.warn(
      `⚠️ Checkout session ${session.id} completed but is not paid yet; not recording it`,
    );
    return { status: "ignored", reason: "unpaid" };
  }

  const amount = ((session.amount_total || 0) / 100).toFixed(2);

  if (targetTier) {
    return inTransaction<CheckoutCompletion>(db, async (client) => {
      const claimed = await claimSession(
        client,
        userIdNumber,
        amount,
        type || "subscription_fee",
        session.id,
      );
      if (!claimed) return { status: "duplicate" };

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
        [targetTier, expiresAt.toISOString(), userIdNumber],
      );

      console.log(
        `✅ Payment processed: User ${userIdNumber} → ${targetTier} (expires ${expiresAt.toISOString()})`,
      );
      return { status: "processed", kind: "subscription" };
    });
  }

  if (type === "paid_offer" && session.metadata?.offerKey) {
    const offerKey = session.metadata.offerKey;
    const eventIdRaw = session.metadata.eventId;
    const eventId = eventIdRaw ? positiveInt(eventIdRaw) : null;
    if (offerKey === "activity_ticket" && eventId === null) {
      console.error("⚠️ Activity ticket without a valid eventId:", session.id);
      return { status: "ignored", reason: "invalid_event_id" };
    }

    return inTransaction<CheckoutCompletion>(db, async (client) => {
      const claimed = await claimSession(
        client,
        userIdNumber,
        amount,
        "paid_offer",
        session.id,
      );
      if (!claimed) return { status: "duplicate" };

      await ensurePaidOfferTables(client);
      await client.query(
        `INSERT INTO paid_offer_purchases (user_id, offer_key, event_id, stripe_session_id, amount_cents)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stripe_session_id) DO NOTHING`,
        [userIdNumber, offerKey, eventId, session.id, session.amount_total || 0],
      );

      if (offerKey === "activity_ticket" && eventId !== null) {
        await client.query(
          `INSERT INTO event_attendees (event_id, user_id, status, updated_at)
           VALUES ($1, $2, 'GOING', NOW())
           ON CONFLICT (event_id, user_id)
           DO UPDATE SET status = 'GOING', updated_at = NOW()`,
          [eventId, userIdNumber],
        );
      }

      console.log(`✅ Paid offer ${offerKey} bought by user ${userIdNumber}`);
      return { status: "processed", kind: "paid_offer" };
    });
  }

  if (type === "marketing_order" && orderId) {
    const orderIdNumber = positiveInt(orderId);
    if (orderIdNumber === null) {
      console.error("⚠️ Invalid orderId in checkout session:", session.id);
      return { status: "ignored", reason: "invalid_order_id" };
    }

    return inTransaction<CheckoutCompletion>(db, async (client) => {
      const claimed = await claimSession(
        client,
        userIdNumber,
        amount,
        "marketing_order",
        session.id,
      );
      if (!claimed) return { status: "duplicate" };

      // Locked so a concurrent status change cannot slip in between the checks
      // and the update.
      const found = await client.query(
        `SELECT status, total_cents, currency
           FROM orders
          WHERE id = $1 AND user_id = $2
          FOR UPDATE`,
        [orderIdNumber, userIdNumber],
      );
      const order = found.rows[0] as
        | { status: string; total_cents: unknown; currency: unknown }
        | undefined;

      const paidCents =
        typeof session.amount_total === "number" ? session.amount_total : null;
      const paidCurrency = session.currency
        ? String(session.currency).toUpperCase()
        : null;
      const orderCents = order ? Number(order.total_cents) : null;
      const orderCurrency = order?.currency
        ? String(order.currency).toUpperCase()
        : null;

      let reason: CheckoutReviewReason | null = null;
      if (!order) reason = "order_not_found";
      else if (order.status !== "pending") reason = "order_not_pending";
      else if (paidCents === null || paidCents !== orderCents) {
        reason = "amount_mismatch";
      } else if (
        paidCurrency !== null &&
        orderCurrency !== null &&
        paidCurrency !== orderCurrency
      ) {
        reason = "currency_mismatch";
      }

      if (reason) {
        // The claim above stays: the payment is recorded, and only the order
        // needs a human. Failing here would make Stripe retry into the same state.
        console.error(
          `❌ Marketing order ${orderIdNumber} for user ${userIdNumber} held for review (${reason}) after session ${session.id} was paid`,
        );
        return {
          status: "review",
          kind: "marketing_order",
          reason,
          sessionId: session.id,
          userId: userIdNumber,
          orderId: orderIdNumber,
          paidCents,
          paidCurrency,
          orderCents,
          orderCurrency,
          orderStatus: order?.status ?? null,
        };
      }

      await client.query(
        `UPDATE orders
            SET status = 'paid', stripe_session_id = $1, paid_at = NOW(), updated_at = NOW()
          WHERE id = $2`,
        [session.id, orderIdNumber],
      );

      const shipping = describeShipping(session);
      if (shipping) {
        await client.query(
          `UPDATE orders SET notes = COALESCE(notes || E'\\n', '') || $2 WHERE id = $1`,
          [orderIdNumber, shipping],
        );
      }

      await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [
        userIdNumber,
      ]);

      console.log(
        `✅ Marketing order ${orderIdNumber} paid by user ${userIdNumber}`,
      );
      return { status: "processed", kind: "marketing_order" };
    });
  }

  return { status: "unhandled" };
}

/**
 * Refunds and disputes.
 *
 * Money moved back out of a payment we fulfilled. The original payment is found
 * through its Checkout Session (transactions.reference); the event itself is
 * claimed under "stripe_event:<id>" so a replay changes nothing. Orders move to
 * refunded / disputed / chargeback so revenue reports stop counting them.
 * Subscription tiers are NOT revoked automatically: that is a support decision.
 */
export type PaymentReversal =
  | { kind: "refund"; amountCents: number; full: boolean }
  | { kind: "dispute_opened"; amountCents: number }
  | { kind: "dispute_won"; amountCents: number }
  | { kind: "dispute_lost"; amountCents: number };

export type ReversalOutcome =
  | { status: "recorded"; orderUpdated: boolean }
  | { status: "duplicate" }
  | { status: "unmatched" }
  | { status: "ignored"; reason: string };

const LIVE_ORDER_STATUSES = ["paid", "processing", "shipped", "completed"];

function ledgerAmount(reversal: PaymentReversal): string {
  const cents = reversal.amountCents;
  switch (reversal.kind) {
    case "refund":
    case "dispute_opened":
      return (-cents / 100).toFixed(2);
    case "dispute_won":
      return (cents / 100).toFixed(2);
    case "dispute_lost":
      return "0.00";
  }
}

export async function applyPaymentReversal(
  db: TxPool,
  eventId: string,
  sessionId: string,
  reversal: PaymentReversal,
): Promise<ReversalOutcome> {
  return inTransaction<ReversalOutcome>(db, async (client) => {
    const original = await client.query(
      `SELECT user_id FROM transactions WHERE reference = $1`,
      [sessionId],
    );
    if (original.rows.length === 0) return { status: "unmatched" };

    const claimed = await claimSession(
      client,
      Number(original.rows[0].user_id),
      ledgerAmount(reversal),
      reversal.kind,
      `stripe_event:${eventId}`,
    );
    if (!claimed) return { status: "duplicate" };

    const note = `${reversal.kind} ${(reversal.amountCents / 100).toFixed(2)} (${eventId})`;
    let updated;
    if (reversal.kind === "refund" && !reversal.full) {
      updated = await client.query(
        `UPDATE orders
            SET notes = COALESCE(notes || E'\\n', '') || $2, updated_at = NOW()
          WHERE stripe_session_id = $1
          RETURNING id`,
        [sessionId, note],
      );
    } else {
      const [status, from] =
        reversal.kind === "dispute_won"
          ? ["paid", ["disputed"]]
          : reversal.kind === "dispute_opened"
            ? ["disputed", LIVE_ORDER_STATUSES]
            : reversal.kind === "dispute_lost"
              ? ["chargeback", ["disputed", ...LIVE_ORDER_STATUSES]]
              : ["refunded", ["disputed", ...LIVE_ORDER_STATUSES]];
      updated = await client.query(
        `UPDATE orders
            SET status = $2, notes = COALESCE(notes || E'\\n', '') || $3, updated_at = NOW()
          WHERE stripe_session_id = $1 AND status = ANY($4)
          RETURNING id`,
        [sessionId, status, note, from],
      );
    }

    console.log(
      `↩️ ${note} for session ${sessionId}; order rows updated: ${updated.rows.length}`,
    );
    return { status: "recorded", orderUpdated: updated.rows.length > 0 };
  });
}

type StripeLookup = Pick<Stripe, "checkout" | "charges" | "paymentIntents">;

/** Stripe returns related objects as an id or, when expanded, the object. */
export function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  const id = (value as { id?: unknown } | null | undefined)?.id;
  return typeof id === "string" && id ? id : null;
}

/** Ledger reference of a paid subscription invoice (see plan-subscriptions). */
export function invoiceLedgerReference(invoiceId: string): string {
  return `invoice:${invoiceId}`;
}

// Recurring plan payments have no Checkout Session of their own; the invoice
// that charged them is found through the PaymentIntent. Our client is pinned to
// an API version where PaymentIntent.invoice still exists.
async function invoiceIdForPaymentIntent(
  stripe: StripeLookup,
  paymentIntent: string | { id: string } | null | undefined,
): Promise<string | null> {
  const id = stripeId(paymentIntent);
  if (!id) return null;
  const retrieved = await stripe.paymentIntents.retrieve(id);
  return stripeId((retrieved as { invoice?: unknown }).invoice);
}

async function sessionIdForPaymentIntent(
  stripe: StripeLookup,
  paymentIntent: string | { id: string } | null | undefined,
): Promise<string | null> {
  const id =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!id) return null;
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: id,
    limit: 1,
  });
  return sessions.data[0]?.id ?? null;
}

/** charge.refunded, charge.dispute.created and charge.dispute.closed. */
export async function applyReversalEvent(
  db: TxPool,
  stripe: StripeLookup,
  event: Stripe.Event,
): Promise<ReversalOutcome> {
  let paymentIntent: string | { id: string } | null | undefined;
  let reversal: PaymentReversal;

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const previous = (event.data.previous_attributes as any)?.amount_refunded;
    const delta =
      charge.amount_refunded - (typeof previous === "number" ? previous : 0);
    reversal = {
      kind: "refund",
      amountCents: delta > 0 ? delta : charge.amount_refunded,
      full: charge.refunded === true,
    };
    paymentIntent = charge.payment_intent;
  } else if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.closed"
  ) {
    const dispute = event.data.object as Stripe.Dispute;
    if (event.type === "charge.dispute.created") {
      reversal = { kind: "dispute_opened", amountCents: dispute.amount };
    } else if (dispute.status === "lost") {
      reversal = { kind: "dispute_lost", amountCents: dispute.amount };
    } else if (dispute.status === "won" || dispute.status === "warning_closed") {
      reversal = { kind: "dispute_won", amountCents: dispute.amount };
    } else {
      return { status: "ignored", reason: `dispute_status_${dispute.status}` };
    }
    paymentIntent = dispute.payment_intent;
    if (!paymentIntent && dispute.charge) {
      const chargeId =
        typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
      paymentIntent = (await stripe.charges.retrieve(chargeId)).payment_intent;
    }
  } else {
    return { status: "ignored", reason: "not_a_reversal_event" };
  }

  const sessionId = await sessionIdForPaymentIntent(stripe, paymentIntent);
  if (sessionId) {
    const outcome = await applyPaymentReversal(
      db,
      event.id,
      sessionId,
      reversal,
    );
    if (outcome.status !== "unmatched") return outcome;
  }

  const invoiceId = await invoiceIdForPaymentIntent(stripe, paymentIntent);
  if (invoiceId) {
    return applyPaymentReversal(
      db,
      event.id,
      invoiceLedgerReference(invoiceId),
      reversal,
    );
  }
  return { status: "unmatched" };
}

/**
 * Stripe sends checkout.session.expired when a customer abandons checkout. The
 * order created for that session is released so it does not stay pending
 * forever; a paid, shipped or already cancelled order is never touched.
 */
export async function applyCheckoutSessionExpired(
  db: Queryable,
  session: Stripe.Checkout.Session,
): Promise<CheckoutExpiry> {
  const { userId, orderId, type } = session.metadata || {};
  if (type !== "marketing_order" || !orderId) {
    return { status: "ignored", reason: "not_marketing_order" };
  }
  const userIdNumber = positiveInt(userId);
  const orderIdNumber = positiveInt(orderId);
  if (userIdNumber === null || orderIdNumber === null) {
    return { status: "ignored", reason: "invalid_metadata" };
  }

  const cancelled = await db.query(
    `UPDATE orders
        SET status = 'cancelled', notes = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      RETURNING id`,
    [orderIdNumber, userIdNumber, "Checkout session expired before payment"],
  );
  if (cancelled.rows.length === 0) {
    return { status: "ignored", reason: "order_not_pending" };
  }
  return { status: "cancelled", orderId: orderIdNumber };
}

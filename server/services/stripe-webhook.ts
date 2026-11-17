/**
 * Idempotent handling of Stripe checkout.session.completed.
 *
 * transactions.reference is UNIQUE, so the Checkout Session id doubles as the
 * ledger of processed payments: the claiming INSERT and every side effect
 * (order paid, cart cleared, tier upgrade) share one database transaction. A
 * replay or a concurrent duplicate finds the claim already present and does
 * nothing; a failure rolls the claim back so Stripe's retry processes it.
 */
import type Stripe from "stripe";
import type { TxClient, TxPool } from "./marketing-checkout";

export type CheckoutCompletion =
  | { status: "processed"; kind: "subscription" | "marketing_order" }
  | { status: "duplicate" }
  | { status: "unhandled" }
  | { status: "ignored"; reason: string };

function positiveInt(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function inTransaction<T>(
  db: TxPool,
  work: (client: TxClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

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
async function claimSession(
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

      const updated = await client.query(
        `UPDATE orders
            SET status = 'paid', stripe_session_id = $1, paid_at = NOW(), updated_at = NOW()
          WHERE id = $2 AND user_id = $3 AND status = 'pending'
          RETURNING id, total_cents`,
        [session.id, orderIdNumber, userIdNumber],
      );

      if (updated.rows.length === 0) {
        // The payment is recorded above; only the order needs manual attention.
        console.error(
          `❌ Marketing order ${orderIdNumber} for user ${userIdNumber} was not pending when session ${session.id} was paid`,
        );
        return { status: "processed", kind: "marketing_order" };
      }

      const storedCents = Number(updated.rows[0].total_cents);
      if (
        session.amount_total != null &&
        storedCents !== session.amount_total
      ) {
        console.error(
          `❌ Marketing order ${orderIdNumber}: Stripe charged ${session.amount_total} but the order total is ${storedCents} cents`,
        );
      }

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

type StripeLookup = Pick<Stripe, "checkout" | "charges">;

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
  if (!sessionId) return { status: "unmatched" };
  return applyPaymentReversal(db, event.id, sessionId, reversal);
}

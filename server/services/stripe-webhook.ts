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

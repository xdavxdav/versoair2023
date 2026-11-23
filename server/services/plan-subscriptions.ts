/**
 * Recurring plan billing: Stripe subscriptions, applied from webhooks.
 *
 * The INVOICE is the unit of fulfilment. Each paid invoice (the first one and
 * every renewal) is claimed once in the transactions ledger as "invoice:<id>",
 * extends plan access to the end of the period it paid for, and keeps the
 * plan_subscriptions row current, all in one database transaction. A replay
 * finds the claim already present and changes nothing; a failure rolls
 * everything back so Stripe's retry processes the event. The subscription-mode
 * checkout.session.completed grants nothing (see stripe-webhook.ts), so a plan
 * is never granted or ledgered twice.
 *
 * Only subscriptions created by our own plan checkout are acted on: they are
 * recognised by a plan_subscriptions row or by the checkout metadata that the
 * checkout copies onto the subscription. Anything else is ignored.
 */
import type Stripe from "stripe";
import {
  isBillingCycle,
  isSelfServePlanTier,
  type BillingCycle,
} from "@shared/plan-pricing";
import type { Queryable, TxPool } from "./marketing-checkout";
import {
  claimSession,
  inTransaction,
  invoiceLedgerReference,
  positiveInt,
  stripeId,
} from "./stripe-webhook";

type Loose = Record<string, any>;

/** Stripe moved Invoice.subscription under parent.subscription_details in API 2025-03-31. */
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const loose = invoice as unknown as Loose;
  return (
    stripeId(loose.parent?.subscription_details?.subscription) ??
    stripeId(loose.subscription)
  );
}

/** The subscription's metadata as copied onto the invoice, in either API shape. */
export function invoiceSubscriptionMetadata(
  invoice: Stripe.Invoice,
): Record<string, string | undefined> {
  const loose = invoice as unknown as Loose;
  return {
    ...(loose.subscription_details?.metadata ?? {}),
    ...(loose.parent?.subscription_details?.metadata ?? {}),
  };
}

/** The end of the period an invoice paid for: its latest line item period end. */
export function invoicePaidThrough(invoice: Stripe.Invoice): Date | null {
  const lines: Loose[] = (invoice as unknown as Loose).lines?.data ?? [];
  const ends = lines
    .map((line) => line?.period?.end)
    .filter((end): end is number => typeof end === "number" && end > 0);
  return ends.length > 0 ? new Date(Math.max(...ends) * 1000) : null;
}

function fallbackPeriodEnd(cycle: BillingCycle): Date {
  const end = new Date();
  if (cycle === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

// A notification is a courtesy: it is written after the state change has
// committed and never fails the webhook.
async function notifyUser(
  db: Queryable,
  userId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'subscription', $2, $3, NOW())`,
      [userId, title, message],
    );
  } catch (err) {
    console.error(
      "⚠️ Subscription notification not saved:",
      err instanceof Error ? err.message : err,
    );
  }
}

export type InvoicePaidOutcome =
  | { status: "processed"; userId: number; tier: string; periodEnd: Date }
  | { status: "duplicate" }
  | { status: "ignored"; reason: string };

export async function applyInvoicePaid(
  db: TxPool,
  invoice: Stripe.Invoice,
): Promise<InvoicePaidOutcome> {
  const invoiceId = stripeId(invoice.id);
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!invoiceId || !subscriptionId) {
    return { status: "ignored", reason: "not_a_subscription_invoice" };
  }

  return inTransaction<InvoicePaidOutcome>(db, async (client) => {
    const known = await client.query(
      `SELECT user_id, tier, billing_cycle FROM plan_subscriptions WHERE stripe_subscription_id = $1`,
      [subscriptionId],
    );
    const metadata = invoiceSubscriptionMetadata(invoice);
    const plan = known.rows[0]
      ? {
          userId: known.rows[0].user_id,
          tier: known.rows[0].tier,
          cycle: known.rows[0].billing_cycle,
        }
      : metadata.type === "subscription_fee"
        ? {
            userId: metadata.userId,
            tier: metadata.targetTier,
            cycle: metadata.billingCycle,
          }
        : null;

    if (!plan) {
      console.warn(
        `⚠️ Invoice ${invoiceId} ignored: subscription ${subscriptionId} is not one of our plan subscriptions`,
      );
      return { status: "ignored", reason: "unknown_subscription" };
    }
    const userId = positiveInt(plan.userId);
    if (
      userId === null ||
      !isSelfServePlanTier(plan.tier) ||
      !isBillingCycle(plan.cycle)
    ) {
      console.error(
        `⚠️ Invoice ${invoiceId} ignored: subscription ${subscriptionId} has an invalid user, tier or billing cycle`,
      );
      return { status: "ignored", reason: "invalid_plan" };
    }

    const claimed = await claimSession(
      client,
      userId,
      ((invoice.amount_paid ?? 0) / 100).toFixed(2),
      "subscription_fee",
      invoiceLedgerReference(invoiceId),
    );
    if (!claimed) return { status: "duplicate" };

    const periodEnd = invoicePaidThrough(invoice) ?? fallbackPeriodEnd(plan.cycle);

    // GREATEST keeps an out-of-order or replayed older invoice from shortening access.
    await client.query(
      `INSERT INTO plan_subscriptions
         (user_id, stripe_subscription_id, stripe_customer_id, tier, billing_cycle, status, current_period_end)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       ON CONFLICT (stripe_subscription_id) DO UPDATE
         SET status = 'active',
             current_period_end = GREATEST(plan_subscriptions.current_period_end, EXCLUDED.current_period_end),
             updated_at = NOW()`,
      [
        userId,
        subscriptionId,
        stripeId(invoice.customer),
        plan.tier,
        plan.cycle,
        periodEnd.toISOString(),
      ],
    );
    await client.query(
      `UPDATE users
          SET subscription_tier = $1,
              subscription_status = 'active',
              premium_expires_at = GREATEST(premium_expires_at, $2::timestamp)
        WHERE id = $3`,
      [plan.tier, periodEnd.toISOString(), userId],
    );

    console.log(
      `✅ Plan invoice ${invoiceId} paid: user ${userId} → ${plan.tier} through ${periodEnd.toISOString()}`,
    );
    return { status: "processed", userId, tier: plan.tier, periodEnd };
  });
}

export type InvoicePaymentFailedOutcome =
  | { status: "recorded"; userId: number }
  | { status: "ignored"; reason: string };

// Stripe retries a failed renewal several times; only the first failure
// (active -> past_due) changes anything or notifies the customer. Access is
// not cut here: the daily expiry cron downgrades after its 7-day grace period.
export async function applyInvoicePaymentFailed(
  db: TxPool,
  invoice: Stripe.Invoice,
): Promise<InvoicePaymentFailedOutcome> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    return { status: "ignored", reason: "not_a_subscription_invoice" };
  }

  const outcome = await inTransaction<InvoicePaymentFailedOutcome>(
    db,
    async (client) => {
      const flipped = await client.query(
        `UPDATE plan_subscriptions
            SET status = 'past_due', updated_at = NOW()
          WHERE stripe_subscription_id = $1 AND status = 'active'
          RETURNING user_id`,
        [subscriptionId],
      );
      if (flipped.rows.length === 0) {
        return { status: "ignored", reason: "no_active_subscription" };
      }
      const userId = Number(flipped.rows[0].user_id);
      await client.query(
        `UPDATE users
            SET subscription_status = 'past_due'
          WHERE id = $1 AND subscription_status = 'active' AND subscription_tier != 'free'`,
        [userId],
      );
      return { status: "recorded", userId };
    },
  );

  if (outcome.status === "recorded") {
    await notifyUser(
      db,
      outcome.userId,
      "Payment Failed",
      "We could not renew your subscription. Update your card from your billing settings to keep your plan; we will retry the payment.",
    );
  }
  return outcome;
}

export type SubscriptionDeletedOutcome =
  | { status: "cancelled"; userId: number }
  | { status: "ignored"; reason: string };

// Marks the subscription ended. The user's plan is left alone: it keeps
// running to the end of the period already paid for, then the expiry cron
// downgrades it like any other expired plan.
export async function applySubscriptionDeleted(
  db: TxPool,
  subscription: Stripe.Subscription,
): Promise<SubscriptionDeletedOutcome> {
  const subscriptionId = stripeId(subscription.id);
  if (!subscriptionId) {
    return { status: "ignored", reason: "missing_subscription_id" };
  }
  const cancelled = await db.query(
    `UPDATE plan_subscriptions
        SET status = 'cancelled', updated_at = NOW()
      WHERE stripe_subscription_id = $1 AND status <> 'cancelled'
      RETURNING user_id`,
    [subscriptionId],
  );
  if (cancelled.rows.length === 0) {
    return { status: "ignored", reason: "no_open_subscription" };
  }
  const userId = Number(cancelled.rows[0].user_id);
  await notifyUser(
    db,
    userId,
    "Subscription Cancelled",
    "Your subscription will not renew. Your plan stays available until the end of the period you have paid for. Visit /pricing to subscribe again.",
  );
  return { status: "cancelled", userId };
}

export type PlanEventOutcome =
  | InvoicePaidOutcome
  | InvoicePaymentFailedOutcome
  | SubscriptionDeletedOutcome;

/** invoice.paid, invoice.payment_failed and customer.subscription.deleted. */
export async function applyPlanSubscriptionEvent(
  db: TxPool,
  event: Stripe.Event,
): Promise<PlanEventOutcome> {
  switch (event.type) {
    case "invoice.paid":
      return applyInvoicePaid(db, event.data.object as Stripe.Invoice);
    case "invoice.payment_failed":
      return applyInvoicePaymentFailed(db, event.data.object as Stripe.Invoice);
    case "customer.subscription.deleted":
      return applySubscriptionDeleted(
        db,
        event.data.object as Stripe.Subscription,
      );
    default:
      return { status: "ignored", reason: "not_a_plan_subscription_event" };
  }
}

export interface BillingSubscription {
  tier: string;
  billing_cycle: string;
  status: string;
}

/**
 * The user's automatic-renewal subscription that is still billing, if any.
 * A database without the table (the optional repair has not run) has no
 * subscribers, so that one error means "none" instead of failing the caller.
 */
export async function findBillingSubscription(
  db: Queryable,
  userId: number,
): Promise<BillingSubscription | null> {
  try {
    const found = await db.query(
      `SELECT tier, billing_cycle, status FROM plan_subscriptions
        WHERE user_id = $1 AND status IN ('active', 'past_due')
        ORDER BY id DESC LIMIT 1`,
      [userId],
    );
    return found.rows[0] ?? null;
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "42P01") return null;
    throw err;
  }
}

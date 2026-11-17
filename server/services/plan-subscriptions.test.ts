import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  FakePlanDb,
  invoiceEvent,
} from "../test-support/plan-subscription-fakes";
import {
  REAL_INVOICE_ID,
  REAL_INVOICE_PERIOD_END,
  REAL_SUBSCRIPTION_ID,
  realOpenInvoice,
  realPaidInvoice,
} from "../test-support/stripe-real-shapes";
import {
  applyInvoicePaid,
  applyInvoicePaymentFailed,
  applyPlanSubscriptionEvent,
  applySubscriptionDeleted,
  findBillingSubscription,
  invoicePaidThrough,
  invoiceSubscriptionId,
  invoiceSubscriptionMetadata,
} from "./plan-subscriptions";
import { applyCheckoutSessionCompleted } from "./stripe-webhook";

const asInvoice = (value: Record<string, any>) =>
  value as unknown as Stripe.Invoice;
const eventOf = (type: string, object: Record<string, any>) =>
  ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;
const at = (seconds: number) => new Date(seconds * 1000);

const FIRST_PERIOD_END = 1_800_000_000;
const NEXT_PERIOD_END = FIRST_PERIOD_END + 2_592_000;

function subscriberDb() {
  const db = new FakePlanDb();
  db.addUser(7);
  return db;
}

test("reads the subscription from either Stripe API shape", () => {
  for (const shape of ["acacia", "basil"] as const) {
    const invoice = asInvoice(invoiceEvent({ shape }));
    assert.equal(invoiceSubscriptionId(invoice), "sub_1", shape);
    assert.deepEqual(
      invoiceSubscriptionMetadata(invoice),
      {
        userId: "7",
        targetTier: "verified",
        billingCycle: "monthly",
        type: "subscription_fee",
      },
      shape,
    );
  }
  assert.equal(
    invoiceSubscriptionId(asInvoice({ id: "in_x", subscription: { id: "sub_9" } })),
    "sub_9",
  );
  assert.equal(invoiceSubscriptionId(asInvoice(invoiceEvent({ subscription: null }))), null);
  assert.deepEqual(
    invoiceSubscriptionMetadata(asInvoice(invoiceEvent({ metadata: null }))),
    {},
  );
});

test("the paid-through date is the latest line item period end", () => {
  const lines = (...ends: unknown[]) =>
    asInvoice({ lines: { data: ends.map((end) => ({ period: { end } })) } });
  assert.deepEqual(
    invoicePaidThrough(lines(1_700_000_000, 1_800_000_000, 1_750_000_000)),
    at(1_800_000_000),
  );
  assert.equal(invoicePaidThrough(lines()), null);
  assert.equal(invoicePaidThrough(lines(0, "soon", null)), null);
  assert.equal(invoicePaidThrough(asInvoice({})), null);
});

test("the first paid invoice grants the plan, ledgers the payment and records the subscription", async () => {
  for (const shape of ["acacia", "basil"] as const) {
    const db = subscriberDb();
    const outcome = await applyInvoicePaid(db, asInvoice(invoiceEvent({ shape })));

    assert.deepEqual(outcome, {
      status: "processed",
      userId: 7,
      tier: "verified",
      periodEnd: at(FIRST_PERIOD_END),
    });
    assert.deepEqual(
      db.transactions.map(({ user_id, amount, type, reference }) => ({
        user_id,
        amount,
        type,
        reference,
      })),
      [
        {
          user_id: 7,
          amount: "96.00",
          type: "subscription_fee",
          reference: "invoice:in_1",
        },
      ],
      shape,
    );
    assert.deepEqual(db.subscriptions.get("sub_1"), {
      user_id: 7,
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      tier: "verified",
      billing_cycle: "monthly",
      status: "active",
      current_period_end: at(FIRST_PERIOD_END),
    });
    assert.deepEqual(db.users.get(7), {
      subscription_tier: "verified",
      subscription_status: "active",
      premium_expires_at: at(FIRST_PERIOD_END),
    });
    assert.equal(db.releases, db.connects);
  }
});

test("a replayed invoice changes nothing", async () => {
  const db = subscriberDb();
  await applyInvoicePaid(db, asInvoice(invoiceEvent()));
  const later = new Date("2031-01-01T00:00:00Z");
  db.users.get(7)!.premium_expires_at = later;

  assert.deepEqual(await applyInvoicePaid(db, asInvoice(invoiceEvent())), {
    status: "duplicate",
  });
  assert.equal(db.transactions.length, 1);
  assert.equal(db.users.get(7)?.premium_expires_at, later);
  assert.equal(db.releases, db.connects);
});

test("a renewal extends the plan from the stored subscription, without needing metadata", async () => {
  const db = subscriberDb();
  await applyInvoicePaid(db, asInvoice(invoiceEvent()));

  const renewal = await applyInvoicePaid(
    db,
    asInvoice(
      invoiceEvent({ id: "in_2", metadata: null, periodEnd: NEXT_PERIOD_END }),
    ),
  );
  assert.equal(renewal.status, "processed");
  assert.deepEqual(
    db.transactions.map((row) => row.reference),
    ["invoice:in_1", "invoice:in_2"],
  );
  assert.equal(db.subscriptions.get("sub_1")?.current_period_end?.getTime(), NEXT_PERIOD_END * 1000);
  assert.equal(db.users.get(7)?.premium_expires_at?.getTime(), NEXT_PERIOD_END * 1000);
  assert.equal(db.users.get(7)?.subscription_status, "active");
});

test("an older invoice delivered late never shortens access", async () => {
  const db = subscriberDb();
  await applyInvoicePaid(
    db,
    asInvoice(invoiceEvent({ id: "in_2", periodEnd: NEXT_PERIOD_END })),
  );
  const late = await applyInvoicePaid(
    db,
    asInvoice(invoiceEvent({ id: "in_1", periodEnd: FIRST_PERIOD_END })),
  );

  assert.equal(late.status, "processed");
  assert.equal(db.transactions.length, 2);
  assert.equal(db.subscriptions.get("sub_1")?.current_period_end?.getTime(), NEXT_PERIOD_END * 1000);
  assert.equal(db.users.get(7)?.premium_expires_at?.getTime(), NEXT_PERIOD_END * 1000);
});

test("prepaid access that already runs longer is kept", async () => {
  const db = new FakePlanDb();
  const prepaidUntil = new Date("2031-06-01T00:00:00Z");
  db.addUser(7, {
    subscription_tier: "essential",
    premium_expires_at: prepaidUntil,
  });
  await applyInvoicePaid(db, asInvoice(invoiceEvent()));

  assert.equal(db.users.get(7)?.subscription_tier, "verified");
  assert.equal(db.users.get(7)?.premium_expires_at, prepaidUntil);
});

test("the stored plan wins over the metadata on later invoices", async () => {
  const db = subscriberDb();
  db.addSubscription("sub_1", {
    user_id: 7,
    tier: "essential",
    billing_cycle: "annual",
  });
  await applyInvoicePaid(
    db,
    asInvoice(
      invoiceEvent({
        metadata: {
          userId: "99",
          targetTier: "max",
          billingCycle: "monthly",
          type: "subscription_fee",
        },
      }),
    ),
  );

  assert.equal(db.users.get(7)?.subscription_tier, "essential");
  assert.equal(db.subscriptions.get("sub_1")?.tier, "essential");
  assert.equal(db.transactions[0].user_id, 7);
  assert.equal(db.users.has(99), false);
});

test("subscriptions that are not ours are ignored without touching anything", async () => {
  for (const metadata of [
    null,
    {},
    { userId: "7", targetTier: "verified", billingCycle: "monthly", type: "marketing_order" },
  ]) {
    const db = subscriberDb();
    const outcome = await applyInvoicePaid(db, asInvoice(invoiceEvent({ metadata })));
    assert.deepEqual(outcome, { status: "ignored", reason: "unknown_subscription" });
    assert.equal(db.transactions.length, 0);
    assert.equal(db.subscriptions.size, 0);
    assert.equal(db.users.get(7)?.subscription_tier, "free");
    assert.ok(db.statements.every((sql) => sql.startsWith("SELECT")));
    assert.equal(db.releases, db.connects);
  }
});

test("invalid plan metadata is ignored, never granted", async () => {
  const valid = {
    userId: "7",
    targetTier: "verified",
    billingCycle: "monthly",
    type: "subscription_fee",
  };
  for (const bad of [
    { targetTier: "enterprise" },
    { targetTier: "free" },
    { targetTier: "constructor" },
    { targetTier: undefined },
    { userId: "abc" },
    { userId: "0" },
    { userId: "-3" },
    { billingCycle: "weekly" },
    { billingCycle: undefined },
  ]) {
    const db = subscriberDb();
    const metadata = { ...valid, ...bad } as Record<string, string>;
    const outcome = await applyInvoicePaid(db, asInvoice(invoiceEvent({ metadata })));
    assert.deepEqual(
      outcome,
      { status: "ignored", reason: "invalid_plan" },
      JSON.stringify(bad),
    );
    assert.equal(db.transactions.length, 0);
    assert.equal(db.users.get(7)?.subscription_tier, "free");
  }
});

test("invoices that do not belong to a subscription never open a transaction", async () => {
  const db = subscriberDb();
  assert.deepEqual(
    await applyInvoicePaid(db, asInvoice(invoiceEvent({ subscription: null }))),
    { status: "ignored", reason: "not_a_subscription_invoice" },
  );
  assert.deepEqual(
    await applyInvoicePaid(db, asInvoice({ ...invoiceEvent(), id: undefined })),
    { status: "ignored", reason: "not_a_subscription_invoice" },
  );
  assert.equal(db.connects, 0);
  assert.equal(db.statements.length, 0);
});

test("without line item periods access runs for one cycle from now", async () => {
  const day = 86_400_000;
  const monthly = subscriberDb();
  const before = Date.now();
  await applyInvoicePaid(monthly, asInvoice(invoiceEvent({ periodEnd: null })));
  const monthlyEnd = monthly.users.get(7)!.premium_expires_at!.getTime();
  assert.ok(monthlyEnd >= before + 27 * day && monthlyEnd <= before + 32 * day);

  const annual = subscriberDb();
  await applyInvoicePaid(
    annual,
    asInvoice(
      invoiceEvent({
        periodEnd: null,
        metadata: {
          userId: "7",
          targetTier: "verified",
          billingCycle: "annual",
          type: "subscription_fee",
        },
      }),
    ),
  );
  const annualEnd = annual.users.get(7)!.premium_expires_at!.getTime();
  assert.ok(annualEnd >= before + 364 * day && annualEnd <= before + 367 * day);
});

test("a zero-amount invoice still claims its ledger row and extends the plan", async () => {
  const db = subscriberDb();
  await applyInvoicePaid(db, asInvoice(invoiceEvent({ amountPaid: 0 })));
  assert.equal(db.transactions[0].amount, "0.00");
  assert.equal(db.users.get(7)?.subscription_tier, "verified");
});

test("the Stripe customer is stored whether it arrives as an id or an object", async () => {
  const db = subscriberDb();
  await applyInvoicePaid(db, asInvoice(invoiceEvent({ customer: { id: "cus_obj" } })));
  assert.equal(db.subscriptions.get("sub_1")?.stripe_customer_id, "cus_obj");
});

test("a database failure rolls back the claim so Stripe's retry is processed", async () => {
  const db = subscriberDb();
  db.failWhen = (sql) => sql.startsWith("UPDATE users SET subscription_tier");
  await assert.rejects(
    applyInvoicePaid(db, asInvoice(invoiceEvent())),
    /injected failure/,
  );
  assert.equal(db.transactions.length, 0);
  assert.equal(db.subscriptions.size, 0);
  assert.equal(db.users.get(7)?.subscription_tier, "free");
  assert.equal(db.releases, db.connects);

  db.failWhen = null;
  assert.equal((await applyInvoicePaid(db, asInvoice(invoiceEvent()))).status, "processed");
  assert.equal(db.transactions.length, 1);
});

test("a failed renewal flags the plan once, keeps access and notifies once", async () => {
  const db = new FakePlanDb();
  db.addUser(7, { subscription_tier: "verified" });
  db.addSubscription("sub_1", { user_id: 7 });

  assert.deepEqual(await applyInvoicePaymentFailed(db, asInvoice(invoiceEvent())), {
    status: "recorded",
    userId: 7,
  });
  assert.equal(db.subscriptions.get("sub_1")?.status, "past_due");
  assert.deepEqual(
    { ...db.users.get(7) },
    {
      subscription_tier: "verified",
      subscription_status: "past_due",
      premium_expires_at: null,
    },
  );
  assert.equal(db.notifications.length, 1);
  assert.equal(db.notifications[0].user_id, 7);
  assert.equal(db.notifications[0].title, "Payment Failed");

  // Stripe retries the payment and sends the failure again.
  assert.deepEqual(await applyInvoicePaymentFailed(db, asInvoice(invoiceEvent())), {
    status: "ignored",
    reason: "no_active_subscription",
  });
  assert.equal(db.notifications.length, 1);
});

test("a retry that succeeds restores the plan and extends it", async () => {
  const db = subscriberDb();
  await applyInvoicePaid(db, asInvoice(invoiceEvent()));
  await applyInvoicePaymentFailed(
    db,
    asInvoice(invoiceEvent({ id: "in_2", periodEnd: NEXT_PERIOD_END })),
  );
  assert.equal(db.users.get(7)?.subscription_status, "past_due");

  await applyInvoicePaid(
    db,
    asInvoice(invoiceEvent({ id: "in_2", periodEnd: NEXT_PERIOD_END })),
  );
  assert.equal(db.subscriptions.get("sub_1")?.status, "active");
  assert.equal(db.users.get(7)?.subscription_status, "active");
  assert.equal(db.users.get(7)?.premium_expires_at?.getTime(), NEXT_PERIOD_END * 1000);
});

test("a failed notification never fails the webhook or undoes the state change", async () => {
  const db = new FakePlanDb();
  db.addUser(7, { subscription_tier: "verified" });
  db.addSubscription("sub_1", { user_id: 7 });
  db.failWhen = (sql) => sql.startsWith("INSERT INTO notifications");

  const outcome = await applyInvoicePaymentFailed(db, asInvoice(invoiceEvent()));
  assert.equal(outcome.status, "recorded");
  assert.equal(db.subscriptions.get("sub_1")?.status, "past_due");
});

test("payment failures of other subscriptions are ignored", async () => {
  const db = subscriberDb();
  assert.deepEqual(
    await applyInvoicePaymentFailed(db, asInvoice(invoiceEvent({ subscription: "sub_other" }))),
    { status: "ignored", reason: "no_active_subscription" },
  );
  assert.deepEqual(
    await applyInvoicePaymentFailed(db, asInvoice(invoiceEvent({ subscription: null }))),
    { status: "ignored", reason: "not_a_subscription_invoice" },
  );
  assert.equal(db.notifications.length, 0);
});

test("a cancelled subscription ends renewal but leaves the paid-through plan alone", async () => {
  const db = new FakePlanDb();
  const paidThrough = at(FIRST_PERIOD_END);
  db.addUser(7, { subscription_tier: "verified", premium_expires_at: paidThrough });
  db.addSubscription("sub_1", { user_id: 7 });

  const outcome = await applySubscriptionDeleted(
    db,
    { id: "sub_1" } as unknown as Stripe.Subscription,
  );
  assert.deepEqual(outcome, { status: "cancelled", userId: 7 });
  assert.equal(db.subscriptions.get("sub_1")?.status, "cancelled");
  assert.deepEqual(
    { ...db.users.get(7) },
    {
      subscription_tier: "verified",
      subscription_status: "active",
      premium_expires_at: paidThrough,
    },
  );
  assert.equal(db.notifications.length, 1);
  assert.equal(db.notifications[0].title, "Subscription Cancelled");

  assert.deepEqual(
    await applySubscriptionDeleted(db, { id: "sub_1" } as unknown as Stripe.Subscription),
    { status: "ignored", reason: "no_open_subscription" },
  );
  assert.deepEqual(
    await applySubscriptionDeleted(db, { id: "sub_none" } as unknown as Stripe.Subscription),
    { status: "ignored", reason: "no_open_subscription" },
  );
  assert.equal(db.notifications.length, 1);
});

test("plan subscription events are routed by type and others are ignored", async () => {
  const db = subscriberDb();
  assert.equal(
    (await applyPlanSubscriptionEvent(db, eventOf("invoice.paid", invoiceEvent()))).status,
    "processed",
  );
  assert.equal(
    (
      await applyPlanSubscriptionEvent(
        db,
        eventOf("invoice.payment_failed", invoiceEvent({ id: "in_2" })),
      )
    ).status,
    "recorded",
  );
  assert.equal(
    (await applyPlanSubscriptionEvent(db, eventOf("customer.subscription.deleted", { id: "sub_1" })))
      .status,
    "cancelled",
  );
  assert.deepEqual(
    await applyPlanSubscriptionEvent(db, eventOf("invoice.created", invoiceEvent())),
    { status: "ignored", reason: "not_a_plan_subscription_event" },
  );
});

test("a subscription-mode checkout grants nothing; its invoice grants once", async () => {
  const db = subscriberDb();
  const session = {
    id: "cs_sub_1",
    mode: "subscription",
    payment_status: "paid",
    amount_total: 9600,
    metadata: {
      userId: "7",
      targetTier: "verified",
      billingCycle: "monthly",
      type: "subscription_fee",
    },
  } as unknown as Stripe.Checkout.Session;

  assert.deepEqual(await applyCheckoutSessionCompleted(db, session), {
    status: "ignored",
    reason: "recurring_subscription",
  });
  assert.equal(db.connects, 0);
  assert.equal(db.statements.length, 0);
  assert.equal(db.users.get(7)?.subscription_tier, "free");

  await applyInvoicePaid(db, asInvoice(invoiceEvent()));
  await applyCheckoutSessionCompleted(db, session);
  assert.equal(db.transactions.length, 1);
  assert.equal(db.users.get(7)?.subscription_tier, "verified");
});

test("only active or past-due subscriptions count as billing", async () => {
  const db = new FakePlanDb();
  assert.equal(await findBillingSubscription(db, 7), null);

  db.addSubscription("sub_old", { user_id: 7, status: "cancelled" });
  assert.equal(await findBillingSubscription(db, 7), null);

  db.addSubscription("sub_1", { user_id: 7, status: "past_due" });
  assert.deepEqual(await findBillingSubscription(db, 7), {
    tier: "verified",
    billing_cycle: "monthly",
    status: "past_due",
  });
  assert.equal(await findBillingSubscription(db, 8), null);
});

test("a database without the table has no subscribers; other errors surface", async () => {
  const missing = new FakePlanDb();
  missing.missingTable = true;
  assert.equal(await findBillingSubscription(missing, 7), null);

  const broken = new FakePlanDb();
  broken.failWhen = () => true;
  await assert.rejects(findBillingSubscription(broken, 7), /injected failure/);
});

test("a real invoice captured from Stripe (API 2026-09-30.preview) is fulfilled, failed and cancelled correctly", async () => {
  const open = asInvoice(realOpenInvoice());
  assert.equal(invoiceSubscriptionId(open), REAL_SUBSCRIPTION_ID);
  assert.deepEqual(invoiceSubscriptionMetadata(open), {
    billingCycle: "monthly",
    targetTier: "verified",
    type: "subscription_fee",
    userId: "424242",
  });
  // Invoice.period_end is when the invoice was created; the plan must run to
  // the end of the period its line item paid for.
  assert.deepEqual(invoicePaidThrough(open), at(REAL_INVOICE_PERIOD_END));
  assert.notEqual(open.period_end, REAL_INVOICE_PERIOD_END);

  const db = new FakePlanDb();
  db.addUser(424242);
  const paid = asInvoice(realPaidInvoice());

  assert.deepEqual(await applyInvoicePaid(db, paid), {
    status: "processed",
    userId: 424242,
    tier: "verified",
    periodEnd: at(REAL_INVOICE_PERIOD_END),
  });
  assert.deepEqual(
    db.transactions.map(({ amount, reference }) => ({ amount, reference })),
    [{ amount: "96.00", reference: `invoice:${REAL_INVOICE_ID}` }],
  );
  assert.equal(db.subscriptions.get(REAL_SUBSCRIPTION_ID)?.status, "active");
  assert.equal(db.users.get(424242)?.subscription_tier, "verified");
  assert.deepEqual(
    db.users.get(424242)?.premium_expires_at,
    at(REAL_INVOICE_PERIOD_END),
  );

  assert.deepEqual(await applyInvoicePaid(db, paid), { status: "duplicate" });
  assert.equal(db.transactions.length, 1);

  assert.deepEqual(
    await applyPlanSubscriptionEvent(
      db,
      eventOf("invoice.payment_failed", realOpenInvoice()),
    ),
    { status: "recorded", userId: 424242 },
  );
  assert.equal(db.subscriptions.get(REAL_SUBSCRIPTION_ID)?.status, "past_due");

  assert.deepEqual(
    await applyPlanSubscriptionEvent(
      db,
      eventOf("customer.subscription.deleted", { id: REAL_SUBSCRIPTION_ID }),
    ),
    { status: "cancelled", userId: 424242 },
  );
  assert.equal(db.subscriptions.get(REAL_SUBSCRIPTION_ID)?.status, "cancelled");
  assert.equal(db.users.get(424242)?.subscription_tier, "verified");
});

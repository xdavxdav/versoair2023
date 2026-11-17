import assert from "node:assert/strict";
import express from "express";
import test, { afterEach, beforeEach, mock } from "node:test";
import {
  call,
  pool,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import {
  createStubStripe,
  signWebhook,
  stripeEventPayload,
} from "../../test-support/marketing-fakes";
import {
  FakePlanDb,
  invoiceEvent,
} from "../../test-support/plan-subscription-fakes";
import { setStripeClientFactory } from "../../utils/stripe-client";

process.env.STRIPE_SECRET_KEY = `sk_test_${"x".repeat(24)}`;
const paymentsRouter = (await import("./payments")).default;

const SECRET = `whsec_${"s".repeat(32)}`;
const customer = { id: 7, role: "user" };
const ENV = [
  "ONLINE_PAYMENTS_ENABLED",
  "COMMERCIAL_SUBSCRIPTIONS_ENABLED",
  "RECURRING_BILLING_ENABLED",
  "PUBLIC_BASE_URL",
  "STRIPE_WEBHOOK_SECRET",
] as const;
const saved: Record<string, string | undefined> = {};
let stub: ReturnType<typeof createStubStripe>;

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = "true";
  delete process.env.RECURRING_BILLING_ENABLED;
  process.env.PUBLIC_BASE_URL = "https://www.versoair.com";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  stub = createStubStripe();
  setStripeClientFactory(() => stub.client);
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  setStripeClientFactory(null);
});

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(paymentsRouter, fn);

// The app reads the webhook raw (server/index.ts), so Stripe sees the exact bytes.
const serveWebhook = (fn: (origin: string) => Promise<void>) =>
  withRouter(paymentsRouter, fn, {
    before: [express.raw({ type: "application/json" })],
    json: false,
  });

const missingTable = () =>
  Object.assign(new Error('relation "plan_subscriptions" does not exist'), {
    code: "42P01",
  });

const BILLING_SELECT = "SELECT tier, billing_cycle, status FROM plan_subscriptions";

function scriptCheckout(
  billing: (() => { rows: any[] }) | null = () => ({ rows: [] }),
) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT id, email, username, subscription_tier FROM users")) {
      return {
        rows: [
          {
            id: 7,
            email: "luq@example.com",
            username: "luq",
            subscription_tier: "free",
          },
        ],
      };
    }
    if (sql === "SELECT stripe_customer_id FROM users WHERE id = $1") {
      return { rows: [{ stripe_customer_id: "cus_existing" }] };
    }
    if (sql.startsWith(BILLING_SELECT)) return billing?.();
    return undefined;
  });
}

const checkout = (origin: string, body: unknown) =>
  call(origin, "POST", "/create-checkout", {
    headers: signIn(customer),
    body,
  });

test("with recurring billing off, plans stay one-time and the subscriptions table is never read", async () => {
  const pool = scriptCheckout();
  await serve(async (origin) => {
    const response = await checkout(origin, {
      targetTier: "verified",
      billingCycle: "annual",
    });
    assert.equal(response.status, 200);
  });

  assert.equal(stub.calls.sessionsCreate.length, 1);
  assert.equal(stub.calls.sessionsCreate[0].params.mode, "payment");
  assert.equal(pool.matching("plan_subscriptions").length, 0);
});

test("only the exact value true switches recurring billing on", async () => {
  scriptCheckout();
  await serve(async (origin) => {
    for (const value of ["", "false", "TRUE", "1", "yes"]) {
      process.env.RECURRING_BILLING_ENABLED = value;
      assert.equal((await checkout(origin, { targetTier: "essential" })).status, 200);
    }
  });
  assert.deepEqual(
    stub.calls.sessionsCreate.map((call) => call.params.mode),
    ["payment", "payment", "payment", "payment", "payment"],
  );
});

test("with recurring billing on, a plan is a CAD subscription carrying its plan on the subscription", async () => {
  process.env.RECURRING_BILLING_ENABLED = "true";
  scriptCheckout();
  await serve(async (origin) => {
    const response = await checkout(origin, {
      targetTier: "verified",
      billingCycle: "annual",
    });
    assert.equal(response.status, 200);
    assert.match(response.body.data.url, /^https:\/\/checkout\.stripe\.test\//);
  });

  assert.equal(stub.calls.sessionsCreate.length, 1);
  const { params } = stub.calls.sessionsCreate[0];
  const metadata = {
    userId: "7",
    targetTier: "verified",
    billingCycle: "annual",
    type: "subscription_fee",
  };
  assert.equal(params.mode, "subscription");
  assert.equal(params.customer, "cus_existing");
  assert.equal(params.line_items[0].price_data.currency, "cad");
  assert.equal(params.line_items[0].price_data.unit_amount, 96000);
  assert.deepEqual(params.line_items[0].price_data.recurring, {
    interval: "year",
  });
  assert.deepEqual(params.metadata, metadata);
  assert.deepEqual(params.subscription_data.metadata, metadata);
  assert.equal(params.payment_intent_data, undefined);
  assert.match(params.success_url, /^https:\/\/www\.versoair\.com\//);
});

test("recurring billing never opens plan checkout by itself: both payment flags are still required", async () => {
  process.env.RECURRING_BILLING_ENABLED = "true";
  const pool = scriptCheckout();
  await serve(async (origin) => {
    for (const [online, subscriptions] of [
      ["false", "true"],
      ["true", "false"],
    ]) {
      process.env.ONLINE_PAYMENTS_ENABLED = online;
      process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = subscriptions;
      const response = await checkout(origin, { targetTier: "essential" });
      assert.equal(response.status, 503, `${online}/${subscriptions}`);
    }
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
  assert.equal(pool.log.length, 0);
});

test("someone who already has a renewing subscription cannot start a second one", async () => {
  process.env.RECURRING_BILLING_ENABLED = "true";
  for (const status of ["active", "past_due"]) {
    const pool = scriptCheckout(() => ({
      rows: [{ tier: "verified", billing_cycle: "monthly", status }],
    }));
    await serve(async (origin) => {
      const response = await checkout(origin, { targetTier: "max" });
      assert.equal(response.status, 409, status);
      assert.equal(response.body.success, false);
      assert.equal(response.body.code, "SUBSCRIPTION_ALREADY_ACTIVE");
    });
    assert.equal(pool.matching("UPDATE users SET stripe_customer_id").length, 0);
  }
  assert.equal(stub.calls.sessionsCreate.length, 0);
  assert.equal(stub.calls.customersCreate.length, 0);
});

test("a database without the subscriptions table still sells a subscription", async () => {
  process.env.RECURRING_BILLING_ENABLED = "true";
  scriptCheckout(() => {
    throw missingTable();
  });
  await serve(async (origin) => {
    assert.equal((await checkout(origin, { targetTier: "essential" })).status, 200);
  });
  assert.equal(stub.calls.sessionsCreate[0].params.mode, "subscription");
});

test("any other database error while checking for a subscription sells nothing", async () => {
  process.env.RECURRING_BILLING_ENABLED = "true";
  scriptCheckout(() => {
    throw new Error("connection terminated unexpectedly");
  });
  await serve(async (origin) => {
    const response = await checkout(origin, { targetTier: "essential" });
    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
  });
  assert.equal(stub.calls.sessionsCreate.length, 0, "no second subscription is risked");
  assert.equal(stub.calls.customersCreate.length, 0);
});

// ─── webhook ────────────────────────────────────────────────────────────────

let planDb: FakePlanDb;

function useFakePlanDb() {
  planDb = new FakePlanDb();
  planDb.addUser(7);
  mock.method(pool, "query", planDb.query as never);
  mock.method(pool, "connect", planDb.connect as never);
}

const post = (origin: string, payload: string, signature?: string) =>
  fetch(`${origin}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body: payload,
    signal: AbortSignal.timeout(3000),
  });

const signed = (type: string, object: Record<string, any>, id = "evt_1") => {
  const payload = stripeEventPayload(type, object, id);
  return { payload, signature: signWebhook(payload, SECRET) };
};

test("a signed invoice.paid grants the plan once, however often Stripe delivers it", async () => {
  useFakePlanDb();
  const { payload, signature } = signed("invoice.paid", invoiceEvent());
  await serveWebhook(async (origin) => {
    for (let delivery = 0; delivery < 3; delivery++) {
      const response = await post(origin, payload, signature);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { received: true });
    }
  });

  assert.equal(planDb.transactions.length, 1);
  assert.equal(planDb.transactions[0].reference, "invoice:in_1");
  assert.equal(planDb.users.get(7)?.subscription_tier, "verified");
  assert.equal(planDb.subscriptions.get("sub_1")?.status, "active");
  assert.equal(planDb.releases, planDb.connects);
});

test("signed payment-failed and subscription-deleted events update the subscription", async () => {
  useFakePlanDb();
  planDb.users.get(7)!.subscription_tier = "verified";
  planDb.addSubscription("sub_1", { user_id: 7 });

  const failed = signed("invoice.payment_failed", invoiceEvent({ id: "in_2" }), "evt_2");
  const deleted = signed(
    "customer.subscription.deleted",
    { id: "sub_1", object: "subscription" },
    "evt_3",
  );
  await serveWebhook(async (origin) => {
    assert.equal((await post(origin, failed.payload, failed.signature)).status, 200);
    assert.equal(planDb.subscriptions.get("sub_1")?.status, "past_due");
    assert.equal(planDb.users.get(7)?.subscription_status, "past_due");

    assert.equal((await post(origin, deleted.payload, deleted.signature)).status, 200);
    assert.equal(planDb.subscriptions.get("sub_1")?.status, "cancelled");
  });
  assert.deepEqual(
    planDb.notifications.map((row) => row.title),
    ["Payment Failed", "Subscription Cancelled"],
  );
  assert.equal(planDb.users.get(7)?.subscription_tier, "verified");
});

test("unsigned, wrongly signed and tampered invoice events fulfil nothing", async () => {
  useFakePlanDb();
  const payload = stripeEventPayload("invoice.paid", invoiceEvent());
  const tampered = stripeEventPayload(
    "invoice.paid",
    invoiceEvent({ amountPaid: 1 }),
  );
  await serveWebhook(async (origin) => {
    assert.equal((await post(origin, payload)).status, 400);
    assert.equal(
      (await post(origin, payload, signWebhook(payload, `whsec_${"z".repeat(32)}`))).status,
      400,
    );
    assert.equal(
      (await post(origin, payload, signWebhook(tampered, SECRET))).status,
      400,
    );
  });
  assert.equal(planDb.statements.length, 0);
  assert.equal(planDb.transactions.length, 0);
});

test("a database failure answers 500 so Stripe retries, and the retry then succeeds", async () => {
  useFakePlanDb();
  const { payload, signature } = signed("invoice.paid", invoiceEvent());
  planDb.failWhen = (sql) => sql.startsWith("UPDATE users SET subscription_tier");
  await serveWebhook(async (origin) => {
    const failed = await post(origin, payload, signature);
    assert.equal(failed.status, 500);
    assert.deepEqual(await failed.json(), { error: "Webhook processing failed" });
    assert.equal(planDb.transactions.length, 0, "the claim was rolled back");

    planDb.failWhen = null;
    assert.equal((await post(origin, payload, signature)).status, 200);
  });
  assert.equal(planDb.transactions.length, 1);
  assert.equal(planDb.users.get(7)?.subscription_tier, "verified");
});

test("a database failure on a payment failure or cancellation also answers 500", async () => {
  useFakePlanDb();
  planDb.addSubscription("sub_1", { user_id: 7 });
  planDb.failWhen = (sql) => sql.startsWith("UPDATE plan_subscriptions SET status");

  const failed = signed("invoice.payment_failed", invoiceEvent(), "evt_2");
  const deleted = signed("customer.subscription.deleted", { id: "sub_1" }, "evt_3");
  await serveWebhook(async (origin) => {
    assert.equal((await post(origin, failed.payload, failed.signature)).status, 500);
    assert.equal((await post(origin, deleted.payload, deleted.signature)).status, 500);
  });
  assert.equal(planDb.subscriptions.get("sub_1")?.status, "active");
});

test("a subscription checkout and unrelated invoice events are acknowledged without touching the database", async () => {
  useFakePlanDb();
  const subscriptionCheckout = signed("checkout.session.completed", {
    object: "checkout.session",
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
  });
  const created = signed("invoice.created", invoiceEvent(), "evt_2");
  const shopInvoice = signed(
    "invoice.paid",
    invoiceEvent({ subscription: null }),
    "evt_3",
  );
  await serveWebhook(async (origin) => {
    for (const event of [subscriptionCheckout, created, shopInvoice]) {
      const response = await post(origin, event.payload, event.signature);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { received: true });
    }
  });
  assert.equal(planDb.statements.length, 0);
  assert.equal(planDb.connects, 0);
  assert.equal(planDb.users.get(7)?.subscription_tier, "free");
});

// ─── customer portal ────────────────────────────────────────────────────────

function scriptPortal(storedCustomerId: string | null) {
  return scriptPool((sql) =>
    sql === "SELECT email, stripe_customer_id FROM users WHERE id = $1"
      ? {
          rows: [
            { email: "luq@example.com", stripe_customer_id: storedCustomerId },
          ],
        }
      : undefined,
  );
}

const portal = (origin: string, body: unknown = {}, signedIn = true) =>
  call(origin, "POST", "/create-portal", {
    headers: signedIn ? signIn(customer) : {},
    body,
  });

test("the billing portal opens on the customer saved at checkout, not one found by email", async () => {
  scriptPortal("cus_subscriber");
  stub = createStubStripe({ customersByEmail: [{ id: "cus_lookalike" }] });
  setStripeClientFactory(() => stub.client);

  await serve(async (origin) => {
    const response = await portal(origin);
    assert.equal(response.status, 200);
    assert.match(response.body.data.url, /^https:\/\/billing\.stripe\.test\//);
  });
  assert.deepEqual(stub.calls.portalSessionsCreate, [
    { customer: "cus_subscriber", return_url: "https://www.versoair.com/pricing" },
  ]);
  assert.equal(stub.calls.customersList.length, 0);
  assert.equal(stub.calls.customersCreate.length, 0);
});

test("without a saved customer the portal finds one by email", async () => {
  scriptPortal(null);
  stub = createStubStripe({ customersByEmail: [{ id: "cus_by_email" }] });
  setStripeClientFactory(() => stub.client);
  await serve(async (origin) => {
    assert.equal((await portal(origin)).status, 200);
  });
  assert.deepEqual(stub.calls.customersList, [
    { email: "luq@example.com", limit: 1 },
  ]);
  assert.equal(stub.calls.portalSessionsCreate[0].customer, "cus_by_email");
  assert.equal(stub.calls.customersCreate.length, 0);
});

test("without a saved or existing customer the portal creates one", async () => {
  scriptPortal(null);
  await serve(async (origin) => {
    assert.equal((await portal(origin)).status, 200);
  });
  assert.equal(stub.calls.customersCreate.length, 1);
  assert.deepEqual(stub.calls.customersCreate[0].metadata, { userId: "7" });
  assert.equal(stub.calls.portalSessionsCreate[0].customer, "cus_stub_1");
});

test("the portal needs a signed-in account, refuses another user's id and a missing Stripe key", async () => {
  const pool = scriptPortal("cus_subscriber");
  await serve(async (origin) => {
    assert.equal((await portal(origin, {}, false)).status, 401);
    assert.equal((await portal(origin, { userId: 99 })).status, 403);

    setStripeClientFactory(() => null);
    assert.equal((await portal(origin)).status, 503);
  });
  assert.equal(stub.calls.portalSessionsCreate.length, 0);
  assert.equal(pool.log.length, 0);
});

test("a Stripe failure while opening the portal returns 500 without key material", async () => {
  scriptPortal("cus_subscriber");
  stub = createStubStripe({ failPortal: true });
  setStripeClientFactory(() => stub.client);
  await serve(async (origin) => {
    const response = await portal(origin);
    assert.equal(response.status, 500);
    assert.doesNotMatch(response.text, /sk_test_x{6}/);
    assert.match(response.body.error, /\[redacted\]/);
  });
});

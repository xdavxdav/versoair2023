import assert from "node:assert/strict";
import express from "express";
import test, { afterEach, beforeEach, mock } from "node:test";
import { pool, withRouter } from "../../test-support/route-harness";
import {
  FakeDb,
  createStubStripe,
  signWebhook,
} from "../../test-support/marketing-fakes";
import { setStripeClientFactory } from "../../utils/stripe-client";

const router = (await import("./payments")).default;

const SECRET = `whsec_${"w".repeat(32)}`;
const SESSION_ID = "cs_test_order_42";

// The app reads this route raw (server/index.ts), so Stripe sees the exact bytes.
const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn, {
    before: [express.raw({ type: "application/json" })],
    json: false,
  });

let db: FakeDb;
let stripe: ReturnType<typeof createStubStripe>;
let errors: string[];
const saved = {
  secret: process.env.STRIPE_WEBHOOK_SECRET,
};

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  db = new FakeDb();
  db.orders.push({
    id: 42,
    user_id: 7,
    total_cents: 500,
    currency: "CAD",
    status: "pending",
    stripe_session_id: null,
    paid_at: null,
  });
  db.addCartItem(7, "pack", 3);
  mock.method(pool, "query", db.query as never);
  mock.method(pool, "connect", db.connect as never);

  stripe = createStubStripe();
  setStripeClientFactory(() => stripe.client);

  errors = [];
  mock.method(console, "error", (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
  mock.method(console, "warn", () => undefined);
  mock.method(console, "log", () => undefined);
});

afterEach(() => {
  setStripeClientFactory(null);
  // Assigning undefined would store the string "undefined".
  if (saved.secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = saved.secret;
});

function event(
  type: string,
  session: Record<string, unknown>,
  id = "evt_test_1",
): string {
  return JSON.stringify({
    id,
    object: "event",
    type,
    data: { object: { object: "checkout.session", ...session } },
  });
}

const paid = (overrides: Record<string, unknown> = {}) =>
  event("checkout.session.completed", {
    id: SESSION_ID,
    payment_status: "paid",
    amount_total: 500,
    currency: "cad",
    payment_intent: "pi_test_1",
    metadata: { userId: "7", orderId: "42", type: "marketing_order" },
    ...overrides,
  });

const expired = () =>
  event("checkout.session.expired", {
    id: SESSION_ID,
    payment_status: "unpaid",
    metadata: { userId: "7", orderId: "42", type: "marketing_order" },
  });

async function post(
  origin: string,
  payload: string,
  signature: string | null = signWebhook(payload, SECRET),
) {
  const response = await fetch(`${origin}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body: payload,
    signal: AbortSignal.timeout(3000),
  });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body };
}

const alertLines = () => errors.filter((line) => line.includes("[PAYMENT-ALERT]"));

test("a paid checkout marks its order paid and acknowledges Stripe quietly", async () => {
  await serve(async (origin) => {
    const response = await post(origin, paid());

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { received: true });
  });

  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.cart.length, 0);
  assert.equal(db.transactions.length, 1);
  assert.deepEqual(stripe.calls.paymentIntentsRetrieve, ["pi_test_1"]);
  assert.equal(alertLines().length, 0);
});

test("a paid checkout that cannot be applied alerts the operator once and is still acknowledged", async () => {
  db.orders[0]!.status = "cancelled";

  await serve(async (origin) => {
    const first = await post(origin, paid());
    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { received: true });

    const alerts = alertLines();
    assert.equal(alerts.length, 1);
    assert.match(alerts[0]!, /marketing_order_needs_review/);
    assert.match(alerts[0]!, /order_not_pending/);
    assert.match(alerts[0]!, new RegExp(SESSION_ID));
    assert.match(alerts[0]!, /"orderStatus":"cancelled"/);

    const replay = await post(origin, paid());
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body, { received: true, duplicate: true });
  });

  assert.equal(alertLines().length, 1, "a redelivery does not alert again");
  assert.equal(db.orders[0]?.status, "cancelled");
  assert.equal(db.cart.length, 1);
  assert.equal(db.transactions.length, 1, "the payment itself is recorded");
  assert.deepEqual(
    stripe.calls.paymentIntentsRetrieve,
    [],
    "no card is saved for a held order",
  );
});

test("an amount that differs from the order total is held for review", async () => {
  await serve(async (origin) => {
    const response = await post(origin, paid({ amount_total: 450 }));
    assert.equal(response.status, 200);
  });

  assert.equal(db.orders[0]?.status, "pending");
  assert.equal(alertLines().length, 1);
  assert.match(alertLines()[0]!, /amount_mismatch/);
  assert.match(alertLines()[0]!, /"paidCents":"450"/);
  assert.match(alertLines()[0]!, /"orderCents":"500"/);
});

test("an expired checkout cancels its pending order", async () => {
  await serve(async (origin) => {
    const response = await post(origin, expired());

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { received: true });
  });

  assert.equal(db.orders[0]?.status, "cancelled");
  assert.equal(db.cart.length, 1);
  assert.equal(alertLines().length, 0);
});

test("a database failure answers 5xx so Stripe retries, and the retry succeeds", async () => {
  db.failWhen = (sql) => sql.startsWith("UPDATE orders SET status = 'paid'");

  await serve(async (origin) => {
    const failed = await post(origin, paid());
    assert.equal(failed.status, 500);
    assert.equal(db.transactions.length, 0, "the claim was rolled back");
    assert.equal(db.orders[0]?.status, "pending");

    db.failWhen = null;
    const retry = await post(origin, paid());
    assert.equal(retry.status, 200);
  });

  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.transactions.length, 1);
});

test("an expiry that cannot be written answers 5xx so Stripe retries", async () => {
  db.failWhen = (sql) => sql.startsWith("UPDATE orders SET status = 'cancelled'");

  await serve(async (origin) => {
    const failed = await post(origin, expired());
    assert.equal(failed.status, 500);
    assert.equal(db.orders[0]?.status, "pending");

    db.failWhen = null;
    assert.equal((await post(origin, expired())).status, 200);
  });

  assert.equal(db.orders[0]?.status, "cancelled");
});

test("a forged or unsigned webhook is rejected before any database work", async () => {
  await serve(async (origin) => {
    const forged = signWebhook(paid(), `whsec_${"x".repeat(32)}`);
    assert.equal((await post(origin, paid(), forged)).status, 400);
    assert.equal((await post(origin, paid(), "t=1,v1=bad")).status, 400);
  });

  assert.equal(db.statements.length, 0);
  assert.equal(db.orders[0]?.status, "pending");
});

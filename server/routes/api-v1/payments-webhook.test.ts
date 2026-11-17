import assert from "node:assert/strict";
import express from "express";
import test, { afterEach, beforeEach } from "node:test";
import { withRouter, pool } from "../../test-support/route-harness";
import {
  checkoutCompletedEvent,
  createStubStripe,
  FakeDb,
  patchPoolWithFakes,
  signWebhook,
} from "../../test-support/marketing-fakes";
import { setStripeClientFactory } from "../../utils/stripe-client";

process.env.STRIPE_SECRET_KEY = `sk_test_${"x".repeat(24)}`;
const paymentsRouter = (await import("./payments")).default;

const SECRET = `whsec_${"s".repeat(32)}`;
let db: FakeDb;
let restorePool: () => void;
let stub: ReturnType<typeof createStubStripe>;

const session = {
  id: "cs_test_order_42",
  payment_status: "paid",
  amount_total: 5000,
  metadata: { userId: "7", orderId: "42", type: "marketing_order" },
};

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  db = new FakeDb();
  db.orders.push({
    id: 42,
    user_id: 7,
    total_cents: 5000,
    currency: "CAD",
    status: "pending",
    stripe_session_id: null,
    notes: null,
    paid_at: null,
  });
  db.addCartItem(7, "pack", 3);
  restorePool = patchPoolWithFakes(pool, db, new Map());
  stub = createStubStripe({ sessionsByPaymentIntent: { pi_1: session.id } });
  setStripeClientFactory(() => stub.client);
});

afterEach(() => {
  restorePool();
  setStripeClientFactory(null);
  process.env.STRIPE_WEBHOOK_SECRET = "";
});

// The app reads this route raw (server/index.ts), so Stripe sees the exact bytes.
const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(paymentsRouter, fn, {
    before: [express.raw({ type: "application/json" })],
    json: false,
  });

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

test("unsigned, wrongly signed and tampered events fulfil nothing", async () => {
  const payload = checkoutCompletedEvent(session);
  const smaller = checkoutCompletedEvent({ ...session, amount_total: 100 });
  await serve(async (origin) => {
    assert.equal((await post(origin, payload)).status, 400);
    assert.equal(
      (await post(origin, payload, signWebhook(payload, `whsec_${"z".repeat(32)}`)))
        .status,
      400,
    );
    assert.equal(
      (await post(origin, payload, signWebhook(smaller, SECRET))).status,
      400,
    );
    assert.equal((await post(origin, payload, "t=1,v1=deadbeef")).status, 400);
  });
  assert.equal(db.orders[0]?.status, "pending");
  assert.equal(db.transactions.length, 0);
  assert.equal(db.statements.length, 0);
});

test("without STRIPE_WEBHOOK_SECRET the webhook is closed in every environment", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "";
  const payload = checkoutCompletedEvent(session);
  const previous = process.env.NODE_ENV;
  try {
    for (const env of ["production", "development", undefined]) {
      if (env === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = env;
      await serve(async (origin) => {
        assert.equal((await post(origin, payload)).status, 503);
        assert.equal(
          (await post(origin, payload, signWebhook(payload, SECRET))).status,
          503,
        );
      });
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  assert.equal(db.orders[0]?.status, "pending");
  assert.equal(db.statements.length, 0);
});

test("a signed payment marks the order paid once; a replay is acknowledged but changes nothing", async () => {
  const payload = checkoutCompletedEvent(session);
  const signature = signWebhook(payload, SECRET);
  await serve(async (origin) => {
    const first = await post(origin, payload, signature);
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { received: true });

    const replay = await post(origin, payload, signature);
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { received: true, duplicate: true });
  });
  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.transactions.length, 1);
  assert.equal(db.cart.length, 0);
});

test("a signed full refund is applied through the route and an unsigned one is not", async () => {
  const paid = checkoutCompletedEvent(session);
  const refund = JSON.stringify({
    id: "evt_refund_9",
    object: "event",
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_1",
        payment_intent: "pi_1",
        amount: 5000,
        amount_refunded: 5000,
        refunded: true,
      },
    },
  });
  await serve(async (origin) => {
    assert.equal((await post(origin, paid, signWebhook(paid, SECRET))).status, 200);
    // an unsigned refund must not touch the order
    assert.equal((await post(origin, refund)).status, 400);
    assert.equal(db.orders[0]?.status, "paid");

    const signed = signWebhook(refund, SECRET);
    assert.equal((await post(origin, refund, signed)).status, 200);
    assert.equal((await post(origin, refund, signed)).status, 200);
  });
  assert.equal(db.orders[0]?.status, "refunded");
  assert.equal(db.transactions.filter((t) => t.type === "refund").length, 1);
});

test("a database failure answers 5xx so Stripe retries, and the retry succeeds", async () => {
  const payload = checkoutCompletedEvent(session);
  const signature = signWebhook(payload, SECRET);
  db.failWhen = (sql) => sql.startsWith("UPDATE orders SET status = 'paid'");
  await serve(async (origin) => {
    assert.equal((await post(origin, payload, signature)).status, 500);
    assert.equal(db.transactions.length, 0, "the claim is rolled back");
    db.failWhen = null;
    assert.equal((await post(origin, payload, signature)).status, 200);
  });
  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.transactions.length, 1);
});

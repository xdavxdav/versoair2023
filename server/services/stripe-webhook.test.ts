import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  applyCheckoutSessionCompleted,
  applyCheckoutSessionExpired,
} from "./stripe-webhook";
import { FakeDb } from "../test-support/marketing-fakes";

function pendingOrderDb(overrides: Record<string, unknown> = {}): FakeDb {
  const db = new FakeDb();
  db.orders.push({
    id: 42,
    user_id: 7,
    total_cents: 500,
    currency: "CAD",
    status: "pending",
    stripe_session_id: null,
    paid_at: null,
    ...overrides,
  });
  db.addCartItem(7, "pack", 3);
  return db;
}

function paidSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_test_order_42",
    payment_status: "paid",
    amount_total: 500,
    currency: "cad",
    metadata: { userId: "7", orderId: "42", type: "marketing_order" },
    ...overrides,
  } as Stripe.Checkout.Session;
}

test("paid marketing webhook is atomic, clears the cart, and is replay-safe", async () => {
  const db = new FakeDb();
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
  const session = {
    id: "cs_test_order_42",
    payment_status: "paid",
    amount_total: 500,
    metadata: {
      userId: "7",
      orderId: "42",
      type: "marketing_order",
    },
  } as Stripe.Checkout.Session;

  const first = await applyCheckoutSessionCompleted(db, session);
  const replay = await applyCheckoutSessionCompleted(db, session);

  assert.deepEqual(first, { status: "processed", kind: "marketing_order" });
  assert.deepEqual(replay, { status: "duplicate" });
  assert.equal(db.transactions.length, 1);
  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.orders[0]?.stripe_session_id, "cs_test_order_42");
  assert.equal(db.cart.length, 0);
  assert.equal(db.connects, 2);
  assert.equal(db.releases, 2);
});

test("an unpaid completion is ignored without recording a transaction", async () => {
  const db = new FakeDb();
  const result = await applyCheckoutSessionCompleted(db, {
    id: "cs_test_unpaid",
    payment_status: "unpaid",
    amount_total: 500,
    metadata: { userId: "7", orderId: "42", type: "marketing_order" },
  } as Stripe.Checkout.Session);

  assert.deepEqual(result, { status: "ignored", reason: "unpaid" });
  assert.equal(db.transactions.length, 0);
  assert.equal(db.connects, 0);
});

test("a paid session for an order that is no longer pending is held for review", async () => {
  const db = pendingOrderDb({ status: "cancelled" });

  const result = await applyCheckoutSessionCompleted(db, paidSession());

  assert.deepEqual(result, {
    status: "review",
    kind: "marketing_order",
    reason: "order_not_pending",
    sessionId: "cs_test_order_42",
    userId: 7,
    orderId: 42,
    paidCents: 500,
    paidCurrency: "CAD",
    orderCents: 500,
    orderCurrency: "CAD",
    orderStatus: "cancelled",
  });
  assert.equal(db.orders[0]?.status, "cancelled");
  assert.equal(db.cart.length, 1, "the cart is left for the owner to resolve");
  assert.equal(db.transactions.length, 1, "the money stays on the ledger");

  const replay = await applyCheckoutSessionCompleted(db, paidSession());
  assert.deepEqual(replay, { status: "duplicate" });
  assert.equal(db.transactions.length, 1);
});

for (const [label, amountTotal, paidCents] of [
  ["an underpayment", 400, 400],
  ["an overpayment", 600, 600],
  ["a missing amount", null, null],
] as const) {
  test(`${label} is held for review instead of marking the order paid`, async () => {
    const db = pendingOrderDb();

    const result = await applyCheckoutSessionCompleted(
      db,
      paidSession({ amount_total: amountTotal }),
    );

    assert.equal(result.status, "review");
    assert.ok(result.status === "review");
    assert.equal(result.reason, "amount_mismatch");
    assert.equal(result.paidCents, paidCents);
    assert.equal(result.orderCents, 500);
    assert.equal(db.orders[0]?.status, "pending");
    assert.equal(db.orders[0]?.stripe_session_id, null);
    assert.equal(db.cart.length, 1);
    assert.equal(db.transactions.length, 1);
  });
}

test("a payment in a different currency than the order is held for review", async () => {
  const db = pendingOrderDb();

  const result = await applyCheckoutSessionCompleted(
    db,
    paidSession({ currency: "usd" }),
  );

  assert.ok(result.status === "review");
  assert.equal(result.reason, "currency_mismatch");
  assert.equal(result.paidCurrency, "USD");
  assert.equal(result.orderCurrency, "CAD");
  assert.equal(db.orders[0]?.status, "pending");
});

test("a paid session for an order that belongs to someone else is held for review", async () => {
  const db = pendingOrderDb({ user_id: 8 });

  const result = await applyCheckoutSessionCompleted(db, paidSession());

  assert.ok(result.status === "review");
  assert.equal(result.reason, "order_not_found");
  assert.equal(result.orderStatus, null);
  assert.equal(db.orders[0]?.status, "pending");
  assert.equal(db.transactions.length, 1);
});

test("a failure while applying the order rolls the claim back so Stripe's retry succeeds", async () => {
  const db = pendingOrderDb();
  db.failWhen = (sql) => sql.startsWith("UPDATE orders SET status = 'paid'");

  await assert.rejects(
    applyCheckoutSessionCompleted(db, paidSession()),
    /injected failure/,
  );
  assert.equal(db.transactions.length, 0);
  assert.equal(db.orders[0]?.status, "pending");
  assert.equal(db.cart.length, 1);

  db.failWhen = null;
  const retry = await applyCheckoutSessionCompleted(db, paidSession());

  assert.deepEqual(retry, { status: "processed", kind: "marketing_order" });
  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.transactions.length, 1);
  assert.equal(db.releases, db.connects, "every client is released");
});

function expiredSession(
  metadata: Record<string, string> = {
    userId: "7",
    orderId: "42",
    type: "marketing_order",
  },
): Stripe.Checkout.Session {
  return {
    id: "cs_test_order_42",
    payment_status: "unpaid",
    metadata,
  } as Stripe.Checkout.Session;
}

test("an expired checkout cancels its pending order and keeps the cart", async () => {
  const db = pendingOrderDb();

  const result = await applyCheckoutSessionExpired(db, expiredSession());

  assert.deepEqual(result, { status: "cancelled", orderId: 42 });
  assert.equal(db.orders[0]?.status, "cancelled");
  assert.match(String(db.orders[0]?.notes), /expired/i);
  assert.equal(db.cart.length, 1, "the customer can start checkout again");
  assert.equal(db.transactions.length, 0);

  const again = await applyCheckoutSessionExpired(db, expiredSession());
  assert.deepEqual(again, { status: "ignored", reason: "order_not_pending" });
});

for (const status of ["paid", "processing", "shipped", "completed"]) {
  test(`an expiry event never touches a ${status} order`, async () => {
    const db = pendingOrderDb({ status });

    const result = await applyCheckoutSessionExpired(db, expiredSession());

    assert.deepEqual(result, { status: "ignored", reason: "order_not_pending" });
    assert.equal(db.orders[0]?.status, status);
    assert.equal(db.orders[0]?.notes, undefined);
  });
}

test("an expiry event for another user's order, or without order metadata, changes nothing", async () => {
  const db = pendingOrderDb({ user_id: 8 });

  assert.deepEqual(await applyCheckoutSessionExpired(db, expiredSession()), {
    status: "ignored",
    reason: "order_not_pending",
  });
  assert.equal(db.orders[0]?.status, "pending");

  const before = db.statements.length;
  assert.deepEqual(
    await applyCheckoutSessionExpired(
      db,
      expiredSession({ userId: "7", targetTier: "premium" }),
    ),
    { status: "ignored", reason: "not_marketing_order" },
  );
  assert.deepEqual(
    await applyCheckoutSessionExpired(
      db,
      expiredSession({ userId: "x", orderId: "42", type: "marketing_order" }),
    ),
    { status: "ignored", reason: "invalid_metadata" },
  );
  assert.equal(db.statements.length, before, "no SQL was issued");
});

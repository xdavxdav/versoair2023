import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { applyCheckoutSessionCompleted } from "./stripe-webhook";
import { FakeDb } from "../test-support/marketing-fakes";

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

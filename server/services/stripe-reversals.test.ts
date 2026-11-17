import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  applyCheckoutSessionCompleted,
  applyReversalEvent,
} from "./stripe-webhook";
import { buildCheckoutSessionParams } from "./marketing-checkout";
import { createStubStripe, FakeDb } from "../test-support/marketing-fakes";

const SESSION = "cs_test_order_42";

async function paidOrder() {
  const db = new FakeDb();
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
  await applyCheckoutSessionCompleted(db, {
    id: SESSION,
    payment_status: "paid",
    amount_total: 5000,
    metadata: { userId: "7", orderId: "42", type: "marketing_order" },
  } as Stripe.Checkout.Session);
  const { client } = createStubStripe({
    sessionsByPaymentIntent: { pi_1: SESSION },
    chargePaymentIntents: { ch_1: "pi_1" },
  });
  return { db, stripe: client };
}

const refundEvent = (
  charge: Record<string, unknown>,
  id = "evt_refund_1",
  previous?: Record<string, unknown>,
) =>
  ({
    id,
    type: "charge.refunded",
    data: {
      object: { id: "ch_1", payment_intent: "pi_1", amount: 5000, ...charge },
      previous_attributes: previous,
    },
  }) as unknown as Stripe.Event;

const disputeEvent = (
  type: "charge.dispute.created" | "charge.dispute.closed",
  dispute: Record<string, unknown>,
  id: string,
) =>
  ({
    id,
    type,
    data: {
      object: { id: "dp_1", charge: "ch_1", amount: 5000, ...dispute },
    },
  }) as unknown as Stripe.Event;

test("a full refund marks the order refunded once and a replay changes nothing", async () => {
  const { db, stripe } = await paidOrder();
  const event = refundEvent({ amount_refunded: 5000, refunded: true });

  const first = await applyReversalEvent(db, stripe, event);
  const replay = await applyReversalEvent(db, stripe, event);

  assert.deepEqual(first, { status: "recorded", orderUpdated: true });
  assert.deepEqual(replay, { status: "duplicate" });
  assert.equal(db.orders[0]?.status, "refunded");
  const ledger = db.transactions.filter((t) => t.type === "refund");
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0]?.amount, "-50.00");
  assert.equal(ledger[0]?.reference, "stripe_event:evt_refund_1");
});

test("a partial refund keeps the order paid and records only the new amount", async () => {
  const { db, stripe } = await paidOrder();

  await applyReversalEvent(
    db,
    stripe,
    refundEvent({ amount_refunded: 1000, refunded: false }),
  );
  await applyReversalEvent(
    db,
    stripe,
    refundEvent(
      { amount_refunded: 1500, refunded: false },
      "evt_refund_2",
      { amount_refunded: 1000 },
    ),
  );

  assert.equal(db.orders[0]?.status, "paid");
  assert.deepEqual(
    db.transactions.filter((t) => t.type === "refund").map((t) => t.amount),
    ["-10.00", "-5.00"],
  );
  assert.match(db.orders[0]?.notes ?? "", /evt_refund_1[\s\S]*evt_refund_2/);
});

test("dispute opened, won and lost move the order through the right states", async () => {
  const lost = await paidOrder();
  await applyReversalEvent(
    lost.db,
    lost.stripe,
    disputeEvent("charge.dispute.created", { payment_intent: "pi_1" }, "evt_d1"),
  );
  assert.equal(lost.db.orders[0]?.status, "disputed");
  await applyReversalEvent(
    lost.db,
    lost.stripe,
    disputeEvent("charge.dispute.closed", { status: "lost" }, "evt_d2"),
  );
  assert.equal(lost.db.orders[0]?.status, "chargeback");

  const won = await paidOrder();
  await applyReversalEvent(
    won.db,
    won.stripe,
    disputeEvent("charge.dispute.created", {}, "evt_d3"),
  );
  await applyReversalEvent(
    won.db,
    won.stripe,
    disputeEvent("charge.dispute.closed", { status: "won" }, "evt_d4"),
  );
  assert.equal(won.db.orders[0]?.status, "paid");
  assert.equal(
    won.db.transactions.reduce(
      (sum, t) => sum + Number(t.type === "dispute_opened" || t.type === "dispute_won" ? t.amount : 0),
      0,
    ),
    0,
    "a won dispute nets to zero in the ledger",
  );
});

test("an event that does not match a recorded checkout payment is left alone", async () => {
  const db = new FakeDb();
  const { client } = createStubStripe({
    sessionsByPaymentIntent: { pi_1: "cs_test_unknown" },
  });
  const result = await applyReversalEvent(
    db,
    client,
    refundEvent({ amount_refunded: 5000, refunded: true }),
  );
  assert.deepEqual(result, { status: "unmatched" });
  assert.equal(db.transactions.length, 0);

  const noSession = await applyReversalEvent(
    db,
    createStubStripe().client,
    refundEvent({ amount_refunded: 5000, refunded: true }),
  );
  assert.deepEqual(noSession, { status: "unmatched" });
});

test("a database failure rolls the claim back so Stripe's retry is processed", async () => {
  const { db, stripe } = await paidOrder();
  const event = refundEvent({ amount_refunded: 5000, refunded: true });

  db.failWhen = (sql) => sql.startsWith("UPDATE orders SET status = $2");
  await assert.rejects(applyReversalEvent(db, stripe, event));
  assert.equal(db.transactions.filter((t) => t.type === "refund").length, 0);

  db.failWhen = null;
  const retry = await applyReversalEvent(db, stripe, event);
  assert.equal(retry.status, "recorded");
  assert.equal(db.orders[0]?.status, "refunded");
});

test("inquiry-stage and unrelated events are ignored", async () => {
  const { db, stripe } = await paidOrder();
  const result = await applyReversalEvent(
    db,
    stripe,
    disputeEvent("charge.dispute.closed", { status: "needs_response" }, "evt_d5"),
  );
  assert.equal(result.status, "ignored");
  assert.equal(
    (
      await applyReversalEvent(db, stripe, {
        id: "evt_x",
        type: "customer.created",
        data: { object: {} },
      } as unknown as Stripe.Event)
    ).status,
    "ignored",
  );
});

test("print orders collect a CA/US shipping address and keep it on the order; packs do not", async () => {
  const line = (itemType: "pack" | "print_product") => ({
    itemType,
    itemId: 1,
    name: "Item",
    quantity: 1,
    unitCents: 500,
    lineCents: 500,
  });
  const base = { orderId: 1, userId: 7, baseUrl: "https://example.test" };
  assert.deepEqual(
    buildCheckoutSessionParams({ ...base, lines: [line("print_product")] })
      .shipping_address_collection,
    { allowed_countries: ["CA", "US"] },
  );
  assert.equal(
    buildCheckoutSessionParams({ ...base, lines: [line("pack")] })
      .shipping_address_collection,
    undefined,
  );

  const db = new FakeDb();
  db.orders.push({
    id: 42, user_id: 7, total_cents: 5000, currency: "CAD",
    status: "pending", stripe_session_id: null, notes: null, paid_at: null,
  });
  await applyCheckoutSessionCompleted(db, {
    id: "cs_test_ship",
    payment_status: "paid",
    amount_total: 5000,
    metadata: { userId: "7", orderId: "42", type: "marketing_order" },
    collected_information: {
      shipping_details: {
        name: "Ama Mensah",
        address: { line1: "1 Main St", city: "Toronto", state: "ON", postal_code: "M5V 1A1", country: "CA" },
      },
    },
  } as unknown as Stripe.Checkout.Session);
  assert.equal(db.orders[0]?.status, "paid");
  assert.equal(db.orders[0]?.notes, "Ship to: Ama Mensah, 1 Main St, Toronto, ON, M5V 1A1, CA");
});

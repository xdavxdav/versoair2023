import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { FakeDb } from "../test-support/marketing-fakes";
import {
  buildPlanCheckoutParams,
  buildRecurringPlanCheckoutParams,
  resolvePlanSelection,
} from "./plan-checkout";
import { applyCheckoutSessionCompleted } from "./stripe-webhook";

function select(tier: unknown, cycle?: unknown) {
  const result = resolvePlanSelection(tier, cycle);
  assert.ok(result.ok, "expected a valid selection");
  return result.selection;
}

test("a plan is priced from the CAD table, monthly by default", () => {
  assert.deepEqual(select("essential"), {
    tier: "essential",
    cycle: "monthly",
    name: "Essential",
    amountCents: 4300,
  });
  assert.equal(select("verified", "annual").amountCents, 96000);
  assert.equal(select("max", "monthly").amountCents, 18700);
});

test("enterprise is quote only", () => {
  const result = resolvePlanSelection("enterprise", "annual");
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.code, "PLAN_QUOTE_ONLY");
  assert.match(!result.ok ? result.error : "", /quoted individually/);
});

test("unknown tiers, inherited keys and bad billing cycles are rejected", () => {
  for (const tier of ["free", "gold", "constructor", "__proto__", 5, {}]) {
    const result = resolvePlanSelection(tier, "annual");
    assert.equal(result.ok, false, String(tier));
  }
  for (const cycle of ["weekly", "", null, 12, "Annual"]) {
    const result = resolvePlanSelection("essential", cycle);
    assert.equal(result.ok, false, String(cycle));
    assert.match(!result.ok ? result.error : "", /billingCycle/);
  }
});

test("the Checkout Session charges CAD once, for the quoted amount, and records what was bought", () => {
  const params = buildPlanCheckoutParams({
    userId: 7,
    selection: select("verified", "annual"),
    customerId: "cus_123",
    customerEmail: "customer@example.com",
    baseUrl: "https://www.versoair.com",
  });

  assert.equal(params.mode, "payment");
  assert.equal(params.customer, "cus_123");
  assert.equal(params.customer_email, "customer@example.com");
  assert.equal(params.line_items?.length, 1);
  const item = params.line_items![0];
  assert.equal(item.quantity, 1);
  assert.equal(item.price_data?.currency, "cad");
  assert.equal(item.price_data?.unit_amount, 96000);
  assert.equal(item.price_data?.recurring, undefined);
  assert.match(item.price_data?.product_data?.name ?? "", /Pro Verified \(annual\)/);
  assert.deepEqual(params.metadata, {
    userId: "7",
    targetTier: "verified",
    billingCycle: "annual",
    type: "subscription_fee",
  });
  assert.equal(
    params.success_url,
    "https://www.versoair.com/pricing?status=success&tier=verified",
  );
  assert.equal(
    params.cancel_url,
    "https://www.versoair.com/pricing?status=cancelled",
  );
});

test("a paid plan session grants exactly the bought tier and period through the webhook, once", async () => {
  for (const cycle of ["monthly", "annual"] as const) {
    const db = new FakeDb();
    const selection = select("verified", cycle);
    const params = buildPlanCheckoutParams({
      userId: 7,
      selection,
      customerId: "cus_123",
      customerEmail: "customer@example.com",
      baseUrl: "https://www.versoair.com",
    });
    const session = {
      id: `cs_test_plan_${cycle}`,
      payment_status: "paid",
      amount_total: selection.amountCents,
      metadata: params.metadata as Record<string, string>,
    } as Stripe.Checkout.Session;

    assert.deepEqual(await applyCheckoutSessionCompleted(db, session), {
      status: "processed",
      kind: "subscription",
    });
    assert.equal(db.userTiers.get(7), "verified", cycle);
    assert.equal(db.transactions.length, 1, cycle);
    assert.equal(db.transactions[0].type, "subscription_fee");
    assert.equal(db.transactions[0].currency, "CAD");
    assert.equal(db.transactions[0].reference, session.id);
    assert.equal(
      db.transactions[0].amount,
      (selection.amountCents / 100).toFixed(2),
    );

    const expected = new Date();
    if (cycle === "annual") expected.setFullYear(expected.getFullYear() + 1);
    else expected.setMonth(expected.getMonth() + 1);
    const granted = new Date(db.userExpiries.get(7)!);
    assert.ok(
      Math.abs(granted.getTime() - expected.getTime()) < 5_000,
      `${cycle} expiry ${granted.toISOString()}`,
    );

    // A Stripe redelivery neither extends the plan nor adds a second ledger row.
    assert.deepEqual(await applyCheckoutSessionCompleted(db, session), {
      status: "duplicate",
    });
    assert.equal(db.transactions.length, 1, cycle);
  }
});

test("the recurring Checkout Session is a CAD subscription at the same price, with the plan on the subscription", () => {
  for (const [cycle, interval, cents] of [
    ["monthly", "month", 9600],
    ["annual", "year", 96000],
  ] as const) {
    const input = {
      userId: 7,
      selection: select("verified", cycle),
      customerId: "cus_123",
      customerEmail: "customer@example.com",
      baseUrl: "https://www.versoair.com",
    };
    const params = buildRecurringPlanCheckoutParams(input);

    assert.equal(params.mode, "subscription", cycle);
    assert.equal(params.customer, "cus_123");
    assert.equal(params.customer_email, "customer@example.com");
    assert.equal(params.line_items?.length, 1);
    const item = params.line_items![0];
    assert.equal(item.quantity, 1);
    assert.equal(item.price_data?.currency, "cad");
    assert.equal(item.price_data?.unit_amount, cents, cycle);
    assert.deepEqual(item.price_data?.recurring, { interval }, cycle);
    assert.equal(
      item.price_data?.unit_amount,
      buildPlanCheckoutParams(input).line_items![0].price_data?.unit_amount,
      "recurring and prepaid checkouts charge the same price",
    );

    const metadata = {
      userId: "7",
      targetTier: "verified",
      billingCycle: cycle,
      type: "subscription_fee",
    };
    assert.deepEqual(params.metadata, metadata);
    assert.deepEqual(params.subscription_data?.metadata, metadata);
    assert.equal(
      params.success_url,
      "https://www.versoair.com/pricing?status=success&tier=verified",
    );
    assert.equal(
      params.cancel_url,
      "https://www.versoair.com/pricing?status=cancelled",
    );
  }
});

test("only the recurring Checkout Session can renew; the prepaid one cannot", () => {
  const input = {
    userId: 7,
    selection: select("essential", "annual"),
    customerId: "cus_123",
    customerEmail: "customer@example.com",
    baseUrl: "https://www.versoair.com",
  };
  const prepaid = buildPlanCheckoutParams(input);
  const recurring = buildRecurringPlanCheckoutParams(input);

  assert.equal(prepaid.mode, "payment");
  assert.equal(prepaid.customer_email, "customer@example.com");
  assert.equal(recurring.customer_email, "customer@example.com");
  assert.equal(prepaid.line_items![0].price_data?.recurring, undefined);
  assert.equal(prepaid.subscription_data, undefined);

  // setup_future_usage and payment_intent_data are rejected in subscription mode.
  assert.equal(recurring.payment_intent_data, undefined);
  assert.equal(
    (recurring as { setup_future_usage?: unknown }).setup_future_usage,
    undefined,
  );
  // Every method enabled in the dashboard is offered, and the payer's full
  // name and address are collected.
  assert.equal(recurring.payment_method_types, undefined);
  assert.equal(prepaid.payment_method_types, undefined);
  assert.equal(recurring.billing_address_collection, "required");
  assert.equal(prepaid.billing_address_collection, "required");
});

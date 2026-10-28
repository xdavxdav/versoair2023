import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import type Stripe from "stripe";
import {
  buildCheckoutSessionParams,
  createMarketingCheckoutHandler,
  priceCart,
} from "./marketing-checkout";
import { createStubStripe, FakeDb } from "../test-support/marketing-fakes";

test("marketing cart pricing ignores client prices and uses active CAD catalogue price", async () => {
  const db = new FakeDb();
  db.addPack({ id: 3, name: "Launch pack", price_cents: 2_499 });
  db.addCartItem(7, "pack", 3, 2, 1);

  const pricing = await priceCart(db, 7);

  assert.deepEqual(pricing, {
    ok: true,
    lines: [
      {
        itemType: "pack",
        itemId: 3,
        name: "Launch pack",
        quantity: 2,
        unitCents: 2_499,
        lineCents: 4_998,
      },
    ],
    totalCents: 4_998,
  });
});

test("checkout creates a CAD session using server prices and order idempotency", async () => {
  const db = new FakeDb();
  db.addPack({ id: 3, name: "Launch pack", price_cents: 2_499 });
  db.addCartItem(7, "pack", 3, 2, 1);
  const stripe = createStubStripe();
  let status = 200;
  let body: Record<string, unknown> | undefined;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: Record<string, unknown>) {
      body = value;
      return this;
    },
  } as Response;
  const request = {
    user: { userId: 7 },
    body: { price_cents: 1, total: 0 },
  } as Request;

  await createMarketingCheckoutHandler({
    pool: db,
    getStripe: () => stripe.client,
    getBaseUrl: () => "https://www.versoair.com",
  })(request, response, () => undefined);

  assert.equal(status, 200);
  assert.equal(db.orders[0]?.total_cents, 4_998);
  assert.equal(db.orders[0]?.currency, "CAD");
  assert.equal(stripe.calls.sessionsCreate.length, 1);
  const [call] = stripe.calls.sessionsCreate;
  assert.equal(call.params.line_items[0].price_data.currency, "cad");
  assert.equal(call.params.line_items[0].price_data.unit_amount, 2_499);
  assert.deepEqual(call.options, { idempotencyKey: "marketing-order-1" });
  assert.deepEqual(body, {
    success: true,
    data: {
      sessionId: "cs_test_stub_1",
      url: "https://checkout.stripe.test/c/pay/cs_test_stub_1",
      orderId: 1,
    },
  });

  const params = buildCheckoutSessionParams({
    lines: [
      {
        itemType: "pack",
        itemId: 3,
        name: "Launch pack",
        quantity: 2,
        unitCents: 2_499,
        lineCents: 4_998,
      },
    ],
    orderId: 1,
    userId: 7,
    baseUrl: "https://www.versoair.com",
  });
  assert.equal(params.success_url?.startsWith("https://www.versoair.com/"), true);
});

test("checkout cancels the pending order when Stripe cannot create a session", async () => {
  const db = new FakeDb();
  db.addPack({ id: 3, price_cents: 500 });
  db.addCartItem(7, "pack", 3);
  const stripe = createStubStripe({ failCreate: true });
  let status = 200;
  let body: Record<string, unknown> | undefined;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: Record<string, unknown>) {
      body = value;
      return this;
    },
  } as Response;

  await createMarketingCheckoutHandler({
    pool: db,
    getStripe: () => stripe.client,
    getBaseUrl: () => "https://www.versoair.com",
  })({ user: { userId: 7 } } as Request, response, () => undefined);

  assert.equal(status, 500);
  assert.equal(db.orders[0]?.status, "cancelled");
  assert.deepEqual(body, {
    success: false,
    error: "Checkout could not be started. Please try again.",
    code: "CHECKOUT_FAILED",
  });
});

test("missing Stripe configuration leaves the cart untouched", async () => {
  const db = new FakeDb();
  db.addPack({ id: 3, price_cents: 500 });
  db.addCartItem(7, "pack", 3);
  let status = 200;
  let body: Record<string, unknown> | undefined;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: Record<string, unknown>) {
      body = value;
      return this;
    },
  } as Response;

  await createMarketingCheckoutHandler({
    pool: db,
    getStripe: () => null,
    getBaseUrl: () => "https://www.versoair.com",
  })({ user: { userId: 7 } } as Request, response, () => undefined);

  assert.equal(status, 503);
  assert.equal(db.orders.length, 0);
  assert.deepEqual(body, {
    success: false,
    error: "Stripe not configured",
    code: "STRIPE_NOT_CONFIGURED",
  });
});

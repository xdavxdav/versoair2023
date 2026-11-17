import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import { createStubStripe } from "../../test-support/marketing-fakes";
import { subscriptionCheckoutLimiter } from "../../middleware/rate-limiter";
import { setStripeClientFactory } from "../../utils/stripe-client";
import paymentsRouter from "./payments";

const customer = { id: 7, role: "user" };
const ENV = [
  "ONLINE_PAYMENTS_ENABLED",
  "COMMERCIAL_SUBSCRIPTIONS_ENABLED",
  "PUBLIC_BASE_URL",
] as const;
const saved: Record<string, string | undefined> = {};
let stub: ReturnType<typeof createStubStripe>;

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = "true";
  process.env.PUBLIC_BASE_URL = "https://www.versoair.com";
  stub = createStubStripe();
  setStripeClientFactory(() => stub.client);
  // These tests share one account, so start each with fresh per-user payment limits.
  void subscriptionCheckoutLimiter.resetKey(`pay-subscription-checkout-user-${customer.id}`);
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

function scriptUser(storedCustomerId: string | null = "cus_existing") {
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
      return { rows: [{ stripe_customer_id: storedCustomerId }] };
    }
    return undefined;
  });
}

const checkout = (origin: string, body: unknown, signedIn = true) =>
  call(origin, "POST", "/create-checkout", {
    headers: signedIn ? signIn(customer) : {},
    body,
  });

test("plan checkout is closed unless both payment flags are on", async () => {
  const pool = scriptUser();
  await serve(async (origin) => {
    for (const [online, subscriptions] of [
      ["false", "true"],
      ["true", "false"],
      ["false", "false"],
    ]) {
      process.env.ONLINE_PAYMENTS_ENABLED = online;
      process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = subscriptions;
      const response = await checkout(origin, { targetTier: "essential" });
      assert.equal(response.status, 503, `${online}/${subscriptions}`);
      assert.equal(response.body.code, "ONLINE_PAYMENTS_UNAVAILABLE");
    }
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
  assert.equal(pool.log.length, 0);
});

test("plan checkout reports a missing Stripe key and requires a signed-in user", async () => {
  scriptUser();
  await serve(async (origin) => {
    setStripeClientFactory(() => null);
    assert.equal((await checkout(origin, { targetTier: "essential" })).status, 503);

    setStripeClientFactory(() => stub.client);
    assert.equal(
      (await checkout(origin, { targetTier: "essential" }, false)).status,
      401,
    );
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

test("a plan is charged in CAD from the shared price table", async () => {
  scriptUser();
  await serve(async (origin) => {
    const response = await checkout(origin, {
      targetTier: "verified",
      billingCycle: "annual",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.match(response.body.data.sessionId, /^cs_test_stub_/);
    assert.match(response.body.data.url, /^https:\/\/checkout\.stripe\.test\//);
  });

  assert.equal(stub.calls.sessionsCreate.length, 1);
  const { params } = stub.calls.sessionsCreate[0];
  assert.equal(params.mode, "payment");
  assert.equal(params.customer, "cus_existing");
  assert.equal(params.line_items[0].price_data.currency, "cad");
  assert.equal(params.line_items[0].price_data.unit_amount, 96000);
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
});

test("an omitted billing cycle means monthly; a customer is created through the request's Stripe client", async () => {
  const pool = scriptUser(null);
  await serve(async (origin) => {
    const response = await checkout(origin, { targetTier: "essential" });
    assert.equal(response.status, 200);
  });

  const { params } = stub.calls.sessionsCreate[0];
  assert.equal(params.line_items[0].price_data.unit_amount, 4300);
  assert.equal(params.metadata.billingCycle, "monthly");
  assert.equal(stub.calls.customersCreate.length, 1);
  assert.equal(params.customer, "cus_stub_1");
  const persisted = pool.matching("UPDATE users SET stripe_customer_id");
  assert.equal(persisted.length, 1);
  assert.deepEqual(persisted[0].params, ["cus_stub_1", 7]);
});

test("enterprise, unknown tiers and bad cycles never reach Stripe or the database", async () => {
  const pool = scriptUser();
  await serve(async (origin) => {
    const enterprise = await checkout(origin, { targetTier: "enterprise" });
    assert.equal(enterprise.status, 400);
    assert.equal(enterprise.body.code, "PLAN_QUOTE_ONLY");

    for (const body of [
      { targetTier: "gold" },
      { targetTier: "constructor" },
      { targetTier: "free" },
      { targetTier: "essential", billingCycle: "weekly" },
      { targetTier: "essential", billingCycle: null },
      {},
    ]) {
      const response = await checkout(origin, body);
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.equal(response.body.success, false);
    }
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
  assert.equal(pool.log.length, 0);
});

test("a Stripe failure returns 500 without leaking key material", async () => {
  scriptUser();
  stub = createStubStripe({ failCreate: true });
  setStripeClientFactory(() => stub.client);
  await serve(async (origin) => {
    const response = await checkout(origin, { targetTier: "essential" });
    assert.equal(response.status, 500);
    assert.doesNotMatch(response.text, /sk_test_x{6}/);
    assert.match(response.body.error, /\[redacted\]/);
  });
});

test("price, currency, identity and redirect fields sent by the client are ignored", async () => {
  scriptUser();
  await serve(async (origin) => {
    const response = await checkout(origin, {
      targetTier: "essential",
      billingCycle: "annual",
      amount: 1,
      unit_amount: 1,
      currency: "usd",
      userId: 99,
      mode: "setup",
      metadata: { targetTier: "max", userId: "99" },
      line_items: [{ price: "price_attacker" }],
      success_url: "https://evil.example/ok",
      cancel_url: "https://evil.example/no",
    });
    assert.equal(response.status, 200);
  });

  assert.equal(stub.calls.sessionsCreate.length, 1);
  const { params } = stub.calls.sessionsCreate[0];
  assert.equal(params.mode, "payment");
  assert.equal(params.line_items.length, 1);
  assert.equal(params.line_items[0].price_data.currency, "cad");
  assert.equal(params.line_items[0].price_data.unit_amount, 43000);
  assert.equal(params.line_items[0].price, undefined);
  assert.deepEqual(params.metadata, {
    userId: "7",
    targetTier: "essential",
    billingCycle: "annual",
    type: "subscription_fee",
  });
  assert.match(params.success_url, /^https:\/\/www\.versoair\.com\//);
  assert.match(params.cancel_url, /^https:\/\/www\.versoair\.com\//);
});

test("a signed-in account with no user row gets 404 and no Stripe session", async () => {
  scriptPool((sql) =>
    sql.startsWith("SELECT id, email, username, subscription_tier FROM users")
      ? { rows: [] }
      : undefined,
  );
  await serve(async (origin) => {
    const response = await checkout(origin, { targetTier: "essential" });
    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
  assert.equal(stub.calls.customersCreate.length, 0);
});

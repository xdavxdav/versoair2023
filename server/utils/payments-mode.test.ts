import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentsModeStatus } from "./payments-mode";

const joined = (lines: string[]) => lines.join("\n");

test("with everything off, the status is quiet", () => {
  const status = getPaymentsModeStatus({});

  assert.equal(status.keyMode, "missing");
  assert.deepEqual(status.flags, {
    globalPayments: false,
    marketingCheckout: false,
    commercialSubscriptions: false,
    freeTrials: false,
  });
  assert.deepEqual(status.open, {
    marketingCheckout: false,
    subscriptionCheckout: false,
    freeTrials: false,
  });
  assert.equal(status.webhookSecretConfigured, false);
  assert.deepEqual(status.blockers, []);
  assert.deepEqual(status.warnings, []);
});

test("opening checkout without a key or webhook secret is blocked", () => {
  const status = getPaymentsModeStatus({ MARKETING_CHECKOUT_ENABLED: "true" });

  assert.equal(status.open.marketingCheckout, true);
  assert.equal(status.blockers.length, 2);
  assert.match(joined(status.blockers), /STRIPE_SECRET_KEY is not set/);
  assert.match(joined(status.blockers), /STRIPE_WEBHOOK_SECRET is not set/);
});

test("a key that is not a secret key is blocked", () => {
  for (const key of ["pk_live_abc123", "whsec_abc123", "garbage"]) {
    const status = getPaymentsModeStatus({
      ONLINE_PAYMENTS_ENABLED: "true",
      STRIPE_SECRET_KEY: key,
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    });
    assert.equal(status.keyMode, "unknown", key);
    assert.match(joined(status.blockers), /not a Stripe secret key/, key);
  }
});

test("a test key with checkout open says real cards are declined", () => {
  const status = getPaymentsModeStatus({
    ONLINE_PAYMENTS_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
  });

  assert.deepEqual(status.blockers, []);
  assert.match(joined(status.warnings), /test Stripe key.*declined/);
});

test("a live key with checkout open says cards are charged for real", () => {
  const status = getPaymentsModeStatus({
    MARKETING_CHECKOUT_ENABLED: "true",
    STRIPE_SECRET_KEY: "rk_live_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
  });

  assert.equal(status.keyMode, "live");
  assert.deepEqual(status.blockers, []);
  assert.match(joined(status.warnings), /live Stripe key.*charged for real/);
});

test("a key alone raises nothing while every payment switch is off", () => {
  const status = getPaymentsModeStatus({ STRIPE_SECRET_KEY: "sk_live_abc" });

  assert.equal(status.keyMode, "live");
  assert.deepEqual(status.blockers, []);
  assert.deepEqual(status.warnings, []);
});

test("subscription checkout needs online payments and subscriptions together", () => {
  const both = getPaymentsModeStatus({
    ONLINE_PAYMENTS_ENABLED: "true",
    COMMERCIAL_SUBSCRIPTIONS_ENABLED: "true",
  });
  assert.equal(both.open.subscriptionCheckout, true);
  assert.match(joined(both.warnings), /cannot upload a logo or cover photo/);

  const paymentsOnly = getPaymentsModeStatus({ ONLINE_PAYMENTS_ENABLED: "true" });
  assert.equal(paymentsOnly.open.subscriptionCheckout, false);

  const subscriptionsOnly = getPaymentsModeStatus({
    COMMERCIAL_SUBSCRIPTIONS_ENABLED: "true",
  });
  assert.equal(subscriptionsOnly.open.subscriptionCheckout, false);
});

test("subscriptions without online payments would lock businesses out of uploads", () => {
  const status = getPaymentsModeStatus({
    COMMERCIAL_SUBSCRIPTIONS_ENABLED: "true",
  });

  assert.equal(status.blockers.length, 1);
  assert.match(joined(status.blockers), /lose logo and cover uploads/);
  assert.match(joined(status.blockers), /cannot upgrade/);
});

test("free trials need commercial subscriptions", () => {
  const trialsOnly = getPaymentsModeStatus({ FREE_TRIALS_ENABLED: "true" });
  assert.equal(trialsOnly.open.freeTrials, false);
  assert.match(joined(trialsOnly.warnings), /free trials stay closed/);

  const both = getPaymentsModeStatus({
    FREE_TRIALS_ENABLED: "true",
    COMMERCIAL_SUBSCRIPTIONS_ENABLED: "true",
  });
  assert.equal(both.open.freeTrials, true);
});

test("a non-https public URL is flagged in production only", () => {
  const production = getPaymentsModeStatus({
    NODE_ENV: "production",
    PUBLIC_BASE_URL: "http://shop.example.com",
  });
  assert.match(joined(production.warnings), /not https/);

  const secure = getPaymentsModeStatus({
    NODE_ENV: "production",
    PUBLIC_BASE_URL: "https://shop.example.com",
  });
  assert.doesNotMatch(joined(secure.warnings), /not https/);

  const development = getPaymentsModeStatus({
    PUBLIC_BASE_URL: "http://shop.example.com",
  });
  assert.doesNotMatch(joined(development.warnings), /not https/);
});

test("the status never contains key or webhook-secret material", () => {
  const status = getPaymentsModeStatus({
    ONLINE_PAYMENTS_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_live_SECRETKEYVALUE",
    STRIPE_WEBHOOK_SECRET: "whsec_SECRETWEBHOOKVALUE",
  });

  assert.doesNotMatch(JSON.stringify(status), /SECRET(KEY|WEBHOOK)VALUE/);
  assert.equal(status.webhookSecretConfigured, true);
});

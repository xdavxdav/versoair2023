import assert from "node:assert/strict";
import test from "node:test";
import { TIERS } from "../client/src/lib/tiers";
import {
  PLAN_CURRENCY,
  PLAN_PRICES,
  SELF_SERVE_PLAN_TIERS,
  isBillingCycle,
  isSelfServePlanTier,
  planAmountCents,
} from "./plan-pricing";

// The on-screen FCFA schedule is the reference; the CAD charge must follow it.
const CAD_PER_XOF = 0.0024;

test("plans are charged in CAD", () => {
  assert.equal(PLAN_CURRENCY, "cad");
});

test("every CAD annual price follows its FCFA reference price within 2%", () => {
  for (const tier of SELF_SERVE_PLAN_TIERS) {
    const xof = TIERS[tier].annualPriceXof;
    assert.ok(xof && xof > 0, `${tier} needs an FCFA reference price`);
    const expectedCents = xof * CAD_PER_XOF * 100;
    const actualCents = planAmountCents(tier, "annual");
    assert.ok(
      Math.abs(actualCents - expectedCents) / expectedCents < 0.02,
      `${tier}: ${actualCents} cents vs ${expectedCents.toFixed(0)} from ${xof} XOF`,
    );
  }
});

test("monthly is a tenth of annual and prices are whole cents Stripe accepts", () => {
  for (const tier of SELF_SERVE_PLAN_TIERS) {
    const price = PLAN_PRICES[tier];
    assert.equal(price.monthlyCents * 10, price.annualCents, tier);
    for (const cents of [price.monthlyCents, price.annualCents]) {
      assert.ok(Number.isInteger(cents) && cents >= 50, `${tier}: ${cents}`);
    }
    assert.ok(price.annualCents < price.monthlyCents * 12, tier);
  }
});

test("self-serve tiers escalate in price in tier order", () => {
  const annual = SELF_SERVE_PLAN_TIERS.map((tier) =>
    planAmountCents(tier, "annual"),
  );
  assert.deepEqual(annual, [...annual].sort((a, b) => a - b));
  assert.deepEqual(SELF_SERVE_PLAN_TIERS, ["essential", "verified", "max"]);
});

test("a tier without an FCFA price (quote only) is never self-serve", () => {
  for (const tier of Object.values(TIERS)) {
    if (tier.annualPriceXof === null) {
      assert.equal(isSelfServePlanTier(tier.key), false, tier.key);
    }
  }
  assert.equal(isSelfServePlanTier("free"), false);
});

test("tier and cycle checks reject inherited and non-string keys", () => {
  for (const value of [
    "constructor",
    "__proto__",
    "toString",
    "hasOwnProperty",
    "",
    "ESSENTIAL",
    undefined,
    null,
    7,
    {},
    ["essential"],
  ]) {
    assert.equal(isSelfServePlanTier(value), false, String(value));
  }
  assert.equal(isBillingCycle("annual"), true);
  assert.equal(isBillingCycle("monthly"), true);
  for (const value of ["weekly", "", "ANNUAL", undefined, null, 12]) {
    assert.equal(isBillingCycle(value), false, String(value));
  }
});

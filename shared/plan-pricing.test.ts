import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_PLAN_PRICE_SCHEDULE,
  FCFA_PER_EUR,
  PLAN_CURRENCY,
  PLAN_PRICES,
  SELF_SERVE_PLAN_TIERS,
  deriveEurPlanPrice,
  isBillingCycle,
  isSelfServePlanTier,
  planAmountCents,
  publicTierPricing,
} from "./plan-pricing";

test("plans are charged in CAD", () => {
  assert.equal(PLAN_CURRENCY, "cad");
});

test("the approved CAD and annual FCFA plan schedule is exact", () => {
  assert.deepEqual(BUSINESS_PLAN_PRICE_SCHEDULE, {
    free: {
      name: "Standard",
      cadMonthlyCents: 0,
      cadAnnualCents: 0,
      fcfaAnnual: 0,
    },
    essential: {
      name: "Essentiel",
      cadMonthlyCents: 4_300,
      cadAnnualCents: 43_000,
      fcfaAnnual: 180_000,
    },
    premium: {
      name: "Premium",
      cadMonthlyCents: 6_000,
      cadAnnualCents: 72_000,
      fcfaAnnual: 300_000,
    },
    verified: {
      name: "Pro Vérifié",
      cadMonthlyCents: 9_600,
      cadAnnualCents: 96_000,
      fcfaAnnual: 400_000,
    },
    max: {
      name: "Pro Max",
      cadMonthlyCents: 18_700,
      cadAnnualCents: 187_000,
      fcfaAnnual: 780_000,
    },
    enterprise: { name: "Enterprise", quoteOnly: true },
  });
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

test("Premium and quote-only Enterprise stay outside self-serve checkout", () => {
  assert.equal(isSelfServePlanTier("enterprise"), false);
  assert.equal(isSelfServePlanTier("premium"), false);
  assert.equal(isSelfServePlanTier("free"), false);
});

test("EUR reference values use the fixed FCFA peg and are derived only", () => {
  assert.equal(FCFA_PER_EUR, 655.957);
  assert.deepEqual(
    [180_000, 300_000, 400_000, 780_000].map(deriveEurPlanPrice),
    [
      { monthlyCents: 2_744, annualCents: 27_441 },
      { monthlyCents: 4_573, annualCents: 45_735 },
      { monthlyCents: 6_098, annualCents: 60_980 },
      { monthlyCents: 11_891, annualCents: 118_910 },
    ],
  );
});

test("public pricing separates displayed Premium from self-serve eligibility", () => {
  assert.deepEqual(publicTierPricing("premium"), {
    currency: "cad",
    monthly: 60,
    annual: 720,
  });
  assert.equal(publicTierPricing("enterprise").quoteOnly, true);
  assert.equal(isSelfServePlanTier("premium"), false);
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

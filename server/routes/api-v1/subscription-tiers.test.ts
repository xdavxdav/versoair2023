import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_CURRENCY, PLAN_PRICES } from "@shared/plan-pricing";
import { call, withRouter } from "../../test-support/route-harness";
import subscriptionRouter from "./subscription";

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(subscriptionRouter, fn);

test("the public tier list quotes the CAD prices the checkout charges", async () => {
  await serve(async (origin) => {
    const response = await call(origin, "GET", "/tiers");
    assert.equal(response.status, 200);

    const pricing = new Map<string, unknown>(
      response.body.data.map((tier: any) => [tier.key, tier.pricing]),
    );
    for (const [tier, price] of Object.entries(PLAN_PRICES)) {
      assert.deepEqual(pricing.get(tier), {
        currency: PLAN_CURRENCY,
        monthly: price.monthlyCents / 100,
        annual: price.annualCents / 100,
      });
    }
    assert.deepEqual(pricing.get("free"), {
      currency: PLAN_CURRENCY,
      monthly: 0,
      annual: 0,
    });
    assert.deepEqual(pricing.get("enterprise"), {
      currency: PLAN_CURRENCY,
      monthly: null,
      annual: null,
      quoteOnly: true,
    });
  });
});

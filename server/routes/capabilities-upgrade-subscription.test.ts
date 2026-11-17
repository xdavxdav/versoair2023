import assert from "node:assert/strict";
import test from "node:test";
import { call, signIn, withRouter } from "../test-support/route-harness";
import capabilitiesRouter from "./capabilities";

const customer = { id: 7, role: "user" };

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(capabilitiesRouter, fn);

const upgrade = (origin: string, body: unknown) =>
  call(origin, "POST", "/upgrade-subscription", {
    headers: signIn(customer),
    body,
  });

test("self-serve plans are pointed at plan checkout", async () => {
  await serve(async (origin) => {
    for (const tier of ["essential", "verified", "max"]) {
      const response = await upgrade(origin, { tier, billingCycle: "annual" });
      assert.equal(response.status, 200, tier);
      assert.equal(response.body.targetTier, tier);
      assert.equal(response.body.billingCycle, "annual");
      assert.equal(
        response.body.checkoutEndpoint,
        "/api/v1/payments/create-checkout",
      );
    }
    const monthly = await upgrade(origin, { tier: "essential" });
    assert.equal(monthly.body.billingCycle, "monthly");
  });
});

test("enterprise and unknown tiers are not sent to a checkout that would refuse them", async () => {
  await serve(async (origin) => {
    for (const tier of ["enterprise", "free", "constructor", "gold", 5, null]) {
      const response = await upgrade(origin, { tier });
      assert.equal(response.status, 400, String(tier));
      assert.equal(response.body.success, false);
    }
    const enterprise = await upgrade(origin, { tier: "enterprise" });
    assert.match(enterprise.body.message, /quoted individually/);
  });
});

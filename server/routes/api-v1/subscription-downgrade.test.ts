import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import subscriptionRouter from "./subscription";

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(subscriptionRouter, fn);

const subscriber = { id: 7, role: "user" };

const missingTable = () =>
  Object.assign(new Error('relation "plan_subscriptions" does not exist'), {
    code: "42P01",
  });

type Billing = { tier: string; billing_cycle: string; status: string } | null;

/** A user on `tier`; `billing` is what plan_subscriptions holds, or a thrown error. */
function database(tier: string, billing: Billing | Error) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT id, subscription_tier FROM users")) {
      return { rows: [{ id: subscriber.id, subscription_tier: tier }] };
    }
    if (sql.includes("FROM plan_subscriptions")) {
      if (billing instanceof Error) throw billing;
      return { rows: billing ? [billing] : [] };
    }
    if (sql.startsWith("UPDATE users SET subscription_tier")) {
      return { rows: [], rowCount: 1 } as never;
    }
    return undefined;
  });
}

const downgrade = (origin: string, targetTier: string) =>
  call(origin, "POST", "/downgrade", {
    headers: signIn(subscriber),
    body: { targetTier },
  });

test("downgrading a plan that renews automatically is refused until the subscription is cancelled", async () => {
  for (const status of ["active", "past_due"]) {
    const pool = database("verified", {
      tier: "verified",
      billing_cycle: "monthly",
      status,
    });
    await serve(async (origin) => {
      const response = await downgrade(origin, "essential");
      assert.equal(response.status, 409, status);
      assert.equal(response.body.success, false);
      assert.equal(response.body.code, "SUBSCRIPTION_BILLING_ACTIVE");
      assert.match(response.body.error, /billing settings/i);
    });
    assert.equal(
      pool.matching("UPDATE users").length,
      0,
      `a ${status} subscriber must keep the plan they are paying for`,
    );
  }
});

test("a prepaid plan (no subscription row) still downgrades immediately", async () => {
  const pool = database("verified", null);
  await serve(async (origin) => {
    const response = await downgrade(origin, "essential");
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.newTier, "essential");
  });
  const updates = pool.matching("UPDATE users");
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].params, ["essential", subscriber.id]);
  assert.deepEqual(pool.matching("FROM plan_subscriptions")[0].params, [
    subscriber.id,
  ]);
});

test("a database without the optional subscriptions table behaves as before", async () => {
  const pool = database("verified", missingTable());
  await serve(async (origin) => {
    const response = await downgrade(origin, "free");
    assert.equal(response.status, 200);
    assert.equal(response.body.data.newTier, "free");
  });
  assert.equal(pool.matching("UPDATE users").length, 1);
});

test("any other billing lookup failure stops the downgrade instead of guessing", async () => {
  const pool = database("verified", new Error("connection terminated"));
  await serve(async (origin) => {
    const response = await downgrade(origin, "essential");
    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
  });
  assert.equal(pool.matching("UPDATE users").length, 0);
});

test("an invalid downgrade is rejected before billing is consulted", async () => {
  const pool = database("verified", {
    tier: "verified",
    billing_cycle: "monthly",
    status: "active",
  });
  await serve(async (origin) => {
    const upward = await downgrade(origin, "max");
    assert.equal(upward.status, 400);
    assert.match(upward.body.error, /lower than current tier/i);

    const same = await downgrade(origin, "verified");
    assert.equal(same.status, 400);

    const unknown = await downgrade(origin, "platinum");
    assert.equal(unknown.status, 400);
    assert.match(unknown.body.error, /Invalid tier/);

    const missing = await call(origin, "POST", "/downgrade", {
      headers: signIn(subscriber),
      body: {},
    });
    assert.equal(missing.status, 400);
  });
  assert.equal(pool.matching("FROM plan_subscriptions").length, 0);
  assert.equal(pool.matching("UPDATE users").length, 0);
});

test("the billing lookup only ever sees the signed-in account", async () => {
  const pool = database("verified", null);
  await serve(async (origin) => {
    const response = await call(origin, "POST", "/downgrade", {
      headers: signIn(subscriber),
      body: { targetTier: "essential", userId: 99 },
    });
    assert.equal(response.status, 403);
  });
  assert.equal(pool.matching("FROM plan_subscriptions").length, 0);
  assert.equal(pool.matching("UPDATE users").length, 0);
});

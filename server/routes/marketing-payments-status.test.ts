import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test, { afterEach, beforeEach } from "node:test";
import { call, signIn, withRouter } from "../test-support/route-harness";

const router = (await import("./marketing")).default;

const OWNER = "owner@example.com";
const WATCHED = [
  "SUPERADMIN_EMAIL",
  "ONLINE_PAYMENTS_ENABLED",
  "MARKETING_CHECKOUT_ENABLED",
  "COMMERCIAL_SUBSCRIPTIONS_ENABLED",
  "FREE_TRIALS_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const name of WATCHED) saved.set(name, process.env[name]);
  process.env.SUPERADMIN_EMAIL = OWNER;
});

afterEach(() => {
  for (const name of WATCHED) {
    const value = saved.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn, { path: "/api/marketing" });

function ownerHeaders(): Record<string, string> {
  signIn({ id: 1, role: "superuser", email: OWNER });
  const token = jwt.sign(
    {
      userId: 1,
      email: OWNER,
      role: "superuser",
      ownerMfa: true,
      geoAdminCodeAuthenticated: true,
    },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

const STATUS_PATH = "/api/marketing/admin/payments-status";

test("the owner sees what is switched on, what is broken, and nothing secret", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "false";
  process.env.MARKETING_CHECKOUT_ENABLED = "true";
  process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = "false";
  process.env.STRIPE_SECRET_KEY = "sk_test_SECRETKEYVALUE123";
  process.env.STRIPE_WEBHOOK_SECRET = "";
  const headers = ownerHeaders();

  await serve(async (origin) => {
    const response = await call(origin, "GET", STATUS_PATH, { headers });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.keyMode, "test");
    assert.equal(response.body.data.open.marketingCheckout, true);
    assert.equal(response.body.data.open.subscriptionCheckout, false);
    assert.equal(response.body.data.webhookSecretConfigured, false);
    assert.match(response.body.data.blockers.join(" "), /STRIPE_WEBHOOK_SECRET/);
    assert.equal(response.body.keyMode, "test", "top-level fields are kept");
    assert.doesNotMatch(response.text, /SECRETKEYVALUE/);
  });
});

test("the status response is never cached", async () => {
  const headers = ownerHeaders();

  await serve(async (origin) => {
    const response = await fetch(`${origin}${STATUS_PATH}`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("only the owner can read the payments status", async () => {
  await serve(async (origin) => {
    assert.equal((await call(origin, "GET", STATUS_PATH)).status, 401);

    const admin = signIn({ id: 2, role: "admin", email: "admin@example.com" });
    assert.equal(
      (await call(origin, "GET", STATUS_PATH, { headers: admin })).status,
      403,
    );
  });
});

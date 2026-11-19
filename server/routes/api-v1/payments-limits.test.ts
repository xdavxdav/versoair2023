import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { call, signIn, withRouter } from "../../test-support/route-harness";
import { setStripeClientFactory } from "../../utils/stripe-client";

const router = (await import("./payments")).default;

afterEach(() => setStripeClientFactory(null));

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn);

const post = (origin: string, path: string, headers: Record<string, string>) =>
  call(origin, "POST", path, { headers, body: {} });

// With no Stripe key and the payment gates closed these routes answer 503
// before any database or Stripe work, so only the limiter changes the outcome.
async function exhaust(
  origin: string,
  path: string,
  headers: Record<string, string>,
  attempts: number,
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await post(origin, path, headers);
    assert.notEqual(response.status, 429, `${path} attempt ${attempt} is allowed`);
  }
}

test("subscription checkout is limited per user", async () => {
  await serve(async (origin) => {
    const headers = signIn({ id: 801, role: "user" });
    await exhaust(origin, "/create-checkout", headers, 10);

    const blocked = await post(origin, "/create-checkout", headers);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, "PAYMENT_RATE_LIMITED");

    const other = signIn({ id: 802, role: "user" });
    assert.notEqual((await post(origin, "/create-checkout", other)).status, 429);
  });
});

test("offer checkout is limited per user, separately from plan checkout", async () => {
  await serve(async (origin) => {
    const headers = signIn({ id: 831, role: "user" });
    await exhaust(origin, "/create-offer-checkout", headers, 10);

    const blocked = await post(origin, "/create-offer-checkout", headers);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, "PAYMENT_RATE_LIMITED");

    assert.notEqual((await post(origin, "/create-checkout", headers)).status, 429);
  });
});

test("billing portal sessions are limited per user", async () => {
  await serve(async (origin) => {
    const headers = signIn({ id: 811, role: "user" });
    await exhaust(origin, "/create-portal", headers, 10);

    assert.equal((await post(origin, "/create-portal", headers)).status, 429);
  });
});

test("adding a card shares one allowance across both card-setup routes", async () => {
  await serve(async (origin) => {
    const headers = signIn({ id: 821, role: "user" });
    await exhaust(origin, "/add-card-session", headers, 5);
    await exhaust(origin, "/setup-intent", headers, 5);

    assert.equal((await post(origin, "/setup-intent", headers)).status, 429);
    assert.equal((await post(origin, "/add-card-session", headers)).status, 429);
  });
});

test("an unauthenticated setup-intent is refused by auth, not counted", async () => {
  await serve(async (origin) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await call(origin, "POST", "/setup-intent", { body: {} });
      assert.equal(response.status, 401);
    }
  });
});

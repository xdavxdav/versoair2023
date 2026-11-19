import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import { createStubStripe } from "../../test-support/marketing-fakes";
import { offerCheckoutLimiter } from "../../middleware/rate-limiter";
import { setStripeClientFactory } from "../../utils/stripe-client";
import paymentsRouter from "./payments";

const customer = { id: 7, role: "user" };
const ENV = ["ONLINE_PAYMENTS_ENABLED", "PUBLIC_BASE_URL"] as const;
const saved: Record<string, string | undefined> = {};
let stub: ReturnType<typeof createStubStripe>;

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  process.env.PUBLIC_BASE_URL = "https://www.versoair.com";
  stub = createStubStripe();
  setStripeClientFactory(() => stub.client);
  void offerCheckoutLimiter.resetKey(`pay-offer-checkout-user-${customer.id}`);
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  setStripeClientFactory(null);
});

interface World {
  purchased?: boolean;
  going?: boolean;
  eventExists?: boolean;
  ended?: boolean;
  active?: boolean;
  amountCents?: number;
}

function scriptWorld(world: World = {}) {
  const state = { eventExists: true, ended: false, active: true, ...world };
  return scriptPool((sql, params) => {
    if (sql.startsWith("SELECT key, name, description, amount_cents, active FROM paid_offers WHERE key")) {
      const key = String(params[0]);
      return {
        rows: [
          {
            key,
            name: key === "community_join" ? "Community membership" : "Activity ticket",
            description: "A test offer",
            amount_cents: state.amountCents ?? 750,
            active: state.active,
          },
        ],
      };
    }
    if (sql.startsWith("SELECT 1 FROM paid_offer_purchases")) {
      return { rows: state.purchased ? [{}] : [] };
    }
    if (sql.startsWith("SELECT id, (COALESCE(ends_at, starts_at) < NOW()) AS ended FROM events")) {
      return {
        rows: state.eventExists ? [{ id: params[0], ended: state.ended }] : [],
      };
    }
    if (sql.startsWith("SELECT 1 FROM event_attendees")) {
      return { rows: state.going ? [{}] : [] };
    }
    if (sql === "SELECT id, email, username FROM users WHERE id = $1") {
      return { rows: [{ id: 7, email: "luq@example.com", username: "luq" }] };
    }
    if (sql === "SELECT stripe_customer_id FROM users WHERE id = $1") {
      return { rows: [{ stripe_customer_id: "cus_existing" }] };
    }
    return undefined;
  });
}

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(paymentsRouter, fn);

const buy = (origin: string, body: unknown, signedIn = true) =>
  call(origin, "POST", "/create-offer-checkout", {
    headers: signedIn ? signIn(customer) : {},
    body,
  });

test("offer checkout is closed while online payments are off", async () => {
  scriptWorld();
  process.env.ONLINE_PAYMENTS_ENABLED = "false";
  await serve(async (origin) => {
    const response = await buy(origin, { offerKey: "community_join" });
    assert.equal(response.status, 503);
    assert.equal(response.body.code, "ONLINE_PAYMENTS_UNAVAILABLE");
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

test("offer checkout needs a Stripe key and a signed-in user", async () => {
  scriptWorld();
  await serve(async (origin) => {
    setStripeClientFactory(() => null);
    assert.equal((await buy(origin, { offerKey: "community_join" })).status, 503);

    setStripeClientFactory(() => stub.client);
    assert.equal(
      (await buy(origin, { offerKey: "community_join" }, false)).status,
      401,
    );
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

test("a membership is charged in CAD from the stored price, whatever the client sends", async () => {
  scriptWorld({ amountCents: 750 });
  await serve(async (origin) => {
    const response = await buy(origin, {
      offerKey: "community_join",
      amount: 1,
      amountCents: 1,
      userId: 99,
    });
    assert.equal(response.status, 200);
    assert.match(response.body.data.url, /^https:\/\/checkout\.stripe\.test\//);
  });

  assert.equal(stub.calls.sessionsCreate.length, 1);
  const { params } = stub.calls.sessionsCreate[0];
  assert.equal(params.mode, "payment");
  assert.equal(params.customer, "cus_existing");
  assert.equal(params.line_items[0].price_data.currency, "cad");
  assert.equal(params.line_items[0].price_data.unit_amount, 750);
  assert.deepEqual(params.metadata, {
    userId: "7",
    type: "paid_offer",
    offerKey: "community_join",
  });
  assert.equal(params.success_url, "https://www.versoair.com/community?status=success");
  assert.equal(params.cancel_url, "https://www.versoair.com/community?status=cancelled");
});

test("a member cannot buy the membership again", async () => {
  scriptWorld({ purchased: true });
  await serve(async (origin) => {
    const response = await buy(origin, { offerKey: "community_join" });
    assert.equal(response.status, 409);
    assert.equal(response.body.code, "ALREADY_PURCHASED");
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

test("unknown, malformed and switched-off offers never reach Stripe", async () => {
  scriptWorld();
  await serve(async (origin) => {
    for (const body of [{}, { offerKey: "free_money" }, { offerKey: 5 }]) {
      assert.equal((await buy(origin, body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await buy(origin, { offerKey: "activity_ticket" })).status, 400);
  });
  scriptWorld({ active: false });
  await serve(async (origin) => {
    const response = await buy(origin, { offerKey: "community_join" });
    assert.equal(response.status, 400);
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

test("a ticket checkout carries the event and returns to it", async () => {
  scriptWorld({ amountCents: 1000 });
  await serve(async (origin) => {
    const response = await buy(origin, { offerKey: "activity_ticket", eventId: 9 });
    assert.equal(response.status, 200);
  });

  const { params } = stub.calls.sessionsCreate[0];
  assert.equal(params.line_items[0].price_data.unit_amount, 1000);
  assert.deepEqual(params.metadata, {
    userId: "7",
    type: "paid_offer",
    offerKey: "activity_ticket",
    eventId: "9",
  });
  assert.equal(params.success_url, "https://www.versoair.com/events/9?status=success");
  assert.equal(params.cancel_url, "https://www.versoair.com/events/9?status=cancelled");
});

test("tickets are only sold for published events that have not ended", async () => {
  await serve(async (origin) => {
    scriptWorld({ eventExists: false });
    const missing = await buy(origin, { offerKey: "activity_ticket", eventId: 9 });
    assert.equal(missing.status, 404);

    scriptWorld({ ended: true });
    const ended = await buy(origin, { offerKey: "activity_ticket", eventId: 9 });
    assert.equal(ended.status, 409);
    assert.equal(ended.body.code, "EVENT_ENDED");
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

test("a ticket is not sold twice, nor to someone already registered", async () => {
  await serve(async (origin) => {
    scriptWorld({ purchased: true });
    const paid = await buy(origin, { offerKey: "activity_ticket", eventId: 9 });
    assert.equal(paid.status, 409);
    assert.equal(paid.body.code, "ALREADY_PURCHASED");

    scriptWorld({ going: true });
    const going = await buy(origin, { offerKey: "activity_ticket", eventId: 9 });
    assert.equal(going.status, 409);
    assert.equal(going.body.code, "ALREADY_ATTENDING");
  });
  assert.equal(stub.calls.sessionsCreate.length, 0);
});

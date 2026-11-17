import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import { setStripeClientFactory } from "../../utils/stripe-client";

const router = (await import("./payments")).default;

const OWNER = "owner@example.com";
const CHARGE_ID = "6f1c1a4e-3d0b-4c52-9d6e-0a1b2c3d4e5f";
const CARD = {
  id: 5,
  user_id: 9,
  stripe_customer_id: "cus_1",
  stripe_payment_method_id: "pm_1",
  card_brand: "visa",
  card_last4: "4242",
  username: "member",
  status: "active",
};

const saved = {
  superadmin: process.env.SUPERADMIN_EMAIL,
  payments: process.env.ONLINE_PAYMENTS_ENABLED,
};

beforeEach(() => {
  process.env.SUPERADMIN_EMAIL = OWNER;
  process.env.ONLINE_PAYMENTS_ENABLED = "false";
});

afterEach(() => {
  setStripeClientFactory(null);
  process.env.SUPERADMIN_EMAIL = saved.superadmin;
  process.env.ONLINE_PAYMENTS_ENABLED = saved.payments;
});

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

type Row = Record<string, any>;

function stubStripe(
  options: { createError?: Row; refundError?: Row } = {},
) {
  const calls = { intents: [] as Row[], refunds: [] as Row[] };
  setStripeClientFactory(
    () =>
      ({
        paymentIntents: {
          create: async (params: Row, opts?: Row) => {
            calls.intents.push({ params, opts });
            if (options.createError) throw options.createError;
            return { id: "pi_123", status: "succeeded" };
          },
        },
        refunds: {
          create: async (params: Row, opts?: Row) => {
            calls.refunds.push({ params, opts });
            if (options.refundError) throw options.refundError;
            return { id: "re_123", status: "succeeded" };
          },
        },
      }) as never,
  );
  return calls;
}

function chargeDb(options: { failLedger?: boolean; charge?: Row | null } = {}) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT spm.*")) return { rows: [CARD] };
    if (sql.startsWith("INSERT INTO ngo_charges")) {
      if (options.failLedger) throw new Error("db down");
      return { rows: [{ id: CHARGE_ID, amount: "19.99" }] };
    }
    if (sql.startsWith("SELECT * FROM ngo_charges WHERE id")) {
      const charge =
        options.charge === undefined
          ? {
              id: CHARGE_ID,
              status: "succeeded",
              stripe_payment_intent_id: "pi_123",
              amount: "19.99",
              currency: "USD",
            }
          : options.charge;
      return { rows: charge ? [charge] : [] };
    }
    return undefined;
  });
}

const changes = (db: ReturnType<typeof chargeDb>) =>
  db.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

test("charging is refused while online payments are off", async () => {
  const calls = stubStripe();
  const db = chargeDb();
  const headers = ownerHeaders();

  await withRouter(router, async (origin) => {
    const response = await call(origin, "POST", "/charge", {
      headers,
      body: { cardId: 5, amount: "10" },
    });
    assert.equal(response.status, 503);
    assert.equal(response.body.code, "ONLINE_PAYMENTS_UNAVAILABLE");
  });

  assert.equal(calls.intents.length, 0);
  assert.equal(db.log.length, 0);
});

test("charge and refund require the signed-in owner", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  const calls = stubStripe();
  const db = chargeDb();

  await withRouter(router, async (origin) => {
    for (const path of ["/charge", "/refund"]) {
      const anonymous = await call(origin, "POST", path, {
        body: { cardId: 5, amount: "10", chargeId: CHARGE_ID },
      });
      assert.equal(anonymous.status, 401, `${path} anonymous`);

      const admin = signIn({ id: 2, role: "admin", email: "admin@example.com" });
      const forbidden = await call(origin, "POST", path, {
        headers: admin,
        body: { cardId: 5, amount: "10", chargeId: CHARGE_ID },
      });
      assert.ok([401, 403].includes(forbidden.status), `${path} admin`);
    }
  });

  assert.equal(calls.intents.length + calls.refunds.length, 0);
  assert.equal(db.log.length, 0);
});

test("the owner can charge a saved card; amounts reach Stripe in minor units", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  const calls = stubStripe();
  const db = chargeDb();
  const headers = ownerHeaders();

  await withRouter(router, async (origin) => {
    const usd = await call(origin, "POST", "/charge", {
      headers,
      body: {
        cardId: 5,
        amount: "19.99",
        currency: "usd",
        idempotencyKey: "attempt-0001",
        processedBy: 999,
      },
    });
    assert.equal(usd.status, 200, usd.text);
    assert.deepEqual(usd.body.data.paymentIntent, {
      id: "pi_123",
      status: "succeeded",
      amount: 19.99,
      currency: "USD",
    });
    assert.equal(usd.body.data.replayed, false);
    assert.equal(usd.body.data.charge.id, CHARGE_ID);

    const xof = await call(origin, "POST", "/charge", {
      headers,
      body: { cardId: 5, amount: 5000, currency: "XOF" },
    });
    assert.equal(xof.status, 200, xof.text);
    assert.equal(xof.body.data.paymentIntent.amount, 5000);
    assert.equal(xof.body.data.paymentIntent.currency, "XOF");
  });

  assert.equal(calls.intents[0].params.amount, 1999);
  assert.equal(calls.intents[0].params.currency, "usd");
  assert.deepEqual(calls.intents[0].opts, {
    idempotencyKey: "ngo-charge-attempt-0001",
  });
  assert.equal(
    calls.intents[0].params.metadata.processedBy,
    "1",
    "the signed-in owner is recorded; a body-supplied processedBy is ignored",
  );
  assert.equal(calls.intents[1].params.amount, 5000, "XOF is never scaled by 100");
  assert.equal(changes(db).length >= 4, true);
});

test("invalid charge input is a 400 and never reaches Stripe or the database", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  const calls = stubStripe();
  const db = chargeDb();
  const headers = ownerHeaders();

  await withRouter(router, async (origin) => {
    for (const body of [
      {},
      { cardId: 5 },
      { cardId: 5, amount: "12abc" },
      { cardId: 5, amount: "-1" },
      { cardId: 5, amount: "10", currency: ["USD"] },
      { cardId: 5, amount: "10", currency: "JPY" },
      { cardId: 5, amount: "10.5", currency: "XOF" },
      { cardId: "x", amount: "10" },
    ]) {
      const response = await call(origin, "POST", "/charge", { headers, body });
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.equal(response.body.success, false);
      assert.equal(typeof response.body.error, "string");
    }
    const noBody = await fetch(`${origin}/charge`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(noBody.status, 400);
  });

  assert.equal(calls.intents.length, 0);
  assert.equal(db.log.length, 0);
});

test("charge failures keep their HTTP shape without leaking internal fields", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  const headers = ownerHeaders();

  stubStripe({
    createError: {
      type: "StripeCardError",
      code: "card_declined",
      message: "Your card was declined.",
    },
  });
  chargeDb();
  await withRouter(router, async (origin) => {
    const declined = await call(origin, "POST", "/charge", {
      headers,
      body: { cardId: 5, amount: "10" },
    });
    assert.equal(declined.status, 402);
    assert.deepEqual(declined.body, {
      success: false,
      error: "Card declined: Your card was declined.",
      code: "card_declined",
    });
  });

  stubStripe();
  const failing = chargeDb({ failLedger: true });
  await withRouter(router, async (origin) => {
    const unrecorded = await call(origin, "POST", "/charge", {
      headers: ownerHeaders(),
      body: { cardId: 5, amount: "10" },
    });
    assert.equal(unrecorded.status, 500);
    assert.equal(unrecorded.body.success, false);
    assert.equal(unrecorded.body.code, "CHARGE_NOT_RECORDED");
    assert.equal(unrecorded.body.paymentIntentId, "pi_123");
    assert.equal("ok" in unrecorded.body, false);
    assert.equal("status" in unrecorded.body, false);
  });
  assert.ok(failing.log.some((entry) => entry.sql === "ROLLBACK"));
});

test("charging reports a missing Stripe key instead of failing", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  setStripeClientFactory(() => null);
  const db = chargeDb();
  const headers = ownerHeaders();

  await withRouter(router, async (origin) => {
    const response = await call(origin, "POST", "/charge", {
      headers,
      body: { cardId: 5, amount: "10" },
    });
    assert.equal(response.status, 503);
    assert.match(response.body.error, /not configured/);
  });
  assert.equal(db.log.length, 0);
});

test("refunds work even while online payments are switched off", async () => {
  const calls = stubStripe();
  const db = chargeDb();
  const headers = ownerHeaders();

  await withRouter(router, async (origin) => {
    const response = await call(origin, "POST", "/refund", {
      headers,
      body: { chargeId: CHARGE_ID, reason: "duplicate" },
    });
    assert.equal(response.status, 200, response.text);
    assert.deepEqual(response.body, {
      success: true,
      data: { refundId: "re_123", status: "succeeded", amount: 19.99 },
    });
  });

  assert.deepEqual(calls.refunds[0].params, {
    payment_intent: "pi_123",
    reason: "duplicate",
  });
  assert.deepEqual(calls.refunds[0].opts, {
    idempotencyKey: `ngo-refund-${CHARGE_ID}`,
  });
  assert.equal(
    changes(db).filter((entry) => entry.sql.startsWith("UPDATE")).length,
    2,
  );
});

test("refund validation and reconciliation errors map to HTTP statuses", async () => {
  const headers = ownerHeaders();

  stubStripe();
  chargeDb();
  await withRouter(router, async (origin) => {
    const cases: [Row, number, string?][] = [
      [{}, 400],
      [{ chargeId: "12" }, 400],
      [{ chargeId: CHARGE_ID, reason: "because" }, 400, "INVALID_REFUND_REASON"],
    ];
    for (const [body, status, code] of cases) {
      const response = await call(origin, "POST", "/refund", { headers, body });
      assert.equal(response.status, status, JSON.stringify(body));
      if (code) assert.equal(response.body.code, code);
    }
  });

  stubStripe();
  chargeDb({ charge: null });
  await withRouter(router, async (origin) => {
    const missing = await call(origin, "POST", "/refund", {
      headers: ownerHeaders(),
      body: { chargeId: CHARGE_ID },
    });
    assert.equal(missing.status, 404);
  });

  stubStripe({
    refundError: {
      type: "StripeInvalidRequestError",
      code: "charge_already_refunded",
      message: "already refunded",
    },
  });
  chargeDb();
  await withRouter(router, async (origin) => {
    const already = await call(origin, "POST", "/refund", {
      headers: ownerHeaders(),
      body: { chargeId: CHARGE_ID },
    });
    assert.equal(already.status, 400);
    assert.equal(already.body.code, "ALREADY_REFUNDED");
  });
});

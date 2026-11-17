import assert from "node:assert/strict";
import test from "node:test";

import {
  chargeSavedCard,
  refundNgoCharge,
  type NgoChargeDeps,
} from "./ngo-charges";
import type { PaymentAlert } from "./payment-alerts";

type Row = Record<string, any>;
type Handler = (sql: string, params: any[]) => { rows: Row[] } | void;

function fakeDb(handler: Handler) {
  const log: { sql: string; params: any[] }[] = [];
  let released = 0;
  const run = async (sql: string, params: any[] = []) => {
    const normalized = sql.replace(/\s+/g, " ").trim();
    log.push({ sql: normalized, params });
    return (handler(normalized, params) as { rows: Row[] } | undefined) ?? {
      rows: [],
    };
  };
  return {
    log,
    get released() {
      return released;
    },
    query: run,
    connect: async () => ({
      query: run,
      release() {
        released += 1;
      },
    }),
    statements: () => log.map((entry) => entry.sql.split(" ").slice(0, 3).join(" ")),
  };
}

const CARD = {
  id: 5,
  user_id: 9,
  stripe_customer_id: "cus_1",
  stripe_payment_method_id: "pm_1",
  card_brand: "visa",
  card_last4: "4242",
  username: "member",
  email: "member@example.com",
  status: "active",
};

function stubStripe(options: {
  createError?: unknown;
  refundError?: unknown;
  intent?: Row;
  refund?: Row;
} = {}) {
  const calls = {
    intents: [] as { params: Row; options: Row | undefined }[],
    refunds: [] as { params: Row; options: Row | undefined }[],
  };
  const stripe = {
    paymentIntents: {
      create: async (params: Row, opts?: Row) => {
        calls.intents.push({ params, options: opts });
        if (options.createError) throw options.createError;
        return { id: "pi_123", status: "succeeded", ...options.intent };
      },
    },
    refunds: {
      create: async (params: Row, opts?: Row) => {
        calls.refunds.push({ params, options: opts });
        if (options.refundError) throw options.refundError;
        return { id: "re_123", status: "succeeded", ...options.refund };
      },
    },
  } as unknown as NgoChargeDeps["stripe"];
  return { stripe, calls };
}

function setup(
  handler: Handler,
  stripeOptions: Parameters<typeof stubStripe>[0] = {},
) {
  const db = fakeDb(handler);
  const { stripe, calls } = stubStripe(stripeOptions);
  const alerts: PaymentAlert[] = [];
  const deps: NgoChargeDeps = {
    db,
    stripe,
    alert: async (alert) => {
      alerts.push(alert);
    },
  };
  return { db, calls, alerts, deps };
}

function cardLookup(sql: string): { rows: Row[] } | void {
  if (sql.startsWith("SELECT spm.*")) return { rows: [CARD] };
}

function recordingHandler(sql: string): { rows: Row[] } | void {
  const card = cardLookup(sql);
  if (card) return card;
  if (sql.startsWith("INSERT INTO ngo_charges")) {
    return { rows: [{ id: "6f1c1a4e-3d0b-4c52-9d6e-0a1b2c3d4e5f" }] };
  }
}

const BASE = { cardId: 5, amount: "19.99", actorUserId: 1 } as const;

test("charges a saved card in minor units and records it in one transaction", async () => {
  const { db, calls, deps } = setup(recordingHandler);

  const result = await chargeSavedCard(deps, {
    ...BASE,
    currency: "usd",
    description: "Workshop",
    category: "activity_fee",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.replayed, false);
  assert.deepEqual(result.paymentIntent, {
    id: "pi_123",
    status: "succeeded",
    amount: 19.99,
    currency: "USD",
  });

  assert.equal(calls.intents.length, 1);
  const { params, options } = calls.intents[0];
  assert.equal(params.amount, 1999);
  assert.equal(params.currency, "usd");
  assert.equal(params.customer, "cus_1");
  assert.equal(params.payment_method, "pm_1");
  assert.equal(params.off_session, true);
  assert.equal(params.confirm, true);
  assert.deepEqual(params.metadata, {
    source: "ngo_pos",
    cardId: "5",
    userId: "9",
    category: "activity_fee",
    processedBy: "1",
  });
  assert.equal(options, undefined, "no key, no idempotency header");

  assert.deepEqual(db.statements(), [
    "SELECT spm.*, u.email,",
    "BEGIN",
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    "SELECT * FROM",
    "INSERT INTO ngo_charges",
    "INSERT INTO transactions",
    "COMMIT",
  ]);
  const insert = db.log.find((e) => e.sql.startsWith("INSERT INTO ngo_charges"));
  assert.deepEqual(insert?.params, [
    5,
    9,
    "19.99",
    "USD",
    "Workshop",
    "activity_fee",
    "pi_123",
    "succeeded",
    1,
    null,
  ]);
  assert.equal(db.released, 1);
});

test("an XOF charge is sent whole, never multiplied by 100", async () => {
  const { db, calls, deps } = setup(recordingHandler);

  const result = await chargeSavedCard(deps, {
    ...BASE,
    amount: "5000",
    currency: "XOF",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.intents[0].params.amount, 5000);
  assert.equal(calls.intents[0].params.currency, "xof");
  const insert = db.log.find((e) => e.sql.startsWith("INSERT INTO ngo_charges"));
  assert.equal(insert?.params[2], "5000.00");
  assert.equal(insert?.params[3], "XOF");
});

test("currency defaults to USD when omitted", async () => {
  const { calls, deps } = setup(recordingHandler);
  const result = await chargeSavedCard(deps, BASE);
  assert.equal(result.ok, true);
  assert.equal(calls.intents[0].params.currency, "usd");
});

test("a non-succeeded PaymentIntent is recorded as pending", async () => {
  const { db, deps } = setup(recordingHandler, {
    intent: { status: "processing" },
  });
  const result = await chargeSavedCard(deps, BASE);
  assert.equal(result.ok, true);
  const charge = db.log.find((e) => e.sql.startsWith("INSERT INTO ngo_charges"));
  assert.equal(charge?.params[7], "pending");
  const txn = db.log.find((e) => e.sql.startsWith("INSERT INTO transactions"));
  assert.equal(txn?.params[2], "pending");
});

test("a client idempotency key is forwarded to Stripe with a stable prefix", async () => {
  const { calls, deps } = setup(recordingHandler);
  await chargeSavedCard(deps, { ...BASE, idempotencyKey: "abc12345-xyz" });
  assert.deepEqual(calls.intents[0].options, {
    idempotencyKey: "ngo-charge-abc12345-xyz",
  });
});

test("invalid input is rejected before Stripe or the database is touched", async () => {
  const cases: [Partial<Parameters<typeof chargeSavedCard>[1]>, RegExp, string?][] = [
    [{ cardId: undefined }, /required/],
    [{ amount: undefined }, /required/],
    [{ amount: 0 }, /required/],
    [{ cardId: "abc" }, /Invalid cardId/],
    [{ cardId: 1.5 }, /Invalid cardId/],
    [{ cardId: 2 ** 40 }, /Invalid cardId/],
    [{ amount: "12abc" }, /Invalid amount/, "INVALID_AMOUNT"],
    [{ amount: "-5" }, /Invalid amount/, "INVALID_AMOUNT"],
    [{ amount: "1e3" }, /Invalid amount/, "INVALID_AMOUNT"],
    [{ amount: "Infinity" }, /Invalid amount/, "INVALID_AMOUNT"],
    [{ amount: "1.999" }, /2 decimal/, "INVALID_AMOUNT"],
    [{ amount: "1000000" }, /maximum/, "INVALID_AMOUNT"],
    [{ currency: "JPY" }, /Unsupported currency/, "INVALID_CURRENCY"],
    [{ currency: 840 }, /Unsupported currency/, "INVALID_CURRENCY"],
    [{ currency: "XOF", amount: "10.5" }, /whole numbers/, "INVALID_AMOUNT"],
    [{ description: "x".repeat(501) }, /description/],
    [{ description: { toString: () => "x" } }, /description/],
    [{ category: "x".repeat(51) }, /category/],
    [{ idempotencyKey: "short" }, /idempotencyKey/, "INVALID_IDEMPOTENCY_KEY"],
    [{ idempotencyKey: "has spaces in it" }, /idempotencyKey/, "INVALID_IDEMPOTENCY_KEY"],
    [{ idempotencyKey: 12345678 }, /idempotencyKey/, "INVALID_IDEMPOTENCY_KEY"],
  ];

  for (const [override, message, code] of cases) {
    const { db, calls, deps } = setup(recordingHandler);
    const result = await chargeSavedCard(deps, { ...BASE, ...override });
    assert.equal(result.ok, false, JSON.stringify(override));
    if (result.ok) continue;
    assert.equal(result.status, 400, JSON.stringify(override));
    assert.match(result.error, message, JSON.stringify(override));
    if (code) assert.equal(result.code, code, JSON.stringify(override));
    assert.equal(calls.intents.length, 0, JSON.stringify(override));
    assert.equal(db.log.length, 0, JSON.stringify(override));
  }
});

test("an unknown or inactive card is a 404 and Stripe is not called", async () => {
  const { db, calls, deps } = setup(() => ({ rows: [] }));
  const result = await chargeSavedCard(deps, BASE);
  assert.deepEqual(result, {
    ok: false,
    status: 404,
    error: "Active card not found",
  });
  assert.equal(calls.intents.length, 0);
  assert.equal(db.log.length, 1);
  assert.match(db.log[0].sql, /status = 'active'/);
});

test("a replayed PaymentIntent returns the recorded charge and writes nothing new", async () => {
  const stored = { id: "6f1c1a4e-3d0b-4c52-9d6e-0a1b2c3d4e5f", amount: "19.99" };
  const { db, deps } = setup((sql) => {
    const card = cardLookup(sql);
    if (card) return card;
    if (sql.startsWith("SELECT * FROM ngo_charges")) return { rows: [stored] };
  });

  const result = await chargeSavedCard(deps, {
    ...BASE,
    idempotencyKey: "abc12345-xyz",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.replayed, true);
  assert.equal(result.charge, stored);
  assert.deepEqual(db.statements(), [
    "SELECT spm.*, u.email,",
    "BEGIN",
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    "SELECT * FROM",
    "COMMIT",
  ]);
});

test("a ledger failure after Stripe succeeded rolls back, alerts, and names the PaymentIntent", async () => {
  const { db, alerts, deps } = setup((sql) => {
    const card = cardLookup(sql);
    if (card) return card;
    if (sql.startsWith("INSERT INTO transactions")) {
      throw new Error("connection to sk_live_abcdef1234567890 reset");
    }
    if (sql.startsWith("INSERT INTO ngo_charges")) return { rows: [{ id: "x" }] };
  });

  const result = await chargeSavedCard(deps, BASE);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 500);
  assert.equal(result.code, "CHARGE_NOT_RECORDED");
  assert.equal(result.paymentIntentId, "pi_123");
  assert.match(result.error, /Reconcile it using the PaymentIntent id/);

  const statements = db.statements();
  assert.ok(statements.includes("ROLLBACK"));
  assert.ok(!statements.includes("COMMIT"));
  assert.equal(db.released, 1);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, "ngo_charge_not_recorded");
  assert.equal(alerts[0].details?.paymentIntentId, "pi_123");
  assert.equal(alerts[0].details?.amount, "19.99");
  assert.doesNotMatch(
    JSON.stringify(alerts[0]),
    /sk_live_abcdef/,
    "Stripe key material must not reach alerts",
  );
});

test("with an idempotency key the unrecorded-charge message tells staff to retry safely", async () => {
  const { deps } = setup((sql) => {
    const card = cardLookup(sql);
    if (card) return card;
    if (sql.startsWith("INSERT INTO ngo_charges")) throw new Error("db down");
  });
  const result = await chargeSavedCard(deps, {
    ...BASE,
    idempotencyKey: "abc12345-xyz",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "CHARGE_NOT_RECORDED");
  assert.match(result.error, /Retry the same request/);
});

test("Stripe errors map to the documented statuses and nothing is recorded", async () => {
  const cases: [Row, number, string | undefined, RegExp][] = [
    [
      { type: "StripeCardError", code: "card_declined", message: "Your card was declined." },
      402,
      "card_declined",
      /^Card declined: Your card was declined\.$/,
    ],
    [
      { type: "StripeCardError", code: "authentication_required", message: "needs auth" },
      402,
      "authentication_required",
      /requires authentication/,
    ],
    [
      { type: "StripeIdempotencyError", message: "key reused" },
      409,
      "IDEMPOTENCY_CONFLICT",
      /idempotencyKey/,
    ],
    [
      { type: "StripeConnectionError", message: "socket hang up" },
      502,
      "STRIPE_CONNECTION_ERROR",
      /may or may not have gone through/,
    ],
    [
      { type: "StripeAPIError", message: "boom sk_test_abc123DEF456" },
      500,
      undefined,
      /^boom sk_test_\[redacted\]$/,
    ],
  ];

  for (const [stripeError, status, code, message] of cases) {
    const { db, alerts, deps } = setup(recordingHandler, {
      createError: stripeError,
    });
    const result = await chargeSavedCard(deps, BASE);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.status, status, stripeError.type);
    assert.equal(result.code, code, stripeError.type);
    assert.match(result.error, message, stripeError.type);
    assert.deepEqual(db.statements(), ["SELECT spm.*, u.email,"], "only the card read");
    assert.equal(alerts.length, 0);
  }
});

test("a connection error with an idempotency key says a retry is safe", async () => {
  const { deps } = setup(recordingHandler, {
    createError: { type: "StripeConnectionError", message: "reset" },
  });
  const result = await chargeSavedCard(deps, {
    ...BASE,
    idempotencyKey: "abc12345-xyz",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 502);
  assert.match(result.error, /will not be charged twice/);
});

// ─── refunds ────────────────────────────────────────────────────────────────

const CHARGE_ID = "6f1c1a4e-3d0b-4c52-9d6e-0a1b2c3d4e5f";
const CHARGE = {
  id: CHARGE_ID,
  status: "succeeded",
  stripe_payment_intent_id: "pi_123",
  amount: "19.99",
  currency: "USD",
};

function refundHandler(charge: Row | null = CHARGE) {
  return (sql: string): { rows: Row[] } | void => {
    if (sql.startsWith("SELECT * FROM ngo_charges")) {
      return { rows: charge ? [charge] : [] };
    }
  };
}

test("refunds a charge once, with a per-charge idempotency key, and records it atomically", async () => {
  const { db, calls, deps } = setup(refundHandler());

  const result = await refundNgoCharge(deps, { chargeId: CHARGE_ID });

  assert.deepEqual(result, {
    ok: true,
    refundId: "re_123",
    status: "succeeded",
    amount: 19.99,
  });
  assert.deepEqual(calls.refunds, [
    {
      params: { payment_intent: "pi_123", reason: "requested_by_customer" },
      options: { idempotencyKey: `ngo-refund-${CHARGE_ID}` },
    },
  ]);
  assert.deepEqual(db.statements(), [
    "SELECT * FROM",
    "BEGIN",
    "UPDATE ngo_charges SET",
    "UPDATE transactions SET",
    "COMMIT",
  ]);
  const update = db.log.find((e) => e.sql.startsWith("UPDATE ngo_charges"));
  assert.match(update!.sql, /status IS DISTINCT FROM 'refunded'/);
  assert.deepEqual(update!.params, [CHARGE_ID, "requested_by_customer"]);
});

test("refund reasons are limited to the values Stripe accepts", async () => {
  for (const reason of ["duplicate", "fraudulent", "requested_by_customer"]) {
    const { calls, deps } = setup(refundHandler());
    const result = await refundNgoCharge(deps, { chargeId: CHARGE_ID, reason });
    assert.equal(result.ok, true, reason);
    assert.equal(calls.refunds[0].params.reason, reason);
  }
  for (const reason of ["because", "FRAUDULENT", 7, {}]) {
    const { db, calls, deps } = setup(refundHandler());
    const result = await refundNgoCharge(deps, { chargeId: CHARGE_ID, reason });
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.status, 400);
    assert.equal(result.code, "INVALID_REFUND_REASON");
    assert.equal(calls.refunds.length, 0);
    assert.equal(db.log.length, 0);
  }
});

test("a missing or malformed chargeId is rejected without touching anything", async () => {
  for (const [chargeId, message] of [
    [undefined, /chargeId is required/],
    ["", /chargeId is required/],
    ["12", /Invalid chargeId/],
    ["not-a-uuid", /Invalid chargeId/],
    [`${CHARGE_ID}; DROP TABLE ngo_charges`, /Invalid chargeId/],
    [42, /Invalid chargeId/],
  ] as [unknown, RegExp][]) {
    const { db, calls, deps } = setup(refundHandler());
    const result = await refundNgoCharge(deps, { chargeId });
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.status, 400);
    assert.match(result.error, message);
    assert.equal(calls.refunds.length, 0);
    assert.equal(db.log.length, 0);
  }
});

test("unknown, already-refunded, and intent-less charges are not sent to Stripe", async () => {
  const missing = setup(refundHandler(null));
  const notFound = await refundNgoCharge(missing.deps, { chargeId: CHARGE_ID });
  assert.deepEqual(notFound, { ok: false, status: 404, error: "Charge not found" });

  const refunded = setup(refundHandler({ ...CHARGE, status: "refunded" }));
  const already = await refundNgoCharge(refunded.deps, { chargeId: CHARGE_ID });
  assert.equal(already.ok, false);
  if (!already.ok) {
    assert.equal(already.status, 400);
    assert.equal(already.code, "ALREADY_REFUNDED");
  }

  const bare = setup(refundHandler({ ...CHARGE, stripe_payment_intent_id: null }));
  const noIntent = await refundNgoCharge(bare.deps, { chargeId: CHARGE_ID });
  assert.equal(noIntent.ok, false);
  if (!noIntent.ok) assert.equal(noIntent.status, 400);

  for (const scenario of [missing, refunded, bare]) {
    assert.equal(scenario.calls.refunds.length, 0);
  }
});

test("a charge Stripe says is already refunded is reconciled in the database", async () => {
  const { db, alerts, deps } = setup(refundHandler(), {
    refundError: {
      type: "StripeInvalidRequestError",
      code: "charge_already_refunded",
      message: "Charge ch_1 has already been refunded.",
    },
  });

  const result = await refundNgoCharge(deps, { chargeId: CHARGE_ID });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 400);
  assert.equal(result.code, "ALREADY_REFUNDED");
  assert.ok(db.statements().includes("UPDATE ngo_charges SET"));
  assert.ok(db.statements().includes("COMMIT"));
  assert.equal(alerts.length, 0);
});

test("a ledger failure after the refund succeeded alerts and tells staff a retry is safe", async () => {
  const { db, alerts, deps } = setup((sql) => {
    if (sql.startsWith("SELECT * FROM ngo_charges")) return { rows: [CHARGE] };
    if (sql.startsWith("UPDATE transactions")) throw new Error("db down");
  });

  const result = await refundNgoCharge(deps, { chargeId: CHARGE_ID });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 500);
  assert.equal(result.code, "REFUND_NOT_RECORDED");
  assert.equal(result.refundId, "re_123");
  assert.match(result.error, /will not be issued twice/);
  assert.ok(db.statements().includes("ROLLBACK"));
  assert.ok(!db.statements().includes("COMMIT"));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, "ngo_refund_not_recorded");
  assert.equal(alerts[0].details?.refundId, "re_123");
});

test("other Stripe refund errors map to client or server errors with secrets redacted", async () => {
  const cases: [Row, number, string | undefined, RegExp][] = [
    [
      { type: "StripeInvalidRequestError", code: "charge_not_refundable", message: "No successful charge to refund." },
      400,
      "charge_not_refundable",
      /No successful charge/,
    ],
    [
      { type: "StripeIdempotencyError", message: "in use" },
      409,
      "IDEMPOTENCY_CONFLICT",
      /already in progress/,
    ],
    [
      { type: "StripeConnectionError", message: "reset" },
      502,
      "STRIPE_CONNECTION_ERROR",
      /will not be issued twice/,
    ],
    [
      { type: "StripeAuthenticationError", message: "Invalid API Key provided: sk_live_abcdef1234567890" },
      500,
      undefined,
      /^Invalid API Key provided: sk_live_\[redacted\]$/,
    ],
  ];

  for (const [refundError, status, code, message] of cases) {
    const { db, deps } = setup(refundHandler(), { refundError });
    const result = await refundNgoCharge(deps, { chargeId: CHARGE_ID });
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.status, status, String(refundError.type));
    assert.equal(result.code, code, String(refundError.type));
    assert.match(result.error, message, String(refundError.type));
    assert.ok(!db.statements().includes("UPDATE ngo_charges SET"));
  }
});

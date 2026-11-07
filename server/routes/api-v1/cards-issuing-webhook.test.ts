import assert from "node:assert/strict";
import express from "express";
import Stripe from "stripe";
import test, { afterEach, beforeEach } from "node:test";
import { scriptPool, withRouter } from "../../test-support/route-harness";

// A well-formed but fake key: the client is only used to verify signatures,
// which is pure cryptography and never reaches Stripe.
process.env.STRIPE_SECRET_KEY = `sk_test_${"x".repeat(24)}`;
const cardsRouter = (await import("./cards")).default;

const SECRET = `whsec_${"s".repeat(32)}`;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function sign(payload: string, secret = SECRET) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}

const transaction = (overrides: Record<string, unknown> = {}) => ({
  id: "evt_1",
  object: "event",
  type: "issuing_transaction.created",
  data: {
    object: {
      id: "ipi_1",
      type: "capture",
      card: "ic_card",
      amount: -2500,
      currency: "usd",
      merchant_data: { name: "Cafe Abidjan", category: "restaurants" },
      ...overrides,
    },
  },
});

let alreadyAwarded = false;

function scriptedCardsDb() {
  return scriptPool((sql, params) => {
    if (sql.includes("FROM issued_cards ic")) {
      return params[0] === "ic_card"
        ? { rows: [{ id: 11, user_id: 7, subscription_tier: "essential", tier_at_issuance: "free" }] }
        : { rows: [] };
    }
    if (sql.includes("FROM points_ledger WHERE type = 'earn' AND stripe_transaction_id = $1")) {
      return { rows: alreadyAwarded ? [{ one: 1 }] : [] };
    }
    if (sql.includes("SUM(points)")) return { rows: [{ balance: "100" }] };
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedCardsDb>;
const changes = (db: ScriptedDb) => db.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

const post = (origin: string, payload: string, signature?: string) =>
  fetch(`${origin}/webhook/issuing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body: payload,
    signal: AbortSignal.timeout(3000),
  });

// The app reads this route raw (server/index.ts), so Stripe sees the exact bytes.
const rawBody = [express.raw({ type: "application/json" })];
const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(cardsRouter, fn, { before: rawBody, json: false });

beforeEach(() => {
  alreadyAwarded = false;
  process.env.STRIPE_ISSUING_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  process.env.STRIPE_ISSUING_WEBHOOK_SECRET = "";
});

test("without a signing secret the webhook is closed, not open", async () => {
  process.env.STRIPE_ISSUING_WEBHOOK_SECRET = "";
  const db = scriptedCardsDb();
  const payload = JSON.stringify(transaction());
  await serve(async (origin) => {
    assert.equal((await post(origin, payload, sign(payload))).status, 503);
    assert.equal((await post(origin, payload)).status, 503);
  });
  assert.equal(db.log.length, 0);
});

test("unsigned, wrongly signed and tampered events award nothing", async () => {
  const db = scriptedCardsDb();
  const payload = JSON.stringify(transaction());
  await serve(async (origin) => {
    // the forged call anyone on the internet could make before: no signature at all
    assert.equal((await post(origin, payload)).status, 400);
    // signed with somebody else's secret
    assert.equal((await post(origin, payload, sign(payload, `whsec_${"z".repeat(32)}`))).status, 400);
    // a valid signature for a different, smaller amount
    const original = JSON.stringify(transaction({ amount: -100 }));
    assert.equal((await post(origin, payload, sign(original))).status, 400);
    // garbage header
    assert.equal((await post(origin, payload, "t=1,v1=deadbeef")).status, 400);
  });
  assert.equal(db.log.length, 0, "an unverified event must not even read the database");
});

test("a signed card purchase earns points once, and a redelivery is ignored", async () => {
  const db = scriptedCardsDb();
  const payload = JSON.stringify(transaction());
  await serve(async (origin) => {
    const first = await post(origin, payload, sign(payload));
    assert.equal(first.status, 200);
    const [award] = db.matching("INSERT INTO points_ledger");
    assert.ok(award, "points were recorded");
    assert.equal(award.params[0], 7);
    assert.equal(award.params[1], 11);
    assert.ok(Number(award.params[2]) > 0, "points are positive");
    assert.equal(award.params[3], 100 + Number(award.params[2]), "new balance = old balance + earned");
    assert.equal(award.params[5], "ipi_1", "the Stripe transaction id is stored for idempotency");

    // Check-then-award is one transaction under a per-transaction lock, so two
    // simultaneous deliveries of the same event cannot both award
    const at = (fragment: string) => db.log.findIndex((entry) => entry.sql.includes(fragment));
    const order = [
      at("BEGIN"),
      at("pg_advisory_xact_lock"),
      at("FROM points_ledger WHERE type = 'earn'"),
      at("INSERT INTO points_ledger"),
      at("COMMIT"),
    ];
    assert.ok(order.every((index) => index >= 0), `all steps ran: ${order}`);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), "steps run in order");
    assert.deepEqual(db.matching("pg_advisory_xact_lock")[0].params, ["issuing-txn:ipi_1"]);
    assert.equal(db.connections, 1, "one dedicated client carries the whole award");
    assert.equal(db.released, 1, "and goes back to the pool");

    alreadyAwarded = true;
    const redelivered = await post(origin, payload, sign(payload));
    assert.equal(redelivered.status, 200);
    assert.equal(db.matching("INSERT INTO points_ledger").length, 1);
    assert.equal(db.matching("pg_advisory_xact_lock").length, 2, "a redelivery still checks under the lock");
    assert.equal(db.connections, 2);
    assert.equal(db.released, 2);
  });
});

test("a failure while recording points rolls the award back and asks Stripe to retry", async () => {
  const db = scriptPool((sql) => {
    if (sql.includes("FROM issued_cards ic")) {
      return { rows: [{ id: 11, user_id: 7, subscription_tier: "essential", tier_at_issuance: "free" }] };
    }
    if (sql.includes("SUM(points)")) return { rows: [{ balance: "100" }] };
    if (sql.startsWith("INSERT INTO points_ledger")) throw new Error("ledger unavailable");
    return undefined;
  });
  const payload = JSON.stringify(transaction());
  await serve(async (origin) => {
    assert.equal((await post(origin, payload, sign(payload))).status, 500);
  });
  assert.equal(db.matching("ROLLBACK").length, 1);
  assert.equal(db.matching("COMMIT").length, 0);
  assert.equal(db.connections, 1);
  assert.equal(db.released, 1, "the client is released even when the award fails");
});

test("only captures on a known card earn points", async () => {
  const db = scriptedCardsDb();
  await serve(async (origin) => {
    for (const overrides of [{ type: "refund" }, { card: "ic_unknown" }]) {
      const payload = JSON.stringify(transaction(overrides));
      assert.equal((await post(origin, payload, sign(payload))).status, 200);
    }
  });
  assert.equal(changes(db).length, 0);
});

test("a signed card status change is applied", async () => {
  const db = scriptedCardsDb();
  const payload = JSON.stringify({
    id: "evt_2",
    object: "event",
    type: "issuing_card.updated",
    data: { object: { id: "ic_card", status: "canceled" } },
  });
  await serve(async (origin) => {
    assert.equal((await post(origin, payload, sign(payload))).status, 200);
  });
  const [update] = db.matching("UPDATE issued_cards SET card_status");
  assert.deepEqual(update.params, ["canceled", "ic_card"]);
});

/**
 * Real-Postgres integration test for the money and ledger flows:
 * wallet transfers, withdrawals, the ad-reward postback, the Stripe Issuing
 * webhook, saved jobs and playlist reads.
 *
 * Over HTTP against the real routers and database it proves what the scripted
 * route tests cannot:
 *   - transfers and withdrawals are atomic, never spend a balance twice (also
 *     under parallel requests), and never deadlock when users pay each other;
 *   - the ad-reward postback and the Issuing webhook credit exactly once per
 *     transaction id, even when the same delivery arrives many times at once;
 *   - a playlist read only returns that playlist's tracks.
 *
 * Run against a disposable LOCAL database only (same convention as
 * crud-flows.test.mjs and ticket-workflow.test.mjs):
 *   TICKET_INTEGRATION_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/DISPOSABLE_DB \
 *     node --import tsx --test scripts/tests/wallet-money-flows.test.mjs
 */
import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import Stripe from "stripe";

const databaseUrl = process.env.TICKET_INTEGRATION_DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Set TICKET_INTEGRATION_DATABASE_URL to an explicitly disposable LOCAL PostgreSQL database.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-wallet-money-flows-test-secret-not-for-production";
process.env.AD_REWARD_SECRET = "wallet-money-flows-ad-reward-secret";
process.env.ONLINE_PAYMENTS_ENABLED = "true";
// Well-formed but fake: the Stripe client only verifies signatures here and never reaches Stripe.
process.env.STRIPE_SECRET_KEY = ["sk", "test", "wallet", "money", "flows"].join("_");
process.env.STRIPE_ISSUING_WEBHOOK_SECRET = ["whsec", "wallet", "money", "flows"].join("_");
delete process.env.DISABLE_DB_CHECK;
// Empty (not deleted) so dotenv cannot re-inject real mail/webhook settings.
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "ADMIN_EMAIL", "CONTACT_EMAIL", "ZAPIER_WEBHOOK_URL"]) {
  process.env[key] = "";
}
const runId = crypto.randomUUID().slice(0, 8);

const { pool } = await import("../../server/db.ts");
const { ensureAllTables } = await import("../../server/services/ensure-tables.ts");
const { globalAuthGate } = await import("../../server/middleware/auth.ts");
const backgroundIntervals = [];
const createInterval = globalThis.setInterval;
const intervalMock = mock.method(globalThis, "setInterval", (...args) => {
  const timer = createInterval(...args);
  backgroundIntervals.push(timer);
  return timer;
});
const { default: paymentsRouter } = await import("../../server/routes/payments.ts");
const { default: walletRouter } = await import("../../server/routes/wallet.ts");
const { default: cardsRouter } = await import("../../server/routes/api-v1/cards.ts");
const { default: jobsRouter } = await import("../../server/routes/jobs.ts");
const { default: streamingRouter } = await import("../../server/routes/streaming.ts");
intervalMock.mock.restore();

// ensureAllTables() does not create the wallet tables (production has them from migration 0000), so mirror them here.
const WALLET_TABLES_DDL = [
  `CREATE TABLE IF NOT EXISTS platform_wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    balance NUMERIC(14, 2) DEFAULT '0.00',
    currency VARCHAR(3) DEFAULT 'USD',
    total_deposited NUMERIC(14, 2) DEFAULT '0.00',
    total_withdrawn NUMERIC(14, 2) DEFAULT '0.00',
    total_spent NUMERIC(14, 2) DEFAULT '0.00',
    total_earned NUMERIC(14, 2) DEFAULT '0.00',
    frozen_balance NUMERIC(14, 2) DEFAULT '0.00',
    withdrawal_locked BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active',
    last_transaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT platform_wallets_user_id_unique UNIQUE (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    balance_before NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(30),
    external_reference VARCHAR(255),
    description TEXT,
    related_entity_type VARCHAR(30),
    related_entity_id TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
let server;
let origin;

before(async () => {
  // ensureAllTables() alters these Arena tables, which the separate music bootstrap normally creates.
  for (const table of ["arena_votes", "arena_brackets", "arena_contests"]) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table}(id SERIAL PRIMARY KEY)`);
  }
  await ensureAllTables();
  for (const statement of WALLET_TABLES_DDL) await pool.query(statement);

  const app = express();
  // Stripe verifies signatures against the exact raw bytes (server/index.ts does the same)
  app.use("/api/v1/cards/webhook/issuing", express.raw({ type: "application/json" }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(globalAuthGate);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/wallet", walletRouter);
  app.use("/api/v1/cards", cardsRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/streaming", streamingRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  backgroundIntervals.forEach(clearInterval);
  if (server) await new Promise((resolve) => server.close(() => resolve()));
  await pool.end();
});

async function makeUser(tag) {
  const email = `${tag}_${runId}_${crypto.randomUUID().slice(0, 6)}@example.test`;
  const result = await pool.query(
    "INSERT INTO users(username,email,password,role,is_verified) VALUES ($1,$2,'not-a-login-password','user',true) RETURNING id",
    [`wm_${tag}_${crypto.randomUUID().slice(0, 8)}`, email],
  );
  const id = result.rows[0].id;
  const token = jwt.sign({ userId: String(id), email, role: "user" }, process.env.JWT_SECRET, { expiresIn: "10m" });
  return { id, token };
}

async function setWallet(userId, balance, { status = "active", deposited = "0.00" } = {}) {
  await pool.query(
    `INSERT INTO platform_wallets(user_id, balance, status, total_deposited)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, status = EXCLUDED.status, total_deposited = EXCLUDED.total_deposited`,
    [userId, balance, status, deposited],
  );
}

async function wallet(userId) {
  const result = await pool.query(
    `SELECT balance::text AS balance, total_spent::text AS spent, total_earned::text AS earned,
            total_withdrawn::text AS withdrawn, status
       FROM platform_wallets WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0];
}

async function txns(userId) {
  const result = await pool.query(
    `SELECT type, amount::text AS amount, balance_before::text AS before, balance_after::text AS after,
            status, metadata
       FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at, id`,
    [userId],
  );
  return result.rows;
}

async function api(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, body: json, text };
}

const count = (results, status) => results.filter((result) => result.status === status).length;
const statuses = (results) => JSON.stringify(results.map((result) => result.status));

// ─────────────────────────── transfers ───────────────────────────

test("transfer: success moves exactly the amount, creates the recipient wallet, writes both ledger rows", async () => {
  const a = await makeUser("t1a");
  const b = await makeUser("t1b");
  await setWallet(a.id, "100.00");

  const res = await api("POST", "/api/payments/wallet/transfer", {
    token: a.token,
    body: { recipientId: b.id, amount: 25.5 },
  });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.senderBalance, "74.50");

  assert.deepEqual(await wallet(a.id), { balance: "74.50", spent: "25.50", earned: "0.00", withdrawn: "0.00", status: "active" });
  assert.deepEqual(await wallet(b.id), { balance: "25.50", spent: "0.00", earned: "25.50", withdrawn: "0.00", status: "active" });

  const [sent] = await txns(a.id);
  assert.deepEqual(
    { type: sent.type, amount: sent.amount, before: sent.before, after: sent.after, status: sent.status },
    { type: "transfer", amount: "25.50", before: "100.00", after: "74.50", status: "completed" },
  );
  const [received] = await txns(b.id);
  assert.deepEqual(
    { type: received.type, before: received.before, after: received.after },
    { type: "transfer", before: "0.00", after: "25.50" },
  );
});

test("transfer: a tip is recorded as tip_received for the recipient", async () => {
  const a = await makeUser("t2a");
  const b = await makeUser("t2b");
  await setWallet(a.id, "50.00");
  await setWallet(b.id, "1.00");
  const res = await api("POST", "/api/payments/wallet/transfer", {
    token: a.token,
    body: { recipientId: String(b.id), amount: "10", type: "tip_sent", relatedEntityType: "track", relatedEntityId: "42" },
  });
  assert.equal(res.status, 200, res.text);
  assert.equal((await txns(a.id))[0].type, "tip_sent");
  assert.equal((await txns(b.id))[0].type, "tip_received");
  assert.equal((await wallet(b.id)).balance, "11.00");
});

test("transfer: insufficient funds, self-transfer, unknown recipient, bad input and frozen wallet change nothing", async () => {
  const a = await makeUser("t3a");
  const b = await makeUser("t3b");
  await setWallet(a.id, "40.00");
  const ghost = 2147480000;

  const cases = [
    ["insufficient", { recipientId: b.id, amount: 80 }, 402],
    ["self", { recipientId: a.id, amount: 5 }, 400],
    ["unknown recipient", { recipientId: ghost, amount: 5 }, 404],
    ["non-numeric recipient", { recipientId: "abc", amount: 5 }, 400],
    ["negative recipient", { recipientId: -1, amount: 5 }, 400],
    ["fractional recipient", { recipientId: 1.5, amount: 5 }, 400],
    ["missing recipient", { amount: 5 }, 400],
    ["zero amount", { recipientId: b.id, amount: 0 }, 400],
    ["negative amount", { recipientId: b.id, amount: -3 }, 400],
    ["text amount", { recipientId: b.id, amount: "abc" }, 400],
    ["sub-cent amount", { recipientId: b.id, amount: 0.004 }, 400],
    ["bad type", { recipientId: b.id, amount: 5, type: "withdrawal" }, 400],
  ];
  for (const [label, body, expected] of cases) {
    const res = await api("POST", "/api/payments/wallet/transfer", { token: a.token, body });
    assert.equal(res.status, expected, `${label}: ${res.text}`);
  }
  assert.equal((await wallet(a.id)).balance, "40.00");
  assert.equal(await wallet(b.id), undefined, "a rejected transfer must not create the recipient wallet");
  const ghostWallets = await pool.query("SELECT count(*)::int AS n FROM platform_wallets WHERE user_id = $1", [ghost]);
  assert.equal(ghostWallets.rows[0].n, 0);
  assert.equal((await txns(a.id)).length, 0);

  await setWallet(a.id, "40.00", { status: "frozen" });
  const frozen = await api("POST", "/api/payments/wallet/transfer", { token: a.token, body: { recipientId: b.id, amount: 5 } });
  assert.equal(frozen.status, 402, frozen.text);
  assert.equal((await wallet(a.id)).balance, "40.00");

  const walletless = await makeUser("t3c");
  const none = await api("POST", "/api/payments/wallet/transfer", {
    token: walletless.token,
    body: { recipientId: b.id, amount: 5 },
  });
  assert.equal(none.status, 402, none.text);
});

test("transfer: a failure after the balances moved rolls the whole transfer back", async () => {
  const a = await makeUser("t4a");
  const b = await makeUser("t4b");
  await setWallet(a.id, "100.00");
  await setWallet(b.id, "0.00");
  // related_entity_type is VARCHAR(30): the ledger insert fails after both wallets were updated
  const res = await api("POST", "/api/payments/wallet/transfer", {
    token: a.token,
    body: { recipientId: b.id, amount: 30, relatedEntityType: "x".repeat(40) },
  });
  assert.equal(res.status, 500, res.text);
  assert.deepEqual(await wallet(a.id), { balance: "100.00", spent: "0.00", earned: "0.00", withdrawn: "0.00", status: "active" });
  assert.equal((await wallet(b.id)).balance, "0.00");
  assert.equal((await txns(a.id)).length, 0);
});

test("transfer: 25 parallel transfers of 10.00 from a 100.00 wallet spend it exactly once", async () => {
  const a = await makeUser("t5a");
  const b = await makeUser("t5b");
  await setWallet(a.id, "100.00");

  const results = await Promise.all(
    Array.from({ length: 25 }, () =>
      api("POST", "/api/payments/wallet/transfer", { token: a.token, body: { recipientId: b.id, amount: 10 } }),
    ),
  );
  assert.equal(count(results, 200), 10, statuses(results));
  assert.equal(count(results, 402), 15, statuses(results));
  const wa = await wallet(a.id);
  const wb = await wallet(b.id);
  assert.equal(wa.balance, "0.00");
  assert.equal(wa.spent, "100.00");
  assert.equal(wb.balance, "100.00");
  assert.equal(wb.earned, "100.00");
  assert.equal((await txns(a.id)).length, 10);
  assert.equal((await txns(b.id)).length, 10);
});

test("transfer: opposite-direction parallel transfers neither deadlock nor change the total", async () => {
  const a = await makeUser("t6a");
  const b = await makeUser("t6b");
  await setWallet(a.id, "500.00");
  await setWallet(b.id, "500.00");

  const jobs = [];
  for (let i = 0; i < 20; i++) {
    jobs.push(api("POST", "/api/payments/wallet/transfer", { token: a.token, body: { recipientId: b.id, amount: 1 } }));
    jobs.push(api("POST", "/api/payments/wallet/transfer", { token: b.token, body: { recipientId: a.id, amount: 1 } }));
  }
  const results = await Promise.all(jobs);
  assert.equal(count(results, 200), 40, statuses(results));
  const wa = await wallet(a.id);
  const wb = await wallet(b.id);
  assert.equal(wa.balance, "500.00");
  assert.equal(wb.balance, "500.00");
  assert.equal(wa.spent, "20.00");
  assert.equal(wa.earned, "20.00");
});

// ─────────────────────────── withdrawals ───────────────────────────

test("withdraw: PayPal 100.00 debits 103.50 (3.5% fee), records a pending payout and updates totals", async () => {
  const a = await makeUser("w1");
  await setWallet(a.id, "200.00");
  const res = await api("POST", "/api/payments/wallet/withdraw", {
    token: a.token,
    body: { amount: 100, paymentMethod: "paypal", paypalEmail: "payout@example.test" },
  });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.newBalance, "96.50");
  assert.equal(res.body.fee, "3.50");
  assert.equal(res.body.netPayout, "96.50");
  const w = await wallet(a.id);
  assert.equal(w.balance, "96.50");
  assert.equal(w.withdrawn, "100.00");
  const [row] = await txns(a.id);
  assert.deepEqual(
    { type: row.type, status: row.status, amount: row.amount, before: row.before, after: row.after },
    { type: "withdrawal", status: "pending", amount: "100.00", before: "200.00", after: "96.50" },
  );
  assert.equal(row.metadata.netAmount, "96.50");
});

test("withdraw: rejects insufficient funds, below-minimum, no wallet and the disabled-payments gate", async () => {
  const a = await makeUser("w2");
  await setWallet(a.id, "50.00");
  const tooMuch = await api("POST", "/api/payments/wallet/withdraw", { token: a.token, body: { amount: 49, paymentMethod: "paypal" } });
  assert.equal(tooMuch.status, 402, tooMuch.text);
  const tooLow = await api("POST", "/api/payments/wallet/withdraw", { token: a.token, body: { amount: 24, paymentMethod: "paypal" } });
  assert.equal(tooLow.status, 400, tooLow.text);
  const none = await makeUser("w2b");
  const noWallet = await api("POST", "/api/payments/wallet/withdraw", { token: none.token, body: { amount: 30, paymentMethod: "paypal" } });
  assert.equal(noWallet.status, 400, noWallet.text);

  process.env.ONLINE_PAYMENTS_ENABLED = "false";
  try {
    const gated = await api("POST", "/api/payments/wallet/withdraw", { token: a.token, body: { amount: 30, paymentMethod: "paypal" } });
    assert.equal(gated.status, 503, gated.text);
  } finally {
    process.env.ONLINE_PAYMENTS_ENABLED = "true";
  }
  assert.equal((await wallet(a.id)).balance, "50.00");
  assert.equal((await txns(a.id)).length, 0);
});

test("withdraw: parallel requests cannot spend the same balance twice", async () => {
  const a = await makeUser("w3");
  await setWallet(a.id, "100.00");
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      api("POST", "/api/payments/wallet/withdraw", { token: a.token, body: { amount: 50, paymentMethod: "paypal" } }),
    ),
  );
  assert.equal(count(results, 200), 1, statuses(results));
  assert.equal(count(results, 402), 9, statuses(results));
  assert.equal((await wallet(a.id)).balance, "48.25");
  assert.equal((await txns(a.id)).length, 1);
});

test("withdraw: bank payouts enforce the $500 platform-activity floor", async () => {
  const a = await makeUser("w4");
  await setWallet(a.id, "300.00", { deposited: "10.00" });
  const low = await api("POST", "/api/payments/wallet/withdraw", { token: a.token, body: { amount: 100, paymentMethod: "bank" } });
  assert.equal(low.status, 403, low.text);
  await setWallet(a.id, "300.00", { deposited: "600.00" });
  const ok = await api("POST", "/api/payments/wallet/withdraw", { token: a.token, body: { amount: 100, paymentMethod: "bank" } });
  assert.equal(ok.status, 200, ok.text);
  assert.equal((await wallet(a.id)).balance, "200.00");
});

// ─────────────────────────── ad reward ───────────────────────────

function postAdReward(caller, userId, transactionId, amount = 1.5, secret = process.env.AD_REWARD_SECRET) {
  return api("POST", "/api/wallet/ad-reward", { token: caller.token, body: { userId, amount, transactionId, secret } });
}

test("ad-reward: rejects a wrong secret and malformed rewards", async () => {
  const caller = await makeUser("ad0");
  const target = await makeUser("ad0t");
  assert.equal((await postAdReward(caller, target.id, "ad-x", 1.5, "nope")).status, 403);
  const secret = process.env.AD_REWARD_SECRET;
  for (const body of [
    { userId: target.id, transactionId: "ad-y", secret },
    { userId: target.id, amount: 6, transactionId: "ad-y", secret },
    { userId: "abc", amount: 1, transactionId: "ad-y", secret },
    { userId: target.id, amount: 1, secret },
  ]) {
    const res = await api("POST", "/api/wallet/ad-reward", { token: caller.token, body });
    assert.equal(res.status, 400, `${JSON.stringify(body)} -> ${res.text}`);
  }
  assert.equal(await wallet(target.id), undefined);
});

test("ad-reward: a wallet is never credited without its ledger row", async () => {
  // Force the ledger insert to fail: the credit and its record must commit together or not at all
  await pool.query("ALTER TABLE wallet_transactions ADD CONSTRAINT reject_ad_reward CHECK (type <> 'arena_reward')");
  try {
    const caller = await makeUser("ad1");
    const target = await makeUser("ad1t");
    const res = await postAdReward(caller, target.id, `ad-inv-${runId}`);
    assert.equal(res.status, 500, res.text);
    assert.equal(await wallet(target.id), undefined, "a failed credit must leave no wallet behind");
    assert.equal((await txns(target.id)).length, 0);
  } finally {
    await pool.query("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS reject_ad_reward");
  }
});

test("ad-reward: credits once per transactionId, even for parallel retries, and serialises distinct credits", async () => {
  const caller = await makeUser("ad2");
  const target = await makeUser("ad2t");

  const first = await postAdReward(caller, target.id, "ad-ok-1");
  assert.equal(first.status, 200, first.text);
  assert.equal(first.body.credited, 1.5);
  let w = await wallet(target.id);
  assert.equal(w.balance, "1.50");
  assert.equal(w.earned, "1.50");

  const replay = await postAdReward(caller, target.id, "ad-ok-1");
  assert.equal(replay.status, 200, replay.text);
  assert.equal(replay.body.message, "Already credited");
  assert.equal((await wallet(target.id)).balance, "1.50");

  const sameId = await Promise.all(Array.from({ length: 12 }, () => postAdReward(caller, target.id, "ad-ok-2")));
  assert.equal(count(sameId, 200), 12, statuses(sameId));
  assert.equal((await wallet(target.id)).balance, "3.00");

  const distinct = await Promise.all(Array.from({ length: 10 }, (_, i) => postAdReward(caller, target.id, `ad-d-${i}`, 0.5)));
  assert.equal(count(distinct, 200), 10, statuses(distinct));
  w = await wallet(target.id);
  assert.equal(w.balance, "8.00");
  assert.equal(w.earned, "8.00");
  const rows = await pool.query(
    "SELECT count(*)::int AS n FROM wallet_transactions WHERE user_id = $1 AND external_reference LIKE 'ad-%' AND type = 'arena_reward'",
    [target.id],
  );
  assert.equal(rows.rows[0].n, 12);
});

// ─────────────────────────── issuing webhook ───────────────────────────

function sign(payload, secret = process.env.STRIPE_ISSUING_WEBHOOK_SECRET) {
  return {
    "Content-Type": "application/json",
    "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret }),
  };
}

function capture(id, card, cents, extra = {}) {
  return JSON.stringify({
    id: `evt_${id}`,
    object: "event",
    type: "issuing_transaction.created",
    data: {
      object: {
        id,
        object: "issuing.transaction",
        type: "capture",
        amount: -cents,
        currency: "usd",
        card,
        merchant_data: { name: "Test Merchant", category: "grocery_stores_supermarkets" },
        ...extra,
      },
    },
  });
}

const postWebhook = (payload, headers) => api("POST", "/api/v1/cards/webhook/issuing", { body: payload, headers });

const ledgerRows = async (transactionId) =>
  (await pool.query("SELECT type, points, user_id FROM points_ledger WHERE stripe_transaction_id = $1", [transactionId])).rows;

async function makeCard(userId, tag) {
  const cardId = `ic_${tag}_${runId}`;
  const result = await pool.query(
    "INSERT INTO issued_cards(user_id, stripe_card_id, stripe_cardholder_id, tier_at_issuance) VALUES ($1,$2,$3,'free') RETURNING id",
    [userId, cardId, `ich_${tag}_${runId}`],
  );
  return { cardId, rowId: result.rows[0].id };
}

test("issuing webhook: fails closed without a secret or a valid signature, and never awards points for those", async () => {
  const user = await makeUser("iw0");
  const { cardId } = await makeCard(user.id, "iw0");
  const txId = `ipi_${runId}_unsigned`;
  const payload = capture(txId, cardId, 2500);

  assert.equal((await postWebhook(payload, { "Content-Type": "application/json" })).status, 400);
  assert.equal((await postWebhook(payload, sign(payload, "whsec_someone_elses_secret"))).status, 400);
  assert.equal((await ledgerRows(txId)).length, 0);

  const configured = process.env.STRIPE_ISSUING_WEBHOOK_SECRET;
  delete process.env.STRIPE_ISSUING_WEBHOOK_SECRET;
  try {
    assert.equal((await postWebhook(payload, sign(payload, configured))).status, 503);
  } finally {
    process.env.STRIPE_ISSUING_WEBHOOK_SECRET = configured;
  }
  assert.equal((await ledgerRows(txId)).length, 0);
});

test("issuing webhook: a signed capture awards points once; redelivery is a no-op; other events are ignored", async () => {
  const user = await makeUser("iw1");
  const { cardId, rowId } = await makeCard(user.id, "iw1");
  const txId = `ipi_${runId}_ok`;
  const payload = capture(txId, cardId, 2500);

  assert.equal((await postWebhook(payload, sign(payload))).status, 200);
  const rows = await ledgerRows(txId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, "earn");
  assert.equal(rows[0].user_id, user.id);
  assert.ok(rows[0].points > 0);

  assert.equal((await postWebhook(payload, sign(payload))).status, 200);
  assert.equal((await ledgerRows(txId)).length, 1, "sequential redelivery must not double-award");

  const unknownCard = capture(`ipi_${runId}_ghost`, "ic_does_not_exist", 1000);
  assert.equal((await postWebhook(unknownCard, sign(unknownCard))).status, 200);
  assert.equal((await ledgerRows(`ipi_${runId}_ghost`)).length, 0);

  const refund = capture(`ipi_${runId}_refund`, cardId, 1000, { type: "refund" });
  assert.equal((await postWebhook(refund, sign(refund))).status, 200);
  assert.equal((await ledgerRows(`ipi_${runId}_refund`)).length, 0);

  const update = JSON.stringify({
    id: `evt_${runId}_upd`,
    object: "event",
    type: "issuing_card.updated",
    data: { object: { id: cardId, object: "issuing.card", status: "inactive" } },
  });
  assert.equal((await postWebhook(update, sign(update))).status, 200);
  const card = await pool.query("SELECT card_status FROM issued_cards WHERE id = $1", [rowId]);
  assert.equal(card.rows[0].card_status, "inactive");
});

test("issuing webhook: ten simultaneous deliveries of one transaction award points exactly once", async () => {
  const user = await makeUser("iw2");
  const { cardId } = await makeCard(user.id, "iw2");
  const txId = `ipi_${runId}_race`;
  const payload = capture(txId, cardId, 4200);
  const results = await Promise.all(Array.from({ length: 10 }, () => postWebhook(payload, sign(payload))));
  assert.equal(count(results, 200), 10, statuses(results));
  assert.equal((await ledgerRows(txId)).length, 1, "concurrent redeliveries must not double-award");
});

// ─────────────────────────── saved jobs ───────────────────────────

test("saved jobs: auth required, save/list/unsave is per user and idempotent, bad ids are rejected", async () => {
  const a = await makeUser("j1a");
  const b = await makeUser("j1b");
  const job = await pool.query(
    "INSERT INTO jobs(id, title, company, status) VALUES (gen_random_uuid(), $1, 'Test Co', 'active') RETURNING id::text AS id",
    [`Wallet flows job ${runId}`],
  );
  const jobId = job.rows[0].id;

  assert.equal((await api("GET", "/api/jobs/saved")).status, 401);
  assert.equal((await api("POST", `/api/jobs/${jobId}/save`)).status, 401);

  assert.equal((await api("POST", `/api/jobs/${jobId}/save`, { token: a.token })).status, 200);
  assert.equal((await api("POST", `/api/jobs/${jobId}/save`, { token: a.token })).status, 200, "saving twice is idempotent");
  const listA = await api("GET", "/api/jobs/saved", { token: a.token });
  assert.equal(listA.status, 200, listA.text);
  assert.deepEqual(listA.body.jobIds, [jobId]);
  assert.deepEqual((await api("GET", "/api/jobs/saved", { token: b.token })).body.jobIds, [], "another user must not see it");

  assert.equal((await api("POST", `/api/jobs/${jobId}/unsave`, { token: b.token })).status, 200);
  assert.deepEqual((await api("GET", "/api/jobs/saved", { token: a.token })).body.jobIds, [jobId], "unsaving as b must not touch a's list");
  assert.equal((await api("POST", `/api/jobs/${jobId}/unsave`, { token: a.token })).status, 200);
  assert.deepEqual((await api("GET", "/api/jobs/saved", { token: a.token })).body.jobIds, []);

  const missing = await api("POST", `/api/jobs/${crypto.randomUUID()}/save`, { token: a.token });
  assert.equal(missing.status, 404, missing.text);

  // jobs.id is a UUID: a real id reaches the handler (it was a blanket 404 under the numeric guard) ...
  const reached = await api("GET", `/api/jobs/${jobId}/applications`, { token: b.token });
  assert.equal(reached.status, 404, reached.text);
  assert.equal(reached.body.error, "Posting not found", "must come from the handler, not the id guard");
  // ... while a malformed id is stopped by the guard
  const guarded = await api("GET", "/api/jobs/123/applications", { token: a.token });
  assert.equal(guarded.status, 404, guarded.text);
  assert.equal(guarded.body.error, "Not found");
});

// ─────────────────────────── playlists ───────────────────────────

test("playlists: a read returns only its own tracks; private playlists and edits are owner-only", async () => {
  const a = await makeUser("p1a");
  const b = await makeUser("p1b");
  const track = async (title) => (await pool.query("INSERT INTO music_tracks(title) VALUES ($1) RETURNING id", [title])).rows[0].id;
  const t1 = await track(`wm-one-${runId}`);
  const t2 = await track(`wm-two-${runId}`);
  const playlist = async (userId, name, isPublic) =>
    (await pool.query("INSERT INTO playlists(name, user_id, is_public) VALUES ($1,$2,$3) RETURNING id", [name, userId, isPublic])).rows[0].id;
  const pa = await playlist(a.id, `wm-public-${runId}`, true);
  const pb = await playlist(b.id, `wm-private-${runId}`, false);
  await pool.query("INSERT INTO playlist_tracks(playlist_id, track_id, position) VALUES ($1,$2,0)", [pa, t1]);
  await pool.query("INSERT INTO playlist_tracks(playlist_id, track_id, position) VALUES ($1,$2,0)", [pb, t2]);

  const readA = await api("GET", `/api/streaming/playlists/${pa}`, { token: a.token });
  assert.equal(readA.status, 200, readA.text);
  assert.deepEqual(readA.body.tracks.map((t) => t.id), [t1], "must not include tracks of other playlists");

  const privateAsOther = await api("GET", `/api/streaming/playlists/${pb}`, { token: a.token });
  assert.equal(privateAsOther.status, 404, privateAsOther.text);
  const privateAsOwner = await api("GET", `/api/streaming/playlists/${pb}`, { token: b.token });
  assert.equal(privateAsOwner.status, 200, privateAsOwner.text);
  assert.deepEqual(privateAsOwner.body.tracks.map((t) => t.id), [t2]);

  const editByOther = await api("PUT", `/api/streaming/playlists/${pa}`, { token: b.token, body: { name: "hijacked" } });
  assert.equal(editByOther.status, 404, editByOther.text);
  const editByOwner = await api("PUT", `/api/streaming/playlists/${pa}`, { token: a.token, body: { name: `renamed-${runId}` } });
  assert.equal(editByOwner.status, 200, editByOwner.text);
  assert.equal(editByOwner.body.playlist.name, `renamed-${runId}`);

  const addByOther = await api("POST", `/api/streaming/playlists/${pa}/tracks`, { token: b.token, body: { trackId: t2 } });
  assert.equal(addByOther.status, 403, addByOther.text);
});

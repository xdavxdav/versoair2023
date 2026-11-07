import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import paymentsRouter from "./payments";

const sender = { id: 7, role: "user" };

afterEach(() => {
  process.env.ONLINE_PAYMENTS_ENABLED = "false";
});

interface Wallet {
  id: number;
  user_id: number;
  balance: string;
  status: string;
}

// Wallets: user 7 has 100.00, user 8 has 5.00, user 10 has none yet. Users 7, 8, 10 exist.
function scriptedWalletDb(options: { failCredit?: boolean; raceOnWithdraw?: boolean } = {}) {
  const wallets: Wallet[] = [
    { id: 1, user_id: 7, balance: "100.00", status: "active" },
    { id: 2, user_id: 8, balance: "5.00", status: "active" },
  ];
  const userIds = new Set([7, 8, 10]);
  const adjust = (walletId: number, delta: number) => {
    const wallet = wallets.find((w) => w.id === walletId)!;
    wallet.balance = (parseFloat(wallet.balance) + delta).toFixed(2);
    return { rows: [{ balance: wallet.balance }] };
  };

  const db = scriptPool((sql, params) => {
    if (sql.startsWith("SELECT 1 FROM users WHERE id = $1")) {
      return { rows: userIds.has(Number(params[0])) ? [{ one: 1 }] : [] };
    }
    if (sql.startsWith("INSERT INTO platform_wallets (user_id, status)")) {
      const userId = Number(params[0]);
      if (!wallets.some((w) => w.user_id === userId)) {
        wallets.push({ id: 100 + userId, user_id: userId, balance: "0.00", status: "active" });
      }
      return undefined;
    }
    if (sql.includes("FROM platform_wallets") && sql.includes("FOR UPDATE")) {
      const ids = params[0] as number[];
      return { rows: wallets.filter((w) => ids.includes(w.user_id)).sort((a, b) => a.id - b.id) };
    }
    if (sql.includes("SET balance = COALESCE(balance, 0) - $1")) {
      return adjust(Number(params[1]), -Number(params[0]));
    }
    if (sql.includes("SET balance = COALESCE(balance, 0) + $1")) {
      if (options.failCredit) throw new Error("credit failed");
      return adjust(Number(params[1]), Number(params[0]));
    }
    if (sql.startsWith("SELECT id, balance FROM platform_wallets WHERE user_id = $1 AND status = 'active'")) {
      const wallet = wallets.find((w) => w.user_id === Number(params[0]) && w.status === "active");
      return { rows: wallet ? [{ id: wallet.id, balance: wallet.balance }] : [] };
    }
    if (sql.startsWith("UPDATE platform_wallets SET balance = balance - $1")) {
      if (options.raceOnWithdraw) return { rows: [] };
      return adjust(Number(params[2]), -Number(params[0]));
    }
    if (sql.startsWith("INSERT INTO wallet_transactions")) return { rows: [{ id: 1, created_at: "now" }] };
    return undefined;
  });
  return { db, wallets };
}

const transfer = (origin: string, body: unknown, account = sender) =>
  call(origin, "POST", "/wallet/transfer", { headers: signIn(account), body });
const statementsOf = (db: ReturnType<typeof scriptedWalletDb>["db"]) => db.log.map((entry) => entry.sql);
const mutations = (db: ReturnType<typeof scriptedWalletDb>["db"]) =>
  db.log.filter((entry) => /^(UPDATE|INSERT INTO wallet_transactions)/.test(entry.sql));

test("a transfer needs a sign-in, a valid amount, a valid recipient and a known type", async () => {
  const { db } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    assert.equal((await call(origin, "POST", "/wallet/transfer", { body: { recipientId: 8, amount: 1 } })).status, 401);

    for (const amount of [0, -5, "abc", 0.001, undefined, null]) {
      assert.equal((await transfer(origin, { recipientId: 8, amount })).status, 400, `amount ${String(amount)}`);
    }
    for (const recipientId of [undefined, "abc", true, 0, -1, 1.5, "8; DROP TABLE users"]) {
      assert.equal((await transfer(origin, { recipientId, amount: 1 })).status, 400, `recipient ${String(recipientId)}`);
    }
    const badType = await transfer(origin, { recipientId: 8, amount: 1, type: "withdrawal" });
    assert.equal(badType.status, 400);
  });
  assert.equal(db.connections, 0, "nothing was validated against the database");
});

test("sending credits to yourself is refused (it used to mint money)", async () => {
  const { db, wallets } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    // the string "7" from the session, and a recipient written three ways
    for (const recipientId of [7, "7", " 7 "]) {
      const res = await transfer(origin, { recipientId, amount: 50 });
      assert.equal(res.status, 400, String(recipientId));
      assert.match(res.body.error, /yourself/);
    }
  });
  assert.equal(db.connections, 0);
  assert.equal(wallets[0].balance, "100.00");
});

test("a transfer debits and credits in one transaction and conserves the money", async () => {
  const { db, wallets } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    const res = await transfer(origin, { recipientId: 8, amount: "12.5", description: "Thanks" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.senderBalance, "87.50");
  });

  assert.deepEqual(
    wallets.map((wallet) => wallet.balance),
    ["87.50", "17.50"],
  );
  const statements = statementsOf(db);
  assert.equal(statements[0], "BEGIN");
  assert.equal(statements.at(-1), "COMMIT");
  assert.ok(!statements.includes("ROLLBACK"));
  assert.equal(db.released, 1);

  const lock = db.matching("FOR UPDATE")[0];
  assert.match(lock.sql, /ORDER BY id FOR UPDATE/);
  assert.deepEqual(lock.params, [[7, 8]]);

  // both sides are recorded, in the same transaction
  const [ledger] = db.matching("INSERT INTO wallet_transactions");
  assert.equal(ledger.params[1], 7);
  assert.equal(ledger.params[10], 8);
});

test("a recipient without a wallet gets one on first receipt", async () => {
  const { db, wallets } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    assert.equal((await transfer(origin, { recipientId: 10, amount: 20 })).status, 200);
  });
  assert.deepEqual(wallets.find((wallet) => wallet.user_id === 10)?.balance, "20.00");
  assert.match(db.matching("INSERT INTO platform_wallets")[0].sql, /ON CONFLICT \(user_id\) DO NOTHING/);
});

test("an unknown recipient or too little balance rolls back without moving money", async () => {
  const { db, wallets } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    const unknown = await transfer(origin, { recipientId: 999, amount: 5 });
    assert.equal(unknown.status, 404);

    // user 8 only holds 5.00
    const broke = await transfer(origin, { recipientId: 7, amount: 50 }, { id: 8, role: "user" });
    assert.equal(broke.status, 402);
    assert.equal(broke.body.error, "Insufficient wallet balance");
  });
  assert.equal(mutations(db).length, 0);
  assert.equal(db.matching("ROLLBACK").length, 2);
  assert.equal(db.matching("COMMIT").length, 0);
  assert.equal(db.released, 2);
  assert.deepEqual(wallets.map((wallet) => wallet.balance), ["100.00", "5.00"]);
});

test("a failure half-way through a transfer rolls back and frees the connection", async () => {
  const { db } = scriptedWalletDb({ failCredit: true });
  await withRouter(paymentsRouter, async (origin) => {
    const res = await transfer(origin, { recipientId: 8, amount: 10 });
    assert.equal(res.status, 500);
  });
  const statements = statementsOf(db);
  assert.ok(statements.includes("ROLLBACK"));
  assert.ok(!statements.includes("COMMIT"));
  assert.equal(db.released, 1);
});

const withdraw = (origin: string, body: unknown) =>
  call(origin, "POST", "/wallet/withdraw", { headers: signIn(sender), body });

test("withdrawals stay closed while online payments are off", async () => {
  const { db } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    const res = await withdraw(origin, { amount: 20, paymentMethod: "wallet" });
    assert.equal(res.status, 503);
  });
  assert.equal(mutations(db).length, 0);
});

test("a withdrawal debits with a guard that cannot overdraw, fee included", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  const { db, wallets } = scriptedWalletDb();
  await withRouter(paymentsRouter, async (origin) => {
    assert.equal((await withdraw(origin, { amount: -1, paymentMethod: "wallet" })).status, 400);
    assert.equal((await withdraw(origin, { amount: 20, paymentMethod: "crypto" })).status, 400);
    assert.equal((await withdraw(origin, { amount: 20, paymentMethod: "nope" })).status, 400);
    assert.equal((await withdraw(origin, { amount: 5, paymentMethod: "wallet" })).status, 400);
    assert.equal((await withdraw(origin, { amount: 500, paymentMethod: "wallet" })).status, 402);
    assert.equal(mutations(db).length, 0);

    // 2.5% fee on 40 is 1.00, so 41.00 leaves the wallet
    const ok = await withdraw(origin, { amount: 40, paymentMethod: "wallet" });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.fee, "1.00");
    assert.equal(ok.body.netPayout, "39.00");
  });
  const [debit] = db.matching("UPDATE platform_wallets SET balance = balance - $1");
  assert.match(debit.sql, /WHERE id = \$3 AND balance >= \$1 RETURNING balance/);
  assert.deepEqual(debit.params, ["41.00", 40, 1]);
  assert.equal(wallets[0].balance, "59.00");
});

test("if another request spends the balance first, the withdrawal fails and records nothing", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  const { db } = scriptedWalletDb({ raceOnWithdraw: true });
  await withRouter(paymentsRouter, async (origin) => {
    const res = await withdraw(origin, { amount: 40, paymentMethod: "wallet" });
    assert.equal(res.status, 402);
    assert.equal(res.body.error, "Insufficient balance");
  });
  assert.equal(db.matching("INSERT INTO wallet_transactions").length, 0);
});

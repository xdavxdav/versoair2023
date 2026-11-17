import "../test-support/env";
import assert from "node:assert/strict";
import test, { afterEach, after, mock } from "node:test";
import { pool } from "../db";
import { processExpiredSubscriptions } from "./subscription-expiry";

// The pg pool keeps the event loop alive, so end the test process explicitly.
after(() => setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref());
afterEach(() => mock.restoreAll());

const AUTO_RENEWING =
  "EXISTS (SELECT 1 FROM plan_subscriptions ps WHERE ps.user_id = users.id AND ps.status = 'active')";

interface Cron {
  statements: string[];
  released: () => number;
}

/** Scripts the pool client the cron uses; every statement resolves to no rows. */
function scriptCron(options: {
  table: boolean;
  failOn?: (sql: string) => boolean;
}): Cron {
  const statements: string[] = [];
  let released = 0;
  const client = {
    async query(text: string) {
      const sql = text.replace(/\s+/g, " ").trim();
      statements.push(sql);
      if (options.failOn?.(sql)) throw new Error("connection terminated");
      if (sql.includes("to_regclass")) {
        return {
          rows: [{ name: options.table ? "plan_subscriptions" : null }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      released++;
    },
  };
  mock.method(pool, "connect", (async () => client) as never);
  return { statements, released: () => released };
}

const quiet = () => mock.method(console, "error", () => {});
const find = (cron: Cron, start: string) => {
  const found = cron.statements.find((sql) => sql.startsWith(start));
  assert.ok(found, `expected a statement starting with: ${start}`);
  return found;
};

const NEWLY_EXPIRED = "UPDATE users SET subscription_status = 'past_due'";
const HARD_DOWNGRADE = "UPDATE users SET subscription_tier = 'free'";
const LISTENER_REMINDERS = "SELECT id, username, subscription_tier, premium_expires_at FROM users";

test("subscribers on automatic renewal get two days of slack and no renewal reminder", async () => {
  const cron = scriptCron({ table: true });
  await processExpiredSubscriptions();

  const newlyExpired = find(cron, NEWLY_EXPIRED);
  assert.ok(
    newlyExpired.includes("premium_expires_at < NOW() - INTERVAL '2 days'"),
    "an active subscriber is only expired once Stripe has had two days to renew",
  );
  assert.ok(
    newlyExpired.includes(`OR NOT ${AUTO_RENEWING}`),
    "a plan with no active subscription still expires immediately",
  );

  const reminders = find(cron, LISTENER_REMINDERS);
  assert.ok(
    reminders.includes(`AND NOT ${AUTO_RENEWING}`),
    "Stripe renews these plans, so a 'renew now' reminder would be wrong",
  );
});

test("the 7-day hard downgrade never consults subscriptions: a failed renewal still ends access", async () => {
  const cron = scriptCron({ table: true });
  await processExpiredSubscriptions();

  const hard = find(cron, HARD_DOWNGRADE);
  assert.ok(!hard.includes("plan_subscriptions"));
  assert.ok(hard.includes("premium_expires_at < NOW() - INTERVAL '7 days'"));
});

test("without the optional table the cron runs exactly the original statements", async () => {
  const cron = scriptCron({ table: false });
  await processExpiredSubscriptions();

  const offenders = cron.statements.filter(
    (sql) => sql.includes("plan_subscriptions") && !sql.includes("to_regclass"),
  );
  assert.deepEqual(offenders, [], "a missing table must never be referenced");

  const newlyExpired = find(cron, NEWLY_EXPIRED);
  assert.ok(!newlyExpired.includes("INTERVAL '2 days'"));
  assert.ok(
    newlyExpired.includes(
      "AND subscription_status = 'active' RETURNING id, username",
    ),
    "the original expiry condition is unchanged",
  );
  assert.ok(
    find(cron, LISTENER_REMINDERS).includes(
      "AND subscription_tier != 'free' AND id NOT IN (",
    ),
  );
});

test("the table check runs first inside the transaction, so a missing table cannot abort it", async () => {
  const cron = scriptCron({ table: true });
  await processExpiredSubscriptions();

  assert.equal(cron.statements[0], "BEGIN");
  assert.ok(cron.statements[1].includes("to_regclass('public.plan_subscriptions')"));
  assert.equal(cron.statements.at(-1), "COMMIT");
  assert.equal(cron.released(), 1);
  assert.equal(
    cron.statements.filter((sql) => sql.includes("to_regclass")).length,
    1,
  );
});

test("a failing check rolls back, releases the connection and does not crash the scheduler", async () => {
  const errors = quiet();
  const cron = scriptCron({
    table: true,
    failOn: (sql) => sql.includes("to_regclass"),
  });
  await processExpiredSubscriptions();

  assert.equal(cron.statements.at(-1), "ROLLBACK");
  assert.equal(
    cron.statements.filter((sql) => sql.startsWith("UPDATE")).length,
    0,
    "nothing is expired when the lifecycle check cannot run",
  );
  assert.equal(cron.released(), 1);
  assert.equal(errors.mock.callCount(), 1);
});

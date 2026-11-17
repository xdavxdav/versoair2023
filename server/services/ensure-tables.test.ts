import assert from "node:assert/strict";
import test from "node:test";
import { getTableColumns } from "drizzle-orm";
import type { PoolClient } from "pg";

import { planSubscriptions, printJobs } from "../../shared/schema";
import { ensureAllTables } from "./ensure-tables.ts";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

test("reports an explicitly skipped schema check as skipped", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DISABLE_DB_CHECK = "true";
  process.env.NODE_ENV = "test";

  try {
    const result = await ensureAllTables(async () => {
      throw new Error("database connection should not be attempted");
    });
    assert.equal(result, "skipped");
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("refuses to skip the required schema check in production", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DISABLE_DB_CHECK = "true";
  process.env.NODE_ENV = "production";

  try {
    await assert.rejects(
      ensureAllTables(async () => {
        throw new Error("database connection should not be attempted");
      }),
      /DISABLE_DB_CHECK cannot be used in production/,
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("fails the required startup check when the database cannot be reached", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;

  try {
    await assert.rejects(
      ensureAllTables(async () => {
        throw new Error("connection refused");
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "Database unavailable during required boot check; refusing to start.",
        );
        assert.ok(error.cause instanceof Error);
        assert.equal(error.cause.message, "connection refused");
        return true;
      },
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("fails startup when any schema operation failed and releases the client", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  let released = false;
  const client = {
    async query(query: string) {
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      if (query.includes("CREATE TABLE IF NOT EXISTS countries")) {
        throw new Error("permission denied");
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      released = true;
    },
  } as unknown as PoolClient;

  try {
    await assert.rejects(
      ensureAllTables(async () => client),
      /Schema boot check failed: 1 schema operation\./,
    );
    assert.equal(released, true);
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("repairs user columns required by the Drizzle registration insert", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  const queries: string[] = [];
  const client = {
    async query(query: string) {
      queries.push(query);
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  } as unknown as PoolClient;

  try {
    const result = await ensureAllTables(async () => client);
    assert.equal(result, "verified");

    for (const columnDefinition of [
      "must_change_password BOOLEAN DEFAULT FALSE",
      "display_name TEXT",
      "verified_at TIMESTAMP",
      "previous_role VARCHAR(20)",
      "date_of_birth DATE",
      "age_verified_at TIMESTAMP",
    ]) {
      assert.ok(
        queries.some((query) =>
          query.includes(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${columnDefinition}`,
          ),
        ),
        `expected startup schema repair for ${columnDefinition}`,
      );
    }
    assert.ok(
      queries.some((query) =>
        query.includes("CREATE TABLE IF NOT EXISTS inbox_conversations"),
      ),
      "expected startup repair for inbox_conversations",
    );
    assert.ok(
      queries.some((query) =>
        query.includes("CREATE TABLE IF NOT EXISTS inbox_messages"),
      ),
      "expected startup repair for inbox_messages",
    );
    assert.ok(
      queries.some((query) =>
        query.includes(
          "ALTER TABLE inbox_attachments ADD COLUMN IF NOT EXISTS uploaded_by INTEGER",
        ),
      ),
      "expected startup repair for inbox_attachments.uploaded_by",
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("adds the message send key column and its partial unique index idempotently", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  const queries: string[] = [];
  const client = {
    async query(query: string) {
      queries.push(query.replace(/\s+/g, " ").trim());
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  } as unknown as PoolClient;

  try {
    assert.equal(await ensureAllTables(async () => client), "verified");

    const createTable = queries.find((query) =>
      query.includes("CREATE TABLE IF NOT EXISTS inbox_messages"),
    );
    assert.ok(createTable, "expected the inbox_messages table to be ensured");
    assert.match(createTable, /client_message_id TEXT(,| \))/);
    assert.doesNotMatch(createTable, /client_message_id TEXT[^,)]*(NOT NULL|DEFAULT|UNIQUE)/);

    const addColumn = queries.findIndex(
      (query) =>
        query ===
        "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS client_message_id TEXT",
    );
    assert.notEqual(
      addColumn,
      -1,
      "expected a nullable, default-less client_message_id column on older databases",
    );

    const index = queries.findIndex(
      (query) =>
        query ===
        "CREATE UNIQUE INDEX IF NOT EXISTS inbox_msg_client_key_uidx ON inbox_messages (conversation_id, sender_id, client_message_id) WHERE client_message_id IS NOT NULL",
    );
    assert.notEqual(
      index,
      -1,
      "expected a partial unique index so only keyed sends are constrained",
    );
    assert.ok(addColumn < index, "the column must exist before its index");

    assert.equal(
      queries.filter(
        (query) =>
          /client_message_id/.test(query) && /^(UPDATE|INSERT|DELETE)\b/i.test(query),
      ).length,
      0,
      "the key column must not be backfilled or rewritten",
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("adds the print job tracking number column the shipping update writes", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  const queries: string[] = [];
  const client = {
    async query(query: string) {
      queries.push(query.replace(/\s+/g, " ").trim());
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  } as unknown as PoolClient;

  try {
    assert.equal(await ensureAllTables(async () => client), "verified");

    assert.ok(
      queries.includes(
        "ALTER TABLE IF EXISTS print_jobs ADD COLUMN IF NOT EXISTS tracking_number TEXT",
      ),
      "expected an additive, nullable tracking_number repair for older databases",
    );
    assert.equal(
      getTableColumns(printJobs).trackingNumber.name,
      "tracking_number",
      "the Drizzle model must use the same column name as the repair",
    );
    assert.equal(
      queries.filter(
        (query) =>
          /print_jobs/.test(query) &&
          /^(UPDATE|INSERT|DELETE|DROP|TRUNCATE)\b/i.test(query),
      ).length,
      0,
      "the repair must not rewrite or drop print job rows",
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("does not block startup when the optional print job column cannot be added", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  let released = false;
  const client = {
    async query(query: string) {
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      if (query.includes("print_jobs ADD COLUMN")) {
        throw new Error("must be owner of table print_jobs");
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      released = true;
    },
  } as unknown as PoolClient;

  try {
    assert.equal(await ensureAllTables(async () => client), "verified");
    assert.equal(released, true);
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("creates the recurring plan subscriptions table additively, matching the Drizzle model", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  const queries: string[] = [];
  const client = {
    async query(query: string) {
      queries.push(query.replace(/\s+/g, " ").trim());
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  } as unknown as PoolClient;

  try {
    assert.equal(await ensureAllTables(async () => client), "verified");

    const create = queries.find((query) =>
      query.startsWith("CREATE TABLE IF NOT EXISTS plan_subscriptions"),
    );
    assert.ok(create, "expected the plan_subscriptions table to be created");
    assert.ok(
      queries.includes(
        "CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_user ON plan_subscriptions(user_id)",
      ),
      "expected the per-user lookup index",
    );
    assert.match(
      create,
      /stripe_subscription_id VARCHAR NOT NULL UNIQUE/,
      "one row per Stripe subscription",
    );

    const ddlColumns = [
      ...create.matchAll(/(?:\(|,)\s*([a-z_]+) (?:SERIAL|INTEGER|VARCHAR|TIMESTAMP)/g),
    ]
      .map((match) => match[1])
      .sort();
    const modelColumns = Object.values(getTableColumns(planSubscriptions))
      .map((column) => column.name)
      .sort();
    assert.deepEqual(
      ddlColumns,
      modelColumns,
      "the boot repair and the Drizzle model must describe the same columns",
    );

    assert.equal(
      queries.filter(
        (query) =>
          /plan_subscriptions/.test(query) &&
          /^(UPDATE|INSERT|DELETE|DROP|TRUNCATE|ALTER)\b/i.test(query),
      ).length,
      0,
      "the repair must only create what is missing",
    );
    assert.equal(
      queries.filter(
        (query) =>
          /^ALTER TABLE (IF EXISTS )?users\b/i.test(query) &&
          /plan_subscriptions|recurring|stripe_subscription/i.test(query),
      ).length,
      0,
      "recurring billing must not add columns to the users table",
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("does not block startup when the optional plan subscriptions table cannot be created", async () => {
  const previousDisableFlag = process.env.DISABLE_DB_CHECK;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DISABLE_DB_CHECK;
  process.env.NODE_ENV = "test";
  const queries: string[] = [];
  let released = false;
  const client = {
    async query(query: string) {
      queries.push(query.replace(/\s+/g, " ").trim());
      if (query.includes("information_schema.tables")) {
        return { rows: [{ table_name: "users" }], rowCount: 1 };
      }
      if (query.includes("plan_subscriptions")) {
        throw new Error("permission denied for schema public");
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      released = true;
    },
  } as unknown as PoolClient;

  try {
    assert.equal(await ensureAllTables(async () => client), "verified");
    assert.equal(released, true);
    const failedAt = queries.findIndex((query) => query.includes("plan_subscriptions"));
    assert.ok(failedAt >= 0, "the repair must have been attempted");
    assert.ok(
      queries.slice(failedAt + 1).some((query) => query.includes("INSERT INTO issued_cardholders")),
      "later startup repairs must still run after the optional one fails",
    );
  } finally {
    restoreEnv("DISABLE_DB_CHECK", previousDisableFlag);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

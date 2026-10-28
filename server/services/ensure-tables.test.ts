import assert from "node:assert/strict";
import test from "node:test";
import type { PoolClient } from "pg";

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

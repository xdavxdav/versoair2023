import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import { automationActions, automationOutbox } from "../../shared/schema";
import {
  AUTOMATION_SCHEMA_LOCK_KEY,
  AUTOMATION_SCHEMA_STATEMENTS,
  ensureAutomationSchema,
  type AutomationSchemaClient,
} from "./automation-schema";

const MIGRATION_PATH = new URL(
  "../../migrations/0008_automation_outbox.sql",
  import.meta.url,
);
const JOURNAL_PATH = new URL(
  "../../migrations/meta/_journal.json",
  import.meta.url,
);

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").replace(/\s*;\s*$/, "").trim();
}

function createFakePool(options: { failOn?: RegExp } = {}) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const released: Array<Error | boolean | undefined> = [];
  let connects = 0;
  const client: AutomationSchemaClient = {
    async query(text, values) {
      calls.push({ text, values });
      if (options.failOn?.test(text)) throw new Error("ddl exploded");
      return { rows: [] };
    },
    release(error) {
      released.push(error);
    },
  };
  return {
    pool: {
      async connect() {
        connects += 1;
        return client;
      },
    },
    calls,
    released,
    connects: () => connects,
  };
}

test("migration 0008 carries exactly the same statements as the runtime schema", () => {
  const migration = readFileSync(MIGRATION_PATH, "utf8");
  const migrationStatements = migration
    .split("--> statement-breakpoint")
    .map(normalizeSql)
    .filter(Boolean);
  assert.deepEqual(
    migrationStatements,
    AUTOMATION_SCHEMA_STATEMENTS.map(normalizeSql),
  );
});

test("every schema statement is idempotent and schema-qualified", () => {
  for (const statement of AUTOMATION_SCHEMA_STATEMENTS) {
    assert.match(statement, /^CREATE (TABLE|INDEX) IF NOT EXISTS /);
    assert.doesNotMatch(statement, /\b(DROP|TRUNCATE)\b|\bDELETE\s+FROM\b/i);
  }
  assert.ok(
    AUTOMATION_SCHEMA_STATEMENTS.some((s) => s.includes("public.automation_outbox")),
  );
});

test("journal registers 0008 after 0007 with a later timestamp", () => {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as {
    entries: Array<{ idx: number; when: number; tag: string }>;
  };
  const position = journal.entries.findIndex((entry) => entry.tag === "0008_automation_outbox");
  assert.ok(position > 0, "0008 is registered in the journal");
  const entry = journal.entries[position];
  const previous = journal.entries[position - 1];
  assert.equal(previous.tag, "0007_inbox_attachment_uploader");
  assert.equal(entry.idx, previous.idx + 1);
  assert.ok(entry.when > previous.when);
});

test("Drizzle definitions match the DDL column names, types and nullability", () => {
  const tables = [
    { name: "automation_outbox", table: automationOutbox, statement: 0 },
    { name: "automation_actions", table: automationActions, statement: 3 },
  ];
  for (const { name, table, statement } of tables) {
    const ddlColumns = new Map<string, { type: string; notNull: boolean }>();
    for (const line of AUTOMATION_SCHEMA_STATEMENTS[statement].split("\n")) {
      const match = /^ {2}([a-z_]+) ([A-Z]+(?:\(\d+\))?)(.*?),?$/.exec(line);
      if (!match || match[1] === "constraint") continue;
      const [, column, rawType, rest] = match;
      const type = rawType === "TIMESTAMPTZ"
        ? "timestamp with time zone"
        : rawType.toLowerCase();
      ddlColumns.set(column, {
        type,
        notNull: /NOT NULL|PRIMARY KEY/.test(rest) || rawType === "SERIAL",
      });
    }

    const config = getTableConfig(table);
    assert.equal(config.name, name);
    assert.deepEqual(
      config.columns.map((column) => column.name),
      [...ddlColumns.keys()],
      `${name}: column order and names`,
    );
    for (const column of config.columns) {
      const expected = ddlColumns.get(column.name)!;
      assert.equal(column.getSQLType(), expected.type, `${name}.${column.name} type`);
      assert.equal(column.notNull, expected.notNull, `${name}.${column.name} nullability`);
    }
  }
});

test("Drizzle declares the same status check as the DDL, so db:push does not drop it", () => {
  const ddl = AUTOMATION_SCHEMA_STATEMENTS[0];
  assert.match(ddl, /CONSTRAINT automation_outbox_status_check/);
  const literals = (text: string) => text.match(/'[a-z]+'/g);

  const { checks } = getTableConfig(automationOutbox);
  assert.deepEqual(checks.map((c) => c.name), ["automation_outbox_status_check"]);
  const drizzleSql = new PgDialect().sqlToQuery(checks[0].value).sql;
  assert.ok(literals(drizzleSql)?.length);
  assert.deepEqual(literals(drizzleSql), literals(ddl.slice(ddl.indexOf("status_check"))));
});

test("ensureAutomationSchema runs all DDL in one locked transaction", async () => {
  const { pool, calls, released } = createFakePool();
  await ensureAutomationSchema(pool);

  const texts = calls.map((call) => call.text);
  assert.equal(texts[0], "BEGIN");
  assert.match(texts[1], /pg_advisory_xact_lock/);
  assert.deepEqual(calls[1].values, [AUTOMATION_SCHEMA_LOCK_KEY]);
  assert.deepEqual(
    texts.slice(2, 2 + AUTOMATION_SCHEMA_STATEMENTS.length),
    [...AUTOMATION_SCHEMA_STATEMENTS],
  );
  assert.equal(texts.at(-1), "COMMIT");
  assert.deepEqual(released, [undefined]);
});

test("ensureAutomationSchema is memoized per pool and shared by concurrent callers", async () => {
  const fake = createFakePool();
  await Promise.all([
    ensureAutomationSchema(fake.pool),
    ensureAutomationSchema(fake.pool),
  ]);
  await ensureAutomationSchema(fake.pool);
  assert.equal(fake.connects(), 1);

  const other = createFakePool();
  await ensureAutomationSchema(other.pool);
  assert.equal(other.connects(), 1);
});

test("a failed attempt rolls back, discards the connection and can be retried", async () => {
  const failing = createFakePool({ failOn: /CREATE INDEX IF NOT EXISTS automation_outbox_due_idx/ });
  await assert.rejects(ensureAutomationSchema(failing.pool), /ddl exploded/);

  const texts = failing.calls.map((call) => call.text);
  assert.equal(texts.at(-1), "ROLLBACK");
  assert.ok(!texts.includes("COMMIT"));
  assert.equal(failing.released.length, 1);
  assert.ok(failing.released[0] instanceof Error);

  await assert.rejects(ensureAutomationSchema(failing.pool), /ddl exploded/);
  assert.equal(failing.connects(), 2);
});

test("lock key does not collide with existing advisory lock keys", () => {
  const existing = [
    74182001, 74182002, 74182003, 74319018, 74319019, 74319020,
  ];
  assert.ok(!existing.includes(AUTOMATION_SCHEMA_LOCK_KEY));
});

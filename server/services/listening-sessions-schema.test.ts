import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import { SESSION_LIMITS } from "../../shared/listening-session";
import { listeningSessions, playlists, users } from "../../shared/schema";
import { AUTOMATION_SCHEMA_LOCK_KEY } from "./automation-schema";
import {
  LISTENING_SESSIONS_SCHEMA_LOCK_KEY,
  LISTENING_SESSIONS_SCHEMA_STATEMENTS,
  ensureListeningSessionsSchema,
  type ListeningSessionsSchemaClient,
} from "./listening-sessions-schema";

const MIGRATION_PATH = new URL(
  "../../migrations/0009_listening_sessions.sql",
  import.meta.url,
);
const JOURNAL_PATH = new URL(
  "../../migrations/meta/_journal.json",
  import.meta.url,
);

const TABLE_DDL = LISTENING_SESSIONS_SCHEMA_STATEMENTS[0];

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").replace(/\s*;\s*$/, "").trim();
}

function createFakePool(options: { failOn?: RegExp } = {}) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const released: Array<Error | boolean | undefined> = [];
  let connects = 0;
  const client: ListeningSessionsSchemaClient = {
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

test("migration 0009 carries exactly the same statements as the runtime schema", () => {
  const migration = readFileSync(MIGRATION_PATH, "utf8");
  const migrationStatements = migration
    .split("--> statement-breakpoint")
    .map(normalizeSql)
    .filter(Boolean);
  assert.deepEqual(
    migrationStatements,
    LISTENING_SESSIONS_SCHEMA_STATEMENTS.map(normalizeSql),
  );
});

test("every schema statement is additive, idempotent and schema-qualified", () => {
  for (const statement of LISTENING_SESSIONS_SCHEMA_STATEMENTS) {
    assert.match(statement, /^CREATE (TABLE|INDEX) IF NOT EXISTS /);
    assert.doesNotMatch(statement, /\b(DROP|TRUNCATE|ALTER)\b|\bDELETE\s+FROM\b/i);
    assert.match(statement, /public\.listening_sessions/);
  }
});

test("journal registers 0009 right after 0008 with a later timestamp", () => {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as {
    entries: Array<{ idx: number; when: number; tag: string }>;
  };
  const position = journal.entries.findIndex((entry) => entry.tag === "0009_listening_sessions");
  assert.ok(position > 0, "0009 is registered in the journal");
  const entry = journal.entries[position];
  const previous = journal.entries[position - 1];
  assert.equal(previous.tag, "0008_automation_outbox");
  assert.equal(entry.idx, previous.idx + 1);
  assert.ok(entry.when > previous.when);
  const idxs = journal.entries.map((entry) => entry.idx);
  assert.deepEqual(idxs, idxs.map((_, index) => index), "journal indexes are contiguous");
});

test("Drizzle definition matches the DDL column names, types and nullability", () => {
  const ddlColumns = new Map<string, { type: string; notNull: boolean }>();
  for (const line of TABLE_DDL.split("\n")) {
    const match = /^ {2}([a-z_]+) ([A-Z]+(?:\(\d+\))?)(.*?),?$/.exec(line);
    if (!match) continue;
    const [, column, rawType, rest] = match;
    const type =
      rawType === "TIMESTAMPTZ" ? "timestamp with time zone" : rawType.toLowerCase();
    ddlColumns.set(column, {
      type,
      notNull: /NOT NULL|PRIMARY KEY/.test(rest) || rawType === "SERIAL",
    });
  }

  const config = getTableConfig(listeningSessions);
  assert.equal(config.name, "listening_sessions");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [...ddlColumns.keys()],
    "column order and names",
  );
  for (const column of config.columns) {
    const expected = ddlColumns.get(column.name)!;
    assert.equal(column.getSQLType(), expected.type, `${column.name} type`);
    assert.equal(column.notNull, expected.notNull, `${column.name} nullability`);
  }
});

test("Drizzle declares the same three checks as the DDL, so db:push does not drop them", () => {
  const { checks } = getTableConfig(listeningSessions);
  const names = checks.map((check) => check.name).sort();
  assert.deepEqual(names, [
    "listening_sessions_gap_check",
    "listening_sessions_status_check",
    "listening_sessions_window_check",
  ]);
  for (const name of names) {
    assert.match(TABLE_DDL, new RegExp(`CONSTRAINT ${name}\\b`));
  }

  const dialect = new PgDialect();
  const drizzleExpression = (name: string) =>
    normalizeSql(
      dialect.sqlToQuery(checks.find((check) => check.name === name)!.value).sql,
    );
  const ddlExpression = (name: string) => {
    const match = new RegExp(`CONSTRAINT ${name} CHECK \\((.+?)\\)(?:,| \\)$)`).exec(
      normalizeSql(TABLE_DDL),
    );
    assert.ok(match, `${name} is declared in the DDL`);
    return match[1];
  };

  for (const name of names) {
    assert.equal(drizzleExpression(name), ddlExpression(name), name);
  }
  assert.equal(
    ddlExpression("listening_sessions_status_check"),
    "status IN ('scheduled', 'live', 'ended', 'cancelled')",
  );
  assert.equal(ddlExpression("listening_sessions_window_check"), "ends_at > starts_at");
  assert.equal(
    ddlExpression("listening_sessions_gap_check"),
    "gap_seconds >= 0 AND gap_seconds <= 300",
  );
});

test("the DDL limits are the same numbers the API enforces", () => {
  assert.match(TABLE_DDL, new RegExp(`title VARCHAR\\(${SESSION_LIMITS.titleMax}\\)`));
  assert.match(
    TABLE_DDL,
    new RegExp(`gap_seconds <= ${SESSION_LIMITS.gapSecondsMax}\\)`),
  );
});

test("foreign keys point at integer ids and never block deleting a user or playlist", () => {
  const config = getTableConfig(listeningSessions);
  const targets = config.foreignKeys.map((fk) => {
    const reference = fk.reference();
    return {
      from: reference.columns.map((column) => column.name),
      to: getTableConfig(reference.foreignTable).name,
      toType: reference.foreignColumns.map((column) => column.getSQLType()),
      onDelete: fk.onDelete,
    };
  });
  assert.deepEqual(targets, [
    { from: ["host_user_id"], to: "users", toType: ["serial"], onDelete: "set null" },
    { from: ["playlist_id"], to: "playlists", toType: ["serial"], onDelete: "set null" },
  ]);
  assert.equal(getTableConfig(users).name, "users");
  assert.equal(getTableConfig(playlists).name, "playlists");

  const ddlTargets = Array.from(
    TABLE_DDL.matchAll(/REFERENCES public\.(\w+) \(id\) ON DELETE SET NULL/g),
    (match) => match[1],
  );
  assert.deepEqual(ddlTargets, ["users", "playlists"]);
  for (const column of ["host_user_id INTEGER", "playlist_id INTEGER"]) {
    assert.ok(TABLE_DDL.includes(`  ${column},`), `${column} is a nullable integer`);
  }
});

test("starts_at is indexed in the DDL and in Drizzle", () => {
  assert.match(
    LISTENING_SESSIONS_SCHEMA_STATEMENTS[1],
    /listening_sessions_starts_at_idx\s+ON public\.listening_sessions \(starts_at\)/,
  );
  const indexes = getTableConfig(listeningSessions).indexes.map((i) => i.config.name);
  assert.deepEqual(indexes, ["listening_sessions_starts_at_idx"]);
});

test("ensureListeningSessionsSchema runs all DDL in one locked transaction", async () => {
  const { pool, calls, released } = createFakePool();
  await ensureListeningSessionsSchema(pool);

  const texts = calls.map((call) => call.text);
  assert.equal(texts[0], "BEGIN");
  assert.match(texts[1], /pg_advisory_xact_lock/);
  assert.deepEqual(calls[1].values, [LISTENING_SESSIONS_SCHEMA_LOCK_KEY]);
  assert.deepEqual(
    texts.slice(2, 2 + LISTENING_SESSIONS_SCHEMA_STATEMENTS.length),
    [...LISTENING_SESSIONS_SCHEMA_STATEMENTS],
  );
  assert.equal(texts.at(-1), "COMMIT");
  assert.deepEqual(released, [undefined]);
});

test("ensureListeningSessionsSchema is memoized per pool and shared by concurrent callers", async () => {
  const fake = createFakePool();
  await Promise.all([
    ensureListeningSessionsSchema(fake.pool),
    ensureListeningSessionsSchema(fake.pool),
  ]);
  await ensureListeningSessionsSchema(fake.pool);
  assert.equal(fake.connects(), 1);

  const other = createFakePool();
  await ensureListeningSessionsSchema(other.pool);
  assert.equal(other.connects(), 1);
});

test("a failed attempt rolls back, discards the connection and can be retried", async () => {
  const failing = createFakePool({
    failOn: /CREATE INDEX IF NOT EXISTS listening_sessions_starts_at_idx/,
  });
  await assert.rejects(ensureListeningSessionsSchema(failing.pool), /ddl exploded/);

  const texts = failing.calls.map((call) => call.text);
  assert.equal(texts.at(-1), "ROLLBACK");
  assert.ok(!texts.includes("COMMIT"));
  assert.equal(failing.released.length, 1);
  assert.ok(failing.released[0] instanceof Error);

  await assert.rejects(ensureListeningSessionsSchema(failing.pool), /ddl exploded/);
  assert.equal(failing.connects(), 2);
});

test("a failed rollback does not hide the original error", async () => {
  const failing = createFakePool({ failOn: /ROLLBACK|CREATE TABLE/ });
  await assert.rejects(ensureListeningSessionsSchema(failing.pool), /ddl exploded/);
});

test("lock key does not collide with existing advisory lock keys", () => {
  const existing = [
    74182001, 74182002, 74182003, 74319018, 74319019, 74319020,
    AUTOMATION_SCHEMA_LOCK_KEY,
  ];
  assert.ok(!existing.includes(LISTENING_SESSIONS_SCHEMA_LOCK_KEY));
});

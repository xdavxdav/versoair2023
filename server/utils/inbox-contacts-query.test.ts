import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { PgDialect } from "drizzle-orm/pg-core";

import { buildContactsQuery } from "./inbox-contacts-query";

const dialect = new PgDialect();
const compile = (userId: number, search: string, limit: number) =>
  dialect.sqlToQuery(buildContactsQuery(userId, search, limit));

test("followed/connected-first ordering runs outside SELECT DISTINCT", () => {
  const { sql: text } = compile(7, "bob", 40);
  const flat = text.replace(/\s+/g, " ").trim();

  assert.match(flat, /SELECT \* FROM \( SELECT DISTINCT /);
  assert.equal(flat.match(/ORDER BY/g)?.length, 1);
  assert.ok(
    flat.indexOf("ORDER BY") > flat.indexOf(") AS contacts"),
    "ORDER BY must follow the DISTINCT subquery",
  );
  assert.match(
    flat,
    /\) AS contacts ORDER BY \("isFollowing" OR "isConnection"\) DESC, id DESC LIMIT \$\d+$/,
  );
});

test("a search term filters by name and binds the pattern as a parameter", () => {
  const { sql: text, params } = compile(7, "bob", 25);

  assert.equal(params.filter((p) => p === "%bob%").length, 3);
  assert.equal(params.at(-1), 25);
  assert.doesNotMatch(text, /bob/);
  assert.doesNotMatch(text, /u\.role IN/);
});

test("with no search it offers followed, connected, existing and staff-listed members", () => {
  const { sql: text, params } = compile(7, "", 40);

  assert.match(text, /u\.role IN \('artist', 'business', 'admin'\)/);
  assert.ok(!params.some((p) => typeof p === "string"));
});

// Runs the real statement against PostgreSQL inside a rolled-back transaction.
// Only a local database is accepted, so it can never touch shared or production data.
const databaseUrl = process.env.INBOX_TEST_DATABASE_URL;
const isLocalDatabase =
  !!databaseUrl && /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
const databaseTest = isLocalDatabase ? test : test.skip;

databaseTest("contacts query executes on PostgreSQL and lists connections first", async () => {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN");
    const tag = `ct${Date.now().toString(36)}`;
    const insertUser = async (suffix: string): Promise<number> => {
      const result = await client.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, 'x') RETURNING id",
        [`${tag}_${suffix}`, `${tag}_${suffix}@example.test`],
      );
      return Number(result.rows[0].id);
    };
    const me = await insertUser("me");
    const friend = await insertUser("friend");
    const stranger = await insertUser("zstranger");
    await client.query(
      "INSERT INTO connections (requester_id, receiver_id, status) VALUES ($1, $2, 'accepted')",
      [me, friend],
    );

    const run = async (search: string) => {
      const { sql: text, params } = compile(me, search, 40);
      return (await client.query(text, params as unknown[])).rows;
    };

    // Plain id-descending order would put the newer stranger first.
    const searched = await run(tag);
    assert.deepEqual(
      searched.map((row) => Number(row.id)),
      [friend, stranger],
    );
    assert.equal(searched[0].isConnection, true);
    assert.equal(searched[1].isConnection, false);

    const defaults = (await run("")).map((row) => Number(row.id));
    assert.ok(defaults.includes(friend));
    assert.ok(!defaults.includes(stranger));
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});

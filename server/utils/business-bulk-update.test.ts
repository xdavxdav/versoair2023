import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BULK_UPDATE_MAX_ROWS,
  buildBulkUpdateStatement,
  parseBulkBusinessUpdates,
} from "./business-bulk-update";

function parseOk(updates: unknown) {
  const result = parseBulkBusinessUpdates(updates);
  assert.equal(result.ok, true, JSON.stringify(result));
  return (result as Extract<typeof result, { ok: true }>).updates;
}

function parseError(updates: unknown): string {
  const result = parseBulkBusinessUpdates(updates);
  assert.equal(result.ok, false, "expected the payload to be rejected");
  return (result as Extract<typeof result, { ok: false }>).message;
}

test("accepts allowlisted camelCase and snake_case keys and normalises values", () => {
  const [update] = parseOk([
    {
      id: 7,
      name: "  Chez Awa  ",
      countryCode: "ci",
      is_active: false,
      isVerified: true,
      rating: 4.5,
      approval_status: "approved",
      email: "contact@example.test",
      description: "",
    },
  ]);
  assert.equal(update.id, 7);
  const byColumn = Object.fromEntries(
    update.assignments.map((a) => [a.column, a.value]),
  );
  assert.deepEqual(byColumn, {
    name: "Chez Awa",
    country_code: "CI",
    is_active: false,
    is_verified: true,
    rating: 4.5,
    approval_status: "approved",
    email: "contact@example.test",
    description: null,
  });
});

test("accepts a numeric-string id and rejects every other id shape", () => {
  assert.equal(parseOk([{ id: "12", isActive: true }])[0].id, 12);
  for (const id of [0, -3, 1.5, "abc", "1; DROP TABLE businesses", "", null, undefined, 2_147_483_648, "99999999999", {}, [1]]) {
    assert.match(
      parseError([{ id, isActive: true }]),
      /updates\[0\]\.id must be a positive integer/,
      `id ${JSON.stringify(id)}`,
    );
  }
});

test("rejects a missing, empty, non-array or oversize batch", () => {
  for (const updates of [undefined, null, [], {}, "x", 5]) {
    assert.match(parseError(updates), /non-empty array/);
  }
  const oversize = Array.from({ length: BULK_UPDATE_MAX_ROWS + 1 }, (_, i) => ({
    id: i + 1,
    isActive: true,
  }));
  assert.match(parseError(oversize), /limited to 100 businesses/);
  assert.equal(
    parseOk(oversize.slice(0, BULK_UPDATE_MAX_ROWS)).length,
    BULK_UPDATE_MAX_ROWS,
  );
});

test("rejects non-object entries and entries with nothing to update", () => {
  for (const entry of [null, 5, "x", [1, 2]]) {
    assert.match(parseError([entry]), /updates\[0\] must be an object/);
  }
  assert.match(parseError([{ id: 3 }]), /updates\[0\] has no fields to update/);
});

test("rejects every column that is not on the allowlist, including injection-shaped keys", () => {
  const hostileKeys = [
    "name = 'pwned', description",
    "name = name; DROP TABLE businesses; --",
    "is_active = true WHERE 1=1 --",
    '"name"',
    "ad_balance",
    "adBalance",
    "owner_id",
    "ownerId",
    "approved_by",
    "verified_at",
    "id2",
    "ID",
    "constructor",
    "toString",
    "__proto__",
  ];
  for (const key of hostileKeys) {
    const payload = JSON.parse(`[{"id": 1, ${JSON.stringify(key)}: "x"}]`);
    assert.match(parseError(payload), /cannot be bulk-updated/, `key ${key}`);
  }
});

test("a rejected row anywhere in the batch rejects the whole batch", () => {
  const message = parseError([
    { id: 1, isActive: true },
    { id: 2, name: "ok" },
    { id: 3, "evil = 1, name": "x" },
  ]);
  assert.match(message, /updates\[2\]/);
});

test("rejects the same column given twice through its two spellings", () => {
  assert.match(
    parseError([{ id: 1, isActive: true, is_active: false }]),
    /is_active is given more than once/,
  );
});

test("validates every field type", () => {
  const bad: Array<[Record<string, unknown>, RegExp]> = [
    [{ name: "" }, /name cannot be empty/],
    [{ name: null }, /name cannot be null/],
    [{ name: 12 }, /name must be a string/],
    [{ name: "x".repeat(256) }, /name must be at most 255/],
    [{ email: "not-an-email" }, /email must be a valid email/],
    [{ countryCode: "CIV" }, /countryCode must be a 2-letter/],
    [{ isActive: "true" }, /isActive must be true or false/],
    [{ isVerified: 1 }, /isVerified must be true or false/],
    [{ rating: 5.1 }, /rating must be a number between 0 and 5/],
    [{ rating: -1 }, /rating must be a number between 0 and 5/],
    [{ rating: "4" }, /rating must be a number between 0 and 5/],
    [{ approvalStatus: "superapproved" }, /approvalStatus must be one of/],
    [{ categoryId: 0 }, /categoryId must be a positive integer/],
    [{ categoryId: "3" }, /categoryId must be a positive integer/],
    [{ attributes: [] }, /attributes must be an object/],
    [{ attributes: null }, /attributes must be an object/],
    [{ tags: "a,b" }, /tags must be an array/],
    [{ tags: [1] }, /tags must be an array/],
  ];
  for (const [fields, pattern] of bad) {
    assert.match(parseError([{ id: 1, ...fields }]), pattern, JSON.stringify(fields));
  }
});

test("nullable text fields accept null and tags/attributes are serialised for jsonb", () => {
  const [update] = parseOk([
    {
      id: 1,
      phone: null,
      address: null,
      countryCode: null,
      tags: ["a", "b"],
      attributes: { delivery: true },
      categoryId: 9,
    },
  ]);
  const get = (column: string) =>
    update.assignments.find((a) => a.column === column);
  assert.equal(get("phone")?.value, null);
  assert.equal(get("country_code")?.value, null);
  assert.equal(get("tags")?.value, '["a","b"]');
  assert.equal(get("tags")?.cast, "::jsonb");
  assert.equal(get("attributes")?.value, '{"delivery":true}');
  assert.equal(update.categoryId, 9);
});

test("the statement only ever contains allowlisted columns and positional placeholders", () => {
  const injectionValue = "x'; DROP TABLE businesses; --";
  const [update] = parseOk([
    { id: 5, name: injectionValue, description: injectionValue, isActive: true, tags: ["t"] },
  ]);
  const statement = buildBulkUpdateStatement(update);
  assert.equal(
    statement.text,
    "UPDATE businesses SET name = $1, description = $2, is_active = $3, tags = $4::jsonb, updated_at = NOW() WHERE id = $5 RETURNING id",
  );
  assert.deepEqual(statement.values, [
    injectionValue,
    injectionValue,
    true,
    '["t"]',
    5,
  ]);
  assert.ok(!statement.text.includes("DROP"), "values are bound, never inlined");
});

test("the bulk route is behind the Admin Panel guard and builds SQL only from the allowlist", () => {
  const source = readFileSync(
    new URL("../routes/businesses.ts", import.meta.url),
    "utf8",
  );
  const start = source.indexOf('"/api/businesses/bulk/update"');
  assert.ok(start > 0, "bulk update route exists");
  const end = source.indexOf("\n);", start);
  const route = source.slice(start, end);
  assert.match(route, /^"\/api\/businesses\/bulk\/update",\s*requireAdminPanel,/);
  assert.doesNotMatch(route, /Object\.entries\(/, "no request keys turned into SQL");
  assert.doesNotMatch(route, /details:/, "no database error text in responses");
  assert.match(route, /parseBulkBusinessUpdates\(/);
  assert.match(route, /buildBulkUpdateStatement\(/);
});

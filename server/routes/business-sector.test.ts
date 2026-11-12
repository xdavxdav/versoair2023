import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, withRouter } from "../test-support/route-harness";
import { publicBusinessVisibilitySql } from "../utils/business-visibility";
import businessesRouter from "./businesses";

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

// The parent category and its direct children, matched by slug. The slug is a
// single bound parameter, referenced twice at placeholder $n.
const sectorSubquery = (n: number) =>
  `b.category_id IN (SELECT c.id FROM business_categories c WHERE c.slug = $${n} OR c.parent_id IN (SELECT p.id FROM business_categories p WHERE p.slug = $${n}))`;

async function listQueries(path: string) {
  const database = scriptPool(() => undefined);
  await withRouter(businessesRouter, async (origin) => {
    const res = await call(origin, "GET", path);
    assert.equal(res.status, 200);
  });
  const count = database.log.find((entry) =>
    entry.sql.startsWith("SELECT COUNT(*) as total FROM businesses b"),
  );
  const data = database.log.find((entry) =>
    entry.sql.startsWith("SELECT b.id, b.name, b.category_id"),
  );
  assert.ok(count && data, "the list route ran its count and data queries");
  return { count, data };
}

test("sectorSlug matches the parent category and its direct children by slug", async () => {
  const { count, data } = await listQueries(
    "/api/businesses?sectorSlug=commerce",
  );
  assert.ok(count.sql.includes(sectorSubquery(1)));
  assert.ok(data.sql.includes(sectorSubquery(1)));
  assert.deepEqual(count.params, ["commerce"]);
  assert.deepEqual(data.params, ["commerce", 50, 0]);
});

test("sectorSlug is combined with the public visibility rule", async () => {
  const { count, data } = await listQueries(
    "/api/businesses?sectorSlug=commerce",
  );
  assert.ok(count.sql.includes(oneLine(publicBusinessVisibilitySql("b"))));
  assert.ok(data.sql.includes(oneLine(publicBusinessVisibilitySql("b"))));
});

test("without sectorSlug no category-slug clause is added", async () => {
  const { count, data } = await listQueries("/api/businesses");
  assert.doesNotMatch(count.sql, /c\.slug/);
  assert.doesNotMatch(data.sql, /c\.slug/);
  assert.deepEqual(count.params, []);
});

test("a hostile sectorSlug is bound as a parameter, never spliced into SQL", async () => {
  const hostile = "x' OR '1'='1";
  const { count, data } = await listQueries(
    `/api/businesses?sectorSlug=${encodeURIComponent(hostile)}`,
  );
  assert.deepEqual(count.params, [hostile]);
  assert.deepEqual(data.params, [hostile, 50, 0]);
  assert.doesNotMatch(count.sql, /'1'='1/);
  assert.doesNotMatch(data.sql, /'1'='1/);
});

test("placeholder numbers follow the earlier filters in both queries", async () => {
  const { count, data } = await listQueries(
    "/api/businesses?search=ab&sectorSlug=commerce&page=2&limit=10",
  );
  assert.ok(count.sql.includes(sectorSubquery(2)));
  assert.deepEqual(count.params, ["ab%", "commerce"]);
  assert.ok(data.sql.includes(sectorSubquery(2)));
  assert.match(data.sql, /LIMIT \$3 OFFSET \$4/);
  assert.deepEqual(data.params.slice(0, 2), ["ab%", "commerce"]);
  assert.equal(data.params.length, 4);
});

test("the numeric sectorId filter keeps its parent-or-self match", async () => {
  const { count } = await listQueries("/api/businesses?sectorId=1");
  assert.match(
    count.sql,
    /b\.category_id IN \(SELECT id FROM business_categories WHERE parent_id = \$1\) OR b\.category_id = \$1/,
  );
  assert.deepEqual(count.params, [1]);
  assert.doesNotMatch(count.sql, /c\.slug/);
});

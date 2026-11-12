import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, withRouter } from "../test-support/route-harness";
import { PUBLIC_IS_CLAIMED_SQL } from "../utils/public-business-list-fields";
import businessSearchRouter from "./business-search";

const PRIVATE_KEYS = [
  "owner_id",
  "approval_notes",
  "contact_info",
  "submitted_by",
  "approved_by",
  "approval_status",
  "verification_status",
  "owner_tier",
];

function scripted(rowOverrides: Record<string, unknown> = {}) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT id, name, slug FROM business_categories")) {
      return { rows: [{ id: 1, name: "Commerce", slug: "commerce" }] };
    }
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ count: "1" }] };
    if (sql.includes("FROM businesses b")) {
      return {
        rows: [
          {
            id: 6,
            name: "Persaunafy Inc.",
            category_id: 1,
            owner_tier: "free",
            region_name: "Ontario",
            ...rowOverrides,
          },
        ],
      };
    }
    return undefined;
  });
}

test("category search selects an explicit public column list, never b.*", async () => {
  const db = scripted();
  await withRouter(businessSearchRouter, async (base) => {
    const res = await call(base, "GET", "/category/commerce/search");
    assert.equal(res.status, 200);
  });
  const query = db.matching("FROM businesses b").find((q) =>
    q.sql.startsWith("SELECT b.id"),
  );
  assert.ok(query, "data query should select an explicit column list");
  const selectList = query.sql
    .split(" FROM businesses b")[0]
    .replace(PUBLIC_IS_CLAIMED_SQL, "");
  assert.ok(!selectList.includes("b.*"));
  for (const key of PRIVATE_KEYS) {
    assert.ok(!selectList.includes(`b.${key}`), `${key} must not be selected`);
  }
  assert.ok(
    !selectList.includes("owner_tier"),
    "owner_tier must not be selected",
  );
});

test("category search strips private keys even if the query widens", async () => {
  scripted({
    owner_id: 99,
    approval_notes: "internal",
    contact_info: { phone: "x" },
    submitted_by: 4,
    approved_by: 1,
  });
  await withRouter(businessSearchRouter, async (base) => {
    const res = await call(base, "GET", "/category/commerce/search");
    const row = res.body.data[0];
    assert.equal(row.name, "Persaunafy Inc.");
    for (const key of PRIVATE_KEYS) {
      assert.ok(!(key in row), `${key} leaked`);
    }
  });
});

test("category search keeps the public visibility predicate", async () => {
  const db = scripted();
  await withRouter(businessSearchRouter, async (base) => {
    await call(base, "GET", "/category/commerce/search");
  });
  const query = db.matching("FROM businesses b").pop();
  assert.ok(query?.sql.includes("is_verified"));
  assert.ok(query?.sql.includes("is_active"));
});

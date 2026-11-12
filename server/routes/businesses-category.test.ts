import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, withRouter } from "../test-support/route-harness";
import { PUBLIC_IS_CLAIMED_SQL } from "../utils/public-business-list-fields";
import businessesRouter from "./businesses";

const PRIVATE_KEYS = [
  "owner_id",
  "approval_notes",
  "contact_info",
  "submitted_by",
  "approved_by",
  "approval_status",
  "verification_status",
  "owner_tier",
  "tier",
];

function scripted(rowOverrides: Record<string, unknown> = {}) {
  return scriptPool((sql) => {
    if (sql.includes("FROM businesses b")) {
      return {
        rows: [
          {
            id: 6,
            name: "Persaunafy Inc.",
            category_id: 1,
            category_name: "Commerce",
            owner_tier: "free",
            tier: "free",
            ...rowOverrides,
          },
        ],
      };
    }
    return undefined;
  });
}

test("category listing selects an explicit public column list, never b.*", async () => {
  const db = scripted();
  await withRouter(businessesRouter, async (base) => {
    const res = await call(base, "GET", "/api/businesses/category/1?limit=5");
    assert.equal(res.status, 200);
  });
  const query = db.matching("FROM businesses b")[0];
  assert.ok(query, "category query should run");
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

test("category listing strips private keys even if the query widens", async () => {
  scripted({
    owner_id: 99,
    approval_notes: "internal",
    contact_info: { phone: "x" },
    submitted_by: 4,
    approved_by: 1,
    approval_status: "approved",
    verification_status: "unverified",
  });
  await withRouter(businessesRouter, async (base) => {
    const res = await call(base, "GET", "/api/businesses/category/1?limit=5");
    const row = res.body.data[0];
    assert.equal(row.name, "Persaunafy Inc.");
    assert.equal(row.category_name, "Commerce");
    for (const key of PRIVATE_KEYS) {
      assert.ok(!(key in row), `${key} leaked`);
    }
  });
});

test("category listing keeps the public visibility predicate", async () => {
  const db = scripted();
  await withRouter(businessesRouter, async (base) => {
    await call(base, "GET", "/api/businesses/category/1?limit=5");
  });
  const query = db.matching("FROM businesses b")[0];
  assert.ok(query?.sql.includes("is_verified"));
  assert.ok(query?.sql.includes("is_active"));
});

test("category listing exposes a yes/no is_claimed flag but never the owner", async () => {
  scripted({ is_claimed: false, owner_id: 99 });
  await withRouter(businessesRouter, async (base) => {
    const res = await call(base, "GET", "/api/businesses/category/1?limit=5");
    const row = res.body.data[0];
    assert.equal(row.is_claimed, false);
    assert.ok(!("owner_id" in row));
  });
});

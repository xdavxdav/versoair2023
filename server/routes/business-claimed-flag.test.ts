import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, withRouter } from "../test-support/route-harness";
import businessesRouter from "./businesses";

const BUSINESS = 25;

function businessRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BUSINESS,
    name: "Kick & Tech",
    category_id: 1,
    category_name: "Commerce",
    is_active: true,
    is_verified: true,
    owner_id: null,
    owner_tier: null,
    is_claimed: false,
    approval_notes: "internal",
    contact_info: { private: true },
    ...overrides,
  };
}

async function fetchDetail(row: Record<string, unknown>) {
  const database = scriptPool((sql) =>
    sql.includes("WHERE b.id = $1") ? { rows: [row] } : undefined,
  );
  let body: any;
  await withRouter(businessesRouter, async (origin) => {
    const res = await call(origin, "GET", `/api/businesses/${BUSINESS}`);
    assert.equal(res.status, 200);
    body = res.body;
  });
  return { database, business: body.data };
}

test("the detail route reports an unclaimed listing as is_claimed false", async () => {
  const { business } = await fetchDetail(businessRow());
  assert.equal(business.is_claimed, false);
});

test("the detail route reports a claimed listing as is_claimed true without the owner", async () => {
  const { business } = await fetchDetail(
    businessRow({ owner_id: 41, is_claimed: true, owner_tier: "essential" }),
  );
  assert.equal(business.is_claimed, true);
  assert.equal(business.owner_id, undefined);
  assert.equal(business.approval_notes, undefined);
  assert.equal(business.contact_info, undefined);
});

test("the detail query derives is_claimed from owner_id presence only", async () => {
  const { database } = await fetchDetail(businessRow());
  const query = database.log.find((entry) => entry.sql.includes("WHERE b.id = $1"));
  assert.ok(query, "the detail query ran");
  assert.match(query.sql, /\(b\.owner_id IS NOT NULL\) as is_claimed/);
});

test("the list route selects is_claimed and still never selects owner_id", async () => {
  const database = scriptPool((sql) =>
    sql.startsWith("SELECT b.id, b.name")
      ? { rows: [businessRow()] }
      : sql.startsWith("SELECT COUNT(*)")
        ? { rows: [{ total: 1 }] }
        : undefined,
  );
  let body: any;
  await withRouter(businessesRouter, async (origin) => {
    const res = await call(origin, "GET", "/api/businesses?sectorSlug=commerce");
    assert.equal(res.status, 200);
    body = res.body;
  });
  const data = database.log.find((entry) => entry.sql.startsWith("SELECT b.id, b.name"));
  assert.ok(data, "the list data query ran");
  assert.match(data.sql, /\(b\.owner_id IS NOT NULL\) as is_claimed/);
  assert.doesNotMatch(data.sql, /b\.owner_id,|, b\.owner_id\b(?! IS)/);
  assert.equal(body.data[0].is_claimed, false);
});

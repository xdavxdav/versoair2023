import "../../../test-support/env";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { db } from "../../../db";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../../test-support/route-harness";
import campaignsRouter from "./campaigns";

const campaignId = "b5dc1661-dffe-436b-b343-10b611118276";

function campaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: campaignId,
    business_id: 12,
    business_name: "Test business",
    name: "Test campaign",
    description: null,
    budget: "25.00",
    status: "draft",
    start_date: "2026-01-01",
    end_date: null,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("business owners list and count only campaigns for their businesses", async () => {
  const queries = scriptPool((sql) => {
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ total: 1 }] };
    if (sql.startsWith("SELECT id, business_id")) {
      return { rows: [campaignRow()] };
    }
    return undefined;
  });

  await withRouter(campaignsRouter, async (origin) => {
    const response = await call(origin, "GET", "/?search=Test", {
      headers: signIn({ id: 44, role: "business_owner" }),
    });

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.pagination.total, 1);
  });

  assert.equal(queries.log.length, 2);
  for (const query of queries.log) {
    assert.match(
      query.sql,
      /business_id IN \(SELECT id FROM businesses WHERE owner_id = \$2\)/,
    );
    assert.deepEqual(query.params.slice(0, 2), ["Test%", "44"]);
  }
  assert.equal(queries.log[0].params.length, 2);
  assert.deepEqual(queries.log[1].params, ["Test%", "44", 20, 0]);
});

test("admin campaign list remains global", async () => {
  const queries = scriptPool((sql) => {
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ total: 1 }] };
    if (sql.startsWith("SELECT id, business_id")) {
      return { rows: [campaignRow()] };
    }
    return undefined;
  });

  await withRouter(campaignsRouter, async (origin) => {
    const response = await call(origin, "GET", "/", {
      headers: signIn({ id: 1, role: "admin" }),
    });

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.data.length, 1);
  });

  assert.equal(queries.log.length, 2);
  assert.doesNotMatch(queries.log[0].sql, /owner_id/);
  assert.doesNotMatch(queries.log[1].sql, /owner_id/);
  assert.deepEqual(queries.log[0].params, []);
  assert.deepEqual(queries.log[1].params, [20, 0]);
});

test("campaign lists use draft for records with no stored status", async () => {
  scriptPool((sql) => {
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ total: 1 }] };
    if (sql.startsWith("SELECT id, business_id")) {
      return { rows: [campaignRow({ status: null })] };
    }
    return undefined;
  });

  await withRouter(campaignsRouter, async (origin) => {
    const response = await call(origin, "GET", "/", {
      headers: signIn({ id: 1, role: "admin" }),
    });

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.data[0].status, "draft");
  });
});

test("campaign creation defaults omitted status to draft", async () => {
  const queries = scriptPool((sql) => {
    if (sql.startsWith("SELECT 1 FROM businesses")) {
      return { rows: [{ "?column?": 1 }] };
    }
    if (sql.startsWith("INSERT INTO ad_campaigns")) {
      return { rows: [campaignRow()] };
    }
    return undefined;
  });
  mock.method(
    db,
    "insert",
    (() => ({
      values: async () => undefined,
    })) as never,
  );

  await withRouter(campaignsRouter, async (origin) => {
    const response = await call(origin, "POST", "/", {
      headers: signIn({ id: 1, role: "admin" }),
      body: {
        businessId: 12,
        name: "Test campaign",
        budget: 25,
        startDate: "2026-01-01",
      },
    });

    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.data.status, "draft");
  });

  const insert = queries.log.find((query) =>
    query.sql.startsWith("INSERT INTO ad_campaigns"),
  );
  assert.ok(insert);
  assert.equal(insert.params[4], "draft");
});

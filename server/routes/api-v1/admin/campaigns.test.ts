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

function recordAuditWrites() {
  mock.method(db, "insert", (() => ({
    values: async () => undefined,
  })) as never);
}

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

test("campaign creation defaults an omitted status to draft", async () => {
  const queries = scriptPool((sql) => {
    if (sql.startsWith("SELECT 1 FROM businesses")) return { rows: [{ "?column?": 1 }] };
    if (sql.startsWith("INSERT INTO ad_campaigns")) {
      return { rows: [campaignRow()] };
    }
    return undefined;
  });
  recordAuditWrites();

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

test("campaign update defaults a missing legacy status to draft", async () => {
  const queries = scriptPool((sql) => {
    if (sql.startsWith("SELECT id, business_id, name, description, budget, status")) {
      return { rows: [campaignRow({ status: null })] };
    }
    if (sql.startsWith("SELECT 1 FROM businesses")) {
      return { rows: [{ "?column?": 1 }] };
    }
    if (sql.startsWith("UPDATE ad_campaigns")) {
      return { rows: [campaignRow()] };
    }
    return undefined;
  });
  recordAuditWrites();

  await withRouter(campaignsRouter, async (origin) => {
    const response = await call(origin, "PUT", `/${campaignId}`, {
      headers: signIn({ id: 1, role: "admin" }),
      body: {
        businessId: 12,
        name: "Test campaign",
      },
    });

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.data.status, "draft");
  });

  const update = queries.log.find((query) =>
    query.sql.startsWith("UPDATE ad_campaigns"),
  );
  assert.ok(update);
  assert.equal(update.params[4], "draft");
});

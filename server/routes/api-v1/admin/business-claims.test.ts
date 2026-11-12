import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, signIn, withRouter } from "../../../test-support/route-harness";
import businessClaimsRouter from "./business-claims";

test("the claim queue is restricted to admin and superuser roles", async () => {
  const headers = signIn({ id: 60, role: "moderator" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "GET", "/", { headers });
    assert.equal(response.status, 403);
  });
});

test("claim rejection requires a review reason", async () => {
  const headers = signIn({ id: 61, role: "admin" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "PATCH", "/700", {
      headers,
      body: { action: "reject" },
    });
    assert.equal(response.status, 400);
  });
});

test("the claim queue returns the requested page and total", async () => {
  const database = scriptPool((sql, params) => {
    if (sql.includes("LIMIT $2 OFFSET $3")) {
      assert.deepEqual(params, ["pending", 5, 5]);
      return { rows: [{ id: 701, status: "pending" }] };
    }
    if (sql.includes("SELECT COUNT(*)::int AS total")) {
      assert.deepEqual(params, ["pending"]);
      return { rows: [{ total: 26 }] };
    }
    return undefined;
  });
  const headers = signIn({ id: 62, role: "admin" });

  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(
      origin,
      "GET",
      "/?status=pending&page=2&limit=5",
      { headers },
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].id, 701);
    assert.deepEqual(response.body.pagination, {
      page: 2,
      limit: 5,
      total: 26,
    });
  });

  assert.ok(database.log.some((entry) => entry.sql.includes("LIMIT $2 OFFSET $3")));
});

test("approval locks the business and only promotes a basic user role", async () => {
  const database = scriptPool((sql) => {
    if (sql.includes("SELECT business_id FROM business_claims")) {
      return { rows: [{ business_id: 25 }] };
    }
    if (sql.includes("FROM businesses WHERE id = $1 FOR UPDATE")) {
      return { rows: [{ id: 25, name: "Example Business", owner_id: null }] };
    }
    if (sql.includes("FROM business_claims bc") && sql.includes("FOR UPDATE OF bc")) {
      return {
        rows: [
          {
            id: 700,
            business_id: 25,
            user_id: 51,
            status: "pending",
            claimant_email: "owner@example.com",
          },
        ],
      };
    }
    if (sql.startsWith("UPDATE businesses SET owner_id")) {
      return { rows: [{ id: 25 }] };
    }
    if (sql.startsWith("UPDATE business_claims") && sql.includes("RETURNING id, business_id")) {
      return {
        rows: [
          {
            id: 700,
            business_id: 25,
            user_id: 51,
            status: "approved",
            reviewed_at: "2026-11-12T12:00:00.000Z",
            review_note: null,
          },
        ],
      };
    }
    return undefined;
  });
  const headers = signIn({ id: 62, role: "admin" });

  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "PATCH", "/700", {
      headers,
      body: { action: "approve" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "approved");
    assert.equal(response.body.emailSent, false);
  });

  const businessLock = database.log.find((entry) =>
    entry.sql.includes("FROM businesses WHERE id = $1 FOR UPDATE"),
  );
  assert.ok(businessLock, "approval locks the business row");
  const roleGrant = database.log.find((entry) =>
    entry.sql.startsWith("UPDATE users SET role = 'business_owner'"),
  );
  assert.ok(roleGrant);
  assert.match(roleGrant.sql, /AND role = 'user'/);
  assert.ok(
    database.log.some((entry) =>
      entry.params.includes("BUSINESS_CLAIM_APPROVED"),
    ),
  );
  assert.ok(
    database.log.some((entry) =>
      entry.sql.startsWith("INSERT INTO notifications"),
    ),
  );
});

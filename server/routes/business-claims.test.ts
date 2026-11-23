import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import businessClaimsRouter from "./business-claims";

const userId = 51;
const businessId = 25;

function installPool(options: {
  accountType?: string;
  verified?: boolean;
  ownerId?: number | null;
  hasActiveOwner?: boolean;
  duplicate?: boolean;
} = {}) {
  return scriptPool((sql) => {
    if (sql.includes("FROM users WHERE id = $1")) {
      return {
        rows: [
          {
            id: userId,
            account_type: options.accountType || "business_owner",
            is_verified: options.verified ?? true,
          },
        ],
      };
    }
    if (sql.includes("FROM businesses b") && sql.includes("FOR UPDATE OF b")) {
      return {
        rows: [
          {
            id: businessId,
            name: "Example Business",
            owner_id: options.ownerId ?? null,
            has_active_owner: options.hasActiveOwner ?? false,
            email: "hello@example.com",
            phone: "416-555-0100",
            website: "https://example.com",
          },
        ],
      };
    }
    if (sql.startsWith("INSERT INTO business_claims")) {
      if (options.duplicate) {
        throw Object.assign(new Error("duplicate claim"), {
          code: "23505",
          constraint: "business_claims_pending_business_user_unique",
        });
      }
      return {
        rows: [
          {
            id: 700,
            business_id: businessId,
            status: "pending",
            created_at: "2026-11-12T12:00:00.000Z",
          },
        ],
      };
    }
    return undefined;
  });
}

test("claim submissions require a Business Owner account", async () => {
  installPool({ accountType: "general" });
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/claim`, {
      headers,
      body: { claimantRole: "Owner", workEmail: "owner@example.com" },
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.code, "BUSINESS_OWNER_ACCOUNT_REQUIRED");
  });
});

test("claim submissions require verified email", async () => {
  installPool({ verified: false });
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/claim`, {
      headers,
      body: { claimantRole: "Owner", workEmail: "owner@example.com" },
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.code, "EMAIL_VERIFICATION_REQUIRED");
  });
});

test("a successful claim stores evidence, keeps pending status, and audits submission", async () => {
  const database = installPool();
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/claim`, {
      headers,
      body: {
        claimantRole: "Owner",
        workEmail: "owner@example.com",
        workPhone: "+1 416 555 0100",
        message: "I am authorized to manage this listing.",
      },
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, "pending");
  });

  const insert = database.log.find((entry) =>
    entry.sql.startsWith("INSERT INTO business_claims"),
  );
  assert.ok(insert);
  assert.deepEqual(JSON.parse(String(insert.params[6])), {
    emailMatchesListed: false,
    emailDomainMatchesWebsite: true,
    phoneMatchesListed: true,
  });
  assert.ok(
    database.log.some((entry) =>
      entry.sql.includes("BUSINESS_CLAIM_SUBMITTED"),
    ),
  );
  assert.ok(database.log.some((entry) => entry.sql === "COMMIT"));
});

test("a concurrent duplicate pending claim returns conflict", async () => {
  installPool({ duplicate: true });
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/claim`, {
      headers,
      body: { claimantRole: "Owner", workEmail: "owner@example.com" },
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.code, "PENDING_CLAIM_EXISTS");
  });
});

test("a listing with an active owner cannot receive an initial claim", async () => {
  installPool({ hasActiveOwner: true });
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/claim`, {
      headers,
      body: { claimantRole: "Owner", workEmail: "owner@example.com" },
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.code, "BUSINESS_ALREADY_CLAIMED");
  });
});

test("claim status is scoped to the signed-in user", async () => {
  const database = scriptPool((sql, params) => {
    if (sql.includes("FROM users WHERE id = $1")) {
      assert.deepEqual(params, [userId]);
      return {
        rows: [
          {
            account_type: "business_owner",
            business_name: "Claimant Co",
            is_verified: true,
          },
        ],
      };
    }
    if (sql.includes("FROM business_claims bc")) {
      assert.deepEqual(params, [userId]);
      return { rows: [{ id: 1, business_id: businessId, status: "pending" }] };
    }
    return undefined;
  });
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "GET", "/claims/mine", { headers });
    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].status, "pending");
    assert.equal(response.body.accountType, "business_owner");
  });
  assert.equal(database.log.length, 2);
});

test("a claimant can withdraw only their own pending claim", async () => {
  const database = scriptPool((sql, params) => {
    if (sql.includes("FROM business_claims") && sql.includes("FOR UPDATE")) {
      assert.deepEqual(params, [700, userId]);
      return {
        rows: [{ id: 700, business_id: businessId, status: "pending" }],
      };
    }
    return undefined;
  });
  const headers = signIn({ id: userId, role: "user" });
  await withRouter(businessClaimsRouter, async (origin) => {
    const response = await call(origin, "DELETE", "/claims/700", { headers });
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "withdrawn");
  });
  assert.ok(
    database.log.some((entry) =>
        entry.sql.includes("BUSINESS_CLAIM_WITHDRAWN"),
    ),
  );
  assert.ok(
    database.log.some((entry) =>
      entry.sql.includes("SET status = 'withdrawn'"),
    ),
  );
});

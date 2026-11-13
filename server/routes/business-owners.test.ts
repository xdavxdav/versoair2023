import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, signIn, withRouter } from "../test-support/route-harness";
import businessOwnersRouter from "./business-owners";

const businessId = 25;

test("only an active owner may invite another account", async () => {
  const database = scriptPool((sql) => {
    if (sql.includes("FROM businesses b WHERE b.id = $1 FOR UPDATE")) {
      return { rows: [{ id: businessId, name: "Example", owner_id: 7, is_owner: false }] };
    }
    if (sql.includes("FROM users WHERE LOWER(email)")) {
      return { rows: [{ id: 8, email: "cofounder@example.com" }] };
    }
    if (sql.startsWith("INSERT INTO business_owners")) {
      return { rows: [{ id: 901 }] };
    }
    return undefined;
  });
  const headers = signIn({ id: 7, role: "business_owner" });

  await withRouter(businessOwnersRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/owners/invitations`, {
      headers,
      body: { email: "cofounder@example.com" },
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, "invited");
  });

  const membership = database.log.find((entry) =>
    entry.sql.startsWith("INSERT INTO business_owners"),
  );
  assert.ok(membership);
  assert.match(membership.sql, /'invited'/);
  assert.ok(
    database.log.some(
      (entry) =>
        entry.sql.startsWith("INSERT INTO audit_logs") &&
        entry.params[1] === "BUSINESS_OWNER_INVITED",
    ),
  );
});

test("a pending invitation grants no ownership access", async () => {
  const database = scriptPool((sql) => {
    if (sql.includes("FROM businesses b WHERE b.id = $1 FOR UPDATE")) {
      return { rows: [{ id: businessId, name: "Example", owner_id: 7, is_owner: false }] };
    }
    return undefined;
  });
  const headers = signIn({ id: 8, role: "business_owner" });

  await withRouter(businessOwnersRouter, async (origin) => {
    const response = await call(origin, "POST", `/${businessId}/owners/invitations`, {
      headers,
      body: { email: "other@example.com" },
    });
    assert.equal(response.status, 403);
  });

  assert.equal(
    database.log.some((entry) => entry.sql.startsWith("INSERT INTO business_owners")),
    false,
  );
});

test("an invitee must verify their email before accepting ownership", async () => {
  const database = scriptPool((sql) => {
    if (sql.startsWith("SELECT business_id FROM business_owners")) {
      return { rows: [{ business_id: businessId }] };
    }
    if (sql.includes("FROM businesses WHERE id = $1 FOR UPDATE")) {
      return { rows: [{ id: businessId, owner_id: 7 }] };
    }
    if (sql.includes("AND status = 'invited'") && sql.includes("FOR UPDATE")) {
      return { rows: [{ id: 901 }] };
    }
    if (sql === "SELECT is_verified FROM users WHERE id = $1") {
      return { rows: [{ is_verified: false }] };
    }
    return undefined;
  });
  const headers = signIn({ id: 8, role: "user" });

  await withRouter(businessOwnersRouter, async (origin) => {
    const response = await call(
      origin,
      "POST",
      "/owner-invitations/901/accept",
      { headers },
    );
    assert.equal(response.status, 403);
    assert.equal(response.body.code, "EMAIL_VERIFICATION_REQUIRED");
  });

  assert.equal(
    database.log.some((entry) =>
      entry.sql.includes("SET status = 'active', accepted_at"),
    ),
    false,
  );
});

test("accepting an invitation activates a second owner without replacing the primary owner", async () => {
  const database = scriptPool((sql) => {
    if (sql.startsWith("SELECT business_id FROM business_owners")) {
      return { rows: [{ business_id: businessId }] };
    }
    if (sql.includes("FROM businesses WHERE id = $1 FOR UPDATE")) {
      return { rows: [{ id: businessId, owner_id: 7 }] };
    }
    if (sql.includes("AND status = 'invited'") && sql.includes("FOR UPDATE")) {
      return { rows: [{ id: 901 }] };
    }
    if (sql === "SELECT is_verified FROM users WHERE id = $1") {
      return { rows: [{ is_verified: true }] };
    }
    return undefined;
  });
  const headers = signIn({ id: 8, role: "user" });

  await withRouter(businessOwnersRouter, async (origin) => {
    const response = await call(
      origin,
      "POST",
      "/owner-invitations/901/accept",
      { headers },
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "active");
  });

  assert.ok(
    database.log.some((entry) =>
      entry.sql.includes("SET status = 'active', accepted_at"),
    ),
  );
  const primaryOwnerUpdate = database.log.find((entry) =>
    entry.sql.includes("SET owner_id = COALESCE(owner_id, $1)"),
  );
  assert.ok(primaryOwnerUpdate);
  assert.deepEqual(primaryOwnerUpdate.params, [8, businessId]);
});

test("the last owner cannot remove themselves and leave the business unowned", async () => {
  const database = scriptPool((sql) => {
    if (sql.includes("FROM businesses WHERE id = $1 FOR UPDATE")) {
      return { rows: [{ id: businessId, owner_id: 7, is_owner: true }] };
    }
    if (sql.includes("FROM business_owners") && sql.includes("FOR UPDATE")) {
      return { rows: [{ id: 901 }] };
    }
    if (sql.startsWith("SELECT user_id FROM business_owners")) {
      return { rows: [] };
    }
    return undefined;
  });
  const headers = signIn({ id: 7, role: "business_owner" });

  await withRouter(businessOwnersRouter, async (origin) => {
    const response = await call(
      origin,
      "DELETE",
      `/${businessId}/owners/7`,
      { headers },
    );
    assert.equal(response.status, 409);
    assert.match(response.body.error, /at least one active owner/);
  });

  assert.equal(
    database.log.some((entry) => entry.sql.startsWith("DELETE FROM business_owners")),
    false,
  );
});

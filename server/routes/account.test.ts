import assert from "node:assert/strict";
import test from "node:test";
import { call, scriptPool, signIn, withRouter } from "../test-support/route-harness";
import accountRouter from "./account";

test("switching a general account to Business Owner is audited and grants no role", async () => {
  const database = scriptPool((sql) => {
    if (sql.includes("SELECT id, account_type, business_name")) {
      return {
        rows: [{ id: 52, account_type: "general", business_name: null }],
      };
    }
    if (sql.startsWith("UPDATE users SET account_type")) {
      return {
        rows: [{ account_type: "business_owner", business_name: "Example Co" }],
      };
    }
    return undefined;
  });
  const headers = signIn({ id: 52, role: "user" });

  await withRouter(accountRouter, async (origin) => {
    const response = await call(origin, "POST", "/account-type", {
      headers,
      body: { accountType: "business_owner", businessName: "Example Co" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.accountType, "business_owner");
  });

  const update = database.log.find((entry) =>
    entry.sql.startsWith("UPDATE users SET account_type"),
  );
  assert.ok(update);
  assert.match(update.sql, /WHERE id = \$1 AND account_type = 'general'/);
  assert.ok(database.log.some((entry) => entry.sql.includes("ACCOUNT_TYPE_CHANGED")));
});

test("account type changes cannot promote staff roles or accept arbitrary types", async () => {
  let connectCount = 0;
  const database = scriptPool((sql) => {
    if (sql.includes("SELECT id, account_type, business_name")) {
      return {
        rows: [{ id: 53, account_type: "artist", business_name: null }],
      };
    }
    return undefined;
  });
  const headers = signIn({ id: 53, role: "artist" });

  await withRouter(accountRouter, async (origin) => {
    const rejected = await call(origin, "POST", "/account-type", {
      headers,
      body: { accountType: "admin" },
    });
    assert.equal(rejected.status, 400);
    const immutable = await call(origin, "POST", "/account-type", {
      headers,
      body: { accountType: "business_owner" },
    });
    assert.equal(immutable.status, 409);
  });
  connectCount += database.connections;
  assert.equal(connectCount, 1);
  assert.equal(
    database.log.some((entry) => entry.sql.startsWith("UPDATE users SET account_type")),
    false,
  );
});

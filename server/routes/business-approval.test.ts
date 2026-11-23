import assert from "node:assert/strict";
import test, { beforeEach, mock } from "node:test";
import {
  call,
  db,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import { publicBusinessVisibilitySql } from "../utils/business-visibility";
import businessesRouter from "./businesses";

const BUSINESS = 5;
const admin = { id: 1, role: "admin" };
const superuser = { id: 2, role: "superuser" };
const moderator = { id: 3, role: "moderator" };
const member = { id: 21, role: "user" };

beforeEach(() => {
  // The audit trail is best-effort and goes through drizzle, not the pool.
  mock.method(db, "insert", (() => ({
    values: async () => undefined,
  })) as never);
});

interface Scenario {
  /** Whether business 5 is still waiting for a decision. */
  pending?: boolean;
  /** No such business. */
  missing?: boolean;
  submittedBy?: number | null;
}

function scriptedDb(scenario: Scenario = {}) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT id, name, verification_status")) {
      return {
        rows: scenario.missing
          ? []
          : [{ id: BUSINESS, name: "Chez Ada", approval_status: scenario.pending === false ? "approved" : "pending" }],
      };
    }
    if (/^UPDATE businesses SET verification_status = 'verified'/.test(sql)) {
      return {
        rows: [
          {
            id: BUSINESS,
            name: "Chez Ada",
            submitted_by: scenario.submittedBy ?? null,
          },
        ],
      };
    }
    if (
      /^UPDATE businesses SET approval_status = 'rejected'/.test(sql)
    ) {
      return {
        rows:
          scenario.pending === false
            ? []
            : [
                {
                  id: BUSINESS,
                  name: "Chez Ada",
                  submitted_by: scenario.submittedBy ?? null,
                },
              ],
      };
    }
    if (sql.startsWith("SELECT username, email FROM users WHERE id = $1")) {
      return { rows: [{ username: "ada", email: "ada@chezada.example" }] };
    }
    return undefined;
  });
}

const decisionSql = (database: ReturnType<typeof scriptedDb>) =>
  database.log.find((entry) => entry.sql.startsWith("UPDATE businesses SET"));

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(businessesRouter, fn);

test("approving a business also verifies it, so it reaches the public directory", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(
      origin,
      "PUT",
      `/api/businesses/${BUSINESS}/approve`,
      {
        headers: signIn(admin),
        body: { notes: "Looks good" },
      },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  const update = decisionSql(database);
  assert.ok(update, "the approval was written");
  assert.match(update.sql, /approval_status = 'approved'/);
  assert.match(update.sql, /verification_status = 'verified'/);
  assert.match(update.sql, /is_active = true/);
  assert.match(update.sql, /is_verified = true/);
  assert.doesNotMatch(update.sql, /approval_status = 'pending'/);
  assert.deepEqual(update.params, [1, "Looks good", 5]);
  assert.equal(database.matching("INSERT INTO audit_logs").length, 1);
});

test("a row that is already 'approved' (admin-created) can still be approved and published", async () => {
  const database = scriptedDb({ pending: false });
  await serve(async (origin) => {
    const res = await call(origin, "PUT", `/api/businesses/${BUSINESS}/approve`, {
      headers: signIn(admin),
      body: { notes: "Registry checked" },
    });
    assert.equal(res.status, 200);
  });
  const update = decisionSql(database);
  assert.ok(update);
  assert.match(update.sql, /is_verified = true/);
});

test("approving without an evidence note is refused before anything is written", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    for (const body of [{}, { notes: "  " }]) {
      const res = await call(origin, "PUT", `/api/businesses/${BUSINESS}/approve`, {
        headers: signIn(admin),
        body,
      });
      assert.equal(res.status, 400);
    }
  });
  assert.equal(decisionSql(database), undefined);
});

test("approval sets every flag the public directory requires", () => {
  // If the visibility rule gains another flag, approval has to set it too, or
  // approved businesses silently stay out of the directory again.
  const required = [
    ...publicBusinessVisibilitySql("b").matchAll(/\bb\.(\w+) = true/g),
  ].map((match) => match[1]);
  assert.deepEqual(required.sort(), ["is_active", "is_verified"]);

  const database = scriptedDb();
  return serve(async (origin) => {
    await call(origin, "PUT", `/api/businesses/${BUSINESS}/approve`, {
      headers: signIn(admin),
      body: { notes: "Registry checked" },
    });
    const update = decisionSql(database);
    assert.ok(update);
    for (const flag of required) {
      assert.match(update.sql, new RegExp(`\\b${flag} = true\\b`), flag);
    }
  });
});

test("rejecting a business keeps it out of the directory", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(
      origin,
      "PUT",
      `/api/businesses/${BUSINESS}/reject`,
      {
        headers: signIn(admin),
        body: { reason: "Incomplete" },
      },
    );
    assert.equal(res.status, 200);
  });

  const update = decisionSql(database);
  assert.ok(update);
  assert.match(update.sql, /approval_status = 'rejected'/);
  assert.match(update.sql, /is_active = false/);
  assert.doesNotMatch(update.sql, /is_verified = true/);
});

test("only the team can decide: visitors, members and moderators are refused", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    for (const action of ["approve", "reject"]) {
      const path = `/api/businesses/${BUSINESS}/${action}`;

      const visitor = await call(origin, "PUT", path, { body: {} });
      assert.equal(visitor.status, 401, `visitor ${action}`);

      for (const account of [member, moderator]) {
        const res = await call(origin, "PUT", path, {
          headers: signIn(account),
          body: {},
        });
        assert.equal(res.status, 403, `${account.role} ${action}`);
      }
    }

    for (const account of [admin, superuser]) {
      const res = await call(
        origin,
        "PUT",
        `/api/businesses/${BUSINESS}/approve`,
        {
          headers: signIn(account),
          body: { notes: "Registry checked" },
        },
      );
      assert.equal(res.status, 200, `${account.role} approve`);
    }
  });
  assert.equal(
    database.log.filter((entry) => entry.sql.startsWith("UPDATE")).length,
    2,
    "only the two team approvals reached the database",
  );
});

test("approving a business that does not exist is a 404", async () => {
  scriptedDb({ missing: true });
  await serve(async (origin) => {
    const res = await call(origin, "PUT", `/api/businesses/${BUSINESS}/approve`, {
      headers: signIn(admin),
      body: { notes: "Registry checked" },
    });
    assert.equal(res.status, 404);
  });
});

test("a malformed id is a 404 before anything is written", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const headers = signIn(admin);
    for (const bad of ["abc", "0", "5;DROP"]) {
      const res = await call(origin, "PUT", `/api/businesses/${bad}/approve`, {
        headers,
        body: {},
      });
      assert.equal(res.status, 404, bad);
    }
  });
  assert.equal(database.log.length, 0);
});

test("approval does not depend on the notification email going out", async () => {
  const database = scriptedDb({ submittedBy: 21 });
  mock.method(console, "error", () => {});
  await serve(async (origin) => {
    const res = await call(
      origin,
      "PUT",
      `/api/businesses/${BUSINESS}/approve`,
      {
        headers: signIn(admin),
        body: { notes: "Registry checked" },
      },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
  assert.equal(
    database.matching("SELECT username, email FROM users").length,
    1,
    "the owner was looked up, so the email path did run",
  );
});

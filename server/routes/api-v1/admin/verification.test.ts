import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../../../test-support/route-harness";

const router = (await import("./verification")).default;

const OWNER = "owner@example.com";
const savedOwner = process.env.SUPERADMIN_EMAIL;

beforeEach(() => {
  process.env.SUPERADMIN_EMAIL = OWNER;
});
afterEach(() => {
  if (savedOwner === undefined) delete process.env.SUPERADMIN_EMAIL;
  else process.env.SUPERADMIN_EMAIL = savedOwner;
});

function headersFor(account: { id: number; role: string; email: string }) {
  signIn(account);
  const token = jwt.sign(
    {
      userId: account.id,
      email: account.email,
      role: account.role,
      ownerMfa: true,
      geoAdminCodeAuthenticated: true,
    },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}
const owner = () => headersFor({ id: 1, role: "superuser", email: OWNER });
const admin = () =>
  headersFor({ id: 2, role: "admin", email: "staff@example.com" });

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn, { path: "/api/v1/admin/verification" });

interface Row {
  verification_status?: string;
  approval_status?: string;
  is_verified?: boolean;
  is_active?: boolean;
}

function scripted(row: Row | null) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT id, name, verification_status")) {
      return { rows: row ? [{ id: 7, name: "Chez Ada", ...row }] : [] };
    }
    if (sql.startsWith("UPDATE businesses SET verification_status")) {
      return { rows: [{ id: 7, name: "Chez Ada", verification_status: "x" }] };
    }
    if (sql.startsWith("UPDATE businesses SET is_active")) {
      return { rows: [{ id: 7, name: "Chez Ada", is_active: false }] };
    }
    if (sql.startsWith("SELECT * FROM businesses WHERE id")) {
      return { rows: row ? [{ id: 7, name: "Chez Ada", ...row }] : [] };
    }
    return undefined;
  });
}

const update = (db: ReturnType<typeof scripted>) =>
  db.log.find((q) => q.sql.startsWith("UPDATE businesses"));
const verify = (origin: string, body: unknown, headers = owner()) =>
  call(origin, "PATCH", "/api/v1/admin/verification/businesses/7/verify", {
    headers,
    body,
  });

for (const [label, row] of [
  ["a pending row", { approval_status: "pending", verification_status: "unverified" }],
  ["an admin-created row (approval_status 'approved')", { approval_status: "approved", verification_status: "unverified" }],
] as const) {
  test(`approving ${label} publishes it in one audited transaction`, async () => {
    const db = scripted(row);
    await serve(async (origin) => {
      const res = await verify(origin, {
        action: "approve",
        reason: "  Checked Ontario corporate registry  ",
      });
      assert.equal(res.status, 200, res.text);
    });
    const u = update(db);
    assert.ok(u);
    assert.match(u.sql, /verification_status = 'verified'/);
    assert.match(u.sql, /is_verified = true/);
    assert.match(u.sql, /is_active = true/);
    assert.doesNotMatch(u.sql, /approval_status = 'pending'/);
    assert.equal(u.params[1], "Checked Ontario corporate registry");
    assert.equal(db.matching("INSERT INTO audit_logs").length, 1);
    const order = db.log.map((q) => q.sql.split(" ")[0]);
    assert.equal(order[0], "BEGIN");
    assert.equal(order.at(-1), "COMMIT");
  });
}

test("approving without an evidence note is refused and writes nothing", async () => {
  const db = scripted({ verification_status: "unverified" });
  await serve(async (origin) => {
    for (const body of [
      { action: "approve" },
      { action: "approve", reason: "   " },
    ]) {
      assert.equal((await verify(origin, body)).status, 400);
    }
  });
  assert.equal(update(db), undefined);
});

test("rejecting records the reason and keeps the row non-public", async () => {
  const db = scripted({ verification_status: "unverified", is_verified: true });
  await serve(async (origin) => {
    assert.equal((await verify(origin, { action: "reject" })).status, 400);
    const res = await verify(origin, { action: "reject", reason: "No record" });
    assert.equal(res.status, 200, res.text);
  });
  const u = update(db);
  assert.ok(u);
  assert.match(u.sql, /verification_status = 'rejected'/);
  assert.match(u.sql, /is_verified = false/);
  assert.doesNotMatch(u.sql, /is_verified = true/);
  assert.equal(u.params[1], "No record");
});

test("an unknown business is a 404", async () => {
  scripted(null);
  await serve(async (origin) => {
    const res = await verify(origin, { action: "approve", reason: "x" });
    assert.equal(res.status, 404);
  });
});

test("only the owner may use the verification API; roles are unchanged", async () => {
  const db = scripted({ verification_status: "unverified" });
  await serve(async (origin) => {
    const res = await verify(origin, { action: "approve", reason: "x" }, admin());
    assert.equal(res.status, 403);
    const visitor = await call(
      origin,
      "PATCH",
      "/api/v1/admin/verification/businesses/7/verify",
      { body: { action: "approve", reason: "x" } },
    );
    assert.equal(visitor.status, 401);
  });
  assert.equal(update(db), undefined);
});

test("activating requires the verified flags; deactivating only hides", async () => {
  for (const row of [
    { verification_status: "unverified", is_verified: false },
    { verification_status: "verified", is_verified: false },
  ]) {
    const db = scripted(row);
    await serve(async (origin) => {
      const res = await call(
        origin,
        "PATCH",
        "/api/v1/admin/verification/businesses/7/activate",
        { headers: owner(), body: { is_active: true } },
      );
      assert.equal(res.status, 403);
    });
    assert.equal(update(db), undefined);
  }

  const db = scripted({ verification_status: "unverified", is_verified: false });
  await serve(async (origin) => {
    const res = await call(
      origin,
      "PATCH",
      "/api/v1/admin/verification/businesses/7/activate",
      { headers: owner(), body: { is_active: false } },
    );
    assert.equal(res.status, 200, res.text);
  });
  const u = update(db);
  assert.ok(u);
  assert.match(u.sql, /SET is_active = \$1/);
  assert.doesNotMatch(u.sql, /is_verified/);
});

test("the queue exposes the true public state of every row", async () => {
  const db = scriptPool(() => undefined);
  await serve(async (origin) => {
    const res = await call(origin, "GET", "/api/v1/admin/verification/queue", {
      headers: owner(),
    });
    assert.equal(res.status, 200, res.text);
  });
  const select = db.log.find((q) => q.sql.includes("FROM businesses b"));
  assert.ok(select);
  assert.match(select.sql, /b\.is_verified/);
  assert.match(select.sql, /b\.is_active/);
  assert.match(select.sql, /b\.verification_status/);
});

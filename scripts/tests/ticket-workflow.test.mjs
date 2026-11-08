import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const databaseUrl = process.env.TICKET_INTEGRATION_DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Set TICKET_INTEGRATION_DATABASE_URL to an explicitly disposable LOCAL PostgreSQL database.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-ticket-integration-test-secret-not-for-production";
const runId = crypto.randomUUID().slice(0, 8);
const ownerEmail = `owner_${runId}@example.test`;
process.env.SUPERADMIN_EMAIL = ownerEmail;
delete process.env.DISABLE_DB_CHECK;
const { pool } = await import("../../server/db.ts");
const { ensureAllTables } = await import("../../server/services/ensure-tables.ts");
const { default: tickets } = await import("../../server/routes/tickets.ts");
const { default: tracking } = await import("../../server/routes/implementation-tracking.ts");
const { default: properties } = await import("../../server/routes/properties.ts");
const { default: submissionRequests } = await import("../../server/routes/submission-requests.ts");
const { default: geoActions } = await import("../../server/routes/geo-actions.ts");
const { requireOwner, requireAuth, isOwner } = await import("../../server/middleware/auth.ts");
const backgroundIntervals = [];
const createInterval = globalThis.setInterval;
const intervalMock = mock.method(globalThis, "setInterval", (...args) => {
  const timer = createInterval(...args);
  backgroundIntervals.push(timer);
  return timer;
});
const { default: adminRouter } = await import("../../server/routes/api-v1/admin/index.ts");
const { default: managementRouter } = await import("../../server/routes/database-management.ts");
const { default: paymentRouter } = await import("../../server/routes/api-v1/payments.ts");
const { default: paymentSettingsRouter } = await import("../../server/routes/payments.ts");
const { default: invitationRouter } = await import("../../server/routes/geoadmin-access.ts");
const { default: authRouter } = await import("../../server/routes/auth.ts");
const { default: tableAdminRouter } = await import("../../server/routes/admin.ts");
intervalMock.mock.restore();
const { runTicketMonitor, dueTicketAlerts } = await import("../../server/services/ticket-monitor.ts");
let server, origin;
const users = {};
const tokens = {};
async function request(user, path, method = "GET", body) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer ${tokens[user]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
async function create(user = "customer") {
  const result = await request(user, "/api/tickets", "POST", { title: "Integration support", description: "Isolated test" });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
async function assign(ticket, assignee = "moderator", manager = "admin") {
  const result = await request(manager, `/api/tickets/${ticket.id}/assign`, "PUT", {
    assigneeId: users[assignee], reason: "Test assignment",
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
}
async function createWith(user, fields) {
  const result = await request(user, "/api/tickets", "POST", { title: "Integration support", ...fields });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
// Works an assigned ticket through in-progress to resolved as its assignee.
async function resolve(ticket, user = "moderator") {
  for (const body of [
    { status: "in-progress", reason: "Working on it" },
    { status: "resolved", reason: "Done", resolutionCode: "fixed", resolutionNotes: "Restarted the worker" },
  ]) {
    const result = await request(user, `/api/tickets/${ticket.id}`, "PUT", body);
    assert.equal(result.status, 200, JSON.stringify(result.body));
  }
}
before(async () => {
  // Arena base tables are normally bootstrapped by the separate music schema.
  for (const table of ["arena_votes", "arena_brackets", "arena_contests"]) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table}(id SERIAL PRIMARY KEY)`);
  }
  await ensureAllTables();
  await ensureAllTables();
  for (const [key, role] of Object.entries({
    owner: "superuser", otherOwner: "superuser", admin: "admin", browserAdmin: "admin", moderator: "moderator",
    otherModerator: "moderator", customer: "user", otherCustomer: "user",
  })) {
    const email = `${key}_${runId}@example.test`;
    const result = await pool.query(
      "INSERT INTO users(username,email,password,role,is_verified) VALUES ($1,$2,'not-a-login-password',$3,true) RETURNING id",
      [`ticket_test_${key}_${crypto.randomUUID().slice(0, 8)}`, email, role],
    );
    users[key] = result.rows[0].id;
    const claims = { userId: String(users[key]), email, role, geoAdminCodeAuthenticated: true };
    if (key === "owner") claims.ownerMfa = true;
    tokens[key] = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: "10m" });
  }
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.get("/__test/login/:role", (req, res) => {
    const token = tokens[req.params.role];
    if (!token) return res.status(400).json({ error: "Unknown fixture" });
    res.cookie("auth_token", token, { httpOnly: true });
    return res.json({ success: true });
  });
  app.get("/auth/session", requireAuth(), (req, res) => res.json({
    success: true, user: { ...req.user, id: req.user.userId, name: req.user.role, subscriptionTier: "free" },
  }));
  app.get("/auth/owner-status", requireAuth(), (req, res) => res.json({ isOwner: isOwner(req.user) }));
  app.get("/api/csrf-token", (_req, res) => res.json({ csrfToken: "isolated-test-token" }));
  app.use("/api/tickets", tickets);
  app.use("/api/implementation-tracking", tracking);
  app.use("/", properties);
  app.use("/api/request", submissionRequests);
  app.use("/api/geo-actions", geoActions);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/admin", tableAdminRouter);
  app.use("/api/manage", managementRouter);
  app.use("/api/v1/payments", paymentRouter);
  app.use("/api/payments", paymentSettingsRouter);
  app.use("/auth", invitationRouter);
  app.use("/auth", authRouter);
  app.get("/owner-zone", requireOwner, (_req, res) => res.json({ success: true }));
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  backgroundIntervals.forEach(clearInterval);
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await pool.end();
});
test("owner boundary rejects every other role and fails closed without configuration", async () => {
  assert.equal((await request("owner", "/owner-zone")).status, 200);
  assert.equal((await request("admin", "/api/implementation-tracking")).status, 200);
  assert.equal((await request("admin", "/api/implementation-tracking/activity")).status, 200);
  for (const role of ["otherOwner", "moderator", "customer"]) {
    assert.equal((await request(role, "/owner-zone")).status, 403);
    assert.equal((await request(role, "/api/implementation-tracking")).status, 403);
  }
  assert.equal((await request(null, "/owner-zone")).status, 401);
  delete process.env.SUPERADMIN_EMAIL;
  assert.equal((await request("owner", "/owner-zone")).status, 403);
  process.env.SUPERADMIN_EMAIL = ownerEmail;
});
test("subscribers cannot mutate GeoAdmin content while public requests remain anonymous", async () => {
  await pool.query(
    "UPDATE users SET subscription_tier='max', subscription_status='active' WHERE id=$1",
    [users.customer],
  );
  for (const [path, method, body] of [
    ["/api/properties", "POST", { name: "Subscriber listing", type: "house", city: "Abidjan", price: 100 }],
    ["/api/verifications/submit", "POST", { contactName: "Subscriber", contactEmail: "subscriber@example.test", businessRegistrationNumber: "X" }],
    ["/api/request/artist", "POST", { stageName: "Subscriber Artist" }],
    ["/api/request/job", "POST", { title: "Subscriber Job", company: "Example" }],
    ["/api/geo-actions/request", "POST", { actionType: "edit", entityType: "business", entityId: "1", requestedChange: { name: "Changed" } }],
  ]) {
    assert.equal((await request("customer", path, method, body)).status, 403, `${method} ${path}`);
  }
  assert.equal((await request("owner", "/api/properties", "POST", {})).status, 400);
  await pool.query(
    "UPDATE users SET subscription_tier='free', subscription_status='active' WHERE id=$1",
    [users.customer],
  );
});
test("Admins can read tracker history and signal the owner but cannot edit the tracker", async () => {
  const lots = await request("admin", "/api/implementation-tracking");
  assert.equal(lots.status, 200);
  assert.equal(lots.body.length, 11);
  const forbiddenUpdate = await request("admin", "/api/implementation-tracking/A1", "PUT", {
    status: "tested",
    evidence: "Not allowed",
    blocker: "",
  });
  assert.equal(forbiddenUpdate.status, 403);
  assert.equal((await request("admin", "/api/implementation-tracking/signals")).status, 403);

  const sent = await request("admin", "/api/implementation-tracking/signals", "POST", {
    lotId: "A1",
    message: "Please review the acceptance evidence for this lot.",
  });
  assert.equal(sent.status, 201, JSON.stringify(sent.body));
  const signals = await request("owner", "/api/implementation-tracking/signals");
  assert.equal(signals.status, 200);
  assert.ok(signals.body.some((signal) => signal.changes.message === "Please review the acceptance evidence for this lot."));
  const notification = await pool.query(
    "SELECT type, action_url FROM notifications WHERE user_id=$1 AND type='implementation_tracker_signal' ORDER BY created_at DESC LIMIT 1",
    [users.owner],
  );
  assert.equal(notification.rows[0]?.type, "implementation_tracker_signal");
  assert.equal(notification.rows[0]?.action_url, "/geo-admin/dashboard");
});
test("actual financial, database, admin and invitation routes reject non-owners", async () => {
  for (const role of ["otherOwner", "admin", "moderator", "customer"]) {
    for (const [path, method, body] of [
      ["/api/manage/countries", "GET"],
      ["/api/admin/execute-query", "POST", { query: "SELECT 1" }],
      ["/api/v1/admin/users", "GET"],
      ["/api/v1/admin/roles", "GET"],
      ["/api/v1/admin/security/users", "GET"],
      ["/api/v1/admin/verification/queue", "GET"],
      ["/auth/geoadmin-access", "GET"],
      ["/auth/geoadmin-access", "POST", {}],
      ["/auth/tsr/whitelist", "GET"],
      ["/auth/tsr/whitelist", "POST", { email: "must-not-be-invited@example.test" }],
      ["/api/v1/payments/customers", "GET"],
      ["/api/v1/payments/pos-stats", "GET"],
      ["/api/v1/payments/charge", "POST", {}],
      ["/api/v1/payments/refund", "POST", {}],
      ["/api/payments/admin/settings", "GET"],
      ["/api/payments/admin/settings/stripe_publishable_key", "PUT", { value: "must-not-be-written" }],
    ]) {
      assert.equal((await request(role, path, method, body)).status, 403, `${role}: ${method} ${path}`);
    }
  }
});
test("invited Admins use the delegated Admin Panel without owner-only data", async () => {
  await pool.query(
    "INSERT INTO audit_logs(user_id,action,entity_type,entity_id) VALUES ($1,'tracker-update','implementation_lot','A1'),($1,'business-update','business','1')",
    [users.owner],
  );
  for (const path of ["/api/v1/admin/stats", "/api/v1/admin/businesses", "/api/v1/admin/categories", "/api/v1/admin/jobs", "/api/v1/admin/pages"]) {
    assert.equal((await request("admin", path)).status, 200, path);
  }
  const adminLog = await request("admin", "/api/v1/admin/activity-log");
  assert.equal(adminLog.status, 200);
  assert.ok(adminLog.body.data.some((row) => row.entity === "business"));
  assert.ok(adminLog.body.data.every((row) => ["artist", "business", "campaign", "category", "job"].includes(row.entity)));
  const ownerLog = await request("owner", "/api/v1/admin/activity-log");
  assert.ok(ownerLog.body.data.some((row) => row.entity === "implementation_lot"));
  for (const role of ["otherOwner", "moderator", "customer"]) {
    assert.equal((await request(role, "/api/v1/admin/stats")).status, 403, role);
  }
  assert.equal((await request(null, "/api/v1/admin/stats")).status, 401);
});
test("ticket scopes, claim/reassignment and internal note privacy hold through HTTP", async () => {
  const ticket = await create();
  assert.equal((await request("otherCustomer", `/api/tickets/${ticket.id}`)).status, 404);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}/comments`, "POST", { body: "Not claimed" })).status, 403);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}/assign`, "PUT", { assigneeId: users.moderator, reason: "Claim" })).status, 200);
  assert.equal((await request("otherModerator", `/api/tickets/${ticket.id}`)).status, 404);
  assert.equal((await request("otherOwner", `/api/tickets/${ticket.id}`)).status, 404);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}/assign`, "PUT", { assigneeId: users.admin, reason: "Move" })).status, 403);
  assert.equal((await request("customer", `/api/tickets/${ticket.id}/comments`, "POST", { body: "Secret", internal: true })).status, 403);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}/comments`, "POST", { body: "Internal only", internal: true })).status, 201);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}/comments`, "POST", { body: "Public answer" })).status, 201);
  const comments = await request("customer", `/api/tickets/${ticket.id}/comments`);
  assert.equal(comments.body.length, 1);
  assert.equal(comments.body[0].body, "Public answer");
  const events = await request("customer", `/api/tickets/${ticket.id}/events`);
  assert.ok(events.body.every((entry) => !entry.internal));
  assert.equal((await request("owner", `/api/tickets/${ticket.id}`, "DELETE")).status, 405);
  assert.equal((await request("admin", `/api/tickets/${ticket.id}`, "PUT", { status: "voided", reason: "Not owner" })).status, 403);
});
test("even the owner cannot grant SuperAdmin through any account-management route", async () => {
  const { rows: [reservedRole] } = await pool.query(
    `INSERT INTO admin_roles(name,description,permissions,is_system,color)
     VALUES ('superuser','Personal owner status','[]',true,'bg-red-100 text-red-800')
     ON CONFLICT(name) DO UPDATE SET description=EXCLUDED.description RETURNING id`,
  );
  const { rows: [adminRole] } = await pool.query(
    `INSERT INTO admin_roles(name,description,permissions,is_system,color)
     VALUES ('admin','Operational administrator','[]',true,'bg-orange-100 text-orange-800')
     ON CONFLICT(name) DO UPDATE SET description=EXCLUDED.description RETURNING id`,
  );
  for (const role of ["superuser", "superadmin", "Super_Admin", "owner"]) {
    for (const [path, method, body] of [
      [`/api/v1/admin/security/users/${users.otherCustomer}/change-role`, "POST", { role }],
      ["/auth/admin/change-role", "POST", { userId: users.otherCustomer, newRole: role }],
      ["/api/v1/admin/users", "POST", { username: `blocked_${runId}`, email: `blocked_${runId}@example.test`, password: "NotARealPassword123", role }],
      [`/api/v1/admin/users/${users.otherCustomer}`, "PUT", { role }],
      ["/api/v1/admin/roles", "POST", { name: role, permissions: [] }],
      ["/api/admin/table/users", "POST", { username: `blocked_${runId}`, role }],
      [`/api/admin/table/users/${users.otherCustomer}`, "PUT", { role }],
    ]) {
      assert.equal((await request("owner", path, method, body)).status, 403, `${method} ${path}: ${role}`);
    }
  }
  assert.equal((await request("owner", `/api/v1/admin/roles/${reservedRole.id}/assign`, "POST", { userId: users.otherCustomer })).status, 403);
  assert.equal((await request("owner", `/api/v1/admin/roles/${adminRole.id}/assign`, "POST", { userId: users.owner })).status, 403);
  assert.equal((await request("owner", `/api/v1/admin/users/${users.owner}`, "PUT", { role: "admin" })).status, 403);
  assert.equal((await request("owner", "/auth/admin/change-role", "POST", { userId: users.owner, newRole: "admin" })).status, 403);
  assert.equal((await request("owner", `/api/admin/table/users/${users.owner}`, "PUT", { role: "admin" })).status, 403);
  assert.equal((await request("owner", "/api/admin/execute-query", "POST", { query: "SELECT 1 AS diagnostic" })).body.data[0].diagnostic, 1);
  for (const query of [
    `UPDATE users SET role='superuser' WHERE id=${users.otherCustomer}`,
    `WITH promoted AS (UPDATE users SET role='superuser' WHERE id=${users.otherCustomer} RETURNING id) SELECT * FROM promoted`,
    `COMMIT; UPDATE users SET role='superuser' WHERE id=${users.otherCustomer}`,
    "SET TRANSACTION READ WRITE",
  ]) {
    assert.equal((await request("owner", "/api/admin/execute-query", "POST", { query })).status, 403, query);
  }
  assert.equal((await pool.query("SELECT role FROM users WHERE id=$1", [users.otherCustomer])).rows[0].role, "user");
  assert.equal((await pool.query("SELECT role FROM users WHERE id=$1", [users.owner])).rows[0].role, "superuser");

  assert.equal((await request("owner", `/api/v1/admin/security/users/${users.otherCustomer}/change-role`, "POST", { role: "moderator" })).status, 200);
  assert.equal((await request("owner", "/auth/admin/change-role", "POST", { userId: users.otherCustomer, newRole: "admin" })).status, 200);
  await pool.query("UPDATE users SET role='user' WHERE id=$1", [users.otherCustomer]);
});
test("staff cannot revoke the owner's session, but can revoke their own", async () => {
  for (const role of ["otherOwner", "admin", "moderator", "customer"]) {
    const { rows: [session] } = await pool.query(
      "INSERT INTO active_sessions(user_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '1 day') RETURNING id",
      [users.owner, crypto.randomUUID()],
    );
    assert.equal((await request(role, `/auth/logout/${session.id}`, "POST")).status, 404);
    assert.equal((await pool.query("SELECT is_revoked FROM active_sessions WHERE id=$1", [session.id])).rows[0].is_revoked, false);
  }
  const { rows: [ownSession] } = await pool.query(
    "INSERT INTO active_sessions(user_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '1 day') RETURNING id",
    [users.moderator, crypto.randomUUID()],
  );
  assert.equal((await request("moderator", `/auth/logout/${ownSession.id}`, "POST")).status, 200);
  assert.equal((await pool.query("SELECT is_revoked FROM active_sessions WHERE id=$1", [ownSession.id])).rows[0].is_revoked, true);
});
test("concurrent staff claims cannot overwrite another assignee", async () => {
  const ticket = await create();
  const results = await Promise.all(["moderator", "otherModerator"].map((role) =>
    request(role, `/api/tickets/${ticket.id}/assign`, "PUT", { assigneeId: users[role], reason: "Concurrent claim" })));
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 404]);
});
test("database write failures are explicit and do not report successful tickets", async () => {
  const functionName = `ticket_test_reject_${runId}`;
  const title = `rejected_${runId}`;
  await pool.query(`CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Isolated injected write failure'; END; $$`);
  await pool.query(`CREATE TRIGGER ${functionName} BEFORE INSERT ON tickets
    FOR EACH ROW WHEN (NEW.title='${title}') EXECUTE FUNCTION ${functionName}()`);
  try {
    const result = await request("customer", "/api/tickets", "POST", { title });
    assert.equal(result.status, 503);
    assert.equal((await pool.query("SELECT id FROM tickets WHERE title=$1", [title])).rows.length, 0);
  } finally {
    await pool.query(`DROP TRIGGER ${functionName} ON tickets`);
    await pool.query(`DROP FUNCTION ${functionName}()`);
  }
});
test("pending metadata, withdrawal and reopening preserve records and history", async () => {
  const ticket = await create();
  await assign(ticket);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}`, "PUT", { status: "pending", reason: "Waiting" })).status, 400);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}`, "PUT", {
    status: "pending", reason: "Customer information required", pendingReason: "customer",
    followUpAt: new Date(Date.now() + 86400000).toISOString(),
  })).status, 200);
  assert.equal((await request("customer", `/api/tickets/${ticket.id}/comments`, "POST", { body: "Here is the information" })).status, 201);
  assert.equal((await request("customer", `/api/tickets/${ticket.id}`)).body.status, "in-progress");
  assert.equal((await request("customer", `/api/tickets/${ticket.id}`, "PUT", { status: "withdrawn", reason: "No longer needed" })).status, 200);
  assert.equal((await request("customer", `/api/tickets/${ticket.id}`, "PUT", { status: "open", reason: "Needed again" })).status, 200);
  assert.equal((await request("owner", `/api/tickets/${ticket.id}`, "PUT", { status: "voided", reason: "Duplicate test" })).status, 200);
  assert.equal((await request("customer", `/api/tickets/${ticket.id}`, "PUT", { status: "open", reason: "Cannot override invalidation" })).status, 403);
  assert.ok((await request("owner", `/api/tickets/${ticket.id}/events`)).body.length >= 7);
});
test("batch updates roll back the entire batch if one transition is forbidden", async () => {
  const first = await create();
  const second = await create();
  await assign(first);
  await assign(second);
  await request("customer", `/api/tickets/${second.id}`, "PUT", { status: "withdrawn", reason: "Stop" });
  const result = await request("admin", "/api/tickets/batch/update", "POST", {
    ids: [first.id, second.id], updates: { status: "pending", reason: "Waiting", pendingReason: "internal", followUpAt: new Date(Date.now() + 86400000).toISOString() },
  });
  assert.equal(result.status, 403);
  assert.equal((await request("admin", `/api/tickets/${first.id}`)).body.status, "open");
});
test("confirmed handoff is scoped and idempotent even under concurrency", async () => {
  const conversation = await pool.query(
    "INSERT INTO inbox_conversations(user_id,type,participant_id,participant_name) VALUES ($1,'support','support','Support') RETURNING id",
    [users.customer],
  );
  const conversationId = conversation.rows[0].id;
  await pool.query(
    "INSERT INTO inbox_messages(conversation_id,sender_id,sender_name,content) VALUES ($1,$2,'Customer','Please help')",
    [conversationId, String(users.customer)],
  );
  assert.equal((await request("otherCustomer", "/api/tickets/handoff", "POST", { conversationId, confirmed: true })).status, 404);
  assert.equal((await request("customer", "/api/tickets/handoff", "POST", { conversationId, confirmed: false })).status, 400);
  const results = await Promise.all(Array.from({ length: 5 }, () => request("customer", "/api/tickets/handoff", "POST", { conversationId, confirmed: true })));
  assert.ok(results.every((result) => result.status === 200), JSON.stringify(results));
  assert.equal(new Set(results.map((result) => result.body.id)).size, 1);
  assert.equal((await pool.query("SELECT id FROM tickets WHERE conversation_id=$1", [conversationId])).rows.length, 1);
  const fromChat = await request("otherCustomer", "/api/tickets/handoff", "POST", { message: "Global chat help", confirmed: true });
  assert.equal(fromChat.status, 200, JSON.stringify(fromChat.body));
  assert.equal((await request("otherCustomer", "/api/tickets/handoff", "POST", { message: "Retry", confirmed: true })).body.id, fromChat.body.id);
});
test("follow-up alerts survive reruns, deduplicate and never automatically abandon", async () => {
  const ticket = await create();
  await assign(ticket);
  await request("moderator", `/api/tickets/${ticket.id}`, "PUT", {
    status: "pending", reason: "Need response", pendingReason: "customer", followUpAt: new Date(Date.now() + 86400000).toISOString(),
  });
  await pool.query("UPDATE tickets SET pending_since=NOW()-INTERVAL '15 days', follow_up_at=NOW()-INTERVAL '1 day',sla_due_at=NOW()-INTERVAL '1 hour' WHERE id=$1", [ticket.id]);
  await runTicketMonitor();
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  await promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    "const {runTicketMonitor}=await import('./server/services/ticket-monitor.ts'); const {pool}=await import('./server/db.ts'); await runTicketMonitor(); await pool.end();"],
  { cwd: new URL("../../", import.meta.url), env: process.env, timeout: 15000 });
  const alerts = await pool.query("SELECT kind FROM ticket_alerts WHERE ticket_id=$1 ORDER BY kind", [ticket.id]);
  // The customer wait pauses the SLA clock, so no breach alert is expected here.
  assert.deepEqual(alerts.rows.map((row) => row.kind), ["abandonment-proposed", "customer-reminder-3", "customer-reminder-7", "follow-up"]);
  const current = await request("admin", `/api/tickets/${ticket.id}`);
  assert.equal(current.body.status, "pending");
  assert.equal(current.body.sla_breached, false);
  assert.ok(current.body.abandonment_proposed_at);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}`, "PUT", { status: "abandoned", reason: "No answer" })).status, 403);
  assert.equal((await request("admin", `/api/tickets/${ticket.id}`, "PUT", { status: "abandoned", reason: "Reviewed reminders and no answer" })).status, 200);
  const comments = await pool.query("SELECT * FROM ticket_comments WHERE ticket_id=$1", [ticket.id]);
  assert.equal(comments.rows.length, 2);
  const internalWait = dueTicketAlerts({ id: 999, status: "pending", pending_reason: "internal", pending_since: "2020-01-01", follow_up_at: null, sla_due_at: null });
  assert.equal(internalWait.length, 0);
});
test("breach alerts fire only while the SLA clock runs and never duplicate", async () => {
  const wait = (ticket, pendingReason) => request("moderator", `/api/tickets/${ticket.id}`, "PUT", {
    status: "pending", reason: "Waiting", pendingReason, followUpAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const running = await create();
  const internal = await create();
  const vendor = await create();
  for (const ticket of [running, internal, vendor]) await assign(ticket);
  assert.equal((await wait(internal, "internal")).status, 200);
  assert.equal((await wait(vendor, "third-party")).status, 200);
  await pool.query("UPDATE tickets SET sla_due_at=NOW()-INTERVAL '1 hour' WHERE id = ANY($1::int[])", [[running.id, internal.id, vendor.id]]);
  await runTicketMonitor();
  await runTicketMonitor();
  const breaches = async (ticket) => (await pool.query(
    "SELECT 1 FROM ticket_alerts WHERE ticket_id=$1 AND kind='sla-breach'", [ticket.id],
  )).rows.length;
  assert.equal(await breaches(running), 1);
  assert.equal(await breaches(internal), 1);
  assert.equal(await breaches(vendor), 0);
  assert.equal((await request("admin", `/api/tickets/${running.id}`)).body.sla_breached, true);
  assert.equal((await request("admin", `/api/tickets/${vendor.id}`)).body.sla_breached, false);
});
test("only support staff log time, the total adds up and requesters never see it", async () => {
  const ticket = await create();
  await assign(ticket);
  const comment = (user, body) => request(user, `/api/tickets/${ticket.id}/comments`, "POST", body);
  const total = async () => (await request("admin", `/api/tickets/${ticket.id}`)).body.time_spent_minutes;
  const denied = await comment("customer", { body: "I spent an hour", timeSpentMinutes: 60 });
  assert.equal(denied.status, 403);
  assert.match(denied.body.error, /support staff/);
  for (const timeSpentMinutes of [0, -5, 1441, 1.5, "30", null]) {
    assert.equal((await comment("moderator", { body: "Bad entry", timeSpentMinutes })).status, 400, String(timeSpentMinutes));
  }
  assert.equal(await total(), 0);
  const logged = await comment("moderator", { body: "Restarted the worker", timeSpentMinutes: 45 });
  assert.equal(logged.status, 201, JSON.stringify(logged.body));
  assert.equal(logged.body.time_spent_minutes, 45);
  assert.equal((await comment("moderator", { body: "Private check", internal: true, timeSpentMinutes: 30 })).status, 201);
  assert.equal((await comment("moderator", { body: "Plain update" })).body.time_spent_minutes, null);
  assert.equal(await total(), 75);
  const parallel = await Promise.all(Array.from({ length: 5 }, (_, index) => comment("moderator", { body: `Parallel ${index}`, timeSpentMinutes: 10 })));
  assert.ok(parallel.every((result) => result.status === 201), JSON.stringify(parallel));
  assert.equal(await total(), 125);

  const mine = await request("customer", `/api/tickets/${ticket.id}`);
  assert.equal(mine.status, 200);
  assert.ok(!("time_spent_minutes" in mine.body) && !("problem_id" in mine.body));
  const reply = await comment("customer", { body: "Thanks" });
  assert.equal(reply.status, 201);
  assert.ok(!("time_spent_minutes" in reply.body));
  const visible = (await request("customer", `/api/tickets/${ticket.id}/comments`)).body;
  assert.equal(visible.length, 8);
  assert.ok(visible.every((entry) => !("time_spent_minutes" in entry)));
  const staffView = (await request("moderator", `/api/tickets/${ticket.id}/comments`)).body;
  assert.equal(staffView.reduce((sum, entry) => sum + (entry.time_spent_minutes ?? 0), 0), 125);

  const timeEvents = (await request("moderator", `/api/tickets/${ticket.id}/events`)).body.filter((entry) => entry.kind === "time-logged");
  assert.deepEqual(timeEvents.map((entry) => entry.details.minutes).sort((a, b) => a - b), [10, 10, 10, 10, 10, 30, 45]);
  assert.ok(timeEvents.every((entry) => entry.internal));
  assert.equal((await request("customer", `/api/tickets/${ticket.id}/events`)).body.filter((entry) => entry.kind === "time-logged").length, 0);
  await assert.rejects(
    pool.query("INSERT INTO ticket_comments(ticket_id,author_id,body,time_spent_minutes) VALUES ($1,$2,'x',1441)", [ticket.id, users.moderator]),
    /check constraint/,
  );

  await resolve(ticket);
  assert.equal((await comment("moderator", { body: "Late entry", timeSpentMinutes: 20 })).status, 409);
  assert.equal(await total(), 125);
});
test("a ticket links only to an open problem, and only its worker or a manager changes the link", async () => {
  const link = (user, ticket, problemId) => request(user, `/api/tickets/${ticket.id}/problem`, "PUT", { problemId });
  const incident = await create();
  const sibling = await create();
  const unclaimed = await create();
  const problem = await createWith("admin", { title: "Integration problem", type: "problem" });
  const secondProblem = await createWith("admin", { title: "Integration problem", type: "problem" });
  const hiddenProblem = await createWith("admin", { title: "Integration problem", type: "problem" });
  const ownProblem = await createWith("customer", { title: "Integration problem", type: "problem" });
  for (const ticket of [incident, sibling, problem, secondProblem]) await assign(ticket);
  await assign(hiddenProblem, "otherModerator");

  assert.equal((await link("customer", incident, ownProblem.id)).status, 403);
  const foreign = await link("customer", incident, problem.id);
  assert.equal(foreign.status, 404);
  assert.equal(foreign.body.error, "Problem not found");
  assert.equal((await link("otherModerator", incident, problem.id)).status, 404);
  assert.equal((await link("moderator", unclaimed, problem.id)).status, 403);
  assert.equal((await link("moderator", incident, 2000000000)).body.error, "Problem not found");
  assert.equal((await link("moderator", incident, hiddenProblem.id)).status, 404);
  assert.match((await link("moderator", incident, sibling.id)).body.error, /Only a problem/);
  assert.match((await link("moderator", incident, incident.id)).body.error, /Only a problem/);
  assert.match((await link("moderator", problem, secondProblem.id)).body.error, /another problem/);
  assert.match((await link("moderator", incident, null)).body.error, /No problem is linked/);
  for (const body of [{ problemId: "7" }, { problemId: 0 }, {}, { problemId: 1, extra: true }]) {
    assert.equal((await request("moderator", `/api/tickets/${incident.id}/problem`, "PUT", body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await request("moderator", `/api/tickets/${incident.id}`)).body.problem_id, null);

  const linked = await link("moderator", incident, problem.id);
  assert.equal(linked.status, 200, JSON.stringify(linked.body));
  assert.equal(linked.body.problem_id, problem.id);
  assert.match((await link("moderator", incident, problem.id)).body.error, /already linked/);

  // Unlinking stays possible after the problem itself is resolved; linking to it does not.
  assert.equal((await link("moderator", sibling, problem.id)).status, 200);
  await resolve(problem);
  const unlinked = await link("moderator", sibling, null);
  assert.equal(unlinked.status, 200, JSON.stringify(unlinked.body));
  assert.equal(unlinked.body.problem_id, null);
  const lateLink = await link("moderator", sibling, problem.id);
  assert.equal(lateLink.status, 409);
  assert.match(lateLink.body.error, /Reopen the problem/);

  await resolve(incident);
  const closed = await link("moderator", incident, secondProblem.id);
  assert.equal(closed.status, 409);
  assert.match(closed.body.error, /Reopen the ticket/);
  assert.match((await link("moderator", incident, null)).body.error, /Reopen the ticket/);
});
test("problem links keep history on both sides and stay inside each viewer's ticket scope", async () => {
  const link = (user, ticket, problemId) => request(user, `/api/tickets/${ticket.id}/problem`, "PUT", { problemId });
  const events = async (ticket, user = "admin") => (await request(user, `/api/tickets/${ticket.id}/events`)).body;
  const incident = await create();
  const elsewhere = await create();
  const problem = await createWith("admin", { title: "Integration problem", type: "problem" });
  const secondProblem = await createWith("admin", { title: "Integration problem", type: "problem" });
  const hiddenProblem = await createWith("admin", { title: "Integration problem", type: "problem" });
  for (const ticket of [incident, problem, secondProblem]) await assign(ticket);
  for (const ticket of [elsewhere, hiddenProblem]) await assign(ticket, "otherModerator");

  assert.equal((await link("moderator", incident, problem.id)).status, 200);
  const replaced = await link("admin", incident, secondProblem.id);
  assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
  assert.equal(replaced.body.problem_id, secondProblem.id);
  const own = await events(incident);
  assert.deepEqual(own.filter((entry) => entry.kind === "problem-linked").map((entry) => entry.details),
    [{ from: null, to: problem.id }, { from: problem.id, to: secondProblem.id }]);
  assert.deepEqual((await events(problem)).filter((entry) => entry.kind.startsWith("incident-")).map((entry) => [entry.kind, entry.details.ticketId]),
    [["incident-linked", incident.id], ["incident-unlinked", incident.id]]);
  assert.deepEqual((await events(secondProblem)).filter((entry) => entry.kind.startsWith("incident-")).map((entry) => [entry.kind, entry.details.ticketId]),
    [["incident-linked", incident.id]]);
  assert.ok(own.filter((entry) => entry.kind.startsWith("problem-")).every((entry) => entry.internal));

  const customerKinds = (await events(incident, "customer")).map((entry) => entry.kind);
  assert.ok(customerKinds.every((kind) => !kind.includes("problem")), customerKinds.join());
  assert.ok(!("problem_id" in (await request("customer", `/api/tickets/${incident.id}`)).body));
  assert.equal((await request("customer", `/api/tickets/${incident.id}/links`)).status, 403);
  assert.equal((await request("otherModerator", `/api/tickets/${incident.id}/links`)).status, 404);

  const fromIncident = (await request("moderator", `/api/tickets/${incident.id}/links`)).body;
  assert.equal(fromIncident.problem.id, secondProblem.id);
  assert.equal(fromIncident.problem.ticket_type, "problem");
  assert.deepEqual(fromIncident.related, []);
  assert.equal((await link("admin", elsewhere, secondProblem.id)).status, 200);
  const fromProblem = async (user) => (await request(user, `/api/tickets/${secondProblem.id}/links`)).body;
  assert.equal((await fromProblem("moderator")).problem, null);
  assert.deepEqual((await fromProblem("moderator")).related.map((item) => item.id), [incident.id]);
  assert.deepEqual((await fromProblem("admin")).related.map((item) => item.id), [incident.id, elsewhere.id]);

  // A problem outside the viewer's scope is reported by id on the ticket but never described.
  assert.equal((await link("admin", incident, hiddenProblem.id)).status, 200);
  assert.equal((await request("moderator", `/api/tickets/${incident.id}`)).body.problem_id, hiddenProblem.id);
  assert.equal((await request("moderator", `/api/tickets/${incident.id}/links`)).body.problem, null);
  assert.equal((await request("admin", `/api/tickets/${incident.id}/links`)).body.problem.id, hiddenProblem.id);

  const cleared = await link("admin", incident, null);
  assert.equal(cleared.body.problem_id, null);
  assert.deepEqual((await events(incident)).filter((entry) => entry.kind === "problem-unlinked").map((entry) => entry.details),
    [{ from: hiddenProblem.id, to: null }]);
  assert.deepEqual((await events(hiddenProblem)).filter((entry) => entry.kind.startsWith("incident-")).map((entry) => entry.kind),
    ["incident-linked", "incident-unlinked"]);
});
test("a link that races the problem's resolution waits for it and is then refused", async () => {
  const incident = await create();
  const problem = await createWith("admin", { title: "Integration problem", type: "problem" });
  for (const ticket of [incident, problem]) await assign(ticket);
  // Resolves the problem in a transaction that stays open, the way a concurrent PUT /api/tickets/:id does: lock first, commit later.
  const resolver = await pool.connect();
  let linking;
  try {
    await resolver.query("BEGIN");
    await resolver.query("SELECT id FROM tickets WHERE id=$1 FOR UPDATE", [problem.id]);
    await resolver.query("UPDATE tickets SET status='resolved', resolved_at=NOW() WHERE id=$1", [problem.id]);
    linking = request("moderator", `/api/tickets/${incident.id}/problem`, "PUT", { problemId: problem.id });
    let waiting = false;
    for (let attempt = 0; attempt < 200 && !waiting; attempt += 1) {
      waiting = (await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")).rowCount > 0;
      if (!waiting) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(waiting, true, "the link request never waited on the problem being resolved");
    await resolver.query("COMMIT");
  } catch (error) {
    await resolver.query("ROLLBACK").catch(() => {});
    await linking?.catch(() => {});
    throw error;
  } finally {
    resolver.release();
  }
  const result = await linking;
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.match(result.body.error, /Reopen the problem/);
  assert.equal((await pool.query("SELECT problem_id FROM tickets WHERE id=$1", [incident.id])).rows[0].problem_id, null);
  const linkedEvents = (await request("admin", `/api/tickets/${problem.id}/events`)).body.filter((entry) => entry.kind === "incident-linked");
  assert.deepEqual(linkedEvents, []);
});
test("the SLA report counts met, breached, paused and at-risk work inside the caller's scope", async () => {
  const report = async (user = "admin", days = 30) => {
    const result = await request(user, `/api/tickets/reports/sla?days=${days}`);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body;
  };
  assert.equal((await request(null, "/api/tickets/reports/sla")).status, 401);
  for (const user of ["customer", "otherOwner"]) assert.equal((await request(user, "/api/tickets/reports/sla")).status, 403, user);
  for (const days of ["0", "366", "abc", "1.5", "-3"]) {
    assert.equal((await request("admin", `/api/tickets/reports/sla?days=${days}`)).status, 400, days);
  }
  const before = { admin30: await report(), admin90: await report("admin", 90), moderator30: await report("moderator") };
  assert.equal(before.admin30.windowDays, 30);
  assert.deepEqual(before.admin30.byPriority.map((entry) => entry.key).slice(0, 4), ["critical", "high", "medium", "low"]);
  assert.deepEqual(before.admin30.byType.map((entry) => entry.key).slice(0, 4), ["incident", "request", "problem", "change"]);

  const met = await createWith("customer", { title: "Report met", priority: "medium" });
  const late = await createWith("customer", { title: "Report breached", priority: "high", type: "request" });
  const rejected = await createWith("customer", { title: "Report rejected", priority: "low", type: "change" });
  const onTrack = await createWith("customer", { title: "Report on track", priority: "medium" });
  const atRisk = await createWith("customer", { title: "Report at risk", priority: "high" });
  const overdue = await createWith("customer", { title: "Report overdue", priority: "critical" });
  const paused = await createWith("customer", { title: "Report paused", priority: "low" });
  const old = await createWith("customer", { title: "Report old", priority: "medium", type: "problem" });
  const elsewhere = await createWith("customer", { title: "Report elsewhere", priority: "critical" });
  const activeFixtures = [onTrack, atRisk, overdue, paused, elsewhere].map((ticket) => ticket.id);
  try {
    for (const ticket of [met, late, paused, old]) await assign(ticket);
    await assign(elsewhere, "otherModerator");
    const log = (ticket, minutes) => request("moderator", `/api/tickets/${ticket.id}/comments`, "POST", { body: "Worked on it", timeSpentMinutes: minutes });
    assert.equal((await log(met, 60)).status, 201);
    assert.equal((await log(late, 30)).status, 201);
    await pool.query("UPDATE tickets SET sla_due_at=NOW()-INTERVAL '2 hours' WHERE id=$1", [late.id]);
    await resolve(met);
    await resolve(late);
    assert.equal((await request("admin", `/api/tickets/${rejected.id}/approval`, "POST", { decision: "rejected", reason: "Out of scope" })).status, 200);
    assert.equal((await request("moderator", `/api/tickets/${paused.id}`, "PUT", {
      status: "pending", reason: "Waiting for the customer", pendingReason: "customer",
      followUpAt: new Date(Date.now() + 86400000).toISOString(),
    })).status, 200);
    await pool.query("UPDATE tickets SET sla_due_at=NOW()-INTERVAL '1 hour' WHERE id=$1", [paused.id]);
    await pool.query("UPDATE tickets SET sla_due_at=NOW()+INTERVAL '1 hour' WHERE id=$1", [atRisk.id]);
    await pool.query("UPDATE tickets SET sla_due_at=NOW()-INTERVAL '2 years' WHERE id = ANY($1::int[])", [[overdue.id, elsewhere.id]]);
    await pool.query(
      `UPDATE tickets SET status='closed', created_at=NOW()-INTERVAL '60 days', resolved_at=NOW()-INTERVAL '45 days',
        sla_due_at=NOW()-INTERVAL '44 days', time_spent_minutes=15 WHERE id=$1`, [old.id],
    );

    const after = { admin30: await report(), admin90: await report("admin", 90), moderator30: await report("moderator") };
    const change = (now, then, fields) => Object.fromEntries(fields.map((field) => [field, now[field] - then[field]]));
    const totals = ["created", "resolved", "met", "breached", "timeSpentMinutes"];
    const states = ["total", "breached", "atRisk", "paused", "onTrack"];
    const row = (list, key) => list.find((entry) => entry.key === key);
    // The rejected change and the ticket resolved 45 days ago stay out of a 30-day resolved cohort.
    assert.deepEqual(change(after.admin30, before.admin30, totals), { created: 8, resolved: 2, met: 1, breached: 1, timeSpentMinutes: 90 });
    assert.deepEqual(change(after.admin90, before.admin90, totals), { created: 9, resolved: 3, met: 2, breached: 1, timeSpentMinutes: 105 });
    assert.deepEqual(change(after.admin30.active, before.admin30.active, states), { total: 5, breached: 2, atRisk: 1, paused: 1, onTrack: 1 });
    const priorities = (key) => change(row(after.admin30.byPriority, key), row(before.admin30.byPriority, key), totals);
    assert.deepEqual(priorities("medium"), { created: 2, resolved: 1, met: 1, breached: 0, timeSpentMinutes: 60 });
    assert.deepEqual(priorities("high"), { created: 2, resolved: 1, met: 0, breached: 1, timeSpentMinutes: 30 });
    assert.deepEqual(priorities("critical"), { created: 2, resolved: 0, met: 0, breached: 0, timeSpentMinutes: 0 });
    assert.deepEqual(priorities("low"), { created: 2, resolved: 0, met: 0, breached: 0, timeSpentMinutes: 0 });
    const types = (now, then, key) => change(row(now.byType, key), row(then.byType, key), totals);
    assert.deepEqual(types(after.admin30, before.admin30, "incident"), { created: 6, resolved: 1, met: 1, breached: 0, timeSpentMinutes: 60 });
    assert.deepEqual(types(after.admin30, before.admin30, "request"), { created: 1, resolved: 1, met: 0, breached: 1, timeSpentMinutes: 30 });
    assert.deepEqual(types(after.admin30, before.admin30, "change"), { created: 1, resolved: 0, met: 0, breached: 0, timeSpentMinutes: 0 });
    assert.deepEqual(types(after.admin30, before.admin30, "problem"), { created: 0, resolved: 0, met: 0, breached: 0, timeSpentMinutes: 0 });
    assert.deepEqual(types(after.admin90, before.admin90, "problem"), { created: 1, resolved: 1, met: 1, breached: 0, timeSpentMinutes: 15 });
    assert.equal(after.admin30.complianceRate, after.admin30.met / (after.admin30.met + after.admin30.breached));
    assert.equal(typeof after.admin30.avgResolutionHours, "number");
    assert.equal(typeof after.admin30.medianResolutionHours, "number");

    const listed = (report, ticket) => report.attention.find((entry) => entry.id === ticket.id);
    assert.deepEqual(
      { ...listed(after.admin30, overdue), sla_due_at: undefined },
      { id: overdue.id, title: "Report overdue", priority: "critical", status: "open", ticket_type: "incident", sla_due_at: undefined, state: "breached" },
    );
    assert.ok(listed(after.admin30, elsewhere));
    assert.equal(listed(after.admin30, paused), undefined);
    assert.equal(listed(after.admin30, onTrack), undefined);

    // A moderator sees unassigned tickets and their own, so the ticket held by another moderator drops out.
    assert.deepEqual(change(after.moderator30, before.moderator30, totals), { created: 7, resolved: 2, met: 1, breached: 1, timeSpentMinutes: 90 });
    assert.deepEqual(change(after.moderator30.active, before.moderator30.active, states), { total: 4, breached: 1, atRisk: 1, paused: 1, onTrack: 1 });
    assert.ok(listed(after.moderator30, overdue));
    assert.equal(listed(after.moderator30, elsewhere), undefined);
  } finally {
    // Leave no active fixtures behind, so repeated runs against one database stay comparable.
    await pool.query("UPDATE tickets SET status='withdrawn' WHERE id = ANY($1::int[])", [activeFixtures]);
  }
});
test("tracking requires evidence and deployed prerequisites, and persists updates", async () => {
  assert.equal((await request("owner", "/api/implementation-tracking/A1", "PUT", { status: "tested", evidence: "", blocker: "" })).status, 400);
  assert.equal((await request("owner", "/api/implementation-tracking/A2", "PUT", { status: "deployed", evidence: "test", blocker: "" })).status, 409);
  assert.equal((await request("owner", "/api/implementation-tracking/A1", "PUT", { status: "tested", evidence: "Isolated local integration test", blocker: "" })).status, 200);
  assert.equal((await request("owner", "/api/implementation-tracking")).body.find((lot) => lot.id === "A1").status, "tested");
  const history = await request("admin", "/api/implementation-tracking/activity");
  assert.equal(history.status, 200);
  assert.ok(history.body.some((entry) =>
    entry.lotId === "A1" &&
    entry.changedBy.startsWith("ticket_test_owner_") &&
    entry.changes.status === "tested",
  ));
});
test("revoked sessions and changed roles cannot retain privileged access", async () => {
  const tokenHash = crypto.createHash("sha256").update(tokens.admin).digest("hex");
  await pool.query("INSERT INTO active_sessions(user_id,token_hash,is_revoked,expires_at) VALUES ($1,$2,true,NOW()+INTERVAL '1 day')", [users.admin, tokenHash]);
  assert.equal((await request("admin", "/api/tickets")).status, 401);
  await pool.query("UPDATE users SET role='user' WHERE id=$1", [users.owner]);
  assert.equal((await request("owner", "/owner-zone")).status, 403);
  await pool.query("UPDATE users SET role='superuser' WHERE id=$1", [users.owner]);
});
test("browser: responsive staff queue, eight states, localization and owner tracker", async () => {
  const { createServer } = await import("vite");
  const { default: puppeteer } = await import("puppeteer");
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const cacheDir = await mkdtemp(join(tmpdir(), "versoair-ticket-ui-"));
  const harness = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div>
  <script type="module">
    import React from "react"; import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
    import {CountryProvider} from "/src/contexts/CountryContext.tsx";
    import {LanguageProvider} from "/src/components/LanguageSwitcher.tsx";
    import {AuthProvider} from "/src/contexts/AuthContext.tsx";
    import ProtectedRoute from "/src/components/ProtectedRoute.tsx";
    import Tickets from "/src/pages/tickets.tsx";
    import Tracker from "/src/components/ImplementationTracker.tsx";
    import {UsersSection} from "/src/components/sections/UsersSection.tsx";
    import "/src/index.css";
    const params = new URLSearchParams(location.search);
    const tracker = params.has("tracker");
    const trackerReadOnly = params.has("readonly");
    const accounts = params.has("accounts");
    const TrackerView = () => React.createElement(Tracker, {readOnly:trackerReadOnly});
    const SelectedComponent = tracker ? TrackerView : accounts ? UsersSection : Tickets;
    createRoot(document.getElementById("root")).render(React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},
      React.createElement(CountryProvider,null,React.createElement(LanguageProvider,null,React.createElement(AuthProvider,null,
        React.createElement(ProtectedRoute,{roles:tracker?["admin"]:undefined,ownerOnly:accounts,component:SelectedComponent}))))));
  </script></body></html>`;
  const vite = await createServer({
    configFile: `${root}vite.config.ts`, envFile: false, cacheDir,
    resolve: { dedupe: ["react", "react-dom"] },
    optimizeDeps: { entries: [], noDiscovery: true, include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "wouter", "lucide-react", "framer-motion", "transliteration", "@radix-ui/react-dialog", "@radix-ui/react-slot", "class-variance-authority", "clsx", "tailwind-merge"] },
    define: { "import.meta.env.VITE_API_URL": JSON.stringify("") },
    server: { host: "127.0.0.1", port: 0, hmr: false, proxy: { "/api": origin, "/auth": origin } },
    plugins: [{ name: "ticket-ui-harness", configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/__ticket-ui")) {
          res.setHeader("Content-Type", "text/html");
          res.end(await server.transformIndexHtml(req.url, harness));
        } else next();
      });
    } }],
  });
  let browser;
  const uiFixtures = [];
  try {
    await vite.listen();
    const browserOrigin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if ([browserOrigin, origin].some((url) => request.url().startsWith(url))) request.continue();
      else request.abort();
    });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("fsa_selected_language", "en");
      localStorage.setItem("fsa_language_override", "true");
      localStorage.setItem("fsa_detected_country_v2", JSON.stringify({ code: "CA", ts: Date.now(), manual: true }));
    });
    await page.goto(`${origin}/__test/login/moderator`);
    for (const width of [375, 1440]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`${browserOrigin}/__ticket-ui`);
      await page.waitForSelector("[data-testid=ticket-workspace]");
      await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Staff workspace");
      assert.equal(await page.$$eval('select[aria-label="Status"] option', (options) => options.length), 9);
      assert.equal(await page.$eval("body", (body) => body.scrollWidth <= innerWidth), true);
      assert.equal(await page.$('a[href="/geo-admin/dashboard"]'), null);
    }
    // Part 4 UI as the moderator who works the ticket: SLA report, time logging and problem links.
    const uiProblem = await createWith("customer", { type: "problem", title: `UI problem ${runId}`, description: "Shared root cause" });
    const uiIncident = await createWith("customer", { title: `UI incident ${runId}`, description: "Reported by a customer" });
    uiFixtures.push(uiProblem.id, uiIncident.id);
    // The admin session is revoked by the previous test, so this one uses its own manager account.
    await assign(uiIncident, "moderator", "browserAdmin");
    const reportToggle = 'button[aria-controls="sla-report-body"]';
    for (const width of [375, 1440]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`${browserOrigin}/__ticket-ui`);
      await page.waitForSelector("[data-testid=ticket-workspace]");
      assert.equal(await page.$("#sla-report-body table"), null);
      await page.click(reportToggle);
      await page.waitForSelector("#sla-report-body table");
      assert.equal(await page.$eval(reportToggle, (button) => button.getAttribute("aria-expanded")), "true");
      assert.equal(await page.$$eval("#sla-report-body table", (tables) => tables.length), 2);
      assert.equal(await page.$eval("body", (body) => body.scrollWidth <= innerWidth), true);
    }
    const inDialog = (text) => page.waitForFunction((expected) => document.querySelector("[role=dialog]")?.textContent.includes(expected), {}, text);
    // Waits for an enabled button with this exact label, so a click never races a refetch that has not rendered it yet.
    const dialogButton = (label) => page.waitForFunction((text) =>
      [...document.querySelectorAll("[role=dialog] button")].find((button) => button.textContent.trim() === text && !button.disabled), {}, label);
    const clickInDialog = async (label) => (await dialogButton(label)).evaluate((button) => button.click());
    const answered = (path, method) => page.waitForResponse((response) =>
      response.url().endsWith(path) && response.request().method() === method);
    await page.setViewport({ width: 375, height: 900 });
    await page.goto(`${browserOrigin}/__ticket-ui?ticket=${uiIncident.id}`);
    const commentForm = "[role=dialog] form:has(input[type=number])";
    await page.waitForSelector(`${commentForm} textarea`);
    await page.type(`${commentForm} textarea`, "Restarted the worker");
    await page.type(`${commentForm} input[type=number]`, "45");
    const commentSaved = answered(`/api/tickets/${uiIncident.id}/comments`, "POST");
    await page.click(`${commentForm} button[type=submit]`);
    assert.equal((await commentSaved).status(), 201);
    await inDialog("Time logged: 45 min");
    assert.equal(await page.$eval("[role=dialog] article", (item) => item.textContent.includes("· 45 min")), true);
    const chooser = '[role=dialog] select[aria-label="Choose an open problem"]';
    await page.waitForSelector(`${chooser} option[value="${uiProblem.id}"]`);
    await page.select(chooser, String(uiProblem.id));
    const linked = answered(`/api/tickets/${uiIncident.id}/problem`, "PUT");
    await clickInDialog("Link problem");
    assert.equal((await linked).status(), 200);
    // The chooser option already reads "#id · title", so only the clickable link proves the link was saved and rendered.
    const problemButton = await dialogButton(`#${uiProblem.id}`);
    assert.equal(await problemButton.evaluate((button, title) => button.parentElement.textContent.includes(title), ` · UI problem ${runId}`), true);
    await problemButton.evaluate((button) => button.click());
    await inDialog(`#${uiProblem.id} UI problem ${runId}`);
    await inDialog(`#${uiIncident.id} · UI incident ${runId}`);
    await clickInDialog(`#${uiIncident.id}`);
    await inDialog(`#${uiIncident.id} UI incident ${runId}`);
    const unlinked = answered(`/api/tickets/${uiIncident.id}/problem`, "PUT");
    await clickInDialog("Unlink");
    assert.equal((await unlinked).status(), 200);
    await inDialog("Not linked to a problem.");
    assert.equal(await page.$eval("[role=dialog]", (dialog) => dialog.scrollWidth <= dialog.clientWidth), true);
    await page.goto(`${browserOrigin}/__ticket-ui?tracker=1`);
    await page.waitForFunction(() => !location.search.includes("tracker"));
    assert.equal(await page.$("[data-testid=implementation-tracker]"), null);
    await page.goto(`${origin}/__test/login/owner`);
    await page.goto(`${browserOrigin}/__ticket-ui?tracker=1`);
    await page.waitForSelector("[data-testid=implementation-tracker] article");
    assert.equal(await page.$$eval("[data-testid=implementation-tracker] article", (items) => items.length), 11);
    assert.equal(await page.$eval("[data-testid=implementation-tracker]", (section) =>
      [...section.querySelectorAll("button")].some((button) => button.textContent.trim() === "Save"),
    ), true);
    await page.goto(`${origin}/__test/login/browserAdmin`);
    await page.goto(`${browserOrigin}/__ticket-ui?tracker=1&readonly=1`);
    await page.waitForSelector("[data-testid=implementation-tracker] article");
    assert.equal(await page.$$eval("[data-testid=implementation-tracker] article", (items) => items.length), 11);
    assert.equal(await page.$eval("[data-testid=implementation-tracker]", (section) =>
      [...section.querySelectorAll("button")].some((button) => button.textContent.trim() === "Save"),
    ), false);
    await page.type('textarea[aria-label="Describe the concern or follow-up needed"]', "Browser Admin signal");
    const signalResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/implementation-tracking/signals") &&
        response.request().method() === "POST",
    );
    await page.$eval('[data-testid="implementation-tracker"] form button[type="submit"]', (button) => button.click());
    const signalResponse = await signalResponsePromise;
    assert.equal(signalResponse.status(), 201, await signalResponse.text());
    await page.waitForFunction(() =>
      document.querySelector('[role="status"], [role="alert"]') !== null,
    );
    assert.match(
      await page.$eval('[role="status"], [role="alert"]', (message) => message.textContent),
      /Signal sent to the owner\./,
    );
    await page.goto(`${origin}/__test/login/owner`);
    await page.goto(`${browserOrigin}/__ticket-ui?accounts=1`);
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent.trim() === "New User"));
    await page.evaluate(() => [...document.querySelectorAll("button")].find(button => button.textContent.trim() === "New User").click());
    await page.waitForSelector("form select");
    const availableRoles = await page.$$eval("form select:first-of-type option", options => options.map(option => option.value));
    assert.equal(availableRoles.includes("superuser"), false);
    assert.ok(availableRoles.includes("admin"));
    assert.ok(availableRoles.includes("moderator"));
    await page.evaluateOnNewDocument(() => localStorage.setItem("fsa_selected_language", "fr"));
    await page.goto(`${browserOrigin}/__ticket-ui`);
    await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Espace collaborateurs");
    assert.equal(await page.$eval('select[aria-label="État"] option[value=pending]', (option) => option.textContent), "En attente");
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser?.close();
    await vite.close();
    await rm(cacheDir, { recursive: true, force: true });
    if (uiFixtures.length) await pool.query("UPDATE tickets SET status='withdrawn' WHERE id = ANY($1::int[])", [uiFixtures]);
  }
});

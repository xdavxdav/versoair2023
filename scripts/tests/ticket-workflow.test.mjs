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
async function assign(ticket, assignee = "moderator") {
  const result = await request("admin", `/api/tickets/${ticket.id}/assign`, "PUT", {
    assigneeId: users[assignee], reason: "Test assignment",
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
}
before(async () => {
  // Arena base tables are normally bootstrapped by the separate music schema.
  for (const table of ["arena_votes", "arena_brackets", "arena_contests"]) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table}(id SERIAL PRIMARY KEY)`);
  }
  await ensureAllTables();
  await ensureAllTables();
  for (const [key, role] of Object.entries({
    owner: "superuser", otherOwner: "superuser", admin: "admin", moderator: "moderator",
    otherModerator: "moderator", customer: "user", otherCustomer: "user",
  })) {
    const email = `${key}_${runId}@example.test`;
    const result = await pool.query(
      "INSERT INTO users(username,email,password,role,is_verified) VALUES ($1,$2,'not-a-login-password',$3,true) RETURNING id",
      [`ticket_test_${key}_${crypto.randomUUID().slice(0, 8)}`, email, role],
    );
    users[key] = result.rows[0].id;
    tokens[key] = jwt.sign({ userId: String(users[key]), email, role }, process.env.JWT_SECRET, { expiresIn: "10m" });
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
  app.use("/api/v1/admin", adminRouter);
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
  for (const role of ["otherOwner", "admin", "moderator", "customer"]) {
    assert.equal((await request(role, "/owner-zone")).status, 403);
    assert.equal((await request(role, "/api/implementation-tracking")).status, 403);
  }
  assert.equal((await request(null, "/owner-zone")).status, 401);
  delete process.env.SUPERADMIN_EMAIL;
  assert.equal((await request("owner", "/owner-zone")).status, 403);
  process.env.SUPERADMIN_EMAIL = ownerEmail;
});
test("actual financial, database, admin and invitation routes reject non-owners", async () => {
  for (const role of ["otherOwner", "admin", "moderator", "customer"]) {
    for (const [path, method, body] of [
      ["/api/v1/admin/control-center/summary", "GET"],
      ["/api/manage/countries", "GET"],
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
  const alerts = await pool.query("SELECT kind FROM ticket_alerts WHERE ticket_id=$1", [ticket.id]);
  assert.equal(alerts.rows.length, 5);
  const current = await request("admin", `/api/tickets/${ticket.id}`);
  assert.equal(current.body.status, "pending");
  assert.ok(current.body.sla_breached);
  assert.ok(current.body.abandonment_proposed_at);
  assert.equal((await request("moderator", `/api/tickets/${ticket.id}`, "PUT", { status: "abandoned", reason: "No answer" })).status, 403);
  assert.equal((await request("admin", `/api/tickets/${ticket.id}`, "PUT", { status: "abandoned", reason: "Reviewed reminders and no answer" })).status, 200);
  const comments = await pool.query("SELECT * FROM ticket_comments WHERE ticket_id=$1", [ticket.id]);
  assert.equal(comments.rows.length, 2);
  const internalWait = dueTicketAlerts({ id: 999, status: "pending", pending_reason: "internal", pending_since: "2020-01-01", follow_up_at: null, sla_due_at: null });
  assert.equal(internalWait.length, 0);
});
test("tracking requires evidence and deployed prerequisites, and persists updates", async () => {
  assert.equal((await request("owner", "/api/implementation-tracking/A1", "PUT", { status: "tested", evidence: "", blocker: "" })).status, 400);
  assert.equal((await request("owner", "/api/implementation-tracking/A2", "PUT", { status: "deployed", evidence: "test", blocker: "" })).status, 409);
  assert.equal((await request("owner", "/api/implementation-tracking/A1", "PUT", { status: "tested", evidence: "Isolated local integration test", blocker: "" })).status, 200);
  assert.equal((await request("owner", "/api/implementation-tracking")).body.find((lot) => lot.id === "A1").status, "tested");
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
  const root = new URL("../../", import.meta.url).pathname;
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
    import "/src/index.css";
    const tracker = new URLSearchParams(location.search).has("tracker");
    createRoot(document.getElementById("root")).render(React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},
      React.createElement(CountryProvider,null,React.createElement(LanguageProvider,null,React.createElement(AuthProvider,null,
        React.createElement(ProtectedRoute,{ownerOnly:tracker,component:tracker?Tracker:Tickets}))))));
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
    await page.goto(`${browserOrigin}/__ticket-ui?tracker=1`);
    await page.waitForFunction(() => !location.search.includes("tracker"));
    assert.equal(await page.$("[data-testid=implementation-tracker]"), null);
    await page.goto(`${origin}/__test/login/owner`);
    await page.goto(`${browserOrigin}/__ticket-ui?tracker=1`);
    await page.waitForSelector("[data-testid=implementation-tracker] article");
    assert.equal(await page.$$eval("[data-testid=implementation-tracker] article", (items) => items.length), 11);
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
  }
});

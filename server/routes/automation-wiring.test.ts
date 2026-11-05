import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import test, { after } from "node:test";
import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import type { AutomationDb, EnqueueInput } from "../services/automation-outbox";

const TOKEN = "w".repeat(48);
const EVENT_ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const AUTOMATION_ENV_KEYS = [
  "AUTOMATION_OUTBOX_ENABLED",
  "AUTOMATION_CALLBACK_TOKEN",
  "AUTOMATION_CALLBACK_TOKEN_PREVIOUS",
] as const;

// server/db.ts reads DATABASE_URL at import time; the pool never connects here.
const previousDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";

after(async () => {
  const { pool } = await import("../db");
  await pool.end();
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

/** Runs with the automation env vars removed (even if a local .env defines them), then restores them. */
async function withCleanAutomationEnv(run: () => Promise<void>): Promise<void> {
  const saved = Object.fromEntries(AUTOMATION_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of AUTOMATION_ENV_KEYS) delete process.env[key];
  try {
    await run();
  } finally {
    for (const key of AUTOMATION_ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

async function listen(app: Express): Promise<{ origin: string; server: Server }> {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { origin: `http://127.0.0.1:${address.port}`, server };
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

// Same order as server/index.ts, so exemptions are exercised the way production runs them.
function productionChain(
  globalAuthGate: express.RequestHandler,
  csrfSetCookie: express.RequestHandler,
  csrfProtect: express.RequestHandler,
): Express {
  const app = express();
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(csrfSetCookie);
  app.use(csrfProtect);
  app.use(globalAuthGate);
  return app;
}

test("callbacks pass the real auth gate and CSRF protection with a token and no session", async () => {
  const { globalAuthGate } = await import("../middleware/auth");
  const { csrfSetCookie, csrfProtect } = await import("../middleware/csrf");
  const { createAutomationRouter } = await import("./automation");

  let enabled = true;
  let tokens: string[] = [TOKEN];
  const fakeDb: AutomationDb = {
    async query(text) {
      if (text.includes("INSERT INTO public.automation_actions")) return { rows: [{ id: 1 }] };
      if (text.includes("SET status = 'acknowledged'")) return { rows: [{ id: 1 }] };
      if (text.includes("COUNT(*) FILTER")) {
        return {
          rows: [
            {
              pending: 0,
              retrying: 0,
              sent: 0,
              acknowledged: 0,
              dead: 0,
              ack_overdue: 0,
              oldest_pending_age_seconds: null,
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const app = productionChain(globalAuthGate, csrfSetCookie, csrfProtect);
  app.use(
    "/api/automation",
    createAutomationRouter({
      isEnabled: () => enabled,
      getTokens: () => tokens,
      getDb: async () => fakeDb,
      limiters: {
        failure: (_req, _res, next) => next(),
        general: (_req, _res, next) => next(),
      },
    }),
  );
  app.post("/api/example-protected", (_req, res) => res.json({ ok: true }));
  app.get("/api/example-protected", (_req, res) => res.json({ ok: true }));
  app.use((_req, res) => res.sendStatus(404));
  const { origin, server } = await listen(app);

  const asZapier = (path: string, init: { method?: string; token?: string | null; body?: unknown } = {}) =>
    fetch(`${origin}/api/automation${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        ...(init.token === null ? {} : { Authorization: `Bearer ${init.token ?? TOKEN}` }),
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

  try {
    // Controls: the gate and CSRF protection are live in this harness.
    assert.equal((await fetch(`${origin}/api/example-protected`)).status, 401);
    assert.equal(
      (
        await fetch(`${origin}/api/example-protected`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );

    // A token is enough: no session, no CSRF cookie or header.
    const claim = await asZapier("/claim", { body: { eventId: EVENT_ID, actionKey: "email.ack" } });
    assert.equal(claim.status, 200);
    assert.equal((await claim.json()).claimed, true);
    const ack = await asZapier("/ack", { body: { eventId: EVENT_ID } });
    assert.equal(ack.status, 200);
    assert.equal((await ack.json()).status, "acknowledged");
    const health = await asZapier("/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, "ok");
    assert.equal(health.headers.get("cache-control"), "no-store");

    // Wrong or missing token: the router answers 401 itself (not the gate's CSRF 403).
    for (const token of ["wrong", null]) {
      assert.equal((await asZapier("/health", { token })).status, 401);
      assert.equal(
        (await asZapier("/claim", { token, body: { eventId: EVENT_ID, actionKey: "k" } })).status,
        401,
      );
    }

    // Only the three exact paths are public; everything else still needs a session.
    for (const path of ["/other", "/health/", "/claim/x"]) {
      assert.equal((await asZapier(path)).status, 401, `GET ${path}`);
      assert.equal(
        (await asZapier(path, { body: { eventId: EVENT_ID } })).status,
        401,
        `POST ${path}`,
      );
    }
    assert.equal((await asZapier("/health", { method: "DELETE" })).status, 404, "unsupported method");

    // Disabled: invisible, even to a caller holding the token.
    enabled = false;
    assert.equal((await asZapier("/health")).status, 404);
    assert.equal(
      (await asZapier("/claim", { body: { eventId: EVENT_ID, actionKey: "k" } })).status,
      404,
    );

    // Enabled but no token configured.
    enabled = true;
    tokens = [];
    assert.equal((await asZapier("/health")).status, 503);
  } finally {
    await close(server);
  }
});

test("the shipped router is invisible by default and never opens a database connection", async () => {
  const { globalAuthGate } = await import("../middleware/auth");
  const { csrfSetCookie, csrfProtect } = await import("../middleware/csrf");
  const { pool } = await import("../db");
  const { default: automationRouter } = await import("./automation");

  await withCleanAutomationEnv(async () => {
    const app = productionChain(globalAuthGate, csrfSetCookie, csrfProtect);
    app.use("/api/automation", automationRouter);
    app.use((_req, res) => res.sendStatus(404));
    const { origin, server } = await listen(app);

    const request = (path: string, method = "GET", token = TOKEN) =>
      fetch(`${origin}/api/automation${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ eventId: EVENT_ID, actionKey: "k" }) : undefined,
      });

    try {
      // Default deployment: flag unset.
      for (const [path, method] of [
        ["/health", "GET"],
        ["/claim", "POST"],
        ["/ack", "POST"],
      ] as const) {
        const response = await request(path, method);
        assert.equal(response.status, 404, `${method} ${path}`);
        assert.equal((await response.json()).error.code, "not_found");
      }
      assert.equal(pool.totalCount, 0, "no database connection when the feature is off");

      // Flag on, no token configured: 503 for everyone.
      process.env.AUTOMATION_OUTBOX_ENABLED = "true";
      assert.equal((await request("/health")).status, 503);

      // A token under 32 characters does not count as configured.
      process.env.AUTOMATION_CALLBACK_TOKEN = "too-short";
      assert.equal((await request("/health")).status, 503);

      // Configured: wrong tokens are rejected without touching the database.
      process.env.AUTOMATION_CALLBACK_TOKEN = TOKEN;
      assert.equal((await request("/health", "GET", "wrong")).status, 401);
      assert.equal((await request("/claim", "POST", "wrong")).status, 401);
      assert.equal(pool.totalCount, 0, "rejected requests never reach the database");

      // The flag must be the exact string "true".
      process.env.AUTOMATION_OUTBOX_ENABLED = "TRUE";
      assert.equal((await request("/health")).status, 404);
    } finally {
      await close(server);
    }
  });
});

/** Posts a business request through the real route and the real notifier, and returns what Zapier would receive. */
async function submitBusinessRequest(outboxEnabled: boolean) {
  const { createSubmissionRequestsRouter } = await import("./submission-requests");
  const { createZapierNotifier } = await import("../services/zapier-notify");

  const hook = "https://zap.example.test/catch";
  const posted: Array<Record<string, unknown>> = [];
  const queued: EnqueueInput[] = [];
  const warnings: unknown[][] = [];
  const notify = createZapierNotifier({
    legacyUrl: () => hook,
    outboxEnabled: () => outboxEnabled,
    outboxUrl: () => hook,
    post: async (_url, body) => {
      posted.push(body);
    },
    enqueue: async (input) => {
      queued.push(input);
      return true;
    },
    wake: () => {},
    now: () => new Date("2026-11-04T15:00:00.000Z"),
    warn: (...args) => warnings.push(args),
  });

  const app = express();
  app.use(express.json());
  app.use(
    "/api/request",
    createSubmissionRequestsRouter({
      sendEmail: async () => true,
      insertTicket: async () => {},
      adminEmail: "admin@example.com",
      appUrl: "https://app.example.com",
      now: () => 1_700_000_000_000,
      notify,
    }),
  );
  const { origin, server } = await listen(app);
  try {
    const response = await fetch(`${origin}/api/request/business`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Café du Port",
        categoryName: "Restaurant",
        countryCode: "CI",
        cityName: "Abidjan",
      }),
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(response.status, 200);
    const { referenceId } = (await response.json()) as { referenceId: string };
    return { referenceId, posted, queued, warnings };
  } finally {
    await close(server);
  }
}

test("a business request reaches the legacy webhook as business_request, with the business category kept apart", async () => {
  const { referenceId, posted, queued, warnings } = await submitBusinessRequest(false);

  assert.deepEqual(warnings, []);
  assert.equal(queued.length, 0);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].category, "business_request");
  assert.equal(posted[0].businessCategory, "Restaurant");
  assert.equal(posted[0].referenceId, referenceId);
  assert.deepEqual(Object.keys(posted[0]), [
    "category",
    "referenceId",
    "businessName",
    "businessCategory",
    "countryCode",
    "city",
    "sentAt",
  ]);
});

test("a business request keeps its event category in the queued body and envelope when the outbox is on", async () => {
  const { referenceId, posted, queued, warnings } = await submitBusinessRequest(true);

  assert.deepEqual(warnings, []);
  assert.equal(posted.length, 0);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].category, "business_request");
  assert.equal(queued[0].body.category, "business_request");
  assert.equal(queued[0].body.businessCategory, "Restaurant");
  assert.equal(queued[0].envelope.data.businessCategory, "Restaurant");
  assert.equal(queued[0].envelope.entityId, referenceId);
});

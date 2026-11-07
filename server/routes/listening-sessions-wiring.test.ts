import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import test, { after } from "node:test";
import cookieParser from "cookie-parser";
import express, { type Express, type RequestHandler } from "express";
import type { SessionsPool } from "../services/listening-sessions";

// server/db.ts reads these at import time; the pool never connects here.
const previousDatabaseUrl = process.env.DATABASE_URL;
const previousOwnerEmail = process.env.SUPERADMIN_EMAIL;
const previousSwitch = process.env.LISTENING_SESSIONS_ENABLED;
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET ??= "local-test-only-secret-0123456789abcdef";

function restore(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

after(async () => {
  const { pool } = await import("../db");
  await pool.end();
  restore("DATABASE_URL", previousDatabaseUrl);
  restore("SUPERADMIN_EMAIL", previousOwnerEmail);
  restore("LISTENING_SESSIONS_ENABLED", previousSwitch);
});

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

// Same order as server/index.ts, so the gate and CSRF behave the way production runs them.
function productionChain(
  globalAuthGate: RequestHandler,
  csrfSetCookie: RequestHandler,
  csrfProtect: RequestHandler,
): Express {
  const app = express();
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(csrfSetCookie);
  app.use(csrfProtect);
  app.use(globalAuthGate);
  return app;
}

interface Reply {
  status: number;
  json: any;
  headers: Headers;
}

function client(origin: string) {
  return async (
    method: string,
    path: string,
    init: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<Reply> => {
    const response = await fetch(`${origin}/api/listening-sessions${path}`, {
      method,
      headers: {
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON: leave null
    }
    return { status: response.status, json, headers: response.headers };
  };
}

/** A valid cookie and header pair, the way a browser gets one from any earlier GET. */
async function csrfPair(origin: string): Promise<Record<string, string>> {
  const response = await fetch(`${origin}/api/listening-sessions`);
  await response.arrayBuffer();
  const token = /csrf_token=([0-9a-f]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
  assert.ok(token, "the server hands out a CSRF cookie on any request");
  return { Cookie: `csrf_token=${token}`, "X-CSRF-Token": token };
}

function emptyDb() {
  const queries: string[] = [];
  const pool: SessionsPool = {
    async query(text) {
      queries.push(text);
      return { rows: [], rowCount: 0 };
    },
    async connect() {
      throw new Error("no transaction expected in this test");
    },
  };
  return { pool, queries };
}

const passThrough: RequestHandler = (_req, _res, next) => next();
const openLimiters = { public: passThrough, admin: passThrough, adminWrite: passThrough };

test("through the real gate and CSRF: public reads are open, every admin route needs a session", async () => {
  const { globalAuthGate, requireAdminPanel } = await import("../middleware/auth");
  const { csrfSetCookie, csrfProtect } = await import("../middleware/csrf");
  const { createListeningSessionsRouter, requireAdminSection } = await import("./listening-sessions");

  const db = emptyDb();
  const app = productionChain(globalAuthGate, csrfSetCookie, csrfProtect);
  app.use(
    "/api/listening-sessions",
    createListeningSessionsRouter({
      isEnabled: () => true,
      getDb: async () => db.pool,
      limiters: openLimiters,
      adminGuards: [requireAdminPanel, requireAdminSection("listening-sessions")],
    }),
  );
  app.use((_req, res) => res.sendStatus(404));
  const { origin, server } = await listen(app);
  const call = client(origin);

  try {
    const list = await call("GET", "/");
    assert.equal(list.status, 200);
    assert.equal(list.json.success, true);
    assert.deepEqual(list.json.sessions, []);
    assert.equal(list.headers.get("cache-control"), "no-store");
    for (const path of ["/1", "/1/now-playing", "/1/chat"]) {
      const reply = await call("GET", path);
      assert.equal(reply.status, 404, `GET ${path} reaches the router (unknown session)`);
      assert.equal(reply.json.error.code, "not_found");
    }

    const before = db.queries.length;
    const csrf = await csrfPair(origin);

    for (const path of [
      "/admin/status",
      "/admin/list",
      "/admin/tracks",
      "/admin/hosts",
      "/admin/playlists",
      "/admin/playlists/1/tracks",
      "/admin/1",
      "/admin/does-not-exist",
    ]) {
      assert.equal((await call("GET", path)).status, 401, `anonymous GET ${path}`);
    }

    // Anonymous create: CSRF stops it first; with a valid pair the session gate does.
    const body = { title: "x", startsAt: "2026-11-08T20:00:00Z", tracks: [] };
    assert.equal((await call("POST", "/admin", { body })).status, 403, "no CSRF pair");
    assert.equal((await call("POST", "/admin", { body, headers: csrf })).status, 401, "anonymous create");
    assert.equal((await call("PATCH", "/admin/1", { body: { title: "x" }, headers: csrf })).status, 401);
    assert.equal((await call("POST", "/admin/1/cancel", { body: {}, headers: csrf })).status, 401);

    // The public paths accept GET only.
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      assert.equal((await call(method, "/", { body: {}, headers: csrf })).status, 401, `${method} /`);
      assert.equal((await call(method, "/1", { body: {}, headers: csrf })).status, 401, `${method} /1`);
    }

    assert.equal(db.queries.length, before, "nothing anonymous ever reached the database");
  } finally {
    await close(server);
  }
});

test("requireAdminSection: only the configured platform owner passes", async () => {
  const { requireAdminSection } = await import("./listening-sessions");
  const guard = requireAdminSection("listening-sessions");

  const run = (user: unknown) => {
    let passed = false;
    let status = 0;
    let body: any;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
    };
    guard({ user } as any, res as any, () => {
      passed = true;
    });
    return { passed, status, body };
  };

  process.env.SUPERADMIN_EMAIL = "owner@example.com";
  const owner = run({ role: "superuser", email: " Owner@Example.com " });
  assert.equal(owner.passed, true, "the owner, whatever the letter case");
  assert.equal(owner.status, 0);

  for (const [label, user] of [
    ["an invited Admin", { role: "admin", email: "admin@example.com" }],
    ["an Admin who has the owner's email but not the role", { role: "admin", email: "owner@example.com" }],
    ["another superuser", { role: "superuser", email: "someone@example.com" }],
    ["a listener", { role: "user", email: "listener@example.com" }],
    ["nobody", undefined],
  ] as const) {
    const result = run(user);
    assert.equal(result.passed, false, label);
    assert.equal(result.status, 403, label);
    assert.equal(result.body.error.code, "ADMIN_SECTION_FORBIDDEN", label);
  }

  delete process.env.SUPERADMIN_EMAIL;
  assert.equal(
    run({ role: "superuser", email: "owner@example.com" }).passed,
    false,
    "with no owner configured, nobody is the owner",
  );
});

test("bad input is a 400 with a code, and never reaches the database", async () => {
  const { createListeningSessionsRouter } = await import("./listening-sessions");

  const NOW = new Date("2026-11-07T15:00:00.000Z");
  let dbTouched = 0;
  const router = createListeningSessionsRouter({
    isEnabled: () => true,
    getDb: async () => {
      dbTouched++;
      return emptyDb().pool;
    },
    limiters: openLimiters,
    adminGuards: [
      (req, _res, next) => {
        (req as any).user = { userId: 1, role: "superuser" };
        next();
      },
    ],
    now: () => NOW,
  });
  const app = express();
  app.use(express.json());
  app.use("/api/listening-sessions", router);
  const { origin, server } = await listen(app);
  const call = client(origin);

  const START = "2026-11-08T20:00:00.000Z";
  const SET = [
    { trackId: 101, durationSec: 200 },
    { trackId: 102, durationSec: 180 },
  ];
  const good = { title: "Sunday Session", startsAt: START, gapSeconds: 15, tracks: SET };
  const manyTracks = (count: number, durationSec: number) =>
    Array.from({ length: count }, (_v, i) => ({ trackId: 200 + i, durationSec }));

  try {
    const create: Array<[string, unknown, string]> = [
      ["unknown key", { ...good, status: "live" }, "invalid_request"],
      ["endsAt is never accepted", { ...good, endsAt: START }, "invalid_request"],
      ["empty title", { ...good, title: " \u0000 " }, "invalid_request"],
      ["title too long", { ...good, title: "x".repeat(161) }, "invalid_request"],
      ["start with no time zone", { ...good, startsAt: "2026-11-08T20:00:00" }, "invalid_request"],
      ["start that is not a date", { ...good, startsAt: "soon" }, "invalid_request"],
      ["start on a day that does not exist", { ...good, startsAt: "2026-02-31T10:00:00Z" }, "invalid_request"],
      ["start as a number", { ...good, startsAt: Date.parse(START) }, "invalid_request"],
      ["gap over 300", { ...good, gapSeconds: 301 }, "invalid_request"],
      ["gap negative", { ...good, gapSeconds: -1 }, "invalid_request"],
      ["gap fractional", { ...good, gapSeconds: 1.5 }, "invalid_request"],
      ["host id zero", { ...good, hostUserId: 0 }, "invalid_request"],
      ["host id as text", { ...good, hostUserId: "7" }, "invalid_request"],
      ["host id beyond int4", { ...good, hostUserId: 2_147_483_648 }, "invalid_request"],
      ["description far too long", { ...good, description: "x".repeat(10_001) }, "invalid_request"],
      ["description too long once cleaned", { ...good, description: "x".repeat(2001) }, "invalid_request"],
      ["no tracks at all", { title: "t", startsAt: START }, "set_empty"],
      ["empty set", { ...good, tracks: [] }, "set_empty"],
      ["the same track twice", { ...good, tracks: [SET[0], SET[0]] }, "track_duplicate"],
      ["track length zero", { ...good, tracks: [{ trackId: 101, durationSec: 0 }] }, "track_duration_invalid"],
      ["track longer than an hour", { ...good, tracks: [{ trackId: 101, durationSec: 3601 }] }, "track_duration_invalid"],
      ["track id zero", { ...good, tracks: [{ trackId: 0, durationSec: 60 }] }, "track_id_invalid"],
      ["too many tracks", { ...good, tracks: manyTracks(61, 10) }, "set_too_many_tracks"],
      ["a set longer than six hours", { ...good, tracks: manyTracks(7, 3600) }, "set_too_long"],
      ["start more than a year away", { ...good, startsAt: "2028-01-01T00:00:00Z" }, "starts_too_far"],
    ];
    for (const [label, body, code] of create) {
      const reply = await call("POST", "/admin", { body });
      assert.equal(reply.status, 400, label);
      assert.equal(reply.json?.error?.code, code, label);
      assert.equal(reply.json.success, false, label);
    }

    const edit: Array<[string, unknown, string]> = [
      ["nothing to change", {}, "invalid_request"],
      ["unknown key", { status: "ended" }, "invalid_request"],
      ["empty title", { title: " " }, "invalid_request"],
      ["start with no time zone", { startsAt: "2026-11-08T20:00:00" }, "invalid_request"],
      ["gap over 300", { gapSeconds: 999 }, "invalid_request"],
      ["empty set", { tracks: [] }, "set_empty"],
      ["start more than a year away", { startsAt: "2028-01-01T00:00:00Z" }, "starts_too_far"],
    ];
    for (const [label, body, code] of edit) {
      const reply = await call("PATCH", "/admin/1", { body });
      assert.equal(reply.status, 400, `PATCH ${label}`);
      assert.equal(reply.json?.error?.code, code, `PATCH ${label}`);
    }

    for (const query of [
      "afterId=1&beforeId=2",
      "afterId=0",
      "afterId=-4",
      "afterId=abc",
      "beforeId=2147483648",
      "limit=0",
      "limit=101",
      "limit=1.5",
    ]) {
      const reply = await call("GET", `/1/chat?${query}`);
      assert.equal(reply.status, 400, `chat ?${query}`);
      assert.equal(reply.json?.error?.code, "invalid_request", `chat ?${query}`);
    }

    assert.equal(dbTouched, 0, "every refusal above was decided before any database access");
  } finally {
    await close(server);
  }
});

test("the kill switch answers 404 before any guard runs, for public and admin paths", async () => {
  const { createListeningSessionsRouter } = await import("./listening-sessions");

  let enabled = false;
  let guardCalls = 0;
  let dbTouched = 0;
  const router = createListeningSessionsRouter({
    isEnabled: () => enabled,
    getDb: async () => {
      dbTouched++;
      return emptyDb().pool;
    },
    limiters: openLimiters,
    adminGuards: [
      (req, _res, next) => {
        guardCalls++;
        (req as any).user = { userId: 1, role: "superuser" };
        next();
      },
    ],
  });
  const app = express();
  app.use(express.json());
  app.use("/api/listening-sessions", router);
  const { origin, server } = await listen(app);
  const call = client(origin);

  try {
    for (const [method, path] of [
      ["GET", "/"],
      ["GET", "/1"],
      ["GET", "/1/now-playing"],
      ["GET", "/1/chat"],
      ["GET", "/admin/list"],
      ["POST", "/admin"],
      ["PATCH", "/admin/1"],
      ["POST", "/admin/1/cancel"],
    ] as const) {
      const reply = await call(method, path, method === "GET" ? {} : { body: {} });
      assert.equal(reply.status, 404, `${method} ${path}`);
      assert.equal(reply.json.error.code, "not_found");
      assert.equal(reply.headers.get("cache-control"), "no-store");
    }
    assert.equal(guardCalls, 0, "no guard ran");
    assert.equal(dbTouched, 0, "no database access");

    enabled = true;
    assert.equal((await call("GET", "/")).status, 200, "switching it back on needs no restart");
    assert.equal(dbTouched, 1);
  } finally {
    await close(server);
  }
});

test("the limiters run before the guards and before validation, and answer 429 as JSON", async () => {
  const { createListeningSessionsRouter, createListeningSessionsLimiters } = await import(
    "./listening-sessions"
  );

  let guardCalls = 0;
  const router = createListeningSessionsRouter({
    isEnabled: () => true,
    getDb: async () => emptyDb().pool,
    limiters: createListeningSessionsLimiters({ publicMax: 2, adminMax: 3, adminWriteMax: 1 }),
    adminGuards: [
      (_req, res) => {
        guardCalls++;
        res.status(401).json({ success: false, error: { code: "unauthorized" } });
      },
    ],
  });
  const app = express();
  app.use(express.json());
  app.use("/api/listening-sessions", router);
  const { origin, server } = await listen(app);
  const call = client(origin);

  try {
    // Anonymous hammering on an admin path: three reach the guard, the rest are throttled first.
    for (let attempt = 1; attempt <= 3; attempt++) {
      assert.equal((await call("GET", "/admin/list")).status, 401, `attempt ${attempt}`);
    }
    const throttled = await call("GET", "/admin/list");
    assert.equal(throttled.status, 429);
    assert.equal(throttled.json.error.code, "rate_limited");
    assert.equal(guardCalls, 3, "the guard was not consulted for the throttled call");

    // The public limiter is separate: two reads pass, the third is throttled.
    assert.equal((await call("GET", "/")).status, 200);
    assert.equal((await call("GET", "/")).status, 200);
    const publicThrottled = await call("GET", "/");
    assert.equal(publicThrottled.status, 429);
    assert.equal(publicThrottled.json.success, false);
  } finally {
    await close(server);
  }
});

test("the shipped router: switched off it is invisible and never opens a database connection", async () => {
  const { globalAuthGate } = await import("../middleware/auth");
  const { csrfSetCookie, csrfProtect } = await import("../middleware/csrf");
  const { pool } = await import("../db");
  const { default: sessionsRouter } = await import("./listening-sessions");

  const app = productionChain(globalAuthGate, csrfSetCookie, csrfProtect);
  app.use("/api/listening-sessions", sessionsRouter);
  app.use((_req, res) => res.sendStatus(404));
  const { origin, server } = await listen(app);
  const call = client(origin);

  try {
    for (const value of ["false", "0", "off", " No ", "DISABLED"]) {
      process.env.LISTENING_SESSIONS_ENABLED = value;
      for (const path of ["/", "/1", "/1/now-playing", "/1/chat"]) {
        const reply = await call("GET", path);
        assert.equal(reply.status, 404, `LISTENING_SESSIONS_ENABLED=${JSON.stringify(value)} GET ${path}`);
        assert.equal(reply.json.error.code, "not_found");
      }
    }
    assert.equal(pool.totalCount, 0, "no database connection while it is switched off");

    // On by default: anonymous admin calls still stop at the gate, without touching the database.
    delete process.env.LISTENING_SESSIONS_ENABLED;
    const csrf = await csrfPair(origin);
    assert.equal((await call("GET", "/admin/list")).status, 401);
    assert.equal(
      (await call("POST", "/admin", { body: { title: "x" }, headers: csrf })).status,
      401,
      "anonymous create",
    );
    assert.equal(pool.totalCount, 0, "rejected requests never reach the database");
  } finally {
    await close(server);
  }
});

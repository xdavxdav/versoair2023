import assert from "node:assert/strict";
import { once } from "node:events";
import test, { mock } from "node:test";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  createAutomationLimiters,
  createAutomationRouter,
  getHealthReasons,
  type AutomationLimiters,
} from "./automation";
import type { AutomationDb } from "../services/automation-outbox";

const TOKEN = "t".repeat(48);
const PREVIOUS_TOKEN = "p".repeat(48);
const EVENT_ID = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const UNKNOWN_EVENT_ID = "00000000-0000-4000-8000-000000000000";

const passthroughLimiters: AutomationLimiters = {
  failure: (_req, _res, next) => next(),
  general: (_req, _res, next) => next(),
};

const emptyHealthRow = {
  pending: 0,
  retrying: 0,
  sent: 0,
  acknowledged: 0,
  dead: 0,
  ack_overdue: 0,
  oldest_pending_age_seconds: null as number | null,
};

/** Just enough of the outbox and action tables to exercise the route logic. */
class FakeDb implements AutomationDb {
  events = new Map<string, { status: string }>();
  actions = new Set<string>();
  calls: Array<{ text: string; values: unknown[] }> = [];
  healthRow = { ...emptyHealthRow };
  failWith: Error | null = null;

  async query(text: string, values: unknown[] = []) {
    this.calls.push({ text, values });
    if (this.failWith) throw this.failWith;

    if (text.includes("INSERT INTO public.automation_actions")) {
      const [eventId, actionKey] = values as string[];
      const key = `${eventId}|${actionKey}`;
      if (!this.events.has(eventId) || this.actions.has(key)) return { rows: [] };
      this.actions.add(key);
      return { rows: [{ id: this.actions.size }] };
    }
    if (text.includes("SET status = 'acknowledged'")) {
      const event = this.events.get(values[0] as string);
      if (!event || event.status === "acknowledged") return { rows: [] };
      event.status = "acknowledged";
      return { rows: [{ id: 1 }] };
    }
    if (text.startsWith("SELECT 1 FROM public.automation_outbox")) {
      return { rows: this.events.has(values[0] as string) ? [{ one: 1 }] : [] };
    }
    if (text.includes("COUNT(*) FILTER")) return { rows: [this.healthRow] };
    throw new Error(`Unexpected SQL in test: ${text}`);
  }
}

interface Harness {
  origin: string;
  db: FakeDb;
  getDbCalls: number;
}

async function withApp(
  options: {
    enabled?: boolean;
    tokens?: string[];
    limiters?: AutomationLimiters;
    now?: () => Date;
  },
  run: (harness: Harness) => Promise<void>,
): Promise<void> {
  const db = new FakeDb();
  const harness = { origin: "", db, getDbCalls: 0 } satisfies Harness;
  const router = createAutomationRouter({
    isEnabled: () => options.enabled ?? true,
    getTokens: () => options.tokens ?? [TOKEN],
    getDb: async () => {
      harness.getDbCalls += 1;
      return db;
    },
    limiters: options.limiters ?? passthroughLimiters,
    now: options.now,
  });
  const app = express();
  app.use(express.json());
  app.use("/api/automation", router);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({ success: false, error: { code: status === 500 ? "internal" : "bad_request" } });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  harness.origin = `http://127.0.0.1:${address.port}`;
  try {
    await run(harness);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function call(
  origin: string,
  path: string,
  init: {
    method?: string;
    token?: string | null;
    authorization?: string;
    body?: unknown;
  } = {},
): Promise<globalThis.Response> {
  const headers: Record<string, string> = {};
  if (init.authorization !== undefined) headers.Authorization = init.authorization;
  else if (init.token !== null) headers.Authorization = `Bearer ${init.token ?? TOKEN}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${origin}/api/automation${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

test("the callbacks are invisible and untouched when the feature flag is off", async () => {
  await withApp({ enabled: false }, async (h) => {
    for (const [path, init] of [
      ["/health", {}],
      ["/claim", { body: { eventId: EVENT_ID, actionKey: "x" } }],
      ["/ack", { body: { eventId: EVENT_ID } }],
      ["/health", { token: null }],
      ["/does-not-exist", {}],
    ] as const) {
      const response = await call(h.origin, path, init);
      assert.equal(response.status, 404, path);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).error.code, "not_found");
    }
    assert.equal(h.getDbCalls, 0);
    assert.equal(h.db.calls.length, 0);
  });
});

test("503 until a callback token is configured", async () => {
  await withApp({ tokens: [] }, async (h) => {
    for (const [path, init] of [
      ["/health", {}],
      ["/claim", { body: { eventId: EVENT_ID, actionKey: "x" } }],
      ["/ack", { body: { eventId: EVENT_ID } }],
    ] as const) {
      const response = await call(h.origin, path, init);
      assert.equal(response.status, 503, path);
      assert.equal((await response.json()).error.code, "not_configured");
    }
    assert.equal(h.db.calls.length, 0);
  });
});

test("rejects missing, malformed and wrong credentials with 401", async () => {
  await withApp({}, async (h) => {
    const rejected: Array<{ token?: string | null; authorization?: string }> = [
      { token: null },
      { token: "wrong" },
      { token: `${TOKEN}x` },
      { token: TOKEN.slice(0, -1) },
      { authorization: `Basic ${TOKEN}` },
      { authorization: TOKEN },
      { authorization: "Bearer" },
      { authorization: `Bearer ${TOKEN} extra` },
      { authorization: `Bearer ${"t".repeat(513)}` },
    ];
    for (const credentials of rejected) {
      const response = await call(h.origin, "/health", credentials);
      assert.equal(response.status, 401, JSON.stringify(credentials).slice(0, 80));
      assert.equal(response.headers.get("www-authenticate"), 'Bearer realm="automation"');
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).error.code, "unauthorized");
    }
    assert.equal(h.db.calls.length, 0, "no database work before authentication");
  });
});

test("accepts the bearer scheme case-insensitively and either rotation token", async () => {
  await withApp({ tokens: [TOKEN, PREVIOUS_TOKEN] }, async (h) => {
    for (const credentials of [
      { token: TOKEN },
      { token: PREVIOUS_TOKEN },
      { authorization: `bearer ${TOKEN}` },
      { authorization: `BEARER   ${TOKEN}  ` },
    ]) {
      assert.equal((await call(h.origin, "/health", credentials)).status, 200);
    }
  });
});

test("claim is first-caller-wins and replays report duplicate", async () => {
  await withApp({}, async (h) => {
    h.db.events.set(EVENT_ID, { status: "pending" });

    const first = await call(h.origin, "/claim", {
      body: { eventId: EVENT_ID, actionKey: "email.ack", detail: { zap: "intake" } },
    });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), {
      success: true,
      status: "claimed",
      claimed: true,
      eventId: EVENT_ID,
      actionKey: "email.ack",
    });

    const replay = await call(h.origin, "/claim", {
      body: { eventId: EVENT_ID, actionKey: "email.ack" },
    });
    assert.equal(replay.status, 200);
    const replayBody = await replay.json();
    assert.equal(replayBody.status, "duplicate");
    assert.equal(replayBody.claimed, false);

    const otherAction = await call(h.origin, "/claim", {
      body: { eventId: EVENT_ID, actionKey: "sheet.row" },
    });
    assert.equal((await otherAction.json()).claimed, true);
  });
});

test("claim normalizes the event id and always records zapier as the actor", async () => {
  await withApp({}, async (h) => {
    h.db.events.set(EVENT_ID, { status: "pending" });
    const response = await call(h.origin, "/claim", {
      body: {
        eventId: EVENT_ID.toUpperCase(),
        actionKey: "email.ack",
        actor: "attacker",
        detail: { zap: "intake" },
      },
    });
    assert.equal(response.status, 200);
    const insert = h.db.calls.find((c) => c.text.includes("INSERT INTO public.automation_actions"));
    assert.ok(insert);
    assert.deepEqual(insert.values, [EVENT_ID, "email.ack", "zapier", '{"zap":"intake"}']);
  });
});

test("claim answers 404 for an unknown event and 400 for bad input", async () => {
  await withApp({}, async (h) => {
    const unknown = await call(h.origin, "/claim", {
      body: { eventId: UNKNOWN_EVENT_ID, actionKey: "email.ack" },
    });
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error.code, "unknown_event");

    const bad: Array<[unknown, string]> = [
      [{ actionKey: "x" }, "invalid_event_id"],
      [{ eventId: 42, actionKey: "x" }, "invalid_event_id"],
      [{ eventId: [EVENT_ID], actionKey: "x" }, "invalid_event_id"],
      [{ eventId: "not-a-uuid", actionKey: "x" }, "invalid_event_id"],
      [{ eventId: `${EVENT_ID}'; DROP TABLE x;--`, actionKey: "x" }, "invalid_event_id"],
      [{ eventId: EVENT_ID }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: "" }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: "Has Space" }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: "UPPER" }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: "-leading-dash" }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: "a".repeat(61) }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: 7 }, "invalid_action_key"],
      [{ eventId: EVENT_ID, actionKey: "ok", detail: null }, "invalid_detail"],
      [{ eventId: EVENT_ID, actionKey: "ok", detail: "text" }, "invalid_detail"],
      [{ eventId: EVENT_ID, actionKey: "ok", detail: [1] }, "invalid_detail"],
      [{ eventId: EVENT_ID, actionKey: "ok", detail: { note: "x".repeat(2038) } }, "invalid_detail"],
      [[], "invalid_event_id"],
    ];
    for (const [body, code] of bad) {
      const response = await call(h.origin, "/claim", { body });
      assert.equal(response.status, 400, JSON.stringify(body).slice(0, 80));
      assert.equal((await response.json()).error.code, code, JSON.stringify(body).slice(0, 80));
    }

    // A bare JSON string never reaches the router: the body parser rejects it.
    const primitive = await call(h.origin, "/claim", { body: "text" });
    assert.equal(primitive.status, 400);

    const noBody = await call(h.origin, "/claim", { method: "POST" });
    assert.equal(noBody.status, 400);
    assert.equal(
      h.db.calls.filter((c) => c.text.includes("INSERT INTO")).length,
      1,
      "only the unknown-event request reached the database",
    );
  });
});

test("claim accepts a detail payload up to 2048 bytes and a 60 character key", async () => {
  await withApp({}, async (h) => {
    h.db.events.set(EVENT_ID, { status: "pending" });
    const response = await call(h.origin, "/claim", {
      body: { eventId: EVENT_ID, actionKey: "a".repeat(60), detail: { note: "x".repeat(2037) } },
    });
    assert.equal(response.status, 200);
  });
});

test("ack confirms once and then reports already_acknowledged", async () => {
  await withApp({}, async (h) => {
    h.db.events.set(EVENT_ID, { status: "sent" });
    const first = await call(h.origin, "/ack", { body: { eventId: EVENT_ID } });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), {
      success: true,
      status: "acknowledged",
      eventId: EVENT_ID,
    });
    assert.equal(h.db.events.get(EVENT_ID)?.status, "acknowledged");

    const again = await call(h.origin, "/ack", { body: { eventId: EVENT_ID.toUpperCase() } });
    assert.equal(again.status, 200);
    assert.equal((await again.json()).status, "already_acknowledged");
  });
});

test("ack answers 404 for an unknown event and 400 for a bad id", async () => {
  await withApp({}, async (h) => {
    const unknown = await call(h.origin, "/ack", { body: { eventId: UNKNOWN_EVENT_ID } });
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error.code, "unknown_event");

    for (const body of [{}, { eventId: "nope" }, { eventId: 1 }, []]) {
      const response = await call(h.origin, "/ack", { body });
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.equal((await response.json()).error.code, "invalid_event_id");
    }
  });
});

test("health reports ok with no events", async () => {
  const now = new Date("2026-03-01T15:00:00.000Z");
  await withApp({ now: () => now }, async (h) => {
    const response = await call(h.origin, "/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      status: "ok",
      reasons: [],
      checkedAt: "2026-03-01T15:00:00.000Z",
      counts: { pending: 0, retrying: 0, sent: 0, acknowledged: 0, dead: 0, ackOverdue: 0 },
      oldestPendingAgeSeconds: null,
    });
    assert.deepEqual(h.db.calls[0].values, [1800, 30]);
  });
});

test("health turns degraded for dead, stuck and unconfirmed events", async () => {
  await withApp({}, async (h) => {
    h.db.healthRow = {
      pending: 2,
      retrying: 1,
      sent: 3,
      acknowledged: 4,
      dead: 1,
      ack_overdue: 2,
      oldest_pending_age_seconds: 1200,
    };
    const body = await (await call(h.origin, "/health")).json();
    assert.equal(body.status, "degraded");
    assert.deepEqual(body.reasons, ["dead_events", "ack_overdue", "oldest_pending_over_15_min"]);
    assert.deepEqual(body.counts, {
      pending: 2,
      retrying: 1,
      sent: 3,
      acknowledged: 4,
      dead: 1,
      ackOverdue: 2,
    });
    assert.equal(body.oldestPendingAgeSeconds, 1200);
  });
});

test("getHealthReasons: overdue acks only matter once the Zap confirms at all", () => {
  const base = {
    pending: 0,
    retrying: 0,
    sent: 0,
    acknowledged: 0,
    dead: 0,
    ackOverdue: 0,
    oldestPendingAgeSeconds: null,
  };
  assert.deepEqual(getHealthReasons(base), []);
  assert.deepEqual(getHealthReasons({ ...base, ackOverdue: 5 }), [], "Zap without an ack step");
  assert.deepEqual(getHealthReasons({ ...base, acknowledged: 1, ackOverdue: 5 }), ["ack_overdue"]);
  assert.deepEqual(getHealthReasons({ ...base, dead: 1 }), ["dead_events"]);
  assert.deepEqual(getHealthReasons({ ...base, oldestPendingAgeSeconds: 900 }), []);
  assert.deepEqual(getHealthReasons({ ...base, oldestPendingAgeSeconds: 901 }), [
    "oldest_pending_over_15_min",
  ]);
});

test("a database failure fails closed with a 500 and leaks nothing", async () => {
  await withApp({}, async (h) => {
    h.db.failWith = new Error("password authentication failed for user secret_user");
    const response = await call(h.origin, "/claim", {
      body: { eventId: EVENT_ID, actionKey: "email.ack" },
    });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /secret_user|password/);
  });
});

test("responses never contain a token", async () => {
  await withApp({ tokens: [TOKEN, PREVIOUS_TOKEN] }, async (h) => {
    h.db.events.set(EVENT_ID, { status: "pending" });
    const responses = await Promise.all([
      call(h.origin, "/health"),
      call(h.origin, "/health", { token: PREVIOUS_TOKEN }),
      call(h.origin, "/health", { token: `${TOKEN}-wrong` }),
      call(h.origin, "/claim", { body: { eventId: EVENT_ID, actionKey: "k" } }),
      call(h.origin, "/ack", { body: { eventId: EVENT_ID } }),
    ]);
    for (const response of responses) {
      const text = await response.text();
      assert.ok(!text.includes(TOKEN) && !text.includes(PREVIOUS_TOKEN));
      for (const [name, value] of response.headers) {
        assert.ok(!value.includes(TOKEN) && !value.includes(PREVIOUS_TOKEN), name);
      }
    }
  });
});

test("failed attempts are throttled but a valid token is never locked out", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    await withApp(
      { limiters: createAutomationLimiters({ failureMax: 2, generalMax: 50 }) },
      async (h) => {
        for (let i = 0; i < 5; i++) {
          assert.equal((await call(h.origin, "/health")).status, 200, "valid calls are not counted");
        }
        assert.equal((await call(h.origin, "/health", { token: "wrong" })).status, 401);
        assert.equal((await call(h.origin, "/health", { token: null })).status, 401);

        const blocked = await call(h.origin, "/health", { token: "wrong" });
        assert.equal(blocked.status, 429);
        assert.equal((await blocked.json()).error.code, "rate_limited");
        assert.ok(blocked.headers.get("retry-after"));

        // The same caller address keeps working with the right token.
        assert.equal((await call(h.origin, "/health")).status, 200);
        const stillBlocked = await call(h.origin, "/health", { token: "wrong" });
        assert.equal(stillBlocked.status, 429);
      },
    );
    assert.ok(warn.mock.callCount() >= 1);
    for (const callRecord of warn.mock.calls) {
      assert.ok(!String(callRecord.arguments[0]).includes(TOKEN));
    }
  } finally {
    warn.mock.restore();
  }
});

test("authenticated traffic is rate limited separately and bad tokens stay 401", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    await withApp(
      { limiters: createAutomationLimiters({ failureMax: 20, generalMax: 2 }) },
      async (h) => {
        assert.equal((await call(h.origin, "/health")).status, 200);
        assert.equal((await call(h.origin, "/health")).status, 200);
        const limited = await call(h.origin, "/health");
        assert.equal(limited.status, 429);
        assert.equal((await limited.json()).error.code, "rate_limited");

        const wrong = await call(h.origin, "/health", { token: "wrong" });
        assert.equal(wrong.status, 401, "unauthenticated requests do not use the general budget");
      },
    );
  } finally {
    warn.mock.restore();
  }
});

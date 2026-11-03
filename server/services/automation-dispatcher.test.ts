import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { ClaimedOutboxRow } from "./automation-outbox";
import {
  classifyHttpResponse,
  computeRetryDelayMs,
  createAutomationDispatcher,
  createDispatcherSupervisor,
  DEFAULT_DISPATCHER_CONFIG,
  deliverOutboxRow,
  parseRetryAfterMs,
  sanitizeErrorText,
  startAutomationDispatcher,
  type AutomationDispatcher,
  type DispatcherConfig,
  type OutboxRepository,
} from "./automation-dispatcher";

const WEBHOOK = "https://hooks.zapier.com/hooks/catch/123456/abcdef/";
const config: DispatcherConfig = DEFAULT_DISPATCHER_CONFIG;
const db = { query: async () => ({ rows: [] }) };

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function makeRow(id: number, attempts = 1): ClaimedOutboxRow {
  return {
    id,
    eventId: `evt-${id}`,
    attempts,
    payload: { category: "contact", automation: { eventId: `evt-${id}` } },
  };
}

function fakeRepo(batches: ClaimedOutboxRow[][] = []) {
  const queue = [...batches];
  const calls = {
    claim: [] as any[],
    sent: [] as any[],
    retry: [] as any[],
    dead: [] as any[],
    scrub: [] as any[],
  };
  const overrides: Partial<OutboxRepository> = {};
  const repo: OutboxRepository = {
    claimDue: async (...args) =>
      overrides.claimDue
        ? overrides.claimDue(...args)
        : (calls.claim.push(args[1]), queue.shift() ?? []),
    markSent: async (_db, claim, httpStatus) => {
      if (overrides.markSent) return overrides.markSent(_db, claim, httpStatus);
      calls.sent.push({ id: claim.id, attempts: claim.attempts, httpStatus });
      return true;
    },
    markRetry: async (_db, claim, options) => {
      if (overrides.markRetry) return overrides.markRetry(_db, claim, options);
      calls.retry.push({ id: claim.id, attempts: claim.attempts, ...options });
      return true;
    },
    markDead: async (_db, claim, options) => {
      if (overrides.markDead) return overrides.markDead(_db, claim, options);
      calls.dead.push({ id: claim.id, attempts: claim.attempts, ...options });
      return true;
    },
    scrub: async (_db, options) => {
      calls.scrub.push(options);
      return 0;
    },
  };
  return { repo, calls, overrides };
}

function fakeScheduler() {
  type Timer = { fn: () => void; ms: number; cancelled: boolean; fired: boolean };
  const timers: Timer[] = [];
  return {
    schedule(fn: () => void, ms: number) {
      const timer: Timer = { fn, ms, cancelled: false, fired: false };
      timers.push(timer);
      return timer;
    },
    cancel(handle: unknown) {
      (handle as Timer).cancelled = true;
    },
    pending: () => timers.filter((timer) => !timer.cancelled && !timer.fired),
    async fire(timer: Timer) {
      timer.fired = true;
      timer.fn();
      await settle();
    },
  };
}

function respond(status: number, headers: Record<string, string> = {}) {
  return async () => new Response(null, { status, headers });
}

describe("classifyHttpResponse", () => {
  it("treats 2xx as sent", () => {
    for (const status of [200, 201, 204]) {
      assert.deepEqual(classifyHttpResponse(status, null, config), { kind: "sent", httpStatus: status });
    }
  });

  it("retries transient statuses and honors Retry-After", () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504]) {
      const outcome = classifyHttpResponse(status, null, config);
      assert.equal(outcome.kind, "retry", `status ${status}`);
    }
    const limited = classifyHttpResponse(429, 90_000, config);
    assert.equal(limited.kind === "retry" && limited.minDelayMs, 90_000);
  });

  it("retries 404/410 slowly because the Zap may just be switched off", () => {
    for (const status of [404, 410]) {
      const outcome = classifyHttpResponse(status, null, config);
      assert.equal(outcome.kind, "retry");
      assert.equal(outcome.kind === "retry" && outcome.minDelayMs, config.zapOffMinDelayMs);
    }
  });

  it("dead-letters requests that resending cannot fix", () => {
    for (const status of [301, 302, 307, 400, 401, 403, 413, 422]) {
      assert.equal(classifyHttpResponse(status, null, config).kind, "dead", `status ${status}`);
    }
  });
});

describe("parseRetryAfterMs", () => {
  it("parses seconds and HTTP dates, and ignores junk", () => {
    assert.equal(parseRetryAfterMs("120"), 120_000);
    assert.equal(parseRetryAfterMs(" 5 "), 5_000);
    const now = Date.parse("2026-11-03T15:00:00Z");
    assert.equal(parseRetryAfterMs("Tue, 03 Nov 2026 15:01:00 GMT", now), 60_000);
    assert.equal(parseRetryAfterMs("Tue, 03 Nov 2026 14:00:00 GMT", now), 0);
    assert.equal(parseRetryAfterMs("soon"), null);
    assert.equal(parseRetryAfterMs(""), null);
    assert.equal(parseRetryAfterMs(null), null);
  });
});

describe("computeRetryDelayMs", () => {
  it("uses equal jitter inside [ceiling/2, ceiling]", () => {
    assert.equal(computeRetryDelayMs(1, 0, config, () => 0), 15_000);
    assert.equal(computeRetryDelayMs(1, 0, config, () => 1), 30_000);
    assert.equal(computeRetryDelayMs(3, 0, config, () => 1), 120_000);
    assert.equal(computeRetryDelayMs(3, 0, config, () => 0), 60_000);
  });

  it("caps the jittered backoff but lets a server-requested delay win, up to a sanity limit", () => {
    assert.equal(computeRetryDelayMs(20, 0, config, () => 1), config.maxBackoffMs);
    assert.equal(computeRetryDelayMs(1, 600_000, config, () => 0), 600_000);
    // Retry-After beyond the backoff cap must not be shortened to it.
    assert.equal(computeRetryDelayMs(1, 3_600_000, config, () => 0), 3_600_000);
    assert.equal(computeRetryDelayMs(10, 3_600_000, config, () => 1), 3_600_000);
    // A bogus value cannot park a row for days.
    assert.equal(
      computeRetryDelayMs(1, 99 * 3_600_000, config, () => 0),
      config.maxRetryAfterMs,
    );
    assert.equal(computeRetryDelayMs(1, Infinity, config, () => 0), config.maxRetryAfterMs);
    assert.ok(config.maxRetryAfterMs < 2 ** 31, "must fit the SQL int cast");
  });
});

describe("sanitizeErrorText", () => {
  it("never leaks the webhook URL or any other URL", () => {
    const text = sanitizeErrorText(new Error(`request to ${WEBHOOK} failed, see https://x.test/a?b=c`), WEBHOOK);
    assert.ok(!text.includes("hooks.zapier.com"));
    assert.ok(!text.includes("abcdef"));
    assert.match(text, /\[webhook\]/);
    assert.match(text, /\[url\]/);
  });

  it("includes the network error code and truncates long text", () => {
    const error = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    assert.equal(sanitizeErrorText(error, WEBHOOK), "TypeError: fetch failed (ECONNREFUSED)");
    assert.equal(sanitizeErrorText("x".repeat(1000), null).length, 300);
  });
});

describe("deliverOutboxRow", () => {
  const ctx = (fetchImpl: any, overrides: Partial<DispatcherConfig> = {}) => ({
    fetch: fetchImpl,
    webhookUrl: WEBHOOK,
    config: { ...config, ...overrides },
    now: () => Date.parse("2026-11-03T15:00:00Z"),
  });

  it("posts the stored payload as JSON without following redirects", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const outcome = await deliverOutboxRow(makeRow(1), ctx(async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response('{"status":"success"}', { status: 200 });
    }));

    assert.deepEqual(outcome, { kind: "sent", httpStatus: 200 });
    assert.equal(seen!.url, WEBHOOK);
    assert.equal(seen!.init.method, "POST");
    assert.deepEqual(seen!.init.headers, { "Content-Type": "application/json" });
    assert.equal(seen!.init.redirect, "manual");
    assert.ok(seen!.init.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(seen!.init.body as string), makeRow(1).payload);
  });

  it("maps real responses, including Retry-After", async () => {
    const limited = await deliverOutboxRow(makeRow(1), ctx(respond(429, { "retry-after": "45" })));
    assert.equal(limited.kind === "retry" && limited.minDelayMs, 45_000);
    const redirected = await deliverOutboxRow(makeRow(1), ctx(respond(302, { location: "https://example.test/" })));
    assert.equal(redirected.kind, "dead");
  });

  it("turns network failures into retries with a redacted message", async () => {
    const outcome = await deliverOutboxRow(
      makeRow(1),
      ctx(async () => {
        throw Object.assign(new TypeError(`fetch failed for ${WEBHOOK}`), { cause: { code: "ENOTFOUND" } });
      }),
    );
    assert.equal(outcome.kind, "retry");
    assert.equal(outcome.kind === "retry" && outcome.httpStatus, null);
    const error = outcome.kind === "retry" ? outcome.error : "";
    assert.match(error, /ENOTFOUND/);
    assert.ok(!error.includes("abcdef"));
  });

  it("aborts a hung request after the timeout and schedules a retry", async () => {
    const hung = (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
      });
    const outcome = await deliverOutboxRow(makeRow(1), ctx(hung, { requestTimeoutMs: 20 }));
    assert.equal(outcome.kind, "retry");
    assert.match(outcome.kind === "retry" ? outcome.error : "", /TimeoutError/);
  });
});

describe("dispatcher pass", () => {
  const baseDeps = (repo: OutboxRepository, fetchImpl: any, extra: object = {}) => ({
    db,
    webhookUrl: WEBHOOK,
    repository: repo,
    fetch: fetchImpl,
    random: () => 0,
    log: { info() {}, error() {} },
    ...extra,
  });

  it("records sent, retried and dead outcomes per row", async () => {
    const { repo, calls } = fakeRepo([[makeRow(1), makeRow(2), makeRow(3)]]);
    const statuses: Record<string, number> = { "evt-1": 200, "evt-2": 503, "evt-3": 400 };
    const dispatcher = createAutomationDispatcher(
      baseDeps(repo, async (_url: string, init: RequestInit) => {
        const id = JSON.parse(init.body as string).automation.eventId;
        return new Response(null, { status: statuses[id] });
      }),
    );

    const summary = await dispatcher.runOnce();
    assert.deepEqual(summary, { claimed: 3, sent: 1, retried: 1, dead: 1, superseded: 0, failed: 0 });
    assert.deepEqual(calls.claim, [{ limit: config.batchSize, leaseMs: config.leaseMs }]);
    assert.deepEqual(calls.sent, [{ id: 1, attempts: 1, httpStatus: 200 }]);
    assert.deepEqual(calls.retry, [
      { id: 2, attempts: 1, delayMs: 15_000, error: "HTTP 503", httpStatus: 503 },
    ]);
    assert.deepEqual(calls.dead, [{ id: 3, attempts: 1, error: "HTTP 400", httpStatus: 400 }]);
  });

  it("fences every result to the attempt it claimed", async () => {
    const { repo, calls } = fakeRepo([[makeRow(1, 4), makeRow(2, 7)]]);
    const dispatcher = createAutomationDispatcher(
      baseDeps(repo, async (_url: string, init: RequestInit) =>
        JSON.parse(init.body as string).automation.eventId === "evt-1"
          ? new Response(null, { status: 200 })
          : new Response(null, { status: 503 }),
      ),
    );
    await dispatcher.runOnce();
    assert.equal(calls.sent[0].attempts, 4);
    assert.equal(calls.retry[0].attempts, 7);
  });

  it("drops results for rows another worker has re-claimed since", async () => {
    const { repo, overrides } = fakeRepo([[makeRow(1), makeRow(2), makeRow(3)]]);
    // A fenced update affects no row, so the repository reports false.
    overrides.markSent = async () => false;
    overrides.markRetry = async () => false;
    overrides.markDead = async () => false;
    const infos: string[] = [];
    const statuses: Record<string, number> = { "evt-1": 200, "evt-2": 503, "evt-3": 400 };
    const dispatcher = createAutomationDispatcher(
      baseDeps(
        repo,
        async (_url: string, init: RequestInit) =>
          new Response(null, { status: statuses[JSON.parse(init.body as string).automation.eventId] }),
        { log: { info: (message: string) => infos.push(message), error() {} } },
      ),
    );

    const summary = await dispatcher.runOnce();
    assert.deepEqual(summary, { claimed: 3, sent: 0, retried: 0, dead: 0, superseded: 3, failed: 0 });
    assert.equal(infos.length, 3);
    assert.match(infos[0], /ignored a stale delivery result for outbox row 1/);
    assert.ok(!infos.join(" ").includes("abcdef"));
  });

  it("dead-letters on the last allowed attempt instead of retrying forever", async () => {
    const { repo, calls } = fakeRepo([[makeRow(1, config.maxAttempts)]]);
    const dispatcher = createAutomationDispatcher(baseDeps(repo, respond(503)));
    const summary = await dispatcher.runOnce();

    assert.equal(summary.dead, 1);
    assert.equal(calls.retry.length, 0);
    assert.match(calls.dead[0].error, /^Gave up after 10 attempts: HTTP 503/);
  });

  it("dead-letters poison rows without sending them", async () => {
    let fetchCalls = 0;
    const { repo, calls } = fakeRepo([[makeRow(1, config.maxAttempts + 1)]]);
    const dispatcher = createAutomationDispatcher(
      baseDeps(repo, async () => {
        fetchCalls += 1;
        return new Response(null, { status: 200 });
      }),
    );
    const summary = await dispatcher.runOnce();

    assert.equal(fetchCalls, 0);
    assert.equal(summary.dead, 1);
    assert.match(calls.dead[0].error, /Max delivery attempts exceeded/);
  });

  it("delivers a claimed batch in parallel", async () => {
    const { repo } = fakeRepo([[makeRow(1), makeRow(2), makeRow(3)]]);
    const resolvers: Array<() => void> = [];
    let started = 0;
    const dispatcher = createAutomationDispatcher(
      baseDeps(repo, () => {
        started += 1;
        return new Promise<Response>((resolve) => resolvers.push(() => resolve(new Response(null, { status: 200 }))));
      }),
    );

    const run = dispatcher.runOnce();
    await settle();
    assert.equal(started, 3, "all requests are in flight before any completes");
    resolvers.forEach((resolve) => resolve());
    assert.equal((await run).sent, 3);
  });

  it("keeps going when one result cannot be recorded", async () => {
    const { repo, calls, overrides } = fakeRepo([[makeRow(1), makeRow(2)]]);
    overrides.markSent = async (_db, claim, httpStatus) => {
      if (claim.id === 1) throw new Error("connection reset");
      calls.sent.push({ id: claim.id, httpStatus });
      return true;
    };
    const errors: string[] = [];
    const dispatcher = createAutomationDispatcher(
      baseDeps(repo, respond(200), { log: { info() {}, error: (message: string) => errors.push(message) } }),
    );

    const summary = await dispatcher.runOnce();
    assert.deepEqual(summary, { claimed: 2, sent: 1, retried: 0, dead: 0, superseded: 0, failed: 1 });
    assert.deepEqual(calls.sent, [{ id: 2, httpStatus: 200 }]);
    assert.equal(errors.length, 1);
    assert.ok(!errors[0].includes("abcdef"));
  });

  it("never runs two passes at once", async () => {
    let release!: () => void;
    let claims = 0;
    const { repo, overrides } = fakeRepo();
    overrides.claimDue = async () => {
      claims += 1;
      await new Promise<void>((resolve) => (release = resolve));
      return [];
    };
    const dispatcher = createAutomationDispatcher(baseDeps(repo, respond(200)));

    const first = dispatcher.runOnce();
    const second = dispatcher.runOnce();
    assert.strictEqual(first, second);
    await settle();
    release();
    await first;
    assert.equal(claims, 1);

    const third = dispatcher.runOnce();
    await settle();
    release();
    await third;
    assert.equal(claims, 2, "a new pass can start once the previous one finished");
  });
});

describe("dispatcher loop", () => {
  const setup = (batches: ClaimedOutboxRow[][] = [], extra: Partial<DispatcherConfig> = {}, now = () => 1_000_000) => {
    const { repo, calls, overrides } = fakeRepo(batches);
    const scheduler = fakeScheduler();
    const errors: string[] = [];
    const infos: string[] = [];
    const dispatcher = createAutomationDispatcher({
      db,
      webhookUrl: WEBHOOK,
      repository: repo,
      fetch: respond(200),
      random: () => 0,
      now,
      log: { info: (m: string) => infos.push(m), error: (m: string) => errors.push(m) },
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
      config: { batchSize: 2, ...extra },
    });
    return { dispatcher, scheduler, calls, overrides, errors, infos };
  };

  it("starts once, runs after the start delay and then idles", async () => {
    const { dispatcher, scheduler, calls } = setup();
    dispatcher.start();
    dispatcher.start();
    assert.equal(scheduler.pending().length, 1);
    assert.equal(scheduler.pending()[0].ms, config.startDelayMs);

    await scheduler.fire(scheduler.pending()[0]);
    assert.equal(calls.claim.length, 1);
    assert.equal(scheduler.pending().length, 1);
    assert.equal(scheduler.pending()[0].ms, config.idleIntervalMs);
  });

  it("drains immediately when a full batch was claimed", async () => {
    const { dispatcher, scheduler } = setup([[makeRow(1), makeRow(2)]]);
    dispatcher.start();
    await scheduler.fire(scheduler.pending()[0]);
    assert.equal(scheduler.pending()[0].ms, 0);
  });

  it("backs off exponentially on failures and throttles error logs", async () => {
    const { dispatcher, scheduler, overrides, errors } = setup();
    overrides.claimDue = async () => {
      throw new Error(`down ${WEBHOOK}`);
    };
    dispatcher.start();

    const delays: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      await scheduler.fire(scheduler.pending()[0]);
      delays.push(scheduler.pending()[0].ms);
    }
    assert.deepEqual(delays, [60_000, 120_000, 240_000, 480_000, 960_000, 1_800_000, 1_800_000, 1_800_000]);
    assert.equal(errors.length, 1, "same-minute failures are logged once");
    assert.ok(!errors[0].includes("abcdef"));
  });

  it("recovers to the idle interval after a failure", async () => {
    const { dispatcher, scheduler, overrides } = setup();
    let fail = true;
    overrides.claimDue = async () => {
      if (fail) throw new Error("down");
      return [];
    };
    dispatcher.start();
    await scheduler.fire(scheduler.pending()[0]);
    assert.equal(scheduler.pending()[0].ms, 60_000);
    fail = false;
    await scheduler.fire(scheduler.pending()[0]);
    assert.equal(scheduler.pending()[0].ms, config.idleIntervalMs);
  });

  it("debounces wakes and keeps a single timer chain", async () => {
    const { dispatcher, scheduler, calls } = setup();
    dispatcher.start();
    await scheduler.fire(scheduler.pending()[0]);

    dispatcher.wake();
    dispatcher.wake();
    dispatcher.wake();
    const wakeTimers = scheduler.pending().filter((timer) => timer.ms === config.wakeDebounceMs);
    assert.equal(wakeTimers.length, 1);

    await scheduler.fire(wakeTimers[0]);
    const pending = scheduler.pending();
    assert.equal(pending.length, 1, "the idle timer was replaced, not duplicated");
    assert.equal(pending[0].ms, 0);

    await scheduler.fire(pending[0]);
    assert.equal(calls.claim.length, 2);
    assert.equal(scheduler.pending().length, 1);
  });

  it("re-runs right away when woken during a pass", async () => {
    const { dispatcher, scheduler, overrides } = setup();
    let release!: () => void;
    overrides.claimDue = async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return [];
    };
    dispatcher.start();
    const timer = scheduler.pending()[0];
    timer.fired = true;
    timer.fn();
    await settle();

    dispatcher.wake();
    assert.equal(scheduler.pending().length, 0, "no extra timer while a pass is running");
    release();
    await settle();
    assert.equal(scheduler.pending().length, 1);
    assert.equal(scheduler.pending()[0].ms, 0);
  });

  it("ignores wake before start and after stop", async () => {
    const { dispatcher, scheduler } = setup();
    dispatcher.wake();
    assert.equal(scheduler.pending().length, 0);

    dispatcher.start();
    await dispatcher.stop();
    dispatcher.wake();
    assert.equal(scheduler.pending().length, 0);
  });

  it("waits for the in-flight pass when stopping", async () => {
    const { dispatcher, scheduler, overrides } = setup();
    let release!: () => void;
    overrides.claimDue = async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return [];
    };
    dispatcher.start();
    const timer = scheduler.pending()[0];
    timer.fired = true;
    timer.fn();
    await settle();

    let stopped = false;
    const stopping = dispatcher.stop().then(() => {
      stopped = true;
    });
    await settle();
    assert.equal(stopped, false);
    release();
    await stopping;
    assert.equal(scheduler.pending().length, 0, "no further pass is scheduled after stop");
  });

  it("scrubs finalized payloads on the first pass, then hourly", async () => {
    let clock = 10_000_000;
    const { dispatcher, scheduler, calls } = setup([], {}, () => clock);
    dispatcher.start();
    await scheduler.fire(scheduler.pending()[0]);
    assert.deepEqual(calls.scrub, [{ retentionDays: config.scrubRetentionDays }]);

    clock += 5 * 60_000;
    await scheduler.fire(scheduler.pending()[0]);
    assert.equal(calls.scrub.length, 1);

    clock += config.scrubIntervalMs;
    await scheduler.fire(scheduler.pending()[0]);
    assert.equal(calls.scrub.length, 2);
  });
});

describe("dispatcher supervisor", () => {
  function fakeDispatcher() {
    let wakes = 0;
    const dispatcher: AutomationDispatcher = {
      runOnce: async () => ({ claimed: 0, sent: 0, retried: 0, dead: 0, superseded: 0, failed: 0 }),
      start() {},
      stop: async () => {},
      wake() {
        wakes += 1;
      },
    };
    return { dispatcher, wakes: () => wakes };
  }

  it("shares one start between concurrent callers", async () => {
    const { dispatcher } = fakeDispatcher();
    let starts = 0;
    const supervisor = createDispatcherSupervisor({
      start: async () => (starts += 1, dispatcher),
      warn() {},
    });

    const results = await Promise.all([
      supervisor.ensureStarted(),
      supervisor.ensureStarted(),
      supervisor.ensureStarted(),
    ]);
    assert.equal(starts, 1);
    assert.ok(results.every((result) => result === dispatcher));
    assert.equal(await supervisor.ensureStarted(), dispatcher);
    assert.equal(starts, 1);
  });

  it("wakes a running dispatcher directly", async () => {
    const { dispatcher, wakes } = fakeDispatcher();
    let starts = 0;
    const supervisor = createDispatcherSupervisor({
      start: async () => (starts += 1, dispatcher),
      warn() {},
    });
    await supervisor.ensureStarted();

    supervisor.wake();
    assert.equal(wakes(), 1);
    assert.equal(starts, 1);
  });

  it("retries a failed start on the next wake instead of staying down", async () => {
    const { dispatcher, wakes } = fakeDispatcher();
    const warnings: string[] = [];
    let starts = 0;
    const supervisor = createDispatcherSupervisor({
      start: async () => {
        starts += 1;
        if (starts === 1) throw new Error(`connect ECONNREFUSED while using ${WEBHOOK}`);
        return dispatcher;
      },
      warn: (message) => warnings.push(message),
    });

    await assert.rejects(supervisor.ensureStarted(), /ECONNREFUSED/);

    supervisor.wake();
    await settle();
    assert.equal(starts, 2);
    assert.equal(warnings.length, 0);
    assert.equal(wakes(), 1);

    supervisor.wake();
    assert.equal(starts, 2);
    assert.equal(wakes(), 2);
  });

  it("warns without the webhook URL when a restart also fails, then tries again later", async () => {
    const { dispatcher, wakes } = fakeDispatcher();
    const warnings: string[] = [];
    let starts = 0;
    const supervisor = createDispatcherSupervisor({
      start: async () => {
        starts += 1;
        if (starts <= 2) throw new Error(`down: ${WEBHOOK}`);
        return dispatcher;
      },
      warn: (message) => warnings.push(message),
    });

    await assert.rejects(supervisor.ensureStarted());
    supervisor.wake();
    await settle();
    assert.equal(warnings.length, 1);
    assert.ok(!warnings[0].includes("hooks.zapier.com"));
    assert.equal(wakes(), 0);

    supervisor.wake();
    await settle();
    assert.equal(starts, 3);
    assert.equal(wakes(), 1);
  });

  it("does nothing when the outbox is not configured", async () => {
    const warnings: string[] = [];
    const supervisor = createDispatcherSupervisor({
      start: async () => null,
      warn: (message) => warnings.push(message),
    });
    supervisor.wake();
    await settle();
    assert.deepEqual(warnings, []);
    assert.equal(await supervisor.ensureStarted(), null);
  });
});

describe("startAutomationDispatcher", () => {
  const saved = { flag: process.env.AUTOMATION_OUTBOX_ENABLED, url: process.env.ZAPIER_WEBHOOK_URL };
  afterEach(() => {
    for (const [key, value] of [
      ["AUTOMATION_OUTBOX_ENABLED", saved.flag],
      ["ZAPIER_WEBHOOK_URL", saved.url],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("does nothing unless explicitly enabled", async () => {
    delete process.env.AUTOMATION_OUTBOX_ENABLED;
    process.env.ZAPIER_WEBHOOK_URL = WEBHOOK;
    assert.equal(await startAutomationDispatcher(), null);
    process.env.AUTOMATION_OUTBOX_ENABLED = "1";
    assert.equal(await startAutomationDispatcher(), null);
  });

  it("refuses to start without a valid https webhook URL", async () => {
    process.env.AUTOMATION_OUTBOX_ENABLED = "true";
    for (const url of [undefined, "", "   ", "not a url", "http://hooks.zapier.com/hooks/catch/1/a/"]) {
      if (url === undefined) delete process.env.ZAPIER_WEBHOOK_URL;
      else process.env.ZAPIER_WEBHOOK_URL = url;
      const warn = console.warn;
      const messages: string[] = [];
      console.warn = (message: string) => void messages.push(message);
      try {
        assert.equal(await startAutomationDispatcher(), null);
      } finally {
        console.warn = warn;
      }
      assert.equal(messages.length, 1);
      assert.ok(!messages[0].includes("hooks.zapier.com"));
    }
  });
});

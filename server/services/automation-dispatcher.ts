/**
 * Delivers queued automation events to the Zapier Catch Hook.
 *
 * Delivery is at-least-once: a crash or a lost DB write after a successful
 * POST means the row is sent again, so Zaps must dedupe on automation.eventId.
 * Nothing here is started unless AUTOMATION_OUTBOX_ENABLED=true and a valid
 * ZAPIER_WEBHOOK_URL is configured.
 */
import { getZapierWebhookUrl, isAutomationOutboxEnabled } from "./automation-config";
import {
  claimDueOutboxRows,
  markOutboxDead,
  markOutboxRetry,
  markOutboxSent,
  scrubFinalizedPayloads,
  type AutomationDb,
  type ClaimedOutboxRow,
} from "./automation-outbox";
import { ensureAutomationSchema } from "./automation-schema";

export interface DispatcherConfig {
  batchSize: number;
  leaseMs: number;
  requestTimeoutMs: number;
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  /**
   * Ceiling for a server-requested delay (Retry-After). The request is honored
   * beyond maxBackoffMs, but a bogus value must not park a row indefinitely.
   * Keep it well under 2^31 ms, the largest delay the SQL update accepts.
   */
  maxRetryAfterMs: number;
  /** Floor for 404/410, which usually means the Zap is switched off. */
  zapOffMinDelayMs: number;
  startDelayMs: number;
  idleIntervalMs: number;
  wakeDebounceMs: number;
  scrubRetentionDays: number;
  scrubIntervalMs: number;
  errorLogIntervalMs: number;
}

export const DEFAULT_DISPATCHER_CONFIG: DispatcherConfig = {
  batchSize: 10,
  leaseMs: 60_000,
  requestTimeoutMs: 10_000,
  maxAttempts: 10,
  baseBackoffMs: 30_000,
  maxBackoffMs: 30 * 60_000,
  maxRetryAfterMs: 6 * 60 * 60_000,
  zapOffMinDelayMs: 10 * 60_000,
  startDelayMs: 2_000,
  idleIntervalMs: 30_000,
  wakeDebounceMs: 250,
  scrubRetentionDays: 14,
  scrubIntervalMs: 60 * 60_000,
  errorLogIntervalMs: 60_000,
};

export type DeliveryOutcome =
  | { kind: "sent"; httpStatus: number }
  | { kind: "retry"; httpStatus: number | null; error: string; minDelayMs: number }
  | { kind: "dead"; httpStatus: number | null; error: string };

export function parseRetryAfterMs(
  value: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? null : Math.max(0, at - nowMs);
}

export function classifyHttpResponse(
  status: number,
  retryAfterMs: number | null,
  config: Pick<DispatcherConfig, "zapOffMinDelayMs">,
): DeliveryOutcome {
  if (status >= 200 && status < 300) return { kind: "sent", httpStatus: status };

  const error = `HTTP ${status}`;
  if (status === 404 || status === 410) {
    return {
      kind: "retry",
      httpStatus: status,
      error: `${error} (Zap off or hook URL changed)`,
      minDelayMs: config.zapOffMinDelayMs,
    };
  }
  if (status < 200 || status === 408 || status === 425 || status === 429 || status >= 500) {
    return { kind: "retry", httpStatus: status, error, minDelayMs: retryAfterMs ?? 0 };
  }
  // Remaining 3xx/4xx will not succeed by resending the same request.
  return { kind: "dead", httpStatus: status, error };
}

/**
 * Exponential backoff with equal jitter, capped at maxBackoffMs. A server-given
 * minimum (Retry-After, the Zap-off floor) always wins over that cap, up to
 * maxRetryAfterMs, so a 429 is never retried before the receiver allowed it.
 */
export function computeRetryDelayMs(
  attempt: number,
  minDelayMs: number,
  config: Pick<DispatcherConfig, "baseBackoffMs" | "maxBackoffMs" | "maxRetryAfterMs">,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(
    config.maxBackoffMs,
    config.baseBackoffMs * 2 ** Math.max(0, attempt - 1),
  );
  const jittered = ceiling / 2 + random() * (ceiling / 2);
  return Math.min(config.maxRetryAfterMs, Math.max(jittered, minDelayMs));
}

/** Error text is stored and logged, so the secret webhook URL must never appear in it. */
export function sanitizeErrorText(error: unknown, webhookUrl: string | null): string {
  let text: string;
  if (error instanceof Error) {
    const code = (error as { cause?: { code?: unknown } }).cause?.code;
    text = `${error.name}: ${error.message}${typeof code === "string" ? ` (${code})` : ""}`;
  } else {
    text = String(error);
  }
  if (webhookUrl) text = text.split(webhookUrl).join("[webhook]");
  return text
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function deliverOutboxRow(
  row: Pick<ClaimedOutboxRow, "payload">,
  ctx: {
    fetch: FetchLike;
    webhookUrl: string;
    config: DispatcherConfig;
    now: () => number;
  },
): Promise<DeliveryOutcome> {
  try {
    const response = await ctx.fetch(ctx.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row.payload),
      redirect: "manual",
      signal: AbortSignal.timeout(ctx.config.requestTimeoutMs),
    });
    await response.body?.cancel().catch(() => undefined);
    return classifyHttpResponse(
      response.status,
      parseRetryAfterMs(response.headers.get("retry-after"), ctx.now()),
      ctx.config,
    );
  } catch (error) {
    return {
      kind: "retry",
      httpStatus: null,
      error: sanitizeErrorText(error, ctx.webhookUrl),
      minDelayMs: 0,
    };
  }
}

export interface RunSummary {
  claimed: number;
  sent: number;
  retried: number;
  dead: number;
  /** Results dropped because another worker re-claimed the row after this lease expired. */
  superseded: number;
  failed: number;
}

export interface OutboxRepository {
  claimDue: typeof claimDueOutboxRows;
  markSent: typeof markOutboxSent;
  markRetry: typeof markOutboxRetry;
  markDead: typeof markOutboxDead;
  scrub: typeof scrubFinalizedPayloads;
}

const defaultRepository: OutboxRepository = {
  claimDue: claimDueOutboxRows,
  markSent: markOutboxSent,
  markRetry: markOutboxRetry,
  markDead: markOutboxDead,
  scrub: scrubFinalizedPayloads,
};

export interface DispatcherDeps {
  db: AutomationDb;
  webhookUrl: string;
  repository?: OutboxRepository;
  fetch?: FetchLike;
  config?: Partial<DispatcherConfig>;
  now?: () => number;
  random?: () => number;
  log?: Pick<Console, "info" | "error">;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}

export interface AutomationDispatcher {
  /** One claim-and-deliver pass. Concurrent calls share the in-flight pass. */
  runOnce(): Promise<RunSummary>;
  start(): void;
  stop(): Promise<void>;
  /** Ask for a pass soon (debounced); safe to call at any time. */
  wake(): void;
}

function defaultSchedule(fn: () => void, ms: number): unknown {
  const handle = setTimeout(fn, ms);
  handle.unref?.();
  return handle;
}

function defaultCancel(handle: unknown): void {
  clearTimeout(handle as NodeJS.Timeout);
}

export function createAutomationDispatcher(deps: DispatcherDeps): AutomationDispatcher {
  const config: DispatcherConfig = { ...DEFAULT_DISPATCHER_CONFIG, ...deps.config };
  const repo = deps.repository ?? defaultRepository;
  const fetchImpl: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  const log = deps.log ?? console;
  const schedule = deps.schedule ?? defaultSchedule;
  const cancel = deps.cancel ?? defaultCancel;

  let started = false;
  let stopped = false;
  let inFlight: Promise<RunSummary> | null = null;
  let tickRunning = false;
  let wakeRequested = false;
  let timer: unknown = null;
  let wakeTimer: unknown = null;
  let consecutiveFailures = 0;
  let lastScrubAt = 0;
  let lastErrorLogAt = 0;

  function logThrottled(message: string, error: unknown): void {
    const at = now();
    if (at - lastErrorLogAt < config.errorLogIntervalMs) return;
    lastErrorLogAt = at;
    log.error(`[automation] ${message}: ${sanitizeErrorText(error, deps.webhookUrl)}`);
  }

  async function processRow(
    row: ClaimedOutboxRow,
  ): Promise<"sent" | "retried" | "dead" | "superseded"> {
    // The repository fences each update to this claim; false means a newer
    // lease owns the row, so this result must not be recorded.
    const finish = (applied: boolean, outcome: "sent" | "retried" | "dead") => {
      if (applied) return outcome;
      log.info(`[automation] ignored a stale delivery result for outbox row ${row.id}`);
      return "superseded" as const;
    };

    if (row.attempts > config.maxAttempts) {
      return finish(
        await repo.markDead(deps.db, row, {
          error: "Max delivery attempts exceeded (lease expired repeatedly)",
          httpStatus: null,
        }),
        "dead",
      );
    }

    const outcome = await deliverOutboxRow(row, {
      fetch: fetchImpl,
      webhookUrl: deps.webhookUrl,
      config,
      now,
    });

    if (outcome.kind === "sent") {
      return finish(await repo.markSent(deps.db, row, outcome.httpStatus), "sent");
    }
    if (outcome.kind === "dead") {
      return finish(
        await repo.markDead(deps.db, row, {
          error: outcome.error,
          httpStatus: outcome.httpStatus,
        }),
        "dead",
      );
    }
    if (row.attempts >= config.maxAttempts) {
      return finish(
        await repo.markDead(deps.db, row, {
          error: `Gave up after ${row.attempts} attempts: ${outcome.error}`.slice(0, 300),
          httpStatus: outcome.httpStatus,
        }),
        "dead",
      );
    }
    return finish(
      await repo.markRetry(deps.db, row, {
        delayMs: computeRetryDelayMs(row.attempts, outcome.minDelayMs, config, random),
        error: outcome.error,
        httpStatus: outcome.httpStatus,
      }),
      "retried",
    );
  }

  async function pass(): Promise<RunSummary> {
    const rows = await repo.claimDue(deps.db, {
      limit: config.batchSize,
      leaseMs: config.leaseMs,
    });
    const summary: RunSummary = {
      claimed: rows.length,
      sent: 0,
      retried: 0,
      dead: 0,
      superseded: 0,
      failed: 0,
    };
    const results = await Promise.allSettled(rows.map(processRow));
    for (const result of results) {
      if (result.status === "fulfilled") {
        summary[result.value] += 1;
      } else {
        // The row stays leased and is retried once the lease expires.
        summary.failed += 1;
        logThrottled("could not record delivery result", result.reason);
      }
    }
    return summary;
  }

  function runOnce(): Promise<RunSummary> {
    if (!inFlight) {
      inFlight = pass().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  async function scrubIfDue(): Promise<void> {
    if (now() - lastScrubAt < config.scrubIntervalMs) return;
    lastScrubAt = now();
    try {
      const scrubbed = await repo.scrub(deps.db, {
        retentionDays: config.scrubRetentionDays,
      });
      if (scrubbed > 0) {
        log.info(`[automation] removed personal data from ${scrubbed} finalized outbox rows`);
      }
    } catch (error) {
      logThrottled("payload scrub failed", error);
    }
  }

  async function tick(): Promise<void> {
    timer = null;
    if (stopped || tickRunning) return;
    tickRunning = true;
    let delay = config.idleIntervalMs;
    try {
      const summary = await runOnce();
      consecutiveFailures = 0;
      if (summary.claimed >= config.batchSize) delay = 0;
      await scrubIfDue();
    } catch (error) {
      consecutiveFailures += 1;
      logThrottled("dispatch pass failed", error);
      delay = Math.min(
        config.maxBackoffMs,
        config.idleIntervalMs * 2 ** Math.min(consecutiveFailures, 6),
      );
    } finally {
      tickRunning = false;
    }
    if (wakeRequested) {
      wakeRequested = false;
      delay = 0;
    }
    if (!stopped) timer = schedule(() => void tick(), delay);
  }

  function wake(): void {
    if (!started || stopped) return;
    if (tickRunning) {
      wakeRequested = true;
      return;
    }
    if (wakeTimer) return;
    wakeTimer = schedule(() => {
      wakeTimer = null;
      if (stopped) return;
      if (tickRunning) {
        wakeRequested = true;
        return;
      }
      if (timer) cancel(timer);
      timer = schedule(() => void tick(), 0);
    }, config.wakeDebounceMs);
  }

  return {
    runOnce,
    start() {
      if (started) return;
      started = true;
      stopped = false;
      timer = schedule(() => void tick(), config.startDelayMs);
    },
    async stop() {
      stopped = true;
      if (timer) cancel(timer);
      if (wakeTimer) cancel(wakeTimer);
      timer = null;
      wakeTimer = null;
      await inFlight?.catch(() => undefined);
    },
    wake,
  };
}

export interface DispatcherSupervisorDeps {
  start: () => Promise<AutomationDispatcher | null>;
  warn: (message: string) => void;
}

/**
 * Owns the single dispatcher. A failed start is retried the next time an event
 * is queued. Rows that were already queued when the start failed wait for that
 * retry or the next restart; the health endpoint reports them as stuck.
 */
export function createDispatcherSupervisor(deps: DispatcherSupervisorDeps) {
  let active: AutomationDispatcher | null = null;
  let starting: Promise<AutomationDispatcher | null> | null = null;

  function ensureStarted(): Promise<AutomationDispatcher | null> {
    if (active) return Promise.resolve(active);
    starting ??= deps
      .start()
      .then((dispatcher) => {
        active = dispatcher;
        return dispatcher;
      })
      .finally(() => {
        starting = null;
      });
    return starting;
  }

  return {
    ensureStarted,
    wake(): void {
      if (active) {
        active.wake();
        return;
      }
      ensureStarted()
        .then((dispatcher) => dispatcher?.wake())
        .catch((error) =>
          deps.warn(
            `[automation] dispatcher is not running and will be retried on the next event: ${sanitizeErrorText(error, null)}`,
          ),
        );
    },
  };
}

async function createDefaultDispatcher(): Promise<AutomationDispatcher | null> {
  if (!isAutomationOutboxEnabled()) return null;

  const webhookUrl = getZapierWebhookUrl();
  if (!webhookUrl) {
    console.warn(
      "[automation] AUTOMATION_OUTBOX_ENABLED is true but ZAPIER_WEBHOOK_URL is missing or not https; dispatcher not started",
    );
    return null;
  }

  const { pool } = await import("../db");
  await ensureAutomationSchema(pool);
  const dispatcher = createAutomationDispatcher({ db: pool, webhookUrl });
  dispatcher.start();
  console.log("[automation] Zapier outbox dispatcher started");
  return dispatcher;
}

const supervisor = createDispatcherSupervisor({
  start: createDefaultDispatcher,
  warn: (message) => console.warn(message),
});

export function wakeAutomationDispatcher(): void {
  supervisor.wake();
}

/** Starts delivery when the outbox is enabled and configured; otherwise does nothing. */
export function startAutomationDispatcher(): Promise<AutomationDispatcher | null> {
  return supervisor.ensureStarted();
}

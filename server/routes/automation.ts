/**
 * Callback endpoints for Zapier, authenticated by a bearer token.
 *
 *   POST /claim   first-caller-wins marker so a replayed Zap run can skip an
 *                 irreversible step (e.g. sending an email) it already did
 *   POST /ack     the Zap confirms it processed an event end to end
 *   GET  /health  delivery health, for a scheduled monitoring Zap
 *
 * Invisible (404) unless AUTOMATION_OUTBOX_ENABLED=true, and unusable (503)
 * until AUTOMATION_CALLBACK_TOKEN is set. Responses never echo the token.
 */
import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getAutomationCallbackTokens,
  isAutomationOutboxEnabled,
  isValidCallbackToken,
} from "../services/automation-config";
import {
  acknowledgeOutboxEvent,
  getAutomationHealthCounts,
  recordAutomationAction,
  type AutomationDb,
  type AutomationHealthCounts,
} from "../services/automation-outbox";
import { ensureAutomationSchema } from "../services/automation-schema";

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTION_KEY_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,59}$/;
const BEARER_PATTERN = /^Bearer\s+(\S{1,512})$/i;
const MAX_DETAIL_BYTES = 2048;
const ACK_OVERDUE_SECONDS = 30 * 60;
const OLDEST_PENDING_ALERT_SECONDS = 15 * 60;
const HEALTH_WINDOW_DAYS = 30;

type AuthState = "ok" | "unconfigured" | "denied";

export interface AutomationLimiters {
  failure: RequestHandler;
  general: RequestHandler;
}

export function createAutomationLimiters(
  options: { failureMax?: number; generalMax?: number } = {},
): AutomationLimiters {
  const reject = (message: string) => (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] Automation callback limit exceeded for: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: { code: "rate_limited", message },
    });
  };

  return {
    // Only requests with a missing or wrong token use this budget. Valid
    // tokens bypass it entirely, so token guessing is throttled while the real
    // Zap can never be locked out by other callers behind the same proxy address.
    failure: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.failureMax ?? 20,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (_req, res) => res.locals.automationAuth === "ok",
      handler: reject("Too many failed attempts. Try again later."),
    }),
    general: rateLimit({
      windowMs: 60 * 1000,
      limit: options.generalMax ?? 120,
      standardHeaders: true,
      legacyHeaders: false,
      handler: reject("Too many requests. Try again shortly."),
    }),
  };
}

export interface AutomationRouterDeps {
  isEnabled(): boolean;
  getTokens(): string[];
  getDb(): Promise<AutomationDb>;
  limiters: AutomationLimiters;
  now?(): Date;
}

/**
 * Degraded means someone should look: events gave up, deliveries are stuck, or
 * the Zap stopped confirming. Acknowledgements are optional, so overdue ones
 * only count once at least one event has been acknowledged.
 */
export function getHealthReasons(counts: AutomationHealthCounts): string[] {
  const reasons: string[] = [];
  if (counts.dead > 0) reasons.push("dead_events");
  if (counts.acknowledged > 0 && counts.ackOverdue > 0) reasons.push("ack_overdue");
  if (
    counts.oldestPendingAgeSeconds !== null &&
    counts.oldestPendingAgeSeconds > OLDEST_PENDING_ALERT_SECONDS
  ) {
    reasons.push("oldest_pending_over_15_min");
  }
  return reasons;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Postgres jsonb cannot hold U+0000 or an unpaired surrogate. Rejecting them here
// keeps a bad `detail` a 400 instead of a 500 from the insert.
const UNSTORABLE_TEXT =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function isStorableDetail(detail: Record<string, unknown>): boolean {
  let storable = true;
  const serialized = JSON.stringify(detail, (key, value) => {
    if (UNSTORABLE_TEXT.test(key) || (typeof value === "string" && UNSTORABLE_TEXT.test(value))) {
      storable = false;
    }
    return value;
  });
  return storable && Buffer.byteLength(serialized) <= MAX_DETAIL_BYTES;
}

function parseEventId(value: unknown): string | null {
  return typeof value === "string" && EVENT_ID_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

export function createAutomationRouter(deps: AutomationRouterDeps): Router {
  const router = Router();
  const now = deps.now ?? (() => new Date());

  const fail = (res: Response, status: number, code: string, message: string) =>
    res.status(status).json({ success: false, error: { code, message } });

  // Decides only; rejecting happens after the failure limiter has seen the outcome.
  const identifyCaller: RequestHandler = (req, res, next) => {
    const tokens = deps.getTokens();
    const presented = BEARER_PATTERN.exec(req.headers.authorization?.trim() ?? "")?.[1];
    const state: AuthState =
      tokens.length === 0
        ? "unconfigured"
        : presented && isValidCallbackToken(presented, tokens)
          ? "ok"
          : "denied";
    res.locals.automationAuth = state;
    next();
  };

  const requireCallbackToken: RequestHandler = (_req, res, next) => {
    const state: AuthState = res.locals.automationAuth;
    if (state === "ok") return next();
    if (state === "unconfigured") {
      return fail(res, 503, "not_configured", "Automation callbacks are not configured");
    }
    res.setHeader("WWW-Authenticate", 'Bearer realm="automation"');
    return fail(res, 401, "unauthorized", "Invalid or missing token");
  };

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!deps.isEnabled()) return fail(res, 404, "not_found", "Not found");
    next();
  });
  router.use(identifyCaller);
  router.use(deps.limiters.failure);
  router.use(requireCallbackToken);
  router.use(deps.limiters.general);

  router.post(
    "/claim",
    asyncHandler(async (req, res) => {
      const body = isPlainObject(req.body) ? req.body : {};
      const eventId = parseEventId(body.eventId);
      if (!eventId) return fail(res, 400, "invalid_event_id", "eventId must be a UUID");

      const actionKey = typeof body.actionKey === "string" ? body.actionKey : "";
      if (!ACTION_KEY_PATTERN.test(actionKey)) {
        return fail(
          res,
          400,
          "invalid_action_key",
          "actionKey must be 1-60 characters: lowercase letters, digits, _ . : -",
        );
      }

      const detail = body.detail === undefined ? {} : body.detail;
      if (!isPlainObject(detail) || !isStorableDetail(detail)) {
        return fail(
          res,
          400,
          "invalid_detail",
          "detail must be an object of at most 2 KB without NUL or unpaired surrogate characters",
        );
      }

      const result = await recordAutomationAction(await deps.getDb(), {
        eventId,
        actionKey,
        actor: "zapier",
        detail,
      });
      if (result === "unknown_event") return fail(res, 404, "unknown_event", "Unknown eventId");

      res.json({ success: true, status: result, claimed: result === "claimed", eventId, actionKey });
    }),
  );

  router.post(
    "/ack",
    asyncHandler(async (req, res) => {
      const eventId = parseEventId(isPlainObject(req.body) ? req.body.eventId : undefined);
      if (!eventId) return fail(res, 400, "invalid_event_id", "eventId must be a UUID");

      const result = await acknowledgeOutboxEvent(await deps.getDb(), eventId);
      if (!result.found) return fail(res, 404, "unknown_event", "Unknown eventId");

      res.json({
        success: true,
        status: result.alreadyAcknowledged ? "already_acknowledged" : "acknowledged",
        eventId,
      });
    }),
  );

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const counts = await getAutomationHealthCounts(await deps.getDb(), {
        ackOverdueSeconds: ACK_OVERDUE_SECONDS,
        windowDays: HEALTH_WINDOW_DAYS,
      });
      const reasons = getHealthReasons(counts);
      const { oldestPendingAgeSeconds, ...rest } = counts;
      res.json({
        success: true,
        status: reasons.length === 0 ? "ok" : "degraded",
        reasons,
        checkedAt: now().toISOString(),
        counts: rest,
        oldestPendingAgeSeconds,
      });
    }),
  );

  return router;
}

export default createAutomationRouter({
  isEnabled: () => isAutomationOutboxEnabled(),
  getTokens: () => getAutomationCallbackTokens(),
  async getDb() {
    // Lazy import: server/db exits the process at import time without DATABASE_URL.
    const { pool } = await import("../db");
    await ensureAutomationSchema(pool);
    return pool;
  },
  limiters: createAutomationLimiters(),
});

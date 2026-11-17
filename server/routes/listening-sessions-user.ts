/**
 * User-facing listening session endpoints (TMU)
 * Allows verified users to create and manage their own live sessions
 * 
 * Public Routes:
 *   POST /create              Create a new session (verified user only)
 *   GET  /my-sessions         Get current user's sessions
 *   POST /:id                 Cancel an upcoming session
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  SESSION_LIMITS,
  normalizeSessionDescription,
  normalizeSessionTitle,
  validateSetTracks,
} from "../../shared/listening-session";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  createSession,
  getSessionRow,
  loadTrackViews,
  presentSessionDetail,
  cancelSession,
  type SessionsPool,
} from "../services/listening-sessions";
import {
  checkUserRateLimit,
  checkIpRateLimit,
  recordSessionCreation,
  recordIpSessionCreation,
  getUserRateLimitStatus,
} from "../services/listening-session-rate-limits";

const MAX_INT4 = 2_147_483_647;
const MAX_START_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;

// ─── Helper Functions ──────────────────────────────────────────────

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return res
    .status(status)
    .json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}

function sendInvalid(res: Response, error: z.ZodError) {
  return sendError(res, 400, "invalid_request", "Request validation failed.", {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function getCurrentUserId(req: Request): number | null {
  const id = Number(req.user?.userId ?? req.user?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown";
}

// ─── Validation Schemas ──────────────────────────────────────────────

const positiveInt = z.number().int().positive().max(MAX_INT4);

const titleSchema = z
  .string()
  .max(1_000, "That title is far too long.")
  .transform(normalizeSessionTitle)
  .pipe(
    z
      .string()
      .min(1, "A title is required.")
      .max(SESSION_LIMITS.titleMax, `At most ${SESSION_LIMITS.titleMax} characters.`),
  );

const descriptionSchema = z
  .union([z.null(), z.string().max(10_000, "That description is far too long.")])
  .transform((value) => {
    if (value === null) return null;
    const text = normalizeSessionDescription(value);
    return text === "" ? null : text;
  })
  .pipe(
    z
      .string()
      .max(SESSION_LIMITS.descriptionMax, `At most ${SESSION_LIMITS.descriptionMax} characters.`)
      .nullable(),
  );

const startsAtSchema = z
  .string()
  .datetime({ offset: true, message: "Use an ISO date and time with a time zone." })
  .transform((value, ctx) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Not a valid date." });
      return z.NEVER;
    }
    return date;
  });

const gapSchema = z.number().int().min(0).max(SESSION_LIMITS.gapSecondsMax);

const userCreateSessionSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    startsAt: startsAtSchema,
    gapSeconds: gapSchema.default(0),
    tracks: z.unknown(),
  })
  .strict();

// ─── Router Creation ──────────────────────────────────────────────────

export interface UserSessionsRouterDeps {
  getDb(): Promise<SessionsPool>;
  now?(): Date;
}

export function createUserSessionsRouter(deps: UserSessionsRouterDeps) {
  const router = Router();
  const nowFn = deps.now ?? (() => new Date());

  async function withDb(res: Response): Promise<SessionsPool | null> {
    try {
      return await deps.getDb();
    } catch (err) {
      console.error("[USER_SESSIONS] DB connection failed:", err);
      sendError(res, 500, "db_error", "Database connection failed.");
      return null;
    }
  }

  // POST /create - Create a new live session
  router.post(
    "/create",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return sendError(res, 401, "unauthorized", "Sign in to create a live session.");
      }

      // Check user verification
      const db = await withDb(res);
      if (!db) return;

      const userResult = await db.query('SELECT is_verified FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return sendError(res, 404, "user_not_found", "User account not found.");
      }

      if (!userResult.rows[0].is_verified) {
        return sendError(
          res,
          403,
          "not_verified",
          "Your account must be verified before you can create live sessions.",
        );
      }

      // Validate input
      const parsed = userCreateSessionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return sendInvalid(res, parsed.error);

      // Validate tracks
      const set = validateSetTracks(parsed.data.tracks);
      if (!set.ok) return sendError(res, 400, set.code, set.message);

      // Check rate limits
      const userRateLimit = checkUserRateLimit(userId);
      if (!userRateLimit.allowed) {
        return sendError(res, 429, "rate_limited", userRateLimit.reason || "Too many sessions created.");
      }

      const clientIp = getClientIp(req);
      const ipRateLimit = checkIpRateLimit(clientIp);
      if (!ipRateLimit.allowed) {
        return sendError(res, 429, "rate_limited", ipRateLimit.reason || "Too many sessions from this IP.");
      }

      // Validate start time
      const now = nowFn();
      if (parsed.data.startsAt.getTime() > now.getTime() + MAX_START_AHEAD_MS) {
        return sendError(res, 400, "starts_too_far", "The start time is more than a year away.");
      }

      // Create session with user as host
      const created = await createSession(
        db,
        {
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          hostUserId: userId,
          startsAt: parsed.data.startsAt,
          gapSeconds: parsed.data.gapSeconds,
          tracks: set.tracks,
        },
        { adminUserId: userId, now },
      );

      if (!created.ok) return sendError(res, 400, created.code, created.message);

      // Record rate limit
      recordSessionCreation(userId);
      recordIpSessionCreation(clientIp);

      console.log(`[USER_SESSIONS] Session ${created.value.id} created by user ${userId}`);

      // Load and return session details
      const row = await getSessionRow(db, created.value.id);
      if (!row) {
        return sendError(res, 500, "created_not_found", "Session created but could not be loaded.");
      }

      const tracks = await loadTrackViews(db, row, { revealUnavailable: true });
      res.status(201).json({
        success: true,
        session: presentSessionDetail(row, tracks, now),
      });
    }),
  );

  // GET /my-sessions - Get current user's sessions
  router.get(
    "/my-sessions",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return sendError(res, 401, "unauthorized", "Sign in first.");
      }

      const db = await withDb(res);
      if (!db) return;

      try {
        // Get user's sessions (live, upcoming, and recent ended)
        const result = await db.query(
          `SELECT * FROM listening_sessions 
           WHERE host_user_id = $1 
           ORDER BY starts_at DESC 
           LIMIT 50`,
          [userId],
        );

        const now = nowFn();
        const sessions = result.rows.map((row: any) => presentSessionDetail(row, [], now));

        res.json({
          success: true,
          sessions,
          rateLimitStatus: getUserRateLimitStatus(userId),
        });
      } catch (err) {
        console.error("[USER_SESSIONS] Failed to fetch user sessions:", err);
        sendError(res, 500, "query_failed", "Could not fetch your sessions.");
      }
    }),
  );

  // POST /:id - Cancel an upcoming session
  router.post(
    "/:id",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return sendError(res, 401, "unauthorized", "Sign in first.");
      }

      const sessionId = Number(req.params.id);
      if (!Number.isFinite(sessionId) || sessionId <= 0) {
        return sendError(res, 400, "invalid_id", "Invalid session ID.");
      }

      const db = await withDb(res);
      if (!db) return;

      try {
        // Verify session belongs to user
        const sessionResult = await db.query(
          'SELECT host_user_id, status FROM listening_sessions WHERE id = $1',
          [sessionId],
        );

        if (sessionResult.rows.length === 0) {
          return sendError(res, 404, "not_found", "Session not found.");
        }

        const session = sessionResult.rows[0];
        if (session.host_user_id !== userId) {
          return sendError(res, 403, "forbidden", "You can only cancel your own sessions.");
        }

        if (session.status === "ended" || session.status === "cancelled") {
          return sendError(res, 400, "already_ended", "This session has already ended or been cancelled.");
        }

        // Cancel the session
        const cancelResult = await cancelSession(db, sessionId, { adminUserId: userId, now: nowFn() });
        if (!cancelResult.ok) {
          return sendError(res, 400, cancelResult.code, cancelResult.message);
        }

        console.log(`[USER_SESSIONS] Session ${sessionId} cancelled by user ${userId}`);

        res.json({
          success: true,
          message: "Session cancelled.",
        });
      } catch (err) {
        console.error("[USER_SESSIONS] Failed to cancel session:", err);
        sendError(res, 500, "cancel_failed", "Could not cancel the session.");
      }
    }),
  );

  return router;
}

export default createUserSessionsRouter({
  async getDb() {
    const { pool } = await import("../db");
    return pool;
  },
});

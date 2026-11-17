/**
 * User-facing listening session endpoints (TMU)
 * Verified artists create and manage their own live sessions.
 *
 * Routes (all require a signed-in user):
 *   GET  /eligibility         Whether the caller may host, and the quota status
 *   GET  /tracks              The caller's own published tracks (for the set picker)
 *   POST /create              Create a session (verified artists only, own tracks only)
 *   GET  /my-sessions         The caller's sessions
 *   POST /:id/cancel          Cancel one of the caller's sessions before it ends
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
  SESSION_SELECT,
  createSession,
  getSessionRow,
  loadTrackViews,
  mapSessionRow,
  presentSessionDetail,
  summarizeSession,
  cancelSession,
  type SessionsPool,
} from "../services/listening-sessions";
import {
  evaluateUserQuota,
  pruneIpHits,
  releaseCreateLock,
  releaseIpSlot,
  reserveIpSlot,
  tryAcquireCreateLock,
} from "../services/listening-session-rate-limits";
import {
  getHostEligibility,
  resolveHostTracks,
  searchHostTracks,
} from "../services/tmu-host";

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

// The app trusts exactly one proxy hop, so req.ip is the real client address and cannot be spoofed
// through X-Forwarded-For.
function getClientIp(req: Request): string {
  return req.ip || "unknown";
}

const NOT_VERIFIED_ARTIST = {
  code: "verified_artist_required",
  message: "Only verified artists can host a live session.",
};

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
    trackIds: z.array(positiveInt).min(1, "Add at least one track."),
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

  /** The stored creation times of every session the user hosts, cancelled ones included. */
  async function loadQuota(db: SessionsPool, userId: number, now: Date) {
    const result = await db.query(
      `SELECT created_at FROM listening_sessions
        WHERE host_user_id = $1 AND created_at > $2::timestamptz`,
      [userId, new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()],
    );
    return evaluateUserQuota(
      result.rows.map((row: any) => new Date(row.created_at)),
      now,
    );
  }

  function quotaView(quota: ReturnType<typeof evaluateUserQuota>) {
    return {
      sessionsCreatedToday: quota.sessionsCreatedToday,
      maxPerDay: quota.maxPerDay,
      nextSessionAvailableAt: quota.nextSessionAvailableAt.toISOString(),
    };
  }

  // GET /eligibility - May the caller host, and how much quota is left
  router.get(
    "/eligibility",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) return sendError(res, 401, "unauthorized", "Sign in first.");
      const db = await withDb(res);
      if (!db) return;

      const eligibility = await getHostEligibility(db, userId);
      const quota = await loadQuota(db, userId, nowFn());
      res.json({
        success: true,
        registeredArtist: eligibility.registered,
        verifiedArtist: eligibility.verified,
        canHost: eligibility.verified,
        rateLimitStatus: quotaView(quota),
      });
    }),
  );

  // GET /tracks - The caller's own published tracks
  router.get(
    "/tracks",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) return sendError(res, 401, "unauthorized", "Sign in first.");
      const db = await withDb(res);
      if (!db) return;

      const eligibility = await getHostEligibility(db, userId);
      if (!eligibility.verified) {
        return sendError(res, 403, NOT_VERIFIED_ARTIST.code, NOT_VERIFIED_ARTIST.message);
      }
      const q = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
      const limit = Number.parseInt(String(req.query.limit ?? "20"), 10) || 20;
      res.json({ success: true, tracks: await searchHostTracks(db, userId, q, limit) });
    }),
  );

  // POST /create - Create a new live session
  router.post(
    "/create",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return sendError(res, 401, "unauthorized", "Sign in to create a live session.");
      }

      const db = await withDb(res);
      if (!db) return;

      const eligibility = await getHostEligibility(db, userId);
      if (!eligibility.verified) {
        return sendError(res, 403, NOT_VERIFIED_ARTIST.code, NOT_VERIFIED_ARTIST.message);
      }

      const parsed = userCreateSessionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return sendInvalid(res, parsed.error);

      const now = nowFn();
      if (parsed.data.startsAt.getTime() > now.getTime() + MAX_START_AHEAD_MS) {
        return sendError(res, 400, "starts_too_far", "The start time is more than a year away.");
      }

      // Lengths come from the stored tracks, and each track must be the caller's own.
      const owned = await resolveHostTracks(db, userId, parsed.data.trackIds);
      if (!owned.ok) {
        return sendError(res, 403, owned.code, owned.message, { trackIds: owned.trackIds });
      }
      const set = validateSetTracks(owned.tracks);
      if (!set.ok) return sendError(res, 400, set.code, set.message);

      // One creation at a time per user, so two parallel requests cannot both pass the quota check.
      if (!tryAcquireCreateLock(userId)) {
        return sendError(res, 429, "rate_limited", "A session is already being created.");
      }
      const clientIp = getClientIp(req);
      let ipReserved = false;
      try {
        const quota = await loadQuota(db, userId, now);
        if (!quota.allowed) {
          return sendError(res, 429, "rate_limited", quota.reason ?? "Too many sessions created.", {
            nextSessionAvailableAt: quota.nextSessionAvailableAt.toISOString(),
          });
        }

        pruneIpHits(now);
        ipReserved = reserveIpSlot(clientIp, now);
        if (!ipReserved) {
          return sendError(res, 429, "rate_limited", "Too many sessions from this network. Try again later.");
        }

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
        if (!created.ok) {
          releaseIpSlot(clientIp);
          return sendError(res, created.status ?? 400, created.code, created.message);
        }

        console.log(`[USER_SESSIONS] Session ${created.value.id} created by user ${userId}`);

        const row = await getSessionRow(db, created.value.id);
        if (!row) {
          return sendError(res, 500, "created_not_found", "Session created but could not be loaded.");
        }
        const tracks = await loadTrackViews(db, row, { revealUnavailable: true });
        res.status(201).json({
          success: true,
          session: presentSessionDetail(row, tracks, now),
        });
      } catch (err) {
        if (ipReserved) releaseIpSlot(clientIp);
        throw err;
      } finally {
        releaseCreateLock(userId);
      }
    }),
  );

  // GET /my-sessions - The caller's sessions, newest first
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
        const now = nowFn();
        const result = await db.query(
          `${SESSION_SELECT} WHERE ls.host_user_id = $1 ORDER BY ls.starts_at DESC LIMIT 50`,
          [userId],
        );
        const sessions = result.rows.map((row: any) => summarizeSession(mapSessionRow(row), now));
        const quota = await loadQuota(db, userId, now);

        res.json({ success: true, sessions, rateLimitStatus: quotaView(quota) });
      } catch (err) {
        console.error("[USER_SESSIONS] Failed to fetch user sessions:", err);
        sendError(res, 500, "query_failed", "Could not fetch your sessions.");
      }
    }),
  );

  // POST /:id/cancel - Cancel one of the caller's sessions
  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return sendError(res, 401, "unauthorized", "Sign in first.");
      }

      const sessionId = Number(req.params.id);
      if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > MAX_INT4) {
        return sendError(res, 400, "invalid_id", "Invalid session ID.");
      }

      const db = await withDb(res);
      if (!db) return;

      try {
        const sessionResult = await db.query(
          "SELECT host_user_id FROM listening_sessions WHERE id = $1",
          [sessionId],
        );
        if (sessionResult.rows.length === 0) {
          return sendError(res, 404, "not_found", "Session not found.");
        }
        if (Number(sessionResult.rows[0].host_user_id) !== userId) {
          return sendError(res, 403, "forbidden", "You can only cancel your own sessions.");
        }

        const cancelResult = await cancelSession(db, sessionId, { now: nowFn() });
        if (!cancelResult.ok) {
          return sendError(res, cancelResult.status ?? 400, cancelResult.code, cancelResult.message);
        }

        console.log(`[USER_SESSIONS] Session ${sessionId} cancelled by user ${userId}`);
        res.json({ success: true, message: "Session cancelled." });
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

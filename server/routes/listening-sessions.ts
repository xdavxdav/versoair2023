/**
 * Listening sessions API.
 *
 *   Public (GET, read-only)
 *     /                 sessions: live first, then upcoming, then recent ended
 *     /:id              one session with its set (signed artists carry their grade)
 *     /:id/now-playing  what everyone should be hearing now, from the server clock
 *     /:id/chat         the community chat during the session
 *   Admin (owner-only GeoAdmin section, behind the Admin Panel guards)
 *     /admin/...        status, list, pickers, create, edit, cancel
 *
 * Invisible (404) when LISTENING_SESSIONS_ENABLED is switched off, and 503 until
 * the table exists. Nothing returned here carries an email address or a user id.
 */
import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { canAccessAdminPanelSection } from "@shared/admin-panel-access";
import {
  SESSION_LIMITS,
  normalizeSessionDescription,
  normalizeSessionTitle,
  validateSetTracks,
} from "../../shared/listening-session";
import { asyncHandler } from "../middleware/asyncHandler";
import { isOwner, requireAdminPanel } from "../middleware/auth";
import {
  CHAT_LIMITS,
  cancelSession,
  createSession,
  getSessionRow,
  listPlaylistOptions,
  loadAdminSessionRows,
  loadChatMessages,
  loadPlaylistTrackOptions,
  loadPublicSessionRows,
  loadTrackViews,
  presentNowPlaying,
  presentPublicList,
  presentSessionDetail,
  searchHostOptions,
  searchTrackOptions,
  summarizeSession,
  syncStoredStatuses,
  toPublicDetail,
  updateSession,
  type SessionRow,
  type SessionsPool,
  type WriteFailure,
} from "../services/listening-sessions";
import { isListeningSessionsEnabled } from "../services/listening-sessions-config";
import { ensureListeningSessionsSchema } from "../services/listening-sessions-schema";
import { createTtlCache, type TtlCache } from "../services/ttl-cache";

export const LISTENING_SESSIONS_ADMIN_SECTION = "listening-sessions";

const MAX_INT4 = 2_147_483_647;
const MAX_START_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;
const ID_PATTERN = "(\\d{1,9})";

export interface ListeningSessionsLimiters {
  public: RequestHandler;
  admin: RequestHandler;
  adminWrite: RequestHandler;
}

export function createListeningSessionsLimiters(
  options: { publicMax?: number; adminMax?: number; adminWriteMax?: number } = {},
): ListeningSessionsLimiters {
  const reject = (message: string) => (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] Listening sessions limit exceeded for: ${req.ip}`);
    res.status(429).json({ success: false, error: { code: "rate_limited", message } });
  };
  const limiter = (limit: number, message: string) =>
    rateLimit({
      windowMs: 60 * 1000,
      limit,
      standardHeaders: true,
      legacyHeaders: false,
      handler: reject(message),
    });

  return {
    // Generous: a whole room can share one address, and each listener polls.
    public: limiter(options.publicMax ?? 600, "Too many requests. Try again shortly."),
    admin: limiter(options.adminMax ?? 120, "Too many requests. Try again shortly."),
    adminWrite: limiter(options.adminWriteMax ?? 20, "Too many changes. Try again shortly."),
  };
}

/** The same shared policy that hides the section in the admin UI also guards its API. */
export function requireAdminSection(section: string): RequestHandler {
  return (req, res, next) => {
    if (canAccessAdminPanelSection(section, isOwner(req.user))) return next();
    res.status(403).json({
      success: false,
      error: {
        code: "ADMIN_SECTION_FORBIDDEN",
        message: "This GeoAdmin section is restricted to the platform owner.",
      },
    });
  };
}

export interface ListeningSessionsRouterDeps {
  isEnabled(): boolean;
  getDb(): Promise<SessionsPool>;
  limiters: ListeningSessionsLimiters;
  adminGuards: RequestHandler[];
  now?(): Date;
}

// ─── request validation ──────────────────────────────────────────────────

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

// An empty description is stored as no description.
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

// The date check lives inside the transform: a refinement chained after it would still
// run on the raw string when .datetime() fails, and throw instead of answering 400.
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

const createSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    hostUserId: positiveInt.optional(),
    startsAt: startsAtSchema,
    gapSeconds: gapSchema.default(0),
    tracks: z.unknown(),
  })
  .strict();

const updateSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    hostUserId: positiveInt.optional(),
    startsAt: startsAtSchema.optional(),
    gapSeconds: gapSchema.optional(),
    tracks: z.unknown().optional(),
  })
  .strict()
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });

const chatQuerySchema = z
  .object({
    afterId: z.coerce.number().int().positive().max(MAX_INT4).optional(),
    beforeId: z.coerce.number().int().positive().max(MAX_INT4).optional(),
    limit: z.coerce.number().int().min(1).max(CHAT_LIMITS.max).default(CHAT_LIMITS.default),
  })
  .refine((query) => query.afterId === undefined || query.beforeId === undefined, {
    message: "Use either afterId or beforeId, not both.",
  });

const searchQuerySchema = z.object({
  q: z.string().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

// ─── small helpers ───────────────────────────────────────────────────────

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

const sendFailure = (res: Response, failure: WriteFailure) =>
  sendError(res, failure.status, failure.code, failure.message, failure.details);

function sendInvalid(res: Response, error: z.ZodError) {
  const issues = error.issues.slice(0, 10).map((issue) => ({
    path: issue.path.join(".") || "(request)",
    message: issue.message,
  }));
  return sendError(res, 400, "invalid_request", "The request is not valid.", { issues });
}

function adminUserIdOf(req: Request): number | null {
  const id = Number(req.user?.userId ?? req.user?.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** One load serves every caller that arrives while it is in flight or still fresh. */
function memoize<V>(
  cache: TtlCache<Promise<V>>,
  key: string,
  load: () => Promise<V>,
): Promise<V> {
  const hit = cache.get(key);
  if (hit) return hit;
  const pending: Promise<V> = load().catch((error) => {
    if (cache.get(key) === pending) cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

export function createListeningSessionsRouter(deps: ListeningSessionsRouterDeps): Router {
  const router = Router();
  const nowFn = deps.now ?? (() => new Date());
  const clock = () => nowFn().getTime();

  const listCache = createTtlCache<Promise<SessionRow[]>>({ ttlMs: 15_000, now: clock });
  const rowCache = createTtlCache<Promise<SessionRow | null>>({ ttlMs: 3_000, now: clock });
  const tracksCache = createTtlCache<Promise<Awaited<ReturnType<typeof loadTrackViews>>>>({
    ttlMs: 30_000,
    now: clock,
  });
  const chatCache = createTtlCache<Promise<Awaited<ReturnType<typeof loadChatMessages>>>>({
    ttlMs: 2_000,
    now: clock,
  });
  const invalidate = () => {
    listCache.clear();
    rowCache.clear();
    tracksCache.clear();
    chatCache.clear();
  };

  // The table is created on first use; a failure there answers 503 and affects nothing else.
  const withDb = async (res: Response): Promise<SessionsPool | null> => {
    try {
      return await deps.getDb();
    } catch (error) {
      console.error(
        "[LISTENING_SESSIONS] database not ready:",
        error instanceof Error ? error.message : error,
      );
      sendError(res, 503, "not_ready", "Listening sessions are not ready yet. Try again shortly.");
      return null;
    }
  };

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!deps.isEnabled()) return sendError(res, 404, "not_found", "Not found");
    next();
  });

  // ─── admin ─────────────────────────────────────────────────────────────
  // Declared before the public `/:id` routes so a specific path is never shadowed.
  const admin = Router();
  admin.use(deps.limiters.admin, ...deps.adminGuards);

  admin.get(
    "/status",
    asyncHandler(async (_req, res) => {
      const db = await withDb(res);
      if (!db) return;
      res.json({
        success: true,
        enabled: true,
        schemaReady: true,
        serverTime: nowFn().toISOString(),
      });
    }),
  );

  admin.get(
    "/list",
    asyncHandler(async (_req, res) => {
      const db = await withDb(res);
      if (!db) return;
      const now = nowFn();
      const rows = await loadAdminSessionRows(db);
      res.json({
        success: true,
        serverTime: now.toISOString(),
        sessions: rows.map((row) => summarizeSession(row, now)),
      });
    }),
  );

  admin.get(
    "/tracks",
    asyncHandler(async (req, res) => {
      const query = searchQuerySchema.safeParse(req.query);
      if (!query.success) return sendInvalid(res, query.error);
      const db = await withDb(res);
      if (!db) return;
      const tracks = await searchTrackOptions(db, query.data.q, query.data.limit);
      res.json({ success: true, tracks });
    }),
  );

  admin.get(
    "/hosts",
    asyncHandler(async (req, res) => {
      const query = searchQuerySchema.safeParse(req.query);
      if (!query.success) return sendInvalid(res, query.error);
      const term = query.data.q.trim();
      if (term.length < 2) return res.json({ success: true, hosts: [] });
      const db = await withDb(res);
      if (!db) return;
      res.json({ success: true, hosts: await searchHostOptions(db, term) });
    }),
  );

  admin.get(
    "/playlists",
    asyncHandler(async (req, res) => {
      const adminUserId = adminUserIdOf(req);
      if (!adminUserId) return sendError(res, 401, "unauthorized", "Sign in again.");
      const query = searchQuerySchema.safeParse(req.query);
      if (!query.success) return sendInvalid(res, query.error);
      const db = await withDb(res);
      if (!db) return;
      res.json({ success: true, playlists: await listPlaylistOptions(db, adminUserId, query.data.q) });
    }),
  );

  admin.get(
    `/playlists/:id${ID_PATTERN}/tracks`,
    asyncHandler(async (req, res) => {
      const adminUserId = adminUserIdOf(req);
      if (!adminUserId) return sendError(res, 401, "unauthorized", "Sign in again.");
      const db = await withDb(res);
      if (!db) return;
      const tracks = await loadPlaylistTrackOptions(db, adminUserId, Number(req.params.id));
      res.json({ success: true, tracks });
    }),
  );

  admin.get(
    `/:id${ID_PATTERN}`,
    asyncHandler(async (req, res) => {
      const db = await withDb(res);
      if (!db) return;
      const now = nowFn();
      const row = await getSessionRow(db, Number(req.params.id));
      if (!row) return sendError(res, 404, "not_found", "Session not found.");
      const tracks = await loadTrackViews(db, row, { revealUnavailable: true });
      res.json({ success: true, serverTime: now.toISOString(), session: presentSessionDetail(row, tracks, now) });
    }),
  );

  admin.post(
    "/",
    deps.limiters.adminWrite,
    asyncHandler(async (req, res) => {
      const adminUserId = adminUserIdOf(req);
      if (!adminUserId) return sendError(res, 401, "unauthorized", "Sign in again.");
      const parsed = createSchema.safeParse(req.body ?? {});
      if (!parsed.success) return sendInvalid(res, parsed.error);
      const set = validateSetTracks(parsed.data.tracks);
      if (!set.ok) return sendError(res, 400, set.code, set.message);

      const now = nowFn();
      if (parsed.data.startsAt.getTime() > now.getTime() + MAX_START_AHEAD_MS) {
        return sendError(res, 400, "starts_too_far", "The start time is more than a year away.");
      }
      const db = await withDb(res);
      if (!db) return;

      const created = await createSession(
        db,
        {
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          hostUserId: parsed.data.hostUserId ?? adminUserId,
          startsAt: parsed.data.startsAt,
          gapSeconds: parsed.data.gapSeconds,
          tracks: set.tracks,
        },
        { adminUserId, now },
      );
      if (!created.ok) return sendFailure(res, created);
      invalidate();
      console.log(
        `[LISTENING_SESSIONS] session ${created.value.id} created by admin ${adminUserId} (${set.tracks.length} tracks)`,
      );

      const row = await getSessionRow(db, created.value.id);
      if (!row) return sendError(res, 500, "created_not_found", "The session was created but could not be read back.");
      const tracks = await loadTrackViews(db, row, { revealUnavailable: true });
      res.status(201).json({ success: true, session: presentSessionDetail(row, tracks, now) });
    }),
  );

  admin.patch(
    `/:id${ID_PATTERN}`,
    deps.limiters.adminWrite,
    asyncHandler(async (req, res) => {
      const adminUserId = adminUserIdOf(req);
      if (!adminUserId) return sendError(res, 401, "unauthorized", "Sign in again.");
      const parsed = updateSchema.safeParse(req.body ?? {});
      if (!parsed.success) return sendInvalid(res, parsed.error);

      let tracks;
      if (parsed.data.tracks !== undefined) {
        const set = validateSetTracks(parsed.data.tracks);
        if (!set.ok) return sendError(res, 400, set.code, set.message);
        tracks = set.tracks;
      }
      const now = nowFn();
      if (
        parsed.data.startsAt !== undefined &&
        parsed.data.startsAt.getTime() > now.getTime() + MAX_START_AHEAD_MS
      ) {
        return sendError(res, 400, "starts_too_far", "The start time is more than a year away.");
      }
      const db = await withDb(res);
      if (!db) return;

      const id = Number(req.params.id);
      const updated = await updateSession(
        db,
        id,
        {
          title: parsed.data.title,
          description: parsed.data.description,
          hostUserId: parsed.data.hostUserId,
          startsAt: parsed.data.startsAt,
          gapSeconds: parsed.data.gapSeconds,
          tracks,
        },
        { now },
      );
      if (!updated.ok) return sendFailure(res, updated);
      invalidate();
      if (updated.value.changed) {
        console.log(`[LISTENING_SESSIONS] session ${id} edited by admin ${adminUserId}`);
      }

      const row = await getSessionRow(db, id);
      if (!row) return sendError(res, 404, "not_found", "Session not found.");
      const views = await loadTrackViews(db, row, { revealUnavailable: true });
      res.json({ success: true, session: presentSessionDetail(row, views, now) });
    }),
  );

  admin.post(
    `/:id${ID_PATTERN}/cancel`,
    deps.limiters.adminWrite,
    asyncHandler(async (req, res) => {
      const adminUserId = adminUserIdOf(req);
      if (!adminUserId) return sendError(res, 401, "unauthorized", "Sign in again.");
      const db = await withDb(res);
      if (!db) return;
      const id = Number(req.params.id);
      const cancelled = await cancelSession(db, id, { now: nowFn() });
      if (!cancelled.ok) return sendFailure(res, cancelled);
      invalidate();
      if (!cancelled.value.alreadyCancelled) {
        console.log(`[LISTENING_SESSIONS] session ${id} cancelled by admin ${adminUserId}`);
      }
      res.json({ success: true, id, status: "cancelled", alreadyCancelled: cancelled.value.alreadyCancelled });
    }),
  );

  router.use("/admin", admin);

  // ─── public ────────────────────────────────────────────────────────────
  router.use(deps.limiters.public);

  const loadRow = (db: SessionsPool, id: number) =>
    memoize(rowCache, `row:${id}`, () => getSessionRow(db, id));

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const db = await withDb(res);
      if (!db) return;
      const now = nowFn();
      const rows = await memoize(listCache, "list", async () => {
        try {
          await syncStoredStatuses(db, now);
        } catch (error) {
          console.warn(
            "[LISTENING_SESSIONS] status sync skipped:",
            error instanceof Error ? error.message : error,
          );
        }
        return loadPublicSessionRows(db, now);
      });
      res.json({ success: true, serverTime: now.toISOString(), sessions: presentPublicList(rows, now) });
    }),
  );

  router.get(
    `/:id${ID_PATTERN}`,
    asyncHandler(async (req, res) => {
      const db = await withDb(res);
      if (!db) return;
      const id = Number(req.params.id);
      const now = nowFn();
      const row = await loadRow(db, id);
      if (!row) return sendError(res, 404, "not_found", "Session not found.");
      const tracks = await memoize(tracksCache, `tracks:${id}`, () =>
        loadTrackViews(db, row, { revealUnavailable: false }),
      );
      res.json({
        success: true,
        serverTime: now.toISOString(),
        session: toPublicDetail(presentSessionDetail(row, tracks, now)),
      });
    }),
  );

  router.get(
    `/:id${ID_PATTERN}/now-playing`,
    asyncHandler(async (req, res) => {
      const db = await withDb(res);
      if (!db) return;
      const row = await loadRow(db, Number(req.params.id));
      if (!row) return sendError(res, 404, "not_found", "Session not found.");
      res.json({ success: true, ...presentNowPlaying(row, nowFn()) });
    }),
  );

  router.get(
    `/:id${ID_PATTERN}/chat`,
    asyncHandler(async (req, res) => {
      const query = chatQuerySchema.safeParse(req.query);
      if (!query.success) return sendInvalid(res, query.error);
      const db = await withDb(res);
      if (!db) return;
      const id = Number(req.params.id);
      const now = nowFn();
      const row = await loadRow(db, id);
      if (!row) return sendError(res, 404, "not_found", "Session not found.");

      const { afterId, beforeId, limit } = query.data;
      const messages = await memoize(
        chatCache,
        `chat:${id}:${afterId ?? ""}:${beforeId ?? ""}:${limit}`,
        () => loadChatMessages(db, row, { afterId: afterId ?? null, beforeId: beforeId ?? null, limit }, now),
      );
      res.json({ success: true, serverTime: now.toISOString(), messages });
    }),
  );

  return router;
}

export default createListeningSessionsRouter({
  isEnabled: () => isListeningSessionsEnabled(),
  async getDb() {
    // Lazy import: server/db exits the process at import time without DATABASE_URL.
    const { pool } = await import("../db");
    await ensureListeningSessionsSchema(pool);
    return pool;
  },
  limiters: createListeningSessionsLimiters(),
  adminGuards: [requireAdminPanel, requireAdminSection(LISTENING_SESSIONS_ADMIN_SECTION)],
});

/**
 * Data access and rules for listening sessions.
 *
 * Every query is parameterised; the only dynamic SQL is the column list of an
 * UPDATE, and those names come from literals in this file. Nothing here reads
 * the clock: callers pass `now`, so every rule is testable at an exact instant.
 *
 * Who counts as signed comes only from approved contracts (`signed-artists.ts`).
 * Nothing returned here carries an email address or a user id: names go through
 * `publicDisplayName`, which refuses anything that looks like an email.
 */
import {
  SESSION_LIMITS,
  computeEndsAt,
  computeNowPlaying,
  deriveStatus,
  setDurationSec,
  trackStartOffsetsSec,
  type AdminHostOption,
  type AdminPlaylistOption,
  type AdminSessionDetail,
  type AdminSessionSummary,
  type AdminTrackOption,
  type NowPlayingResponse,
  type SessionChatMessage,
  type SessionDetail,
  type SessionSummary,
  type SessionTrackView,
  type SetTrack,
} from "../../shared/listening-session";
import { getSignedArtistMap } from "./signed-artists";

export interface SessionsDb {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export interface SessionsTxClient extends SessionsDb {
  release(error?: Error | boolean): void;
}

export interface SessionsPool extends SessionsDb {
  connect(): Promise<SessionsTxClient>;
}

/** A session may be scheduled up to a minute in the past, to absorb a slow submit. */
export const START_GRACE_MS = 60_000;
export const CHAT_LIMITS = { default: 50, max: 100 } as const;
export const ADMIN_SEARCH_LIMITS = { tracks: 50, hosts: 10, playlists: 30, sessions: 100 } as const;
const PUBLIC_UPCOMING_LIMIT = 50;
const PUBLIC_ENDED_LIMIT = 20;
const MAX_PUBLIC_NAME_CHARS = 60;
const PLAYLIST_NAME_MAX = 200;

/**
 * A name that is safe to show to anyone: one line, at most 60 characters, and
 * never containing "@" (usernames are often email addresses). The first usable
 * candidate wins; otherwise the fallback.
 */
export function publicDisplayName<F extends string | null>(
  candidates: readonly unknown[],
  fallback: F,
): string | F {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const name = candidate
      .replace(/[\u0000-\u001F\u007F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!name || name.includes("@")) continue;
    return Array.from(name).slice(0, MAX_PUBLIC_NAME_CHARS).join("").trim();
  }
  return fallback;
}

export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, "\\$&");

// ─── rows ────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: number;
  title: string;
  description: string | null;
  hostUserId: number | null;
  hostName: string | null;
  startsAt: Date;
  endsAt: Date;
  playlistId: number | null;
  storedStatus: string;
  setTracks: SetTrack[];
  gapSeconds: number;
}

const SESSION_SELECT = `SELECT ls.id, ls.title, ls.description, ls.host_user_id, ls.starts_at,
       ls.ends_at, ls.playlist_id, ls.status, ls.set_tracks, ls.gap_seconds,
       u.display_name AS host_display_name, u.username AS host_username
  FROM listening_sessions ls
  LEFT JOIN users u ON u.id = ls.host_user_id`;

/** The stored set, defensively: a malformed entry is dropped rather than trusted. */
export function parseStoredSet(value: unknown): SetTrack[] {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const tracks: SetTrack[] = [];
  for (const item of raw) {
    const trackId = Number(item?.trackId);
    const durationSec = Number(item?.durationSec);
    if (
      Number.isSafeInteger(trackId) &&
      trackId > 0 &&
      Number.isFinite(durationSec) &&
      durationSec > 0
    ) {
      tracks.push({ trackId, durationSec });
    }
  }
  return tracks;
}

const nullableInt = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export function mapSessionRow(raw: any): SessionRow {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ""),
    description: raw.description ?? null,
    hostUserId: nullableInt(raw.host_user_id),
    hostName: publicDisplayName([raw.host_display_name, raw.host_username], null),
    startsAt: new Date(raw.starts_at),
    endsAt: new Date(raw.ends_at),
    playlistId: nullableInt(raw.playlist_id),
    storedStatus: String(raw.status ?? "scheduled"),
    setTracks: parseStoredSet(raw.set_tracks),
    gapSeconds: Number(raw.gap_seconds ?? 0) || 0,
  };
}

export async function getSessionRow(db: SessionsDb, id: number): Promise<SessionRow | null> {
  const result = await db.query(`${SESSION_SELECT} WHERE ls.id = $1`, [id]);
  return result.rows.length ? mapSessionRow(result.rows[0]) : null;
}

// ─── presentation (pure) ─────────────────────────────────────────────────

export function summarizeSession(row: SessionRow, now: Date): AdminSessionSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    hostName: row.hostName,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: deriveStatus({
      storedStatus: row.storedStatus,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      now,
    }),
    gapSeconds: row.gapSeconds,
    trackCount: row.setTracks.length,
    totalDurationSec: setDurationSec(row.setTracks, row.gapSeconds),
    hostUserId: row.hostUserId,
    playlistId: row.playlistId,
  };
}

export function toPublicSummary(summary: AdminSessionSummary): SessionSummary {
  const { hostUserId: _hostUserId, playlistId: _playlistId, ...rest } = summary;
  return rest;
}

export function toPublicDetail(detail: AdminSessionDetail): SessionDetail {
  const { hostUserId: _hostUserId, playlistId: _playlistId, ...rest } = detail;
  return rest;
}

/** Live first, then what is coming up (soonest first), then recent ones (newest first). */
export function presentPublicList(rows: readonly SessionRow[], now: Date): SessionSummary[] {
  const live: SessionSummary[] = [];
  const scheduled: SessionSummary[] = [];
  const ended: SessionSummary[] = [];
  for (const row of rows) {
    const summary = toPublicSummary(summarizeSession(row, now));
    if (summary.status === "live") live.push(summary);
    else if (summary.status === "scheduled") scheduled.push(summary);
    else if (summary.status === "ended") ended.push(summary);
  }
  const byStart = (a: SessionSummary, b: SessionSummary) =>
    a.startsAt.localeCompare(b.startsAt) || a.id - b.id;
  const byEndNewest = (a: SessionSummary, b: SessionSummary) =>
    b.endsAt.localeCompare(a.endsAt) || b.id - a.id;
  live.sort(byStart);
  scheduled.sort(byStart);
  ended.sort(byEndNewest);
  return [...live, ...scheduled, ...ended.slice(0, PUBLIC_ENDED_LIMIT)];
}

export function presentSessionDetail(
  row: SessionRow,
  tracks: SessionTrackView[],
  now: Date,
): AdminSessionDetail {
  return { ...summarizeSession(row, now), tracks };
}

export function presentNowPlaying(row: SessionRow, now: Date): NowPlayingResponse {
  const status = deriveStatus({
    storedStatus: row.storedStatus,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    now,
  });
  return {
    serverTime: now.toISOString(),
    sessionId: row.id,
    status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    gapSeconds: row.gapSeconds,
    nowPlaying:
      status === "cancelled"
        ? null
        : computeNowPlaying({
            startsAt: row.startsAt,
            now,
            tracks: row.setTracks,
            gapSec: row.gapSeconds,
          }),
  };
}

// ─── reads ───────────────────────────────────────────────────────────────

/** Everything the public list can show: what has not ended yet, plus the latest ended. */
export async function loadPublicSessionRows(db: SessionsDb, now: Date): Promise<SessionRow[]> {
  const nowIso = now.toISOString();
  const upcoming = await db.query(
    `${SESSION_SELECT}
      WHERE ls.status <> 'cancelled' AND ls.ends_at > $1::timestamptz
      ORDER BY ls.starts_at ASC, ls.id ASC
      LIMIT ${PUBLIC_UPCOMING_LIMIT}`,
    [nowIso],
  );
  const ended = await db.query(
    `${SESSION_SELECT}
      WHERE ls.status <> 'cancelled' AND ls.ends_at <= $1::timestamptz
      ORDER BY ls.ends_at DESC, ls.id DESC
      LIMIT ${PUBLIC_ENDED_LIMIT}`,
    [nowIso],
  );
  return [...upcoming.rows, ...ended.rows].map(mapSessionRow);
}

export async function loadAdminSessionRows(db: SessionsDb): Promise<SessionRow[]> {
  const result = await db.query(
    `${SESSION_SELECT}
      ORDER BY ls.starts_at DESC, ls.id DESC
      LIMIT ${ADMIN_SEARCH_LIMITS.sessions}`,
  );
  return result.rows.map(mapSessionRow);
}

/**
 * The set as people see it. `grade` comes from approved contracts only; a track
 * that is gone or no longer published keeps its slot but is `available: false`.
 * The admin view still shows the title of an unpublished track so it can be replaced.
 */
export async function loadTrackViews(
  db: SessionsDb,
  row: SessionRow,
  options: { revealUnavailable: boolean },
): Promise<SessionTrackView[]> {
  const ids = row.setTracks.map((track) => track.trackId);
  if (ids.length === 0) return [];

  const result = await db.query(
    `SELECT mt.id, mt.title, mt.artist_id, mt.status,
            COALESCE(ma.name, art.stage_name) AS artist_name
       FROM music_tracks mt
       LEFT JOIN music_artists ma ON ma.id = mt.artist_id
       LEFT JOIN artists art ON art.id = mt.artist_id
      WHERE mt.id = ANY($1::int[])`,
    [ids],
  );
  const byId = new Map<number, any>(result.rows.map((track) => [Number(track.id), track]));
  const signed = await getSignedArtistMap(
    db,
    result.rows.map((track) => nullableInt(track.artist_id)),
  );
  const offsets = trackStartOffsetsSec(row.setTracks, row.gapSeconds);

  return row.setTracks.map((slot, index) => {
    const track = byId.get(slot.trackId);
    const available = track?.status === "published";
    const visible = available || (options.revealUnavailable && track !== undefined);
    return {
      position: index,
      trackId: slot.trackId,
      title: visible ? String(track.title ?? "") : "",
      artistName: visible ? (track.artist_name ?? null) : null,
      durationSec: slot.durationSec,
      startOffsetSec: offsets[index],
      grade: available ? (signed.get(Number(track.artist_id))?.grade ?? null) : null,
      available,
    };
  });
}

export interface ChatQuery {
  afterId: number | null;
  beforeId: number | null;
  limit: number;
}

/**
 * The session's chat is the community chat during the session's window. Only
 * top-level, visible posts; author names are safe public names, and nothing about
 * the account (id, email, avatar) is returned, only whether it is the host.
 */
export async function loadChatMessages(
  db: SessionsDb,
  row: SessionRow,
  query: ChatQuery,
  now: Date,
): Promise<SessionChatMessage[]> {
  const from = row.startsAt.getTime();
  const to = Math.min(row.endsAt.getTime(), now.getTime());
  if (to < from) return [];

  const forward = query.afterId !== null;
  const result = await db.query(
    `SELECT t.* FROM (
       SELECT cp.id, cp.content, cp.created_at::timestamptz AS created_at, cp.user_id,
              cp.author_name, u.display_name, u.username
         FROM community_posts cp
         LEFT JOIN users u ON u.id = cp.user_id
        WHERE cp.parent_id IS NULL
          AND COALESCE(cp.is_hidden, FALSE) = FALSE
          AND cp.created_at >= $1::timestamptz
          AND cp.created_at <= $2::timestamptz
          AND ($3::int IS NULL OR cp.id > $3::int)
          AND ($4::int IS NULL OR cp.id < $4::int)
        ORDER BY cp.id ${forward ? "ASC" : "DESC"}
        LIMIT $5
     ) t ORDER BY t.id ASC`,
    [
      new Date(from).toISOString(),
      new Date(to).toISOString(),
      query.afterId,
      query.beforeId,
      query.limit,
    ],
  );

  return result.rows.map((post) => ({
    id: Number(post.id),
    body: String(post.content ?? "").slice(0, 2000),
    createdAt: new Date(post.created_at).toISOString(),
    author: publicDisplayName([post.display_name, post.author_name, post.username], "Listener"),
    isHost:
      row.hostUserId !== null &&
      post.user_id !== null &&
      post.user_id !== undefined &&
      Number(post.user_id) === row.hostUserId,
  }));
}

// ─── admin pickers ───────────────────────────────────────────────────────

async function toTrackOptions(db: SessionsDb, rows: any[]): Promise<AdminTrackOption[]> {
  const signed = await getSignedArtistMap(
    db,
    rows.map((track) => nullableInt(track.artist_id)),
  );
  return rows.map((track) => ({
    id: Number(track.id),
    title: String(track.title ?? ""),
    artistName: track.artist_name ?? null,
    grade: signed.get(Number(track.artist_id))?.grade ?? null,
  }));
}

/** Published tracks only, newest first, each marked signed (grade) or regular (null). */
export async function searchTrackOptions(
  db: SessionsDb,
  q: string,
  limit: number,
): Promise<AdminTrackOption[]> {
  const term = q.trim();
  const result = await db.query(
    `SELECT mt.id, mt.title, mt.artist_id, COALESCE(ma.name, art.stage_name) AS artist_name
       FROM music_tracks mt
       LEFT JOIN music_artists ma ON ma.id = mt.artist_id
       LEFT JOIN artists art ON art.id = mt.artist_id
      WHERE mt.status = 'published'
        AND ($1::text = '' OR mt.title ILIKE $2 OR COALESCE(ma.name, art.stage_name) ILIKE $2)
      ORDER BY mt.id DESC
      LIMIT $3`,
    [term, `%${escapeLike(term)}%`, Math.min(Math.max(limit, 1), ADMIN_SEARCH_LIMITS.tracks)],
  );
  return toTrackOptions(db, result.rows);
}

/** Matches by display name or exact id. Only a safe name is returned, never an email. */
export async function searchHostOptions(db: SessionsDb, q: string): Promise<AdminHostOption[]> {
  const term = q.trim();
  const asId = /^\d{1,9}$/.test(term) ? Number(term) : null;
  const result = await db.query(
    `SELECT id, display_name, username, role
       FROM users
      WHERE display_name ILIKE $1 OR id = $2::int
      ORDER BY id ASC
      LIMIT ${ADMIN_SEARCH_LIMITS.hosts}`,
    [`%${escapeLike(term)}%`, asId],
  );
  return result.rows.map((user) => ({
    id: Number(user.id),
    name: publicDisplayName([user.display_name, user.username], `User ${user.id}`),
    role: user.role ?? null,
  }));
}

/** The admin's own playlists and public ones. */
export async function listPlaylistOptions(
  db: SessionsDb,
  adminUserId: number,
  q: string,
): Promise<AdminPlaylistOption[]> {
  const term = q.trim();
  const result = await db.query(
    `SELECT p.id, p.name,
            (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id)::int AS track_count
       FROM playlists p
      WHERE (p.user_id = $1 OR p.is_public = TRUE)
        AND ($2::text = '' OR p.name ILIKE $3)
      ORDER BY p.updated_at DESC NULLS LAST, p.id DESC
      LIMIT ${ADMIN_SEARCH_LIMITS.playlists}`,
    [adminUserId, term, `%${escapeLike(term)}%`],
  );
  return result.rows.map((playlist) => ({
    id: Number(playlist.id),
    name: String(playlist.name ?? ""),
    trackCount: Number(playlist.track_count ?? 0),
  }));
}

/** A playlist's published tracks in order, ready to drop into the set-builder. */
export async function loadPlaylistTrackOptions(
  db: SessionsDb,
  adminUserId: number,
  playlistId: number,
): Promise<AdminTrackOption[]> {
  const result = await db.query(
    `SELECT mt.id, mt.title, mt.artist_id, COALESCE(ma.name, art.stage_name) AS artist_name
       FROM playlist_tracks pt
       JOIN playlists p ON p.id = pt.playlist_id
       JOIN music_tracks mt ON mt.id = pt.track_id
       LEFT JOIN music_artists ma ON ma.id = mt.artist_id
       LEFT JOIN artists art ON art.id = mt.artist_id
      WHERE pt.playlist_id = $1
        AND (p.user_id = $2 OR p.is_public = TRUE)
        AND mt.status = 'published'
      ORDER BY pt.position ASC, pt.id ASC
      LIMIT ${SESSION_LIMITS.maxTracks}`,
    [playlistId, adminUserId],
  );
  return toTrackOptions(db, result.rows);
}

// ─── writes ──────────────────────────────────────────────────────────────

export interface WriteFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
export type WriteResult<T> = { ok: true; value: T } | WriteFailure;

const fail = (
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): WriteFailure => ({ ok: false, status, code, message, ...(details ? { details } : {}) });

async function inTransaction<T>(
  pool: SessionsPool,
  work: (client: SessionsTxClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let discard: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // A connection that cannot roll back is not trusted again.
      discard = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
    }
    throw error;
  } finally {
    client.release(discard);
  }
}

async function findUnpublishedTrackIds(db: SessionsDb, ids: number[]): Promise<number[]> {
  const result = await db.query(
    `SELECT id FROM music_tracks WHERE id = ANY($1::int[]) AND status = 'published'`,
    [ids],
  );
  const published = new Set(result.rows.map((row) => Number(row.id)));
  return ids.filter((id) => !published.has(id));
}

async function userExists(db: SessionsDb, userId: number): Promise<boolean> {
  const result = await db.query(`SELECT 1 FROM users WHERE id = $1`, [userId]);
  return result.rows.length > 0;
}

const playlistName = (title: string): string =>
  `Session \u2014 ${title}`.slice(0, PLAYLIST_NAME_MAX);

async function insertPlaylistTracks(
  client: SessionsDb,
  playlistId: number,
  tracks: readonly SetTrack[],
): Promise<void> {
  await client.query(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position)
     SELECT $1::int, t.track_id, t.position
       FROM unnest($2::int[], $3::int[]) AS t(track_id, position)`,
    [playlistId, tracks.map((t) => t.trackId), tracks.map((_t, index) => index)],
  );
}

export interface CreateSessionInput {
  title: string;
  description: string | null;
  hostUserId: number;
  startsAt: Date;
  gapSeconds: number;
  tracks: SetTrack[];
}

/**
 * Creates the session and its own private playlist ("Session - title") in one
 * transaction. `ends_at` is computed here from the set, never accepted from a caller.
 */
export async function createSession(
  pool: SessionsPool,
  input: CreateSessionInput,
  ctx: { adminUserId: number; now: Date },
): Promise<WriteResult<{ id: number }>> {
  if (input.startsAt.getTime() < ctx.now.getTime() - START_GRACE_MS) {
    return fail(400, "starts_in_past", "The start time is already in the past.");
  }
  const unavailable = await findUnpublishedTrackIds(
    pool,
    input.tracks.map((track) => track.trackId),
  );
  if (unavailable.length > 0) {
    return fail(400, "track_unavailable", "Some tracks are not published or do not exist.", {
      trackIds: unavailable,
    });
  }
  if (!(await userExists(pool, input.hostUserId))) {
    return fail(400, "host_not_found", "The host account does not exist.");
  }

  const endsAt = computeEndsAt(input.startsAt, input.tracks, input.gapSeconds);
  const status = deriveStatus({ startsAt: input.startsAt, endsAt, now: ctx.now });
  const totalDuration = input.tracks.reduce((sum, track) => sum + track.durationSec, 0);

  const id = await inTransaction(pool, async (client) => {
    const playlist = await client.query(
      `INSERT INTO playlists (name, description, user_id, is_public, is_system, total_tracks, total_duration)
       VALUES ($1, $2, $3, FALSE, FALSE, $4, $5)
       RETURNING id`,
      [
        playlistName(input.title),
        "The set of a Verso Air live listening session.",
        ctx.adminUserId,
        input.tracks.length,
        totalDuration,
      ],
    );
    const playlistId = Number(playlist.rows[0].id);
    await insertPlaylistTracks(client, playlistId, input.tracks);

    const session = await client.query(
      `INSERT INTO listening_sessions
         (title, description, host_user_id, starts_at, ends_at, playlist_id, status, set_tracks, gap_seconds)
       VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8::jsonb, $9)
       RETURNING id`,
      [
        input.title,
        input.description,
        input.hostUserId,
        input.startsAt.toISOString(),
        endsAt.toISOString(),
        playlistId,
        status,
        JSON.stringify(input.tracks),
        input.gapSeconds,
      ],
    );
    return Number(session.rows[0].id);
  });
  return { ok: true, value: { id } };
}

export interface UpdateSessionInput {
  title?: string;
  description?: string | null;
  hostUserId?: number;
  startsAt?: Date;
  gapSeconds?: number;
  tracks?: SetTrack[];
}

/**
 * Title, description and host can change at any time before the session is
 * cancelled. The time, the set and the gap are locked once it has started, and a
 * value sent back unchanged is not treated as an edit. The row is locked while
 * it is checked, so the start boundary cannot be crossed between check and write.
 */
export async function updateSession(
  pool: SessionsPool,
  id: number,
  patch: UpdateSessionInput,
  ctx: { now: Date },
): Promise<WriteResult<{ id: number; changed: boolean }>> {
  if (patch.tracks !== undefined) {
    const unavailable = await findUnpublishedTrackIds(
      pool,
      patch.tracks.map((track) => track.trackId),
    );
    if (unavailable.length > 0) {
      return fail(400, "track_unavailable", "Some tracks are not published or do not exist.", {
        trackIds: unavailable,
      });
    }
  }
  if (patch.hostUserId !== undefined && !(await userExists(pool, patch.hostUserId))) {
    return fail(400, "host_not_found", "The host account does not exist.");
  }

  return inTransaction(pool, async (client): Promise<WriteResult<{ id: number; changed: boolean }>> => {
    const found = await client.query(
      `SELECT id, title, description, host_user_id, starts_at, ends_at, status, set_tracks,
              gap_seconds, playlist_id
         FROM listening_sessions WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (found.rows.length === 0) return fail(404, "not_found", "Session not found.");
    const current = found.rows[0];

    const currentStart = new Date(current.starts_at);
    const currentTracks = parseStoredSet(current.set_tracks);
    const currentGap = Number(current.gap_seconds ?? 0) || 0;
    const status = deriveStatus({
      storedStatus: current.status,
      startsAt: currentStart,
      endsAt: current.ends_at,
      now: ctx.now,
    });
    if (status === "cancelled") {
      return fail(409, "session_cancelled", "A cancelled session cannot be edited.");
    }

    const startChanged =
      patch.startsAt !== undefined && patch.startsAt.getTime() !== currentStart.getTime();
    const gapChanged = patch.gapSeconds !== undefined && patch.gapSeconds !== currentGap;
    const tracksChanged =
      patch.tracks !== undefined &&
      JSON.stringify(patch.tracks) !== JSON.stringify(currentTracks);
    const scheduleChanged = startChanged || gapChanged || tracksChanged;

    if (scheduleChanged && status !== "scheduled") {
      return fail(
        409,
        "session_started",
        "The time, the set and the gap are locked once a session has started.",
      );
    }
    if (startChanged && patch.startsAt!.getTime() < ctx.now.getTime() - START_GRACE_MS) {
      return fail(400, "starts_in_past", "The start time is already in the past.");
    }

    const assignments: string[] = [];
    const values: unknown[] = [];
    const assign = (column: string, value: unknown, cast = "") => {
      values.push(value);
      assignments.push(`${column} = $${values.length}${cast}`);
    };

    const titleChanged = patch.title !== undefined && patch.title !== current.title;
    if (titleChanged) assign("title", patch.title);
    if (patch.description !== undefined && patch.description !== (current.description ?? null)) {
      assign("description", patch.description);
    }
    if (patch.hostUserId !== undefined && patch.hostUserId !== nullableInt(current.host_user_id)) {
      assign("host_user_id", patch.hostUserId);
    }

    const nextTracks = patch.tracks ?? currentTracks;
    if (scheduleChanged) {
      const nextStart = patch.startsAt ?? currentStart;
      const nextGap = patch.gapSeconds ?? currentGap;
      const endsAt = computeEndsAt(nextStart, nextTracks, nextGap);
      assign("starts_at", nextStart.toISOString(), "::timestamptz");
      assign("ends_at", endsAt.toISOString(), "::timestamptz");
      assign("gap_seconds", nextGap);
      assign("set_tracks", JSON.stringify(nextTracks), "::jsonb");
      assign("status", deriveStatus({ startsAt: nextStart, endsAt, now: ctx.now }));
    }

    if (assignments.length === 0) return { ok: true, value: { id, changed: false } };

    values.push(id);
    await client.query(
      `UPDATE listening_sessions SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`,
      values,
    );

    // The session's own playlist follows its set and its title. It is only
    // touched before the start, and only the rows of that one playlist.
    const playlistId = nullableInt(current.playlist_id);
    if (playlistId !== null && (tracksChanged || titleChanged)) {
      if (tracksChanged) {
        await client.query(`DELETE FROM playlist_tracks WHERE playlist_id = $1`, [playlistId]);
        await insertPlaylistTracks(client, playlistId, nextTracks);
      }
      await client.query(
        `UPDATE playlists SET name = $2, total_tracks = $3, total_duration = $4, updated_at = NOW()
          WHERE id = $1`,
        [
          playlistId,
          playlistName(patch.title ?? current.title),
          nextTracks.length,
          nextTracks.reduce((sum, track) => sum + track.durationSec, 0),
        ],
      );
    }
    return { ok: true, value: { id, changed: true } };
  });
}

/** Allowed until the session has ended; cancelling twice is a no-op. */
export async function cancelSession(
  db: SessionsDb,
  id: number,
  ctx: { now: Date },
): Promise<WriteResult<{ id: number; alreadyCancelled: boolean }>> {
  const found = await db.query(
    `SELECT id, starts_at, ends_at, status FROM listening_sessions WHERE id = $1`,
    [id],
  );
  if (found.rows.length === 0) return fail(404, "not_found", "Session not found.");
  const row = found.rows[0];
  if (row.status === "cancelled") return { ok: true, value: { id, alreadyCancelled: true } };

  const status = deriveStatus({
    storedStatus: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    now: ctx.now,
  });
  if (status === "ended") {
    return fail(409, "session_ended", "A session that has ended cannot be cancelled.");
  }

  const updated = await db.query(
    `UPDATE listening_sessions SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND status <> 'cancelled' AND ends_at > $2::timestamptz
      RETURNING id`,
    [id, ctx.now.toISOString()],
  );
  if (updated.rows.length === 0) {
    return fail(409, "session_changed", "The session changed while cancelling. Refresh and retry.");
  }
  return { ok: true, value: { id, alreadyCancelled: false } };
}

/**
 * Best-effort: keeps the stored status close to what the clock says, for anyone
 * reading the table directly. Reads never depend on it, and a cancelled session is left alone.
 */
export async function syncStoredStatuses(db: SessionsDb, now: Date): Promise<number> {
  const result = await db.query(
    `UPDATE listening_sessions
        SET status = CASE WHEN $1::timestamptz < starts_at THEN 'scheduled'
                          WHEN $1::timestamptz < ends_at THEN 'live'
                          ELSE 'ended' END
      WHERE status <> 'cancelled'
        AND status <> CASE WHEN $1::timestamptz < starts_at THEN 'scheduled'
                           WHEN $1::timestamptz < ends_at THEN 'live'
                           ELSE 'ended' END`,
    [now.toISOString()],
  );
  return result.rowCount ?? 0;
}

/**
 * Who may host a TMU live listening session, and which tracks a host may put in a set.
 *
 * Any signed-in user may host a listening party using any published track in the TMU catalogue.
 * Track durations are always resolved server-side from stored rows, never trusted from the client.
 */
import type { SetTrack } from "../../shared/listening-session";

export interface HostDb {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, any>> }>;
}

export interface HostEligibility {
  registered: boolean;
  verified: boolean;
  canHost: boolean;
}

export async function getHostEligibility(db: HostDb, userId: number): Promise<HostEligibility> {
  const result = await db.query(
    `SELECT
       (EXISTS (SELECT 1 FROM users WHERE id = $1 AND LOWER(COALESCE(role, '')) = 'artist')
         OR EXISTS (SELECT 1 FROM artist_profiles WHERE user_id = $1)
         OR EXISTS (SELECT 1 FROM artist_contracts WHERE user_id = $1 AND status = 'approved')
       ) AS registered,
       (EXISTS (SELECT 1 FROM artist_profiles ap
                  JOIN music_artists ma ON ma.id = ap.music_artist_id
                 WHERE ap.user_id = $1 AND ma.verified = TRUE)
         OR EXISTS (SELECT 1 FROM artist_contracts ac
                      JOIN music_artists ma ON ma.id = ac.artist_id
                     WHERE ac.user_id = $1 AND ac.status = 'approved' AND ma.verified = TRUE)
       ) AS verified`,
    [userId],
  );
  const row = result.rows[0] ?? {};
  const verified = row.verified === true;
  return { registered: row.registered === true || verified, verified, canHost: true };
}

export interface HostTrackOption {
  id: number;
  title: string;
  artistName: string | null;
  durationSec: number;
}

const PUBLISHED_TRACKS = `FROM music_tracks mt
  LEFT JOIN music_artists ma ON ma.id = mt.artist_id
  LEFT JOIN artists art ON art.id = mt.artist_id
 WHERE mt.status = 'published' AND COALESCE(mt.duration, 0) > 0`;

/** Any published TMU track with a known length, optionally filtered by title or artist name. */
export async function searchHostTracks(
  db: HostDb,
  _userId: number,
  q: string,
  limit: number,
): Promise<HostTrackOption[]> {
  const trimmed = q.trim();
  const term = trimmed.replace(/[\\%_]/g, (char) => `\\${char}`);
  const result = await db.query(
    `SELECT mt.id, mt.title, COALESCE(ma.name, art.stage_name) AS artist_name, mt.duration
       ${PUBLISHED_TRACKS}
        AND ($1::text = '' OR mt.title ILIKE $2 ESCAPE '\\' OR COALESCE(ma.name, art.stage_name, '') ILIKE $2 ESCAPE '\\')
      ORDER BY mt.id DESC
      LIMIT $3`,
    [trimmed, `%${term}%`, Math.min(Math.max(limit, 1), 50)],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title ?? ""),
    artistName: row.artist_name ?? null,
    durationSec: Number(row.duration),
  }));
}

export type HostTracksResult =
  | { ok: true; tracks: SetTrack[] }
  | { ok: false; code: "track_unavailable"; message: string; trackIds: number[] };

/**
 * Turns the chosen track ids into set entries. Lengths come from the stored track, never from the
 * request, and every track must be published with a valid duration.
 */
export async function resolveHostTracks(
  db: HostDb,
  _userId: number,
  trackIds: readonly number[],
): Promise<HostTracksResult> {
  const result = await db.query(
    `SELECT mt.id, mt.duration
       FROM music_tracks mt
      WHERE mt.status = 'published' AND COALESCE(mt.duration, 0) > 0
        AND mt.id = ANY($1::int[])`,
    [trackIds],
  );
  const durations = new Map(result.rows.map((row) => [Number(row.id), Number(row.duration)]));
  const missing = trackIds.filter((id) => !durations.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      code: "track_unavailable",
      message: "Every track in a listening session must be a published track with a valid duration.",
      trackIds: missing,
    };
  }
  return {
    ok: true,
    tracks: trackIds.map((trackId) => ({ trackId, durationSec: durations.get(trackId) as number })),
  };
}

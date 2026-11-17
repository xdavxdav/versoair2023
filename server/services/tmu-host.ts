/**
 * Who may host a TMU live session, and which tracks a host may put in a set.
 *
 * Hosting is for verified artists only: a registered artist (artist account, artist profile or
 * approved contract) whose artist record is flagged verified. S and A grades are verified when
 * their contract is approved. Email verification is not enough, every user who can log in has it.
 */
import type { SetTrack } from "../../shared/listening-session";

export interface HostDb {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, any>> }>;
}

export interface HostEligibility {
  registered: boolean;
  verified: boolean;
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
  return { registered: row.registered === true || verified, verified };
}

export interface HostTrackOption {
  id: number;
  title: string;
  artistName: string | null;
  durationSec: number;
}

const OWN_TRACKS = `FROM music_tracks mt
  JOIN artists art ON art.id = mt.artist_id AND art.user_id = $1
 WHERE mt.status = 'published' AND COALESCE(mt.duration, 0) > 0`;

/** The host's own published tracks with a known length, optionally filtered by title. */
export async function searchHostTracks(
  db: HostDb,
  userId: number,
  q: string,
  limit: number,
): Promise<HostTrackOption[]> {
  const term = q.trim().replace(/[\\%_]/g, (char) => `\\${char}`);
  const result = await db.query(
    `SELECT mt.id, mt.title, art.stage_name AS artist_name, mt.duration
       ${OWN_TRACKS}
        AND ($2::text = '' OR mt.title ILIKE $3)
      ORDER BY mt.id DESC
      LIMIT $4`,
    [userId, q.trim(), `%${term}%`, Math.min(Math.max(limit, 1), 50)],
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
  | { ok: false; code: "track_not_owned"; message: string; trackIds: number[] };

/**
 * Turns the chosen track ids into set entries. Lengths come from the stored track, never from the
 * request, and every track must be a published one of the host's own.
 */
export async function resolveHostTracks(
  db: HostDb,
  userId: number,
  trackIds: readonly number[],
): Promise<HostTracksResult> {
  const result = await db.query(
    `SELECT mt.id, mt.duration ${OWN_TRACKS} AND mt.id = ANY($2::int[])`,
    [userId, trackIds],
  );
  const durations = new Map(result.rows.map((row) => [Number(row.id), Number(row.duration)]));
  const missing = trackIds.filter((id) => !durations.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      code: "track_not_owned",
      message: "You can only add your own published tracks to a live session.",
      trackIds: missing,
    };
  }
  return {
    ok: true,
    tracks: trackIds.map((trackId) => ({ trackId, durationSec: durations.get(trackId) as number })),
  };
}

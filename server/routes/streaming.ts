/**
 * Verso Air Streaming Platform — API Routes
 * Full-featured streaming backend: tracks, playlists, social, analytics, subscriptions
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { seedStreamingPlatform } from "../services/streaming-seed";

const router = Router();

// ═══════════════════════════════════════════════════════════
// INITIALIZATION — Auto-seed on first request
// ═══════════════════════════════════════════════════════════
let initialized = false;
async function ensureInit() {
  if (initialized) return;
  initialized = true;
  try {
    await seedStreamingPlatform();
  } catch (e: any) {
    console.error("[Streaming] Init error:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════
// TRACKS
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/tracks — Browse all tracks with filters
router.get("/tracks", async (req: Request, res: Response) => {
  await ensureInit();
  try {
    const {
      genre,
      mood,
      artist,
      search,
      sort,
      page = "1",
      limit = "20",
    } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = "WHERE mt.status = 'published'";
    const params: any[] = [];
    let paramIdx = 1;

    if (genre) {
      where += ` AND mt.genre ILIKE $${paramIdx}`;
      params.push(`%${genre}%`);
      paramIdx++;
    }
    if (mood) {
      where += ` AND mt.mood = $${paramIdx}`;
      params.push(mood);
      paramIdx++;
    }
    if (artist) {
      where += ` AND mt.artist_id = $${paramIdx}`;
      params.push(parseInt(artist as string));
      paramIdx++;
    }
    if (search) {
      where += ` AND (mt.title ILIKE $${paramIdx} OR ma.name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    let orderBy = "ORDER BY mt.streams DESC";
    if (sort === "newest") orderBy = "ORDER BY mt.release_date DESC NULLS LAST";
    else if (sort === "title") orderBy = "ORDER BY mt.title ASC";
    else if (sort === "duration") orderBy = "ORDER BY mt.duration ASC";

    const query = `
      SELECT mt.*, ma.name as artist_name, ma.image_url as artist_image,
        ma.verified as artist_verified, a.title as album_title, a.cover_art as album_cover,
        COALESCE(
          (SELECT COUNT(*) FROM track_likes tl WHERE tl.track_id = mt.id), 0
        ) as like_count
      FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      LEFT JOIN albums a ON mt.album_id = a.id
      ${where}
      ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(parseInt(limit as string), offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      ${where}
    `;

    const [tracks, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    // Get unique genres for filter options
    const genres = await pool.query(`
      SELECT DISTINCT genre FROM music_tracks WHERE genre IS NOT NULL ORDER BY genre
    `);

    const moods = await pool.query(`
      SELECT DISTINCT mood FROM music_tracks WHERE mood IS NOT NULL ORDER BY mood
    `);

    res.json({
      tracks: tracks.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      genres: genres.rows.map((r: any) => r.genre),
      moods: moods.rows.map((r: any) => r.mood),
    });
  } catch (err: any) {
    console.error("[Streaming] GET /tracks error:", err.message);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});

// GET /api/streaming/tracks/featured — Featured/trending tracks
// Now prioritizes artists with active contracts and can_be_featured = true
router.get("/tracks/featured", async (_req: Request, res: Response) => {
  await ensureInit();
  try {
    const featured = await pool.query(`
      SELECT mt.*, ma.name as artist_name, ma.image_url as artist_image,
        ma.verified as artist_verified, a.title as album_title, a.cover_art as album_cover,
        COALESCE((SELECT COUNT(*) FROM track_likes tl WHERE tl.track_id = mt.id), 0) as like_count,
        ac.grade as contract_grade,
        ac.can_be_featured as has_featuring_rights
      FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      LEFT JOIN albums a ON mt.album_id = a.id
      LEFT JOIN artist_contracts ac ON ac.artist_id = mt.artist_id AND ac.status = 'approved'
      WHERE mt.status = 'published'
      ORDER BY
        CASE WHEN ac.can_be_featured = true THEN 0 ELSE 1 END,
        CASE ac.grade WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 ELSE 3 END,
        mt.streams DESC
      LIMIT 12
    `);

    // New releases (last 2 years by release date)
    const newReleases = await pool.query(`
      SELECT mt.*, ma.name as artist_name, ma.image_url as artist_image,
        ma.verified as artist_verified, a.title as album_title, a.cover_art as album_cover
      FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      LEFT JOIN albums a ON mt.album_id = a.id
      WHERE mt.status = 'published' AND mt.release_date IS NOT NULL
      ORDER BY mt.release_date DESC
      LIMIT 10
    `);

    res.json({
      trending: featured.rows,
      newReleases: newReleases.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch featured tracks" });
  }
});

// GET /api/streaming/tracks/:id — Single track with full details
router.get("/tracks/:id", async (req: Request, res: Response) => {
  await ensureInit();
  try {
    const { id } = req.params;
    const track = await pool.query(
      `
      SELECT mt.*, ma.name as artist_name, ma.image_url as artist_image,
        ma.verified as artist_verified, ma.genre as artist_genre,
        a.title as album_title, a.cover_art as album_cover, a.id as album_id,
        COALESCE((SELECT COUNT(*) FROM track_likes tl WHERE tl.track_id = mt.id), 0) as like_count
      FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      LEFT JOIN albums a ON mt.album_id = a.id
      WHERE mt.id = $1
    `,
      [id],
    );

    if (track.rows.length === 0) {
      return res.status(404).json({ error: "Track not found" });
    }

    // Get related tracks (same artist or genre)
    const related = await pool.query(
      `
      SELECT mt.id, mt.title, mt.duration, mt.streams, mt.cover_art, mt.genre,
        ma.name as artist_name, ma.image_url as artist_image
      FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      WHERE mt.id != $1 AND (mt.artist_id = $2 OR mt.genre = $3)
      ORDER BY mt.streams DESC LIMIT 8
    `,
      [id, track.rows[0].artist_id, track.rows[0].genre],
    );

    // Get comments
    const comments = await pool.query(
      `
      SELECT tc.*, u.username, u.display_name
      FROM track_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.track_id = $1
      ORDER BY tc.created_at DESC
      LIMIT 50
    `,
      [id],
    );

    // Get album tracks if part of an album
    let albumTracks: any[] = [];
    if (track.rows[0].album_id) {
      const at = await pool.query(
        `
        SELECT mt.id, mt.title, mt.duration, mt.track_number, mt.streams
        FROM music_tracks mt
        WHERE mt.album_id = $1
        ORDER BY mt.track_number ASC
      `,
        [track.rows[0].album_id],
      );
      albumTracks = at.rows;
    }

    res.json({
      track: track.rows[0],
      related: related.rows,
      comments: comments.rows,
      albumTracks,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch track" });
  }
});

// ═══════════════════════════════════════════════════════════
// STREAM RECORDING (30-second rule)
// ═══════════════════════════════════════════════════════════

// In-memory dedup: trackId-sessionId → timestamp
const recentStreams = new Map<string, number>();

// Clean old entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, ts] of recentStreams.entries()) {
      if (now - ts > 10 * 60 * 1000) recentStreams.delete(key);
    }
  },
  10 * 60 * 1000,
);

// ── Stream Economy: Weekly Caps per Listener Tier ──
// Guest (no subscription):  20 streams/week
// Supporter (plan_id=1):   300 streams/week
// Champion  (plan_id=2): 1,500 streams/week
// Patron    (plan_id=3): unlimited
const STREAM_CAPS: Record<string, number> = {
  guest: 20,
  supporter: 300,
  champion: 1500,
  patron: Infinity,
};
const ROLLOVER_CAP_MULTIPLIER = 1.5; // unused streams carry over up to 1.5× base cap

/**
 * Resolve the listener's weekly stream limit, current usage, and rollover.
 * Also performs weekly reset if needed.
 */
async function getStreamBudget(userId: number | null): Promise<{
  tier: string;
  weeklyLimit: number;
  used: number;
  rollover: number;
  allowed: boolean;
  remaining: number;
  subscriptionId: number | null;
}> {
  if (!userId) {
    return {
      tier: "guest",
      weeklyLimit: STREAM_CAPS.guest,
      used: 0,
      rollover: 0,
      allowed: true,
      remaining: STREAM_CAPS.guest,
      subscriptionId: null,
    };
  }

  // Fetch listener subscription + plan name
  const sub = await pool.query(
    `SELECT ls.id, ls.streams_used_this_week, ls.streams_rollover, ls.last_stream_reset, sp.name as plan_name
     FROM listener_subscriptions ls
     JOIN streaming_plans sp ON sp.id = ls.plan_id
     WHERE ls.user_id = $1 AND ls.status = 'active'
     ORDER BY sp.monthly_fee DESC LIMIT 1`,
    [userId],
  );

  if (sub.rows.length === 0) {
    // No active subscription → guest tier
    // Track guest usage via a lightweight approach (count recent stream_plays)
    const guestUsage = await pool.query(
      `SELECT COUNT(*) as cnt FROM stream_plays
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [userId],
    );
    const used = parseInt(guestUsage.rows[0]?.cnt || "0");
    return {
      tier: "guest",
      weeklyLimit: STREAM_CAPS.guest,
      used,
      rollover: 0,
      allowed: used < STREAM_CAPS.guest,
      remaining: Math.max(0, STREAM_CAPS.guest - used),
      subscriptionId: null,
    };
  }

  const s = sub.rows[0];
  const tierName = (s.plan_name || "supporter").toLowerCase();
  const baseCap = STREAM_CAPS[tierName] || STREAM_CAPS.supporter;
  let used = parseInt(s.streams_used_this_week || "0");
  let rollover = parseInt(s.streams_rollover || "0");

  // Weekly reset check — if last_stream_reset is >7 days ago, reset counters & carry over unused
  const lastReset = s.last_stream_reset ? new Date(s.last_stream_reset) : null;
  const daysSinceReset = lastReset
    ? (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  if (daysSinceReset >= 7) {
    // Calculate rollover: unused streams from last week, capped at 1.5× base cap
    const unused = Math.max(0, baseCap - used);
    const maxRollover = Math.floor(baseCap * ROLLOVER_CAP_MULTIPLIER);
    rollover = Math.min(rollover + unused, maxRollover);
    used = 0;

    await pool.query(
      `UPDATE listener_subscriptions
       SET streams_used_this_week = 0, streams_rollover = $1, last_stream_reset = NOW()
       WHERE id = $2`,
      [rollover, s.id],
    );
  }

  // Effective limit = base cap + rollover
  const effectiveLimit = baseCap === Infinity ? Infinity : baseCap + rollover;
  const allowed = baseCap === Infinity || used < effectiveLimit;
  const remaining =
    baseCap === Infinity ? Infinity : Math.max(0, effectiveLimit - used);

  return {
    tier: tierName,
    weeklyLimit: effectiveLimit,
    used,
    rollover,
    allowed,
    remaining,
    subscriptionId: s.id,
  };
}

// POST /api/streaming/record-play — Record a stream play (must be ≥30 seconds)
// Enforces weekly stream caps per listener subscription tier.
router.post("/record-play", async (req: Request, res: Response) => {
  try {
    const { trackId, duration, sessionId } = req.body;
    if (!trackId || !duration) {
      return res.status(400).json({ error: "trackId and duration required" });
    }
    if (duration < 30) {
      return res.json({
        recorded: false,
        reason: "Must listen at least 30 seconds",
      });
    }

    // Dedup check (same track + session within 5 minutes)
    const dedupKey = `${trackId}-${sessionId || "anon"}`;
    const lastPlay = recentStreams.get(dedupKey);
    if (lastPlay && Date.now() - lastPlay < 5 * 60 * 1000) {
      return res.json({ recorded: false, reason: "Already counted recently" });
    }
    recentStreams.set(dedupKey, Date.now());

    // ── Stream Economy: Check weekly cap ──
    const userId = (req as any).user?.id || null;
    const budget = await getStreamBudget(userId);

    if (!budget.allowed) {
      return res.status(429).json({
        recorded: false,
        reason: "Weekly stream limit reached",
        tier: budget.tier,
        weeklyLimit: budget.weeklyLimit,
        used: budget.used,
        rollover: budget.rollover,
        upgradeHint:
          budget.tier === "patron"
            ? null
            : `Upgrade your plan for more streams. Current: ${budget.tier}`,
      });
    }

    // Get artist ID for this track
    const trackRow = await pool.query(
      `SELECT artist_id FROM music_tracks WHERE id = $1`,
      [trackId],
    );
    const artistId = trackRow.rows[0]?.artist_id || null;

    // Record the stream play
    await pool.query(
      `INSERT INTO stream_plays (track_id, user_id, artist_id, duration, completed, session_id, ip_address)
       VALUES ($1, $2, $3, $4, true, $5, $6)`,
      [trackId, userId, artistId, duration, sessionId || null, req.ip],
    );

    // Increment track stream count
    await pool.query(
      `UPDATE music_tracks SET streams = COALESCE(streams, 0) + 1, play_count = COALESCE(play_count, 0) + 1
       WHERE id = $1`,
      [trackId],
    );

    // Increment artist total streams
    if (artistId) {
      await pool.query(
        `UPDATE music_artists SET total_streams = COALESCE(total_streams, 0) + 1
         WHERE id = $1`,
        [artistId],
      );
    }

    // Increment listener subscription usage counter
    if (budget.subscriptionId) {
      await pool.query(
        `UPDATE listener_subscriptions SET streams_used_this_week = streams_used_this_week + 1
         WHERE id = $1`,
        [budget.subscriptionId],
      );
    }

    // Record in listening history if user is authenticated
    if (userId) {
      await pool.query(
        `INSERT INTO listening_history (user_id, track_id, duration)
         VALUES ($1, $2, $3)`,
        [userId, trackId, duration],
      );
    }

    res.json({
      recorded: true,
      streamBudget: {
        tier: budget.tier,
        remaining:
          budget.remaining === Infinity ? "unlimited" : budget.remaining - 1,
        rollover: budget.rollover,
      },
    });
  } catch (err: any) {
    console.error("[Streaming] record-play error:", err.message);
    res.status(500).json({ error: "Failed to record play" });
  }
});

// ═══════════════════════════════════════════════════════════
// ARTISTS
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/artists — Browse artists
router.get("/artists", async (req: Request, res: Response) => {
  await ensureInit();
  try {
    const {
      search,
      genre,
      country,
      sort,
      page = "1",
      limit = "20",
    } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = "WHERE 1=1";
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (name ILIKE $${paramIdx} OR genre ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (genre) {
      where += ` AND genre ILIKE $${paramIdx}`;
      params.push(`%${genre}%`);
      paramIdx++;
    }
    if (country) {
      where += ` AND country_code = $${paramIdx}`;
      params.push(country);
      paramIdx++;
    }

    let orderBy = "ORDER BY total_streams DESC";
    if (sort === "name") orderBy = "ORDER BY name ASC";
    else if (sort === "followers") orderBy = "ORDER BY followers DESC";
    else if (sort === "monthly") orderBy = "ORDER BY monthly_listeners DESC";

    const artists = await pool.query(
      `
      SELECT ma.*,
        (SELECT COUNT(*) FROM artist_follows af WHERE af.artist_id = ma.id) as follower_count,
        (SELECT COUNT(*) FROM music_tracks mt WHERE mt.artist_id = ma.id) as track_count
      FROM music_artists ma
      ${where}
      ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `,
      [...params, parseInt(limit as string), offset],
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM music_artists ${where}`,
      params,
    );

    res.json({
      artists: artists.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch artists" });
  }
});

// GET /api/streaming/artists/:id — Single artist profile
router.get("/artists/:id", async (req: Request, res: Response) => {
  await ensureInit();
  try {
    const { id } = req.params;
    const artist = await pool.query(
      `
      SELECT ma.*,
        (SELECT COUNT(*) FROM artist_follows af WHERE af.artist_id = ma.id) as follower_count
      FROM music_artists ma WHERE ma.id = $1
    `,
      [id],
    );

    if (artist.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    // Discography — albums with tracks
    const albums = await pool.query(
      `
      SELECT a.*, 
        json_agg(json_build_object(
          'id', mt.id, 'title', mt.title, 'duration', mt.duration,
          'track_number', mt.track_number, 'streams', mt.streams,
          'mood', mt.mood, 'cover_art', mt.cover_art
        ) ORDER BY mt.track_number) as tracks
      FROM albums a
      LEFT JOIN music_tracks mt ON mt.album_id = a.id
      WHERE a.artist_id = $1
      GROUP BY a.id
      ORDER BY a.release_date DESC NULLS LAST
    `,
      [id],
    );

    // Top tracks
    const topTracks = await pool.query(
      `
      SELECT mt.*, a.title as album_title, a.cover_art as album_cover,
        COALESCE((SELECT COUNT(*) FROM track_likes tl WHERE tl.track_id = mt.id), 0) as like_count
      FROM music_tracks mt
      LEFT JOIN albums a ON mt.album_id = a.id
      WHERE mt.artist_id = $1 AND mt.status = 'published'
      ORDER BY mt.streams DESC
      LIMIT 10
    `,
      [id],
    );

    // Related artists (same genre or country)
    const related = await pool.query(
      `
      SELECT id, name, genre, image_url, country, country_code, monthly_listeners, verified
      FROM music_artists
      WHERE id != $1 AND (genre = $2 OR country_code = $3)
      ORDER BY total_streams DESC LIMIT 6
    `,
      [id, artist.rows[0].genre, artist.rows[0].country_code],
    );

    // Monthly stream trend (last 6 months)
    const streamTrend = await pool.query(
      `
      SELECT 
        DATE_TRUNC('month', sp.created_at) as month,
        COUNT(*) as plays
      FROM stream_plays sp
      WHERE sp.artist_id = $1 AND sp.created_at > NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `,
      [id],
    );

    res.json({
      artist: artist.rows[0],
      albums: albums.rows,
      topTracks: topTracks.rows,
      relatedArtists: related.rows,
      streamTrend: streamTrend.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch artist" });
  }
});

// ═══════════════════════════════════════════════════════════
// ALBUMS
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/albums/:id
router.get("/albums/:id", async (req: Request, res: Response) => {
  try {
    const album = await pool.query(
      `
      SELECT a.*, ma.name as artist_name, ma.image_url as artist_image, ma.verified as artist_verified
      FROM albums a
      LEFT JOIN music_artists ma ON a.artist_id = ma.id
      WHERE a.id = $1
    `,
      [req.params.id],
    );

    if (album.rows.length === 0)
      return res.status(404).json({ error: "Album not found" });

    const tracks = await pool.query(
      `
      SELECT mt.*, 
        COALESCE((SELECT COUNT(*) FROM track_likes tl WHERE tl.track_id = mt.id), 0) as like_count
      FROM music_tracks mt
      WHERE mt.album_id = $1
      ORDER BY mt.track_number ASC
    `,
      [req.params.id],
    );

    res.json({ album: album.rows[0], tracks: tracks.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch album" });
  }
});

// ═══════════════════════════════════════════════════════════
// PLAYLISTS
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/playlists — User's playlists
router.get("/playlists", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get public playlists + user's private ones
    let query = `
      SELECT p.*, u.username as creator_name,
        (SELECT json_agg(json_build_object(
          'id', mt.id, 'title', mt.title, 'cover_art', mt.cover_art, 
          'artist_name', ma.name, 'duration', mt.duration
        ) ORDER BY pt.position)
        FROM playlist_tracks pt
        JOIN music_tracks mt ON pt.track_id = mt.id
        LEFT JOIN music_artists ma ON mt.artist_id = ma.id
        WHERE pt.playlist_id = p.id
        ) as tracks
      FROM playlists p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_public = true
    `;
    const params: any[] = [];

    if (userId) {
      query += ` OR p.user_id = $1`;
      params.push(userId);
    }
    query += ` ORDER BY p.updated_at DESC LIMIT 50`;

    const playlists = await pool.query(query, params);
    res.json({ playlists: playlists.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

// POST /api/streaming/playlists — Create a playlist
router.post("/playlists", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const { name, description, isPublic = true } = req.body;
    if (!name) return res.status(400).json({ error: "Playlist name required" });

    const result = await pool.query(
      `
      INSERT INTO playlists (name, description, user_id, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [name, description || null, userId, isPublic],
    );

    res.json({ playlist: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

// PUT /api/streaming/playlists/:id — Update playlist
router.put("/playlists/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, description, isPublic } = req.body;

    const result = await pool.query(
      `
      UPDATE playlists SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_public = COALESCE($3, is_public),
        updated_at = NOW()
      WHERE id = $4 AND (user_id = $5 OR $5 IS NULL)
      RETURNING *
    `,
      [name, description, isPublic, req.params.id, userId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Playlist not found" });
    res.json({ playlist: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update playlist" });
  }
});

// DELETE /api/streaming/playlists/:id
router.delete("/playlists/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await pool.query(`DELETE FROM playlists WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      userId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// POST /api/streaming/playlists/:id/tracks — Add track to playlist
router.post("/playlists/:id/tracks", async (req: Request, res: Response) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: "trackId required" });

    // Get max position
    const maxPos = await pool.query(
      `
      SELECT COALESCE(MAX(position), -1) + 1 as next_pos
      FROM playlist_tracks WHERE playlist_id = $1
    `,
      [req.params.id],
    );

    await pool.query(
      `
      INSERT INTO playlist_tracks (playlist_id, track_id, position)
      VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
    `,
      [req.params.id, trackId, maxPos.rows[0].next_pos],
    );

    // Update playlist totals
    await pool.query(
      `
      UPDATE playlists SET 
        total_tracks = (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = $1),
        total_duration = (SELECT COALESCE(SUM(mt.duration), 0) FROM playlist_tracks pt JOIN music_tracks mt ON pt.track_id = mt.id WHERE pt.playlist_id = $1),
        updated_at = NOW()
      WHERE id = $1
    `,
      [req.params.id],
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add track" });
  }
});

// DELETE /api/streaming/playlists/:playlistId/tracks/:trackId
router.delete(
  "/playlists/:playlistId/tracks/:trackId",
  async (req: Request, res: Response) => {
    try {
      await pool.query(
        `
      DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2
    `,
        [req.params.playlistId, req.params.trackId],
      );

      // Update totals
      await pool.query(
        `
      UPDATE playlists SET 
        total_tracks = (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = $1),
        total_duration = (SELECT COALESCE(SUM(mt.duration), 0) FROM playlist_tracks pt JOIN music_tracks mt ON pt.track_id = mt.id WHERE pt.playlist_id = $1),
        updated_at = NOW()
      WHERE id = $1
    `,
        [req.params.playlistId],
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to remove track" });
    }
  },
);

// PUT /api/streaming/playlists/:id/reorder — Reorder tracks
router.put("/playlists/:id/reorder", async (req: Request, res: Response) => {
  try {
    const { trackIds } = req.body; // Array of track IDs in desired order
    if (!Array.isArray(trackIds))
      return res.status(400).json({ error: "trackIds array required" });

    for (let i = 0; i < trackIds.length; i++) {
      await pool.query(
        `
        UPDATE playlist_tracks SET position = $1
        WHERE playlist_id = $2 AND track_id = $3
      `,
        [i, req.params.id, trackIds[i]],
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reorder" });
  }
});

// GET /api/streaming/playlists/:id — Get playlist with tracks
router.get("/playlists/:id", async (req: Request, res: Response) => {
  try {
    const playlist = await pool.query(
      `
      SELECT p.*, u.username as creator_name
      FROM playlists p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `,
      [req.params.id],
    );

    if (playlist.rows.length === 0)
      return res.status(404).json({ error: "Playlist not found" });

    const tracks = await pool.query(`
      SELECT mt.*, ma.name as artist_name, ma.image_url as artist_image,
        a.title as album_title, a.cover_art as album_cover, pt.position,
        COALESCE((SELECT COUNT(*) FROM track_likes tl WHERE tl.track_id = mt.id), 0) as like_count
      FROM playlist_tracks pt
      JOIN music_tracks mt ON pt.track_id = mt.id
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      LEFT JOIN albums a ON mt.album_id = a.id
      ORDER BY pt.position ASC
    `);

    res.json({ playlist: playlist.rows[0], tracks: tracks.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

// ═══════════════════════════════════════════════════════════
// SOCIAL — Likes, Comments, Follows, Share
// ═══════════════════════════════════════════════════════════

// POST /api/streaming/like — Toggle like on a track
router.post("/like", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { trackId } = req.body;

    if (!trackId) return res.status(400).json({ error: "trackId required" });

    // If no auth, use localStorage-based tracking (return liked state only)
    if (!userId) {
      return res.json({ liked: true, requiresAuth: true });
    }

    // Check if already liked
    const existing = await pool.query(
      `
      SELECT id FROM track_likes WHERE track_id = $1 AND user_id = $2
    `,
      [trackId, userId],
    );

    if (existing.rows.length > 0) {
      // Unlike
      await pool.query(
        `DELETE FROM track_likes WHERE track_id = $1 AND user_id = $2`,
        [trackId, userId],
      );
      await pool.query(
        `UPDATE music_tracks SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1`,
        [trackId],
      );
      res.json({ liked: false });
    } else {
      // Like
      await pool.query(
        `INSERT INTO track_likes (track_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [trackId, userId],
      );
      await pool.query(
        `UPDATE music_tracks SET likes = COALESCE(likes, 0) + 1 WHERE id = $1`,
        [trackId],
      );
      res.json({ liked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// GET /api/streaming/liked — User's liked tracks
router.get("/liked", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.json({ tracks: [] });

    const liked = await pool.query(
      `
      SELECT mt.*, ma.name as artist_name, ma.image_url as artist_image,
        a.title as album_title, a.cover_art as album_cover, tl.created_at as liked_at
      FROM track_likes tl
      JOIN music_tracks mt ON tl.track_id = mt.id
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      LEFT JOIN albums a ON mt.album_id = a.id
      WHERE tl.user_id = $1
      ORDER BY tl.created_at DESC
    `,
      [userId],
    );

    res.json({ tracks: liked.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch liked tracks" });
  }
});

// POST /api/streaming/comment — Add comment to a track
router.post("/comment", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const { trackId, content, parentId } = req.body;
    if (!trackId || !content)
      return res.status(400).json({ error: "trackId and content required" });

    const result = await pool.query(
      `
      INSERT INTO track_comments (track_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [trackId, userId, content, parentId || null],
    );

    // Join with user info
    const comment = await pool.query(
      `
      SELECT tc.*, u.username, u.display_name
      FROM track_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = $1
    `,
      [result.rows[0].id],
    );

    res.json({ comment: comment.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// DELETE /api/streaming/comment/:id
router.delete("/comment/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await pool.query(
      `DELETE FROM track_comments WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId],
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// POST /api/streaming/follow — Toggle follow on an artist
router.post("/follow", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { artistId } = req.body;

    if (!artistId) return res.status(400).json({ error: "artistId required" });
    if (!userId) return res.json({ following: true, requiresAuth: true });

    const existing = await pool.query(
      `
      SELECT id FROM artist_follows WHERE artist_id = $1 AND user_id = $2
    `,
      [artistId, userId],
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `DELETE FROM artist_follows WHERE artist_id = $1 AND user_id = $2`,
        [artistId, userId],
      );
      await pool.query(
        `UPDATE music_artists SET followers = GREATEST(COALESCE(followers, 0) - 1, 0) WHERE id = $1`,
        [artistId],
      );
      res.json({ following: false });
    } else {
      await pool.query(
        `INSERT INTO artist_follows (artist_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [artistId, userId],
      );
      await pool.query(
        `UPDATE music_artists SET followers = COALESCE(followers, 0) + 1 WHERE id = $1`,
        [artistId],
      );
      res.json({ following: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to toggle follow" });
  }
});

// GET /api/streaming/user/following — Check if user follows artists
router.get("/user/following", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.json({ following: [] });

    const result = await pool.query(
      `
      SELECT artist_id FROM artist_follows WHERE user_id = $1
    `,
      [userId],
    );

    res.json({ following: result.rows.map((r: any) => r.artist_id) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch following" });
  }
});

// GET /api/streaming/user/liked-tracks — Check which tracks user has liked
router.get("/user/liked-tracks", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.json({ likedTrackIds: [] });

    const result = await pool.query(
      `
      SELECT track_id FROM track_likes WHERE user_id = $1
    `,
      [userId],
    );

    res.json({ likedTrackIds: result.rows.map((r: any) => r.track_id) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch liked tracks" });
  }
});

// ═══════════════════════════════════════════════════════════
// LISTENING HISTORY
// ═══════════════════════════════════════════════════════════

router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.json({ history: [] });

    const history = await pool.query(
      `
      SELECT lh.*, mt.title, mt.cover_art, mt.duration as track_duration,
        ma.name as artist_name, ma.image_url as artist_image
      FROM listening_history lh
      JOIN music_tracks mt ON lh.track_id = mt.id
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      WHERE lh.user_id = $1
      ORDER BY lh.played_at DESC
      LIMIT 50
    `,
      [userId],
    );

    res.json({ history: history.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ═══════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/analytics/overview — Platform-wide analytics
router.get("/analytics/overview", async (_req: Request, res: Response) => {
  await ensureInit();
  try {
    // Total stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(streams), 0) FROM music_tracks) as total_streams,
        (SELECT COUNT(*) FROM music_artists) as total_artists,
        (SELECT COUNT(*) FROM music_tracks WHERE status = 'published') as total_tracks,
        (SELECT COUNT(*) FROM albums) as total_albums,
        (SELECT COUNT(*) FROM stream_plays WHERE created_at > NOW() - INTERVAL '24 hours') as streams_today,
        (SELECT COUNT(*) FROM stream_plays WHERE created_at > NOW() - INTERVAL '7 days') as streams_this_week,
        (SELECT COUNT(DISTINCT user_id) FROM stream_plays WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '30 days') as active_listeners
    `);

    // Top artists by streams
    const topArtists = await pool.query(`
      SELECT id, name, genre, image_url, country, country_code, total_streams, 
        monthly_listeners, followers, verified
      FROM music_artists
      ORDER BY total_streams DESC
      LIMIT 10
    `);

    // Top tracks
    const topTracks = await pool.query(`
      SELECT mt.id, mt.title, mt.streams, mt.duration, mt.cover_art, mt.genre,
        ma.name as artist_name, ma.image_url as artist_image
      FROM music_tracks mt
      LEFT JOIN music_artists ma ON mt.artist_id = ma.id
      ORDER BY mt.streams DESC
      LIMIT 10
    `);

    // Stream trend (last 30 days, daily)
    const streamTrend = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as plays
      FROM stream_plays
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Genre distribution
    const genreDistribution = await pool.query(`
      SELECT genre, SUM(streams) as total_streams, COUNT(*) as track_count
      FROM music_tracks
      WHERE genre IS NOT NULL
      GROUP BY genre
      ORDER BY total_streams DESC
    `);

    // Country distribution
    const countryDistribution = await pool.query(`
      SELECT country_code, country, COUNT(*) as artist_count,
        SUM(total_streams) as total_streams
      FROM music_artists
      WHERE country_code IS NOT NULL
      GROUP BY country_code, country
      ORDER BY total_streams DESC
    `);

    // Revenue simulation (based on $0.004 per stream)
    const totalStreams = parseInt(stats.rows[0].total_streams);
    const estimatedRevenue = totalStreams * 0.004;

    res.json({
      stats: stats.rows[0],
      topArtists: topArtists.rows,
      topTracks: topTracks.rows,
      streamTrend: streamTrend.rows,
      genreDistribution: genreDistribution.rows,
      countryDistribution: countryDistribution.rows,
      revenue: {
        estimated: estimatedRevenue.toFixed(2),
        perStream: "0.004",
        currency: "USD",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/streaming/analytics/artist/:id — Artist-specific analytics
// Revenue is now calculated based on contract grade tier
router.get("/analytics/artist/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const artist = await pool.query(
      `SELECT * FROM music_artists WHERE id = $1`,
      [id],
    );
    if (artist.rows.length === 0)
      return res.status(404).json({ error: "Artist not found" });

    // Check contract grade for this artist
    let contract = null;
    try {
      const contractResult = await pool.query(
        `SELECT grade, revenue_share_artist, revenue_share_platform, can_be_featured,
                has_analytics_access, audio_quality, max_downloads_per_month, status
         FROM artist_contracts WHERE artist_id = $1 AND status = 'approved' LIMIT 1`,
        [id],
      );
      if (contractResult.rows.length > 0) {
        contract = contractResult.rows[0];
      }
    } catch {
      /* artist_contracts table might not exist yet */
    }

    // Revenue per stream based on grade tier
    const gradeRates: Record<string, number> = {
      S: 0.0085,
      A: 0.0075,
      B: 0.0065,
      C: 0.0055,
    };
    const perStreamRate = contract
      ? gradeRates[contract.grade] || 0.004
      : 0.004;

    // Track performance
    const trackPerformance = await pool.query(
      `
      SELECT mt.id, mt.title, mt.streams, mt.likes, mt.duration, mt.cover_art,
        a.title as album_title
      FROM music_tracks mt
      LEFT JOIN albums a ON mt.album_id = a.id
      WHERE mt.artist_id = $1
      ORDER BY mt.streams DESC
    `,
      [id],
    );

    // Daily streams (last 30 days)
    const dailyStreams = await pool.query(
      `
      SELECT DATE(created_at) as date, COUNT(*) as plays
      FROM stream_plays
      WHERE artist_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
      [id],
    );

    // Revenue estimate using grade-based rate
    const totalStreams = artist.rows[0].total_streams || 0;
    const revenue = totalStreams * perStreamRate;
    const artistShare = contract ? contract.revenue_share_artist : 55;

    // Listener demographics (simulated)
    const demographics = {
      ageGroups: [
        { range: "13-17", percent: 8 },
        { range: "18-24", percent: 35 },
        { range: "25-34", percent: 32 },
        { range: "35-44", percent: 15 },
        { range: "45+", percent: 10 },
      ],
      topCountries: [
        { country: "France", percent: 28 },
        { country: artist.rows[0].country || "Unknown", percent: 22 },
        { country: "Belgium", percent: 12 },
        { country: "Canada", percent: 8 },
        { country: "USA", percent: 7 },
      ],
      gender: { male: 55, female: 42, other: 3 },
    };

    res.json({
      artist: artist.rows[0],
      trackPerformance: trackPerformance.rows,
      dailyStreams: dailyStreams.rows,
      revenue: {
        total: revenue.toFixed(2),
        perStream: perStreamRate.toFixed(4),
        artistShare,
        artistRevenue: ((revenue * artistShare) / 100).toFixed(2),
      },
      contract: contract
        ? {
            grade: contract.grade,
            revenueShareArtist: contract.revenue_share_artist,
            canBeFeatured: contract.can_be_featured,
            hasAnalyticsAccess: contract.has_analytics_access,
            audioQuality: contract.audio_quality,
            maxDownloads: contract.max_downloads_per_month,
          }
        : null,
      demographics,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch artist analytics" });
  }
});

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION TIERS
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/subscription/plans — Available plans
router.get("/subscription/plans", async (_req: Request, res: Response) => {
  res.json({
    plans: [
      {
        id: "free",
        name: "Gratuit",
        nameEn: "Free",
        price: 0,
        currency: "USD",
        features: [
          "Streaming illimité avec publicités",
          "Qualité audio standard (128kbps)",
          "Pas de téléchargement",
          "Pas de lecture hors-ligne",
        ],
        featuresEn: [
          "Unlimited streaming with ads",
          "Standard audio quality (128kbps)",
          "No downloads",
          "No offline playback",
        ],
        downloadsPerMonth: 0,
        audioQuality: "128kbps",
        ads: true,
        offline: false,
        color: "gray",
      },
      {
        id: "premium",
        name: "Premium",
        nameEn: "Premium",
        price: 4.99,
        currency: "USD",
        features: [
          "Streaming sans publicité",
          "Haute qualité audio (320kbps)",
          "5 téléchargements/mois",
          "Lecture hors-ligne",
          "Accès anticipé aux sorties",
        ],
        featuresEn: [
          "Ad-free streaming",
          "High quality audio (320kbps)",
          "5 downloads/month",
          "Offline playback",
          "Early access to releases",
        ],
        downloadsPerMonth: 5,
        audioQuality: "320kbps",
        ads: false,
        offline: true,
        color: "amber",
      },
      {
        id: "artist",
        name: "Artiste Pro",
        nameEn: "Artist Pro",
        price: 9.99,
        currency: "USD",
        features: [
          "Tout Premium inclus",
          "Téléchargements illimités",
          "Qualité FLAC (lossless)",
          "Analytics avancés",
          "Badges prioritaires",
          "Support prioritaire",
          "Upload de pistes",
        ],
        featuresEn: [
          "Everything in Premium",
          "Unlimited downloads",
          "FLAC quality (lossless)",
          "Advanced analytics",
          "Priority badges",
          "Priority support",
          "Track uploads",
        ],
        downloadsPerMonth: -1,
        audioQuality: "FLAC",
        ads: false,
        offline: true,
        color: "purple",
      },
    ],
    benefitChart: {
      title: "Platform Creator Benefits — Grade-Based System",
      titleFr: "Avantages Créateur — Système par Grade",
      description:
        "Revenue share is determined by your contract grade (S/A/B/C). Apply through the Artist Portal to get signed.",
      gradeTiers: [
        {
          grade: "S",
          label: "Élite",
          artistShare: "85%",
          perStream: "$0.0085",
          quality: "FLAC",
          featured: true,
        },
        {
          grade: "A",
          label: "Établi",
          artistShare: "75%",
          perStream: "$0.0075",
          quality: "320kbps",
          featured: true,
        },
        {
          grade: "B",
          label: "Émergent",
          artistShare: "65%",
          perStream: "$0.0065",
          quality: "256kbps",
          featured: true,
        },
        {
          grade: "C",
          label: "Entrée",
          artistShare: "55%",
          perStream: "$0.0055",
          quality: "128kbps",
          featured: false,
        },
      ],
      rows: [
        {
          source: "Free Tier Ad Revenue",
          creatorShare: "70%",
          artistShare: "30%",
          description:
            "Ads shown to free users generate revenue split between platform and artist pool",
        },
        {
          source: "Premium Subscriptions ($4.99/mo)",
          creatorShare: "40%",
          artistShare: "60%",
          description:
            "Monthly subscription fees split — majority goes to artist royalty pool",
        },
        {
          source: "Artist Pro Subscriptions ($9.99/mo)",
          creatorShare: "50%",
          artistShare: "50%",
          description:
            "Pro artist fees fund platform operations + artist tools development",
        },
        {
          source: "Paid Track Uploads ($0.99-$2.99/track)",
          creatorShare: "100% (hosting cost)",
          artistShare: "Keep all streaming revenue",
          description:
            "Upload fees cover hosting/CDN costs. Artists keep 100% of their stream earnings",
        },
        {
          source: "Tips & Boosts",
          creatorShare: "10%",
          artistShare: "90%",
          description: "Direct fan support flows almost entirely to artists",
        },
      ],
    },
  });
});

// GET /api/streaming/subscription/status — Current user's subscription
router.get("/subscription/status", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.json({ tier: "free", authenticated: false });

    const sub = await pool.query(
      `
      SELECT * FROM streaming_subscriptions WHERE user_id = $1
    `,
      [userId],
    );

    if (sub.rows.length === 0) {
      return res.json({ tier: "free", authenticated: true });
    }

    res.json({ ...sub.rows[0], authenticated: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/search — Global search across tracks, artists, albums, playlists
router.get("/search", async (req: Request, res: Response) => {
  await ensureInit();
  try {
    const { q } = req.query;
    if (!q)
      return res.json({ tracks: [], artists: [], albums: [], playlists: [] });

    const searchTerm = `%${q}%`;

    const [tracks, artists, albums, playlists] = await Promise.all([
      pool.query(
        `
        SELECT mt.id, mt.title, mt.duration, mt.streams, mt.cover_art, mt.genre,
          ma.name as artist_name, ma.image_url as artist_image
        FROM music_tracks mt
        LEFT JOIN music_artists ma ON mt.artist_id = ma.id
        WHERE mt.title ILIKE $1 OR ma.name ILIKE $1
        ORDER BY mt.streams DESC LIMIT 10
      `,
        [searchTerm],
      ),
      pool.query(
        `
        SELECT id, name, genre, image_url, country, monthly_listeners, verified
        FROM music_artists
        WHERE name ILIKE $1 OR genre ILIKE $1
        ORDER BY total_streams DESC LIMIT 5
      `,
        [searchTerm],
      ),
      pool.query(
        `
        SELECT a.id, a.title, a.cover_art, a.album_type, a.release_date,
          ma.name as artist_name
        FROM albums a
        LEFT JOIN music_artists ma ON a.artist_id = ma.id
        WHERE a.title ILIKE $1 OR ma.name ILIKE $1
        ORDER BY a.release_date DESC NULLS LAST LIMIT 5
      `,
        [searchTerm],
      ),
      pool.query(
        `
        SELECT id, name, description, cover_art, total_tracks
        FROM playlists
        WHERE is_public = true AND name ILIKE $1
        ORDER BY plays DESC LIMIT 5
      `,
        [searchTerm],
      ),
    ]);

    res.json({
      tracks: tracks.rows,
      artists: artists.rows,
      albums: albums.rows,
      playlists: playlists.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Search failed" });
  }
});

// ═══════════════════════════════════════════════════════════
// AUDIO GENERATION (placeholder tones for demo)
// ═══════════════════════════════════════════════════════════

// GET /api/streaming/audio/generate — Generate a simple audio tone for demo
router.get("/audio/generate", async (req: Request, res: Response) => {
  try {
    // Generate a WAV header + sine wave for demo purposes
    // In production, replace with real audio file serving
    const duration = 3; // seconds
    const sampleRate = 44100;
    const numSamples = sampleRate * duration;
    const frequency = 440 + Math.random() * 440; // 440-880Hz

    const buffer = Buffer.alloc(44 + numSamples * 2);

    // WAV header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, Math.min(t * 10, (duration - t) * 10));
      const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3 * envelope;
      buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
    }

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: "Audio generation failed" });
  }
});

export default router;

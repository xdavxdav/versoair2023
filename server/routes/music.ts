import { Router } from "express";
import { db, pool } from "../db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth";

const router = Router();
// Mounted at /api/music

// ── Audio uploads directory ──────────────────────────────────────────
const TRACKS_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "tracks")
    : path.resolve("uploads", "tracks");

try {
  if (!fs.existsSync(TRACKS_DIR)) {
    fs.mkdirSync(TRACKS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`⚠️  Could not create tracks dir (${TRACKS_DIR}):`, err.message);
}

// ── Multer config ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TRACKS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `track-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/aiff",
      "audio/x-aiff",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.match(/\.(mp3|wav|flac|aiff|ogg|m4a)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

// ── Ensure new columns exist (auto-migration) ───────────────────────
let columnsChecked = false;
async function ensureTrackColumns(): Promise<void> {
  if (columnsChecked) return;
  const cols = [
    // Core fields from Drizzle schema
    { name: "album_id", def: "INTEGER" },
    { name: "track_number", def: "INTEGER" },
    { name: "duration", def: "INTEGER" },
    { name: "streams", def: "INTEGER DEFAULT 0" },
    { name: "play_count", def: "INTEGER DEFAULT 0" },
    { name: "likes", def: "INTEGER DEFAULT 0" },
    { name: "release_date", def: "TIMESTAMP" },
    { name: "genre", def: "TEXT" },
    // Upload / monetization fields
    { name: "file_path", def: "TEXT" },
    { name: "file_name", def: "TEXT" },
    { name: "file_size", def: "INTEGER" },
    { name: "mime_type", def: "TEXT" },
    { name: "audio_url", def: "TEXT" },
    { name: "description", def: "TEXT" },
    { name: "price", def: "TEXT DEFAULT '0.99'" },
    { name: "downloads", def: "INTEGER DEFAULT 0" },
    { name: "revenue", def: "TEXT DEFAULT '0.00'" },
    { name: "status", def: "TEXT DEFAULT 'published'" },
    { name: "bpm", def: "INTEGER" },
    { name: "musical_key", def: "TEXT" },
    { name: "mood", def: "TEXT" },
    { name: "cover_art", def: "TEXT" },
    { name: "wiki_url", def: "TEXT" },
    { name: "is_explicit", def: "BOOLEAN DEFAULT false" },
    { name: "lyrics", def: "TEXT" },
  ];
  for (const col of cols) {
    try {
      await pool.query(
        `ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`,
      );
    } catch {
      // column may already exist
    }
  }
  columnsChecked = true;

  // Drop orphan FK constraints that reference the wrong table
  // (fk_music_track_artist may point to music_artists instead of artists)
  try {
    await pool.query(`ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS fk_music_track_artist`);
  } catch { /* constraint may not exist */ }
  try {
    await pool.query(`ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS music_tracks_artist_id_fkey`);
  } catch { /* constraint may not exist */ }
}

// Check if country_code column exists on artists table (cached)
let hasCountryCodeCol: boolean | null = null;
async function artistsHaveCountryCode(): Promise<boolean> {
  if (hasCountryCodeCol !== null) return hasCountryCodeCol;
  try {
    await pool.query("SELECT country_code FROM artists LIMIT 0");
    hasCountryCodeCol = true;
  } catch {
    hasCountryCodeCol = false;
  }
  return hasCountryCodeCol;
}

// GET /api/music/artists
router.get("/artists", async (req, res) => {
  try {
    const { countryCode } = req.query as Record<string, string>;
    console.log(
      `🎵 [MUSIC] Fetching artists${countryCode ? ` for country=${countryCode}` : ""}`,
    );

    const hasCC = await artistsHaveCountryCode();
    const ccSelect = hasCC ? ", country_code" : "";
    let query = `SELECT id, stage_name AS name, genre, label_status, spotify_url, business_id, user_id${ccSelect} FROM artists`;
    const params: any[] = [];

    if (hasCC && countryCode && countryCode !== "all") {
      query += ` WHERE country_code = $1`;
      params.push(countryCode.toUpperCase());
    }
    query += ` ORDER BY stage_name ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error("❌ Get music artists error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch music artists",
      details: error.message,
    });
  }
});

// GET /api/music/tracks
router.get("/tracks", async (_req, res) => {
  try {
    await ensureTrackColumns();
    const result = await pool.query(
      `SELECT id, title, artist_id, duration, streams, play_count, release_date, genre,
              file_path, file_name, file_size, mime_type, description, price,
              downloads, revenue, status, bpm, musical_key, mood, cover_art, created_at
       FROM music_tracks ORDER BY id DESC`,
    );
    // Mark which tracks have a real uploaded file
    const tracks = result.rows.map((t: any) => ({
      ...t,
      hasAudio: !!t.file_path,
      artistId: t.artist_id,
      playCount: t.play_count,
      releaseDate: t.release_date,
      fileName: t.file_name,
      fileSize: t.file_size,
      mimeType: t.mime_type,
      musicalKey: t.musical_key,
      coverArt: t.cover_art,
    }));
    res.json({ success: true, data: tracks, count: tracks.length });
  } catch (error: any) {
    console.error("❌ Get music tracks error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch music tracks",
      details: error.message,
    });
  }
});

// GET /api/music/analytics
router.get("/analytics", async (_req, res) => {
  try {
    const analytics = await db
      .select()
      .from(schema.musicAnalytics)
      .orderBy(schema.musicAnalytics.recordedAt)
      .limit(1);

    const analyticsData = analytics[0] || {
      id: 0,
      totalArtists: 0,
      totalTracks: 0,
      totalStreams: 0,
      recordedAt: new Date(),
    };
    res.json({ success: true, data: analyticsData });
  } catch (error: any) {
    console.error("❌ Get music analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch music analytics",
      details: error.message,
    });
  }
});

// GET /api/music/artists/:id
router.get("/artists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await db
      .select()
      .from(schema.musicArtists)
      .where(eq(schema.musicArtists.id, parseInt(id)))
      .limit(1);

    if (!artist.length) {
      return res
        .status(404)
        .json({ success: false, error: "Artist not found" });
    }

    const tracks = await db
      .select()
      .from(schema.musicTracks)
      .where(eq(schema.musicTracks.artistId, parseInt(id)))
      .orderBy(schema.musicTracks.id);

    res.json({ success: true, data: { ...artist[0], tracks } });
  } catch (error: any) {
    console.error("❌ Get artist error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch artist",
      details: error.message,
    });
  }
});

// POST /api/music/artists/generate-random
router.post("/artists/generate-random", async (req, res) => {
  try {
    const { count: artistCount = 10 } = req.body;
    console.log(`🎵 [MUSIC] Generating ${artistCount} random artists`);

    const genres = [
      "Pop",
      "Rock",
      "Hip Hop",
      "Electronic",
      "Jazz",
      "R&B",
      "Country",
      "Reggae",
      "Latin",
      "Classical",
    ];
    const firstNames = [
      "Alex",
      "Jordan",
      "Taylor",
      "Morgan",
      "Casey",
      "Riley",
      "Drew",
      "Sage",
    ];
    const lastNames = [
      "Storm",
      "Phoenix",
      "Rivers",
      "Knight",
      "Azure",
      "Blaze",
      "Nova",
    ];

    const artists = [];
    for (let i = 0; i < artistCount; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const genre = genres[Math.floor(Math.random() * genres.length)];

      const [artist] = await db
        .insert(schema.musicArtists)
        .values({ name: `${firstName} ${lastName}`, genre })
        .returning();
      artists.push(artist);
    }

    res.json({ success: true, data: artists, count: artists.length });
  } catch (error: any) {
    console.error("❌ Generate artists error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate artists",
      details: error.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════
// � MY ARTIST — GET /api/music/my-artist (requires auth)
// Returns the artists table row linked to the current user
// ═════════════════════════════════════════════════════════════════════
router.get("/my-artist", requireAuth(), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const result = await pool.query(
      `SELECT id, stage_name AS "stageName", genre, user_id FROM artists WHERE user_id = $1 LIMIT 1`,
      [parseInt(userId)],
    );
    if (!result.rows.length) {
      // Auto-create an artist entry for this user so they can upload immediately
      const userResult = await pool.query(
        `SELECT username, email FROM users WHERE id = $1`,
        [parseInt(userId)],
      );
      const username =
        userResult.rows[0]?.username ||
        userResult.rows[0]?.email?.split("@")[0] ||
        "Artist";
      const inserted = await pool.query(
        `INSERT INTO artists (stage_name, user_id, label_status) VALUES ($1, $2, 'signed') RETURNING id, stage_name AS "stageName", genre, user_id`,
        [username, parseInt(userId)],
      );
      console.log(
        `🎤 [MUSIC] Auto-created artist profile for user #${userId}: "${username}"`,
      );
      return res.json({ success: true, data: inserted.rows[0] });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error("❌ Get my artist error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch artist profile" });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 🎵 TRACK UPLOAD — POST /api/music/tracks/upload (requires auth)
// ═════════════════════════════════════════════════════════════════════
router.post(
  "/tracks/upload",
  requireAuth(),
  upload.single("audio"),
  async (req, res) => {
    try {
      await ensureTrackColumns();

      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, error: "No audio file provided" });
      }

      const {
        title,
        genre,
        description,
        price = "0.99",
        artistId: rawArtistId,
        bpm,
        musicalKey,
        mood,
        status = "published",
      } = req.body;

      // Resolve artistId: use provided value, or auto-resolve from authenticated user
      let artistId = rawArtistId;
      if (!artistId && req.user?.userId) {
        const artistRow = await pool.query(
          `SELECT id FROM artists WHERE user_id = $1 LIMIT 1`,
          [parseInt(req.user.userId)],
        );
        if (artistRow.rows.length) {
          artistId = artistRow.rows[0].id;
        } else {
          // Auto-create an artist profile so the FK constraint is satisfied
          const userRow = await pool.query(
            `SELECT username, email FROM users WHERE id = $1`,
            [parseInt(req.user.userId)],
          );
          const stageName =
            userRow.rows[0]?.username ||
            userRow.rows[0]?.email?.split("@")[0] ||
            "Artist";
          const newArtist = await pool.query(
            `INSERT INTO artists (stage_name, user_id, label_status) VALUES ($1, $2, 'signed') RETURNING id`,
            [stageName, parseInt(req.user.userId)],
          );
          artistId = newArtist.rows[0].id;
          console.log(
            `🎤 [MUSIC] Auto-created artist "${stageName}" for user #${req.user.userId} during upload`,
          );
        }
      }

      if (!title) {
        // Clean up the uploaded file
        fs.unlinkSync(file.path);
        return res
          .status(400)
          .json({ success: false, error: "Track title is required" });
      }

      const insertParams = [
        title,
        artistId ? parseInt(artistId) : null,
        genre || null,
        description || null,
        price,
        file.path,
        file.originalname,
        file.size,
        file.mimetype,
        bpm ? parseInt(bpm) : null,
        musicalKey || null,
        mood || null,
        status,
      ];
      const insertSQL = `INSERT INTO music_tracks
        (title, artist_id, genre, description, price, file_path, file_name, file_size, mime_type,
         bpm, musical_key, mood, status, streams, play_count, downloads, revenue, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,0,0,'0.00',NOW())
       RETURNING *`;

      let result;
      try {
        result = await pool.query(insertSQL, insertParams);
      } catch (insertErr: any) {
        // FK constraint mismatch: artist_id FK may reference music_artists instead of artists
        if (insertErr.message?.includes("fk_music_track_artist") || insertErr.message?.includes("foreign key")) {
          console.warn("⚠️ [MUSIC] FK constraint blocking insert — dropping orphan constraints and retrying");
          await pool.query(`ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS fk_music_track_artist`).catch(() => {});
          await pool.query(`ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS music_tracks_artist_id_fkey`).catch(() => {});
          await pool.query(`ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS music_tracks_artist_id_music_artists_id_fk`).catch(() => {});
          // Retry the insert
          result = await pool.query(insertSQL, insertParams);
        } else {
          throw insertErr;
        }
      }

      console.log(
        `🎵 [MUSIC] Track uploaded: "${title}" (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("❌ Track upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload track",
        details: error.message,
      });
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// ⬇️  TRACK DOWNLOAD — GET /api/music/tracks/:id/download
// ═════════════════════════════════════════════════════════════════════
router.get("/tracks/:id/download", async (req, res) => {
  try {
    await ensureTrackColumns();
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM music_tracks WHERE id = $1",
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    const track = result.rows[0];

    if (!track.file_path || !fs.existsSync(track.file_path)) {
      return res
        .status(404)
        .json({ success: false, error: "Audio file not found on server" });
    }

    // Increment download count and add revenue
    const trackPrice = parseFloat(track.price || "0.99");
    const currentRevenue = parseFloat(track.revenue || "0.00");
    const newRevenue = (currentRevenue + trackPrice).toFixed(2);

    await pool.query(
      "UPDATE music_tracks SET downloads = COALESCE(downloads, 0) + 1, revenue = $1 WHERE id = $2",
      [newRevenue, parseInt(id)],
    );

    // Set headers for file download
    const fileName = track.file_name || `track-${id}.mp3`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", track.mime_type || "audio/mpeg");

    const fileStream = fs.createReadStream(track.file_path);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("❌ Track download error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download track",
      details: error.message,
    });
  }
});

// ── Play-count debounce: track → last-increment timestamp ─────────────
const playCountDebounce = new Map<string, number>();
const PLAY_DEBOUNCE_MS = 30_000; // 30 seconds between increments per IP+track

// ═════════════════════════════════════════════════════════════════════
// 🔊 TRACK STREAM (play in browser) — GET /api/music/tracks/:id/stream
// ═════════════════════════════════════════════════════════════════════
router.get("/tracks/:id/stream", async (req, res) => {
  try {
    await ensureTrackColumns();
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM music_tracks WHERE id = $1",
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    const track = result.rows[0];
    if (!track.file_path || !fs.existsSync(track.file_path)) {
      return res
        .status(404)
        .json({ success: false, error: "Audio file not found" });
    }

    // Only increment play count on fresh plays (not seek/range re-requests)
    // Debounce: same IP + track only increments once per 30s
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const debounceKey = `${clientIp}:${id}`;
    const lastPlayed = playCountDebounce.get(debounceKey) || 0;
    const isRange = !!req.headers.range;
    if (!isRange && Date.now() - lastPlayed > PLAY_DEBOUNCE_MS) {
      playCountDebounce.set(debounceKey, Date.now());
      await pool.query(
        "UPDATE music_tracks SET play_count = COALESCE(play_count, 0) + 1, streams = COALESCE(streams, 0) + 1 WHERE id = $1",
        [parseInt(id)],
      );
    }

    const stat = fs.statSync(track.file_path);
    const range = req.headers.range;

    if (range) {
      // Support range requests for seeking
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": track.mime_type || "audio/mpeg",
      });
      fs.createReadStream(track.file_path, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": track.mime_type || "audio/mpeg",
      });
      fs.createReadStream(track.file_path).pipe(res);
    }
  } catch (error: any) {
    console.error("❌ Track stream error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to stream track",
      details: error.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 💰 TRACK MONETIZATION — GET/PUT /api/music/tracks/:id/monetization
// ═════════════════════════════════════════════════════════════════════
router.get("/tracks/:id/monetization", async (req, res) => {
  try {
    await ensureTrackColumns();
    const { id } = req.params;

    const result = await pool.query(
      "SELECT id, title, price, downloads, revenue, streams, play_count, status FROM music_tracks WHERE id = $1",
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch monetization data" });
  }
});

router.put("/tracks/:id/monetization", requireAuth(), async (req, res) => {
  try {
    await ensureTrackColumns();
    const { id } = req.params;
    const { price, revenue, downloads } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (price !== undefined) {
      updates.push(`price = $${idx++}`);
      values.push(String(price));
    }
    if (revenue !== undefined) {
      updates.push(`revenue = $${idx++}`);
      values.push(String(revenue));
    }
    if (downloads !== undefined) {
      updates.push(`downloads = $${idx++}`);
      values.push(parseInt(downloads));
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No fields to update" });
    }

    values.push(parseInt(id));
    const result = await pool.query(
      `UPDATE music_tracks SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    console.log(`💰 [MUSIC] Monetization updated for track #${id}:`, {
      price,
      revenue,
      downloads,
    });
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update monetization" });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 📊 EARNINGS SUMMARY — GET /api/music/earnings
// (aggregates all track revenue — shown in Vault / Card settings)
// ═════════════════════════════════════════════════════════════════════
router.get("/earnings", async (_req, res) => {
  try {
    await ensureTrackColumns();

    const result = await pool.query(`
      SELECT
        COUNT(*)::int                               AS total_tracks,
        COALESCE(SUM(downloads), 0)::int            AS total_downloads,
        COALESCE(SUM(streams), 0)::int              AS total_streams,
        COALESCE(SUM(revenue::numeric), 0)::text    AS total_revenue,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days'
          THEN revenue::numeric ELSE 0 END), 0)::text AS revenue_this_month,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '1 day'
          THEN revenue::numeric ELSE 0 END), 0)::text AS revenue_today
      FROM music_tracks
      WHERE file_path IS NOT NULL
    `);

    // Per-track breakdown
    const tracks = await pool.query(`
      SELECT id, title, genre, price, downloads, revenue, streams, play_count, status, created_at
      FROM music_tracks
      WHERE file_path IS NOT NULL
      ORDER BY revenue::numeric DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: {
        summary: result.rows[0],
        tracks: tracks.rows,
      },
    });
  } catch (error: any) {
    console.error("❌ Earnings fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch earnings" });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 🗑️  DELETE TRACK — DELETE /api/music/tracks/:id
// ═════════════════════════════════════════════════════════════════════
router.delete("/tracks/:id", requireAuth(), async (req, res) => {
  try {
    await ensureTrackColumns();
    const { id } = req.params;

    const result = await pool.query(
      "SELECT file_path FROM music_tracks WHERE id = $1",
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    // Remove audio file from disk
    const filePath = result.rows[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query("DELETE FROM music_tracks WHERE id = $1", [parseInt(id)]);
    console.log(`🗑️ [MUSIC] Track #${id} deleted`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to delete track" });
  }
});

export default router;

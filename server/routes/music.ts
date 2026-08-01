import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth";

const router = Router();
// Mounted at /api/music

// ── Multer config ────────────────────────────────────────────────────
// MEMORY storage: uploads are streamed into RAM then persisted straight into
// Neon (music_tracks.audio_data BYTEA). Nothing is written to the container
// filesystem, so Render's ephemeral/read-only disk can never break uploads and
// tracks survive every redeploy (and stay editable from GeoAdmin).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    // Cover art field — accept common images
    if (file.fieldname === "pochette" || file.fieldname === "cover") {
      const okImg =
        /^image\/(jpeg|jpg|png|webp|avif|gif)$/i.test(file.mimetype) ||
        /\.(jpe?g|png|webp|avif|gif)$/i.test(file.originalname);
      return okImg
        ? cb(null, true)
        : cb(new Error(`Unsupported cover image: ${file.mimetype}`));
    }
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
    { name: "audio_data", def: "BYTEA" },
    // Extended media info columns
    { name: "pochette", def: "TEXT" }, // cover art image as base64 data-URI
    { name: "bts_content", def: "TEXT" }, // Behind The Scenes notes/stories
    { name: "flop_notes", def: "TEXT" }, // FLOP: outtakes, failures, funny moments
    { name: "credits", def: "TEXT" }, // production credits, featured artists
    { name: "recording_location", def: "TEXT" }, // studio/city where recorded
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
    await pool.query(
      `ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS fk_music_track_artist`,
    );
  } catch {
    /* constraint may not exist */
  }
  try {
    await pool.query(
      `ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS music_tracks_artist_id_fkey`,
    );
  } catch {
    /* constraint may not exist */
  }
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
              downloads, revenue, status, bpm, musical_key, mood, cover_art, created_at,
              pochette, bts_content, flop_notes, credits, recording_location,
              (audio_data IS NOT NULL) AS has_audio_data
       FROM music_tracks ORDER BY id DESC`,
    );
    // Mark which tracks have a real uploaded file (disk OR persistent DB)
    const tracks = result.rows.map((t: any) => ({
      ...t,
      hasAudio: !!t.file_path || !!t.has_audio_data,
      artistId: t.artist_id,
      playCount: t.play_count,
      releaseDate: t.release_date,
      fileName: t.file_name,
      fileSize: t.file_size,
      mimeType: t.mime_type,
      musicalKey: t.musical_key,
      coverArt: t.cover_art,
      pochette: t.pochette,
      btsContent: t.bts_content,
      flopNotes: t.flop_notes,
      credits: t.credits,
      recordingLocation: t.recording_location,
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
      // No artist profile — do NOT auto-create
      return res
        .status(404)
        .json({ success: false, error: "No artist profile found" });
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
  (req, res, next) => {
    const handler = upload.fields([
      { name: "audio", maxCount: 1 },
      { name: "pochette", maxCount: 1 },
      { name: "cover", maxCount: 1 },
    ]);
    handler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ success: false, error: `Upload error: ${err.message}` });
      }
      if (err) {
        return res
          .status(400)
          .json({ success: false, error: err.message || "Upload rejected" });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      await ensureTrackColumns();

      const files = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const file = files?.audio?.[0];
      const coverImgFile = files?.pochette?.[0] || files?.cover?.[0];
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
          // No artist profile yet — auto-create a minimal one so uploads
          // from device are never blocked for authenticated users.
          const fallbackName =
            req.user.email?.split("@")[0] || `Artist${req.user.userId}`;
          const created = await pool.query(
            `INSERT INTO artists (user_id, stage_name, label_status)
             VALUES ($1, $2, 'unsigned') RETURNING id`,
            [parseInt(req.user.userId), fallbackName],
          );
          artistId = created.rows[0].id;
          console.log(
            `🎤 [MUSIC] Auto-created artist profile "${fallbackName}" (id ${artistId}) for user ${req.user.userId}`,
          );
        }
      }

      if (!title) {
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
        null, // file_path — audio lives in Neon (audio_data), not on disk
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
        if (
          insertErr.message?.includes("fk_music_track_artist") ||
          insertErr.message?.includes("foreign key")
        ) {
          console.warn(
            "⚠️ [MUSIC] FK constraint blocking insert — dropping orphan constraints and retrying",
          );
          await pool
            .query(
              `ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS fk_music_track_artist`,
            )
            .catch(() => {});
          await pool
            .query(
              `ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS music_tracks_artist_id_fkey`,
            )
            .catch(() => {});
          await pool
            .query(
              `ALTER TABLE music_tracks DROP CONSTRAINT IF EXISTS music_tracks_artist_id_music_artists_id_fk`,
            )
            .catch(() => {});
          // Retry the insert
          result = await pool.query(insertSQL, insertParams);
        } else {
          throw insertErr;
        }
      }

      // Persist cover art (pochette) as data-URI if provided
      if (coverImgFile) {
        try {
          const dataUri = `data:${coverImgFile.mimetype};base64,${coverImgFile.buffer.toString("base64")}`;
          await pool.query(
            "UPDATE music_tracks SET pochette = $1, cover_art = COALESCE(cover_art, $1) WHERE id = $2",
            [dataUri, result.rows[0].id],
          );
        } catch (e: any) {
          console.warn(`⚠️ [MUSIC] Cover persist failed: ${e.message}`);
        }
      }

      // Persist audio binary into Neon — this IS the storage, not the disk.
      // If it fails the track is unplayable, so roll back the row and report it.
      try {
        await pool.query(
          "UPDATE music_tracks SET audio_data = $1 WHERE id = $2",
          [file.buffer, result.rows[0].id],
        );
        console.log(
          `🎵 [MUSIC] Track persisted to Neon: "${title}" (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        );
      } catch (persistErr: any) {
        console.error(
          `❌ [MUSIC] Audio persist to Neon failed: ${persistErr.message}`,
        );
        await pool
          .query("DELETE FROM music_tracks WHERE id = $1", [result.rows[0].id])
          .catch(() => {});
        return res.status(500).json({
          success: false,
          error: "Could not save audio to the database. Please try again.",
          details: persistErr.message,
        });
      }
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

    // ── Authentication required ──
    const userId = (req as any).user?.id || (req as any).user?.userId || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Connexion requise pour télécharger",
        requiresAuth: true,
      });
    }

    const result = await pool.query(
      "SELECT * FROM music_tracks WHERE id = $1",
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    const track = result.rows[0];
    const fileOnDisk = track.file_path && fs.existsSync(track.file_path);

    // Check if audio exists either on disk or in DB
    if (!fileOnDisk) {
      const audioCheck = await pool.query(
        "SELECT (audio_data IS NOT NULL) AS has_data FROM music_tracks WHERE id = $1",
        [parseInt(id)],
      );
      if (!audioCheck.rows[0]?.has_data) {
        return res
          .status(404)
          .json({ success: false, error: "Audio file not found on server" });
      }
    }

    // ── Payment gate: artist can download own tracks for free, listeners must pay ──
    const isOwner =
      track.artist_id && String(track.artist_id) === String(userId);
    // Also check via music_artists → user_id link
    let isArtistOwner = isOwner;
    if (!isArtistOwner && track.artist_id) {
      try {
        const artistCheck = await pool.query(
          "SELECT user_id FROM music_artists WHERE id = $1",
          [track.artist_id],
        );
        if (
          artistCheck.rows[0]?.user_id &&
          String(artistCheck.rows[0].user_id) === String(userId)
        ) {
          isArtistOwner = true;
        }
      } catch (_) {
        /* skip */
      }
    }

    if (!isArtistOwner) {
      // Check if user has purchased this track
      try {
        const purchaseCheck = await pool.query(
          "SELECT id FROM track_purchases WHERE user_id = $1 AND track_id = $2 AND status = 'completed'",
          [userId, parseInt(id)],
        );
        if (!purchaseCheck.rows.length) {
          const trackPrice = parseFloat(track.price || "0.99");
          return res.status(402).json({
            success: false,
            error: "Achat requis pour télécharger",
            requiresPayment: true,
            price: trackPrice,
            trackId: parseInt(id),
            trackTitle: track.title,
          });
        }
      } catch (_) {
        // track_purchases table may not exist yet — block download
        const trackPrice = parseFloat(track.price || "0.99");
        return res.status(402).json({
          success: false,
          error: "Achat requis pour télécharger",
          requiresPayment: true,
          price: trackPrice,
          trackId: parseInt(id),
          trackTitle: track.title,
        });
      }
    }

    // Increment download count only for real listeners (not artist downloading own track)
    if (!isArtistOwner) {
      await pool.query(
        "UPDATE music_tracks SET downloads = COALESCE(downloads, 0) + 1 WHERE id = $1",
        [parseInt(id)],
      );
    }

    // Set headers for file download
    const fileName = track.file_name || `track-${id}.mp3`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", track.mime_type || "audio/mpeg");

    if (fileOnDisk) {
      fs.createReadStream(track.file_path).pipe(res);
    } else {
      // Serve from DB audio_data
      const audioResult = await pool.query(
        "SELECT audio_data FROM music_tracks WHERE id = $1",
        [parseInt(id)],
      );
      if (audioResult.rows[0]?.audio_data) {
        res.end(audioResult.rows[0].audio_data);
      } else {
        res.status(404).json({ success: false, error: "Audio file not found" });
      }
    }
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
// 💳 TRACK PURCHASE — POST /api/music/tracks/:id/purchase
// Debits buyer wallet, credits artist wallet (70/30 split)
// ═════════════════════════════════════════════════════════════════════
router.post(
  "/tracks/:id/purchase",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const trackId = parseInt(req.params.id);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      // Get track info
      const trackResult = await pool.query(
        "SELECT id, title, price, artist_id FROM music_tracks WHERE id = $1",
        [trackId],
      );
      if (!trackResult.rows.length) {
        return res.status(404).json({ error: "Track not found" });
      }
      const track = trackResult.rows[0];
      const price = parseFloat(track.price || "1.29");

      // Already purchased?
      try {
        const existing = await pool.query(
          "SELECT id FROM track_purchases WHERE user_id = $1 AND track_id = $2 AND status = 'completed'",
          [userId, trackId],
        );
        if (existing.rows.length > 0) {
          return res.json({
            success: true,
            alreadyOwned: true,
            message: "Track already purchased",
          });
        }
      } catch {
        /* table may not exist yet */
      }

      // Get or create buyer wallet
      let buyerWallet = await pool.query(
        "SELECT * FROM platform_wallets WHERE user_id = $1",
        [userId],
      );
      if (buyerWallet.rows.length === 0) {
        buyerWallet = await pool.query(
          "INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked) VALUES ($1, '0.00', 'USD', true) RETURNING *",
          [userId],
        );
      }
      const bw = buyerWallet.rows[0];
      const buyerBalance = parseFloat(bw.balance || "0");

      if (buyerBalance < price) {
        return res.status(402).json({
          error: "Insufficient credits",
          required: price,
          current: buyerBalance,
          requiresDeposit: true,
        });
      }

      // 70% artist / 30% platform
      const artistShare = price * 0.7;
      const platformShare = price * 0.3;

      await pool.query("BEGIN");

      // Debit buyer
      const buyerAfter = buyerBalance - price;
      await pool.query(
        "UPDATE platform_wallets SET balance = $1, total_spent = CAST(total_spent AS NUMERIC) + $2, updated_at = NOW() WHERE user_id = $3",
        [buyerAfter.toFixed(2), price.toFixed(2), userId],
      );

      // Credit artist (if track has an artist)
      if (track.artist_id) {
        let artistWallet = await pool.query(
          "SELECT * FROM platform_wallets WHERE user_id = $1",
          [track.artist_id],
        );
        if (artistWallet.rows.length === 0) {
          artistWallet = await pool.query(
            "INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked) VALUES ($1, '0.00', 'USD', true) RETURNING *",
            [track.artist_id],
          );
        }
        const aw = artistWallet.rows[0];
        const artistBalance = parseFloat(aw.balance || "0");
        await pool.query(
          "UPDATE platform_wallets SET balance = $1, total_earned = CAST(total_earned AS NUMERIC) + $2, updated_at = NOW() WHERE user_id = $3",
          [
            (artistBalance + artistShare).toFixed(2),
            artistShare.toFixed(2),
            track.artist_id,
          ],
        );

        // Log artist transaction
        await pool.query(
          `INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description, related_entity_type, related_entity_id, status)
         VALUES ($1, $2, 'sale', $3, $4, $5, $6, 'track', $7, 'completed')`,
          [
            track.artist_id,
            aw.id,
            artistShare.toFixed(2),
            artistBalance.toFixed(2),
            (artistBalance + artistShare).toFixed(2),
            `Track sale: ${track.title}`,
            String(trackId),
          ],
        );
      }

      // Log buyer transaction
      await pool.query(
        `INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description, related_entity_type, related_entity_id, status)
       VALUES ($1, $2, 'purchase', $3, $4, $5, $6, 'track', $7, 'completed')`,
        [
          userId,
          bw.id,
          (-price).toFixed(2),
          buyerBalance.toFixed(2),
          buyerAfter.toFixed(2),
          `Track purchase: ${track.title}`,
          String(trackId),
        ],
      );

      // Insert track_purchases record
      try {
        await pool.query(
          `INSERT INTO track_purchases (user_id, track_id, price, artist_share, platform_share, status, purchased_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
          [
            userId,
            trackId,
            price.toFixed(2),
            artistShare.toFixed(2),
            platformShare.toFixed(2),
          ],
        );
      } catch {
        // track_purchases table might have different columns — just log
        console.warn("[MUSIC] track_purchases insert failed, continuing");
      }

      // Update track revenue
      await pool.query(
        "UPDATE music_tracks SET revenue = COALESCE(CAST(revenue AS NUMERIC), 0) + $1 WHERE id = $2",
        [price, trackId],
      );

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: "Track purchased successfully",
        price,
        artistShare,
        platformShare,
        newBalance: buyerAfter,
      });
    } catch (err: any) {
      await pool.query("ROLLBACK").catch(() => {});
      console.error("❌ Track purchase error:", err);
      res.status(500).json({ error: "Purchase failed" });
    }
  },
);

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
    const fileOnDisk = track.file_path && fs.existsSync(track.file_path);

    // ── Self-stream guard: artist playing own track does NOT count ──
    // Extract user identity optionally (no auth required to stream, but we check if present)
    let isSelfStream = false;
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : req.cookies?.auth_token || null;
      if (token && track.artist_id) {
        const jwt = require("jsonwebtoken");
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded?.userId || decoded?.id;
        if (userId) {
          // Direct match: user_id === artist_id
          if (String(userId) === String(track.artist_id)) {
            isSelfStream = true;
          } else {
            // Check via artists table: artist row linked to this user
            const ownerCheck = await pool.query(
              "SELECT id FROM artists WHERE id = $1 AND user_id = $2",
              [track.artist_id, parseInt(userId)],
            );
            if (ownerCheck.rows.length > 0) isSelfStream = true;
          }
        }
      }
    } catch {
      /* token missing/invalid — treat as non-owner listener */
    }

    // Only increment play count for real listeners (not artist previewing own track)
    // Debounce: same IP + track only increments once per 30s
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const debounceKey = `${clientIp}:${id}`;
    const lastPlayed = playCountDebounce.get(debounceKey) || 0;
    const isRange = !!req.headers.range;
    if (
      !isSelfStream &&
      !isRange &&
      Date.now() - lastPlayed > PLAY_DEBOUNCE_MS
    ) {
      playCountDebounce.set(debounceKey, Date.now());
      await pool.query(
        "UPDATE music_tracks SET play_count = COALESCE(play_count, 0) + 1, streams = COALESCE(streams, 0) + 1 WHERE id = $1",
        [parseInt(id)],
      );
    }

    if (fileOnDisk) {
      // ── Serve from filesystem (fast, for fresh uploads on this dyno) ──
      const stat = fs.statSync(track.file_path);
      const range = req.headers.range;

      if (range) {
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
    } else {
      // ── Fallback: serve from database BYTEA (persists across Render redeploys) ──
      const audioResult = await pool.query(
        "SELECT audio_data, mime_type FROM music_tracks WHERE id = $1 AND audio_data IS NOT NULL",
        [parseInt(id)],
      );
      if (!audioResult.rows.length || !audioResult.rows[0].audio_data) {
        return res
          .status(404)
          .json({ success: false, error: "Audio file not found" });
      }

      const buffer: Buffer = audioResult.rows[0].audio_data;
      const mimeType = audioResult.rows[0].mime_type || "audio/mpeg";
      const range = req.headers.range;

      // Also re-cache to disk so subsequent seeks are fast
      try {
        if (track.file_path) {
          const dir = path.dirname(track.file_path);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(track.file_path, buffer);
        }
      } catch {
        /* best-effort disk cache */
      }

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": mimeType,
        });
        res.end(buffer.slice(start, end + 1));
      } else {
        res.writeHead(200, {
          "Content-Length": buffer.length,
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes",
        });
        res.end(buffer);
      }
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
      WHERE file_path IS NOT NULL OR audio_data IS NOT NULL
    `);

    // Per-track breakdown
    const tracks = await pool.query(`
      SELECT id, title, genre, price, downloads, revenue, streams, play_count, status, created_at
      FROM music_tracks
      WHERE file_path IS NOT NULL OR audio_data IS NOT NULL
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
// � RE-UPLOAD AUDIO — PUT /api/music/tracks/:id/reupload
// Backfills audio_data for tracks that lost their /tmp file on redeploy
// ═════════════════════════════════════════════════════════════════════
router.put(
  "/tracks/:id/reupload",
  requireAuth(),
  upload.single("audio"),
  async (req, res) => {
    try {
      await ensureTrackColumns();
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, error: "No audio file provided" });
      }

      // Check track exists
      const existing = await pool.query(
        "SELECT id, title FROM music_tracks WHERE id = $1",
        [parseInt(id)],
      );
      if (!existing.rows.length) {
        return res
          .status(404)
          .json({ success: false, error: "Track not found" });
      }

      // Persist the in-memory buffer straight into Neon + update file metadata
      await pool.query(
        `UPDATE music_tracks
         SET audio_data = $1, file_path = NULL, file_name = $2, file_size = $3, mime_type = $4
         WHERE id = $5`,
        [
          file.buffer,
          file.originalname,
          file.size,
          file.mimetype,
          parseInt(id),
        ],
      );

      console.log(
        `🔄 [MUSIC] Track #${id} "${existing.rows[0].title}" re-uploaded + persisted (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      );
      res.json({ success: true, message: "Audio re-uploaded and persisted" });
    } catch (error: any) {
      console.error("❌ Track re-upload error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to re-upload track" });
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// EDIT TRACK METADATA — PUT /api/music/tracks/:id/edit
// Update title, genre, description, BTS, FLOP, credits, pochette, etc.
// ═════════════════════════════════════════════════════════════════════
router.put("/tracks/:id/edit", requireAuth(), async (req, res) => {
  try {
    await ensureTrackColumns();
    const { id } = req.params;
    const trackId = parseInt(id);

    const existing = await pool.query(
      "SELECT id, title, artist_id FROM music_tracks WHERE id = $1",
      [trackId],
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    const track = existing.rows[0];
    if (track.artist_id && req.user?.userId) {
      const ownerCheck = await pool.query(
        "SELECT id FROM artists WHERE id = $1 AND user_id = $2",
        [track.artist_id, parseInt(req.user.userId)],
      );
      if (!ownerCheck.rows.length) {
        return res
          .status(403)
          .json({ success: false, error: "Not your track" });
      }
    }

    const allowedFields: Record<string, string> = {
      title: "title",
      genre: "genre",
      description: "description",
      mood: "mood",
      bpm: "bpm",
      musicalKey: "musical_key",
      price: "price",
      status: "status",
      lyrics: "lyrics",
      isExplicit: "is_explicit",
      wikiUrl: "wiki_url",
      coverArt: "cover_art",
      pochette: "pochette",
      btsContent: "bts_content",
      flopNotes: "flop_notes",
      credits: "credits",
      recordingLocation: "recording_location",
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [bodyKey, dbCol] of Object.entries(allowedFields)) {
      if (req.body[bodyKey] !== undefined) {
        let val = req.body[bodyKey];
        if (dbCol === "bpm" && val !== null) val = val ? parseInt(val) : null;
        if (dbCol === "is_explicit") val = val === true || val === "true";
        setClauses.push(`${dbCol} = $${paramIdx}`);
        values.push(val);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No fields to update" });
    }

    values.push(trackId);
    const sql = `UPDATE music_tracks SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
    const result = await pool.query(sql, values);

    console.log(
      "[MUSIC] Track #" + id + " edited (" + setClauses.length + " fields)",
    );
    res.json({ success: true, track: result.rows[0] });
  } catch (error: any) {
    console.error("Track edit error:", error);
    res.status(500).json({ success: false, error: "Failed to edit track" });
  }
});

// ═════════════════════════════════════════════════════════════════════
// DELETE TRACK — DELETE /api/music/tracks/:id
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

// ═══════════════════════════════════════════════════════════════════
// ALBUM CRUD
// ═══════════════════════════════════════════════════════════════════

// Ensure albums table exists
async function ensureAlbumsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS albums (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      artist_id INTEGER,
      cover_art TEXT,
      release_date TIMESTAMP,
      genre TEXT,
      description TEXT,
      album_type VARCHAR(20) DEFAULT 'album',
      total_tracks INTEGER DEFAULT 0,
      total_duration INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// GET /api/music/albums — list albums (optionally by artist)
router.get("/albums", async (req, res) => {
  try {
    await ensureAlbumsTable();
    const { artist_id } = req.query;
    let query = `SELECT a.*, 
      (SELECT COUNT(*) FROM music_tracks WHERE album_id = a.id) as track_count
      FROM albums a`;
    const params: any[] = [];
    if (artist_id) {
      query += ` WHERE a.artist_id = $1`;
      params.push(parseInt(artist_id as string));
    }
    query += ` ORDER BY a.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("❌ List albums error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/music/albums — create album
router.post("/albums", requireAuth(), async (req, res) => {
  try {
    await ensureAlbumsTable();
    const { title, genre, description, albumType, trackIds } = req.body;
    if (!title)
      return res.status(400).json({ success: false, error: "Title required" });

    // Resolve artist_id from the logged-in user
    const userId = (req as any).user?.id;
    let artistId: number | null = null;
    if (userId) {
      const artist = await pool.query(
        `SELECT id FROM artists WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (artist.rows.length) artistId = artist.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO albums (title, artist_id, genre, description, album_type, total_tracks)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        title,
        artistId,
        genre || null,
        description || null,
        albumType || "album",
        (trackIds || []).length,
      ],
    );

    const album = result.rows[0];

    // Assign tracks to this album
    if (trackIds && trackIds.length > 0) {
      for (const trackId of trackIds) {
        await pool.query(
          `UPDATE music_tracks SET album_id = $1 WHERE id = $2`,
          [album.id, trackId],
        );
      }
    }

    console.log(`📀 [MUSIC] Album "${title}" created (id=${album.id})`);
    res.json({ success: true, data: album });
  } catch (error: any) {
    console.error("❌ Create album error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/music/albums/:id
router.delete("/albums/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    // Unlink tracks first
    await pool.query(
      `UPDATE music_tracks SET album_id = NULL WHERE album_id = $1`,
      [parseInt(id)],
    );
    await pool.query(`DELETE FROM albums WHERE id = $1`, [parseInt(id)]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// COLLABORATION CRUD
// ═══════════════════════════════════════════════════════════════════

async function ensureCollabTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS artist_collaborations (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' NOT NULL,
      track_title TEXT,
      revenue_share INTEGER DEFAULT 50,
      message TEXT,
      genre TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// GET /api/music/collaborations — list my collabs
router.get("/collaborations", requireAuth(), async (req, res) => {
  try {
    await ensureCollabTable();
    const userId = (req as any).user?.id;
    // Get artist id for this user
    const artistRes = await pool.query(
      `SELECT id FROM artists WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (!artistRes.rows.length) {
      return res.json({ success: true, data: [] });
    }
    const artistId = artistRes.rows[0].id;

    const result = await pool.query(
      `SELECT c.*,
        req.stage_name as requester_name, req.genre as requester_genre,
        tgt.stage_name as target_name, tgt.genre as target_genre
       FROM artist_collaborations c
       LEFT JOIN artists req ON req.id = c.requester_id
       LEFT JOIN artists tgt ON tgt.id = c.target_id
       WHERE c.requester_id = $1 OR c.target_id = $1
       ORDER BY c.updated_at DESC`,
      [artistId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("❌ List collabs error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/music/collaborations — send collab request
router.post("/collaborations", requireAuth(), async (req, res) => {
  try {
    await ensureCollabTable();
    const userId = (req as any).user?.id;
    const { targetId, trackTitle, revenueShare, message, genre } = req.body;

    if (!targetId)
      return res
        .status(400)
        .json({ success: false, error: "targetId required" });

    const artistRes = await pool.query(
      `SELECT id FROM artists WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (!artistRes.rows.length) {
      return res
        .status(400)
        .json({ success: false, error: "You must be an artist" });
    }
    const requesterId = artistRes.rows[0].id;

    // Check for existing pending request
    const existing = await pool.query(
      `SELECT id FROM artist_collaborations 
       WHERE requester_id = $1 AND target_id = $2 AND status = 'pending'`,
      [requesterId, targetId],
    );
    if (existing.rows.length) {
      return res
        .status(409)
        .json({ success: false, error: "Request already pending" });
    }

    const result = await pool.query(
      `INSERT INTO artist_collaborations (requester_id, target_id, track_title, revenue_share, message, genre)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        requesterId,
        targetId,
        trackTitle || null,
        revenueShare || 50,
        message || null,
        genre || null,
      ],
    );

    console.log(
      `🤝 [COLLAB] Request sent from artist #${requesterId} → #${targetId}`,
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error("❌ Create collab error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/music/collaborations/:id/status — accept/decline/complete
router.put("/collaborations/:id/status", requireAuth(), async (req, res) => {
  try {
    await ensureCollabTable();
    const { id } = req.params;
    const { status } = req.body; // "active" | "declined" | "completed"
    if (!["active", "declined", "completed"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    const result = await pool.query(
      `UPDATE artist_collaborations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, parseInt(id)],
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/music/artists/search?q=...&genre=... — search artists by name/genre
router.get("/artists/search", async (req, res) => {
  try {
    const { q, genre } = req.query;
    let query = `SELECT id, stage_name as name, genre, country_code as country 
                 FROM artists WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;
    if (q) {
      query += ` AND (stage_name ILIKE $${idx} OR genre ILIKE $${idx})`;
      params.push(`%${q}%`);
      idx++;
    }
    if (genre && genre !== "all") {
      query += ` AND genre ILIKE $${idx}`;
      params.push(`%${genre}%`);
      idx++;
    }
    query += ` ORDER BY stage_name ASC LIMIT 50`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// POST /api/music/purchase — Simplified purchase (trackId in body)
// ═════════════════════════════════════════════════════════════════════
router.post("/purchase", requireAuth, async (req: any, res: any) => {
  try {
    const userId = (req as any).user?.id;
    const { trackId } = req.body;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    if (!trackId) return res.status(400).json({ error: "trackId required" });

    // Forward to the existing /tracks/:id/purchase handler logic
    const trackResult = await pool.query(
      "SELECT id, title, price, artist_id FROM music_tracks WHERE id = $1",
      [trackId],
    );
    if (!trackResult.rows.length) {
      return res.status(404).json({ error: "Track not found" });
    }
    const track = trackResult.rows[0];
    const price = parseFloat(track.price || "1.29");

    // Already purchased?
    try {
      const existing = await pool.query(
        "SELECT id FROM track_purchases WHERE user_id = $1 AND track_id = $2 AND status = 'completed'",
        [userId, trackId],
      );
      if (existing.rows.length > 0) {
        return res.json({
          success: true,
          alreadyOwned: true,
          message: "Track already purchased",
        });
      }
    } catch {
      /* table may not exist */
    }

    // Get buyer wallet
    let buyerWallet = await pool.query(
      "SELECT * FROM platform_wallets WHERE user_id = $1",
      [userId],
    );
    if (buyerWallet.rows.length === 0) {
      buyerWallet = await pool.query(
        "INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked) VALUES ($1, '0.00', 'USD', true) RETURNING *",
        [userId],
      );
    }
    const buyerBalance = parseFloat(buyerWallet.rows[0].balance || "0");

    if (buyerBalance < price) {
      return res.status(402).json({
        error: "Insufficient credits",
        required: price,
        current: buyerBalance,
      });
    }

    // Debit buyer
    const artistShare = price * 0.7;
    const platformShare = price * 0.3;
    const newBuyerBalance = buyerBalance - price;
    await pool.query(
      "UPDATE platform_wallets SET balance = $1 WHERE user_id = $2",
      [newBuyerBalance.toFixed(2), userId],
    );

    // Credit artist
    if (track.artist_id) {
      const artistUser = await pool.query(
        "SELECT user_id FROM artist_profiles WHERE id = $1",
        [track.artist_id],
      );
      if (artistUser.rows.length) {
        const artistUserId = artistUser.rows[0].user_id;
        await pool.query(
          `INSERT INTO platform_wallets (user_id, balance, currency) VALUES ($1, $2, 'USD')
           ON CONFLICT (user_id) DO UPDATE SET balance = platform_wallets.balance::numeric + $2`,
          [artistUserId, artistShare.toFixed(2)],
        );
      }
    }

    // Record purchase
    try {
      await pool.query(
        `INSERT INTO track_purchases (user_id, track_id, price, artist_share, platform_share, status, purchased_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
        [
          userId,
          trackId,
          price.toFixed(2),
          artistShare.toFixed(2),
          platformShare.toFixed(2),
        ],
      );
    } catch {
      /* table may not exist */
    }

    res.json({
      success: true,
      trackId,
      price,
      newBalance: newBuyerBalance,
      artistShare,
      platformShare,
    });
  } catch (err: any) {
    console.error("[MUSIC] Purchase error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/music/my-purchases — User's purchased tracks
// ═════════════════════════════════════════════════════════════════════
router.get("/my-purchases", requireAuth, async (req: any, res: any) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const result = await pool.query(
      `SELECT tp.*, mt.title, mt.cover_art, mt.duration, mt.audio_url, ma.name as artist_name
       FROM track_purchases tp
       LEFT JOIN music_tracks mt ON tp.track_id = mt.id
       LEFT JOIN music_artists ma ON mt.artist_id = ma.id
       WHERE tp.user_id = $1 AND tp.status = 'completed'
       ORDER BY tp.purchased_at DESC`,
      [userId],
    );

    res.json({ success: true, purchases: result.rows });
  } catch (err: any) {
    // Table might not exist
    res.json({ success: true, purchases: [] });
  }
});

export default router;

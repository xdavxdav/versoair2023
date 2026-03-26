/**
 * Track Upload Endpoint
 *
 * POST /api/upload/track
 *   - Multer middleware (local storage, configurable for S3/R2)
 *   - Audio validation (format, size)
 *   - Insert into music_tracks with status: 'processing'
 *   - Artist subscription upload limits enforced
 *
 * GET /api/upload/my-tracks
 *   - List all tracks uploaded by authenticated artist
 *
 * DELETE /api/upload/track/:id
 *   - Remove an uploaded track (owner only)
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { pool } from "../db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD DIRECTORY — Local storage (swap to S3/R2 SDK when ready)
// Production (Render): /tmp is the only writable directory
// ═══════════════════════════════════════════════════════════════════════════════
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "tracks")
    : path.resolve("uploads", "tracks");
const COVER_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "covers")
    : path.resolve("uploads", "covers");

// Ensure dirs exist
try {
  [UPLOAD_DIR, COVER_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
} catch (err: any) {
  console.warn(`⚠️  Could not create upload dirs: ${err.message}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTER CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const ALLOWED_AUDIO = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
]);
const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname) || ".mp3";
    cb(null, `${Date.now()}_${unique}${ext}`);
  },
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: MAX_AUDIO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid audio format: ${file.mimetype}. Accepted: MP3, WAV, FLAC, AAC, OGG`,
        ),
      );
    }
  },
});

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COVER_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `cover_${Date.now()}_${unique}${ext}`);
  },
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: MAX_COVER_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid image format: ${file.mimetype}. Accepted: JPEG, PNG, WebP`,
        ),
      );
    }
  },
});

// Combined upload: audio file + optional cover art
const uploadFields = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      if (ALLOWED_AUDIO.has(file.mimetype)) cb(null, UPLOAD_DIR);
      else if (ALLOWED_IMAGE.has(file.mimetype)) cb(null, COVER_DIR);
      else cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const unique = crypto.randomBytes(8).toString("hex");
      const ext = path.extname(file.originalname) || "";
      const prefix = ALLOWED_IMAGE.has(file.mimetype) ? "cover" : "track";
      cb(null, `${prefix}_${Date.now()}_${unique}${ext}`);
    },
  }),
  limits: { fileSize: MAX_AUDIO_SIZE },
}).fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD LIMIT TIERS
// ═══════════════════════════════════════════════════════════════════════════════
const TIER_LIMITS: Record<
  string,
  { maxUploads: number; maxQuality: string; label: string }
> = {
  spark: { maxUploads: 3, maxQuality: "128", label: "Spark (Free)" },
  flame: { maxUploads: 24, maxQuality: "320", label: "Flame ($29/yr)" },
  blaze: { maxUploads: -1, maxQuality: "flac", label: "Blaze ($79/yr)" },
  inferno: { maxUploads: -1, maxQuality: "flac", label: "Inferno ($149/yr)" },
};

async function getArtistSubscriptionTier(userId: number): Promise<{
  tier: string;
  uploadsUsed: number;
  maxUploads: number;
}> {
  try {
    const result = await pool.query(
      `SELECT as2.tier, as2.upload_count_this_period
       FROM artist_subscriptions as2
       JOIN artist_profiles ap ON ap.id = as2.artist_profile_id
       WHERE ap.user_id = $1 AND as2.status = 'active'
       LIMIT 1`,
      [userId],
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const tier = row.tier || "spark";
      return {
        tier,
        uploadsUsed: row.upload_count_this_period || 0,
        maxUploads: TIER_LIMITS[tier]?.maxUploads ?? 3,
      };
    }
  } catch (e) {
    // Fall through to default
  }
  return { tier: "spark", uploadsUsed: 0, maxUploads: 3 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/upload/track — Upload a new track
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/track",
  requireAuth(),
  (req: Request, res: Response, next: Function) => {
    uploadFields(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ success: false, error: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userId = req.user ? parseInt(req.user.userId) : null;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Authentication required" });
      }

      // Check subscription limits
      const sub = await getArtistSubscriptionTier(userId);
      if (sub.maxUploads !== -1 && sub.uploadsUsed >= sub.maxUploads) {
        return res.status(403).json({
          success: false,
          error: `Upload limit reached (${sub.uploadsUsed}/${sub.maxUploads}) for ${TIER_LIMITS[sub.tier]?.label || sub.tier} tier. Upgrade to upload more.`,
          currentTier: sub.tier,
          uploadsUsed: sub.uploadsUsed,
          maxUploads: sub.maxUploads,
        });
      }

      const files = req.files as Record<string, Express.Multer.File[]>;
      const audioFile = files?.audio?.[0];
      if (!audioFile) {
        return res
          .status(400)
          .json({ success: false, error: "Audio file is required" });
      }

      const coverFile = files?.cover?.[0];
      const {
        title,
        genre,
        mood,
        bpm,
        musicalKey,
        description,
        price,
        isExplicit,
        lyrics,
        albumId,
      } = req.body;

      if (!title || !title.trim()) {
        // Clean up uploaded files
        if (audioFile) fs.unlinkSync(audioFile.path);
        if (coverFile) fs.unlinkSync(coverFile.path);
        return res
          .status(400)
          .json({ success: false, error: "Track title is required" });
      }

      // Get artist's music_artists ID
      let artistId: number | null = null;
      try {
        const artistResult = await pool.query(
          `SELECT ap.music_artist_id, ap.id as profile_id
           FROM artist_profiles ap WHERE ap.user_id = $1`,
          [userId],
        );
        if (artistResult.rows[0]?.music_artist_id) {
          artistId = artistResult.rows[0].music_artist_id;
        }
      } catch (e) {
        // Continue without — track will have null artist_id
      }

      // Relative paths for serving
      const audioUrl = `/uploads/tracks/${path.basename(audioFile.path)}`;
      const coverArt = coverFile
        ? `/uploads/covers/${path.basename(coverFile.path)}`
        : null;

      // Insert into music_tracks
      const result = await pool.query(
        `INSERT INTO music_tracks (
           title, artist_id, album_id, genre, mood, bpm, musical_key,
           description, price, is_explicit, lyrics,
           file_path, file_name, file_size, mime_type, audio_url, cover_art,
           status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'processing',NOW())
         RETURNING id, title, status, created_at`,
        [
          title.trim(),
          artistId,
          albumId ? parseInt(albumId) : null,
          genre || null,
          mood || null,
          bpm ? parseInt(bpm) : null,
          musicalKey || null,
          description || null,
          price || "0.99",
          isExplicit === "true" || isExplicit === true,
          lyrics || null,
          audioFile.path,
          audioFile.originalname,
          audioFile.size,
          audioFile.mimetype,
          audioUrl,
          coverArt,
        ],
      );

      // Update upload count
      try {
        await pool.query(
          `UPDATE artist_subscriptions SET upload_count_this_period = upload_count_this_period + 1
           WHERE artist_profile_id = (SELECT id FROM artist_profiles WHERE user_id = $1)`,
          [userId],
        );
      } catch (e) {
        // Non-critical
      }

      // Set status to 'published' (in production: background job would validate + transcode first)
      try {
        await pool.query(
          `UPDATE music_tracks SET status = 'published' WHERE id = $1`,
          [result.rows[0].id],
        );
      } catch (e) {
        // Non-critical
      }

      console.log(
        `🎵 [UPLOAD] Track "${title}" uploaded by user ${userId} → ID ${result.rows[0].id}`,
      );

      res.status(201).json({
        success: true,
        message: "Track uploaded successfully",
        track: { ...result.rows[0], audioUrl, coverArt },
        subscription: {
          tier: sub.tier,
          uploadsUsed: sub.uploadsUsed + 1,
          maxUploads: sub.maxUploads,
        },
      });
    } catch (err: any) {
      console.error("[UPLOAD] Track upload error:", err);
      res.status(500).json({ success: false, error: "Failed to upload track" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/upload/my-tracks — List authenticated artist's uploaded tracks
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/my-tracks", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.user ? parseInt(req.user.userId) : null;
    if (!userId)
      return res.status(401).json({ success: false, error: "Auth required" });

    // Get artist's music_artists ID
    const artistResult = await pool.query(
      `SELECT music_artist_id FROM artist_profiles WHERE user_id = $1`,
      [userId],
    );
    const musicArtistId = artistResult.rows[0]?.music_artist_id;

    if (!musicArtistId) {
      return res.json({ success: true, tracks: [], total: 0 });
    }

    const tracks = await pool.query(
      `SELECT id, title, genre, mood, bpm, musical_key, streams, play_count, likes,
              downloads, revenue, status, audio_url, cover_art, duration,
              file_name, file_size, is_explicit, created_at
       FROM music_tracks
       WHERE artist_id = $1
       ORDER BY created_at DESC`,
      [musicArtistId],
    );

    // Get subscription info
    const sub = await getArtistSubscriptionTier(userId);

    res.json({
      success: true,
      tracks: tracks.rows,
      total: tracks.rows.length,
      subscription: {
        tier: sub.tier,
        uploadsUsed: sub.uploadsUsed,
        maxUploads: sub.maxUploads,
      },
    });
  } catch (err: any) {
    console.error("[UPLOAD] My tracks error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch tracks" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/upload/track/:id — Remove an uploaded track (owner only)
// ═══════════════════════════════════════════════════════════════════════════════
router.delete(
  "/track/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user ? parseInt(req.user.userId) : null;
      if (!userId)
        return res.status(401).json({ success: false, error: "Auth required" });

      const trackId = parseInt(req.params.id);

      // Verify ownership
      const track = await pool.query(
        `SELECT mt.id, mt.file_path, mt.cover_art, mt.artist_id
       FROM music_tracks mt
       JOIN artist_profiles ap ON ap.music_artist_id = mt.artist_id
       WHERE mt.id = $1 AND ap.user_id = $2`,
        [trackId, userId],
      );

      if (track.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Track not found or not owned by you",
        });
      }

      const row = track.rows[0];

      // Delete files
      if (row.file_path && fs.existsSync(row.file_path)) {
        fs.unlinkSync(row.file_path);
      }
      if (row.cover_art) {
        const coverPath = path.resolve(
          process.cwd(),
          row.cover_art.replace(/^\//, ""),
        );
        if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
      }

      // Delete from DB
      await pool.query(`DELETE FROM music_tracks WHERE id = $1`, [trackId]);

      // Decrement upload count
      try {
        await pool.query(
          `UPDATE artist_subscriptions SET upload_count_this_period = GREATEST(0, upload_count_this_period - 1)
         WHERE artist_profile_id = (SELECT id FROM artist_profiles WHERE user_id = $1)`,
          [userId],
        );
      } catch (e) {
        // Non-critical
      }

      res.json({ success: true, message: "Track deleted" });
    } catch (err: any) {
      console.error("[UPLOAD] Delete track error:", err);
      res.status(500).json({ success: false, error: "Failed to delete track" });
    }
  },
);

export default router;

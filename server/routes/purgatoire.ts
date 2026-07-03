/**
 * 🔥 PURGATOIRE — Track Moderation Queue
 *
 * All uploaded tracks land here as "pending_review" before going live.
 * Superadmin + Admin can approve/reject. Moderator can flag only.
 *
 * Endpoints:
 *   GET  /api/purgatoire/queue         → List all pending_review tracks
 *   GET  /api/purgatoire/stats         → Moderation stats (pending, approved today, rejected today)
 *   POST /api/purgatoire/:trackId/approve  → Approve track → status = 'published'
 *   POST /api/purgatoire/:trackId/reject   → Reject track → status = 'rejected' + reason
 *   POST /api/purgatoire/:trackId/flag     → Moderator flag (marks note without changing status)
 */

import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { notificationEmitter } from "../services/notification-service";

const router = Router();

// ─── ROLE HELPERS ───────────────────────────────────────────────────────────────

const APPROVE_ROLES = ["superuser", "admin"];
const FLAG_ROLES = ["superuser", "admin", "moderator"];

async function getUserRole(userId: number): Promise<string | null> {
  const result = await pool.query(`SELECT role FROM users WHERE id = $1`, [
    userId,
  ]);
  return result.rows[0]?.role || null;
}

// ─── GET /queue — List pending_review tracks ────────────────────────────────────

router.get("/queue", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    const role = await getUserRole(userId);

    if (!role || !FLAG_ROLES.includes(role)) {
      return res
        .status(403)
        .json({ success: false, error: "Admin access required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const statusFilter = (req.query.status as string) || "pending_review";

    const [countResult, tracks] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM music_tracks WHERE status = $1`,
        [statusFilter],
      ),
      pool.query(
        `SELECT mt.id, mt.title, mt.genre, mt.mood, mt.bpm, mt.musical_key,
                mt.duration, mt.is_explicit, mt.description, mt.lyrics,
                mt.audio_url, mt.cover_art, mt.file_name, mt.file_size, mt.mime_type,
                mt.status, mt.created_at, mt.moderation_notes, mt.rejection_reason,
                mt.reviewed_at, mt.reviewed_by,
                COALESCE(ma.name, ap.stage_name) as artist_name,
                COALESCE(ap.profile_image_url, ma.image_url) as artist_image,
                ap.division as artist_division,
                ap.genre as artist_genres,
                u.id as uploader_user_id, u.email as uploader_email,
                reviewer.username as reviewer_name
         FROM music_tracks mt
         LEFT JOIN music_artists ma ON mt.artist_id = ma.id
         LEFT JOIN artists art ON mt.artist_id = art.id
         LEFT JOIN artist_profiles ap ON ap.legacy_artist_id = art.id OR ap.user_id = (
           SELECT user_id FROM artist_profiles WHERE legacy_artist_id = mt.artist_id LIMIT 1
         )
         LEFT JOIN users u ON u.id = ap.user_id
         LEFT JOIN users reviewer ON reviewer.id = mt.reviewed_by
         WHERE mt.status = $1
         ORDER BY mt.created_at ASC
         LIMIT $2 OFFSET $3`,
        [statusFilter, limit, offset],
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total) || 0;

    res.json({
      success: true,
      tracks: tracks.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      canApprove: APPROVE_ROLES.includes(role!),
      canFlag: FLAG_ROLES.includes(role!),
    });
  } catch (err: any) {
    console.error("[PURGATOIRE] Queue error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch queue" });
  }
});

// ─── GET /stats — Moderation dashboard stats ────────────────────────────────────

router.get("/stats", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    const role = await getUserRole(userId);

    if (!role || !FLAG_ROLES.includes(role)) {
      return res
        .status(403)
        .json({ success: false, error: "Admin access required" });
    }

    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM music_tracks WHERE status = 'pending_review') as pending,
        (SELECT COUNT(*) FROM music_tracks WHERE status = 'published' AND reviewed_at IS NOT NULL
         AND reviewed_at >= CURRENT_DATE) as approved_today,
        (SELECT COUNT(*) FROM music_tracks WHERE status = 'rejected'
         AND reviewed_at >= CURRENT_DATE) as rejected_today,
        (SELECT COUNT(*) FROM music_tracks WHERE status = 'published') as total_published,
        (SELECT COUNT(*) FROM music_tracks WHERE status = 'rejected') as total_rejected,
        (SELECT COUNT(DISTINCT artist_id) FROM music_tracks WHERE status = 'pending_review') as artists_waiting
    `);

    res.json({ success: true, stats: stats.rows[0] });
  } catch (err: any) {
    console.error("[PURGATOIRE] Stats error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// ─── POST /:trackId/approve — Approve track → published ─────────────────────────

router.post(
  "/:trackId/approve",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { trackId } = req.params;
      const { notes } = req.body; // optional reviewer notes
      const role = await getUserRole(userId);

      if (!role || !APPROVE_ROLES.includes(role)) {
        return res.status(403).json({
          success: false,
          error: "Only superadmin and admin can approve tracks",
        });
      }

      // Verify track exists and is pending
      const track = await pool.query(
        `SELECT mt.id, mt.title, mt.artist_id, mt.status,
              COALESCE(ma.name, ap.stage_name) as artist_name,
              ap.user_id as artist_user_id
       FROM music_tracks mt
       LEFT JOIN music_artists ma ON mt.artist_id = ma.id
       LEFT JOIN artists art ON mt.artist_id = art.id
       LEFT JOIN artist_profiles ap ON ap.legacy_artist_id = art.id
       WHERE mt.id = $1`,
        [trackId],
      );

      if (track.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Track not found" });
      }

      if (track.rows[0].status === "published") {
        return res
          .status(400)
          .json({ success: false, error: "Track already published" });
      }

      // Approve: set published + record reviewer
      await pool.query(
        `UPDATE music_tracks
       SET status = 'published',
           reviewed_by = $1,
           reviewed_at = NOW(),
           moderation_notes = COALESCE($2, moderation_notes)
       WHERE id = $3`,
        [userId, notes || null, trackId],
      );

      const trackInfo = track.rows[0];
      console.log(
        `✅ [PURGATOIRE] Track "${trackInfo.title}" (ID ${trackId}) APPROVED by user ${userId}`,
      );

      // ── Notify the artist via Socket.io + DB notification ──
      if (trackInfo.artist_user_id) {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'track_review', '✅ Track Approved!',
             'Your track "${trackInfo.title}" has been approved and is now live on StreamRoyale! Listeners can discover it now.',
             NOW())`,
            [trackInfo.artist_user_id],
          );

          // Emit Socket.io event for real-time notification
          notificationEmitter.emit("track_reviewed", {
            userId: trackInfo.artist_user_id,
            trackId: parseInt(trackId),
            trackTitle: trackInfo.title,
            status: "approved",
            message: `Your track "${trackInfo.title}" is now live!`,
          });
        } catch (e) {
          console.warn("[PURGATOIRE] Notification error:", e);
        }
      }

      res.json({
        success: true,
        message: `Track "${trackInfo.title}" approved and published`,
        track: {
          id: parseInt(trackId),
          title: trackInfo.title,
          status: "published",
        },
      });
    } catch (err: any) {
      console.error("[PURGATOIRE] Approve error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to approve track" });
    }
  },
);

// ─── POST /:trackId/reject — Reject track with reason ───────────────────────────

router.post(
  "/:trackId/reject",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { trackId } = req.params;
      const { reason, notes } = req.body;
      const role = await getUserRole(userId);

      if (!role || !APPROVE_ROLES.includes(role)) {
        return res.status(403).json({
          success: false,
          error: "Only superadmin and admin can reject tracks",
        });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Rejection reason is required (shown to the artist)",
        });
      }

      // Verify track exists
      const track = await pool.query(
        `SELECT mt.id, mt.title, mt.artist_id, mt.status,
              COALESCE(ma.name, ap.stage_name) as artist_name,
              ap.user_id as artist_user_id
       FROM music_tracks mt
       LEFT JOIN music_artists ma ON mt.artist_id = ma.id
       LEFT JOIN artists art ON mt.artist_id = art.id
       LEFT JOIN artist_profiles ap ON ap.legacy_artist_id = art.id
       WHERE mt.id = $1`,
        [trackId],
      );

      if (track.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Track not found" });
      }

      // Reject: set status + reason + reviewer
      await pool.query(
        `UPDATE music_tracks
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = NOW(),
           rejection_reason = $2,
           moderation_notes = COALESCE($3, moderation_notes)
       WHERE id = $4`,
        [userId, reason.trim(), notes || null, trackId],
      );

      const trackInfo = track.rows[0];
      console.log(
        `❌ [PURGATOIRE] Track "${trackInfo.title}" (ID ${trackId}) REJECTED by user ${userId}: ${reason}`,
      );

      // ── Notify the artist ──
      if (trackInfo.artist_user_id) {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'track_review', '⚠️ Track Needs Revision',
             'Your track "${trackInfo.title}" was not approved. Reason: ${reason.trim()}. You can re-upload after making the required changes.',
             NOW())`,
            [trackInfo.artist_user_id],
          );

          notificationEmitter.emit("track_reviewed", {
            userId: trackInfo.artist_user_id,
            trackId: parseInt(trackId),
            trackTitle: trackInfo.title,
            status: "rejected",
            reason: reason.trim(),
            message: `Your track "${trackInfo.title}" needs revision: ${reason.trim()}`,
          });
        } catch (e) {
          console.warn("[PURGATOIRE] Notification error:", e);
        }
      }

      res.json({
        success: true,
        message: `Track "${trackInfo.title}" rejected`,
        track: {
          id: parseInt(trackId),
          title: trackInfo.title,
          status: "rejected",
          reason,
        },
      });
    } catch (err: any) {
      console.error("[PURGATOIRE] Reject error:", err);
      res.status(500).json({ success: false, error: "Failed to reject track" });
    }
  },
);

// ─── POST /:trackId/flag — Moderator flag (notes only, no status change) ─────────

router.post(
  "/:trackId/flag",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { trackId } = req.params;
      const { notes } = req.body;
      const role = await getUserRole(userId);

      if (!role || !FLAG_ROLES.includes(role)) {
        return res
          .status(403)
          .json({ success: false, error: "Moderator access required" });
      }

      if (!notes || notes.trim().length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Flag notes are required" });
      }

      // Append flag note (don't overwrite existing notes)
      const reviewer = await pool.query(
        `SELECT username FROM users WHERE id = $1`,
        [userId],
      );
      const flagNote = `[FLAG by ${reviewer.rows[0]?.username || userId} @ ${new Date().toISOString()}] ${notes.trim()}`;

      await pool.query(
        `UPDATE music_tracks
       SET moderation_notes = CASE
         WHEN moderation_notes IS NULL THEN $1
         ELSE moderation_notes || E'\n' || $1
       END
       WHERE id = $2`,
        [flagNote, trackId],
      );

      console.log(
        `🚩 [PURGATOIRE] Track ${trackId} FLAGGED by user ${userId}: ${notes}`,
      );

      res.json({
        success: true,
        message: "Track flagged for admin review",
        flag: flagNote,
      });
    } catch (err: any) {
      console.error("[PURGATOIRE] Flag error:", err);
      res.status(500).json({ success: false, error: "Failed to flag track" });
    }
  },
);

export default router;

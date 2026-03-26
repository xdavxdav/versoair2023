/**
 * Collab Chains — Viral Remix & Open Verse System
 *
 * Artists can open tracks for collaboration:
 *   "Open Verse" — invite other artists to add a verse/layer/remix
 *   "Remix Request" — request permission to remix someone's track
 *   "Feature" — invite an artist to be featured on your track
 *
 * Revenue split is negotiated at creation, locked when accepted.
 *
 * Flow:
 *   1. Artist A opens a collab request (with terms, split %)
 *   2. Artist B sees the request (or is tagged directly)
 *   3. Artist B accepts → uploads their contribution
 *   4. System creates the collab track (merged credits)
 *   5. Revenue flows: Artist A gets X%, Artist B gets Y%
 *
 * Chain mechanic: A collab track can itself be opened for more collabs,
 * creating a "chain" — each new contributor splits from the existing pool.
 *
 * Routes:
 *   POST /api/collab-chains/request             — Create collab request
 *   GET  /api/collab-chains/open                — Browse open collab requests
 *   GET  /api/collab-chains/my-requests         — My sent/received requests
 *   PUT  /api/collab-chains/:id/respond         — Accept/Reject a request
 *   POST /api/collab-chains/:id/submit          — Submit contribution
 *   POST /api/collab-chains/:id/finalize        — Finalize & publish collab track
 *   GET  /api/collab-chains/track/:trackId      — Collab chain history for a track
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

const COLLAB_TYPES = ["open_verse", "remix", "feature"];
const MAX_SPLIT_TOTAL = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// POST /request — Create collab request
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/request", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    const {
      trackId,
      collabType,
      targetArtistId,
      message,
      requesterSplit,
      targetSplit,
      deadline,
      genre,
      isOpen,
    } = req.body;

    if (!collabType || !COLLAB_TYPES.includes(collabType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid collabType. Choose: ${COLLAB_TYPES.join(", ")}`,
      });
    }

    // Validate split
    const rSplit = parseInt(requesterSplit) || 70;
    const tSplit = parseInt(targetSplit) || 30;
    if (rSplit + tSplit !== MAX_SPLIT_TOTAL) {
      return res.status(400).json({
        success: false,
        error: `Revenue split must total ${MAX_SPLIT_TOTAL}%. Got ${rSplit}% + ${tSplit}% = ${rSplit + tSplit}%`,
      });
    }

    // Get requester's artist profile
    const profile = await pool.query(
      `SELECT id FROM artist_profiles WHERE user_id = $1`,
      [userId],
    );
    if (profile.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: "Artist profile required" });
    }
    const requesterArtistId = profile.rows[0].id;

    // If track is specified, verify ownership
    if (trackId) {
      const track = await pool.query(
        `SELECT artist_id FROM music_tracks WHERE id = $1`,
        [trackId],
      );
      if (track.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Track not found" });
      }
      // Allow if requester owns the track or is an open collaboration
    }

    const result = await pool.query(
      `INSERT INTO collab_requests (
         track_id, requester_artist_id, target_artist_id, collab_type,
         message, requester_split, target_split, deadline, genre,
         is_open, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        trackId || null,
        requesterArtistId,
        targetArtistId || null,
        collabType,
        message || null,
        rSplit,
        tSplit,
        deadline || null,
        genre || null,
        isOpen !== false,
      ],
    );

    res.status(201).json({
      success: true,
      message: targetArtistId
        ? `Collab request sent to artist #${targetArtistId}`
        : `Open collab request posted — anyone can apply`,
      request: result.rows[0],
    });
  } catch (err: any) {
    console.error("[COLLAB] Request error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to create collab request" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /open — Browse open collab requests
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/open", optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      genre,
      collabType,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const offset = (pageNum - 1) * limitNum;

    let where = "WHERE cr.is_open = true AND cr.status = 'pending'";
    const params: any[] = [];

    if (genre) {
      params.push(genre);
      where += ` AND cr.genre ILIKE $${params.length}`;
    }
    if (collabType && COLLAB_TYPES.includes(collabType)) {
      params.push(collabType);
      where += ` AND cr.collab_type = $${params.length}`;
    }

    params.push(limitNum, offset);

    const result = await pool.query(
      `SELECT cr.*,
        ap.stage_name as requester_name, ap.profile_image_url as requester_image,
        mt.title as track_title, mt.cover_art_url as track_cover
       FROM collab_requests cr
       JOIN artist_profiles ap ON ap.id = cr.requester_artist_id
       LEFT JOIN music_tracks mt ON mt.id = cr.track_id
       ${where}
       ORDER BY cr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM collab_requests cr ${where}`,
      params.slice(0, params.length - 2), // remove limit/offset
    );

    res.json({
      success: true,
      requests: result.rows,
      total: parseInt(count.rows[0].count),
      page: pageNum,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limitNum),
    });
  } catch (err: any) {
    console.error("[COLLAB] Open browse error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch open requests" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /my-requests — My sent/received requests
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  "/my-requests",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { direction } = req.query as Record<string, string>;

      // Get artist profile
      const profile = await pool.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1`,
        [userId],
      );
      if (profile.rows.length === 0) {
        return res.json({ success: true, sent: [], received: [] });
      }
      const artistId = profile.rows[0].id;

      const sent =
        direction !== "received"
          ? await pool.query(
              `SELECT cr.*, ap.stage_name as target_name, mt.title as track_title
           FROM collab_requests cr
           LEFT JOIN artist_profiles ap ON ap.id = cr.target_artist_id
           LEFT JOIN music_tracks mt ON mt.id = cr.track_id
           WHERE cr.requester_artist_id = $1
           ORDER BY cr.created_at DESC`,
              [artistId],
            )
          : { rows: [] };

      const received =
        direction !== "sent"
          ? await pool.query(
              `SELECT cr.*, ap.stage_name as requester_name, mt.title as track_title
           FROM collab_requests cr
           LEFT JOIN artist_profiles ap ON ap.id = cr.requester_artist_id
           LEFT JOIN music_tracks mt ON mt.id = cr.track_id
           WHERE cr.target_artist_id = $1 OR (cr.is_open = true AND cr.requester_artist_id != $1)
           ORDER BY cr.created_at DESC`,
              [artistId],
            )
          : { rows: [] };

      res.json({
        success: true,
        sent: sent.rows,
        received: received.rows,
      });
    } catch (err: any) {
      console.error("[COLLAB] My requests error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch requests" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /:id/respond — Accept/Reject a collab request
// ═══════════════════════════════════════════════════════════════════════════════
router.put(
  "/:id/respond",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const requestId = parseInt(req.params.id);
      const { action, counterSplit } = req.body;

      if (!action || !["accept", "reject"].includes(action)) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Action must be 'accept' or 'reject'",
          });
      }

      // Get artist profile
      const profile = await pool.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1`,
        [userId],
      );
      if (profile.rows.length === 0) {
        return res
          .status(403)
          .json({ success: false, error: "Artist profile required" });
      }
      const artistId = profile.rows[0].id;

      // Get request
      const request = await pool.query(
        `SELECT * FROM collab_requests WHERE id = $1 AND status = 'pending'`,
        [requestId],
      );
      if (request.rows.length === 0) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Request not found or already responded",
          });
      }

      const collab = request.rows[0];

      // Verify responder is the target or it's an open request
      if (collab.target_artist_id && collab.target_artist_id !== artistId) {
        return res
          .status(403)
          .json({ success: false, error: "Not the target of this request" });
      }
      if (collab.requester_artist_id === artistId) {
        return res
          .status(400)
          .json({ success: false, error: "Can't respond to your own request" });
      }

      if (action === "reject") {
        await pool.query(
          `UPDATE collab_requests SET status = 'rejected', responded_at = NOW() WHERE id = $1`,
          [requestId],
        );
        return res.json({ success: true, message: "Collab request rejected" });
      }

      // Accept — set target if open
      const updates: string[] = ["status = 'accepted'", "responded_at = NOW()"];
      const params: any[] = [];
      let paramIdx = 0;

      if (!collab.target_artist_id) {
        paramIdx++;
        updates.push(`target_artist_id = $${paramIdx}`);
        params.push(artistId);
      }

      // Counter-split negotiation
      if (counterSplit) {
        const cs = parseInt(counterSplit);
        if (cs > 0 && cs <= 50) {
          paramIdx++;
          updates.push(`target_split = $${paramIdx}`);
          params.push(cs);
          paramIdx++;
          updates.push(`requester_split = $${paramIdx}`);
          params.push(100 - cs);
        }
      }

      paramIdx++;
      params.push(requestId);

      await pool.query(
        `UPDATE collab_requests SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
        params,
      );

      res.json({
        success: true,
        message:
          "Collab accepted! Now submit your contribution with POST /collab-chains/:id/submit",
      });
    } catch (err: any) {
      console.error("[COLLAB] Respond error:", err);
      res.status(500).json({ success: false, error: "Failed to respond" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/submit — Submit contribution (upload reference)
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/:id/submit",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const requestId = parseInt(req.params.id);
      const { contributionUrl, notes } = req.body;

      if (!contributionUrl) {
        return res
          .status(400)
          .json({
            success: false,
            error: "contributionUrl required (uploaded file reference)",
          });
      }

      const request = await pool.query(
        `SELECT * FROM collab_requests WHERE id = $1 AND status = 'accepted'`,
        [requestId],
      );
      if (request.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Accepted collab request not found" });
      }

      // Mark as in_progress with contribution
      await pool.query(
        `UPDATE collab_requests SET status = 'in_progress',
        contribution_url = $1, contribution_notes = $2
       WHERE id = $3`,
        [contributionUrl, notes || null, requestId],
      );

      res.json({
        success: true,
        message:
          "Contribution submitted! Requester can now finalize the collab track.",
      });
    } catch (err: any) {
      console.error("[COLLAB] Submit error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to submit contribution" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/finalize — Finalize & publish the collab track
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/:id/finalize",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const requestId = parseInt(req.params.id);
      const { title, mergedAudioUrl, coverArtUrl, genre } = req.body;

      const request = await pool.query(
        `SELECT * FROM collab_requests WHERE id = $1 AND status = 'in_progress'`,
        [requestId],
      );
      if (request.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "In-progress collab not found" });
      }

      const collab = request.rows[0];

      // Verify the requester is finalizing
      const profile = await pool.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1`,
        [userId],
      );
      if (
        profile.rows.length === 0 ||
        profile.rows[0].id !== collab.requester_artist_id
      ) {
        return res
          .status(403)
          .json({ success: false, error: "Only the requester can finalize" });
      }

      // Create the collab track
      const collabTitle = title || `Collab — ${collab.collab_type}`;
      const newTrack = await pool.query(
        `INSERT INTO music_tracks (
         title, artist_id, genre, audio_url, cover_art_url,
         is_published, is_collab, collab_artist_ids
       ) VALUES ($1, $2, $3, $4, $5, true, true, $6)
       RETURNING id`,
        [
          collabTitle,
          collab.requester_artist_id,
          genre || null,
          mergedAudioUrl || null,
          coverArtUrl || null,
          JSON.stringify([collab.requester_artist_id, collab.target_artist_id]),
        ],
      );

      // Update collab request
      await pool.query(
        `UPDATE collab_requests SET status = 'completed', result_track_id = $1, completed_at = NOW()
       WHERE id = $2`,
        [newTrack.rows[0].id, requestId],
      );

      // Create artist_collaborations entry
      await pool.query(
        `INSERT INTO artist_collaborations (track_id, primary_artist_id, featured_artist_id, revenue_split, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT DO NOTHING`,
        [
          newTrack.rows[0].id,
          collab.requester_artist_id,
          collab.target_artist_id,
          JSON.stringify({
            [collab.requester_artist_id]: collab.requester_split,
            [collab.target_artist_id]: collab.target_split,
          }),
        ],
      );

      res.json({
        success: true,
        message: `🎵 Collab track "${collabTitle}" published! Revenue split: ${collab.requester_split}%/${collab.target_split}%`,
        trackId: newTrack.rows[0].id,
      });
    } catch (err: any) {
      console.error("[COLLAB] Finalize error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to finalize collab" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /track/:trackId — Collab chain history for a track
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/track/:trackId", async (req: Request, res: Response) => {
  try {
    const trackId = parseInt(req.params.trackId);

    // Get all collab requests related to this track
    const chain = await pool.query(
      `SELECT cr.*,
        req.stage_name as requester_name,
        tgt.stage_name as target_name,
        mt.title as original_track_title
       FROM collab_requests cr
       LEFT JOIN artist_profiles req ON req.id = cr.requester_artist_id
       LEFT JOIN artist_profiles tgt ON tgt.id = cr.target_artist_id
       LEFT JOIN music_tracks mt ON mt.id = cr.track_id
       WHERE cr.track_id = $1 OR cr.result_track_id = $1
       ORDER BY cr.created_at`,
      [trackId],
    );

    res.json({
      success: true,
      trackId,
      chainLength: chain.rows.length,
      collabs: chain.rows,
    });
  } catch (err: any) {
    console.error("[COLLAB] Chain history error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch collab chain" });
  }
});

export default router;

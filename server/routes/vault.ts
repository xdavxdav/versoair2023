/**
 * Verso Vault — Exclusivity Engine for Track Access Control
 *
 * Artists can gate their tracks behind rules:
 *   time_gate   — Locked until a specific date/time
 *   stream_gate — Requires X streams on the artist's other tracks to unlock
 *   tier_gate   — Requires listener subscription tier (supporter/champion/patron)
 *   collab_gate — Requires listener to have participated in a collab chain
 *   badge_gate  — Requires the listener to be a verified fan (artist follower badge)
 *
 * Multiple rules can stack (AND logic — all rules must pass).
 * Unlock checks are run on-demand when a listener tries to play a vaulted track.
 *
 * Routes:
 *   POST /api/vault/rules            — Artist: set vault rules for a track
 *   GET  /api/vault/track/:trackId   — Get vault rules for a track
 *   POST /api/vault/check-unlock     — Check if listener can unlock a track
 *   DELETE /api/vault/rules/:ruleId  — Artist: remove a vault rule
 *   GET  /api/vault/my-vaulted       — Artist: list my vaulted tracks
 *   GET  /api/vault/unlocked         — Listener: tracks I've unlocked
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

const VALID_RULE_TYPES = [
  "time_gate",
  "stream_gate",
  "tier_gate",
  "collab_gate",
  "badge_gate",
];
const TIER_HIERARCHY = ["free", "supporter", "champion", "patron"];

// ═══════════════════════════════════════════════════════════════════════════════
// POST /rules — Artist: set vault rules for a track
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/rules", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    const { trackId, rules } = req.body;

    if (!trackId || !rules || !Array.isArray(rules) || rules.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "trackId and rules array required" });
    }

    // Verify track ownership
    const track = await pool.query(
      `SELECT id, artist_id FROM music_tracks WHERE id = $1`,
      [trackId],
    );
    if (track.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Track not found" });
    }

    // Check ownership via artist_profiles or music_artists
    const artistCheck = await pool.query(
      `SELECT id FROM artist_profiles WHERE user_id = $1
       UNION
       SELECT id FROM music_artists WHERE user_id = $1`,
      [userId],
    );
    const artistIds = artistCheck.rows.map((r: any) => r.id);
    if (!artistIds.includes(track.rows[0].artist_id)) {
      return res.status(403).json({ success: false, error: "Not your track" });
    }

    const createdRules: any[] = [];

    for (const rule of rules) {
      if (!rule.type || !VALID_RULE_TYPES.includes(rule.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rule type: ${rule.type}. Valid: ${VALID_RULE_TYPES.join(", ")}`,
        });
      }

      // Validate rule-specific fields
      let value: any = {};
      switch (rule.type) {
        case "time_gate":
          if (!rule.unlockDate) {
            return res
              .status(400)
              .json({
                success: false,
                error: "time_gate requires unlockDate (ISO 8601)",
              });
          }
          value = { unlock_date: rule.unlockDate };
          break;

        case "stream_gate":
          if (!rule.requiredStreams || parseInt(rule.requiredStreams) <= 0) {
            return res
              .status(400)
              .json({
                success: false,
                error: "stream_gate requires requiredStreams > 0",
              });
          }
          value = { required_streams: parseInt(rule.requiredStreams) };
          break;

        case "tier_gate":
          if (
            !rule.requiredTier ||
            !TIER_HIERARCHY.includes(rule.requiredTier)
          ) {
            return res.status(400).json({
              success: false,
              error: `tier_gate requires requiredTier: ${TIER_HIERARCHY.join(", ")}`,
            });
          }
          value = { required_tier: rule.requiredTier };
          break;

        case "collab_gate":
          value = {
            requires_collab: true,
            collab_artist_id: rule.collabArtistId || null,
          };
          break;

        case "badge_gate":
          value = {
            requires_follow: true,
            min_follow_days: rule.minFollowDays || 0,
          };
          break;
      }

      const result = await pool.query(
        `INSERT INTO vault_rules (track_id, artist_id, rule_type, rule_value, description, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, rule_type, rule_value, description`,
        [
          trackId,
          track.rows[0].artist_id,
          rule.type,
          JSON.stringify(value),
          rule.description || `${rule.type} rule`,
        ],
      );
      createdRules.push(result.rows[0]);
    }

    // Mark the track as vaulted (add metadata)
    await pool.query(
      `UPDATE music_tracks SET is_published = false WHERE id = $1`,
      [trackId],
    );

    res.status(201).json({
      success: true,
      message: `${createdRules.length} vault rule(s) applied to track. Track is now vaulted.`,
      rules: createdRules,
    });
  } catch (err: any) {
    console.error("[VAULT] Set rules error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to set vault rules" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /track/:trackId — Get vault rules for a track
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  "/track/:trackId",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const userId = req.user ? parseInt(req.user.userId) : null;

      const rules = await pool.query(
        `SELECT id, rule_type, rule_value, description, is_active, created_at
       FROM vault_rules WHERE track_id = $1 AND is_active = true
       ORDER BY created_at`,
        [trackId],
      );

      if (rules.rows.length === 0) {
        return res.json({
          success: true,
          vaulted: false,
          rules: [],
          message: "Track is not vaulted",
        });
      }

      // If user is logged in, check each rule
      const ruleStatuses = rules.rows.map((r: any) => ({
        ...r,
        rule_value: JSON.parse(r.rule_value || "{}"),
        unlocked: false, // Will be checked by /check-unlock
      }));

      res.json({
        success: true,
        vaulted: true,
        ruleCount: rules.rows.length,
        rules: ruleStatuses,
        hint: userId
          ? "Use POST /vault/check-unlock to check if you can access this track"
          : "Login to check access",
      });
    } catch (err: any) {
      console.error("[VAULT] Get rules error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch vault rules" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /check-unlock — Check if listener can unlock a track
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/check-unlock",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const { trackId } = req.body;

      if (!trackId) {
        return res
          .status(400)
          .json({ success: false, error: "trackId required" });
      }

      const rules = await pool.query(
        `SELECT * FROM vault_rules WHERE track_id = $1 AND is_active = true`,
        [trackId],
      );

      if (rules.rows.length === 0) {
        return res.json({
          success: true,
          unlocked: true,
          message: "Track is not vaulted — open access",
        });
      }

      const results: { rule: string; passed: boolean; detail: string }[] = [];

      for (const rule of rules.rows) {
        const value = JSON.parse(rule.rule_value || "{}");

        switch (rule.rule_type) {
          case "time_gate": {
            const unlockDate = new Date(value.unlock_date);
            const passed = new Date() >= unlockDate;
            results.push({
              rule: "time_gate",
              passed,
              detail: passed
                ? `Unlocked since ${unlockDate.toISOString()}`
                : `Available on ${unlockDate.toISOString()}`,
            });
            break;
          }

          case "stream_gate": {
            // Count streams on this artist's tracks by this listener
            const track = await pool.query(
              `SELECT artist_id FROM music_tracks WHERE id = $1`,
              [trackId],
            );
            const artistId = track.rows[0]?.artist_id;

            const streams = await pool.query(
              `SELECT COUNT(*) as total FROM stream_events
             WHERE user_id = $1 AND artist_profile_id = $2 AND completed = true`,
              [userId, artistId],
            );
            const listenerStreams = parseInt(streams.rows[0]?.total || "0");
            const required = value.required_streams;
            results.push({
              rule: "stream_gate",
              passed: listenerStreams >= required,
              detail: `${listenerStreams}/${required} streams on this artist's tracks`,
            });
            break;
          }

          case "tier_gate": {
            const sub = await pool.query(
              `SELECT tier FROM listener_subscriptions WHERE user_id = $1 AND status = 'active'`,
              [userId],
            );
            const userTier = sub.rows[0]?.tier || "free";
            const userIdx = TIER_HIERARCHY.indexOf(userTier);
            const requiredIdx = TIER_HIERARCHY.indexOf(value.required_tier);
            results.push({
              rule: "tier_gate",
              passed: userIdx >= requiredIdx,
              detail: `Your tier: ${userTier}, required: ${value.required_tier}`,
            });
            break;
          }

          case "collab_gate": {
            const collabs = await pool.query(
              `SELECT COUNT(*) as total FROM collab_requests
             WHERE (requester_artist_id IN (SELECT id FROM artist_profiles WHERE user_id = $1)
                OR target_artist_id IN (SELECT id FROM artist_profiles WHERE user_id = $1))
             AND status = 'completed'`,
              [userId],
            );
            const hasCollab = parseInt(collabs.rows[0]?.total || "0") > 0;
            results.push({
              rule: "collab_gate",
              passed: hasCollab,
              detail: hasCollab
                ? "Collab chain participant"
                : "No completed collabs found",
            });
            break;
          }

          case "badge_gate": {
            // Check if listener follows this artist
            const track = await pool.query(
              `SELECT artist_id FROM music_tracks WHERE id = $1`,
              [trackId],
            );
            const artistId = track.rows[0]?.artist_id;

            const follow = await pool.query(
              `SELECT created_at FROM artist_follows WHERE user_id = $1 AND artist_id = $2`,
              [userId, artistId],
            );

            const isFollowing = follow.rows.length > 0;
            const minDays = value.min_follow_days || 0;
            let daysSinceFollow = 0;
            if (isFollowing) {
              daysSinceFollow = Math.floor(
                (Date.now() - new Date(follow.rows[0].created_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }

            const passed = isFollowing && daysSinceFollow >= minDays;
            results.push({
              rule: "badge_gate",
              passed,
              detail: isFollowing
                ? `Following for ${daysSinceFollow} days (need ${minDays})`
                : "Not following this artist",
            });
            break;
          }

          default:
            results.push({
              rule: rule.rule_type,
              passed: false,
              detail: "Unknown rule type",
            });
        }
      }

      const allPassed = results.every((r) => r.passed);

      res.json({
        success: true,
        unlocked: allPassed,
        message: allPassed
          ? "🔓 All vault rules passed — track unlocked!"
          : "🔒 Some rules not met — track remains vaulted",
        rules: results,
        passedCount: results.filter((r) => r.passed).length,
        totalRules: results.length,
      });
    } catch (err: any) {
      console.error("[VAULT] Check unlock error:", err);
      res.status(500).json({ success: false, error: "Failed to check unlock" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /rules/:ruleId — Artist: remove a vault rule
// ═══════════════════════════════════════════════════════════════════════════════
router.delete(
  "/rules/:ruleId",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const ruleId = parseInt(req.params.ruleId);

      // Verify ownership
      const rule = await pool.query(
        `SELECT vr.id, vr.track_id, vr.artist_id
       FROM vault_rules vr
       JOIN artist_profiles ap ON ap.id = vr.artist_id
       WHERE vr.id = $1 AND ap.user_id = $2`,
        [ruleId, userId],
      );
      if (rule.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Rule not found or not yours" });
      }

      await pool.query(`DELETE FROM vault_rules WHERE id = $1`, [ruleId]);

      // Check if any rules remain — if not, unvault the track
      const remaining = await pool.query(
        `SELECT COUNT(*) FROM vault_rules WHERE track_id = $1 AND is_active = true`,
        [rule.rows[0].track_id],
      );
      if (parseInt(remaining.rows[0].count) === 0) {
        await pool.query(
          `UPDATE music_tracks SET is_published = true WHERE id = $1`,
          [rule.rows[0].track_id],
        );
      }

      res.json({
        success: true,
        message: "Vault rule removed",
        remainingRules: parseInt(remaining.rows[0].count),
      });
    } catch (err: any) {
      console.error("[VAULT] Delete rule error:", err);
      res.status(500).json({ success: false, error: "Failed to remove rule" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /my-vaulted — Artist: list vaulted tracks
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  "/my-vaulted",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);

      const result = await pool.query(
        `SELECT DISTINCT mt.id, mt.title, mt.duration, mt.cover_art_url,
        (SELECT COUNT(*) FROM vault_rules WHERE track_id = mt.id AND is_active = true) as rule_count,
        (SELECT json_agg(json_build_object('type', vr.rule_type, 'description', vr.description))
         FROM vault_rules vr WHERE vr.track_id = mt.id AND vr.is_active = true) as rules
       FROM music_tracks mt
       JOIN vault_rules vr ON vr.track_id = mt.id AND vr.is_active = true
       JOIN artist_profiles ap ON ap.id = vr.artist_id AND ap.user_id = $1
       ORDER BY mt.title`,
        [userId],
      );

      res.json({ success: true, vaultedTracks: result.rows });
    } catch (err: any) {
      console.error("[VAULT] My vaulted error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch vaulted tracks" });
    }
  },
);

export default router;

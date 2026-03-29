/**
 * Listener Portal API — Stats, bonuses, activity tracking for streamers
 */

import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000,
];

function calculateLevel(points: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

// ── Get listener stats ──
router.get("/stats", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }

    // Get or create listener stats
    let statsResult = await pool.query(
      `SELECT * FROM listener_stats WHERE user_id = $1`,
      [userId],
    );

    if (statsResult.rows.length === 0) {
      // Create listener stats record
      await pool.query(
        `INSERT INTO listener_stats (user_id, total_points, total_listen_time, tracks_played, artists_discovered, current_streak, longest_streak)
         VALUES ($1, 0, 0, 0, 0, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      statsResult = await pool.query(
        `SELECT * FROM listener_stats WHERE user_id = $1`,
        [userId],
      );
    }

    const listenerStats = statsResult.rows[0] || {
      total_points: 0,
      total_listen_time: 0,
      tracks_played: 0,
      artists_discovered: 0,
      current_streak: 0,
      longest_streak: 0,
    };

    // Get contest participation stats
    const [contestsResult, predictionsResult] = await Promise.all([
      pool
        .query(`SELECT COUNT(*) as count FROM arena_votes WHERE user_id = $1`, [
          userId,
        ])
        .catch(() => ({ rows: [{ count: 0 }] })),

      pool
        .query(
          `SELECT COUNT(*) as count 
         FROM arena_votes av
         JOIN arena_contests ac ON av.contest_id = ac.id
         WHERE av.user_id = $1 
         AND ac.status = 'completed'
         AND av.artist_profile_id = ac.winner_id`,
          [userId],
        )
        .catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    // Get recent activity
    const activityResult = await pool
      .query(
        `SELECT id, activity_type as type, description, points_earned as points, created_at as timestamp
       FROM listener_activity 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
        [userId],
      )
      .catch(() => ({ rows: [] }));

    // Get pending bonuses
    const bonusesResult = await pool
      .query(
        `SELECT id, bonus_type as type, amount, description, expires_at, claimed
       FROM listener_bonuses 
       WHERE user_id = $1 AND claimed = false
       ORDER BY created_at DESC`,
        [userId],
      )
      .catch(() => ({ rows: [] }));

    // Get badges
    const badgesResult = await pool
      .query(
        `SELECT badge_id as id, name, icon, description, rarity, earned_at
       FROM listener_badges 
       WHERE user_id = $1 
       ORDER BY earned_at DESC`,
        [userId],
      )
      .catch(() => ({ rows: [] }));

    // Get contest history
    const contestHistoryResult = await pool
      .query(
        `SELECT 
         av.id,
         CONCAT(ac.genre, ' Week ', ac.week_number) as contest_name,
         COALESCE(ap.stage_name, 'Unknown Artist') as artist_voted,
         ap.profile_image_url as artist_image,
         CASE 
           WHEN ac.status = 'completed' AND av.artist_profile_id = ac.winner_id THEN 'won'
           WHEN ac.status = 'completed' THEN 'lost'
           ELSE 'pending'
         END as result,
         CASE 
           WHEN ac.status = 'completed' AND av.artist_profile_id = ac.winner_id THEN 100
           ELSE 0
         END as points_earned,
         TO_CHAR(av.created_at, 'YYYY-MM-DD') as date
       FROM arena_votes av
       JOIN arena_contests ac ON av.contest_id = ac.id
       LEFT JOIN artist_profiles ap ON av.artist_profile_id = ap.id
       WHERE av.user_id = $1
       ORDER BY av.created_at DESC
       LIMIT 20`,
        [userId],
      )
      .catch(() => ({ rows: [] }));

    // Calculate level
    const totalPoints = parseInt(listenerStats.total_points) || 0;
    const level = calculateLevel(totalPoints);
    const nextLevelPoints =
      LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

    // Get rank
    const rankResult = await pool
      .query(
        `SELECT COUNT(*) + 1 as rank 
       FROM listener_stats 
       WHERE COALESCE(total_points, 0) > $1`,
        [totalPoints],
      )
      .catch(() => ({ rows: [{ rank: 1 }] }));

    const stats = {
      totalListenTime: parseInt(listenerStats.total_listen_time) || 0,
      tracksPlayed: parseInt(listenerStats.tracks_played) || 0,
      artistsDiscovered: parseInt(listenerStats.artists_discovered) || 0,
      contestsParticipated: parseInt(contestsResult.rows[0]?.count) || 0,
      correctPredictions: parseInt(predictionsResult.rows[0]?.count) || 0,
      currentStreak: parseInt(listenerStats.current_streak) || 0,
      longestStreak: parseInt(listenerStats.longest_streak) || 0,
      totalPoints,
      level,
      nextLevelPoints,
      rank: parseInt(rankResult.rows[0]?.rank) || 1,
      badges: badgesResult.rows.map((b: any) => ({
        id: b.id,
        name: b.name,
        icon: b.icon || "🏆",
        description: b.description,
        earnedAt: b.earned_at,
        rarity: b.rarity || "common",
      })),
      recentActivity: activityResult.rows.map((a: any) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        points: parseInt(a.points) || 0,
        timestamp: a.timestamp,
      })),
      pendingBonuses: bonusesResult.rows.map((b: any) => ({
        id: b.id,
        type: b.type,
        amount: parseInt(b.amount) || 0,
        description: b.description,
        expiresAt: b.expires_at,
        claimed: b.claimed,
      })),
      contestHistory: contestHistoryResult.rows.map((c: any) => ({
        id: c.id,
        contestName: c.contest_name,
        artistVoted: c.artist_voted,
        artistImage: c.artist_image,
        result: c.result,
        pointsEarned: parseInt(c.points_earned) || 0,
        date: c.date,
      })),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching listener stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// ── Claim bonus ──
router.post(
  "/bonuses/:id/claim",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const bonusId = parseInt(req.params.id);

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Not authenticated" });
      }

      // Get the bonus
      const bonusResult = await pool.query(
        `SELECT * FROM listener_bonuses WHERE id = $1 AND user_id = $2 AND claimed = false`,
        [bonusId, userId],
      );

      if (bonusResult.rows.length === 0) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Bonus not found or already claimed",
          });
      }

      const bonus = bonusResult.rows[0];

      // Mark as claimed and add points
      await pool.query(
        `UPDATE listener_bonuses SET claimed = true, claimed_at = NOW() WHERE id = $1`,
        [bonusId],
      );

      await pool.query(
        `UPDATE listener_stats SET total_points = COALESCE(total_points, 0) + $1 WHERE user_id = $2`,
        [bonus.amount, userId],
      );

      // Log activity
      await pool
        .query(
          `INSERT INTO listener_activity (user_id, activity_type, description, points_earned)
       VALUES ($1, 'bonus', $2, $3)`,
          [userId, `Claimed bonus: ${bonus.description}`, bonus.amount],
        )
        .catch(() => {});

      res.json({
        success: true,
        message: "Bonus claimed!",
        amount: bonus.amount,
      });
    } catch (error) {
      console.error("Error claiming bonus:", error);
      res.status(500).json({ success: false, error: "Failed to claim bonus" });
    }
  },
);

// ── Record listening activity (called by audio player) ──
router.post(
  "/activity/listen",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { trackId, duration } = req.body;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Not authenticated" });
      }

      const durationMinutes = Math.floor((duration || 0) / 60);

      // Update listener stats
      await pool.query(
        `INSERT INTO listener_stats (user_id, total_listen_time, tracks_played, total_points)
       VALUES ($1, $2, 1, 5)
       ON CONFLICT (user_id) DO UPDATE SET
         total_listen_time = listener_stats.total_listen_time + $2,
         tracks_played = listener_stats.tracks_played + 1,
         total_points = listener_stats.total_points + 5,
         last_active = NOW()`,
        [userId, durationMinutes],
      );

      // Check if this is a new track (first time listening)
      if (trackId) {
        const existingTrack = await pool
          .query(
            `SELECT 1 FROM listening_history WHERE user_id = $1 AND track_id = $2 LIMIT 1`,
            [userId, trackId],
          )
          .catch(() => ({ rows: [] }));

        if (existingTrack.rows.length === 0) {
          // Check if this track is from a new artist for this user
          const artistResult = await pool
            .query(
              `SELECT mt.artist_id 
           FROM music_tracks mt 
           WHERE mt.id = $1`,
              [trackId],
            )
            .catch(() => ({ rows: [] }));

          if (artistResult.rows.length > 0) {
            const artistId = artistResult.rows[0].artist_id;

            // Check if user has listened to this artist before
            const existingArtist = await pool
              .query(
                `SELECT 1 FROM listening_history lh
             JOIN music_tracks mt ON lh.track_id = mt.id
             WHERE lh.user_id = $1 AND mt.artist_id = $2
             LIMIT 1`,
                [userId, artistId],
              )
              .catch(() => ({ rows: [] }));

            if (existingArtist.rows.length === 0) {
              // New artist discovered - award 10 XP
              await pool.query(
                `UPDATE listener_stats SET 
                 artists_discovered = COALESCE(artists_discovered, 0) + 1,
                 total_points = COALESCE(total_points, 0) + 10
               WHERE user_id = $1`,
                [userId],
              );

              await pool
                .query(
                  `INSERT INTO listener_activity (user_id, activity_type, description, points_earned)
               VALUES ($1, 'achievement', 'Discovered a new artist', 10)`,
                  [userId],
                )
                .catch(() => {});
            }
          }
        }
      }

      // Record in listening history (existing table structure)
      if (trackId) {
        await pool
          .query(
            `INSERT INTO listening_history (user_id, track_id, duration, played_at)
         VALUES ($1, $2, $3, NOW())`,
            [userId, trackId, duration || 0],
          )
          .catch(() => {});
      }

      res.json({ success: true, xpEarned: 5 });
    } catch (error) {
      console.error("Error recording listen:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to record activity" });
    }
  },
);

// ── Award XP (internal helper, can be called from other routes) ──
export async function awardListenerXP(
  userId: number,
  points: number,
  activityType: string,
  description: string,
) {
  try {
    await pool.query(
      `INSERT INTO listener_stats (user_id, total_points)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         total_points = listener_stats.total_points + $2`,
      [userId, points],
    );

    await pool.query(
      `INSERT INTO listener_activity (user_id, activity_type, description, points_earned)
       VALUES ($1, $2, $3, $4)`,
      [userId, activityType, description, points],
    );

    return true;
  } catch (error) {
    console.error("Error awarding XP:", error);
    return false;
  }
}

// ── Create bonus for user ──
export async function createListenerBonus(
  userId: number,
  bonusType: string,
  amount: number,
  description: string,
  expiresAt?: Date,
) {
  try {
    await pool.query(
      `INSERT INTO listener_bonuses (user_id, bonus_type, amount, description, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, bonusType, amount, description, expiresAt || null],
    );
    return true;
  } catch (error) {
    console.error("Error creating bonus:", error);
    return false;
  }
}

// ── Award badge ──
export async function awardListenerBadge(
  userId: number,
  badgeId: string,
  name: string,
  description: string,
  icon: string,
  rarity: "common" | "rare" | "epic" | "legendary",
) {
  try {
    await pool.query(
      `INSERT INTO listener_badges (user_id, badge_id, name, description, icon, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, badge_id) DO NOTHING`,
      [userId, badgeId, name, description, icon, rarity],
    );
    return true;
  } catch (error) {
    console.error("Error awarding badge:", error);
    return false;
  }
}

export default router;

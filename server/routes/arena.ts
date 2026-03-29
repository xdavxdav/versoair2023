/**
 * StreamRoyale Arena — Weekly Battle Royale Competition Engine
 *
 * Schema model: PER-ARTIST BRACKET ROWS
 *   arena_contests  → weekly contest (genre, week, status, current_round)
 *   arena_brackets  → one row per artist per round (contest_id, round, artist_profile_id, streams, vote_count, eliminated)
 *   arena_votes     → listener votes (contest_id, user_id, artist_profile_id, stream_count, locked)
 *   contest_votes   → Option A+ hybrid lock (vote_status: soft→locked after 3 streams or 6h grace)
 *
 * 16 qualified artists enter • 4 elimination rounds • 1 champion
 * Rounds: 16→8 (48h) • 8→4 (48h) • 4→2 (24h) • 2→1 (72h Grand Final)
 * Qualification: Badge ≥ Silver (50k+ lifetime streams)
 *
 * Vote Lock Policy (Option A+ Hybrid):
 *   - First 6 hours: votes are "soft" (changeable)
 *   - After 3rd stream for same artist OR 6h grace window expires → vote LOCKS
 *   - Admin can unlock with reason
 *   - Locked votes are final for that round
 *
 * Routes:
 *   GET  /api/arena/active              — Current open/in-progress contests
 *   GET  /api/arena/:id                 — Contest detail + bracket entries
 *   GET  /api/arena/:id/bracket         — Current round standings
 *   POST /api/arena/create              — Admin: create weekly contest
 *   POST /api/arena/:id/enter           — Artist enters contest
 *   POST /api/arena/:id/vote            — Listener streams/votes for artist (with lock policy)
 *   GET  /api/arena/:id/my-votes        — My vote allocations + lock status
 *   POST /api/arena/:id/advance-round   — Admin: eliminate bottom half, advance winners
 *   POST /api/arena/:id/admin-unlock    — Admin: unlock a locked vote
 *   GET  /api/arena/history             — Past contests with winners
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const ROUND_NAMES = [
  "Round of 16",
  "Quarter-Finals",
  "Semi-Finals",
  "Grand Final",
];
const ROUND_DURATIONS_HOURS = [48, 48, 24, 72];
const MAX_VOTES_PER_LISTENER = 100; // total stream-votes across all artists in one contest
const SOFT_VOTE_WINDOW_HOURS = 6; // votes are changeable for this period
const LOCK_STREAM_THRESHOLD = 3; // vote locks after N streams for the same artist
const BADGE_HIERARCHY = [
  "initiate",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legendary_titan",
];

// Contest participation constants
const MIN_PARTICIPATION_RATE = 20; // 20% of streams during contests required
const GRACE_PERIOD_DAYS = 90; // new artists exempt for 90 days
const MIN_CONTESTS_PER_QUARTER = 2; // at least 2 contests per quarter for established artists

// XP rewards for listeners
const XP_REWARDS = {
  VOTE: 25, // XP per vote cast
  PREDICTION_CORRECT: 100, // voted for winner
  STREAK_WEEKLY: 50, // voted in 4+ consecutive weeks
  KINGMAKER: 150, // voted for 3+ different winners
  UNDERDOG: 25, // supported eliminated artist (consolation)
};

// Helper: get ISO week number
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { week: weekNo, year: d.getUTCFullYear() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /active — Current open/in-progress contests
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/active", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ac.*,
        (SELECT COUNT(*) FROM arena_brackets ab WHERE ab.contest_id = ac.id AND ab.round = 1) as entered_artists,
        (SELECT COALESCE(SUM(av.stream_count), 0) FROM arena_votes av WHERE av.contest_id = ac.id) as total_streams
       FROM arena_contests ac
       WHERE ac.status IN ('open', 'in_progress')
       ORDER BY ac.created_at DESC`,
    );
    res.json({ success: true, arenas: result.rows });
  } catch (err: any) {
    console.error("[ARENA] Active fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch arenas" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /:id — Contest detail + all bracket entries
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const contestId = parseInt(req.params.id);

    const contest = await pool.query(
      `SELECT * FROM arena_contests WHERE id = $1`,
      [contestId],
    );
    if (contest.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Contest not found" });
    }

    // Get all bracket entries with artist info
    const brackets = await pool.query(
      `SELECT ab.*, ap.stage_name, ap.profile_image_url, ap.current_badge_tier,
        ap.lifetime_streams, ap.division
       FROM arena_brackets ab
       LEFT JOIN artist_profiles ap ON ap.id = ab.artist_profile_id
       WHERE ab.contest_id = $1
       ORDER BY ab.round, ab.seed_position NULLS LAST, ab.vote_count DESC`,
      [contestId],
    );

    // Group by round for easy frontend consumption
    const rounds: Record<number, any[]> = {};
    brackets.rows.forEach((b: any) => {
      if (!rounds[b.round]) rounds[b.round] = [];
      rounds[b.round].push(b);
    });

    res.json({
      success: true,
      contest: contest.rows[0],
      rounds,
      roundNames: ROUND_NAMES,
      totalEntries: brackets.rows.filter((b: any) => b.round === 1).length,
    });
  } catch (err: any) {
    console.error("[ARENA] Detail fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch contest" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /:id/bracket — Current round standings
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/:id/bracket", async (req: Request, res: Response) => {
  try {
    const contestId = parseInt(req.params.id);

    const contest = await pool.query(
      `SELECT current_round, status FROM arena_contests WHERE id = $1`,
      [contestId],
    );
    if (contest.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Contest not found" });
    }

    const currentRound = contest.rows[0].current_round;

    const entries = await pool.query(
      `SELECT ab.*, ap.stage_name, ap.profile_image_url, ap.current_badge_tier
       FROM arena_brackets ab
       LEFT JOIN artist_profiles ap ON ap.id = ab.artist_profile_id
       WHERE ab.contest_id = $1 AND ab.round = $2 AND ab.eliminated = false
       ORDER BY ab.vote_count DESC, ab.streams DESC`,
      [contestId, currentRound],
    );

    res.json({
      success: true,
      round: currentRound,
      roundName: ROUND_NAMES[currentRound - 1] || `Round ${currentRound}`,
      status: contest.rows[0].status,
      entries: entries.rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Failed to fetch bracket" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /create — Admin: create weekly contest
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/create",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const { genre, bonusPoolPercent } = req.body;

      if (!genre) {
        return res
          .status(400)
          .json({ success: false, error: "Genre required" });
      }

      const now = new Date();
      const { week, year } = getWeekNumber(now);

      // Calculate week start (Monday) and end (Sunday)
      const dayOfWeek = now.getUTCDay() || 7; // Mon=1, Sun=7
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - dayOfWeek + 1);
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);

      // Check for duplicate contest this week/genre
      const existing = await pool.query(
        `SELECT id FROM arena_contests WHERE genre = $1 AND week_number = $2 AND year_number = $3`,
        [genre, week, year],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: `A ${genre} contest already exists for week ${week}/${year}`,
          existingId: existing.rows[0].id,
        });
      }

      const result = await pool.query(
        `INSERT INTO arena_contests (genre, week_number, year_number, week_start, week_end, current_round, status, bonus_pool_percent)
         VALUES ($1, $2, $3, $4, $5, 1, 'open', $6)
         RETURNING *`,
        [
          genre,
          week,
          year,
          weekStart.toISOString(),
          weekEnd.toISOString(),
          bonusPoolPercent || 30,
        ],
      );

      res.status(201).json({
        success: true,
        message: `Arena contest created for ${genre} — Week ${week}/${year}`,
        contest: result.rows[0],
      });
    } catch (err: any) {
      console.error("[ARENA] Create error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to create contest" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/enter — Artist enters contest (round 1)
// Enhanced with participation rate checking and eligibility validation
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/:id/enter",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const contestId = parseInt(req.params.id);

      // Get artist profile with badge and participation data
      const profile = await pool.query(
        `SELECT id, current_badge_tier, lifetime_streams, stage_name, division,
                contest_participation_rate, contests_entered, contests_skipped,
                contest_exempt_until, created_at
         FROM artist_profiles WHERE user_id = $1 AND is_active = true`,
        [userId],
      );
      if (profile.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Active artist profile required to enter the arena",
        });
      }
      const artist = profile.rows[0];
      const badgeTier = artist.current_badge_tier || 1; // 1=Initiate → 7=Legendary Titan

      // Require at least Silver (tier 3) — 50k+ lifetime streams
      if (badgeTier < 3) {
        return res.status(403).json({
          success: false,
          error: `Silver badge or higher required (tier 3+). Your tier: ${badgeTier} (${BADGE_HIERARCHY[badgeTier - 1] || "unknown"})`,
        });
      }

      // Check if artist is in grace period (new artists exempt for 90 days)
      const now = new Date();
      const createdAt = new Date(artist.created_at);
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isInGracePeriod =
        daysSinceCreation < GRACE_PERIOD_DAYS ||
        (artist.contest_exempt_until &&
          new Date(artist.contest_exempt_until) > now);

      // Check participation rate for established artists (not in grace period)
      const participationRate =
        parseFloat(artist.contest_participation_rate) || 0;
      if (
        !isInGracePeriod &&
        participationRate < MIN_PARTICIPATION_RATE &&
        artist.lifetime_streams > 100000
      ) {
        // Warn but allow entry — track as "at risk"
        console.log(
          `[ARENA] Artist ${artist.stage_name} has low participation rate: ${participationRate}%`,
        );
      }

      // Check contest is open for registration
      const contest = await pool.query(
        `SELECT * FROM arena_contests WHERE id = $1 AND status = 'open'`,
        [contestId],
      );
      if (contest.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Contest not found or registration closed",
        });
      }

      // Check not already entered
      const existing = await pool.query(
        `SELECT id FROM arena_brackets WHERE contest_id = $1 AND artist_profile_id = $2`,
        [contestId, artist.id],
      );
      if (existing.rows.length > 0) {
        return res
          .status(409)
          .json({ success: false, error: "Already entered this contest" });
      }

      // Count current entrants
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM arena_brackets WHERE contest_id = $1 AND round = 1`,
        [contestId],
      );
      const currentCount = parseInt(countResult.rows[0].total);
      if (currentCount >= 16) {
        return res
          .status(409)
          .json({ success: false, error: "Contest is full (16/16 artists)" });
      }

      // Seed position based on entry order
      const seedPosition = currentCount + 1;

      // Create bracket entry for round 1
      await pool.query(
        `INSERT INTO arena_brackets (contest_id, round, artist_profile_id, streams, vote_count, eliminated, seed_position)
         VALUES ($1, 1, $2, 0, 0, false, $3)`,
        [contestId, artist.id, seedPosition],
      );

      // Update artist contest stats
      await pool.query(
        `UPDATE artist_profiles 
         SET contests_entered = COALESCE(contests_entered, 0) + 1,
             last_contest_at = NOW()
         WHERE id = $1`,
        [artist.id],
      );

      // Auto-start when 16 artists enter
      if (currentCount + 1 >= 16) {
        await pool.query(
          `UPDATE arena_contests SET status = 'in_progress' WHERE id = $1`,
          [contestId],
        );
      }

      res.json({
        success: true,
        message: `Entered arena as seed #${seedPosition}!`,
        seedPosition,
        slotsRemaining: Math.max(0, 16 - currentCount - 1),
        contestStarted: currentCount + 1 >= 16,
        participationRate: participationRate,
        isInGracePeriod,
      });
    } catch (err: any) {
      console.error("[ARENA] Enter error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to enter contest" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/vote — Listener votes for an artist (Option A+ Lock Policy)
//
// Flow:
//   1. Listener streams an artist's track → calls this to register the vote
//   2. First vote is "soft" for 6 hours (can be changed/reallocated)
//   3. After 3rd stream for same artist OR 6h grace window → vote LOCKS
//   4. Locked votes are permanent for that contest round
//   5. contest_votes table tracks lock state; arena_votes tracks totals
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/:id/vote", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);
    const contestId = parseInt(req.params.id);
    const { artistProfileId } = req.body;

    if (!artistProfileId) {
      return res
        .status(400)
        .json({ success: false, error: "artistProfileId required" });
    }

    // Verify contest is in_progress
    const contest = await pool.query(
      `SELECT * FROM arena_contests WHERE id = $1 AND status = 'in_progress'`,
      [contestId],
    );
    if (contest.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Contest not active" });
    }

    const currentRound = contest.rows[0].current_round;

    // Verify artist is in current round and not eliminated
    const bracket = await pool.query(
      `SELECT id FROM arena_brackets
       WHERE contest_id = $1 AND round = $2 AND artist_profile_id = $3 AND eliminated = false`,
      [contestId, currentRound, artistProfileId],
    );
    if (bracket.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Artist not in current round or has been eliminated",
      });
    }

    // Check total votes used in this contest (across all artists)
    const usedVotes = await pool.query(
      `SELECT COALESCE(SUM(stream_count), 0) as used FROM arena_votes
       WHERE contest_id = $1 AND user_id = $2`,
      [contestId, userId],
    );
    const totalUsed = parseInt(usedVotes.rows[0].used);
    if (totalUsed >= MAX_VOTES_PER_LISTENER) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_VOTES_PER_LISTENER} stream-votes reached in this contest`,
        votesRemaining: 0,
      });
    }

    // ── Option A+ Lock Policy ──
    // Check if there's an existing contest_vote for this user+contest+artist
    const existingVote = await pool.query(
      `SELECT * FROM contest_votes
       WHERE user_id = $1 AND contest_id = $2 AND artist_profile_id = $3`,
      [userId, contestId, artistProfileId],
    );

    let voteStatus = "soft";
    let streamCount = 1;
    let isNewlyLocked = false;

    if (existingVote.rows.length > 0) {
      const cv = existingVote.rows[0];
      streamCount = (parseInt(cv.stream_count) || 0) + 1;
      voteStatus = cv.vote_status;

      // If already locked, just increment stream count (vote is permanent)
      if (voteStatus === "locked") {
        await pool.query(
          `UPDATE contest_votes SET stream_count = $1 WHERE id = $2`,
          [streamCount, cv.id],
        );
      } else {
        // Still in soft phase — check if we should lock
        const createdAt = new Date(cv.created_at);
        const hoursElapsed =
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        const shouldLock =
          streamCount >= LOCK_STREAM_THRESHOLD ||
          hoursElapsed >= SOFT_VOTE_WINDOW_HOURS;

        if (shouldLock) {
          voteStatus = "locked";
          isNewlyLocked = true;
          await pool.query(
            `UPDATE contest_votes SET stream_count = $1, vote_status = 'locked', locked_at = NOW()
             WHERE id = $2`,
            [streamCount, cv.id],
          );
        } else {
          await pool.query(
            `UPDATE contest_votes SET stream_count = $1 WHERE id = $2`,
            [streamCount, cv.id],
          );
        }
      }
    } else {
      // First vote for this artist — always starts as "soft"
      await pool.query(
        `INSERT INTO contest_votes (user_id, contest_id, artist_profile_id, stream_count, vote_status)
         VALUES ($1, $2, $3, 1, 'soft')`,
        [userId, contestId, artistProfileId],
      );
    }

    // Update arena_votes aggregate (upsert)
    await pool.query(
      `INSERT INTO arena_votes (contest_id, user_id, artist_profile_id, stream_count, locked)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT ON CONSTRAINT arena_votes_unique DO UPDATE
       SET stream_count = arena_votes.stream_count + 1,
           locked = EXCLUDED.locked OR arena_votes.locked`,
      [contestId, userId, artistProfileId, voteStatus === "locked"],
    );

    // Update bracket vote_count + streams for this artist in current round
    await pool.query(
      `UPDATE arena_brackets SET vote_count = vote_count + 1, streams = streams + 1
       WHERE contest_id = $1 AND round = $2 AND artist_profile_id = $3`,
      [contestId, currentRound, artistProfileId],
    );

    // Update total_votes on the contest
    await pool.query(
      `UPDATE arena_contests SET total_votes = COALESCE(total_votes, 0) + 1 WHERE id = $1`,
      [contestId],
    );

    // ── Award XP to listener for voting ──
    // Only award XP once per unique vote (not per stream)
    if (existingVote.rows.length === 0) {
      // First vote for this artist — award 25 XP
      await pool
        .query(
          `INSERT INTO listener_stats (user_id, total_points)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           total_points = COALESCE(listener_stats.total_points, 0) + $2`,
          [userId, XP_REWARDS.VOTE],
        )
        .catch(() => {});

      // Log activity
      await pool
        .query(
          `INSERT INTO listener_activity (user_id, activity_type, description, points_earned)
         VALUES ($1, 'vote', $2, $3)`,
          [userId, `Voted in arena contest`, XP_REWARDS.VOTE],
        )
        .catch(() => {});

      // Create contest reward record for tracking
      await pool
        .query(
          `INSERT INTO listener_contest_rewards (user_id, contest_id, artist_profile_id, reward_type, xp_awarded, claimed)
         VALUES ($1, $2, $3, 'vote', $4, true)
         ON CONFLICT ON CONSTRAINT listener_contest_rewards_unique DO NOTHING`,
          [userId, contestId, artistProfileId, XP_REWARDS.VOTE],
        )
        .catch(() => {});
    }

    res.json({
      success: true,
      message: isNewlyLocked
        ? `🔒 Vote locked for this artist after ${streamCount} streams!`
        : `Stream-vote recorded (${voteStatus})`,
      voteStatus,
      streamCount,
      isNewlyLocked,
      votesRemaining: MAX_VOTES_PER_LISTENER - totalUsed - 1,
      xpAwarded: existingVote.rows.length === 0 ? XP_REWARDS.VOTE : 0,
      lockInfo: {
        threshold: LOCK_STREAM_THRESHOLD,
        graceWindowHours: SOFT_VOTE_WINDOW_HOURS,
        streamsUntilLock:
          voteStatus === "locked"
            ? 0
            : Math.max(0, LOCK_STREAM_THRESHOLD - streamCount),
      },
    });
  } catch (err: any) {
    console.error("[ARENA] Vote error:", err);
    res.status(500).json({ success: false, error: "Failed to record vote" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /:id/my-votes — My vote allocations + lock status
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  "/:id/my-votes",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.user!.userId);
      const contestId = parseInt(req.params.id);

      // Get contest_votes (detailed lock status per artist)
      const votes = await pool.query(
        `SELECT cv.*, ap.stage_name, ap.profile_image_url
         FROM contest_votes cv
         LEFT JOIN artist_profiles ap ON ap.id = cv.artist_profile_id
         WHERE cv.user_id = $1 AND cv.contest_id = $2
         ORDER BY cv.stream_count DESC`,
        [userId, contestId],
      );

      const totalUsed = votes.rows.reduce(
        (sum: number, r: any) => sum + (parseInt(r.stream_count) || 0),
        0,
      );

      const lockedCount = votes.rows.filter(
        (v: any) => v.vote_status === "locked",
      ).length;
      const softCount = votes.rows.filter(
        (v: any) => v.vote_status === "soft",
      ).length;

      res.json({
        success: true,
        votes: votes.rows.map((v: any) => ({
          ...v,
          canChange: v.vote_status === "soft",
          streamsUntilLock:
            v.vote_status === "locked"
              ? 0
              : Math.max(
                  0,
                  LOCK_STREAM_THRESHOLD - (parseInt(v.stream_count) || 0),
                ),
        })),
        totalUsed,
        remaining: MAX_VOTES_PER_LISTENER - totalUsed,
        maxVotes: MAX_VOTES_PER_LISTENER,
        lockedVotes: lockedCount,
        softVotes: softCount,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Failed to fetch votes" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/admin-unlock — Admin: unlock a locked vote
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/:id/admin-unlock",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const contestId = parseInt(req.params.id);
      const adminId = parseInt(req.user!.userId);
      const { userId, artistProfileId, reason } = req.body;

      if (!userId || !artistProfileId || !reason) {
        return res.status(400).json({
          success: false,
          error: "userId, artistProfileId, and reason required",
        });
      }

      const result = await pool.query(
        `UPDATE contest_votes
         SET vote_status = 'admin_unlocked', admin_unlock_reason = $1, unlocked_by = $2
         WHERE user_id = $3 AND contest_id = $4 AND artist_profile_id = $5 AND vote_status = 'locked'
         RETURNING *`,
        [reason, adminId, userId, contestId, artistProfileId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No locked vote found for this user/artist combination",
        });
      }

      // Also unlock in arena_votes
      await pool.query(
        `UPDATE arena_votes SET locked = false
         WHERE contest_id = $1 AND user_id = $2 AND artist_profile_id = $3`,
        [contestId, userId, artistProfileId],
      );

      res.json({
        success: true,
        message: `Vote unlocked for user ${userId} → artist ${artistProfileId}`,
        vote: result.rows[0],
      });
    } catch (err: any) {
      console.error("[ARENA] Admin unlock error:", err);
      res.status(500).json({ success: false, error: "Failed to unlock vote" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/advance-round — Admin: eliminate bottom half, advance winners
//
// Per-artist model: sort by (vote_count + streams), bottom half → eliminated
// Winners get new bracket rows for the next round.
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/:id/advance-round",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const contestId = parseInt(req.params.id);

      const contest = await pool.query(
        `SELECT * FROM arena_contests WHERE id = $1 AND status = 'in_progress'`,
        [contestId],
      );
      if (contest.rows.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Contest not active" });
      }

      const currentRound = contest.rows[0].current_round;

      // Get all non-eliminated entries in current round, sorted by performance
      const entries = await pool.query(
        `SELECT ab.*, ap.stage_name
         FROM arena_brackets ab
         LEFT JOIN artist_profiles ap ON ap.id = ab.artist_profile_id
         WHERE ab.contest_id = $1 AND ab.round = $2 AND ab.eliminated = false
         ORDER BY (ab.vote_count + ab.streams) DESC, ab.vote_count DESC`,
        [contestId, currentRound],
      );

      if (entries.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No active entries in current round",
        });
      }

      const total = entries.rows.length;
      const halfwayMark = Math.ceil(total / 2);
      const winners = entries.rows.slice(0, halfwayMark);
      const eliminated = entries.rows.slice(halfwayMark);

      // Mark bottom half as eliminated
      for (const e of eliminated) {
        await pool.query(
          `UPDATE arena_brackets SET eliminated = true, eliminated_at = NOW()
           WHERE id = $1`,
          [e.id],
        );
      }

      const nextRound = currentRound + 1;

      // Check if this was the final round (only 2 artists → 1 winner)
      if (winners.length <= 1 || currentRound >= 4) {
        const champion = winners[0];

        // Credit bonus pool to champion's wallet
        const bonusPercent = contest.rows[0].bonus_pool_percent || 30;
        const champProfile = await pool.query(
          `SELECT user_id FROM artist_profiles WHERE id = $1`,
          [champion.artist_profile_id],
        );
        if (champProfile.rows.length > 0) {
          // Note: actual bonus amount depends on the weekly pool — this marks the winner
          await pool.query(
            `UPDATE arena_contests SET status = 'completed', winner_id = $1 WHERE id = $2`,
            [champion.artist_profile_id, contestId],
          );
        } else {
          await pool.query(
            `UPDATE arena_contests SET status = 'completed', winner_id = $1 WHERE id = $2`,
            [champion.artist_profile_id, contestId],
          );
        }

        return res.json({
          success: true,
          message: `🏆 Arena complete! Champion: ${champion.stage_name}`,
          champion: {
            artistProfileId: champion.artist_profile_id,
            stageName: champion.stage_name,
            totalVotes: champion.vote_count,
            totalStreams: champion.streams,
          },
          eliminated: eliminated.map((e: any) => ({
            artistProfileId: e.artist_profile_id,
            stageName: e.stage_name,
          })),
          bonusPoolPercent: bonusPercent,
        });
      }

      // Create next round bracket entries for winners
      let seed = 1;
      for (const w of winners) {
        await pool.query(
          `INSERT INTO arena_brackets (contest_id, round, artist_profile_id, streams, vote_count, eliminated, seed_position)
           VALUES ($1, $2, $3, 0, 0, false, $4)`,
          [contestId, nextRound, w.artist_profile_id, seed],
        );
        seed++;
      }

      // Advance contest round
      await pool.query(
        `UPDATE arena_contests SET current_round = $1 WHERE id = $2`,
        [nextRound, contestId],
      );

      res.json({
        success: true,
        message: `Round ${currentRound} complete → ${ROUND_NAMES[nextRound - 1] || `Round ${nextRound}`} begins`,
        advanced: winners.map((w: any) => ({
          artistProfileId: w.artist_profile_id,
          stageName: w.stage_name,
          score: w.vote_count + w.streams,
        })),
        eliminated: eliminated.map((e: any) => ({
          artistProfileId: e.artist_profile_id,
          stageName: e.stage_name,
          score: e.vote_count + e.streams,
        })),
        nextRound,
        nextRoundName: ROUND_NAMES[nextRound - 1],
      });
    } catch (err: any) {
      console.error("[ARENA] Advance error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to advance round" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /history — Past contests with winners
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/history", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const result = await pool.query(
      `SELECT ac.*, ap.stage_name as winner_name, ap.profile_image_url as winner_image
       FROM arena_contests ac
       LEFT JOIN artist_profiles ap ON ap.id = ac.winner_id
       WHERE ac.status = 'completed'
       ORDER BY ac.week_start DESC
       LIMIT $1 OFFSET $2`,
      [limitNum, offset],
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM arena_contests WHERE status = 'completed'`,
    );

    res.json({
      success: true,
      contests: result.rows,
      total: parseInt(count.rows[0].count),
      page: pageNum,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limitNum),
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch arena history" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /eligible-artists — Artists eligible for upcoming contests
// Returns artists with badge tier ≥ Silver (3) sorted by participation rate
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/eligible-artists", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
         ap.id,
         ap.user_id,
         ap.stage_name,
         ap.profile_image_url,
         ap.division,
         ap.current_badge_tier,
         ap.lifetime_streams,
         ap.weekly_streams,
         ap.contest_participation_rate,
         ap.contests_entered,
         ap.contests_won,
         ap.contests_skipped,
         ap.contest_exempt_until,
         ap.created_at,
         CASE 
           WHEN ap.contest_exempt_until > NOW() THEN true
           WHEN (NOW() - ap.created_at) < INTERVAL '90 days' THEN true
           ELSE false
         END as is_in_grace_period,
         CASE
           WHEN COALESCE(ap.contest_participation_rate, 0) >= 20 THEN 'compliant'
           WHEN ap.contest_exempt_until > NOW() OR (NOW() - ap.created_at) < INTERVAL '90 days' THEN 'exempt'
           ELSE 'at_risk'
         END as participation_status
       FROM artist_profiles ap
       WHERE ap.is_active = true 
         AND ap.current_badge_tier >= 3
       ORDER BY ap.contest_participation_rate DESC NULLS LAST, ap.lifetime_streams DESC
       LIMIT 100`,
    );

    res.json({
      success: true,
      artists: result.rows,
      count: result.rows.length,
      thresholds: {
        minBadgeTier: 3,
        minParticipationRate: MIN_PARTICIPATION_RATE,
        gracePeriodDays: GRACE_PERIOD_DAYS,
      },
    });
  } catch (err: any) {
    console.error("[ARENA] Eligible artists error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch eligible artists" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /:id/award-predictions — Award XP to users who voted for winner (admin)
// Called when a contest is completed
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  "/:id/award-predictions",
  requireAuth(["admin"]),
  async (req: Request, res: Response) => {
    try {
      const contestId = parseInt(req.params.id);

      // Get contest with winner
      const contest = await pool.query(
        `SELECT * FROM arena_contests WHERE id = $1 AND status = 'completed'`,
        [contestId],
      );
      if (contest.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Contest not found or not completed",
        });
      }

      const winnerId = contest.rows[0].winner_id;
      if (!winnerId) {
        return res.status(400).json({
          success: false,
          error: "Contest has no winner set",
        });
      }

      // Find all users who voted for the winner
      const votersResult = await pool.query(
        `SELECT DISTINCT av.user_id 
         FROM arena_votes av
         WHERE av.contest_id = $1 AND av.artist_profile_id = $2`,
        [contestId, winnerId],
      );

      let awardedCount = 0;

      for (const voter of votersResult.rows) {
        // Check if already awarded
        const existing = await pool.query(
          `SELECT id FROM listener_contest_rewards 
           WHERE user_id = $1 AND contest_id = $2 AND reward_type = 'prediction_correct'`,
          [voter.user_id, contestId],
        );

        if (existing.rows.length === 0) {
          // Award prediction XP
          await pool
            .query(
              `INSERT INTO listener_stats (user_id, total_points)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET
               total_points = COALESCE(listener_stats.total_points, 0) + $2`,
              [voter.user_id, XP_REWARDS.PREDICTION_CORRECT],
            )
            .catch(() => {});

          // Log activity
          await pool
            .query(
              `INSERT INTO listener_activity (user_id, activity_type, description, points_earned)
             VALUES ($1, 'prediction', $2, $3)`,
              [
                voter.user_id,
                `Correct arena prediction! Voted for the winner`,
                XP_REWARDS.PREDICTION_CORRECT,
              ],
            )
            .catch(() => {});

          // Create reward record
          await pool
            .query(
              `INSERT INTO listener_contest_rewards (user_id, contest_id, artist_profile_id, reward_type, xp_awarded, claimed)
             VALUES ($1, $2, $3, 'prediction_correct', $4, true)`,
              [
                voter.user_id,
                contestId,
                winnerId,
                XP_REWARDS.PREDICTION_CORRECT,
              ],
            )
            .catch(() => {});

          awardedCount++;
        }
      }

      // Also award underdog XP to those who supported eliminated artists (consolation)
      const underdogResult = await pool.query(
        `SELECT DISTINCT av.user_id, av.artist_profile_id
         FROM arena_votes av
         JOIN arena_brackets ab ON ab.contest_id = av.contest_id AND ab.artist_profile_id = av.artist_profile_id
         WHERE av.contest_id = $1 AND ab.eliminated = true`,
        [contestId],
      );

      let underdogCount = 0;
      for (const underdog of underdogResult.rows) {
        const existing = await pool.query(
          `SELECT id FROM listener_contest_rewards 
           WHERE user_id = $1 AND contest_id = $2 AND reward_type = 'underdog'`,
          [underdog.user_id, contestId],
        );

        if (existing.rows.length === 0) {
          await pool
            .query(
              `INSERT INTO listener_stats (user_id, total_points)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET
               total_points = COALESCE(listener_stats.total_points, 0) + $2`,
              [underdog.user_id, XP_REWARDS.UNDERDOG],
            )
            .catch(() => {});

          await pool
            .query(
              `INSERT INTO listener_activity (user_id, activity_type, description, points_earned)
             VALUES ($1, 'achievement', $2, $3)`,
              [
                underdog.user_id,
                `Underdog supporter bonus`,
                XP_REWARDS.UNDERDOG,
              ],
            )
            .catch(() => {});

          await pool
            .query(
              `INSERT INTO listener_contest_rewards (user_id, contest_id, artist_profile_id, reward_type, xp_awarded, claimed)
             VALUES ($1, $2, $3, 'underdog', $4, true)`,
              [
                underdog.user_id,
                contestId,
                underdog.artist_profile_id,
                XP_REWARDS.UNDERDOG,
              ],
            )
            .catch(() => {});

          underdogCount++;
        }
      }

      res.json({
        success: true,
        message: `Prediction rewards distributed`,
        winnerId,
        predictionWinners: awardedCount,
        xpPerWinner: XP_REWARDS.PREDICTION_CORRECT,
        underdogBonuses: underdogCount,
        xpPerUnderdog: XP_REWARDS.UNDERDOG,
      });
    } catch (err: any) {
      console.error("[ARENA] Award predictions error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to award predictions" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /participation-stats — Platform-wide participation statistics
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/participation-stats", async (_req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE current_badge_tier >= 3) as eligible_artists,
        COUNT(*) FILTER (WHERE current_badge_tier >= 3 AND COALESCE(contest_participation_rate, 0) >= 20) as compliant_artists,
        COUNT(*) FILTER (WHERE current_badge_tier >= 3 AND COALESCE(contest_participation_rate, 0) < 20 
          AND contest_exempt_until IS NULL 
          AND (NOW() - created_at) >= INTERVAL '90 days') as at_risk_artists,
        AVG(COALESCE(contest_participation_rate, 0)) FILTER (WHERE current_badge_tier >= 3) as avg_participation_rate,
        SUM(COALESCE(contests_entered, 0)) as total_contest_entries,
        SUM(COALESCE(contests_won, 0)) as total_contest_wins
      FROM artist_profiles
      WHERE is_active = true
    `);

    const contestStats = await pool.query(`
      SELECT 
        COUNT(*) as total_contests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_contests,
        SUM(COALESCE(total_votes, 0)) as total_votes_all_time
      FROM arena_contests
    `);

    res.json({
      success: true,
      artists: stats.rows[0],
      contests: contestStats.rows[0],
      thresholds: {
        minParticipationRate: MIN_PARTICIPATION_RATE,
        gracePeriodDays: GRACE_PERIOD_DAYS,
        minContestsPerQuarter: MIN_CONTESTS_PER_QUARTER,
      },
    });
  } catch (err: any) {
    console.error("[ARENA] Participation stats error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

export default router;

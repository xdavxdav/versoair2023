import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { getIO } from "../websocket/socket-config";
import { distributeWeeklyPool } from "../services/royalty-engine.ts";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// 🎵 STREAMROYALE API — Competition Streaming Platform
// ═══════════════════════════════════════════════════════════════════════════════

// --- Helpers ---
function getWeekNumber(d: Date = new Date()): { week: number; year: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { week: weekNo, year: date.getUTCFullYear() };
}

// In-memory stream sessions for heartbeat tracking
const activeSessions = new Map<
  string,
  {
    userId: number;
    trackId: number;
    artistProfileId: number | null;
    elapsed: number;
    lastPing: number;
    boosted: boolean;
    superStream: boolean;
    ipAddress: string;
  }
>();

// Cleanup stale sessions every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [sessionId, session] of activeSessions.entries()) {
      if (now - session.lastPing > 5 * 60 * 1000) {
        activeSessions.delete(sessionId);
      }
    }
  },
  5 * 60 * 1000,
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-MIGRATION: Ensure StreamRoyale tables exist
// ═══════════════════════════════════════════════════════════════════════════════
let tablesEnsured = false;

async function ensureStreamRoyaleTables() {
  if (tablesEnsured) return;
  try {
    // Check if artist_profiles table exists
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'artist_profiles'
      ) as exists
    `);
    if (!check.rows[0]?.exists) {
      console.log("🎵 [STREAMROYALE] Creating StreamRoyale tables...");

      await pool.query(`
        CREATE TABLE IF NOT EXISTS regional_leagues (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          icon_url TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS artist_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
          stage_name TEXT NOT NULL,
          legal_name TEXT,
          genre JSONB DEFAULT '[]',
          country VARCHAR(100),
          country_code VARCHAR(2),
          bio TEXT,
          spotify_url TEXT,
          instagram_handle TEXT,
          profile_image_url TEXT,
          league_id INTEGER,
          lifetime_streams INTEGER DEFAULT 0,
          weekly_streams INTEGER DEFAULT 0,
          current_badge_tier INTEGER DEFAULT 1,
          wallet_balance DECIMAL(12,2) DEFAULT 0.00,
          payout_email TEXT,
          payout_method VARCHAR(20) DEFAULT 'paypal',
          verified_for_payout BOOLEAN DEFAULT false,
          revenue_boost_percent DECIMAL(4,2) DEFAULT 0.00,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS streaming_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          monthly_fee DECIMAL(8,2) NOT NULL,
          stream_limit INTEGER,
          pool_contribution_percent INTEGER NOT NULL,
          boost_credits INTEGER DEFAULT 0,
          stripe_price_id VARCHAR(255),
          stripe_product_id VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS listener_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          plan_id INTEGER REFERENCES streaming_plans(id) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          stripe_subscription_id VARCHAR(255),
          current_period_start TIMESTAMP,
          current_period_end TIMESTAMP,
          boost_credits_remaining INTEGER DEFAULT 0,
          cancelled_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS stream_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER REFERENCES users(id),
          track_id INTEGER,
          artist_profile_id INTEGER,
          session_id VARCHAR(64),
          duration INTEGER NOT NULL,
          is_valid BOOLEAN DEFAULT false,
          is_self_stream BOOLEAN DEFAULT false,
          boosted BOOLEAN DEFAULT false,
          boost_multiplier DECIMAL(4,2) DEFAULT 1.00,
          super_stream BOOLEAN DEFAULT false,
          week_number INTEGER NOT NULL,
          year_number INTEGER NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS weekly_pools (
          id SERIAL PRIMARY KEY,
          week_number INTEGER NOT NULL,
          year_number INTEGER NOT NULL,
          total_pool DECIMAL(12,2) DEFAULT 0.00,
          guaranteed_fund DECIMAL(12,2) DEFAULT 0.00,
          performance_pool DECIMAL(12,2) DEFAULT 0.00,
          platform_cut DECIMAL(12,2) DEFAULT 0.00,
          total_streams INTEGER DEFAULT 0,
          qualifying_artists INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'open',
          distributed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(week_number, year_number)
        );

        CREATE TABLE IF NOT EXISTS artist_royalties (
          id SERIAL PRIMARY KEY,
          artist_profile_id INTEGER REFERENCES artist_profiles(id) ON DELETE CASCADE NOT NULL,
          week_number INTEGER NOT NULL,
          year_number INTEGER NOT NULL,
          guaranteed_amount DECIMAL(12,2) DEFAULT 0.00,
          performance_amount DECIMAL(12,2) DEFAULT 0.00,
          badge_bonus DECIMAL(12,2) DEFAULT 0.00,
          tip_income DECIMAL(12,2) DEFAULT 0.00,
          total_earnings DECIMAL(12,2) DEFAULT 0.00,
          stream_count INTEGER DEFAULT 0,
          pool_share_percent DECIMAL(8,4) DEFAULT 0.00,
          global_rank INTEGER,
          regional_rank INTEGER,
          paid_out BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(artist_profile_id, week_number, year_number)
        );

        CREATE TABLE IF NOT EXISTS artist_badges (
          id SERIAL PRIMARY KEY,
          artist_profile_id INTEGER REFERENCES artist_profiles(id) ON DELETE CASCADE NOT NULL,
          tier INTEGER NOT NULL,
          badge_name VARCHAR(50) NOT NULL,
          lifetime_streams_at_unlock INTEGER DEFAULT 0,
          revenue_boost_percent DECIMAL(4,2) DEFAULT 0.00,
          unlocked_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS payout_requests (
          id SERIAL PRIMARY KEY,
          artist_profile_id INTEGER REFERENCES artist_profiles(id) ON DELETE CASCADE NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          method VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          paypal_email TEXT,
          bank_details JSONB,
          notes TEXT,
          processed_at TIMESTAMP,
          processed_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Seed regional leagues
      await pool.query(`
        INSERT INTO regional_leagues (name, description) VALUES
          ('Africa', 'Artists from the African continent'),
          ('Americas', 'Artists from North, Central, and South America'),
          ('Asia-Pacific', 'Artists from Asia, Australia, and the Pacific'),
          ('Europe', 'Artists from Europe'),
          ('Middle East', 'Artists from the Middle East region')
        ON CONFLICT (name) DO NOTHING;
      `);

      // Seed streaming plans (Streamer tiers only - no Artist tiers here)
      await pool.query(`
        INSERT INTO streaming_plans (name, monthly_fee, stream_limit, pool_contribution_percent, boost_credits) VALUES
          ('Gratuit', 0, 20, 0, 0),
          ('Supporter', 4.99, 300, 70, 0),
          ('Champion', 9.99, 1500, 75, 5),
          ('Patron', 19.99, NULL, 80, 20)
        ON CONFLICT (name) DO NOTHING;
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS stream_events_user_idx ON stream_events(user_id);
        CREATE INDEX IF NOT EXISTS stream_events_track_idx ON stream_events(track_id);
        CREATE INDEX IF NOT EXISTS stream_events_week_idx ON stream_events(week_number, year_number);
        CREATE INDEX IF NOT EXISTS stream_events_valid_idx ON stream_events(is_valid);
        CREATE INDEX IF NOT EXISTS artist_profiles_user_idx ON artist_profiles(user_id);
        CREATE INDEX IF NOT EXISTS artist_profiles_league_idx ON artist_profiles(league_id);
        CREATE INDEX IF NOT EXISTS artist_profiles_streams_idx ON artist_profiles(lifetime_streams);
        CREATE INDEX IF NOT EXISTS weekly_pools_status_idx ON weekly_pools(status);
        CREATE INDEX IF NOT EXISTS artist_royalties_week_idx ON artist_royalties(week_number, year_number);
        CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON payout_requests(status);
      `);

      console.log("✅ [STREAMROYALE] All tables created and seeded");
    }
    tablesEnsured = true;
  } catch (err) {
    console.warn("⚠️ [STREAMROYALE] Auto-migration warning:", err);
    tablesEnsured = true; // Don't retry endlessly
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAM TRACKING — Heartbeat + Completion
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/streamroyale/stream/heartbeat
 * Client sends every 10 seconds during playback
 */
router.post(
  "/stream/heartbeat",
  optionalAuth,
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const { trackId, sessionId, elapsed, boosted, superStream } = req.body;
    const userId = req.user ? parseInt(req.user.userId) : null;

    if (!trackId || !sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "trackId and sessionId required" });
    }

    // Get artist profile ID for the track
    let artistProfileId: number | null = null;
    try {
      const trackResult = await pool.query(
        `SELECT mt.artist_id, ap.id as profile_id 
       FROM music_tracks mt 
       LEFT JOIN artist_profiles ap ON ap.user_id = mt.artist_id
       WHERE mt.id = $1`,
        [trackId],
      );
      if (trackResult.rows[0]?.profile_id) {
        artistProfileId = trackResult.rows[0].profile_id;
      }
    } catch (e) {
      // Skip
    }

    activeSessions.set(sessionId, {
      userId: userId || 0,
      trackId,
      artistProfileId,
      elapsed: parseInt(elapsed) || 0,
      lastPing: Date.now(),
      boosted: !!boosted,
      superStream: !!superStream,
      ipAddress: req.ip || req.socket.remoteAddress || "unknown",
    });

    res.json({ success: true, sessionId, elapsed });
  },
);

/**
 * POST /api/streamroyale/stream/complete
 * Client sends when track finishes or user navigates away
 */
router.post(
  "/stream/complete",
  optionalAuth,
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const { sessionId, duration } = req.body;

    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId required" });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found or expired" });
    }

    const finalDuration = duration || session.elapsed;
    const isValid = finalDuration >= 30; // 30-second minimum
    const { week, year } = getWeekNumber();
    const userId = session.userId;

    // Self-stream check
    let isSelfStream = false;
    if (userId && session.artistProfileId) {
      try {
        const selfCheck = await pool.query(
          `SELECT id FROM artist_profiles WHERE id = $1 AND user_id = $2`,
          [session.artistProfileId, userId],
        );
        isSelfStream = selfCheck.rows.length > 0;
      } catch (e) {
        // Skip
      }
    }

    // Self-stream cap: max 50/week
    if (isSelfStream && isValid) {
      try {
        const selfStreamCount = await pool.query(
          `SELECT COUNT(*) as count FROM stream_events 
         WHERE user_id = $1 AND is_self_stream = true AND is_valid = true
         AND week_number = $2 AND year_number = $3`,
          [userId, week, year],
        );
        if (parseInt(selfStreamCount.rows[0]?.count || "0") >= 50) {
          activeSessions.delete(sessionId);
          return res.json({
            success: true,
            message: "Self-stream cap reached (50/week)",
            isValid: false,
            counted: false,
          });
        }
      } catch (e) {
        // Skip
      }
    }

    // Deduplicate: same user+track within 5 minutes
    if (isValid && userId) {
      try {
        const dedupCheck = await pool.query(
          `SELECT id FROM stream_events 
         WHERE user_id = $1 AND track_id = $2 AND is_valid = true
         AND created_at > NOW() - INTERVAL '5 minutes'
         LIMIT 1`,
          [userId, session.trackId],
        );
        if (dedupCheck.rows.length > 0) {
          activeSessions.delete(sessionId);
          return res.json({
            success: true,
            message: "Duplicate stream within 5 minutes",
            isValid: false,
            counted: false,
          });
        }
      } catch (e) {
        // Skip
      }
    }

    // Calculate boost multiplier
    let boostMultiplier = 1.0;
    if (session.boosted) boostMultiplier = 2.0;
    if (session.superStream) boostMultiplier = 5.0;

    // Insert stream event
    try {
      await pool.query(
        `INSERT INTO stream_events 
       (user_id, track_id, artist_profile_id, session_id, duration, is_valid, is_self_stream, 
        boosted, boost_multiplier, super_stream, week_number, year_number, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          userId || null,
          session.trackId,
          session.artistProfileId,
          sessionId,
          finalDuration,
          isValid,
          isSelfStream,
          session.boosted,
          boostMultiplier,
          session.superStream,
          week,
          year,
          session.ipAddress,
          req.headers["user-agent"] || null,
        ],
      );

      // If valid, update pool and artist stats
      if (isValid && session.artistProfileId && !isSelfStream) {
        // Increment artist streams (only for real listeners, NOT self-streams)
        await pool.query(
          `UPDATE artist_profiles SET 
         lifetime_streams = COALESCE(lifetime_streams, 0) + 1,
         weekly_streams = COALESCE(weekly_streams, 0) + 1,
         updated_at = NOW()
         WHERE id = $1`,
          [session.artistProfileId],
        );

        // Update track play count
        await pool.query(
          `UPDATE music_tracks SET play_count = COALESCE(play_count, 0) + 1 WHERE id = $1`,
          [session.trackId],
        );

        // Update weekly pool stream count
        await pool.query(
          `INSERT INTO weekly_pools (week_number, year_number, total_streams, status) 
         VALUES ($1, $2, 1, 'open')
         ON CONFLICT (week_number, year_number) 
         DO UPDATE SET total_streams = weekly_pools.total_streams + 1`,
          [week, year],
        );

        // Check badge milestones (fire-and-forget)
        checkBadgeMilestone(session.artistProfileId).catch(() => {});
      }
    } catch (err) {
      console.error("[STREAMROYALE] Error recording stream:", err);
    }

    activeSessions.delete(sessionId);

    res.json({
      success: true,
      isValid,
      counted: isValid,
      duration: finalDuration,
      boostMultiplier,
    });
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE ENGINE — Check milestones and promote
// ═══════════════════════════════════════════════════════════════════════════════

const BADGE_TIERS = [
  { tier: 1, name: "Initiate", threshold: 0, boost: 0 },
  { tier: 2, name: "Bronze Warrior", threshold: 1000, boost: 0 },
  { tier: 3, name: "Silver Gladiator", threshold: 10000, boost: 0 },
  { tier: 4, name: "Gold Champion", threshold: 50000, boost: 0 },
  { tier: 5, name: "Platinum Conqueror", threshold: 250000, boost: 0 },
  { tier: 6, name: "Diamond Warlord", threshold: 1000000, boost: 2 },
  { tier: 7, name: "Legendary Titan", threshold: 5000000, boost: 5 },
];

async function checkBadgeMilestone(artistProfileId: number) {
  try {
    const result = await pool.query(
      `SELECT lifetime_streams, current_badge_tier, user_id FROM artist_profiles WHERE id = $1`,
      [artistProfileId],
    );
    if (result.rows.length === 0) return;

    const { lifetime_streams, current_badge_tier, user_id } = result.rows[0];
    const streams = parseInt(lifetime_streams) || 0;
    const currentTier = parseInt(current_badge_tier) || 1;

    // Find highest tier the artist qualifies for
    let newTier = 1;
    for (const badge of BADGE_TIERS) {
      if (streams >= badge.threshold) newTier = badge.tier;
    }

    if (newTier > currentTier) {
      const badge = BADGE_TIERS[newTier - 1];

      // Update artist profile
      await pool.query(
        `UPDATE artist_profiles SET 
         current_badge_tier = $1, 
         revenue_boost_percent = $2,
         updated_at = NOW()
         WHERE id = $3`,
        [newTier, badge.boost, artistProfileId],
      );

      // Record badge unlock
      await pool.query(
        `INSERT INTO artist_badges (artist_profile_id, tier, badge_name, lifetime_streams_at_unlock, revenue_boost_percent)
         VALUES ($1, $2, $3, $4, $5)`,
        [artistProfileId, newTier, badge.name, streams, badge.boost],
      );

      // Notify artist
      const io = getIO();
      if (io && user_id) {
        io.to(`user_${user_id}`).emit("notification", {
          id: `badge-${newTier}-${Date.now()}`,
          type: "badge_unlocked",
          title: `🏆 Badge Unlocked: ${badge.name}!`,
          message: `You've reached ${streams.toLocaleString()} lifetime streams!${badge.boost > 0 ? ` +${badge.boost}% revenue boost!` : ""}`,
          timestamp: new Date().toISOString(),
          read: false,
        });

        // Also insert into notifications table
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              user_id,
              "badge_unlocked",
              `🏆 Badge Unlocked: ${badge.name}!`,
              `You've reached ${streams.toLocaleString()} lifetime streams!`,
              "/artist-portal/dashboard?tab=royalties",
            ],
          );
        } catch (e) {
          // Skip if notifications table missing
        }
      }

      console.log(
        `🏆 [STREAMROYALE] Artist ${artistProfileId} promoted to ${badge.name} (tier ${newTier})`,
      );
    }
  } catch (err) {
    console.error("[STREAMROYALE] Badge check error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POOL & LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/streamroyale/pool/current
 * Live pool stats for the current week
 */
router.get("/pool/current", async (req: Request, res: Response) => {
  await ensureStreamRoyaleTables();
  const { week, year } = getWeekNumber();

  try {
    // Get or create current week pool
    const result = await pool.query(
      `INSERT INTO weekly_pools (week_number, year_number, status)
       VALUES ($1, $2, 'open')
       ON CONFLICT (week_number, year_number) DO UPDATE SET week_number = $1
       RETURNING *`,
      [week, year],
    );

    const poolData = result.rows[0];

    // Count qualifying artists this week
    const artistCount = await pool.query(
      `SELECT COUNT(DISTINCT artist_profile_id) as count 
       FROM stream_events 
       WHERE week_number = $1 AND year_number = $2 AND is_valid = true`,
      [week, year],
    );

    // Total active artists
    const totalArtists = await pool.query(
      `SELECT COUNT(*) as count FROM artist_profiles WHERE is_active = true`,
    );

    // Total listeners with active subs
    const totalListeners = await pool.query(
      `SELECT COUNT(*) as count FROM listener_subscriptions WHERE status = 'active'`,
    );

    res.json({
      success: true,
      pool: {
        weekNumber: week,
        yearNumber: year,
        totalPool: parseFloat(poolData.total_pool) || 0,
        guaranteedFund: parseFloat(poolData.guaranteed_fund) || 0,
        performancePool: parseFloat(poolData.performance_pool) || 0,
        platformCut: parseFloat(poolData.platform_cut) || 0,
        totalStreams: parseInt(poolData.total_streams) || 0,
        qualifyingArtists: parseInt(artistCount.rows[0]?.count) || 0,
        status: poolData.status,
      },
      totalArtists: parseInt(totalArtists.rows[0]?.count) || 0,
      totalListeners: parseInt(totalListeners.rows[0]?.count) || 0,
      splitRules: {
        guaranteed: "20%",
        performance: "70%",
        platform: "10%",
        description:
          "90% of all listener contributions go directly to artists. 10% sustains the platform.",
      },
    });
  } catch (err) {
    console.error("[STREAMROYALE] Pool fetch error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pool data" });
  }
});

/**
 * GET /api/streamroyale/leaderboard
 * Global/regional/genre leaderboard
 */
router.get("/leaderboard", async (req: Request, res: Response) => {
  await ensureStreamRoyaleTables();
  const {
    scope = "global",
    league,
    genre,
    page = "1",
    limit = "50",
  } = req.query;
  const { week, year } = getWeekNumber();
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string) || 50);
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClause = `WHERE se.is_valid = true AND se.week_number = $1 AND se.year_number = $2`;
    const params: any[] = [week, year];
    let paramIdx = 3;

    if (league && league !== "all") {
      whereClause += ` AND ap.league_id = $${paramIdx}`;
      params.push(parseInt(league as string));
      paramIdx++;
    }

    if (genre && genre !== "all") {
      whereClause += ` AND ap.genre::text ILIKE $${paramIdx}`;
      params.push(`%${genre}%`);
      paramIdx++;
    }

    const result = await pool.query(
      `SELECT 
         ap.id as artist_id,
         ap.stage_name,
         ap.genre,
         ap.country,
         ap.current_badge_tier,
         ap.lifetime_streams,
         ap.profile_image_url,
         ap.league_id,
         rl.name as league_name,
         COUNT(se.id) as weekly_streams,
         SUM(se.boost_multiplier::numeric) as weighted_streams,
         ROW_NUMBER() OVER (ORDER BY SUM(se.boost_multiplier::numeric) DESC) as rank
       FROM stream_events se
       JOIN artist_profiles ap ON ap.id = se.artist_profile_id
       LEFT JOIN regional_leagues rl ON rl.id = ap.league_id
       ${whereClause}
       GROUP BY ap.id, ap.stage_name, ap.genre, ap.country, ap.current_badge_tier, 
                ap.lifetime_streams, ap.profile_image_url, ap.league_id, rl.name
       ORDER BY weighted_streams DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offset],
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT se.artist_profile_id) as total
       FROM stream_events se
       JOIN artist_profiles ap ON ap.id = se.artist_profile_id
       LEFT JOIN regional_leagues rl ON rl.id = ap.league_id
       ${whereClause}`,
      params,
    );

    const total = parseInt(countResult.rows[0]?.total) || 0;

    // Get available leagues for filter
    const leagues = await pool.query(
      `SELECT id, name FROM regional_leagues ORDER BY name`,
    );

    res.json({
      success: true,
      leaderboard: result.rows.map((r: any) => ({
        artistId: r.artist_id,
        stageName: r.stage_name,
        genre: r.genre,
        country: r.country,
        badgeTier: parseInt(r.current_badge_tier) || 1,
        badgeName:
          BADGE_TIERS[(parseInt(r.current_badge_tier) || 1) - 1]?.name ||
          "Initiate",
        lifetimeStreams: parseInt(r.lifetime_streams) || 0,
        weeklyStreams: parseInt(r.weekly_streams) || 0,
        weightedStreams: parseFloat(r.weighted_streams) || 0,
        rank: parseInt(r.rank),
        leagueId: r.league_id,
        leagueName: r.league_name,
        profileImageUrl: r.profile_image_url,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: {
        scope,
        league: league || "all",
        genre: genre || "all",
      },
      leagues: leagues.rows,
      weekNumber: week,
      yearNumber: year,
    });
  } catch (err) {
    console.error("[STREAMROYALE] Leaderboard error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch leaderboard" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIST STATS & ROYALTIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/streamroyale/artist/me
 * Current authenticated artist's full stats
 */
router.get("/artist/me", optionalAuth, async (req: Request, res: Response) => {
  await ensureStreamRoyaleTables();
  const userId = req.user ? parseInt(req.user.userId) : null;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  try {
    // Get artist profile
    const profileResult = await pool.query(
      `SELECT ap.*, rl.name as league_name 
       FROM artist_profiles ap
       LEFT JOIN regional_leagues rl ON rl.id = ap.league_id
       WHERE ap.user_id = $1`,
      [userId],
    );

    if (profileResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Artist profile not found" });
    }

    const profile = profileResult.rows[0];
    const { week, year } = getWeekNumber();

    // This week's streams
    const weeklyStats = await pool.query(
      `SELECT COUNT(*) as streams, SUM(boost_multiplier::numeric) as weighted
       FROM stream_events 
       WHERE artist_profile_id = $1 AND week_number = $2 AND year_number = $3 AND is_valid = true`,
      [profile.id, week, year],
    );

    // Last 8 weeks earnings
    const earningsHistory = await pool.query(
      `SELECT week_number, year_number, total_earnings, stream_count, global_rank, regional_rank, pool_share_percent
       FROM artist_royalties 
       WHERE artist_profile_id = $1
       ORDER BY year_number DESC, week_number DESC
       LIMIT 8`,
      [profile.id],
    );

    // All badges
    const badges = await pool.query(
      `SELECT * FROM artist_badges WHERE artist_profile_id = $1 ORDER BY tier`,
      [profile.id],
    );

    // Current rank this week
    const rankResult = await pool.query(
      `SELECT rank FROM (
         SELECT artist_profile_id, 
                ROW_NUMBER() OVER (ORDER BY SUM(boost_multiplier::numeric) DESC) as rank
         FROM stream_events 
         WHERE week_number = $1 AND year_number = $2 AND is_valid = true
         GROUP BY artist_profile_id
       ) ranked WHERE artist_profile_id = $3`,
      [week, year, profile.id],
    );

    // Total artists with streams this week
    const totalArtistsResult = await pool.query(
      `SELECT COUNT(DISTINCT artist_profile_id) as total 
       FROM stream_events 
       WHERE week_number = $1 AND year_number = $2 AND is_valid = true`,
      [week, year],
    );

    // Current badge info
    const currentBadge =
      BADGE_TIERS[(parseInt(profile.current_badge_tier) || 1) - 1];
    const nextBadge = BADGE_TIERS[parseInt(profile.current_badge_tier) || 1]; // next tier

    res.json({
      success: true,
      profile: {
        id: profile.id,
        userId: profile.user_id,
        stageName: profile.stage_name,
        genre: profile.genre,
        country: profile.country,
        countryCode: profile.country_code,
        leagueName: profile.league_name,
        leagueId: profile.league_id,
        lifetimeStreams: parseInt(profile.lifetime_streams) || 0,
        walletBalance: parseFloat(profile.wallet_balance) || 0,
        payoutEmail: profile.payout_email,
        payoutMethod: profile.payout_method,
        verifiedForPayout: profile.verified_for_payout,
        profileImageUrl: profile.profile_image_url,
        artistCode: profile.artist_code,
        division: profile.division || "discovery",
        evaluationStatus: profile.evaluation_status || "pending",
      },
      badge: {
        tier: parseInt(profile.current_badge_tier) || 1,
        name: currentBadge?.name || "Initiate",
        revenueBoost: parseFloat(profile.revenue_boost_percent) || 0,
        nextTier: nextBadge
          ? {
              tier: nextBadge.tier,
              name: nextBadge.name,
              threshold: nextBadge.threshold,
              progress:
                nextBadge.threshold > 0
                  ? Math.min(
                      100,
                      ((parseInt(profile.lifetime_streams) || 0) /
                        nextBadge.threshold) *
                        100,
                    )
                  : 100,
            }
          : null,
      },
      thisWeek: {
        weekNumber: week,
        yearNumber: year,
        streams: parseInt(weeklyStats.rows[0]?.streams) || 0,
        weightedStreams: parseFloat(weeklyStats.rows[0]?.weighted) || 0,
        rank: parseInt(rankResult.rows[0]?.rank) || 0,
        totalArtists: parseInt(totalArtistsResult.rows[0]?.total) || 0,
      },
      earningsHistory: earningsHistory.rows.map((r: any) => ({
        weekNumber: r.week_number,
        yearNumber: r.year_number,
        totalEarnings: parseFloat(r.total_earnings) || 0,
        guaranteedAmount: parseFloat(r.guaranteed_amount) || 0,
        performanceAmount: parseFloat(r.performance_amount) || 0,
        streamCount: parseInt(r.stream_count) || 0,
        globalRank: r.global_rank,
        regionalRank: r.regional_rank,
        poolSharePercent: parseFloat(r.pool_share_percent) || 0,
      })),
      badges: badges.rows.map((b: any) => ({
        tier: b.tier,
        name: b.badge_name,
        streamsAtUnlock: b.lifetime_streams_at_unlock,
        revenueBoost: parseFloat(b.revenue_boost_percent) || 0,
        unlockedAt: b.unlocked_at,
      })),
      allBadgeTiers: BADGE_TIERS,
    });
  } catch (err) {
    console.error("[STREAMROYALE] Artist stats error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch artist stats" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOST / TIP / SUPER-STREAM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/streamroyale/boost
 * Use a boost credit on current stream (2x weight + $0.50 to pool)
 */
router.post("/boost", optionalAuth, async (req: Request, res: Response) => {
  await ensureStreamRoyaleTables();
  const userId = req.user ? parseInt(req.user.userId) : null;
  if (!userId)
    return res.status(401).json({ success: false, message: "Auth required" });

  const { sessionId } = req.body;
  const { week, year } = getWeekNumber();

  try {
    // Check boost credits
    const sub = await pool.query(
      `SELECT id, boost_credits_remaining FROM listener_subscriptions 
       WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );

    if (
      sub.rows.length === 0 ||
      parseInt(sub.rows[0].boost_credits_remaining) <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "No boost credits remaining" });
    }

    // Deduct boost credit
    await pool.query(
      `UPDATE listener_subscriptions SET boost_credits_remaining = boost_credits_remaining - 1 WHERE id = $1`,
      [sub.rows[0].id],
    );

    // Add $0.50 to pool
    await pool.query(
      `INSERT INTO weekly_pools (week_number, year_number, total_pool, status) 
       VALUES ($1, $2, 0.50, 'open')
       ON CONFLICT (week_number, year_number) 
       DO UPDATE SET total_pool = weekly_pools.total_pool + 0.50`,
      [week, year],
    );

    // Mark session as boosted
    if (sessionId && activeSessions.has(sessionId)) {
      const s = activeSessions.get(sessionId)!;
      s.boosted = true;
      activeSessions.set(sessionId, s);
    }

    res.json({
      success: true,
      message: "Boost applied! 2x stream weight + $0.50 added to pool",
      remainingCredits: parseInt(sub.rows[0].boost_credits_remaining) - 1,
    });
  } catch (err) {
    console.error("[STREAMROYALE] Boost error:", err);
    res.status(500).json({ success: false, error: "Failed to apply boost" });
  }
});

/**
 * POST /api/streamroyale/tip
 * Direct tip to an artist (50% artist, 50% pool)
 */
router.post("/tip", optionalAuth, async (req: Request, res: Response) => {
  await ensureStreamRoyaleTables();
  const userId = req.user ? parseInt(req.user.userId) : null;
  if (!userId)
    return res.status(401).json({ success: false, message: "Auth required" });

  const { artistProfileId, amount } = req.body;
  const tipAmount = parseFloat(amount);

  if (!artistProfileId || !tipAmount || tipAmount < 0.5) {
    return res.status(400).json({
      success: false,
      message: "Artist ID and amount ≥ $0.50 required",
    });
  }

  const { week, year } = getWeekNumber();
  const artistShare = tipAmount * 0.5;
  const poolShare = tipAmount * 0.5;

  try {
    // Add to artist wallet
    await pool.query(
      `UPDATE artist_profiles SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
      [artistShare, artistProfileId],
    );

    // Add to pool
    await pool.query(
      `INSERT INTO weekly_pools (week_number, year_number, total_pool, status) 
       VALUES ($1, $2, $3, 'open')
       ON CONFLICT (week_number, year_number) 
       DO UPDATE SET total_pool = weekly_pools.total_pool + $3`,
      [week, year, poolShare],
    );

    // Record tip in artist_royalties as tip_income
    await pool.query(
      `INSERT INTO artist_royalties (artist_profile_id, week_number, year_number, tip_income, total_earnings)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (artist_profile_id, week_number, year_number)
       DO UPDATE SET tip_income = artist_royalties.tip_income + $4,
                     total_earnings = artist_royalties.total_earnings + $4`,
      [artistProfileId, week, year, artistShare],
    );

    // Notify artist
    const artistResult = await pool.query(
      `SELECT user_id, stage_name FROM artist_profiles WHERE id = $1`,
      [artistProfileId],
    );
    if (artistResult.rows.length > 0) {
      const io = getIO();
      if (io) {
        io.to(`user_${artistResult.rows[0].user_id}`).emit("notification", {
          id: `tip-${Date.now()}`,
          type: "tip_received",
          title: `💰 You received a $${artistShare.toFixed(2)} tip!`,
          message: `A listener sent you a tip. 50% goes to your wallet, 50% to the community pool.`,
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    }

    res.json({
      success: true,
      message: `Tip sent! $${artistShare.toFixed(2)} to artist, $${poolShare.toFixed(2)} to pool`,
      artistShare,
      poolShare,
    });
  } catch (err) {
    console.error("[STREAMROYALE] Tip error:", err);
    res.status(500).json({ success: false, error: "Failed to process tip" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYOUT REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/streamroyale/payout/request
 * Artist requests a payout ($10 minimum)
 */
router.post(
  "/payout/request",
  optionalAuth,
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const userId = req.user ? parseInt(req.user.userId) : null;
    if (!userId)
      return res.status(401).json({ success: false, message: "Auth required" });

    const { amount, method, paypalEmail, bankDetails } = req.body;
    const payoutAmount = parseFloat(amount);

    if (!payoutAmount || payoutAmount < 10) {
      return res
        .status(400)
        .json({ success: false, message: "Minimum payout is $10.00" });
    }

    try {
      // Get artist profile
      const profile = await pool.query(
        `SELECT id, wallet_balance, verified_for_payout, payout_email FROM artist_profiles WHERE user_id = $1`,
        [userId],
      );

      if (profile.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Artist profile not found" });
      }

      const artist = profile.rows[0];
      const balance = parseFloat(artist.wallet_balance) || 0;

      if (payoutAmount > balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. You have $${balance.toFixed(2)} available.`,
        });
      }

      // Create payout request
      await pool.query(
        `INSERT INTO payout_requests (artist_profile_id, amount, method, paypal_email, bank_details)
       VALUES ($1, $2, $3, $4, $5)`,
        [
          artist.id,
          payoutAmount,
          method || "paypal",
          paypalEmail || artist.payout_email,
          bankDetails ? JSON.stringify(bankDetails) : null,
        ],
      );

      // Deduct from wallet
      await pool.query(
        `UPDATE artist_profiles SET wallet_balance = wallet_balance - $1 WHERE id = $2`,
        [payoutAmount, artist.id],
      );

      res.json({
        success: true,
        message: `Payout request for $${payoutAmount.toFixed(2)} submitted successfully`,
        newBalance: balance - payoutAmount,
      });
    } catch (err) {
      console.error("[STREAMROYALE] Payout request error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to submit payout request" });
    }
  },
);

/**
 * GET /api/streamroyale/payout/history
 * Artist's payout history
 */
router.get(
  "/payout/history",
  optionalAuth,
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const userId = req.user ? parseInt(req.user.userId) : null;
    if (!userId)
      return res.status(401).json({ success: false, message: "Auth required" });

    try {
      const profile = await pool.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1`,
        [userId],
      );
      if (profile.rows.length === 0) {
        return res.json({ success: true, payouts: [] });
      }

      const payouts = await pool.query(
        `SELECT * FROM payout_requests WHERE artist_profile_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [profile.rows[0].id],
      );

      res.json({
        success: true,
        payouts: payouts.rows.map((p: any) => ({
          id: p.id,
          amount: parseFloat(p.amount),
          method: p.method,
          status: p.status,
          paypalEmail: p.paypal_email,
          createdAt: p.created_at,
          processedAt: p.processed_at,
        })),
      });
    } catch (err) {
      console.error("[STREAMROYALE] Payout history error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch payout history" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// LISTENER PLANS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/streamroyale/plans
 * Get all streaming plans
 */
router.get("/plans", async (req: Request, res: Response) => {
  await ensureStreamRoyaleTables();

  try {
    const plans = await pool.query(
      `SELECT * FROM streaming_plans WHERE is_active = true ORDER BY monthly_fee`,
    );

    res.json({
      success: true,
      plans: plans.rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        monthlyFee: parseFloat(p.monthly_fee),
        streamLimit: p.stream_limit,
        poolContributionPercent: p.pool_contribution_percent,
        boostCredits: p.boost_credits,
        isActive: p.is_active,
      })),
    });
  } catch (err) {
    console.error("[STREAMROYALE] Plans fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

/**
 * GET /api/streamroyale/listener/status
 * Current listener subscription status
 */
router.get(
  "/listener/status",
  optionalAuth,
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const userId = req.user ? parseInt(req.user.userId) : null;
    if (!userId)
      return res.status(401).json({ success: false, message: "Auth required" });

    try {
      const sub = await pool.query(
        `SELECT ls.*, sp.name as plan_name, sp.monthly_fee, sp.stream_limit, 
              sp.pool_contribution_percent, sp.boost_credits
       FROM listener_subscriptions ls
       JOIN streaming_plans sp ON sp.id = ls.plan_id
       WHERE ls.user_id = $1 AND ls.status = 'active'
       LIMIT 1`,
        [userId],
      );

      if (sub.rows.length === 0) {
        return res.json({ success: true, subscribed: false });
      }

      const s = sub.rows[0];

      // Count streams this week
      const { week, year } = getWeekNumber();
      const streamCount = await pool.query(
        `SELECT COUNT(*) as count FROM stream_events 
       WHERE user_id = $1 AND week_number = $2 AND year_number = $3 AND is_valid = true`,
        [userId, week, year],
      );

      res.json({
        success: true,
        subscribed: true,
        subscription: {
          id: s.id,
          planName: s.plan_name,
          monthlyFee: parseFloat(s.monthly_fee),
          streamLimit: s.stream_limit,
          poolContribution: s.pool_contribution_percent,
          boostCreditsTotal: s.boost_credits,
          boostCreditsRemaining: s.boost_credits_remaining,
          status: s.status,
          currentPeriodEnd: s.current_period_end,
        },
        usage: {
          streamsThisWeek: parseInt(streamCount.rows[0]?.count) || 0,
          streamLimit: s.stream_limit,
        },
      });
    } catch (err) {
      console.error("[STREAMROYALE] Listener status error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch listener status" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/streamroyale/admin/overview
 * Admin overview of StreamRoyale platform
 */
router.get(
  "/admin/overview",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const { week, year } = getWeekNumber();

    try {
      const [
        poolStats,
        artistCount,
        listenerCount,
        totalStreams,
        pendingPayouts,
        recentBadges,
      ] = await Promise.all([
        pool.query(
          `SELECT * FROM weekly_pools WHERE week_number = $1 AND year_number = $2`,
          [week, year],
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM artist_profiles WHERE is_active = true`,
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM listener_subscriptions WHERE status = 'active'`,
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM stream_events WHERE is_valid = true`,
        ),
        pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payout_requests WHERE status = 'pending'`,
        ),
        pool.query(
          `SELECT ab.*, ap.stage_name FROM artist_badges ab JOIN artist_profiles ap ON ap.id = ab.artist_profile_id ORDER BY ab.unlocked_at DESC LIMIT 10`,
        ),
      ]);

      const currentPool = poolStats.rows[0] || {
        total_pool: "0",
        total_streams: 0,
        status: "open",
      };

      // Historical pools
      const poolHistory = await pool.query(
        `SELECT * FROM weekly_pools ORDER BY year_number DESC, week_number DESC LIMIT 12`,
      );

      // Revenue by plan tier
      const planBreakdown = await pool.query(
        `SELECT sp.name, COUNT(ls.id) as subscribers, 
              sp.monthly_fee, sp.pool_contribution_percent
       FROM streaming_plans sp
       LEFT JOIN listener_subscriptions ls ON ls.plan_id = sp.id AND ls.status = 'active'
       GROUP BY sp.id, sp.name, sp.monthly_fee, sp.pool_contribution_percent
       ORDER BY sp.monthly_fee`,
      );

      res.json({
        success: true,
        currentWeek: { week, year },
        pool: {
          total: parseFloat(currentPool.total_pool) || 0,
          streams: parseInt(currentPool.total_streams) || 0,
          status: currentPool.status,
        },
        counts: {
          artists: parseInt(artistCount.rows[0]?.count) || 0,
          listeners: parseInt(listenerCount.rows[0]?.count) || 0,
          totalStreams: parseInt(totalStreams.rows[0]?.count) || 0,
        },
        payouts: {
          pendingCount: parseInt(pendingPayouts.rows[0]?.count) || 0,
          pendingTotal: parseFloat(pendingPayouts.rows[0]?.total) || 0,
        },
        planBreakdown: planBreakdown.rows.map((p: any) => ({
          name: p.name,
          subscribers: parseInt(p.subscribers) || 0,
          monthlyFee: parseFloat(p.monthly_fee),
          poolContribution: p.pool_contribution_percent,
        })),
        poolHistory: poolHistory.rows.map((p: any) => ({
          weekNumber: p.week_number,
          yearNumber: p.year_number,
          totalPool: parseFloat(p.total_pool) || 0,
          totalStreams: parseInt(p.total_streams) || 0,
          status: p.status,
          distributedAt: p.distributed_at,
        })),
        recentBadges: recentBadges.rows.map((b: any) => ({
          stageName: b.stage_name,
          badgeName: b.badge_name,
          tier: b.tier,
          unlockedAt: b.unlocked_at,
        })),
      });
    } catch (err) {
      console.error("[STREAMROYALE] Admin overview error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch admin overview" });
    }
  },
);

/**
 * POST /api/streamroyale/admin/distribute
 * Manually trigger weekly pool distribution
 */
router.post(
  "/admin/distribute",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const { weekNumber, yearNumber } = req.body;
    const week = weekNumber || getWeekNumber().week;
    const year = yearNumber || getWeekNumber().year;

    try {
      // Run distribution
      const result = await distributeWeeklyPool(week, year);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[STREAMROYALE] Manual distribution error:", err);
      res
        .status(500)
        .json({ success: false, error: err.message || "Distribution failed" });
    }
  },
);

/**
 * PUT /api/streamroyale/admin/payout/:id
 * Approve or reject a payout request
 */
router.put(
  "/admin/payout/:id",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body; // 'completed' or 'rejected'

    if (!["completed", "rejected", "processing"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    try {
      const payout = await pool.query(
        `SELECT * FROM payout_requests WHERE id = $1`,
        [id],
      );
      if (payout.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Payout request not found" });
      }

      const p = payout.rows[0];

      // If rejecting, refund to wallet
      if (status === "rejected") {
        await pool.query(
          `UPDATE artist_profiles SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
          [p.amount, p.artist_profile_id],
        );
      }

      await pool.query(
        `UPDATE payout_requests SET status = $1, notes = $2, processed_at = NOW(), processed_by = $3 WHERE id = $4`,
        [
          status,
          notes || null,
          req.user ? parseInt(req.user.userId) : null,
          id,
        ],
      );

      res.json({ success: true, message: `Payout ${status}` });
    } catch (err) {
      console.error("[STREAMROYALE] Payout update error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update payout" });
    }
  },
);

/**
 * GET /api/streamroyale/admin/payouts
 * List all payout requests for admin
 */
router.get(
  "/admin/payouts",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const { status = "all", page = "1" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limit = 25;
    const offset = (pageNum - 1) * limit;

    try {
      let whereClause = "";
      const params: any[] = [limit, offset];

      if (status !== "all") {
        whereClause = "WHERE pr.status = $3";
        params.push(status);
      }

      const result = await pool.query(
        `SELECT pr.*, ap.stage_name, ap.payout_email, u.email as user_email
       FROM payout_requests pr
       JOIN artist_profiles ap ON ap.id = pr.artist_profile_id
       JOIN users u ON u.id = ap.user_id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $1 OFFSET $2`,
        params,
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM payout_requests pr ${whereClause.replace("$3", "$1")}`,
        status !== "all" ? [status] : [],
      );

      res.json({
        success: true,
        payouts: result.rows.map((p: any) => ({
          id: p.id,
          stageName: p.stage_name,
          email: p.user_email,
          payoutEmail: p.payout_email,
          amount: parseFloat(p.amount),
          method: p.method,
          status: p.status,
          notes: p.notes,
          createdAt: p.created_at,
          processedAt: p.processed_at,
        })),
        pagination: {
          page: pageNum,
          limit,
          total: parseInt(countResult.rows[0]?.total) || 0,
          pages: Math.ceil((parseInt(countResult.rows[0]?.total) || 0) / limit),
        },
      });
    } catch (err) {
      console.error("[STREAMROYALE] Admin payouts error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch payouts" });
    }
  },
);

/**
 * POST /api/streamroyale/admin/add-to-pool
 * Manually add funds to the current week's pool
 */
router.post(
  "/admin/add-to-pool",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    await ensureStreamRoyaleTables();
    const { amount, description } = req.body;
    const addAmount = parseFloat(amount);

    if (!addAmount || addAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount required" });
    }

    const { week, year } = getWeekNumber();

    try {
      await pool.query(
        `INSERT INTO weekly_pools (week_number, year_number, total_pool, status)
       VALUES ($1, $2, $3, 'open')
       ON CONFLICT (week_number, year_number) 
       DO UPDATE SET total_pool = weekly_pools.total_pool + $3`,
        [week, year, addAmount],
      );

      res.json({
        success: true,
        message: `$${addAmount.toFixed(2)} added to Week ${week} pool`,
      });
    } catch (err) {
      console.error("[STREAMROYALE] Add to pool error:", err);
      res.status(500).json({ success: false, error: "Failed to add to pool" });
    }
  },
);

export default router;

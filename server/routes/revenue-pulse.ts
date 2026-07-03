/**
 * Revenue Pulse — Real-Time Transparency Dashboard
 *
 * Shows listeners exactly where their subscription money goes:
 *   • Current weekly pool size and funding status
 *   • How many artists are being funded
 *   • The listener's personal contribution breakdown
 *   • Impact score — how much their streams helped artists
 *   • Badge thresholds for artists (Initiate → Bronze → Silver → ... → Legendary Titan)
 *
 * Badge Hierarchy & Royalty Boost:
 *   Initiate       — 0 streams, 0% bonus
 *   Bronze         — 10,000 streams, 2% bonus
 *   Silver         — 50,000 streams, 5% bonus
 *   Gold           — 200,000 streams, 8% bonus
 *   Platinum       — 1,000,000 streams, 12% bonus
 *   Diamond        — 5,000,000 streams, 18% bonus
 *   Legendary Titan— 25,000,000 streams, 25% bonus
 *
 * Routes:
 *   GET /api/revenue-pulse              — Full dashboard (auth optional — public view reduced)
 *   GET /api/revenue-pulse/pool         — Current pool status
 *   GET /api/revenue-pulse/my-impact    — Listener's personal contribution
 *   GET /api/revenue-pulse/leaderboard  — Top funded artists this week
 *   GET /api/revenue-pulse/badges       — Badge thresholds reference
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

const BADGE_THRESHOLDS = [
  { badge: "initiate", streams: 0, bonusPct: 0, icon: "🌱", color: "#6b7280" },
  {
    badge: "bronze",
    streams: 10_000,
    bonusPct: 2,
    icon: "🥉",
    color: "#cd7f32",
  },
  {
    badge: "silver",
    streams: 50_000,
    bonusPct: 5,
    icon: "🥈",
    color: "#c0c0c0",
  },
  {
    badge: "gold",
    streams: 200_000,
    bonusPct: 8,
    icon: "🥇",
    color: "#ffd700",
  },
  {
    badge: "platinum",
    streams: 1_000_000,
    bonusPct: 12,
    icon: "💎",
    color: "#e5e4e2",
  },
  {
    badge: "diamond",
    streams: 5_000_000,
    bonusPct: 18,
    icon: "💠",
    color: "#b9f2ff",
  },
  {
    badge: "legendary_titan",
    streams: 25_000_000,
    bonusPct: 25,
    icon: "🔱",
    color: "#ff00ff",
  },
];

const LISTENER_TIERS = [
  { tier: "guest", price: 0, weeklyStreams: 20, downloads: 0, label: "Free" },
  {
    tier: "supporter",
    price: 4.99,
    weeklyStreams: 300,
    downloads: 5,
    label: "Supporter",
  },
  {
    tier: "champion",
    price: 9.99,
    weeklyStreams: 1500,
    downloads: 20,
    label: "Champion",
  },
  {
    tier: "patron",
    price: 19.99,
    weeklyStreams: -1,
    downloads: -1,
    label: "Patron (Unlimited)",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GET / — Full dashboard overview
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user ? parseInt(req.user.userId) : null;

    // Current pool
    const currentPool = await pool.query(
      `SELECT * FROM weekly_pools WHERE status = 'active' ORDER BY week_start DESC LIMIT 1`,
    );
    const poolData = currentPool.rows[0] || null;

    // Total artists being funded this week
    const fundedArtists = await pool.query(
      `SELECT COUNT(DISTINCT artist_profile_id) as total
       FROM stream_events
       WHERE completed = true
         AND created_at >= COALESCE((SELECT week_start FROM weekly_pools WHERE status = 'active' LIMIT 1), NOW() - INTERVAL '7 days')`,
    );

    // Total streams this week
    const weekStreams = await pool.query(
      `SELECT COUNT(*) as total
       FROM stream_events
       WHERE completed = true
         AND created_at >= COALESCE((SELECT week_start FROM weekly_pools WHERE status = 'active' LIMIT 1), NOW() - INTERVAL '7 days')`,
    );

    // Top 10 artists by streams this week
    const topArtists = await pool.query(
      `SELECT ap.stage_name, ap.badge_level, ap.profile_image_url,
        COUNT(se.id) as weekly_streams,
        ap.total_streams as lifetime_streams
       FROM stream_events se
       JOIN artist_profiles ap ON ap.id = se.artist_profile_id
       WHERE se.completed = true
         AND se.created_at >= COALESCE((SELECT week_start FROM weekly_pools WHERE status = 'active' LIMIT 1), NOW() - INTERVAL '7 days')
       GROUP BY ap.id, ap.stage_name, ap.badge_level, ap.profile_image_url, ap.total_streams
       ORDER BY weekly_streams DESC
       LIMIT 10`,
    );

    // Pool distribution breakdown (20/70/10 split)
    const poolTotal = parseFloat(poolData?.total_amount || "0");
    const distribution = {
      guaranteedBase: (poolTotal * 0.2).toFixed(2),
      performancePool: (poolTotal * 0.7).toFixed(2),
      platformFee: (poolTotal * 0.1).toFixed(2),
      total: poolTotal.toFixed(2),
    };

    // Listener personal impact
    let personalImpact = null;
    if (userId) {
      const myStreams = await pool.query(
        `SELECT COUNT(*) as total,
          COUNT(DISTINCT artist_profile_id) as artists_supported
         FROM stream_events
         WHERE user_id = $1 AND completed = true
           AND created_at >= COALESCE((SELECT week_start FROM weekly_pools WHERE status = 'active' LIMIT 1), NOW() - INTERVAL '7 days')`,
        [userId],
      );

      const totalWeekStreams = parseInt(weekStreams.rows[0]?.total || "1");
      const myStreamCount = parseInt(myStreams.rows[0]?.total || "0");
      const impactPct =
        totalWeekStreams > 0 ? (myStreamCount / totalWeekStreams) * 100 : 0;

      // Get subscription
      const sub = await pool.query(
        `SELECT tier FROM listener_subscriptions WHERE user_id = $1 AND status = 'active'`,
        [userId],
      );

      personalImpact = {
        myStreamsThisWeek: myStreamCount,
        artistsSupported: parseInt(myStreams.rows[0]?.artists_supported || "0"),
        impactPercentage: impactPct.toFixed(4),
        estimatedContribution: (poolTotal * (impactPct / 100)).toFixed(2),
        listenerTier: sub.rows[0]?.tier || "guest",
      };
    }

    res.json({
      success: true,
      pool: poolData
        ? {
            id: poolData.id,
            weekStart: poolData.week_start,
            weekEnd: poolData.week_end,
            totalAmount: poolData.total_amount,
            status: poolData.status,
            distribution,
          }
        : null,
      stats: {
        fundedArtists: parseInt(fundedArtists.rows[0]?.total || "0"),
        weeklyStreams: parseInt(weekStreams.rows[0]?.total || "0"),
      },
      topArtists: topArtists.rows,
      personalImpact,
      badgeThresholds: BADGE_THRESHOLDS,
      listenerTiers: LISTENER_TIERS,
    });
  } catch (err: any) {
    console.error("[REVENUE PULSE] Dashboard error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to load revenue pulse" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /pool — Current pool status
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/pool", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT wp.*,
        (SELECT COUNT(DISTINCT artist_profile_id) FROM artist_royalties WHERE pool_id = wp.id) as artists_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM artist_royalties WHERE pool_id = wp.id) as total_distributed
       FROM weekly_pools wp
       ORDER BY wp.week_start DESC
       LIMIT 5`,
    );

    res.json({
      success: true,
      pools: result.rows.map((p: any) => ({
        ...p,
        splitBreakdown: {
          guaranteed: (parseFloat(p.total_amount || "0") * 0.2).toFixed(2),
          performance: (parseFloat(p.total_amount || "0") * 0.7).toFixed(2),
          platform: (parseFloat(p.total_amount || "0") * 0.1).toFixed(2),
        },
      })),
    });
  } catch (err: any) {
    console.error("[REVENUE PULSE] Pool error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch pool" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /my-impact — Listener's personal contribution
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/my-impact", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user!.userId);

    // Lifetime stats
    const lifetime = await pool.query(
      `SELECT COUNT(*) as total_streams,
        COUNT(DISTINCT artist_profile_id) as unique_artists,
        COUNT(DISTINCT DATE(created_at)) as active_days
       FROM stream_events
       WHERE user_id = $1 AND completed = true`,
      [userId],
    );

    // This week
    const week = await pool.query(
      `SELECT COUNT(*) as streams,
        COUNT(DISTINCT artist_profile_id) as artists
       FROM stream_events
       WHERE user_id = $1 AND completed = true
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId],
    );

    // Top artists I support
    const topSupported = await pool.query(
      `SELECT ap.stage_name, ap.badge_level, ap.profile_image_url,
        COUNT(se.id) as my_streams
       FROM stream_events se
       JOIN artist_profiles ap ON ap.id = se.artist_profile_id
       WHERE se.user_id = $1 AND se.completed = true
       GROUP BY ap.id, ap.stage_name, ap.badge_level, ap.profile_image_url
       ORDER BY my_streams DESC
       LIMIT 5`,
      [userId],
    );

    // Subscription & tier
    const sub = await pool.query(
      `SELECT * FROM listener_subscriptions WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );
    const tierInfo =
      sub.rows.length > 0
        ? LISTENER_TIERS.find((t) => t.tier === sub.rows[0].tier)
        : LISTENER_TIERS[0];

    // Streams used this week vs limit
    const weeklyLimit = tierInfo?.weeklyStreams || 20;
    const streamsUsed = parseInt(week.rows[0]?.streams || "0");

    res.json({
      success: true,
      lifetime: {
        totalStreams: parseInt(lifetime.rows[0]?.total_streams || "0"),
        uniqueArtists: parseInt(lifetime.rows[0]?.unique_artists || "0"),
        activeDays: parseInt(lifetime.rows[0]?.active_days || "0"),
      },
      thisWeek: {
        streams: streamsUsed,
        artists: parseInt(week.rows[0]?.artists || "0"),
        streamsRemaining:
          weeklyLimit === -1
            ? "unlimited"
            : Math.max(0, weeklyLimit - streamsUsed),
        weeklyLimit: weeklyLimit === -1 ? "unlimited" : weeklyLimit,
      },
      topSupportedArtists: topSupported.rows,
      subscription: sub.rows[0] || null,
      tierInfo,
    });
  } catch (err: any) {
    console.error("[REVENUE PULSE] Impact error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch impact" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /leaderboard — Top funded artists this week
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const { limit = "25" } = req.query as Record<string, string>;
    const limitNum = Math.min(100, parseInt(limit) || 25);

    const result = await pool.query(
      `SELECT ap.id, ap.stage_name, ap.badge_level, ap.profile_image_url,
        ap.total_streams as lifetime_streams,
        ap.total_earnings,
        COUNT(se.id) as weekly_streams,
        RANK() OVER (ORDER BY COUNT(se.id) DESC) as rank
       FROM artist_profiles ap
       LEFT JOIN stream_events se ON se.artist_profile_id = ap.id AND se.completed = true
         AND se.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY ap.id
       HAVING COUNT(se.id) > 0
       ORDER BY weekly_streams DESC
       LIMIT $1`,
      [limitNum],
    );

    res.json({
      success: true,
      leaderboard: result.rows.map((a: any) => {
        const badge =
          BADGE_THRESHOLDS.find((b) => b.badge === a.badge_level) ||
          BADGE_THRESHOLDS[0];
        return {
          ...a,
          badgeIcon: badge.icon,
          badgeColor: badge.color,
          bonusPercentage: badge.bonusPct,
        };
      }),
    });
  } catch (err: any) {
    console.error("[REVENUE PULSE] Leaderboard error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch leaderboard" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /badges — Badge thresholds reference
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/badges", async (_req: Request, res: Response) => {
  res.json({
    success: true,
    badges: BADGE_THRESHOLDS,
    listenerTiers: LISTENER_TIERS,
    poolSplit: {
      guaranteed: "20% — base payment to all qualifying artists",
      performance: "70% — distributed proportionally by stream count",
      platform: "10% — platform maintenance fee",
    },
  });
});

export default router;

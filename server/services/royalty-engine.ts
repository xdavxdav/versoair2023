/**
 * 🎵 STREAMROYALE — Weekly Royalty Distribution Engine
 *
 * Runs every Monday at 06:00 UTC via node-cron.
 * Distributes the PREVIOUS week's pool:
 *   • 20% Guaranteed Fund → split equally among all qualifying artists
 *   • 70% Performance Pool → proportional to weighted stream count
 *   • 10% Platform Cut → operational expenses
 *
 * Badge-tier artists with revenue boost get bonus on top.
 */

import cron from "node-cron";
import { pool } from "../db";
import { getIO } from "../websocket/socket-config";

// ═══════════════════════════════════════════════════════════════════════════════
// POOL DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function distributeWeeklyPool(
  weekNumber: number,
  yearNumber: number,
) {
  console.log(
    `📊 [ROYALTY] Starting distribution for Week ${weekNumber}, ${yearNumber}...`,
  );

  try {
    // 1. Lock the pool
    const poolResult = await pool.query(
      `UPDATE weekly_pools SET status = 'locked' 
       WHERE week_number = $1 AND year_number = $2 AND status = 'open'
       RETURNING *`,
      [weekNumber, yearNumber],
    );

    if (poolResult.rows.length === 0) {
      console.log(
        `⚠️ [ROYALTY] No open pool found for Week ${weekNumber}, ${yearNumber}`,
      );
      return {
        distributed: false,
        reason: "No open pool found or already locked/distributed",
      };
    }

    const weeklyPool = poolResult.rows[0];
    const totalPool = parseFloat(weeklyPool.total_pool) || 0;

    if (totalPool <= 0) {
      await pool.query(
        `UPDATE weekly_pools SET status = 'distributed', distributed_at = NOW() 
         WHERE id = $1`,
        [weeklyPool.id],
      );
      console.log(`⚠️ [ROYALTY] Pool is empty for Week ${weekNumber}`);
      return { distributed: true, totalPool: 0, reason: "Empty pool" };
    }

    // 2. Calculate splits
    const guaranteedFund = totalPool * 0.2;
    const performancePool = totalPool * 0.7;
    const platformCut = totalPool * 0.1;

    // 3. Get all artists with valid streams this week
    const artistStreams = await pool.query(
      `SELECT 
         se.artist_profile_id,
         ap.current_badge_tier,
         ap.revenue_boost_percent,
         ap.user_id,
         ap.stage_name,
         ap.league_id,
         COUNT(*) as stream_count,
         SUM(se.boost_multiplier::numeric) as weighted_streams
       FROM stream_events se
       JOIN artist_profiles ap ON ap.id = se.artist_profile_id
       WHERE se.week_number = $1 AND se.year_number = $2 AND se.is_valid = true
       GROUP BY se.artist_profile_id, ap.current_badge_tier, ap.revenue_boost_percent, 
                ap.user_id, ap.stage_name, ap.league_id
       ORDER BY weighted_streams DESC`,
      [weekNumber, yearNumber],
    );

    const artists = artistStreams.rows;
    const qualifyingArtists = artists.length;

    if (qualifyingArtists === 0) {
      await pool.query(
        `UPDATE weekly_pools SET 
         guaranteed_fund = $1, performance_pool = $2, platform_cut = $3,
         qualifying_artists = 0, status = 'distributed', distributed_at = NOW()
         WHERE id = $4`,
        [guaranteedFund, performancePool, platformCut, weeklyPool.id],
      );
      return {
        distributed: true,
        totalPool,
        qualifyingArtists: 0,
        reason: "No qualifying artists",
      };
    }

    // 4. Calculate total weighted streams
    const totalWeightedStreams = artists.reduce(
      (sum: number, a: any) => sum + (parseFloat(a.weighted_streams) || 0),
      0,
    );

    // 5. Distribute to each artist
    let totalDistributed = 0;
    const distributions: any[] = [];

    // Calculate global rankings
    const rankedByWeighted = [...artists].sort(
      (a, b) =>
        (parseFloat(b.weighted_streams) || 0) -
        (parseFloat(a.weighted_streams) || 0),
    );

    // Calculate regional rankings per league
    const leagueGroups: Record<number, typeof artists> = {};
    for (const a of rankedByWeighted) {
      const lid = a.league_id || 0;
      if (!leagueGroups[lid]) leagueGroups[lid] = [];
      leagueGroups[lid].push(a);
    }
    const regionalRanks: Record<number, number> = {};
    for (const lid of Object.keys(leagueGroups)) {
      leagueGroups[parseInt(lid)].forEach((a: any, idx: number) => {
        regionalRanks[a.artist_profile_id] = idx + 1;
      });
    }

    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      const artistProfileId = artist.artist_profile_id;
      const weightedStreams = parseFloat(artist.weighted_streams) || 0;
      const streamCount = parseInt(artist.stream_count) || 0;
      const boostPercent = parseFloat(artist.revenue_boost_percent) || 0;

      // Guaranteed portion: equal split
      const guaranteedAmount = guaranteedFund / qualifyingArtists;

      // Performance portion: proportional to weighted streams
      const streamShare =
        totalWeightedStreams > 0 ? weightedStreams / totalWeightedStreams : 0;
      const performanceAmount = performancePool * streamShare;

      // Badge bonus: applied to performance portion
      const badgeBonus = performanceAmount * (boostPercent / 100);

      const totalEarnings = guaranteedAmount + performanceAmount + badgeBonus;
      totalDistributed += totalEarnings;

      const globalRank =
        rankedByWeighted.findIndex(
          (a: any) => a.artist_profile_id === artistProfileId,
        ) + 1;
      const regRank = regionalRanks[artistProfileId] || 0;
      const poolSharePercent =
        totalPool > 0 ? (totalEarnings / totalPool) * 100 : 0;

      // Upsert royalty record
      await pool.query(
        `INSERT INTO artist_royalties 
         (artist_profile_id, week_number, year_number, guaranteed_amount, performance_amount, 
          badge_bonus, total_earnings, stream_count, pool_share_percent, global_rank, regional_rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (artist_profile_id, week_number, year_number)
         DO UPDATE SET 
           guaranteed_amount = $4,
           performance_amount = $5,
           badge_bonus = $6,
           total_earnings = artist_royalties.total_earnings + $7 - COALESCE(
             (SELECT total_earnings FROM artist_royalties 
              WHERE artist_profile_id = $1 AND week_number = $2 AND year_number = $3), 0
           ),
           stream_count = $8,
           pool_share_percent = $9,
           global_rank = $10,
           regional_rank = $11`,
        [
          artistProfileId,
          weekNumber,
          yearNumber,
          guaranteedAmount.toFixed(2),
          performanceAmount.toFixed(2),
          badgeBonus.toFixed(2),
          totalEarnings.toFixed(2),
          streamCount,
          poolSharePercent.toFixed(4),
          globalRank,
          regRank,
        ],
      );

      // Add to artist wallet
      await pool.query(
        `UPDATE artist_profiles SET 
         wallet_balance = wallet_balance + $1,
         weekly_streams = 0,
         updated_at = NOW()
         WHERE id = $2`,
        [totalEarnings.toFixed(2), artistProfileId],
      );

      distributions.push({
        artistProfileId,
        stageName: artist.stage_name,
        streams: streamCount,
        weightedStreams,
        guaranteedAmount: parseFloat(guaranteedAmount.toFixed(2)),
        performanceAmount: parseFloat(performanceAmount.toFixed(2)),
        badgeBonus: parseFloat(badgeBonus.toFixed(2)),
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        globalRank,
        regionalRank: regRank,
      });

      // Notify each artist
      const io = getIO();
      if (io && artist.user_id) {
        io.to(`user_${artist.user_id}`).emit("notification", {
          id: `royalty-${weekNumber}-${yearNumber}-${Date.now()}`,
          type: "royalty_payout",
          title: `💰 Weekly Earnings: $${totalEarnings.toFixed(2)}`,
          message: `Week ${weekNumber} distribution complete! Rank #${globalRank}. Check your Royalties tab.`,
          timestamp: new Date().toISOString(),
          read: false,
        });

        // Also insert notification
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              artist.user_id,
              "royalty_payout",
              `💰 Weekly Earnings: $${totalEarnings.toFixed(2)}`,
              `Week ${weekNumber}: Guaranteed $${guaranteedAmount.toFixed(2)} + Performance $${performanceAmount.toFixed(2)}${badgeBonus > 0 ? ` + Badge Bonus $${badgeBonus.toFixed(2)}` : ""}. Rank #${globalRank}.`,
              "/artist-portal/dashboard?tab=royalties",
            ],
          );
        } catch (e) {
          // Skip if notifications table missing
        }
      }
    }

    // 6. Update pool record
    await pool.query(
      `UPDATE weekly_pools SET 
       guaranteed_fund = $1, performance_pool = $2, platform_cut = $3,
       qualifying_artists = $4, status = 'distributed', distributed_at = NOW()
       WHERE id = $5`,
      [
        guaranteedFund.toFixed(2),
        performancePool.toFixed(2),
        platformCut.toFixed(2),
        qualifyingArtists,
        weeklyPool.id,
      ],
    );

    // Broadcast pool update to all connected clients
    const io = getIO();
    if (io) {
      io.emit("pool_update", {
        weekNumber,
        yearNumber,
        status: "distributed",
        totalPool,
        totalDistributed,
        qualifyingArtists,
      });
    }

    console.log(
      `✅ [ROYALTY] Week ${weekNumber} distributed: $${totalDistributed.toFixed(2)} to ${qualifyingArtists} artists`,
    );

    return {
      distributed: true,
      weekNumber,
      yearNumber,
      totalPool,
      guaranteedFund: parseFloat(guaranteedFund.toFixed(2)),
      performancePool: parseFloat(performancePool.toFixed(2)),
      platformCut: parseFloat(platformCut.toFixed(2)),
      totalDistributed: parseFloat(totalDistributed.toFixed(2)),
      qualifyingArtists,
      distributions,
    };
  } catch (err) {
    console.error(
      `❌ [ROYALTY] Distribution failed for Week ${weekNumber}:`,
      err,
    );
    // Unlock pool on failure
    await pool
      .query(
        `UPDATE weekly_pools SET status = 'open' WHERE week_number = $1 AND year_number = $2 AND status = 'locked'`,
        [weekNumber, yearNumber],
      )
      .catch(() => {});
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POOL FUNDING — Calculate contributions from active subs
// ═══════════════════════════════════════════════════════════════════════════════

export async function calculatePoolContributions() {
  try {
    // Get all active subscriptions with plan details
    const subs = await pool.query(
      `SELECT ls.user_id, sp.monthly_fee, sp.pool_contribution_percent
       FROM listener_subscriptions ls
       JOIN streaming_plans sp ON sp.id = ls.plan_id
       WHERE ls.status = 'active'`,
    );

    if (subs.rows.length === 0) return 0;

    // Weekly contribution = monthly / 4.33 * contribution%
    let totalContribution = 0;
    for (const sub of subs.rows) {
      const weeklyFee = parseFloat(sub.monthly_fee) / 4.33;
      const contribution =
        weeklyFee * (parseInt(sub.pool_contribution_percent) / 100);
      totalContribution += contribution;
    }

    // Add to current week's pool
    const { week, year } = getWeekNumber();
    await pool.query(
      `INSERT INTO weekly_pools (week_number, year_number, total_pool, status)
       VALUES ($1, $2, $3, 'open')
       ON CONFLICT (week_number, year_number) 
       DO UPDATE SET total_pool = weekly_pools.total_pool + $3`,
      [week, year, totalContribution.toFixed(2)],
    );

    console.log(
      `💰 [ROYALTY] Added $${totalContribution.toFixed(2)} to Week ${week} pool from ${subs.rows.length} subscriptions`,
    );
    return totalContribution;
  } catch (err) {
    console.error("[ROYALTY] Pool contribution calc error:", err);
    return 0;
  }
}

function getWeekNumber(d: Date = new Date()): { week: number; year: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { week: weekNo, year: date.getUTCFullYear() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRON SETUP
// ═══════════════════════════════════════════════════════════════════════════════

export function setupRoyaltyEngine() {
  // Every Monday at 06:00 UTC — distribute previous week's pool
  cron.schedule(
    "0 6 * * 1",
    async () => {
      console.log("⏰ [ROYALTY] Cron triggered: Weekly pool distribution");

      try {
        // Calculate and add subscription contributions first
        await calculatePoolContributions();

        // Get PREVIOUS week number
        const now = new Date();
        const prevWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { week, year } = getWeekNumber(prevWeekDate);

        // Run distribution
        await distributeWeeklyPool(week, year);
      } catch (err) {
        console.error("❌ [ROYALTY] Weekly cron failed:", err);
      }
    },
    {
      timezone: "UTC",
    },
  );

  // Every Sunday at 23:00 UTC — calculate and add sub contributions to pool
  cron.schedule(
    "0 23 * * 0",
    async () => {
      console.log("⏰ [ROYALTY] Cron triggered: Pool contribution calculation");
      try {
        await calculatePoolContributions();
      } catch (err) {
        console.error("❌ [ROYALTY] Pool contribution cron failed:", err);
      }
    },
    {
      timezone: "UTC",
    },
  );

  console.log(
    "🎵 [ROYALTY] Royalty engine cron jobs scheduled (Mon 06:00 UTC distribution, Sun 23:00 UTC contributions)",
  );
}

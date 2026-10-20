/**
 * 🎵 STREAMROYALE — Weekly Royalty Distribution Engine
 *
 * Runs every Monday at 06:00 UTC via node-cron.
 * Distributes the PREVIOUS week's pool:
 *   • 20% Guaranteed Fund → split equally among all qualifying artists
 *   • 70% Performance Pool → proportional to weighted stream count
 *   • 10% Platform Cut → operational expenses
 *
 * Badge-tier boosts affect performance weight inside the 70% performance pool.
 */

import cron from "node-cron";
import type { PoolClient } from "pg";
import { pool } from "../db";
import { getIO } from "../websocket/socket-config";
import {
  calculateWeeklyRoyalties,
  ROYALTY_RULES,
} from "./royalty-calculation";
import { isPayingListenerStreamSql } from "./royalty-sql";

// ═══════════════════════════════════════════════════════════════════════════════
// POOL DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function distributeWeeklyPool(
  weekNumber: number,
  yearNumber: number,
  options: { dryRun?: boolean; connect?: () => Promise<PoolClient> } = {},
) {
  const dryRun = options.dryRun === true;
  console.log(
    `📊 [ROYALTY] Starting ${dryRun ? "dry-run " : ""}distribution for Week ${weekNumber}, ${yearNumber}...`,
  );

  const client = await (options.connect ?? (() => pool.connect()))();
  const pendingNotifications: any[] = [];
  let clientReleaseError: Error | undefined;

  try {
    // One transaction so a mid-run failure leaves no partial payouts to replay.
    await client.query("BEGIN");

    // 1. Lock the pool
    const poolResult = dryRun
      ? await client.query(
          `SELECT * FROM weekly_pools
           WHERE week_number = $1 AND year_number = $2 AND status = 'open'
           FOR UPDATE`,
          [weekNumber, yearNumber],
        )
      : await client.query(
          `UPDATE weekly_pools SET status = 'locked'
           WHERE week_number = $1 AND year_number = $2 AND status = 'open'
           RETURNING *`,
          [weekNumber, yearNumber],
        );

    if (poolResult.rows.length === 0) {
      const existingPool = await client.query(
        `SELECT status FROM weekly_pools WHERE week_number = $1 AND year_number = $2`,
        [weekNumber, yearNumber],
      );
      await client.query("COMMIT");
      const currentStatus = existingPool.rows[0]?.status ?? "missing";
      console.log(
        `⚠️ [ROYALTY] No open pool found for Week ${weekNumber}, ${yearNumber}; current status is ${currentStatus}`,
      );
      return {
        distributed: false,
        ...(dryRun ? { dryRun: true } : {}),
        reason: `No open pool found or already ${currentStatus}`,
      };
    }

    const weeklyPool = poolResult.rows[0];
    const totalPool = Number(weeklyPool.total_pool);
    if (!Number.isFinite(totalPool) || totalPool < 0) {
      throw new Error(`Invalid total_pool for Week ${weekNumber}, ${yearNumber}`);
    }

    if (totalPool === 0) {
      if (dryRun) {
        await client.query("ROLLBACK");
        return {
          distributed: false,
          dryRun: true,
          totalPool: 0,
          reason: "Empty pool",
        };
      }
      await client.query(
        `UPDATE weekly_pools SET status = 'distributed', distributed_at = NOW() 
         WHERE id = $1`,
        [weeklyPool.id],
      );
      await client.query("COMMIT");
      console.log(`⚠️ [ROYALTY] Pool is empty for Week ${weekNumber}`);
      return { distributed: true, totalPool: 0, reason: "Empty pool" };
    }

    // 2. Count all valid streams, but only paid-listener streams earn performance weight.
    const artistStreams = await client.query(
      `WITH weekly_events AS (
         SELECT se.artist_profile_id, se.user_id, se.boost_multiplier,
                  ${isPayingListenerStreamSql} AS is_paying_listener
         FROM stream_events se
         WHERE se.week_number = $1 AND se.year_number = $2
           AND se.is_valid = true AND COALESCE(se.is_self_stream, false) = false
       )
       SELECT we.artist_profile_id,
              ap.current_badge_tier,
              ap.revenue_boost_percent,
              ap.royalty_carry_forward,
              ap.user_id,
              ap.stage_name,
              ap.league_id,
              COUNT(*)::int AS stream_count,
              COUNT(DISTINCT we.user_id) FILTER (WHERE we.is_paying_listener)::int AS paying_listener_count,
              COALESCE(SUM(CASE WHEN we.is_paying_listener
                                THEN COALESCE(we.boost_multiplier::numeric, 0)
                                ELSE 0 END), 0) AS weighted_streams
       FROM weekly_events we
       JOIN artist_profiles ap ON ap.id = we.artist_profile_id
       GROUP BY we.artist_profile_id, ap.current_badge_tier, ap.revenue_boost_percent,
                ap.royalty_carry_forward, ap.user_id, ap.stage_name, ap.league_id
       HAVING COUNT(*) >= ${ROYALTY_RULES.minimumValidStreams}
          AND COUNT(DISTINCT we.user_id) FILTER (WHERE we.is_paying_listener) >= ${ROYALTY_RULES.minimumPayingListeners}
       ORDER BY weighted_streams DESC`,
      [weekNumber, yearNumber],
    );

    const artists = artistStreams.rows;
    const qualifyingArtists = artists.length;
    const calculation = calculateWeeklyRoyalties(
      totalPool,
      artists.map((artist: any) => ({
        artistProfileId: Number(artist.artist_profile_id),
        weightedStreams: Number(artist.weighted_streams) || 0,
        badgeBoostPercent: Number(artist.revenue_boost_percent) || 0,
        carryForwardCents:
          Math.round((Number(artist.royalty_carry_forward) || 0) * 100),
      })),
    );
    const guaranteedFund = calculation.guaranteedFundCents / 100;
    const performancePool = calculation.performancePoolCents / 100;
    const platformCut = calculation.platformCutCents / 100;

    if (qualifyingArtists === 0) {
      if (dryRun) {
        await client.query("ROLLBACK");
        return {
          distributed: false,
          dryRun: true,
          totalPool,
          guaranteedFund,
          performancePool,
          platformCut,
          qualifyingArtists: 0,
          reason: "No qualifying artists",
        };
      }
      await client.query(
        `UPDATE artist_profiles ap SET weekly_streams = 0, updated_at = NOW()
         WHERE EXISTS (
           SELECT 1 FROM stream_events se
           WHERE se.artist_profile_id = ap.id
             AND se.week_number = $1 AND se.year_number = $2
             AND se.is_valid = true
             AND COALESCE(se.is_self_stream, false) = false
         )`,
        [weekNumber, yearNumber],
      );
      await client.query(
        `UPDATE weekly_pools SET 
         guaranteed_fund = $1, performance_pool = $2, platform_cut = $3,
         qualifying_artists = 0, status = 'distributed', distributed_at = NOW()
         WHERE id = $4`,
        [guaranteedFund, performancePool, platformCut, weeklyPool.id],
      );
      await client.query("COMMIT");
      return {
        distributed: true,
        totalPool,
        qualifyingArtists: 0,
        reason: "No qualifying artists",
      };
    }

    // 3. Prepare deterministic rankings and allocations before any wallet writes.
    const allocations = new Map(
      calculation.allocations.map((allocation) => [
        allocation.artistProfileId,
        allocation,
      ]),
    );
    const totalDistributed = calculation.totalEarnedCents / 100;
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

    if (dryRun) {
      const preview = artists.map((artist: any) => {
        const allocation = allocations.get(Number(artist.artist_profile_id));
        if (!allocation) {
          throw new Error(
            `Missing royalty allocation for artist ${artist.artist_profile_id}`,
          );
        }
        return {
          artistProfileId: Number(artist.artist_profile_id),
          stageName: artist.stage_name,
          streams: Number(artist.stream_count) || 0,
          weightedStreams: Number(artist.weighted_streams) || 0,
          guaranteedAmount: allocation.guaranteedCents / 100,
          performanceAmount: allocation.performanceCents / 100,
          badgeBonus: allocation.badgeBonusCents / 100,
          totalEarnings: allocation.earnedCents / 100,
          walletCredit: allocation.walletCreditCents / 100,
          carryForward: allocation.carryForwardCents / 100,
        };
      });
      await client.query("ROLLBACK");
      return {
        distributed: false,
        dryRun: true,
        weekNumber,
        yearNumber,
        totalPool,
        guaranteedFund,
        performancePool,
        platformCut,
        totalDistributed,
        qualifyingArtists,
        distributions: preview,
      };
    }

    // 4. Persist the royalty breakdown and wallet carry-forward atomically.
    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      const artistProfileId = artist.artist_profile_id;
      const weightedStreams = parseFloat(artist.weighted_streams) || 0;
      const streamCount = parseInt(artist.stream_count) || 0;
      const allocation = allocations.get(Number(artistProfileId));
      if (!allocation) {
        throw new Error(`Missing royalty allocation for artist ${artistProfileId}`);
      }
      const guaranteedAmount = allocation.guaranteedCents / 100;
      const performanceAmount = allocation.performanceCents / 100;
      const badgeBonus = allocation.badgeBonusCents / 100;
      const totalEarnings = allocation.earnedCents / 100;
      const walletCredit = allocation.walletCreditCents / 100;
      const carryForward = allocation.carryForwardCents / 100;

      const globalRank =
        rankedByWeighted.findIndex(
          (a: any) => a.artist_profile_id === artistProfileId,
        ) + 1;
      const regRank = regionalRanks[artistProfileId] || 0;
      const poolSharePercent =
        totalPool > 0 ? (totalEarnings / totalPool) * 100 : 0;

      // Upsert royalty record
      await client.query(
        `INSERT INTO artist_royalties 
         (artist_profile_id, week_number, year_number, guaranteed_amount, performance_amount, 
          badge_bonus, total_earnings, stream_count, pool_share_percent, global_rank, regional_rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (artist_profile_id, week_number, year_number)
         DO UPDATE SET 
           guaranteed_amount = $4,
           performance_amount = $5,
           badge_bonus = $6,
           total_earnings = $7 + COALESCE(artist_royalties.tip_income, 0),
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
      await client.query(
        `UPDATE artist_profiles SET 
         wallet_balance = COALESCE(wallet_balance, 0) + $1,
         royalty_carry_forward = $2,
         updated_at = NOW()
         WHERE id = $3`,
        [walletCredit.toFixed(2), carryForward.toFixed(2), artistProfileId],
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
        walletCredit: parseFloat(walletCredit.toFixed(2)),
        carryForward: parseFloat(carryForward.toFixed(2)),
        globalRank,
        regionalRank: regRank,
      });

      if (artist.user_id) {
        pendingNotifications.push({
          userId: artist.user_id,
          totalEarnings,
          walletCredit,
          carryForward,
          guaranteedAmount,
          performanceAmount,
          badgeBonus,
          globalRank,
        });
      }
    }

    await client.query(
      `UPDATE artist_profiles ap SET weekly_streams = 0, updated_at = NOW()
       WHERE EXISTS (
         SELECT 1 FROM stream_events se
         WHERE se.artist_profile_id = ap.id
           AND se.week_number = $1 AND se.year_number = $2
           AND se.is_valid = true
           AND COALESCE(se.is_self_stream, false) = false
       )`,
      [weekNumber, yearNumber],
    );

    // 6. Update pool record
    await client.query(
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

    await client.query("COMMIT");

    // After commit, so a notification failure cannot trigger a payout replay.
    const io = getIO();
    for (const n of pendingNotifications) {
      if (io) {
        io.to(`user_${n.userId}`).emit("notification", {
          id: `royalty-${weekNumber}-${yearNumber}-${Date.now()}`,
          type: "royalty_payout",
          title: `💰 Weekly Earnings: $${n.totalEarnings.toFixed(2)}`,
          message:
            n.walletCredit > 0
              ? `Week ${weekNumber}: $${n.walletCredit.toFixed(2)} added to your wallet. Rank #${n.globalRank}.`
              : `Week ${weekNumber}: earnings below $1.00 carried forward ($${n.carryForward.toFixed(2)}). Rank #${n.globalRank}.`,
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            n.userId,
            "royalty_payout",
            `💰 Weekly Earnings: $${n.totalEarnings.toFixed(2)}`,
            `Week ${weekNumber}: Guaranteed $${n.guaranteedAmount.toFixed(2)} + Performance $${n.performanceAmount.toFixed(2)}${n.badgeBonus > 0 ? ` + Badge Bonus $${n.badgeBonus.toFixed(2)}` : ""}. ${n.walletCredit > 0 ? `$${n.walletCredit.toFixed(2)} added to your wallet.` : `$${n.carryForward.toFixed(2)} carried forward.`} Rank #${n.globalRank}.`,
            JSON.stringify({
              actionUrl: "/artist-portal/dashboard?tab=royalties",
            }),
          ],
        );
      } catch (e) {
        console.error("[royalty-engine] failed to persist payout notification:", e);
      }
    }

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
      `✅ [ROYALTY] Week ${weekNumber} distributed: $${totalDistributed.toFixed(2)} earned by ${qualifyingArtists} artists`,
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
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        `[ROYALTY] Rollback failed for Week ${weekNumber}; discarding database connection:`,
        rollbackError,
      );
      clientReleaseError =
        rollbackError instanceof Error
          ? rollbackError
          : new Error(String(rollbackError));
    }
    throw err;
  } finally {
    client.release(clientReleaseError);
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
    const contributionResult = await pool.query(
      `INSERT INTO weekly_pools (week_number, year_number, total_pool, status)
       VALUES ($1, $2, $3, 'open')
       ON CONFLICT (week_number, year_number)
       DO UPDATE SET total_pool = weekly_pools.total_pool + $3
       WHERE weekly_pools.status = 'open'`,
      [week, year, totalContribution.toFixed(2)],
    );

    if (contributionResult.rowCount === 0) {
      console.log(
        `⚠️ [ROYALTY] Skipped adding $${totalContribution.toFixed(2)} to Week ${week} pool because it is already locked/distributed`,
      );
      return 0;
    }

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
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
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

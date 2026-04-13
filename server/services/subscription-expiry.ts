/**
 * ⏰ Subscription Expiry Cron
 * Runs daily to manage subscription lifecycle:
 *   1. Listener subs: past_due → 7-day grace → hard downgrade to free
 *   2. Artist subs:   past_due → 7-day grace → hard downgrade to spark
 *   3. Trial expiry
 *   4. Renewal reminders (7 days before expiry)
 *   5. Manual re-subscribe prompt on hard downgrade
 */

import { pool } from "../db";

const EXPIRY_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_DELAY = 60 * 1000; // 1 minute after startup
const GRACE_PERIOD_DAYS = 7;

/**
 * Full subscription lifecycle processor.
 */
async function processExpiredSubscriptions(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let totalActions = 0;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. LISTENER / PLATFORM SUBS — 7-day grace period
    // ═══════════════════════════════════════════════════════════════════════

    // 1a. Move freshly-expired subs to past_due (grace period starts)
    const newlyPastDue = await client.query(
      `UPDATE users
       SET subscription_status = 'past_due'
       WHERE premium_expires_at IS NOT NULL
         AND premium_expires_at < NOW()
         AND subscription_tier != 'free'
         AND subscription_status = 'active'
       RETURNING id, username, subscription_tier, premium_expires_at`,
    );

    if (newlyPastDue.rows.length > 0) {
      console.log(
        `⏰ [GRACE] ${newlyPastDue.rows.length} listener subs entered grace period (7 days):`,
        newlyPastDue.rows
          .map(
            (r) => `User ${r.id} (${r.username}) tier:${r.subscription_tier}`,
          )
          .join(", "),
      );
      totalActions += newlyPastDue.rows.length;

      // Insert notifications for these users
      for (const user of newlyPastDue.rows) {
        try {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
             VALUES ($1, 'subscription', 'Subscription Expiring',
               'Your subscription has expired. You have 7 days to renew before being downgraded. Visit /pricing to renew.',
               NOW())`,
            [user.id],
          );
        } catch (e) {
          /* non-critical */
        }
      }
    }

    // 1b. Hard downgrade past_due subs after 7-day grace
    const hardDowngrade = await client.query(
      `UPDATE users
       SET subscription_tier = 'free',
           subscription_status = 'expired',
           premium_expires_at = NULL
       WHERE subscription_status = 'past_due'
         AND premium_expires_at IS NOT NULL
         AND premium_expires_at < NOW() - INTERVAL '${GRACE_PERIOD_DAYS} days'
         AND subscription_tier != 'free'
       RETURNING id, username, subscription_tier`,
    );

    if (hardDowngrade.rows.length > 0) {
      console.log(
        `⏰ [DOWNGRADE] ${hardDowngrade.rows.length} listener subs hard-downgraded to free (grace expired):`,
        hardDowngrade.rows
          .map((r) => `User ${r.id} (${r.username})`)
          .join(", "),
      );
      totalActions += hardDowngrade.rows.length;

      // Notify: prompt to re-subscribe
      for (const user of hardDowngrade.rows) {
        try {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
             VALUES ($1, 'subscription', 'Subscription Ended',
               'Your subscription has been downgraded to Free. Re-subscribe at /pricing to restore your benefits.',
               NOW())`,
            [user.id],
          );
        } catch (e) {
          /* non-critical */
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. ARTIST SUBS — 7-day grace period (current_period_end based)
    // ═══════════════════════════════════════════════════════════════════════

    // 2a. Move freshly-expired artist subs to past_due
    const artistPastDue = await client.query(
      `UPDATE artist_subscriptions
       SET status = 'past_due', updated_at = NOW()
       WHERE current_period_end IS NOT NULL
         AND current_period_end < NOW()
         AND status = 'active'
         AND tier != 'spark'
       RETURNING id, artist_profile_id, tier, current_period_end`,
    );

    if (artistPastDue.rows.length > 0) {
      console.log(
        `⏰ [ARTIST GRACE] ${artistPastDue.rows.length} artist subs entered grace period:`,
        artistPastDue.rows
          .map((r) => `Profile ${r.artist_profile_id} tier:${r.tier}`)
          .join(", "),
      );
      totalActions += artistPastDue.rows.length;

      // Notify artists
      for (const sub of artistPastDue.rows) {
        try {
          const userResult = await client.query(
            `SELECT u.id FROM users u
             JOIN artist_profiles ap ON ap.user_id = u.id
             WHERE ap.id = $1`,
            [sub.artist_profile_id],
          );
          if (userResult.rows[0]) {
            await client.query(
              `INSERT INTO notifications (user_id, type, title, message, created_at)
               VALUES ($1, 'subscription', 'Artist Subscription Expiring',
                 'Your ${sub.tier} subscription has expired. You have 7 days to renew before being downgraded to Spark. Uploads are paused during grace period.',
                 NOW())`,
              [userResult.rows[0].id],
            );
          }
        } catch (e) {
          /* non-critical */
        }
      }
    }

    // 2b. Hard downgrade artist subs after 7-day grace → Spark
    const artistDowngrade = await client.query(
      `UPDATE artist_subscriptions
       SET tier = 'spark', status = 'expired',
           boost_credits_remaining = 0, updated_at = NOW()
       WHERE status = 'past_due'
         AND current_period_end IS NOT NULL
         AND current_period_end < NOW() - INTERVAL '${GRACE_PERIOD_DAYS} days'
         AND tier != 'spark'
       RETURNING id, artist_profile_id, tier`,
    );

    if (artistDowngrade.rows.length > 0) {
      console.log(
        `⏰ [ARTIST DOWNGRADE] ${artistDowngrade.rows.length} artist subs downgraded to Spark:`,
        artistDowngrade.rows
          .map((r) => `Profile ${r.artist_profile_id}`)
          .join(", "),
      );
      totalActions += artistDowngrade.rows.length;

      for (const sub of artistDowngrade.rows) {
        try {
          const userResult = await client.query(
            `SELECT u.id FROM users u
             JOIN artist_profiles ap ON ap.user_id = u.id
             WHERE ap.id = $1`,
            [sub.artist_profile_id],
          );
          if (userResult.rows[0]) {
            await client.query(
              `INSERT INTO notifications (user_id, type, title, message, created_at)
               VALUES ($1, 'subscription', 'Artist Subscription Ended',
                 'Your subscription has been downgraded to Spark (free). Re-subscribe in the Artist Portal to restore your upload limits and features.',
                 NOW())`,
              [userResult.rows[0].id],
            );
          }
        } catch (e) {
          /* non-critical */
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. TRIAL EXPIRY
    // ═══════════════════════════════════════════════════════════════════════

    const expiredTrials = await client.query(
      `UPDATE users
       SET trial_tier = NULL,
           subscription_status = CASE
             WHEN subscription_tier = 'free' THEN 'active'
             ELSE subscription_status
           END
       WHERE trial_tier IS NOT NULL
         AND trial_expires_at IS NOT NULL
         AND trial_expires_at < NOW()
       RETURNING id, username, trial_tier`,
    );

    if (expiredTrials.rows.length > 0) {
      console.log(
        `⏰ Expired ${expiredTrials.rows.length} trials:`,
        expiredTrials.rows
          .map((r) => `User ${r.id} (${r.username}) trial:${r.trial_tier}`)
          .join(", "),
      );
      totalActions += expiredTrials.rows.length;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. RENEWAL REMINDERS — 7 days before expiry
    // ═══════════════════════════════════════════════════════════════════════

    // 4a. Listener renewal reminders
    const listenerReminders = await client.query(
      `SELECT id, username, subscription_tier, premium_expires_at
       FROM users
       WHERE premium_expires_at IS NOT NULL
         AND premium_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
         AND subscription_status = 'active'
         AND subscription_tier != 'free'
         AND id NOT IN (
           SELECT user_id FROM notifications
           WHERE type = 'subscription' AND title = 'Renewal Reminder'
           AND created_at > NOW() - INTERVAL '6 days'
         )`,
    );

    for (const user of listenerReminders.rows) {
      try {
        const daysLeft = Math.ceil(
          (new Date(user.premium_expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'subscription', 'Renewal Reminder',
             'Your ${user.subscription_tier} subscription expires in ${daysLeft} day(s). Renew at /pricing to keep your benefits.',
             NOW())`,
          [user.id],
        );
      } catch (e) {
        /* non-critical */
      }
    }

    if (listenerReminders.rows.length > 0) {
      console.log(
        `⏰ [REMINDER] Sent ${listenerReminders.rows.length} listener renewal reminders`,
      );
      totalActions += listenerReminders.rows.length;
    }

    // 4b. Artist renewal reminders
    const artistReminders = await client.query(
      `SELECT as2.id, as2.artist_profile_id, as2.tier, as2.current_period_end, u.id as user_id
       FROM artist_subscriptions as2
       JOIN artist_profiles ap ON ap.id = as2.artist_profile_id
       JOIN users u ON u.id = ap.user_id
       WHERE as2.current_period_end IS NOT NULL
         AND as2.current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
         AND as2.status = 'active'
         AND as2.tier != 'spark'
         AND u.id NOT IN (
           SELECT user_id FROM notifications
           WHERE type = 'subscription' AND title = 'Artist Renewal Reminder'
           AND created_at > NOW() - INTERVAL '6 days'
         )`,
    );

    for (const sub of artistReminders.rows) {
      try {
        const daysLeft = Math.ceil(
          (new Date(sub.current_period_end).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'subscription', 'Artist Renewal Reminder',
             'Your ${sub.tier} artist subscription expires in ${daysLeft} day(s). Renew in the Artist Portal to keep your upload limits and features.',
             NOW())`,
          [sub.user_id],
        );
      } catch (e) {
        /* non-critical */
      }
    }

    if (artistReminders.rows.length > 0) {
      console.log(
        `⏰ [REMINDER] Sent ${artistReminders.rows.length} artist renewal reminders`,
      );
      totalActions += artistReminders.rows.length;
    }

    await client.query("COMMIT");

    if (totalActions === 0) {
      console.log("⏰ Subscription expiry check: no actions needed.");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Subscription expiry cron error:", error);
  } finally {
    client.release();
  }
}

/**
 * Initialize the subscription expiry scheduler.
 * Call once on server startup.
 */
export function setupSubscriptionExpiryCron(): void {
  // Run once shortly after startup
  setTimeout(() => {
    console.log("⏰ Running initial subscription expiry check...");
    processExpiredSubscriptions();
  }, INITIAL_DELAY);

  // Then run every 24 hours
  setInterval(() => {
    console.log("⏰ Running scheduled subscription expiry check...");
    processExpiredSubscriptions();
  }, EXPIRY_CHECK_INTERVAL);

  console.log("⏰ Subscription expiry cron scheduled (every 24h)");
}

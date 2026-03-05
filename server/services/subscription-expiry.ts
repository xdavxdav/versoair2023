/**
 * ⏰ Subscription Expiry Cron
 * Runs daily to downgrade users whose subscriptions have expired.
 * Checks both premium_expires_at and trial_expires_at fields.
 */

import { pool } from "../db";

const EXPIRY_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_DELAY = 60 * 1000; // 1 minute after startup

/**
 * Downgrade expired subscriptions to free tier.
 */
async function processExpiredSubscriptions(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Downgrade expired paid subscriptions
    const expiredSubs = await client.query(
      `UPDATE users
       SET subscription_tier = 'free',
           subscription_status = 'expired',
           premium_expires_at = NULL
       WHERE premium_expires_at IS NOT NULL
         AND premium_expires_at < NOW()
         AND subscription_tier != 'free'
       RETURNING id, username, subscription_tier`,
    );

    if (expiredSubs.rows.length > 0) {
      console.log(
        `⏰ Downgraded ${expiredSubs.rows.length} expired subscriptions:`,
        expiredSubs.rows.map((r) => `User ${r.id} (${r.username})`).join(", "),
      );
    }

    // 2. Expire completed trials (trial_expires_at already past)
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
    }

    await client.query("COMMIT");

    const total = expiredSubs.rows.length + expiredTrials.rows.length;
    if (total === 0) {
      console.log("⏰ Subscription expiry check: no expirations found.");
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

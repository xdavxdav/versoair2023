import { pool } from "../db";

/**
 * Marketplace Auto-Approve Service
 * Automatically approves pending listings after 24 hours
 * Runs every hour to check for stale pending listings
 */

async function autoApproveStalePendingListings(): Promise<number> {
  try {
    const result = await pool.query(
      `UPDATE ad_journal_listings 
       SET status = 'active', updated_at = NOW() 
       WHERE status = 'pending' 
         AND created_at < NOW() - INTERVAL '24 hours'
       RETURNING id, title`,
    );

    const approvedCount = result.rowCount || 0;

    if (approvedCount > 0) {
      console.log(
        `[MARKETPLACE-CRON] Auto-approved ${approvedCount} pending listings after 24h:`,
        result.rows.map((r: any) => `#${r.id} "${r.title}"`).join(", "),
      );
    }

    return approvedCount;
  } catch (error: any) {
    console.error("[MARKETPLACE-CRON] Auto-approve error:", error.message);
    return 0;
  }
}

export function setupMarketplaceAutoApprove(): void {
  // Run immediately on startup
  autoApproveStalePendingListings().then((count) => {
    if (count > 0) {
      console.log(
        `[MARKETPLACE-CRON] Startup: Auto-approved ${count} stale listings`,
      );
    }
  });

  // Then run every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(async () => {
    await autoApproveStalePendingListings();
  }, ONE_HOUR);

  console.log(
    "[MARKETPLACE-CRON] Auto-approve scheduler initialized (checks hourly, approves after 24h)",
  );
}

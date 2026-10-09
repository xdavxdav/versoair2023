import cron from "node-cron";
import { pool } from "../db";
import { queueNewsletterCampaign } from "./newsletter-delivery";

/**
 * Newsletter Campaign Scheduler
 * Runs hourly — checks for scheduled campaigns that are due and sends them
 * via the existing email_queue system.
 */
export function setupNewsletterCron() {
  // Every hour at minute 5
  cron.schedule("5 * * * *", async () => {
    try {
      const dueCampaigns = await pool.query(
        `SELECT id FROM newsletter_campaigns
         WHERE status = 'scheduled' AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC`,
      );

      for (const campaign of dueCampaigns.rows) {
        const result = await queueNewsletterCampaign(
          campaign.id,
          "scheduled",
          () => pool.connect(),
        );
        if (!result) continue;

        console.log(
          `[NEWSLETTER-CRON] Campaign ${campaign.id} queued to ${result.recipientCount} subscribers`,
        );
      }
    } catch (error) {
      console.error("[NEWSLETTER-CRON] Error processing campaigns:", error);
    }
  });

  console.log("📧 [NEWSLETTER-CRON] Scheduled: hourly campaign check");
}

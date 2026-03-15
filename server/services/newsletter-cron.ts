import cron from "node-cron";
import { pool } from "../db";

/**
 * Newsletter Campaign Scheduler
 * Runs hourly — checks for scheduled campaigns that are due and sends them
 * via the existing email_queue system.
 */
export function setupNewsletterCron() {
  // Every hour at minute 5
  cron.schedule("5 * * * *", async () => {
    try {
      // Find campaigns that are scheduled and due
      const dueCampaigns = await pool.query(
        `SELECT * FROM newsletter_campaigns
         WHERE status = 'scheduled' AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC`,
      );

      if (dueCampaigns.rows.length === 0) return;

      for (const campaign of dueCampaigns.rows) {
        console.log(
          `[NEWSLETTER-CRON] Sending campaign: "${campaign.title}" (ID: ${campaign.id})`,
        );

        // Mark as sending
        await pool.query(
          `UPDATE newsletter_campaigns SET status = 'sending', updated_at = NOW() WHERE id = $1`,
          [campaign.id],
        );

        // Get all active subscribers
        const subscribers = await pool.query(
          `SELECT email, name FROM newsletter_subscribers WHERE is_active = true`,
        );

        let queued = 0;
        for (const sub of subscribers.rows) {
          await pool.query(
            `INSERT INTO email_queue (recipient_email, subject, html_body, email_type, status)
             VALUES ($1, $2, $3, 'newsletter', 'pending')`,
            [
              sub.email,
              campaign.subject || campaign.title,
              campaign.content || `<p>${campaign.title}</p>`,
            ],
          );
          queued++;
        }

        // Mark as sent
        await pool.query(
          `UPDATE newsletter_campaigns SET status = 'sent', sent_at = NOW(), recipient_count = $1, updated_at = NOW() WHERE id = $2`,
          [queued, campaign.id],
        );

        console.log(
          `[NEWSLETTER-CRON] Campaign "${campaign.title}" sent to ${queued} subscribers`,
        );
      }
    } catch (error) {
      console.error("[NEWSLETTER-CRON] Error processing campaigns:", error);
    }
  });

  console.log("📧 [NEWSLETTER-CRON] Scheduled: hourly campaign check");
}

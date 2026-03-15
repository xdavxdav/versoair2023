import cron from "node-cron";
import { pool } from "../db";
import { generateJournalPDF } from "./journal-pdf-generator";

/**
 * Journal Cron Service
 * - Weekly: Sunday 22:00 UTC — generates weekly edition
 * - Monthly: 1st of month 22:00 UTC — generates monthly edition
 * Emails PDF to subscribers whose preference matches, via email_queue.
 */
export function setupJournalCron() {
  // ── Weekly edition — every Sunday at 22:00 UTC ──
  cron.schedule("0 22 * * 0", async () => {
    console.log("[JOURNAL-CRON] Starting weekly journal generation...");
    try {
      const { filePath, listingCount } = await generateJournalPDF("weekly");

      // Store edition in DB
      await pool.query(
        `INSERT INTO journal_editions (edition_date, type, file_path, listing_count) VALUES (CURRENT_DATE, 'weekly', $1, $2)`,
        [filePath, listingCount],
      );

      // Queue emails to weekly + both subscribers
      const subscribers = await pool.query(
        `SELECT email, name FROM newsletter_subscribers WHERE is_active = true AND journal_pdf_preference IN ('weekly', 'both')`,
      );

      for (const sub of subscribers.rows) {
        await pool.query(
          `INSERT INTO email_queue (recipient_email, subject, html_body, email_type, status)
           VALUES ($1, $2, $3, 'journal_edition', 'pending')`,
          [
            sub.email,
            `📰 Journal Verso Air — Édition Hebdomadaire`,
            `<p>Bonjour ${sub.name || ""},</p>
             <p>Votre édition hebdomadaire du journal d'annonces est prête !</p>
             <p><strong>${listingCount} annonces</strong> dans cette édition.</p>
             <p>Connectez-vous pour télécharger : <a href="${process.env.VITE_API_URL || "https://verso-air.com"}/marketing/journal">Voir le journal</a></p>
             <p>— L'équipe Verso Air</p>`,
          ],
        );
      }

      console.log(
        `[JOURNAL-CRON] Weekly edition generated: ${listingCount} listings, ${subscribers.rows.length} emails queued`,
      );
    } catch (error) {
      console.error("[JOURNAL-CRON] Weekly generation failed:", error);
    }
  });

  // ── Monthly edition — 1st of each month at 22:00 UTC ──
  cron.schedule("0 22 1 * *", async () => {
    console.log("[JOURNAL-CRON] Starting monthly journal generation...");
    try {
      const { filePath, listingCount } = await generateJournalPDF("monthly");

      await pool.query(
        `INSERT INTO journal_editions (edition_date, type, file_path, listing_count) VALUES (CURRENT_DATE, 'monthly', $1, $2)`,
        [filePath, listingCount],
      );

      const subscribers = await pool.query(
        `SELECT email, name FROM newsletter_subscribers WHERE is_active = true AND journal_pdf_preference IN ('monthly', 'both')`,
      );

      for (const sub of subscribers.rows) {
        await pool.query(
          `INSERT INTO email_queue (recipient_email, subject, html_body, email_type, status)
           VALUES ($1, $2, $3, 'journal_edition', 'pending')`,
          [
            sub.email,
            `📰 Journal Verso Air — Édition Mensuelle`,
            `<p>Bonjour ${sub.name || ""},</p>
             <p>Votre édition mensuelle du journal d'annonces est disponible !</p>
             <p><strong>${listingCount} annonces</strong> dans cette édition.</p>
             <p>Connectez-vous pour télécharger : <a href="${process.env.VITE_API_URL || "https://verso-air.com"}/marketing/journal">Voir le journal</a></p>
             <p>— L'équipe Verso Air</p>`,
          ],
        );
      }

      console.log(
        `[JOURNAL-CRON] Monthly edition generated: ${listingCount} listings, ${subscribers.rows.length} emails queued`,
      );
    } catch (error) {
      console.error("[JOURNAL-CRON] Monthly generation failed:", error);
    }
  });

  console.log(
    "📰 [JOURNAL-CRON] Scheduled: weekly (Sun 22:00) + monthly (1st 22:00)",
  );
}

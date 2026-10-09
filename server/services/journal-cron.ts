import cron from "node-cron";
import { pool } from "../db";
import { generateJournalPDF } from "./journal-pdf-generator";

const JOURNAL_CRON_LOCK_KEYS: Record<JournalEditionType, number> = {
  weekly: 74182002,
  monthly: 74182003,
};

type JournalEditionType = "weekly" | "monthly";

interface JournalRunResult {
  state: "generated" | "skipped";
  reason?: "already-running" | "already-generated";
  listingCount?: number;
  queuedEmails?: number;
}

async function generateAndQueueEdition(
  type: JournalEditionType,
): Promise<JournalRunResult> {
  const client = await pool.connect();
  let transactionOpen = false;
  let releaseError: Error | undefined;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const lock = await client.query(
      "SELECT pg_try_advisory_xact_lock($1) AS acquired",
      [JOURNAL_CRON_LOCK_KEYS[type]],
    );
    if (lock.rows[0]?.acquired !== true) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return { state: "skipped", reason: "already-running" };
    }

    const existingEdition = await client.query(
      `SELECT id
       FROM journal_editions
       WHERE edition_date = CURRENT_DATE AND type = $1
       LIMIT 1`,
      [type],
    );

    if (existingEdition.rows.length > 0) {
      await client.query("COMMIT");
      transactionOpen = false;
      return { state: "skipped", reason: "already-generated" };
    }

    const { filePath, listingCount } = await generateJournalPDF(type);
    await client.query(
      `INSERT INTO journal_editions
         (edition_date, type, file_path, listing_count)
       VALUES (CURRENT_DATE, $1, $2, $3)`,
      [type, filePath, listingCount],
    );

    const preference =
      type === "weekly" ? "('weekly', 'both')" : "('monthly', 'both')";
    const subscribers = await client.query<{ email: string; name: string | null }>(
      `SELECT email, name
       FROM newsletter_subscribers
       WHERE is_active = true AND journal_pdf_preference IN ${preference}`,
    );

    const subject =
      type === "weekly"
        ? "📰 Journal Verso Air — Édition Hebdomadaire"
        : "📰 Journal Verso Air — Édition Mensuelle";
    const availability =
      type === "weekly"
        ? "Votre édition hebdomadaire du journal d'annonces est prête !"
        : "Votre édition mensuelle du journal d'annonces est disponible !";
    let queuedEmails = 0;

    for (const subscriber of subscribers.rows) {
      await client.query(
        `INSERT INTO email_queue
           (recipient_email, subject, html_body, email_type, status)
         VALUES ($1, $2, $3, 'journal_edition', 'pending')`,
        [
          subscriber.email,
          subject,
          `<p>Bonjour ${subscriber.name || ""},</p>
           <p>${availability}</p>
           <p><strong>${listingCount} annonces</strong> dans cette édition.</p>
           <p>Connectez-vous pour télécharger : <a href="${process.env.VITE_API_URL || "https://verso-air.com"}/marketing/journal">Voir le journal</a></p>
           <p>— L'équipe Verso Air</p>`,
        ],
      );
      queuedEmails++;
    }

    await client.query("COMMIT");
    transactionOpen = false;
    return { state: "generated", listingCount, queuedEmails };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        releaseError =
          rollbackError instanceof Error
            ? rollbackError
            : new Error(String(rollbackError));
        console.error(
          "[JOURNAL-CRON] Failed to roll back edition:",
          releaseError,
        );
      }
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export function setupJournalCron() {
  cron.schedule("0 22 * * 0", async () => {
    console.log("[JOURNAL-CRON] Starting weekly journal generation...");
    try {
      const result = await generateAndQueueEdition("weekly");
      if (result.state === "skipped") {
        console.log(
          `[JOURNAL-CRON] Weekly edition skipped: ${result.reason}`,
        );
        return;
      }
      console.log(
        `[JOURNAL-CRON] Weekly edition generated: ${result.listingCount} listings, ${result.queuedEmails} emails queued`,
      );
    } catch (error) {
      console.error("[JOURNAL-CRON] Weekly generation failed:", error);
    }
  });

  cron.schedule("0 22 1 * *", async () => {
    console.log("[JOURNAL-CRON] Starting monthly journal generation...");
    try {
      const result = await generateAndQueueEdition("monthly");
      if (result.state === "skipped") {
        console.log(
          `[JOURNAL-CRON] Monthly edition skipped: ${result.reason}`,
        );
        return;
      }
      console.log(
        `[JOURNAL-CRON] Monthly edition generated: ${result.listingCount} listings, ${result.queuedEmails} emails queued`,
      );
    } catch (error) {
      console.error("[JOURNAL-CRON] Monthly generation failed:", error);
    }
  });

  console.log(
    "📰 [JOURNAL-CRON] Scheduled: weekly (Sun 22:00) + monthly (1st 22:00)",
  );
}

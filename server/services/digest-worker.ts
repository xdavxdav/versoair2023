/**
 * 📮 Digest Worker — Batched Email Delivery Service
 *
 * Processes the email_queue table on a schedule:
 *   - Hourly: check for daily_digest subscribers whose items are ready
 *   - Daily at 8 AM: send daily digest compilations
 *   - Weekly on Monday 8 AM: send weekly digest compilations
 *   - Weekly: generate & send GeoAdmin market reports
 *
 * Each run:
 *   1. Groups pending queue items by subscription → recipient
 *   2. Renders a single digest email with all items
 *   3. Sends via email-service and marks items as sent/failed
 *   4. Retries failed items up to 3 times
 */

import { db, pool } from "../db";
import { emailQueue, emailSubscriptions, users } from "@shared/schema";
import { eq, and, sql, lte, inArray } from "drizzle-orm";
import {
  sendJobAlertEmail,
  sendContractAlertEmail,
  sendGeoAdminReportEmail,
  sendEmail,
  type JobAlertData,
  type ContractAlertData,
  type GeoAdminReportData,
} from "./email-service";

// ─── CONFIGURATION ──────────────────────────────────────────────────────────────

const DIGEST_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;
const BATCH_SIZE = 50; // Process up to 50 queue items per run
const DAILY_DIGEST_HOUR = 8; // 8 AM local server time
const WEEKLY_DIGEST_DAY = 1; // Monday

let digestInterval: ReturnType<typeof setInterval> | null = null;

// ─── MAIN WORKER ────────────────────────────────────────────────────────────────

/**
 * Initialize the digest worker on server startup.
 * Runs immediately, then on the configured interval.
 */
export function startDigestWorker(): void {
  console.log("[DIGEST] 📮 Starting digest worker...");

  // Run once on startup (with a small delay so DB is ready)
  setTimeout(() => {
    processDigestQueue().catch((err) =>
      console.error("[DIGEST] Initial run error:", err),
    );
  }, 5000);

  // Schedule hourly runs
  digestInterval = setInterval(() => {
    processDigestQueue().catch((err) =>
      console.error("[DIGEST] Scheduled run error:", err),
    );
  }, DIGEST_CHECK_INTERVAL_MS);

  console.log(
    `[DIGEST] Worker scheduled every ${DIGEST_CHECK_INTERVAL_MS / 60000} minutes`,
  );
}

/**
 * Stop the digest worker (for graceful shutdown).
 */
export function stopDigestWorker(): void {
  if (digestInterval) {
    clearInterval(digestInterval);
    digestInterval = null;
    console.log("[DIGEST] Worker stopped");
  }
}

// ─── QUEUE PROCESSOR ────────────────────────────────────────────────────────────

/**
 * Main processing loop — decides what to send based on current time.
 */
async function processDigestQueue(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  console.log(
    `[DIGEST] Processing queue at ${now.toISOString()} (hour=${hour}, day=${dayOfWeek})`,
  );

  // 1. Always: retry failed items
  await retryFailedItems();

  // 2. Check if it's time for daily digests (8 AM)
  if (hour === DAILY_DIGEST_HOUR) {
    await processDailyDigests();
  }

  // 3. Check if it's time for weekly digests (Monday 8 AM)
  if (dayOfWeek === WEEKLY_DIGEST_DAY && hour === DAILY_DIGEST_HOUR) {
    await processWeeklyDigests();
    await processGeoAdminReports();
  }
}

/**
 * Process daily digest subscriptions:
 * Groups all pending queue items per user, renders one digest email per user.
 */
async function processDailyDigests(): Promise<void> {
  console.log("[DIGEST] Processing daily digests...");

  try {
    // Find all pending items for daily_digest subscribers
    const pendingItems = await db
      .select({
        queueItem: emailQueue,
        subscriptionFrequency: emailSubscriptions.frequency,
        unsubscribeToken: emailSubscriptions.unsubscribeToken,
        recipientName: users.username,
      })
      .from(emailQueue)
      .innerJoin(
        emailSubscriptions,
        eq(emailQueue.subscriptionId, emailSubscriptions.id),
      )
      .innerJoin(users, eq(emailQueue.recipientUserId, users.id))
      .where(
        and(
          eq(emailQueue.status, "pending"),
          eq(emailSubscriptions.frequency, "daily_digest"),
          eq(emailSubscriptions.isActive, true),
        ),
      )
      .limit(BATCH_SIZE);

    if (pendingItems.length === 0) {
      console.log("[DIGEST] No daily digest items to process");
      return;
    }

    // Group by recipient
    const grouped = groupByRecipient(pendingItems);
    let sent = 0;

    for (const [recipientEmail, items] of Object.entries(grouped)) {
      try {
        const success = await sendDigestEmail(recipientEmail, items, "daily");
        const status = success ? "sent" : "failed";
        const queueIds = items.map((i) => i.queueItem.id);

        // Update all queue items for this recipient
        await db
          .update(emailQueue)
          .set({
            status,
            sentAt: success ? new Date() : undefined,
            error: success ? undefined : "Digest send failed",
          })
          .where(inArray(emailQueue.id, queueIds));

        if (success) sent++;
      } catch (err) {
        console.error(
          `[DIGEST] Failed to send daily digest to ${recipientEmail}:`,
          err,
        );
      }
    }

    console.log(
      `[DIGEST] Daily digests: ${sent}/${Object.keys(grouped).length} sent`,
    );
  } catch (error) {
    console.error("[DIGEST] Error processing daily digests:", error);
  }
}

/**
 * Process weekly digest subscriptions (same pattern, different frequency filter).
 */
async function processWeeklyDigests(): Promise<void> {
  console.log("[DIGEST] Processing weekly digests...");

  try {
    const pendingItems = await db
      .select({
        queueItem: emailQueue,
        subscriptionFrequency: emailSubscriptions.frequency,
        unsubscribeToken: emailSubscriptions.unsubscribeToken,
        recipientName: users.username,
      })
      .from(emailQueue)
      .innerJoin(
        emailSubscriptions,
        eq(emailQueue.subscriptionId, emailSubscriptions.id),
      )
      .innerJoin(users, eq(emailQueue.recipientUserId, users.id))
      .where(
        and(
          eq(emailQueue.status, "pending"),
          eq(emailSubscriptions.frequency, "weekly_digest"),
          eq(emailSubscriptions.isActive, true),
        ),
      )
      .limit(BATCH_SIZE * 2); // Larger batch for weekly

    if (pendingItems.length === 0) {
      console.log("[DIGEST] No weekly digest items to process");
      return;
    }

    const grouped = groupByRecipient(pendingItems);
    let sent = 0;

    for (const [recipientEmail, items] of Object.entries(grouped)) {
      try {
        const success = await sendDigestEmail(recipientEmail, items, "weekly");
        const status = success ? "sent" : "failed";
        const queueIds = items.map((i) => i.queueItem.id);

        await db
          .update(emailQueue)
          .set({
            status,
            sentAt: success ? new Date() : undefined,
            error: success ? undefined : "Weekly digest send failed",
          })
          .where(inArray(emailQueue.id, queueIds));

        if (success) sent++;
      } catch (err) {
        console.error(
          `[DIGEST] Failed to send weekly digest to ${recipientEmail}:`,
          err,
        );
      }
    }

    console.log(
      `[DIGEST] Weekly digests: ${sent}/${Object.keys(grouped).length} sent`,
    );
  } catch (error) {
    console.error("[DIGEST] Error processing weekly digests:", error);
  }
}

/**
 * Generate and send GeoAdmin market report emails.
 * Gathers platform-wide metrics and sends to geoadmin_reports subscribers.
 */
async function processGeoAdminReports(): Promise<void> {
  console.log("[DIGEST] Generating GeoAdmin market reports...");

  try {
    // Gather platform metrics
    const metrics = await gatherPlatformMetrics();

    // Find all active geoadmin_reports subscribers
    const subscribers = await db
      .select({
        subscription: emailSubscriptions,
        email: users.email,
        username: users.username,
      })
      .from(emailSubscriptions)
      .innerJoin(users, eq(emailSubscriptions.userId, users.id))
      .where(
        and(
          eq(emailSubscriptions.type, "geoadmin_reports"),
          eq(emailSubscriptions.isActive, true),
        ),
      );

    if (subscribers.length === 0) {
      console.log("[DIGEST] No GeoAdmin report subscribers");
      return;
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const period = `Weekly Report — ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const appUrl =
      process.env.VITE_API_URL ||
      process.env.VERSOAIR_URL ||
      "http://localhost:5003";

    const report: GeoAdminReportData = {
      reportTitle: "Weekly Market Intelligence",
      period,
      metrics: metrics.kpis,
      topBusinesses: metrics.topBusinesses,
      insights: metrics.insights,
    };

    let sent = 0;
    for (const sub of subscribers) {
      const unsubscribeUrl = `${appUrl}/api/v1/email-subscriptions/unsubscribe/${sub.subscription.unsubscribeToken}`;
      const success = await sendGeoAdminReportEmail(
        sub.email!,
        sub.username || "Admin",
        report,
        unsubscribeUrl,
      );

      if (success) {
        sent++;
        await db
          .update(emailSubscriptions)
          .set({ lastSentAt: new Date() })
          .where(eq(emailSubscriptions.id, sub.subscription.id));
      }
    }

    console.log(
      `[DIGEST] GeoAdmin reports: ${sent}/${subscribers.length} sent`,
    );
  } catch (error) {
    console.error("[DIGEST] Error processing GeoAdmin reports:", error);
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────────

/**
 * Group queue items by recipient email for digest compilation.
 */
function groupByRecipient(items: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    const email = item.queueItem.recipientEmail;
    if (!grouped[email]) grouped[email] = [];
    grouped[email].push(item);
  }
  return grouped;
}

/**
 * Render and send a compiled digest email (multiple items in one email).
 */
async function sendDigestEmail(
  recipientEmail: string,
  items: any[],
  digestType: "daily" | "weekly",
): Promise<boolean> {
  const recipientName = items[0]?.recipientName || "User";
  const unsubscribeToken = items[0]?.unsubscribeToken || "";
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";
  const unsubscribeUrl = `${appUrl}/api/v1/email-subscriptions/unsubscribe/${unsubscribeToken}`;

  // Separate items by type
  const jobItems: JobAlertData[] = [];
  const contractItems: ContractAlertData[] = [];

  for (const item of items) {
    try {
      const data = JSON.parse(item.queueItem.htmlBody);
      if (item.queueItem.emailType === "job_alert") {
        jobItems.push(data as JobAlertData);
      } else if (item.queueItem.emailType === "contract_alert") {
        contractItems.push(data as ContractAlertData);
      }
    } catch {
      // Skip malformed items
    }
  }

  // Send job alerts digest if any
  if (jobItems.length > 0) {
    await sendJobAlertEmail(
      recipientEmail,
      recipientName,
      jobItems,
      unsubscribeUrl,
    );
  }

  // Send contract alerts digest if any
  if (contractItems.length > 0) {
    await sendContractAlertEmail(
      recipientEmail,
      recipientName,
      contractItems,
      unsubscribeUrl,
    );
  }

  // If neither, send a generic digest (shouldn't happen often)
  if (jobItems.length === 0 && contractItems.length === 0) {
    const subject = `📬 Your ${digestType} digest — Verso Air`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your ${digestType} digest</h2>
        <p>Hi ${recipientName}, you have ${items.length} pending notification(s). Visit your dashboard to see what's new.</p>
        <p><a href="${appUrl}" style="color: #bf831c;">Go to Verso Air →</a></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #888;"><a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a></p>
      </div>
    `;
    return sendEmail(recipientEmail, subject, html);
  }

  return true;
}

/**
 * Retry failed queue items (up to MAX_RETRIES).
 */
async function retryFailedItems(): Promise<void> {
  try {
    const failedItems = await db
      .select()
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.status, "failed"),
          sql`${emailQueue.retryCount} < ${MAX_RETRIES}`,
        ),
      )
      .limit(20);

    if (failedItems.length === 0) return;

    console.log(`[DIGEST] Retrying ${failedItems.length} failed items...`);

    for (const item of failedItems) {
      try {
        const sent = await sendEmail(
          item.recipientEmail,
          item.subject,
          item.htmlBody,
        );

        await db
          .update(emailQueue)
          .set({
            status: sent ? "sent" : "failed",
            sentAt: sent ? new Date() : undefined,
            retryCount: (item.retryCount || 0) + 1,
            error: sent
              ? undefined
              : `Retry ${(item.retryCount || 0) + 1} failed`,
          })
          .where(eq(emailQueue.id, item.id));
      } catch (err) {
        await db
          .update(emailQueue)
          .set({
            retryCount: (item.retryCount || 0) + 1,
            error: `Retry error: ${err instanceof Error ? err.message : String(err)}`,
          })
          .where(eq(emailQueue.id, item.id));
      }
    }
  } catch (error) {
    console.error("[DIGEST] Error retrying failed items:", error);
  }
}

/**
 * Gather platform-wide metrics for GeoAdmin reports.
 * Pulls from the businesses, reservations, and users tables.
 */
async function gatherPlatformMetrics(): Promise<{
  kpis: GeoAdminReportData["metrics"];
  topBusinesses: GeoAdminReportData["topBusinesses"];
  insights: string[];
}> {
  try {
    // Total businesses
    const businessCount = await pool.query(
      `SELECT COUNT(*) as total FROM businesses`,
    );
    // New businesses this week
    const newBiz = await pool.query(
      `SELECT COUNT(*) as total FROM businesses WHERE created_at > NOW() - INTERVAL '7 days'`,
    );
    // Total users
    const userCount = await pool.query(`SELECT COUNT(*) as total FROM users`);
    // Active reservations
    const reservationCount = await pool.query(
      `SELECT COUNT(*) as total FROM reservations WHERE status IN ('confirmed', 'pending')`,
    );
    // Top rated businesses
    const topBiz = await pool.query(
      `SELECT name, sector, COALESCE(rating, 0)::text as rating
       FROM businesses
       ORDER BY rating DESC NULLS LAST
       LIMIT 5`,
    );

    const kpis: GeoAdminReportData["metrics"] = [
      {
        label: "Total Businesses",
        value: businessCount.rows[0]?.total?.toString() || "0",
        change: `+${newBiz.rows[0]?.total || 0} this week`,
        trend: Number(newBiz.rows[0]?.total || 0) > 0 ? "up" : "stable",
      },
      {
        label: "Registered Users",
        value: userCount.rows[0]?.total?.toString() || "0",
      },
      {
        label: "Active Reservations",
        value: reservationCount.rows[0]?.total?.toString() || "0",
      },
    ];

    const topBusinesses = (topBiz.rows || []).map((b: any) => ({
      name: b.name,
      sector: b.sector || "General",
      rating: b.rating || "N/A",
    }));

    const insights: string[] = [];
    if (Number(newBiz.rows[0]?.total || 0) > 5) {
      insights.push(
        `Strong growth: ${newBiz.rows[0]?.total} new businesses registered this week.`,
      );
    }
    if (Number(reservationCount.rows[0]?.total || 0) > 0) {
      insights.push(
        `${reservationCount.rows[0]?.total} reservations are currently active across the platform.`,
      );
    }
    insights.push(
      "Market data is updated weekly. Next report: next Monday 8 AM.",
    );

    return { kpis, topBusinesses, insights };
  } catch (error) {
    console.error("[DIGEST] Error gathering platform metrics:", error);
    return {
      kpis: [{ label: "Status", value: "Data temporarily unavailable" }],
      topBusinesses: [],
      insights: [
        "Metrics could not be gathered. Platform is operating normally.",
      ],
    };
  }
}

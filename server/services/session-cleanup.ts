import { db } from "../db";
import * as schema from "@shared/schema";
import { lt } from "drizzle-orm";
import { createLogger } from "../utils/logger";

const log = createLogger("session-cleanup");

/**
 * Cleanup job: Remove expired sessions from active_sessions table
 * Runs every 30 minutes by default (configurable via CLEANUP_INTERVAL_MS)
 *
 * Why: Sessions accumulate over time. After 7 days, old sessions should be purged
 * to prevent table bloat and maintain query performance.
 */
export function setupSessionCleanup(
  intervalMs: number = 30 * 60 * 1000, // 30 minutes
): void {
  log.info(`Session cleanup job scheduled (every ${intervalMs}ms)`);

  // Run immediately on startup
  cleanupExpiredSessions();

  // Then run periodically
  setInterval(cleanupExpiredSessions, intervalMs);
}

/**
 * Delete all sessions older than 7 days (default JWT expiry)
 */
async function cleanupExpiredSessions(): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Only delete sessions that have actually expired (not current/active ones)
    const result = await db
      .delete(schema.activeSessions)
      .where(lt(schema.activeSessions.expiresAt, sevenDaysAgo));

    // Drizzle returns count in result.rowsAffected or result.rowCount
    const deletedCount = (result as any)?.changes ?? 0;
    if (deletedCount > 0) {
      log.info(`Cleaned up ${deletedCount} expired sessions`);
    }
  } catch (error) {
    log.error("Session cleanup failed:", error);
    // Don't throw — let the app continue even if cleanup fails
  }
}

/**
 * Optional: Manual cleanup trigger (useful for admin dashboards)
 * Removes sessions by age threshold
 */
export async function triggerSessionCleanup(maxAgeMs: number): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    const result = await db
      .delete(schema.activeSessions)
      .where(lt(schema.activeSessions.expiresAt, cutoffDate));

    const count = (result as any)?.changes ?? 0;
    log.info(`Manual session cleanup: removed ${count} sessions`);
    return count;
  } catch (error) {
    log.error("Manual session cleanup failed:", error);
    throw error;
  }
}

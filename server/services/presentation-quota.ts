import crypto from "crypto";
import { db } from "../db";
import { presentationQuota } from "../../shared/schema";
import { eq, and, gt } from "drizzle-orm";

const DAILY_LIMIT = 5; // Configurable: 5 presentations per day per account and IP
const QUOTA_RESET_HOURS = 24;
// IP_QUOTA_SALT must be configured in production
// Fallback to "dev-only" for local testing only
const IP_SALT = (() => {
  const salt = process.env.IP_QUOTA_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "IP_QUOTA_SALT environment variable is required in production. Set it to a strong random string."
      );
    }
    console.warn(
      "[DEV] IP_QUOTA_SALT not set. Using development default. DO NOT USE IN PRODUCTION."
    );
    return "dev-only-change-in-production";
  }
  return salt;
})();

/**
 * Hash an IP address for safe storage in quota tracking
 * Uses HMAC-SHA256 with a salt to prevent precomputation
 */
function hashIP(ip: string): string {
  return crypto.createHmac("sha256", IP_SALT).update(ip).digest("hex");
}

/**
 * Get the user's client IP address from the request
 * Respects X-Forwarded-For header when trust proxy is configured
 */
export function getClientIP(
  req: any,
): string {
  // X-Forwarded-For is set by reverse proxy (e.g., Render, nginx)
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // Fallback to direct connection IP
  return req.ip || req.connection.remoteAddress || "unknown";
}

/**
 * Check if the user/IP has quota available for presentation generation
 * Returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export async function checkPresentationQuota(
  userId: number | null,
  clientIP: string,
): Promise<{
  allowed: boolean;
  remainingUser: number;
  remainingIP: number;
  resetAt: Date;
}> {
  const now = new Date();
  const resetThreshold = new Date(now.getTime() - QUOTA_RESET_HOURS * 60 * 60 * 1000);
  const ipHash = hashIP(clientIP);

  // Both user and IP quota must be checked independently
  let userQuota = null;
  let ipQuota = null;

  if (userId) {
    const userRecords = await db
      .select()
      .from(presentationQuota)
      .where(eq(presentationQuota.userId, userId))
      .limit(1);
    userQuota = userRecords[0];
  }

  const ipRecords = await db
    .select()
    .from(presentationQuota)
    .where(eq(presentationQuota.ipHash, ipHash))
    .limit(1);
  ipQuota = ipRecords[0];

  // Determine if quotas have expired
  const userExpired = !userQuota || !userQuota.lastResetAt || userQuota.lastResetAt < resetThreshold;
  const ipExpired = !ipQuota || !ipQuota.lastResetAt || ipQuota.lastResetAt < resetThreshold;

  // Reset if needed
  let userRemaining = userExpired ? DAILY_LIMIT : (DAILY_LIMIT - (userQuota?.generationsToday || 0));
  let ipRemaining = ipExpired ? DAILY_LIMIT : (DAILY_LIMIT - (ipQuota?.generationsToday || 0));

  const resetAt = now; // Both reset at the current time if expired

  return {
    allowed: userRemaining > 0 && ipRemaining > 0,
    remainingUser: Math.max(0, userRemaining),
    remainingIP: Math.max(0, ipRemaining),
    resetAt,
  };
}

/**
 * Consume a presentation generation from the user/IP quota
 * Should only be called after checkPresentationQuota returns allowed=true
 */
export async function consumePresentationQuota(
  userId: number | null,
  clientIP: string,
): Promise<void> {
  const now = new Date();
  const resetThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ipHash = hashIP(clientIP);

  // Update user quota
  if (userId) {
    const existing = await db
      .select()
      .from(presentationQuota)
      .where(eq(presentationQuota.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      // First generation for this user
      await db.insert(presentationQuota).values({
        userId,
        generationsToday: 1,
        lastResetAt: now,
        updatedAt: now,
      });
    } else {
      const record = existing[0];
      const isExpired = record.lastResetAt && record.lastResetAt < resetThreshold;

      if (isExpired) {
        // Reset quota
        await db
          .update(presentationQuota)
          .set({
            generationsToday: 1,
            lastResetAt: now,
            updatedAt: now,
          })
          .where(eq(presentationQuota.userId, userId));
      } else {
        // Increment quota
        await db
          .update(presentationQuota)
          .set({
            generationsToday: (record.generationsToday || 0) + 1,
            updatedAt: now,
          })
          .where(eq(presentationQuota.userId, userId));
      }
    }
  }

  // Update IP quota
  const ipExisting = await db
    .select()
    .from(presentationQuota)
    .where(eq(presentationQuota.ipHash, ipHash))
    .limit(1);

  if (ipExisting.length === 0) {
    // First generation from this IP
    await db.insert(presentationQuota).values({
      ipHash,
      generationsToday: 1,
      lastResetAt: now,
      updatedAt: now,
    });
  } else {
    const record = ipExisting[0];
    const isExpired = record.lastResetAt && record.lastResetAt < resetThreshold;

    if (isExpired) {
      // Reset quota
      await db
        .update(presentationQuota)
        .set({
          generationsToday: 1,
          lastResetAt: now,
          updatedAt: now,
        })
        .where(eq(presentationQuota.ipHash, ipHash));
    } else {
      // Increment quota
      await db
        .update(presentationQuota)
        .set({
          generationsToday: (record.generationsToday || 0) + 1,
          updatedAt: now,
        })
        .where(eq(presentationQuota.ipHash, ipHash));
    }
  }
}

/**
 * Get current quota usage for debugging/admin dashboards
 */
export async function getQuotaUsage(
  userId: number | null,
  clientIP: string,
): Promise<{ user: any; ip: any }> {
  const ipHash = hashIP(clientIP);

  const [userRecord] = userId
    ? await db
        .select()
        .from(presentationQuota)
        .where(eq(presentationQuota.userId, userId))
        .limit(1)
    : [null];

  const [ipRecord] = await db
    .select()
    .from(presentationQuota)
    .where(eq(presentationQuota.ipHash, ipHash))
    .limit(1);

  return { user: userRecord || null, ip: ipRecord || null };
}

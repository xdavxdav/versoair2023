/**
 * Rate limiting for user-created listening sessions in TMU
 * Prevents spam and abuse while allowing verified creators to go live
 */

import type { Database } from "./db";

export interface RateLimitConfig {
  maxSessionsPer24h: number; // Max sessions per user per 24 hours
  cooldownMinutes: number; // Min time between consecutive sessions
  maxSessionsPerIpPer24h: number; // Max sessions per IP per 24 hours
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxSessionsPer24h: 3,
  cooldownMinutes: 60,
  maxSessionsPerIpPer24h: 10,
};

interface RateLimitCache {
  userId: number;
  lastSessionCreatedAt: Date;
  sessionsCreatedToday: number;
  windowStart: Date; // Track the start of the 24h window
}

// In-memory cache for rate limiting (can be migrated to Redis later)
const rateLimitCache = new Map<number, RateLimitCache>();
const ipRateLimitCache = new Map<string, { sessionsCreatedToday: number; windowStart: Date }>();

/** Clear old cache entries periodically to prevent memory leaks */
function cleanupCache() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Clean user cache
  for (const [userId, data] of rateLimitCache.entries()) {
    if (data.windowStart < oneDayAgo) {
      rateLimitCache.delete(userId);
    }
  }

  // Clean IP cache
  for (const [ip, data] of ipRateLimitCache.entries()) {
    if (data.windowStart < oneDayAgo) {
      ipRateLimitCache.delete(ip);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

/** Check if user can create a session; returns error message if limit hit, null if allowed */
export function checkUserRateLimit(
  userId: number,
  config = DEFAULT_CONFIG,
): { allowed: boolean; reason?: string; cooldownMinutesRemaining?: number } {
  const now = new Date();
  const cached = rateLimitCache.get(userId);

  if (cached) {
    // Check cooldown (minimum time between sessions)
    const minutesSinceLastSession = (now.getTime() - cached.lastSessionCreatedAt.getTime()) / (1000 * 60);
    if (minutesSinceLastSession < config.cooldownMinutes) {
      const cooldownRemaining = Math.ceil(config.cooldownMinutes - minutesSinceLastSession);
      return {
        allowed: false,
        reason: `Please wait ${cooldownRemaining} minute${cooldownRemaining > 1 ? 's' : ''} before creating another session`,
        cooldownMinutesRemaining: cooldownRemaining,
      };
    }

    // Check if we're still in the same 24h window
    const hoursSinceWindowStart = (now.getTime() - cached.windowStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceWindowStart < 24) {
      // Still in same window - check daily limit
      if (cached.sessionsCreatedToday >= config.maxSessionsPer24h) {
        return {
          allowed: false,
          reason: `You've reached your session limit for today (${cached.sessionsCreatedToday}/${config.maxSessionsPer24h}). Try again tomorrow`,
        };
      }
    } else {
      // Outside window - reset for new window
      cached.windowStart = now;
      cached.sessionsCreatedToday = 0;
    }
  }

  return { allowed: true };
}

/** Check if IP can create a session; returns error message if limit hit, null if allowed */
export function checkIpRateLimit(
  ip: string,
  config = DEFAULT_CONFIG,
): { allowed: boolean; reason?: string } {
  const now = new Date();
  let ipData = ipRateLimitCache.get(ip);

  if (!ipData) {
    // Create new entry with 24h window
    ipData = {
      sessionsCreatedToday: 0,
      windowStart: now,
    };
    ipRateLimitCache.set(ip, ipData);
  } else {
    // Check if we're still in the same 24h window
    const hoursSinceWindowStart = (now.getTime() - ipData.windowStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceWindowStart >= 24) {
      // Reset for new window
      ipData.sessionsCreatedToday = 0;
      ipData.windowStart = now;
    }
  }

  if (ipData.sessionsCreatedToday >= config.maxSessionsPerIpPer24h) {
    return {
      allowed: false,
      reason: `Too many sessions created from this IP. Please try again later`,
    };
  }

  return { allowed: true };
}

/** Record that a user created a session (call this after successful session creation) */
export function recordSessionCreation(userId: number): void {
  const now = new Date();
  const cached = rateLimitCache.get(userId);

  if (cached) {
    cached.lastSessionCreatedAt = now;
    cached.sessionsCreatedToday += 1;
  } else {
    rateLimitCache.set(userId, {
      userId,
      lastSessionCreatedAt: now,
      sessionsCreatedToday: 1,
      windowStart: now,
    });
  }
}

/** Record that a session was created from an IP (call this after successful session creation) */
export function recordIpSessionCreation(ip: string): void {
  const now = new Date();
  let ipData = ipRateLimitCache.get(ip);

  if (!ipData) {
    ipData = {
      sessionsCreatedToday: 1,
      windowStart: now,
    };
    ipRateLimitCache.set(ip, ipData);
  } else {
    ipData.sessionsCreatedToday += 1;
  }
}

/** Get current rate limit status for a user (for display purposes) */
export function getUserRateLimitStatus(userId: number, config = DEFAULT_CONFIG) {
  const cached = rateLimitCache.get(userId);
  const now = new Date();

  if (!cached) {
    return {
      sessionsCreatedToday: 0,
      maxPerDay: config.maxSessionsPer24h,
      nextSessionAvailableAt: now,
    };
  }

  const hoursSinceWindowStart = (now.getTime() - cached.windowStart.getTime()) / (1000 * 60 * 60);
  
  // If outside current window, reset
  let sessionsCreatedToday = cached.sessionsCreatedToday;
  let windowStart = cached.windowStart;
  if (hoursSinceWindowStart >= 24) {
    sessionsCreatedToday = 0;
    windowStart = now;
  }
  
  // Next available is either cooldown or if limit is hit, end of window
  let nextSessionAvailableAt = new Date(cached.lastSessionCreatedAt.getTime() + config.cooldownMinutes * 60 * 1000);
  if (sessionsCreatedToday >= config.maxSessionsPer24h) {
    // If daily limit hit, next available is at end of current window
    nextSessionAvailableAt = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    sessionsCreatedToday,
    maxPerDay: config.maxSessionsPer24h,
    nextSessionAvailableAt,
  };
}

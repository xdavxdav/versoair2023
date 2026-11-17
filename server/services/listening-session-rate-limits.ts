/**
 * Limits for user-hosted listening sessions (TMU).
 *
 * The per-user quota is computed from the sessions already stored (cancelled ones included, so
 * cancelling cannot be used to dodge it) and survives restarts. A per-user in-flight lock closes
 * the race between the quota check and the insert. The per-IP cap is in memory by design: it is
 * only a second, coarser brake.
 */

export interface RateLimitConfig {
  maxSessionsPer24h: number;
  cooldownMinutes: number;
  maxSessionsPerIpPer24h: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxSessionsPer24h: 3,
  cooldownMinutes: 60,
  maxSessionsPerIpPer24h: 10,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface QuotaStatus {
  allowed: boolean;
  reason?: string;
  sessionsCreatedToday: number;
  maxPerDay: number;
  /** When the next session can be created; `now` when it can be created right away. */
  nextSessionAvailableAt: Date;
}

/** `createdAt` is the creation time of every session the user hosts; older ones are ignored. */
export function evaluateUserQuota(
  createdAt: readonly Date[],
  now: Date,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): QuotaStatus {
  const windowStart = now.getTime() - DAY_MS;
  const recent = createdAt
    .map((date) => date.getTime())
    .filter((time) => Number.isFinite(time) && time > windowStart)
    .sort((a, b) => a - b);
  const base = { sessionsCreatedToday: recent.length, maxPerDay: config.maxSessionsPer24h };

  const last = recent.length ? recent[recent.length - 1] : null;
  const cooldownEnds = last === null ? now.getTime() : last + config.cooldownMinutes * MINUTE_MS;
  // The daily slot frees up when the session that put the user over the cap leaves the window.
  const dailyFreesAt =
    recent.length >= config.maxSessionsPer24h
      ? recent[recent.length - config.maxSessionsPer24h] + DAY_MS
      : now.getTime();
  const nextMs = Math.max(cooldownEnds, dailyFreesAt, now.getTime());
  const nextSessionAvailableAt = new Date(nextMs);

  if (dailyFreesAt > now.getTime()) {
    return {
      ...base,
      allowed: false,
      reason: `You have reached your limit of ${config.maxSessionsPer24h} live sessions per 24 hours.`,
      nextSessionAvailableAt,
    };
  }
  if (cooldownEnds > now.getTime()) {
    const minutes = Math.ceil((cooldownEnds - now.getTime()) / MINUTE_MS);
    return {
      ...base,
      allowed: false,
      reason: `Please wait ${minutes} minute${minutes === 1 ? "" : "s"} before creating another session.`,
      nextSessionAvailableAt,
    };
  }
  return { ...base, allowed: true, nextSessionAvailableAt };
}

const inFlight = new Set<number>();

/** True when this caller now holds the user's creation slot; it must call `releaseCreateLock`. */
export function tryAcquireCreateLock(userId: number): boolean {
  if (inFlight.has(userId)) return false;
  inFlight.add(userId);
  return true;
}

export function releaseCreateLock(userId: number): void {
  inFlight.delete(userId);
}

const ipHits = new Map<string, number[]>();

/** Checks and records in one step, so concurrent requests cannot both slip under the cap. */
export function reserveIpSlot(
  ip: string,
  now: Date,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): boolean {
  const windowStart = now.getTime() - DAY_MS;
  const hits = (ipHits.get(ip) ?? []).filter((time) => time > windowStart);
  if (hits.length >= config.maxSessionsPerIpPer24h) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now.getTime());
  ipHits.set(ip, hits);
  return true;
}

/** Gives a slot back when the attempt failed before a session was stored. */
export function releaseIpSlot(ip: string): void {
  const hits = ipHits.get(ip);
  if (hits?.length) hits.pop();
}

/** Drops addresses with no recent hits; called on each reservation path by the router. */
export function pruneIpHits(now: Date): void {
  const windowStart = now.getTime() - DAY_MS;
  for (const [ip, hits] of ipHits) {
    if (!hits.some((time) => time > windowStart)) ipHits.delete(ip);
  }
}

export function resetRateLimitsForTests(): void {
  inFlight.clear();
  ipHits.clear();
}

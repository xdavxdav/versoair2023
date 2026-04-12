/**
 * Redis resilience client
 *
 * Strategy:
 *   - If REDIS_URL is set → connect to real Redis (Render add-on, self-hosted, etc.)
 *   - Otherwise → use an in-memory Map as a transparent fallback
 *
 * This means the app works identically in three environments:
 *   1. Local dev    → in-memory fallback (zero config)
 *   2. Free Render  → in-memory fallback (resets on restart, acceptable for dev)
 *   3. Paid Render  → real Redis via REDIS_URL env var
 *
 * The fallback mimics only the subset of Redis ops used in this codebase:
 *   get / set / del / lpush / lrange / expire
 * Callers never need to know which backend is active.
 *
 * REMINDER BEFORE PROD PUSH:
 *   Set REDIS_URL in your Render environment to enable persistent queuing.
 */

import Redis from "ioredis";

// ─── In-memory fallback (Map + TTL) ──────────────────────────────────────────

interface MemEntry {
  value: string;
  expiresAt?: number;
}

class MemoryRedis {
  private store = new Map<string, MemEntry>();
  private lists = new Map<string, string[]>();

  private expired(k: string): boolean {
    const e = this.store.get(k);
    if (!e) return true;
    if (e.expiresAt && Date.now() > e.expiresAt) {
      this.store.delete(k);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.expired(key)) return null;
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<"OK"> {
    let expiresAt: number | undefined;
    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === "string" && args[i].toUpperCase() === "EX") {
        expiresAt = Date.now() + (Number(args[i + 1]) || 0) * 1000;
      }
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const had = this.store.has(key) || this.lists.has(key);
    this.store.delete(key);
    this.lists.delete(key);
    return had ? 1 : 0;
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const list = this.lists.get(key) ?? [];
    list.unshift(...values.reverse());
    this.lists.set(key, list);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) ?? [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    return 1; // noop — TTL not tracked on lists in fallback
  }

  // Socket-compatible no-op
  on(_event: string, _cb: any) {
    return this;
  }
}

// ─── Singleton setup ──────────────────────────────────────────────────────────

type RedisLike = Redis | MemoryRedis;

let _client: RedisLike | null = null;
let _usingReal = false;

export function getRedis(): RedisLike {
  if (_client) return _client;

  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const real = new Redis(url, {
        lazyConnect: false,
        maxRetriesPerRequest: 2,
      });
      real.on("error", (err: Error) => {
        console.warn(
          "[Redis] Connection error — falling back to in-memory:",
          err.message,
        );
        _client = new MemoryRedis();
        _usingReal = false;
      });
      real.on("ready", () => {
        console.log("[Redis] ✅ Connected to Redis");
        _usingReal = true;
      });
      _client = real;
    } catch (err: any) {
      console.warn(
        "[Redis] Failed to init — using in-memory fallback:",
        err.message,
      );
      _client = new MemoryRedis();
    }
  } else {
    console.log(
      "[Redis] No REDIS_URL set — using in-memory fallback (local dev mode)",
    );
    _client = new MemoryRedis();
  }

  return _client;
}

export function isRedisReal(): boolean {
  return _usingReal;
}

// ─── Inbox-specific helpers ───────────────────────────────────────────────────

const INBOX_KEY = (userId: string | number) => `inbox:queue:${userId}`;
const TTL_SECONDS = 7 * 24 * 3600; // 7 days

/**
 * Enqueue a message payload for a user.
 * Used as fallback when the DB is temporarily unavailable.
 */
export async function enqueueInboxMessage(
  userId: string | number,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const redis = getRedis();
    const key = INBOX_KEY(userId);
    await redis.lpush(key, JSON.stringify(payload));
    await redis.expire(key, TTL_SECONDS);
  } catch (err: any) {
    console.warn("[Redis] enqueueInboxMessage failed:", err.message);
  }
}

/**
 * Drain all queued messages for a user and return them.
 * Call this when the user opens the inbox so queued items can be persisted to DB.
 */
export async function drainInboxQueue(
  userId: string | number,
): Promise<Record<string, unknown>[]> {
  try {
    const redis = getRedis();
    const key = INBOX_KEY(userId);
    const items = await redis.lrange(key, 0, -1);
    await redis.del(key);
    return items.map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return {};
      }
    });
  } catch (err: any) {
    console.warn("[Redis] drainInboxQueue failed:", err.message);
    return [];
  }
}

/**
 * Cache an AI support reply (key = conversation + message hash).
 * Avoids re-hitting Ollama for identical repeated questions from the same user.
 */
export async function cacheAIReply(
  key: string,
  reply: string,
  ttlSeconds = 3600,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(`ai:cache:${key}`, reply, "EX", ttlSeconds);
  } catch {
    /* silent */
  }
}

export async function getCachedAIReply(key: string): Promise<string | null> {
  try {
    const redis = getRedis();
    return await redis.get(`ai:cache:${key}`);
  } catch {
    return null;
  }
}

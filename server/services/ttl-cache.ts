/**
 * A tiny in-memory cache with a time limit per entry. It keeps polling traffic
 * (now-playing, chat) off the database. The clock is injectable for tests, and
 * the size is capped so a stream of distinct keys can never grow without bound.
 */
export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
  /** Drops every entry whose key starts with `prefix`. */
  deletePrefix(prefix: string): void;
  clear(): void;
  size(): number;
}

export function createTtlCache<V>(options: {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
}): TtlCache<V> {
  const maxEntries = options.maxEntries ?? 500;
  const now = options.now ?? Date.now;
  const entries = new Map<string, { value: V; expiresAt: number }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      if (entries.size >= maxEntries) {
        const current = now();
        for (const [k, entry] of entries) {
          if (entry.expiresAt <= current) entries.delete(k);
        }
        // Still full: drop the oldest insertion.
        if (entries.size >= maxEntries) {
          const oldest = entries.keys().next();
          if (!oldest.done) entries.delete(oldest.value);
        }
      }
      entries.set(key, { value, expiresAt: now() + options.ttlMs });
    },
    delete(key) {
      entries.delete(key);
    },
    deletePrefix(prefix) {
      for (const key of Array.from(entries.keys())) {
        if (key.startsWith(prefix)) entries.delete(key);
      }
    },
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    },
  };
}

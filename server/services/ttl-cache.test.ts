import assert from "node:assert/strict";
import test from "node:test";
import { createTtlCache } from "./ttl-cache";

function clock(start = 1_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

test("an entry is served until its time limit, then it is gone", () => {
  const time = clock();
  const cache = createTtlCache<string>({ ttlMs: 2_000, now: time.now });
  cache.set("a", "first");
  assert.equal(cache.get("a"), "first");
  time.advance(1_999);
  assert.equal(cache.get("a"), "first");
  time.advance(1);
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.size(), 0, "an expired entry is dropped when it is read");
});

test("setting a key again restarts its time limit", () => {
  const time = clock();
  const cache = createTtlCache<number>({ ttlMs: 1_000, now: time.now });
  cache.set("a", 1);
  time.advance(900);
  cache.set("a", 2);
  time.advance(900);
  assert.equal(cache.get("a"), 2);
});

test("delete, deletePrefix and clear invalidate entries", () => {
  const cache = createTtlCache<number>({ ttlMs: 10_000 });
  cache.set("session:1", 1);
  cache.set("chat:1:a", 2);
  cache.set("chat:1:b", 3);
  cache.set("chat:2:a", 4);
  cache.delete("session:1");
  assert.equal(cache.get("session:1"), undefined);
  cache.deletePrefix("chat:1:");
  assert.equal(cache.get("chat:1:a"), undefined);
  assert.equal(cache.get("chat:1:b"), undefined);
  assert.equal(cache.get("chat:2:a"), 4);
  cache.clear();
  assert.equal(cache.size(), 0);
});

test("the cache never holds more than its cap, preferring to drop expired entries", () => {
  const time = clock();
  const cache = createTtlCache<number>({ ttlMs: 1_000, maxEntries: 3, now: time.now });
  cache.set("a", 1);
  cache.set("b", 2);
  time.advance(1_500);
  cache.set("c", 3);
  cache.set("d", 4);
  assert.equal(cache.size(), 2, "expired a and b were reclaimed first");
  cache.set("e", 5);
  cache.set("f", 6);
  assert.equal(cache.size(), 3);
  assert.equal(cache.get("c"), undefined, "the oldest live entry made room");
  assert.equal(cache.get("f"), 6);
});

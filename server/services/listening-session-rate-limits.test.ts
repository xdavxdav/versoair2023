import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RATE_LIMITS,
  evaluateUserQuota,
  releaseCreateLock,
  releaseIpSlot,
  reserveIpSlot,
  resetRateLimitsForTests,
  tryAcquireCreateLock,
} from "./listening-session-rate-limits";

const NOW = new Date("2025-06-01T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

test("a user with no sessions may create one right away", () => {
  const quota = evaluateUserQuota([], NOW);
  assert.equal(quota.allowed, true);
  assert.equal(quota.sessionsCreatedToday, 0);
  assert.equal(quota.maxPerDay, DEFAULT_RATE_LIMITS.maxSessionsPer24h);
  assert.equal(quota.nextSessionAvailableAt.getTime(), NOW.getTime());
});

test("the cooldown blocks a second session and says when the next one is possible", () => {
  const quota = evaluateUserQuota([minutesAgo(10)], NOW);
  assert.equal(quota.allowed, false);
  assert.match(quota.reason ?? "", /wait 50 minutes/);
  assert.equal(quota.nextSessionAvailableAt.getTime(), minutesAgo(10).getTime() + 60 * 60_000);
});

test("after the cooldown the next session is allowed", () => {
  const quota = evaluateUserQuota([minutesAgo(61)], NOW);
  assert.equal(quota.allowed, true);
  assert.equal(quota.sessionsCreatedToday, 1);
});

test("the daily cap blocks until the oldest counted session leaves the 24h window", () => {
  const created = [minutesAgo(23 * 60), minutesAgo(12 * 60), minutesAgo(2 * 60)];
  const quota = evaluateUserQuota(created, NOW);
  assert.equal(quota.allowed, false);
  assert.match(quota.reason ?? "", /limit of 3/);
  assert.equal(quota.nextSessionAvailableAt.getTime(), created[0].getTime() + 24 * 60 * 60_000);
});

test("sessions older than 24 hours are not counted", () => {
  const quota = evaluateUserQuota([minutesAgo(25 * 60), minutesAgo(30 * 60)], NOW);
  assert.equal(quota.allowed, true);
  assert.equal(quota.sessionsCreatedToday, 0);
});

test("the create lock lets one request through at a time per user", () => {
  resetRateLimitsForTests();
  assert.equal(tryAcquireCreateLock(7), true);
  assert.equal(tryAcquireCreateLock(7), false, "a parallel request for the same user is refused");
  assert.equal(tryAcquireCreateLock(8), true, "other users are unaffected");
  releaseCreateLock(7);
  assert.equal(tryAcquireCreateLock(7), true);
  resetRateLimitsForTests();
});

test("the ip cap reserves a slot atomically and gives it back on failure", () => {
  resetRateLimitsForTests();
  const cap = DEFAULT_RATE_LIMITS.maxSessionsPerIpPer24h;
  for (let i = 0; i < cap; i += 1) assert.equal(reserveIpSlot("1.2.3.4", NOW), true);
  assert.equal(reserveIpSlot("1.2.3.4", NOW), false);
  assert.equal(reserveIpSlot("5.6.7.8", NOW), true, "another address has its own budget");
  releaseIpSlot("1.2.3.4");
  assert.equal(reserveIpSlot("1.2.3.4", NOW), true);
  const nextDay = new Date(NOW.getTime() + 25 * 60 * 60_000);
  assert.equal(reserveIpSlot("1.2.3.4", nextDay), true, "hits expire after 24 hours");
  resetRateLimitsForTests();
});

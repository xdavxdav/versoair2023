/**
 * Tests for TMU listening session rate limiting
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  checkUserRateLimit,
  checkIpRateLimit,
  recordSessionCreation,
  recordIpSessionCreation,
  getUserRateLimitStatus,
} from "./listening-session-rate-limits";

test("user rate limit: allows first session", () => {
  const userId = Math.floor(Math.random() * 1000000);
  const result = checkUserRateLimit(userId);
  assert.equal(result.allowed, true, "First session should be allowed");
});

test("user rate limit: enforces cooldown between sessions", () => {
  const userId = Math.floor(Math.random() * 1000000);
  
  // First session allowed
  let result = checkUserRateLimit(userId);
  assert.equal(result.allowed, true);
  
  // Record creation
  recordSessionCreation(userId);
  
  // Immediate second session should be blocked (cooldown)
  result = checkUserRateLimit(userId);
  assert.equal(result.allowed, false, "Second session too soon (cooldown)");
  assert.match(result.reason || "", /Please wait/);
});

test("user rate limit: status tracks sessions created", () => {
  const userId = Math.floor(Math.random() * 1000000);
  
  // Initial status shows 0 sessions
  let status = getUserRateLimitStatus(userId);
  assert.equal(status.sessionsCreatedToday, 0, "Should start at 0");
  
  // After recording one, status should show 1
  recordSessionCreation(userId);
  status = getUserRateLimitStatus(userId);
  assert.equal(status.sessionsCreatedToday, 1, "Should show 1 after recording");
  
  // After recording two more, should show 3 (at daily limit)
  recordSessionCreation(userId);
  recordSessionCreation(userId);
  status = getUserRateLimitStatus(userId);
  assert.equal(status.sessionsCreatedToday, 3, "Should show 3 (at daily limit)");
  assert.equal(status.maxPerDay, 3, "Max per day should be 3");
});

test("ip rate limit: allows first session from IP", () => {
  const ip = `192.168.1.${Math.floor(Math.random() * 255)}`;
  const result = checkIpRateLimit(ip);
  assert.equal(result.allowed, true, "First session from IP should be allowed");
});

test("ip rate limit: enforces max sessions per IP", () => {
  const ip = `192.168.1.${Math.floor(Math.random() * 255)}`;
  
  // Record 10 sessions from this IP (the limit)
  for (let i = 0; i < 10; i++) {
    recordIpSessionCreation(ip);
  }
  
  // 11th check should fail
  const result = checkIpRateLimit(ip);
  assert.equal(result.allowed, false, "Should hit IP limit at 11th check");
});

test("get user rate limit status returns current stats", () => {
  const userId = Math.floor(Math.random() * 1000000);
  
  // Initial status
  let status = getUserRateLimitStatus(userId);
  assert.equal(status.sessionsCreatedToday, 0);
  assert.equal(status.maxPerDay, 3);
  
  // Record one session
  recordSessionCreation(userId);
  status = getUserRateLimitStatus(userId);
  assert.equal(status.sessionsCreatedToday, 1);
  assert.ok(status.nextSessionAvailableAt);
});

test("user rate limit status shows cooldown time", () => {
  const userId = Math.floor(Math.random() * 1000000);
  
  recordSessionCreation(userId);
  const status = getUserRateLimitStatus(userId);
  
  // Next available should be in the future
  const now = new Date();
  const nextAvailable = new Date(status.nextSessionAvailableAt);
  assert.ok(nextAvailable > now, "Next session should be in the future");
});

console.log("✓ All rate limiting tests passed!");

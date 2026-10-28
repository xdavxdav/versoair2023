import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  REPORT_NUDGE_DELAY_MS,
  REPORT_NUDGE_MAX_ATTEMPTS,
  isCookieBannerPending,
  isReportNudgeQuietPath,
} from "./report-issue-nudge";

test("the reminder stays away from focused pages", () => {
  for (const path of [
    "/auth/login", "/signup", "/admin", "/admin/tickets", "/geo-admin/dashboard",
    "/geo-insights", "/sys/0x7f3a9c", "/dashboard", "/apply", "/profile",
    "/messages", "/messages/?thread=1", "/user/abc", "/inventory",
    "/music/studio", "/stream", "/arcade", "/arena", "/beatmaker",
    "/artist-portal/welcome", "/listener-portal", "/streamer-portal",
    "/artisans-portal", "/Admin/",
  ]) {
    assert.equal(isReportNudgeQuietPath(path), true, path);
  }
});

test("the reminder can appear on ordinary public pages", () => {
  for (const path of [
    "/", "", "/about", "/contact", "/blog", "/marketplace", "/services",
    "/events", "/help", "/faq", "/privacy", "/terms", "/cookies", "/authors",
  ]) {
    assert.equal(isReportNudgeQuietPath(path), false, path);
  }
});

test("the reminder waits for the cookie choice on the home page only", () => {
  assert.equal(isCookieBannerPending("/", null), true);
  assert.equal(isCookieBannerPending("", null), true);
  assert.equal(isCookieBannerPending("/", "accepted"), false);
  assert.equal(isCookieBannerPending("/", "declined"), false);
  assert.equal(isCookieBannerPending("/about", null), false);
});

test("the reminder shows once a visitor has had a moment, and gives up politely", () => {
  assert.ok(REPORT_NUDGE_DELAY_MS >= 3_000 && REPORT_NUDGE_DELAY_MS <= 10_000);
  assert.ok(REPORT_NUDGE_MAX_ATTEMPTS >= 1 && REPORT_NUDGE_MAX_ATTEMPTS <= 8);
});

test("the reminder animation stays brief, gentle and motion-safe", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  const duration = css.match(/animation:\s*report-issue-nudge-life\s+([\d.]+)s/);
  assert.ok(duration, "report-issue-nudge-life animation is missing");
  const seconds = Number(duration[1]);
  assert.ok(seconds >= 2 && seconds <= 3, `lasts ${seconds}s, expected 2-3s`);

  const life = css.match(/@keyframes report-issue-nudge-life\s*{([\s\S]*?)\n}\n/);
  assert.ok(life, "report-issue-nudge-life keyframes are missing");
  const dips = [...life[1].matchAll(/(\d+)%\s*{\s*opacity:\s*([\d.]+)/g)]
    .filter(([, , opacity]) => Number(opacity) < 1 && Number(opacity) > 0)
    .map(([, percent]) => Number(percent));
  // A dip every 40% of 3s is a pulse about every 1.2s: never more than one flash a second.
  assert.equal(dips.length, 2);
  const period = ((dips[1] - dips[0]) / 100) * seconds;
  assert.ok(period >= 1, `pulses every ${period}s, must be 1s or slower`);

  assert.match(css, /prefers-reduced-motion:\s*reduce\)\s*{\s*\.report-issue-nudge\s*{\s*animation-name:\s*report-issue-nudge-calm/);
  assert.match(css, /\.report-issue-nudge:hover[\s\S]*?animation-play-state:\s*paused/);
});

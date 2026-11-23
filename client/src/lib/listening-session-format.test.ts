import assert from "node:assert/strict";
import test from "node:test";

import type { SessionSummary } from "@shared/listening-session";
import {
  SESSIONS_PATH,
  formatCountdown,
  formatDuration,
  formatSessionWhen,
  formatTotalLength,
  groupSessions,
  liveStatus,
  parseSessionId,
  sessionLang,
  sessionPath,
} from "./listening-session-format";

// ICU 78 uses a narrow no-break space before AM/PM; older ICU used a plain one.
const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

test("only French is French; everything else reads English", () => {
  assert.equal(sessionLang("fr"), "fr");
  assert.equal(sessionLang("en"), "en");
  assert.equal(sessionLang("es"), "en");
  assert.equal(sessionLang(undefined), "en");
  assert.equal(sessionLang(null), "en");
});

test("track lengths read as m:ss and h:mm:ss", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(5), "0:05");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(65.9), "1:05");
  assert.equal(formatDuration(3599), "59:59");
  assert.equal(formatDuration(3600), "1:00:00");
  assert.equal(formatDuration(3725), "1:02:05");
});

test("a bad length reads as zero instead of NaN", () => {
  assert.equal(formatDuration(Number.NaN), "0:00");
  assert.equal(formatDuration(-30), "0:00");
  assert.equal(formatDuration(Number.POSITIVE_INFINITY), "0:00");
});

test("the countdown shows m:ss, h:mm:ss, then days and hours", () => {
  assert.equal(formatCountdown(5, "en"), "0:05");
  assert.equal(formatCountdown(725, "en"), "12:05");
  assert.equal(formatCountdown(11_525, "en"), "3:12:05");
  assert.equal(formatCountdown(86_399, "en"), "23:59:59");
  assert.equal(formatCountdown(2 * 86_400 + 3 * 3600 + 59, "en"), "2d 3h");
  assert.equal(formatCountdown(2 * 86_400 + 3 * 3600 + 59, "fr"), "2 j 3 h");
  assert.equal(formatCountdown(-4, "en"), "0:00");
});

test("a set length reads in seconds, minutes, or hours and minutes", () => {
  assert.equal(formatTotalLength(0), "0 s");
  assert.equal(formatTotalLength(45), "45 s");
  assert.equal(formatTotalLength(60), "1 min");
  assert.equal(formatTotalLength(754), "13 min");
  assert.equal(formatTotalLength(3599), "1 h");
  assert.equal(formatTotalLength(3600), "1 h");
  assert.equal(formatTotalLength(5400), "1 h 30 min");
  assert.equal(formatTotalLength(7380), "2 h 03 min");
});

const START = "2026-11-08T20:00:00.000Z";

test("the start time is shown in the requested zone and language", () => {
  const en = plain(formatSessionWhen(START, "en", { timeZone: "America/Toronto", nowMs: Date.parse("2026-11-01T00:00:00Z") }));
  assert.match(en, /^Sun, Nov 8, 3:00 PM (EST|GMT-5)$/);

  const fr = plain(formatSessionWhen(START, "fr", { timeZone: "Europe/Paris", nowMs: Date.parse("2026-11-01T00:00:00Z") }));
  assert.match(fr, /^dim\. 8 nov\.,? 21:00 (UTC|GMT)\+1$/);

  const abidjan = plain(formatSessionWhen(START, "en", { timeZone: "Africa/Abidjan", nowMs: Date.parse("2026-11-01T00:00:00Z") }));
  assert.match(abidjan, /^Sun, Nov 8, 8:00 PM (GMT|UTC)(\+0)?$/);
});

test("the year appears only when it differs from the current one, or when no clock is given", () => {
  const thisYear = formatSessionWhen(START, "en", { timeZone: "UTC", nowMs: Date.parse("2026-02-01T00:00:00Z") });
  const nextYear = formatSessionWhen(START, "en", { timeZone: "UTC", nowMs: Date.parse("2025-02-01T00:00:00Z") });
  const noClock = formatSessionWhen(START, "en", { timeZone: "UTC" });
  assert.equal(thisYear.includes("2026"), false);
  assert.equal(nextYear.includes("2026"), true);
  assert.equal(noClock.includes("2026"), true);
});

test("an unreadable timestamp gives an empty string rather than throwing", () => {
  assert.equal(formatSessionWhen("not a date", "en"), "");
});

const summary = (
  id: number,
  startsAt: string,
  endsAt: string,
  status: SessionSummary["status"] = "scheduled",
): SessionSummary => ({
  id,
  title: `Session ${id}`,
  description: null,
  hostName: "Luq",
  startsAt,
  endsAt,
  status,
  gapSeconds: 0,
  trackCount: 3,
  totalDurationSec: 600,
});

const NOW = Date.parse("2026-11-08T20:05:00.000Z");

test("the status follows the corrected clock, not the moment the list was fetched", () => {
  const session = summary(1, "2026-11-08T20:00:00.000Z", "2026-11-08T20:10:00.000Z", "scheduled");
  assert.equal(liveStatus(session, Date.parse("2026-11-08T19:59:59.999Z")), "scheduled");
  assert.equal(liveStatus(session, Date.parse("2026-11-08T20:00:00.000Z")), "live");
  assert.equal(liveStatus(session, Date.parse("2026-11-08T20:09:59.999Z")), "live");
  assert.equal(liveStatus(session, Date.parse("2026-11-08T20:10:00.000Z")), "ended");
});

test("a cancelled session stays cancelled whatever the clock says", () => {
  const session = summary(1, "2026-11-08T20:00:00.000Z", "2026-11-08T20:10:00.000Z", "cancelled");
  assert.equal(liveStatus(session, NOW), "cancelled");
});

test("sessions are grouped live, upcoming and replays, and cancelled ones are left out", () => {
  const groups = groupSessions(
    [
      summary(1, "2026-11-08T20:00:00.000Z", "2026-11-08T20:10:00.000Z"),
      summary(2, "2026-11-15T20:00:00.000Z", "2026-11-15T21:00:00.000Z"),
      summary(3, "2026-11-10T20:00:00.000Z", "2026-11-10T21:00:00.000Z"),
      summary(4, "2026-11-01T20:00:00.000Z", "2026-11-01T21:00:00.000Z", "ended"),
      summary(5, "2026-10-25T20:00:00.000Z", "2026-10-25T21:00:00.000Z", "ended"),
      summary(6, "2026-11-09T20:00:00.000Z", "2026-11-09T21:00:00.000Z", "cancelled"),
    ],
    NOW,
  );
  assert.deepEqual(groups.live.map((s) => s.id), [1]);
  assert.deepEqual(groups.upcoming.map((s) => s.id), [3, 2], "soonest first");
  assert.deepEqual(groups.replays.map((s) => s.id), [4, 5], "newest first");
});

test("a session the list called scheduled moves to live once the clock passes its start", () => {
  const stale = summary(7, "2026-11-08T20:04:00.000Z", "2026-11-08T20:30:00.000Z", "scheduled");
  assert.deepEqual(groupSessions([stale], NOW).live.map((s) => s.id), [7]);
});

test("route parameters become ids only when they are plain positive integers", () => {
  assert.equal(parseSessionId("12"), 12);
  assert.equal(parseSessionId("2147483647"), 2_147_483_647);
  for (const bad of ["0", "-1", "1.5", "12abc", "", " 12", "012", "1e3", "2147483648", "99999999999", undefined, null]) {
    assert.equal(parseSessionId(bad as string | null | undefined), null, String(bad));
  }
});

test("session links are built from one place", () => {
  assert.equal(SESSIONS_PATH, "/sessions");
  assert.equal(sessionPath(12), "/sessions/12");
});

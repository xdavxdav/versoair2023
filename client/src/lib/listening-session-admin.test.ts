import assert from "node:assert/strict";
import test from "node:test";

import type { AdminSessionDetail, SessionTrackView, SignedGrade } from "@shared/listening-session";

import {
  ADMIN_TIME_ZONES,
  DEFAULT_ADMIN_TIME_ZONE,
  ZONED_TIME_MESSAGES,
  addTrack,
  buildCreatePayload,
  buildUpdatePayload,
  ceilMeasuredDuration,
  draftFromSession,
  emptyDraft,
  findOverlaps,
  isScheduleLocked,
  moveTrack,
  previewEndsAt,
  removeTrack,
  rowFromOption,
  rowFromView,
  setRowDuration,
  signedFirst,
  startInMinutes,
  summarizeSet,
  utcToZonedInput,
  zonedTimeToUtc,
  type SessionDraft,
  type SetRow,
} from "./listening-session-admin";

// Saturday 2026-11-07 10:00 in Toronto (EST).
const NOW = Date.parse("2026-11-07T15:00:00.000Z");
const TORONTO = "America/Toronto";
const PARIS = "Europe/Paris";

const row = (trackId: number, over: Partial<SetRow> = {}): SetRow => ({
  trackId,
  title: `Track ${trackId}`,
  artistName: `Artist ${trackId}`,
  grade: null,
  durationSec: 180,
  available: true,
  ...over,
});

const view = (position: number, trackId: number, over: Partial<SessionTrackView> = {}): SessionTrackView => ({
  position,
  trackId,
  title: `Track ${trackId}`,
  artistName: `Artist ${trackId}`,
  durationSec: 180,
  startOffsetSec: 0,
  grade: null,
  available: true,
  ...over,
});

const utc = (local: string, zone: string) => {
  const result = zonedTimeToUtc(local, zone);
  assert.ok(result.ok, `${local} in ${zone} should exist exactly once`);
  return result.iso;
};

// ─── time zones ──────────────────────────────────────────────────────────

test("a wall-clock time becomes the exact instant, in winter and in summer", () => {
  assert.equal(utc("2026-11-08T15:00", TORONTO), "2026-11-08T20:00:00.000Z");
  assert.equal(utc("2026-07-12T15:00", TORONTO), "2026-07-12T19:00:00.000Z");
  assert.equal(utc("2026-11-08T21:00", PARIS), "2026-11-08T20:00:00.000Z");
  assert.equal(utc("2026-07-12T21:00", PARIS), "2026-07-12T19:00:00.000Z");
  assert.equal(utc("2026-11-08T20:00", "Africa/Abidjan"), "2026-11-08T20:00:00.000Z");
  assert.equal(utc("2026-11-08T20:00", "UTC"), "2026-11-08T20:00:00.000Z");
});

test("midnight is 00:00 and the last minute of the day is 23:59", () => {
  assert.equal(utc("2026-11-08T00:00", TORONTO), "2026-11-08T05:00:00.000Z");
  assert.equal(utc("2026-11-08T23:59", TORONTO), "2026-11-09T04:59:00.000Z");
  assert.equal(utcToZonedInput("2026-11-08T05:00:00.000Z", TORONTO), "2026-11-08T00:00");
  assert.equal(utcToZonedInput("2026-11-09T04:59:00.000Z", TORONTO), "2026-11-08T23:59");
});

test("a time skipped when the clocks jump forward is refused, not shifted", () => {
  assert.deepEqual(zonedTimeToUtc("2026-03-08T02:30", TORONTO), { ok: false, reason: "nonexistent" });
  assert.deepEqual(zonedTimeToUtc("2026-03-29T02:30", PARIS), { ok: false, reason: "nonexistent" });
  assert.deepEqual(zonedTimeToUtc("2026-03-08T02:00", TORONTO), { ok: false, reason: "nonexistent" });
  assert.deepEqual(zonedTimeToUtc("2026-03-08T02:59", TORONTO), { ok: false, reason: "nonexistent" });
});

test("a time that happens twice when the clocks go back is refused, not guessed", () => {
  assert.deepEqual(zonedTimeToUtc("2026-11-01T01:30", TORONTO), { ok: false, reason: "ambiguous" });
  assert.deepEqual(zonedTimeToUtc("2026-10-25T02:30", PARIS), { ok: false, reason: "ambiguous" });
  assert.deepEqual(zonedTimeToUtc("2026-11-01T01:00", TORONTO), { ok: false, reason: "ambiguous" });
  assert.deepEqual(zonedTimeToUtc("2026-11-01T01:59", TORONTO), { ok: false, reason: "ambiguous" });
});

test("the minutes either side of a clock change are ordinary", () => {
  assert.equal(utc("2026-03-08T01:59", TORONTO), "2026-03-08T06:59:00.000Z");
  assert.equal(utc("2026-03-08T03:00", TORONTO), "2026-03-08T07:00:00.000Z");
  assert.equal(utc("2026-11-01T00:59", TORONTO), "2026-11-01T04:59:00.000Z");
  assert.equal(utc("2026-11-01T02:00", TORONTO), "2026-11-01T07:00:00.000Z");
  assert.equal(utc("2026-03-29T01:59", PARIS), "2026-03-29T00:59:00.000Z");
  assert.equal(utc("2026-03-29T03:00", PARIS), "2026-03-29T01:00:00.000Z");
  assert.equal(utc("2026-10-25T01:59", PARIS), "2026-10-24T23:59:00.000Z");
  assert.equal(utc("2026-10-25T03:00", PARIS), "2026-10-25T02:00:00.000Z");
});

test("text that is not a real date and time is invalid", () => {
  for (const bad of [
    "",
    "2026-11-08",
    "2026-11-08T15",
    "2026-11-08 15:00",
    "2026-11-08T15:00:00",
    "2026-11-08T25:00",
    "2026-11-08T15:60",
    "2026-13-08T15:00",
    "2026-02-30T10:00",
    "2026-00-10T10:00",
    "1999-12-31T23:59",
    "2101-01-01T00:00",
    "tomorrow",
  ]) {
    assert.deepEqual(zonedTimeToUtc(bad, TORONTO), { ok: false, reason: "invalid" }, JSON.stringify(bad));
  }
});

test("a leap day exists only in a leap year", () => {
  assert.equal(utc("2028-02-29T12:00", TORONTO), "2028-02-29T17:00:00.000Z");
  assert.deepEqual(zonedTimeToUtc("2027-02-29T12:00", TORONTO), { ok: false, reason: "invalid" });
});

test("an unknown zone is reported as such", () => {
  assert.deepEqual(zonedTimeToUtc("2026-11-08T15:00", "Mars/Olympus"), { ok: false, reason: "invalid_zone" });
  assert.deepEqual(zonedTimeToUtc("2026-11-08T15:00", ""), { ok: false, reason: "invalid_zone" });
});

test("an instant shows as the wall clock of the chosen zone, to the minute", () => {
  assert.equal(utcToZonedInput("2026-11-08T20:00:00.000Z", TORONTO), "2026-11-08T15:00");
  assert.equal(utcToZonedInput("2026-11-08T20:00:00.000Z", PARIS), "2026-11-08T21:00");
  assert.equal(utcToZonedInput("2026-11-08T20:00:00.000Z", "Africa/Abidjan"), "2026-11-08T20:00");
  assert.equal(utcToZonedInput("2026-11-08T20:00:59.999Z", TORONTO), "2026-11-08T15:00");
  assert.equal(utcToZonedInput("2026-07-12T19:00:00.000Z", TORONTO), "2026-07-12T15:00");
  assert.equal(utcToZonedInput("not a date", TORONTO), "");
});

test("an instant inside the repeated hour shows the wall clock that is then refused as ambiguous", () => {
  assert.equal(utcToZonedInput("2026-11-01T05:30:00.000Z", TORONTO), "2026-11-01T01:30");
  assert.equal(utcToZonedInput("2026-11-01T06:30:00.000Z", TORONTO), "2026-11-01T01:30");
});

test("every real instant of a year survives the round trip, except inside a repeated hour", () => {
  const zones = [TORONTO, PARIS, "Africa/Abidjan", "America/Los_Angeles", "Europe/London"];
  const start = Date.parse("2026-01-01T00:00:00.000Z");
  const end = Date.parse("2027-01-01T00:00:00.000Z");
  const step = 47 * 60_000;

  for (const zone of zones) {
    let ambiguous = 0;
    for (let ms = start; ms < end; ms += step) {
      const wall = utcToZonedInput(new Date(ms).toISOString(), zone);
      const back = zonedTimeToUtc(wall, zone);
      if (back.ok) {
        assert.equal(back.ms, Math.floor(ms / 60_000) * 60_000, `${zone} ${wall}`);
      } else {
        assert.equal(back.reason, "ambiguous", `${zone} ${wall}`);
        ambiguous += 1;
      }
    }
    // A zone without daylight saving never repeats an hour.
    assert.equal(ambiguous > 0, zone !== "Africa/Abidjan", zone);
  }
});

test("the quick-test button picks the next whole minute at least N minutes ahead", () => {
  assert.equal(startInMinutes(Date.parse("2026-11-08T19:58:20.000Z"), 2, TORONTO), "2026-11-08T15:01");
  assert.equal(startInMinutes(Date.parse("2026-11-08T19:58:00.000Z"), 2, TORONTO), "2026-11-08T15:00");
  assert.equal(startInMinutes(Date.parse("2026-11-08T19:58:20.000Z"), 2, PARIS), "2026-11-08T21:01");
  assert.equal(startInMinutes(Date.parse("2026-11-08T04:59:30.000Z"), 1, TORONTO), "2026-11-08T00:01");
});

test("every offered time zone is real, unique and labelled, and the default is on the list", () => {
  const values = ADMIN_TIME_ZONES.map((zone) => zone.value);
  assert.equal(new Set(values).size, values.length);
  assert.equal(new Set(ADMIN_TIME_ZONES.map((zone) => zone.label)).size, values.length);
  assert.ok(values.includes(DEFAULT_ADMIN_TIME_ZONE));
  for (const zone of ADMIN_TIME_ZONES) {
    assert.ok(zone.label.trim().length > 0);
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en-US", { timeZone: zone.value }), zone.value);
    assert.equal(zonedTimeToUtc("2026-11-08T12:00", zone.value).ok, true, zone.value);
  }
});

test("each way a time can fail has a plain message", () => {
  for (const reason of ["invalid", "invalid_zone", "nonexistent", "ambiguous"] as const) {
    assert.ok(ZONED_TIME_MESSAGES[reason].length > 10, reason);
  }
});

// ─── the set ─────────────────────────────────────────────────────────────

test("rows are built from a picker option and from a saved session", () => {
  assert.deepEqual(rowFromOption({ id: 7, title: "Sunrise", artistName: "Amina", grade: "A" }), {
    trackId: 7,
    title: "Sunrise",
    artistName: "Amina",
    grade: "A",
    durationSec: null,
    available: true,
  });
  assert.equal(rowFromOption({ id: 7, title: "Sunrise", artistName: null, grade: null }, 201).durationSec, 201);
  assert.deepEqual(rowFromView(view(0, 9, { grade: "S", available: false, durationSec: 240 })), {
    trackId: 9,
    title: "Track 9",
    artistName: "Artist 9",
    grade: "S",
    durationSec: 240,
    available: false,
  });
});

test("a measured length is rounded up, and a failed measurement is null", () => {
  assert.equal(ceilMeasuredDuration(180.2), 181);
  assert.equal(ceilMeasuredDuration(180), 180);
  assert.equal(ceilMeasuredDuration(0.4), 1);
  for (const bad of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(ceilMeasuredDuration(bad), null, String(bad));
  }
});

test("a track can be added once, up to sixty", () => {
  const first = addTrack([], row(1));
  assert.ok(first.ok);
  assert.deepEqual(
    first.rows.map((item) => item.trackId),
    [1],
  );
  assert.deepEqual(addTrack(first.rows, row(1)), { ok: false, reason: "duplicate" });

  const sixty = Array.from({ length: 60 }, (_, index) => row(index + 1));
  assert.deepEqual(addTrack(sixty, row(61)), { ok: false, reason: "full" });
  assert.deepEqual(addTrack(sixty, row(5)), { ok: false, reason: "duplicate" });
});

test("a track can be removed, and nothing else moves", () => {
  const rows = [row(1), row(2), row(3)];
  assert.deepEqual(
    removeTrack(rows, 2).map((item) => item.trackId),
    [1, 3],
  );
  assert.deepEqual(
    removeTrack(rows, 99).map((item) => item.trackId),
    [1, 2, 3],
  );
  assert.equal(rows.length, 3);
});

test("a track moves one step, and at either end nothing changes", () => {
  const rows = [row(1), row(2), row(3)];
  const ids = (list: readonly SetRow[]) => list.map((item) => item.trackId);
  assert.deepEqual(ids(moveTrack(rows, 1, -1)), [2, 1, 3]);
  assert.deepEqual(ids(moveTrack(rows, 1, 1)), [1, 3, 2]);
  assert.equal(moveTrack(rows, 0, -1), rows);
  assert.equal(moveTrack(rows, 2, 1), rows);
  assert.equal(moveTrack(rows, 5, -1), rows);
  assert.equal(moveTrack(rows, -1, 1), rows);
  assert.equal(moveTrack(rows, 0.5, 1), rows);
  assert.deepEqual(ids(rows), [1, 2, 3]);
});

test("a length can be set or cleared on one row", () => {
  const rows = [row(1, { durationSec: null }), row(2)];
  assert.deepEqual(
    setRowDuration(rows, 1, 201).map((item) => item.durationSec),
    [201, 180],
  );
  assert.deepEqual(
    setRowDuration(rows, 2, null).map((item) => item.durationSec),
    [null, null],
  );
  assert.equal(rows[0].durationSec, null);
});

test("signed artists come first, S then A then B then C, each group in its own order", () => {
  const grade = (value: SignedGrade | null): Partial<SetRow> => ({ grade: value });
  const rows = [
    row(1, grade(null)),
    row(2, grade("B")),
    row(3, grade("S")),
    row(4, grade("A")),
    row(5, grade(null)),
    row(6, grade("S")),
    row(7, grade("C")),
  ];
  assert.deepEqual(
    signedFirst(rows).map((item) => item.trackId),
    [3, 6, 4, 2, 7, 1, 5],
  );
  assert.deepEqual(
    rows.map((item) => item.trackId),
    [1, 2, 3, 4, 5, 6, 7],
  );
});

test("the set summary counts signed and regular tracks and totals the time with the pauses", () => {
  const rows = [row(1, { grade: "S", durationSec: 100 }), row(2, { durationSec: 200 })];
  assert.deepEqual(summarizeSet(rows, 15), {
    count: 2,
    signed: 1,
    regular: 1,
    unmeasured: 0,
    unavailable: 0,
    totalSec: 315,
  });
  assert.equal(summarizeSet(rows, 0).totalSec, 300);
});

test("the total stays unknown while any length is unmeasured, and for an empty set", () => {
  const rows = [row(1, { grade: "S", durationSec: 100 }), row(2, { durationSec: null }), row(3, { available: false })];
  assert.deepEqual(summarizeSet(rows, 15), {
    count: 3,
    signed: 1,
    regular: 2,
    unmeasured: 1,
    unavailable: 1,
    totalSec: null,
  });
  assert.equal(summarizeSet([], 15).totalSec, null);
  assert.equal(summarizeSet([], 15).count, 0);
});

test("the end of the set is previewed from the start, the lengths and the pauses", () => {
  const rows = [row(1, { durationSec: 200 }), row(2, { durationSec: 100 })];
  assert.equal(previewEndsAt("2026-11-08T20:00:00.000Z", rows, 15), "2026-11-08T20:05:15.000Z");
  assert.equal(previewEndsAt("2026-11-08T20:00:00.000Z", rows, 0), "2026-11-08T20:05:00.000Z");
  assert.equal(previewEndsAt("2026-11-08T20:00:00.000Z", [row(1, { durationSec: 200 })], 90), "2026-11-08T20:03:20.000Z");
});

test("there is no end to preview until the start and every length are known", () => {
  const rows = [row(1, { durationSec: 200 }), row(2, { durationSec: null })];
  assert.equal(previewEndsAt("2026-11-08T20:00:00.000Z", rows, 15), null);
  assert.equal(previewEndsAt("2026-11-08T20:00:00.000Z", [], 15), null);
  assert.equal(previewEndsAt(null, [row(1)], 15), null);
});

test("overlapping sessions are found; touching ones, cancelled ones and the one being edited are not", () => {
  const sessions = [
    { id: 1, startsAt: "2026-11-08T20:00:00.000Z", endsAt: "2026-11-08T21:00:00.000Z", status: "scheduled" as const },
    { id: 2, startsAt: "2026-11-08T21:00:00.000Z", endsAt: "2026-11-08T22:00:00.000Z", status: "scheduled" as const },
    { id: 3, startsAt: "2026-11-08T20:30:00.000Z", endsAt: "2026-11-08T20:45:00.000Z", status: "cancelled" as const },
  ];
  const at = (iso: string) => Date.parse(iso);
  const ids = (list: readonly { id: number }[]) => list.map((item) => item.id);

  assert.deepEqual(
    ids(findOverlaps(at("2026-11-08T20:30:00.000Z"), at("2026-11-08T21:30:00.000Z"), sessions)),
    [1, 2],
  );
  assert.deepEqual(
    ids(findOverlaps(at("2026-11-08T21:00:00.000Z"), at("2026-11-08T21:30:00.000Z"), sessions)),
    [2],
  );
  assert.deepEqual(
    ids(findOverlaps(at("2026-11-08T21:00:00.000Z"), at("2026-11-08T21:30:00.000Z"), sessions, 2)),
    [],
  );
  assert.deepEqual(ids(findOverlaps(at("2026-11-08T22:00:00.000Z"), at("2026-11-08T23:00:00.000Z"), sessions)), []);
});

// ─── create ──────────────────────────────────────────────────────────────

const goodDraft = (over: Partial<SessionDraft> = {}): SessionDraft => ({
  ...emptyDraft(),
  title: "Sunday Sounds",
  localStart: "2026-11-08T15:00",
  rows: [row(1, { durationSec: 200 }), row(2, { durationSec: 100, grade: "S" })],
  ...over,
});

const issuesOf = (result: ReturnType<typeof buildCreatePayload> | ReturnType<typeof buildUpdatePayload>) => {
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues;
};

test("a new draft starts empty in Toronto with a 15 second pause", () => {
  assert.deepEqual(emptyDraft(), {
    title: "",
    description: "",
    hostUserId: null,
    localStart: "",
    timeZone: "America/Toronto",
    gapSeconds: 15,
    rows: [],
  });
  assert.equal(emptyDraft(PARIS).timeZone, PARIS);
});

test("a good draft becomes the request body the API expects", () => {
  assert.deepEqual(buildCreatePayload(goodDraft({ title: "  Sunday   Sounds " }), { nowMs: NOW }), {
    ok: true,
    payload: {
      title: "Sunday Sounds",
      startsAt: "2026-11-08T20:00:00.000Z",
      gapSeconds: 15,
      tracks: [
        { trackId: 1, durationSec: 200 },
        { trackId: 2, durationSec: 100 },
      ],
    },
  });
});

test("the host and the description are sent only when they are set", () => {
  const result = buildCreatePayload(
    goodDraft({ hostUserId: 7, description: "  Warm up \n\n\n\n\n then the new ones " }),
    { nowMs: NOW },
  );
  assert.ok(result.ok);
  assert.equal(result.payload.hostUserId, 7);
  assert.equal(result.payload.description, "Warm up\n\nthen the new ones");

  const bare = buildCreatePayload(goodDraft({ description: "   " }), { nowMs: NOW });
  assert.ok(bare.ok);
  assert.equal("description" in bare.payload, false);
  assert.equal("hostUserId" in bare.payload, false);
});

test("the start is read in the chosen zone", () => {
  const result = buildCreatePayload(goodDraft({ timeZone: PARIS, localStart: "2026-11-08T21:00" }), { nowMs: NOW });
  assert.ok(result.ok);
  assert.equal(result.payload.startsAt, "2026-11-08T20:00:00.000Z");
});

test("every field that is wrong is reported at once, in form order", () => {
  const issues = issuesOf(
    buildCreatePayload(goodDraft({ title: " \u0007 ", localStart: "", gapSeconds: 301, rows: [] }), { nowMs: NOW }),
  );
  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["title", "start", "gap", "set"],
  );
  assert.equal(issues[0].message, "A title is required.");
  assert.equal(issues[1].message, ZONED_TIME_MESSAGES.invalid);
  assert.match(issues[2].message, /0 to 300/);
  assert.equal(issues[3].message, "Add at least one track to the set.");
});

test("a title and a description have a length limit", () => {
  const issues = issuesOf(
    buildCreatePayload(goodDraft({ title: "x".repeat(161), description: "y".repeat(2001) }), { nowMs: NOW }),
  );
  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["title", "description"],
  );
  assert.ok(buildCreatePayload(goodDraft({ title: "x".repeat(160), description: "y".repeat(2000) }), { nowMs: NOW }).ok);
});

test("a start in the past is refused, with a one minute grace", () => {
  // Now is 10:00 in Toronto.
  assert.ok(buildCreatePayload(goodDraft({ localStart: "2026-11-07T09:59" }), { nowMs: NOW }).ok);
  const late = issuesOf(buildCreatePayload(goodDraft({ localStart: "2026-11-07T09:58" }), { nowMs: NOW }));
  assert.deepEqual(late, [{ field: "start", message: "That start time is already in the past." }]);
});

test("a start more than a year ahead is refused", () => {
  assert.ok(buildCreatePayload(goodDraft({ localStart: "2027-11-08T10:00" }), { nowMs: NOW }).ok);
  const far = issuesOf(buildCreatePayload(goodDraft({ localStart: "2027-11-08T10:01" }), { nowMs: NOW }));
  assert.deepEqual(far, [{ field: "start", message: "That start time is more than a year away." }]);
});

test("a start inside a clock change is refused with the reason", () => {
  const march = Date.parse("2026-03-01T12:00:00.000Z");
  assert.deepEqual(issuesOf(buildCreatePayload(goodDraft({ localStart: "2026-03-08T02:30" }), { nowMs: march })), [
    { field: "start", message: ZONED_TIME_MESSAGES.nonexistent },
  ]);
  const october = Date.parse("2026-10-20T12:00:00.000Z");
  assert.deepEqual(issuesOf(buildCreatePayload(goodDraft({ localStart: "2026-11-01T01:30" }), { nowMs: october })), [
    { field: "start", message: ZONED_TIME_MESSAGES.ambiguous },
  ]);
});

test("the pause must be a whole number of seconds from 0 to 300", () => {
  for (const gapSeconds of [0, 15, 300]) {
    assert.ok(buildCreatePayload(goodDraft({ gapSeconds }), { nowMs: NOW }).ok, String(gapSeconds));
  }
  for (const gapSeconds of [-1, 301, 1.5, Number.NaN]) {
    const issues = issuesOf(buildCreatePayload(goodDraft({ gapSeconds }), { nowMs: NOW }));
    assert.deepEqual(
      issues.map((issue) => issue.field),
      ["gap"],
      String(gapSeconds),
    );
  }
});

test("tracks without a measured length block the save and say how many", () => {
  const one = issuesOf(buildCreatePayload(goodDraft({ rows: [row(1), row(2, { durationSec: null })] }), { nowMs: NOW }));
  assert.deepEqual(one, [{ field: "set", message: "1 track has no measured length yet." }]);
  const two = issuesOf(
    buildCreatePayload(goodDraft({ rows: [row(1, { durationSec: null }), row(2, { durationSec: null })] }), {
      nowMs: NOW,
    }),
  );
  assert.deepEqual(two, [{ field: "set", message: "2 tracks have no measured length yet." }]);
});

test("a track that is no longer published blocks the save", () => {
  const one = issuesOf(buildCreatePayload(goodDraft({ rows: [row(1), row(2, { available: false })] }), { nowMs: NOW }));
  assert.deepEqual(one, [{ field: "set", message: "1 track is no longer published. Replace it first." }]);
  const two = issuesOf(
    buildCreatePayload(goodDraft({ rows: [row(1, { available: false }), row(2, { available: false })] }), {
      nowMs: NOW,
    }),
  );
  assert.deepEqual(two, [{ field: "set", message: "2 tracks are no longer published. Replace them first." }]);
});

test("the shared set rules are enforced: a repeat, a track over an hour, a set over six hours", () => {
  assert.deepEqual(issuesOf(buildCreatePayload(goodDraft({ rows: [row(1), row(1)] }), { nowMs: NOW })), [
    { field: "set", message: "A track can appear only once in a set." },
  ]);
  assert.deepEqual(issuesOf(buildCreatePayload(goodDraft({ rows: [row(1, { durationSec: 3601 })] }), { nowMs: NOW })), [
    { field: "set", message: "Every track needs a length between 1 second and 1 hour." },
  ]);
  const long = Array.from({ length: 7 }, (_, index) => row(index + 1, { durationSec: 3600 }));
  assert.deepEqual(issuesOf(buildCreatePayload(goodDraft({ rows: long }), { nowMs: NOW })), [
    { field: "set", message: "A set can run for at most 6 hours." },
  ]);
});

// ─── edit ────────────────────────────────────────────────────────────────

const original = {
  title: "Sunday Sounds",
  description: "Warm up" as string | null,
  hostUserId: 5 as number | null,
  startsAt: "2026-11-08T20:00:00.000Z",
  gapSeconds: 15,
  status: "scheduled" as AdminSessionDetail["status"],
};

const unchanged = (over: Partial<SessionDraft> = {}): SessionDraft => ({
  title: "Sunday Sounds",
  description: "Warm up",
  hostUserId: 5,
  localStart: "2026-11-08T15:00",
  timeZone: TORONTO,
  gapSeconds: 15,
  rows: [row(1, { durationSec: 200 })],
  ...over,
});

const patchFor = (draft: SessionDraft, options: { setEdited?: boolean; status?: typeof original.status } = {}) =>
  buildUpdatePayload(
    { ...original, status: options.status ?? "scheduled" },
    draft,
    { nowMs: NOW, setEdited: options.setEdited ?? false },
  );

test("a draft nobody changed produces an empty patch", () => {
  assert.deepEqual(patchFor(unchanged()), { ok: true, payload: {} });
  assert.deepEqual(patchFor(unchanged({ hostUserId: null })), { ok: true, payload: {} });
});

test("the patch holds only what changed", () => {
  assert.deepEqual(patchFor(unchanged({ title: " New   title " })), { ok: true, payload: { title: "New title" } });
  assert.deepEqual(patchFor(unchanged({ description: "Other" })), { ok: true, payload: { description: "Other" } });
  assert.deepEqual(patchFor(unchanged({ hostUserId: 9 })), { ok: true, payload: { hostUserId: 9 } });
  assert.deepEqual(patchFor(unchanged({ gapSeconds: 20 })), { ok: true, payload: { gapSeconds: 20 } });
  assert.deepEqual(patchFor(unchanged({ localStart: "2026-11-08T16:30" })), {
    ok: true,
    payload: { startsAt: "2026-11-08T21:30:00.000Z" },
  });
});

test("an emptied description is sent as an empty string so the server clears it", () => {
  assert.deepEqual(patchFor(unchanged({ description: "  " })), { ok: true, payload: { description: "" } });
  const noDescription = buildUpdatePayload(
    { ...original, description: null },
    unchanged({ description: "" }),
    { nowMs: NOW, setEdited: false },
  );
  assert.deepEqual(noDescription, { ok: true, payload: {} });
});

test("a start that differs only by seconds from the stored one is not a change", () => {
  const result = buildUpdatePayload(
    { ...original, startsAt: "2026-11-08T20:00:30.000Z" },
    unchanged(),
    { nowMs: NOW, setEdited: false },
  );
  assert.deepEqual(result, { ok: true, payload: {} });
});

test("an untouched start inside the repeated hour does not block other edits", () => {
  const repeated = { ...original, startsAt: "2026-11-01T05:30:00.000Z" };
  const wall = utcToZonedInput(repeated.startsAt, TORONTO);
  assert.deepEqual(zonedTimeToUtc(wall, TORONTO), { ok: false, reason: "ambiguous" });

  const run = (draft: SessionDraft) => buildUpdatePayload(repeated, draft, { nowMs: NOW, setEdited: false });
  assert.deepEqual(run(unchanged({ localStart: wall })), { ok: true, payload: {} });
  assert.deepEqual(run(unchanged({ localStart: wall, title: "New title" })), {
    ok: true,
    payload: { title: "New title" },
  });
  // Typing a time inside that hour is still refused.
  assert.deepEqual(issuesOf(run(unchanged({ localStart: "2026-11-01T01:45" }))), [
    { field: "start", message: ZONED_TIME_MESSAGES.ambiguous },
  ]);
});

test("the set is sent only when the set itself was edited", () => {
  const rows = [row(1, { durationSec: 200 }), row(2, { durationSec: 100 })];
  assert.deepEqual(patchFor(unchanged({ rows }), { setEdited: false }), { ok: true, payload: {} });
  assert.deepEqual(patchFor(unchanged({ rows }), { setEdited: true }), {
    ok: true,
    payload: {
      tracks: [
        { trackId: 1, durationSec: 200 },
        { trackId: 2, durationSec: 100 },
      ],
    },
  });
});

test("an edited set is checked like a new one", () => {
  const issues = issuesOf(
    patchFor(unchanged({ rows: [row(1), row(2, { available: false })] }), { setEdited: true }),
  );
  assert.deepEqual(issues, [{ field: "set", message: "1 track is no longer published. Replace it first." }]);
  assert.deepEqual(
    issuesOf(patchFor(unchanged({ rows: [] }), { setEdited: true })).map((issue) => issue.field),
    ["set"],
  );
});

test("a changed start is checked: a past time, a far time, a skipped time", () => {
  assert.deepEqual(issuesOf(patchFor(unchanged({ localStart: "2026-11-07T09:00" }))), [
    { field: "start", message: "That start time is already in the past." },
  ]);
  assert.deepEqual(issuesOf(patchFor(unchanged({ localStart: "2028-01-01T10:00" }))), [
    { field: "start", message: "That start time is more than a year away." },
  ]);
  assert.deepEqual(issuesOf(patchFor(unchanged({ localStart: "" }))), [
    { field: "start", message: ZONED_TIME_MESSAGES.invalid },
  ]);
});

test("an emptied title or a bad pause is refused", () => {
  assert.deepEqual(
    issuesOf(patchFor(unchanged({ title: "  " }))).map((issue) => issue.field),
    ["title"],
  );
  assert.deepEqual(
    issuesOf(patchFor(unchanged({ gapSeconds: 400 }))).map((issue) => issue.field),
    ["gap"],
  );
});

test("once a session has started only the title, description and host can change", () => {
  const edited = unchanged({
    title: "Renamed",
    description: "New text",
    hostUserId: 9,
    localStart: "2026-11-08T18:00",
    gapSeconds: 99,
    rows: [row(5, { durationSec: 60 })],
  });
  for (const status of ["live", "ended"] as const) {
    assert.deepEqual(patchFor(edited, { status, setEdited: true }), {
      ok: true,
      payload: { title: "Renamed", description: "New text", hostUserId: 9 },
    });
  }
  // An unavailable track or a bad pause cannot block a rename once the set is locked.
  assert.deepEqual(
    patchFor(unchanged({ title: "Renamed", gapSeconds: 999, rows: [row(1, { available: false })] }), {
      status: "live",
      setEdited: true,
    }),
    { ok: true, payload: { title: "Renamed" } },
  );
});

test("a cancelled session cannot be edited at all", () => {
  const issues = issuesOf(patchFor(unchanged({ title: "Renamed" }), { status: "cancelled" }));
  assert.deepEqual(issues, [{ field: "title", message: "A cancelled session cannot be edited." }]);
});

test("only a scheduled session has an editable schedule", () => {
  assert.equal(isScheduleLocked("scheduled"), false);
  for (const status of ["live", "ended", "cancelled"] as const) {
    assert.equal(isScheduleLocked(status), true, status);
  }
});

test("a saved session fills the form in the chosen zone", () => {
  const detail: AdminSessionDetail = {
    id: 12,
    title: "Sunday Sounds",
    description: null,
    hostName: "Luq",
    startsAt: "2026-11-08T20:00:00.000Z",
    endsAt: "2026-11-08T20:05:15.000Z",
    status: "scheduled",
    gapSeconds: 20,
    trackCount: 2,
    totalDurationSec: 315,
    tracks: [view(0, 1, { grade: "S", durationSec: 200 }), view(1, 2, { available: false, durationSec: 100 })],
    hostUserId: 5,
    playlistId: 44,
  };
  assert.deepEqual(draftFromSession(detail, PARIS), {
    title: "Sunday Sounds",
    description: "",
    hostUserId: 5,
    localStart: "2026-11-08T21:00",
    timeZone: PARIS,
    gapSeconds: 20,
    rows: [
      { trackId: 1, title: "Track 1", artistName: "Artist 1", grade: "S", durationSec: 200, available: true },
      { trackId: 2, title: "Track 2", artistName: "Artist 2", grade: null, durationSec: 100, available: false },
    ],
  });
  assert.equal(draftFromSession({ ...detail, description: "Warm up" }, TORONTO).localStart, "2026-11-08T15:00");
});

test("loading a session and saving it unchanged sends nothing", () => {
  const detail: AdminSessionDetail = {
    id: 12,
    title: "Sunday Sounds",
    description: "Warm up",
    hostName: "Luq",
    startsAt: "2026-11-08T20:00:00.000Z",
    endsAt: "2026-11-08T20:03:20.000Z",
    status: "scheduled",
    gapSeconds: 15,
    trackCount: 1,
    totalDurationSec: 200,
    tracks: [view(0, 1, { durationSec: 200 })],
    hostUserId: 5,
    playlistId: 44,
  };
  assert.deepEqual(
    buildUpdatePayload(detail, draftFromSession(detail, TORONTO), { nowMs: NOW, setEdited: false }),
    { ok: true, payload: {} },
  );
});

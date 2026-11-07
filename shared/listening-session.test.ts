import assert from "node:assert/strict";
import test from "node:test";
import {
  computeEndsAt,
  computeNowPlaying,
  deriveStatus,
  formatSignedBadge,
  isSignedGrade,
  isValidGapSeconds,
  normalizeSessionDescription,
  normalizeSessionTitle,
  orderSignedFirst,
  setDurationSec,
  trackStartOffsetsSec,
  validateSetTracks,
  type SetTrack,
  type SignedGrade,
} from "./listening-session";

const START = Date.parse("2026-11-08T20:00:00.000Z");
const at = (secondsAfterStart: number) => START + secondsAfterStart * 1000;

// Track A 0-100 s, gap 100-120 s, track B 120-200 s, gap 200-220 s, track C 220-260 s.
const SET: SetTrack[] = [
  { trackId: 11, durationSec: 100 },
  { trackId: 22, durationSec: 80 },
  { trackId: 33, durationSec: 40 },
];
const GAP = 20;

const nowPlaying = (secondsAfterStart: number, tracks = SET, gapSec = GAP) =>
  computeNowPlaying({ startsAt: START, now: at(secondsAfterStart), tracks, gapSec });

test("before the start the session is scheduled and counts down, rounding up", () => {
  assert.deepEqual(nowPlaying(-90), { state: "scheduled", startsInSec: 90 });
  assert.deepEqual(
    computeNowPlaying({ startsAt: START, now: START - 1, tracks: SET, gapSec: GAP }),
    { state: "scheduled", startsInSec: 1 },
  );
});

test("at the start instant the first track plays from its beginning", () => {
  assert.deepEqual(nowPlaying(0), {
    state: "playing",
    index: 0,
    trackId: 11,
    offsetSec: 0,
    remainingSec: 100,
    nextTrackId: 22,
  });
});

test("mid-track reports the offset a late joiner must seek to", () => {
  assert.deepEqual(nowPlaying(130.5), {
    state: "playing",
    index: 1,
    trackId: 22,
    offsetSec: 10.5,
    remainingSec: 69.5,
    nextTrackId: 33,
  });
});

test("the last track has no next track", () => {
  const result = nowPlaying(259);
  assert.equal(result.state, "playing");
  assert.equal(result.state === "playing" && result.nextTrackId, null);
});

test("the exact millisecond a track ends the session is in the gap, one before it is not", () => {
  assert.equal(nowPlaying(99.999).state, "playing");
  assert.deepEqual(nowPlaying(100), {
    state: "gap",
    afterIndex: 0,
    gapRemainingSec: 20,
    nextTrackId: 22,
  });
});

test("inside a gap the remaining silence counts down and the next track is named", () => {
  assert.deepEqual(nowPlaying(115), {
    state: "gap",
    afterIndex: 0,
    gapRemainingSec: 5,
    nextTrackId: 22,
  });
  assert.deepEqual(nowPlaying(210), {
    state: "gap",
    afterIndex: 1,
    gapRemainingSec: 10,
    nextTrackId: 33,
  });
});

test("the exact millisecond a gap ends the next track starts at offset zero", () => {
  assert.deepEqual(nowPlaying(120), {
    state: "playing",
    index: 1,
    trackId: 22,
    offsetSec: 0,
    remainingSec: 80,
    nextTrackId: 33,
  });
  assert.equal(nowPlaying(119.999).state, "gap");
});

test("with no gap the next track starts the moment the previous one ends", () => {
  assert.deepEqual(nowPlaying(100, SET, 0), {
    state: "playing",
    index: 1,
    trackId: 22,
    offsetSec: 0,
    remainingSec: 80,
    nextTrackId: 33,
  });
});

test("the set is over exactly when the last track ends; no trailing gap is counted", () => {
  assert.equal(nowPlaying(259.999).state, "playing");
  assert.deepEqual(nowPlaying(260), { state: "ended" });
  assert.deepEqual(nowPlaying(10_000), { state: "ended" });
});

test("an empty set has nothing to play", () => {
  assert.deepEqual(nowPlaying(0, [], GAP), { state: "ended" });
  assert.deepEqual(nowPlaying(-5, [], GAP), { state: "scheduled", startsInSec: 5 });
});

test("zero, negative and non-finite lengths are skipped without shifting indexes", () => {
  const tracks: SetTrack[] = [
    { trackId: 1, durationSec: 10 },
    { trackId: 2, durationSec: 0 },
    { trackId: 3, durationSec: -4 },
    { trackId: 4, durationSec: Number.NaN },
    { trackId: 5, durationSec: 10 },
  ];
  // Gaps are still counted between positions: 10 s + 4 x 0 s gaps + 10 s.
  assert.deepEqual(nowPlaying(5, tracks, 0), {
    state: "playing",
    index: 0,
    trackId: 1,
    offsetSec: 5,
    remainingSec: 5,
    nextTrackId: 5,
  });
  assert.deepEqual(nowPlaying(10, tracks, 0), {
    state: "playing",
    index: 4,
    trackId: 5,
    offsetSec: 0,
    remainingSec: 10,
    nextTrackId: null,
  });
});

test("a gap that is followed only by unplayable tracks reads as the end", () => {
  const tracks: SetTrack[] = [
    { trackId: 1, durationSec: 10 },
    { trackId: 2, durationSec: 0 },
  ];
  assert.deepEqual(nowPlaying(10.5, tracks, 5), { state: "ended" });
});

test("fractional lengths are exact to the millisecond", () => {
  const tracks: SetTrack[] = [
    { trackId: 1, durationSec: 0.1 },
    { trackId: 2, durationSec: 0.2 },
  ];
  assert.equal(nowPlaying(0.1, tracks, 0).state, "playing");
  assert.equal(
    nowPlaying(0.1, tracks, 0).state === "playing" && nowPlaying(0.1, tracks, 0).trackId,
    2,
  );
  assert.deepEqual(nowPlaying(0.3, tracks, 0), { state: "ended" });
});

test("times may be given as dates, ISO strings or epoch milliseconds", () => {
  const expected = nowPlaying(130);
  assert.deepEqual(
    computeNowPlaying({
      startsAt: new Date(START),
      now: new Date(at(130)).toISOString(),
      tracks: SET,
      gapSec: GAP,
    }),
    expected,
  );
  assert.throws(
    () => computeNowPlaying({ startsAt: "not a date", now: START, tracks: SET, gapSec: GAP }),
    RangeError,
  );
});

test("ends_at is the start plus every track plus the gaps between them", () => {
  assert.equal(setDurationSec(SET, GAP), 260);
  assert.equal(computeEndsAt(START, SET, GAP).getTime(), at(260));
  assert.equal(setDurationSec([{ trackId: 1, durationSec: 90 }], 30), 90);
  assert.equal(setDurationSec([], 30), 0);
});

test("ends_at and the now-playing walk agree on where the set finishes", () => {
  const sets: Array<[SetTrack[], number]> = [
    [SET, GAP],
    [SET, 0],
    [[{ trackId: 1, durationSec: 183 }], 25],
    [
      [
        { trackId: 1, durationSec: 7 },
        { trackId: 2, durationSec: 3 },
        { trackId: 3, durationSec: 11 },
        { trackId: 4, durationSec: 1 },
      ],
      300,
    ],
  ];
  for (const [tracks, gapSec] of sets) {
    const endsAt = computeEndsAt(START, tracks, gapSec).getTime();
    assert.notEqual(
      computeNowPlaying({ startsAt: START, now: endsAt - 1, tracks, gapSec }).state,
      "ended",
    );
    assert.equal(
      computeNowPlaying({ startsAt: START, now: endsAt, tracks, gapSec }).state,
      "ended",
    );
  }
});

test("track start offsets include the gaps", () => {
  assert.deepEqual(trackStartOffsetsSec(SET, GAP), [0, 120, 220]);
  assert.deepEqual(trackStartOffsetsSec(SET, 0), [0, 100, 180]);
  assert.deepEqual(trackStartOffsetsSec([], GAP), []);
});

test("status follows the clock: scheduled, live at the start instant, ended at the end instant", () => {
  const window = { startsAt: START, endsAt: at(260) };
  assert.equal(deriveStatus({ ...window, now: START - 1 }), "scheduled");
  assert.equal(deriveStatus({ ...window, now: START }), "live");
  assert.equal(deriveStatus({ ...window, now: at(259.999) }), "live");
  assert.equal(deriveStatus({ ...window, now: at(260) }), "ended");
});

test("a cancelled session stays cancelled at any time; a stale stored status never wins", () => {
  const window = { startsAt: START, endsAt: at(260) };
  for (const now of [START - 10_000, at(30), at(5_000)]) {
    assert.equal(deriveStatus({ ...window, now, storedStatus: "cancelled" }), "cancelled");
  }
  assert.equal(deriveStatus({ ...window, now: at(5_000), storedStatus: "live" }), "ended");
  assert.equal(deriveStatus({ ...window, now: START - 5, storedStatus: "ended" }), "scheduled");
});

test("a valid set is returned as plain track entries", () => {
  assert.deepEqual(
    validateSetTracks([
      { trackId: 5, durationSec: 200, extra: "dropped" },
      { trackId: 6, durationSec: 1 },
    ]),
    {
      ok: true,
      tracks: [
        { trackId: 5, durationSec: 200 },
        { trackId: 6, durationSec: 1 },
      ],
    },
  );
});

test("set validation rejects the cases that would break playback", () => {
  const code = (input: unknown) => {
    const result = validateSetTracks(input);
    return result.ok ? "ok" : result.code;
  };
  assert.equal(code(undefined), "set_empty");
  assert.equal(code([]), "set_empty");
  assert.equal(code("tracks"), "set_empty");
  assert.equal(
    code(Array.from({ length: 61 }, (_, i) => ({ trackId: i + 1, durationSec: 60 }))),
    "set_too_many_tracks",
  );
  assert.equal(code([null]), "track_id_invalid");
  assert.equal(code([{ trackId: 0, durationSec: 60 }]), "track_id_invalid");
  assert.equal(code([{ trackId: "7", durationSec: 60 }]), "track_id_invalid");
  assert.equal(code([{ trackId: 1.5, durationSec: 60 }]), "track_id_invalid");
  assert.equal(code([{ trackId: 1, durationSec: 0 }]), "track_duration_invalid");
  assert.equal(code([{ trackId: 1, durationSec: 3601 }]), "track_duration_invalid");
  assert.equal(code([{ trackId: 1, durationSec: 90.5 }]), "track_duration_invalid");
  assert.equal(code([{ trackId: 1, durationSec: "90" }]), "track_duration_invalid");
  assert.equal(
    code([
      { trackId: 1, durationSec: 60 },
      { trackId: 1, durationSec: 60 },
    ]),
    "track_duplicate",
  );
  assert.equal(
    code(Array.from({ length: 7 }, (_, i) => ({ trackId: i + 1, durationSec: 3600 }))),
    "set_too_long",
  );
});

test("the gap must be a whole number of seconds from 0 to 300", () => {
  for (const ok of [0, 1, 30, 300]) assert.equal(isValidGapSeconds(ok), true);
  for (const bad of [-1, 301, 2.5, "30", null, undefined, Number.NaN]) {
    assert.equal(isValidGapSeconds(bad), false);
  }
});

test("a title becomes one clean line: controls and NUL removed, spaces collapsed", () => {
  assert.equal(normalizeSessionTitle("  Sunday \t  Listening \n Session  "), "Sunday Listening Session");
  assert.equal(normalizeSessionTitle("Lo\u0000ve\u0007 night"), "Love night");
  assert.equal(normalizeSessionTitle("Fa\u202Eke\u200B title\uFEFF"), "Fake title");
  assert.equal(normalizeSessionTitle("Séance d\u2019écoute \u{1F3A7}"), "Séance d\u2019écoute \u{1F3A7}");
  assert.equal(normalizeSessionTitle(" \u0000 \t "), "");
});

test("a description keeps its lines but loses controls, odd spacing and extra blank lines", () => {
  assert.equal(
    normalizeSessionDescription("  Line one  \r\nLine\u0000 two\t\there\n\n\n\n\nLine three \u202E "),
    "Line one\nLine two here\n\nLine three",
  );
  assert.equal(normalizeSessionDescription("a\u2028b\u2029c"), "a\nb\nc");
  assert.equal(normalizeSessionDescription(" \n \u0000 \n"), "");
  assert.equal(normalizeSessionDescription("Tracks de Abidjan \u{1F1E8}\u{1F1EE}"), "Tracks de Abidjan \u{1F1E8}\u{1F1EE}");
});

test("signed-first orders S, A, B, C then regular artists, keeping order inside each group", () => {
  const rows: Array<{ id: string; grade: SignedGrade | null }> = [
    { id: "r1", grade: null },
    { id: "c1", grade: "C" },
    { id: "a1", grade: "A" },
    { id: "r2", grade: null },
    { id: "s1", grade: "S" },
    { id: "a2", grade: "A" },
    { id: "b1", grade: "B" },
  ];
  assert.deepEqual(
    orderSignedFirst(rows).map((row) => row.id),
    ["s1", "a1", "a2", "b1", "c1", "r1", "r2"],
  );
  assert.deepEqual(rows[0], { id: "r1", grade: null }, "the input is not mutated");
});

test("only a contracted grade earns the badge, and it shows the letter alone", () => {
  assert.equal(formatSignedBadge("S"), "Verso Signed \u00b7 S");
  assert.equal(formatSignedBadge("C"), "Verso Signed \u00b7 C");
  assert.equal(formatSignedBadge(null), null);
  assert.equal(formatSignedBadge(undefined), null);
  assert.equal(isSignedGrade("A"), true);
  for (const notAGrade of ["pending", "a", "", null, undefined, 1]) {
    assert.equal(isSignedGrade(notAGrade), false);
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import type { SessionChatMessage, SessionTrackView } from "@shared/listening-session";
import {
  CHAT_KEEP,
  CLOCK_JUMP_MS,
  CLOCK_MAX_ROUND_TRIP_MS,
  CLOCK_WINDOW,
  DRIFT_RESEEK_SEC,
  MAX_CREDIT_STEP_MS,
  PLAY_CREDIT_SEC,
  addClockSample,
  createPlayCreditTracker,
  currentSlot,
  lastChatId,
  measureClockSample,
  mergeChatMessages,
  pickClockOffset,
  planPlayback,
  playSlotKey,
  reconcileAudio,
  serverNowMs,
  upNextTrack,
  type AudioSnapshot,
  type PlaybackPlan,
  type SessionSchedule,
} from "./listening-session-sync";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

// Three tracks of 60, 90 and 120 seconds with a 10 second gap:
// starts at 0, 70 and 170 seconds, and the set ends at 290 seconds.
const tracks: SessionTrackView[] = [
  { position: 0, trackId: 11, title: "One", artistName: "A", durationSec: 60, startOffsetSec: 0, grade: "S", available: true },
  { position: 1, trackId: 22, title: "Two", artistName: "B", durationSec: 90, startOffsetSec: 70, grade: null, available: true },
  { position: 2, trackId: 33, title: "Three", artistName: "C", durationSec: 120, startOffsetSec: 170, grade: "C", available: true },
];

const schedule: SessionSchedule = {
  startsAt: new Date(T0).toISOString(),
  gapSeconds: 10,
  tracks,
};

const at = (seconds: number, status: "scheduled" | "live" | "ended" | "cancelled" = "live", sched = schedule) =>
  planPlayback({ status, schedule: sched, serverNowMs: T0 + seconds * 1000 });

test("a request gives a clock sample whose error bar is the round trip", () => {
  const sample = measureClockSample({
    serverTime: new Date(T0 + 5_000).toISOString(),
    sentAtMs: T0,
    receivedAtMs: T0 + 200,
  });
  assert.deepEqual(sample, { offsetMs: 4_900, roundTripMs: 200 });
});

test("a server ahead of the browser gives a positive offset and a server behind gives a negative one", () => {
  const ahead = measureClockSample({ serverTime: new Date(T0 + 1_000).toISOString(), sentAtMs: T0, receivedAtMs: T0 });
  const behind = measureClockSample({ serverTime: new Date(T0 - 1_000).toISOString(), sentAtMs: T0, receivedAtMs: T0 });
  assert.equal(ahead?.offsetMs, 1_000);
  assert.equal(behind?.offsetMs, -1_000);
  assert.equal(serverNowMs(ahead!.offsetMs, T0), T0 + 1_000);
});

test("unusable measurements are refused instead of poisoning the clock", () => {
  assert.equal(measureClockSample({ serverTime: "nope", sentAtMs: 1, receivedAtMs: 2 }), null);
  assert.equal(measureClockSample({ serverTime: new Date(T0).toISOString(), sentAtMs: 10, receivedAtMs: 5 }), null);
  assert.equal(measureClockSample({ serverTime: new Date(T0).toISOString(), sentAtMs: Number.NaN, receivedAtMs: 5 }), null);
});

test("the sample with the shortest round trip wins; no samples means no correction", () => {
  assert.equal(pickClockOffset([]), 0);
  assert.equal(
    pickClockOffset([
      { offsetMs: 900, roundTripMs: 800 },
      { offsetMs: 120, roundTripMs: 40 },
      { offsetMs: 300, roundTripMs: 90 },
    ]),
    120,
  );
});

test("the clock window keeps the newest samples and drops the oldest", () => {
  let window = addClockSample([], { offsetMs: 100, roundTripMs: 50 });
  for (let i = 1; i <= 10; i++) window = addClockSample(window, { offsetMs: 100 + i, roundTripMs: 50 + i });
  assert.equal(window.length, CLOCK_WINDOW);
  assert.equal(window[0].offsetMs, 103, "the three oldest are gone");
  assert.equal(window[window.length - 1].offsetMs, 110);
  assert.equal(addClockSample(window, { offsetMs: 120, roundTripMs: 10 }, 3).length, 3);
});

test("a changed device clock restarts the estimate instead of averaging old and new", () => {
  let window = addClockSample([], { offsetMs: 100, roundTripMs: 50 });
  window = addClockSample(window, { offsetMs: 120, roundTripMs: 60 });
  const jumped = addClockSample(window, { offsetMs: 100 + CLOCK_JUMP_MS + 1, roundTripMs: 80 });
  assert.deepEqual(jumped, [{ offsetMs: 100 + CLOCK_JUMP_MS + 1, roundTripMs: 80 }]);
  const steady = addClockSample(window, { offsetMs: 100 + CLOCK_JUMP_MS, roundTripMs: 80 });
  assert.equal(steady.length, 3, "a difference at the limit is still the same clock");
});

test("a very slow round trip is ignored once there is an estimate, but accepted as the first", () => {
  const slow = { offsetMs: 4_000, roundTripMs: CLOCK_MAX_ROUND_TRIP_MS + 1 };
  assert.deepEqual(addClockSample([], slow), [slow]);
  const window = [{ offsetMs: 100, roundTripMs: 50 }];
  assert.equal(addClockSample(window, slow), window);
});

test("before the start nothing plays and the countdown is exact", () => {
  assert.deepEqual(at(-5, "scheduled"), { kind: "idle", reason: "scheduled", startsInSec: 5 });
  assert.deepEqual(at(-0.001, "scheduled"), { kind: "idle", reason: "scheduled", startsInSec: 1 });
});

test("at the start instant the first track plays from its beginning", () => {
  assert.deepEqual(at(0), {
    kind: "play",
    index: 0,
    trackId: 11,
    targetSec: 0,
    remainingSec: 60,
    nextTrackId: 22,
  });
});

test("a late listener is placed into the current track", () => {
  const plan = at(100);
  assert.equal(plan.kind, "play");
  assert.equal(plan.kind === "play" && plan.trackId, 22);
  assert.equal(plan.kind === "play" && plan.targetSec, 30);
  assert.equal(plan.kind === "play" && plan.remainingSec, 60);
});

test("the gap after a track is silent and names what comes next", () => {
  assert.deepEqual(at(60), { kind: "gap", nextTrackId: 22, gapRemainingSec: 10 });
  assert.deepEqual(at(65), { kind: "gap", nextTrackId: 22, gapRemainingSec: 5 });
});

test("a track starts exactly on its offset", () => {
  const plan = at(70);
  assert.equal(plan.kind === "play" && plan.trackId, 22);
  assert.equal(plan.kind === "play" && plan.targetSec, 0);
});

test("the last track has nothing after it and the set ends on the instant it finishes", () => {
  const last = at(289.999);
  assert.equal(last.kind === "play" && last.trackId, 33);
  assert.equal(last.kind === "play" && last.nextTrackId, null);
  assert.deepEqual(at(290), { kind: "idle", reason: "ended", startsInSec: null });
  assert.deepEqual(at(10_000), { kind: "idle", reason: "ended", startsInSec: null });
});

test("a cancelled session plays nothing whatever the clock says", () => {
  assert.deepEqual(at(100, "cancelled"), { kind: "idle", reason: "cancelled", startsInSec: null });
});

test("an unpublished track keeps its slot but is silent, so the schedule never moves", () => {
  const hidden: SessionSchedule = {
    ...schedule,
    tracks: tracks.map((track) => (track.trackId === 22 ? { ...track, available: false } : track)),
  };
  assert.deepEqual(at(100, "live", hidden), { kind: "unavailable", index: 1, trackId: 22, remainingSec: 60 });
  const next = at(170, "live", hidden);
  assert.equal(next.kind === "play" && next.trackId, 33);
});

test("an empty set never plays", () => {
  const empty: SessionSchedule = { ...schedule, tracks: [] };
  assert.deepEqual(at(0, "live", empty), { kind: "idle", reason: "ended", startsInSec: null });
});

const playing = (overrides: Partial<Extract<PlaybackPlan, { kind: "play" }>> = {}): PlaybackPlan => ({
  kind: "play",
  index: 1,
  trackId: 22,
  targetSec: 30,
  remainingSec: 60,
  nextTrackId: 33,
  ...overrides,
});

const audioState = (overrides: Partial<AudioSnapshot> = {}): AudioSnapshot => ({
  trackId: 22,
  currentTimeSec: 30,
  paused: false,
  ended: false,
  ready: true,
  failed: false,
  ...overrides,
});

test("an empty element loads the planned track at the live position", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState({ trackId: null })), {
    type: "load",
    trackId: 22,
    startAtSec: 30,
  });
});

test("the element holding the previous track loads the new one", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState({ trackId: 11, currentTimeSec: 59.9 })), {
    type: "load",
    trackId: 22,
    startAtSec: 30,
  });
});

test("a listener in step is left alone", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState()), { type: "none" });
  assert.deepEqual(reconcileAudio(playing(), audioState({ currentTimeSec: 30 + DRIFT_RESEEK_SEC })), { type: "none" });
  assert.deepEqual(reconcileAudio(playing(), audioState({ currentTimeSec: 30 - DRIFT_RESEEK_SEC })), { type: "none" });
});

test("a listener who drifted past the limit is moved back to the live position", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState({ currentTimeSec: 33.5 })), { type: "seek", toSec: 30 });
  assert.deepEqual(reconcileAudio(playing(), audioState({ currentTimeSec: 20 })), { type: "seek", toSec: 30 });
});

test("a paused element resumes once it is in step, and seeks first when it is not", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState({ paused: true })), { type: "resume" });
  assert.deepEqual(reconcileAudio(playing(), audioState({ paused: true, currentTimeSec: 5 })), {
    type: "seek",
    toSec: 30,
  });
});

test("a track that is still loading, has errored or has finished is not disturbed", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState({ ready: false, currentTimeSec: 0 })), { type: "none" });
  assert.deepEqual(reconcileAudio(playing(), audioState({ failed: true, currentTimeSec: 0 })), { type: "none" });
  assert.deepEqual(reconcileAudio(playing(), audioState({ ended: true, currentTimeSec: 90 })), { type: "none" });
});

test("a different drift limit can be supplied", () => {
  assert.deepEqual(reconcileAudio(playing(), audioState({ currentTimeSec: 31 }), { driftSec: 0.5 }), {
    type: "seek",
    toSec: 30,
  });
});

test("when nothing should be heard, a loaded element is silenced and an empty one is left alone", () => {
  const quiet: PlaybackPlan[] = [
    { kind: "idle", reason: "ended", startsInSec: null },
    { kind: "idle", reason: "cancelled", startsInSec: null },
    { kind: "idle", reason: "scheduled", startsInSec: 12 },
    { kind: "gap", nextTrackId: 33, gapRemainingSec: 4 },
    { kind: "unavailable", index: 1, trackId: 22, remainingSec: 20 },
  ];
  for (const plan of quiet) {
    assert.deepEqual(reconcileAudio(plan, audioState()), { type: "silence" }, plan.kind);
    assert.deepEqual(reconcileAudio(plan, audioState({ trackId: null })), { type: "none" }, plan.kind);
  }
});

const SLOT = playSlotKey(7, 1, 22);

test("a slot is credited exactly once, when real playback reaches the threshold", () => {
  const credit = createPlayCreditTracker();
  const steps = Math.ceil((PLAY_CREDIT_SEC * 1000) / 1000);
  const fired: number[] = [];
  for (let i = 1; i <= steps + 10; i++) {
    if (credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 })) fired.push(i);
  }
  assert.deepEqual(fired, [PLAY_CREDIT_SEC]);
});

test("paused time does not count", () => {
  const credit = createPlayCreditTracker();
  for (let i = 0; i < 100; i++) {
    assert.equal(credit.tick({ slotKey: SLOT, playing: false, elapsedMs: 1_000 }), false);
  }
  for (let i = 1; i < PLAY_CREDIT_SEC; i++) {
    assert.equal(credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 }), false);
  }
  assert.equal(credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 }), true);
});

test("a long frozen tick is clamped, so a throttled tab cannot fake listening", () => {
  const credit = createPlayCreditTracker();
  assert.equal(credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 10 * 60 * 1000 }), false);
  const needed = Math.ceil((PLAY_CREDIT_SEC * 1000) / MAX_CREDIT_STEP_MS);
  let fired = 0;
  for (let i = 1; i < needed; i++) {
    if (credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 10 * 60 * 1000 })) fired++;
  }
  assert.equal(fired, 1);
});

test("moving to another slot starts over, and returning to a credited slot does not credit twice", () => {
  const credit = createPlayCreditTracker();
  const other = playSlotKey(7, 2, 33);
  for (let i = 0; i < PLAY_CREDIT_SEC - 1; i++) credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 });
  assert.equal(credit.tick({ slotKey: other, playing: true, elapsedMs: 1_000 }), false, "progress of the first slot is dropped");

  const fresh = createPlayCreditTracker();
  for (let i = 0; i < PLAY_CREDIT_SEC; i++) fresh.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 });
  for (let i = 0; i < 100; i++) assert.equal(fresh.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 }), false);
});

test("time already heard survives leaving and rejoining the same slot", () => {
  const credit = createPlayCreditTracker();
  for (let i = 0; i < 20; i++) credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 });
  for (let i = 0; i < 50; i++) credit.tick({ slotKey: SLOT, playing: false, elapsedMs: 1_000 });
  let fired = false;
  for (let i = 0; i < 10; i++) fired = credit.tick({ slotKey: SLOT, playing: true, elapsedMs: 1_000 }) || fired;
  assert.equal(fired, true);
});

test("no slot, or a bad elapsed time, never credits", () => {
  const credit = createPlayCreditTracker();
  for (let i = 0; i < 100; i++) assert.equal(credit.tick({ slotKey: null, playing: true, elapsedMs: 1_000 }), false);
  for (const elapsedMs of [0, -5, Number.NaN, Number.POSITIVE_INFINITY * 0]) {
    assert.equal(credit.tick({ slotKey: SLOT, playing: true, elapsedMs }), false);
  }
});

const message = (id: number, body = `m${id}`): SessionChatMessage => ({
  id,
  body,
  createdAt: new Date(T0 + id * 1000).toISOString(),
  author: "Listener",
  isHost: false,
});

test("merging chat pages never duplicates and keeps the oldest first", () => {
  const merged = mergeChatMessages([message(1), message(2)], [message(2, "edited"), message(3)]);
  assert.deepEqual(
    merged.map((m) => m.id),
    [1, 2, 3],
  );
  assert.equal(merged[1].body, "edited");
  assert.deepEqual(
    mergeChatMessages([message(5)], [message(2), message(9)]).map((m) => m.id),
    [2, 5, 9],
  );
});

test("an empty page returns the very same list, so the screen does not re-render", () => {
  const current = [message(1)];
  assert.equal(mergeChatMessages(current, []), current);
});

test("only the newest messages are kept", () => {
  const many = Array.from({ length: CHAT_KEEP + 25 }, (_, i) => message(i + 1));
  const merged = mergeChatMessages([], many);
  assert.equal(merged.length, CHAT_KEEP);
  assert.equal(merged[0].id, 26);
  assert.equal(merged[merged.length - 1].id, CHAT_KEEP + 25);
  assert.equal(mergeChatMessages([message(1), message(2), message(3)], [message(4)], 2).map((m) => m.id).join(), "3,4");
});

test("the next poll continues after the newest message", () => {
  assert.equal(lastChatId([]), null);
  assert.equal(lastChatId([message(4), message(9)]), 9);
});

test("the current slot reports how far along its track the set is", () => {
  const slot = currentSlot(at(100), tracks);
  assert.equal(slot?.index, 1);
  assert.equal(slot?.track.trackId, 22);
  assert.equal(slot?.progress, 30 / 90);
  assert.equal(currentSlot(at(60), tracks), null, "the gap has no current track");
  assert.equal(currentSlot(at(-5, "scheduled"), tracks), null);
  assert.equal(currentSlot(at(1000), tracks), null);
});

test("an unavailable slot still has a position on the timeline", () => {
  const hidden: SessionSchedule = {
    ...schedule,
    tracks: tracks.map((track) => (track.trackId === 22 ? { ...track, available: false } : track)),
  };
  const slot = currentSlot(at(100, "live", hidden), tracks);
  assert.equal(slot?.track.trackId, 22);
  assert.equal(slot?.progress, 30 / 90);
});

test("up next is the following track, the one after a gap, or nothing at the end", () => {
  assert.equal(upNextTrack(at(10), tracks)?.trackId, 22);
  assert.equal(upNextTrack(at(65), tracks)?.trackId, 22);
  assert.equal(upNextTrack(at(200), tracks), null);
  assert.equal(upNextTrack(at(-1, "scheduled"), tracks), null);
  assert.equal(upNextTrack(at(1000), tracks), null);
});

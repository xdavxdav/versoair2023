import assert from "node:assert/strict";
import test from "node:test";

import {
  LOAD_RETRY_MS,
  MAX_LOAD_ATTEMPTS,
  createLiveAudioEngine,
} from "./listening-session-player";
import { FakeAudio, flush } from "./listening-session-test-support";
import { planPlayback } from "./listening-session-sync";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

// Track 101 plays 0-200 s, then a 10 s pause, 102 plays 210-310 s, a pause, 103 plays 320-470 s.
const TRACKS = [
  { trackId: 101, durationSec: 200, available: true },
  { trackId: 102, durationSec: 100, available: true },
  { trackId: 103, durationSec: 150, available: true },
];

const url = (trackId: number) => `/api/music/tracks/${trackId}/stream`;

function makeWorld(
  options: {
    startOffsetMs?: number;
    gapSeconds?: number;
    tracks?: { trackId: number; durationSec: number; available: boolean }[];
  } = {},
) {
  const audio = new FakeAudio();
  let now = T0 + (options.startOffsetMs ?? 0);
  let cancelled = false;
  let created = 0;
  let notified = 0;
  const recorded: number[] = [];
  const schedule = {
    startsAt: new Date(T0).toISOString(),
    gapSeconds: options.gapSeconds ?? 10,
    tracks: options.tracks ?? TRACKS,
  };

  const engine = createLiveAudioEngine({
    sessionId: 12,
    getPlan: () =>
      planPlayback({ status: cancelled ? "cancelled" : "live", schedule, serverNowMs: now }),
    deps: {
      createAudio: () => {
        created += 1;
        return audio;
      },
      nowMs: () => now,
      streamUrl: url,
      recordPlay: (trackId) => recorded.push(trackId),
    },
  });
  engine.subscribe(() => {
    notified += 1;
  });

  /** Time passes in ticks; a playing element moves forward with it, like a real one. */
  const advance = (ms: number, stepMs = 500) => {
    let left = ms;
    while (left > 0) {
      const dt = Math.min(stepMs, left);
      left -= dt;
      now += dt;
      if (!audio.paused && !audio.ended && audio.readyState >= 2 && !audio.stalled) {
        audio.tickTime(dt / 1000);
      }
      engine.tick();
    }
  };

  return {
    audio,
    engine,
    recorded,
    advance,
    created: () => created,
    notifications: () => notified,
    setCancelled: (value: boolean) => {
      cancelled = value;
    },
  };
}

test("joining mid-track loads that track at the live position and starts sound inside the click", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();

  assert.equal(w.created(), 1);
  assert.equal(w.audio.preload, "auto");
  assert.deepEqual(w.audio.srcWrites, [url(101)]);
  assert.equal(w.audio.currentTime, 50);
  assert.equal(w.audio.playCalls, 1);
  assert.equal(w.audio.paused, false);
  assert.deepEqual(w.engine.getState(), { joined: true, needsTap: false, muted: false, failedTrackId: null });
});

test("joining before the start waits quietly, then starts the first track on time", () => {
  const w = makeWorld({ startOffsetMs: -30_000 });
  w.engine.join();
  assert.equal(w.audio.playCalls, 0);
  assert.deepEqual(w.audio.srcWrites, []);

  w.advance(29_500);
  assert.deepEqual(w.audio.srcWrites, []);

  w.advance(1_000);
  assert.deepEqual(w.audio.srcWrites, [url(101)]);
  assert.equal(w.audio.playCalls, 1);
  assert.equal(w.audio.currentTime, 0.5);
});

test("when the browser blocks sound the engine waits for a tap instead of retrying", async () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.audio.playOutcome = "blocked";
  w.engine.join();
  await flush();

  assert.equal(w.engine.getState().needsTap, true);
  assert.equal(w.audio.playCalls, 1);
  const writesWhileBlocked = w.audio.currentTimeWrites.length;
  w.advance(5_000);
  assert.equal(w.audio.playCalls, 1);
  assert.equal(w.audio.currentTimeWrites.length, writesWhileBlocked);
  assert.equal(w.audio.paused, true);

  w.audio.playOutcome = "ok";
  w.engine.tap();
  assert.equal(w.audio.playCalls, 2);
  assert.equal(w.audio.paused, false);
  assert.equal(w.audio.currentTime, 55);
  assert.equal(w.engine.getState().needsTap, false);
  await flush();
  assert.equal(w.engine.getState().needsTap, false);
});

test("a blocked attempt that was overtaken by a newer source does not flip the tap prompt", async () => {
  const w = makeWorld({ startOffsetMs: 199_000 });
  w.audio.playOutcome = "blocked";
  w.engine.join();
  w.audio.playOutcome = "ok";
  w.advance(11_500);
  assert.deepEqual(w.audio.srcWrites, [url(101), url(102)]);

  await flush();
  assert.equal(w.engine.getState().needsTap, false);
});

test("a blocked attempt that is answered after the listener left does not bring the prompt back", async () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.audio.playOutcome = "blocked";
  w.engine.join();
  w.engine.leave();
  await flush();
  assert.equal(w.engine.getState().needsTap, false);
  assert.equal(w.engine.getState().joined, false);
});

test("an interrupted attempt is not a block: the next tick resumes by itself", async () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.audio.playOutcome = "aborted";
  w.engine.join();
  await flush();
  assert.equal(w.engine.getState().needsTap, false);
  assert.equal(w.audio.paused, true);

  w.audio.playOutcome = "ok";
  w.advance(500);
  assert.equal(w.audio.playCalls, 2);
  assert.equal(w.audio.paused, false);
});

test("while the prompt shows, the next track is loaded ready but not started until the tap", async () => {
  const w = makeWorld({ startOffsetMs: 199_000 });
  w.audio.playOutcome = "blocked";
  w.engine.join();
  await flush();
  assert.equal(w.engine.getState().needsTap, true);

  w.advance(11_500);
  assert.deepEqual(w.audio.srcWrites, [url(101), url(102)]);
  assert.equal(w.audio.playCalls, 1);
  assert.equal(w.engine.getState().needsTap, true);

  w.audio.playOutcome = "ok";
  const writesBeforeTap = w.audio.currentTimeWrites.length;
  w.engine.tap();
  assert.equal(w.audio.playCalls, 2);
  assert.equal(w.audio.paused, false);
  // Half a second behind is inside the tolerance, so the tap starts the sound without a seek.
  assert.equal(w.audio.currentTimeWrites.length, writesBeforeTap);
});

test("a tap before joining joins", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.tap();
  assert.equal(w.engine.getState().joined, true);
  assert.equal(w.audio.playCalls, 1);
});

test("small drift is left alone, and a drift past two seconds seeks back to the live position", () => {
  const w = makeWorld({ startOffsetMs: 10_000 });
  w.engine.join();
  w.advance(5_000);
  assert.equal(w.audio.currentTime, 15);
  const writes = w.audio.currentTimeWrites.length;

  // Exactly two seconds behind is not past the limit.
  w.audio.tickTime(-2);
  w.advance(500);
  assert.equal(w.audio.currentTimeWrites.length, writes);

  w.audio.tickTime(-0.5);
  w.advance(500);
  assert.equal(w.audio.currentTimeWrites.length, writes + 1);
  assert.equal(w.audio.currentTime, 16);
});

test("a browser that ignores an early seek is corrected as soon as the file is readable", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.audio.autoReady = false;
  w.audio.ignoreEarlySeek = true;
  w.engine.join();
  assert.equal(w.audio.currentTime, 0);

  w.audio.readyState = 4;
  w.audio.emit("canplay");
  assert.equal(w.audio.currentTime, 50);
});

test("the next track replaces the last one after the pause, and the pause itself is silent", () => {
  const w = makeWorld({ startOffsetMs: 198_000 });
  w.engine.join();
  assert.deepEqual(w.audio.srcWrites, [url(101)]);

  w.advance(2_500);
  assert.equal(w.audio.src, "");
  assert.ok(w.audio.pauseCalls >= 1);
  assert.equal(w.audio.srcWrites.length, 1);

  w.advance(9_000);
  assert.equal(w.audio.src, "");

  w.advance(1_000);
  assert.deepEqual(w.audio.srcWrites, [url(101), url(102)]);
  assert.equal(w.audio.currentTime, 0.5);
  assert.equal(w.audio.paused, false);
});

test("with no pause between tracks the next one takes over at once", () => {
  const w = makeWorld({ gapSeconds: 0, startOffsetMs: 199_000 });
  w.engine.join();
  w.advance(1_500);
  assert.deepEqual(w.audio.srcWrites, [url(101), url(102)]);
  assert.equal(w.audio.currentTime, 0.5);
});

test("a track that was unpublished keeps its slot silent and the schedule does not move", () => {
  const tracks = [TRACKS[0], { ...TRACKS[1], available: false }, TRACKS[2]];
  const w = makeWorld({ startOffsetMs: 215_000, tracks });
  w.engine.join();
  assert.deepEqual(w.audio.srcWrites, []);
  assert.equal(w.audio.playCalls, 0);

  w.advance(105_000);
  assert.deepEqual(w.audio.srcWrites, [url(103)]);
  assert.equal(w.audio.currentTime, 0);
});

test("a track that ends early stays quiet, without a prompt, until the schedule moves on", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  w.audio.finish();
  w.audio.emit("pause");
  w.audio.emit("ended");
  assert.equal(w.engine.getState().needsTap, false);

  const plays = w.audio.playCalls;
  const sources = w.audio.srcWrites.length;
  w.advance(3_000);
  assert.equal(w.audio.playCalls, plays);
  assert.equal(w.audio.srcWrites.length, sources);

  w.advance(160_000);
  assert.deepEqual(w.audio.srcWrites, [url(101), url(102)]);
});

test("a pause the engine did not make waits for a tap, and the tap rejoins the live position", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  w.audio.pause();
  w.audio.emit("pause");
  assert.equal(w.engine.getState().needsTap, true);

  const plays = w.audio.playCalls;
  w.advance(4_000);
  assert.equal(w.audio.playCalls, plays);

  w.engine.tap();
  assert.equal(w.audio.paused, false);
  assert.equal(w.audio.currentTime, 54);
  assert.equal(w.engine.getState().needsTap, false);
});

test("the pause the engine makes itself between tracks does not raise the prompt", () => {
  const w = makeWorld({ startOffsetMs: 199_000 });
  w.engine.join();
  w.advance(1_500);
  w.audio.emit("pause");
  assert.equal(w.engine.getState().needsTap, false);
});

test("sound that starts by itself clears the prompt", async () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.audio.playOutcome = "blocked";
  w.engine.join();
  await flush();
  assert.equal(w.engine.getState().needsTap, true);

  w.audio.emit("playing");
  assert.equal(w.engine.getState().needsTap, false);
});

test("a track that fails to load is retried after a pause, then given up on, then forgotten at the next slot", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  const fail = () => {
    w.audio.error = { code: 4 };
    w.audio.emit("error");
  };

  fail();
  w.advance(LOAD_RETRY_MS - 500);
  assert.equal(w.audio.srcWrites.length, 1);
  w.advance(500);
  assert.equal(w.audio.srcWrites.length, 2);

  for (let attempt = 2; attempt < MAX_LOAD_ATTEMPTS; attempt += 1) {
    fail();
    assert.equal(w.engine.getState().failedTrackId, null);
    w.advance(LOAD_RETRY_MS);
    assert.equal(w.audio.srcWrites.length, attempt + 1);
  }
  assert.equal(w.audio.srcWrites.length, MAX_LOAD_ATTEMPTS);

  fail();
  assert.equal(w.engine.getState().failedTrackId, 101);
  w.advance(60_000);
  assert.equal(w.audio.srcWrites.length, MAX_LOAD_ATTEMPTS);
  assert.equal(w.engine.getState().failedTrackId, 101);

  // The slot ends at 200 s; the pause forgets the failure and the next track loads normally.
  w.advance(90_000);
  assert.equal(w.engine.getState().failedTrackId, null);
  w.advance(10_000);
  assert.equal(w.audio.srcWrites.at(-1), url(102));
  assert.equal(w.audio.srcWrites.length, MAX_LOAD_ATTEMPTS + 1);
});

test("a retry that works clears the failure and nothing is reloaded again", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  w.audio.error = { code: 4 };
  w.audio.emit("error");
  w.advance(LOAD_RETRY_MS);
  assert.equal(w.audio.srcWrites.length, 2);

  w.audio.emit("loadedmetadata");
  w.advance(30_000);
  assert.equal(w.audio.srcWrites.length, 2);
  assert.equal(w.engine.getState().failedTrackId, null);
});

test("an abort the engine caused itself is not counted as a failure", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  w.audio.error = { code: 1 };
  w.audio.emit("error");
  w.advance(20_000);
  assert.equal(w.audio.srcWrites.length, 1);
  assert.equal(w.engine.getState().failedTrackId, null);
});

test("a track is credited once, after thirty seconds of real listening", () => {
  const w = makeWorld({ startOffsetMs: 10_000 });
  w.engine.join();
  w.advance(29_000);
  assert.deepEqual(w.recorded, []);
  w.advance(3_000);
  assert.deepEqual(w.recorded, [101]);
  w.advance(60_000);
  assert.deepEqual(w.recorded, [101]);

  // The next slot starts over and is credited on its own.
  w.advance(130_000);
  assert.deepEqual(w.recorded, [101]);
  w.advance(40_000);
  assert.deepEqual(w.recorded, [101, 102]);
});

test("nothing is credited while sound is blocked, or while the audio is stuck", async () => {
  const blocked = makeWorld({ startOffsetMs: 10_000 });
  blocked.audio.playOutcome = "blocked";
  blocked.engine.join();
  await flush();
  blocked.advance(90_000);
  assert.deepEqual(blocked.recorded, []);

  const stuck = makeWorld({ startOffsetMs: 10_000 });
  stuck.engine.join();
  stuck.audio.stalled = true;
  stuck.advance(90_000);
  assert.deepEqual(stuck.recorded, []);
});

test("leaving and rejoining within a slot keeps the time already heard", () => {
  const w = makeWorld({ startOffsetMs: 10_000 });
  w.engine.join();
  w.advance(20_000);
  assert.deepEqual(w.recorded, []);

  w.engine.leave();
  w.advance(5_000);
  w.engine.join();
  w.advance(8_000);
  assert.deepEqual(w.recorded, []);
  w.advance(3_500);
  assert.deepEqual(w.recorded, [101]);
});

test("a throttled tab is credited slowly: one tick never counts for more than two seconds", () => {
  const w = makeWorld({ startOffsetMs: 10_000 });
  w.engine.join();
  w.advance(30_000, 10_000);
  assert.deepEqual(w.recorded, []);
});

test("leaving silences the element and stops steering it, and joining again reuses it", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  w.engine.leave();
  assert.equal(w.audio.src, "");
  assert.equal(w.audio.paused, true);
  assert.deepEqual(w.engine.getState(), { joined: false, needsTap: false, muted: false, failedTrackId: null });

  const plays = w.audio.playCalls;
  w.advance(3_000);
  assert.equal(w.audio.playCalls, plays);
  assert.equal(w.audio.srcWrites.length, 1);

  w.engine.join();
  assert.equal(w.created(), 1);
  assert.equal(w.audio.srcWrites.length, 2);
  assert.equal(w.audio.currentTime, 53);
});

test("leaving while the tap prompt shows clears it, so a later join starts clean", async () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.audio.playOutcome = "blocked";
  w.engine.join();
  await flush();
  assert.equal(w.engine.getState().needsTap, true);

  w.engine.leave();
  assert.equal(w.engine.getState().needsTap, false);
  assert.equal(w.engine.getState().joined, false);

  w.audio.playOutcome = "ok";
  w.engine.join();
  assert.equal(w.audio.paused, false);
  assert.equal(w.engine.getState().needsTap, false);
});

test("a cancelled session goes silent at the next tick", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  w.setCancelled(true);
  w.advance(500);
  assert.equal(w.audio.src, "");
  assert.equal(w.audio.paused, true);
});

test("the subscribers hear about changes, not about every tick", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  const afterJoin = w.notifications();
  assert.equal(afterJoin, 1);

  w.advance(20_000);
  assert.equal(w.notifications(), afterJoin);

  w.engine.setMuted(true);
  assert.equal(w.notifications(), afterJoin + 1);
  w.engine.setMuted(true);
  assert.equal(w.notifications(), afterJoin + 1);
});

test("mute applies to the element, before and after it exists", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.setMuted(true);
  w.engine.join();
  assert.equal(w.audio.muted, true);
  assert.equal(w.engine.getState().muted, true);
  w.engine.setMuted(false);
  assert.equal(w.audio.muted, false);
});

test("after dispose nothing is left listening and nothing answers", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  w.engine.join();
  assert.ok(w.audio.listenerCount() > 0);

  w.engine.dispose();
  assert.equal(w.audio.listenerCount(), 0);
  assert.equal(w.audio.src, "");

  const plays = w.audio.playCalls;
  w.engine.join();
  w.engine.tap();
  w.engine.tick();
  assert.equal(w.audio.playCalls, plays);
  w.engine.dispose();
});

test("a subscriber can stop listening", () => {
  const w = makeWorld({ startOffsetMs: 50_000 });
  let heard = 0;
  const stop = w.engine.subscribe(() => {
    heard += 1;
  });
  w.engine.setMuted(true);
  stop();
  w.engine.setMuted(false);
  assert.equal(heard, 1);
});

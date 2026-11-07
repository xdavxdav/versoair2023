import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import {
  MIN_REFRESH_GAP_MS,
  POLL_LIVE_MS,
  POLL_SCHEDULED_MS,
  RETRY_DELAYS_MS,
  createLiveSessionController,
  fetchSessionJson,
  parseSessionResponse,
  pollDelayMs,
  type FetchJson,
  type FetchResult,
} from "./listening-session-live";
import { FakeAudio, flush } from "./listening-session-test-support";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");
// Three tracks of 200, 100 and 150 s with a 10 s pause between them: the set lasts 470 s.
const END = T0 + 470_000;
const url = (trackId: number) => `/api/music/tracks/${trackId}/stream`;

function sessionJson(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    title: "Friday listening session",
    description: "Slow records.",
    hostName: "Luq",
    startsAt: new Date(T0).toISOString(),
    endsAt: new Date(END).toISOString(),
    status: "scheduled",
    gapSeconds: 10,
    trackCount: 3,
    totalDurationSec: 470,
    tracks: [
      { position: 0, trackId: 101, title: "One", artistName: "Ada", durationSec: 200, startOffsetSec: 0, grade: "S", available: true },
      { position: 1, trackId: 102, title: "Two", artistName: "Ben", durationSec: 100, startOffsetSec: 210, grade: null, available: true },
      { position: 2, trackId: 103, title: "Three", artistName: "Cy", durationSec: 150, startOffsetSec: 320, grade: "B", available: true },
    ],
    ...overrides,
  };
}

type Respond = (call: number, signal: AbortSignal) => FetchResult | Promise<FetchResult>;

function makeWorld(
  t: TestContext,
  options: { deviceNowMs: number; skewMs?: number; roundTripMs?: number },
) {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const clock = { now: options.deviceNowMs };
  const skewMs = options.skewMs ?? 0;
  const roundTripMs = options.roundTripMs ?? 0;
  const audio = new FakeAudio();
  const urls: string[] = [];
  const recorded: number[] = [];
  let notified = 0;

  /** A good answer: the server stamps its clock halfway through the round trip. */
  function ok(overrides: Record<string, unknown> = {}): FetchResult {
    clock.now += roundTripMs / 2;
    const serverTime = new Date(clock.now + skewMs).toISOString();
    clock.now += roundTripMs / 2;
    return { status: 200, body: { success: true, serverTime, session: sessionJson(overrides) } };
  }

  const script: { respond: Respond } = { respond: () => ok() };
  const fetchJson: FetchJson = async (requestUrl, signal) => {
    urls.push(requestUrl);
    return script.respond(urls.length, signal);
  };

  const controller = createLiveSessionController({
    sessionId: 12,
    fetchJson,
    createAudio: () => audio,
    recordPlay: (trackId) => recorded.push(trackId),
    nowMs: () => clock.now,
  });
  controller.subscribe(() => {
    notified += 1;
  });

  /** Time passes in half-second steps, like the real tick, and answers get a turn after each. */
  async function advance(ms: number) {
    let left = ms;
    while (left > 0) {
      const step = Math.min(500, left);
      left -= step;
      clock.now += step;
      t.mock.timers.tick(step);
      await flush();
    }
  }

  return { clock, audio, urls, recorded, script, controller, ok, advance, notified: () => notified };
}

test("the session is fetched once at the start and handed to the page", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  assert.equal(w.controller.getSnapshot().phase, "loading");

  // Nothing is asked before the page starts the controller.
  w.controller.refresh();
  assert.deepEqual(w.urls, []);

  w.controller.start();
  w.controller.start();
  await flush();

  assert.deepEqual(w.urls, ["/api/listening-sessions/12"]);
  const snapshot = w.controller.getSnapshot();
  assert.equal(snapshot.phase, "ready");
  assert.equal(snapshot.status, "scheduled");
  assert.equal(snapshot.offline, false);
  assert.equal(snapshot.detail?.title, "Friday listening session");
  assert.equal(snapshot.detail?.tracks.length, 3);
});

test("the schedule runs on the server's clock, not the device's", async (t) => {
  // The device is five seconds behind the server and still thinks the session is to come.
  const w = makeWorld(t, { deviceNowMs: T0 - 4_200, skewMs: 5_000, roundTripMs: 200 });
  w.controller.start();
  await flush();

  assert.equal(w.controller.serverNow() - w.clock.now, 5_000);
  assert.equal(w.clock.now < T0, true);
  assert.equal(w.controller.getSnapshot().status, "live");

  w.controller.engine.join();
  assert.deepEqual(w.audio.srcWrites, [url(101)]);
  assert.equal(w.audio.currentTimeWrites[0], 1);
});

test("it looks again every 30 s while scheduled, and every 25 s once live", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 100_000 });
  w.controller.start();
  await flush();
  assert.equal(w.urls.length, 1);

  await w.advance(POLL_SCHEDULED_MS - 500);
  assert.equal(w.urls.length, 1);
  await w.advance(500);
  assert.equal(w.urls.length, 2);
  await w.advance(POLL_SCHEDULED_MS);
  assert.equal(w.urls.length, 3);
  await w.advance(POLL_SCHEDULED_MS);
  assert.equal(w.urls.length, 4);

  // The start, ten seconds later, is the moment to look again; a live session is polled faster.
  await w.advance(10_000);
  assert.equal(w.controller.getSnapshot().status, "live");
  assert.equal(w.urls.length, 5);
  await w.advance(POLL_LIVE_MS - 500);
  assert.equal(w.urls.length, 5);
  await w.advance(500);
  assert.equal(w.urls.length, 6);
});

test("when the set is over it stops asking", async (t) => {
  const w = makeWorld(t, { deviceNowMs: END - 60_000 });
  w.controller.start();
  await flush();
  assert.equal(w.controller.getSnapshot().status, "live");

  await w.advance(70_000);
  assert.equal(w.controller.getSnapshot().status, "ended");
  assert.equal(w.urls.length, 3);
  await w.advance(300_000);
  assert.equal(w.urls.length, 3);
});

test("a failed look keeps what is on screen, says offline, and retries after 5, 10, then 20 s", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  w.controller.start();
  await flush();
  const detail = w.controller.getSnapshot().detail;
  assert.ok(detail);

  w.script.respond = (call) => (call <= 4 ? { status: 503, body: null } : w.ok());

  await w.advance(POLL_SCHEDULED_MS);
  assert.equal(w.urls.length, 2);
  assert.equal(w.controller.getSnapshot().offline, true);
  assert.equal(w.controller.getSnapshot().phase, "ready");
  assert.equal(w.controller.getSnapshot().detail, detail);

  await w.advance(RETRY_DELAYS_MS[0] - 500);
  assert.equal(w.urls.length, 2);
  await w.advance(500);
  assert.equal(w.urls.length, 3);

  await w.advance(RETRY_DELAYS_MS[1] - 500);
  assert.equal(w.urls.length, 3);
  await w.advance(500);
  assert.equal(w.urls.length, 4);

  await w.advance(RETRY_DELAYS_MS[2] - 500);
  assert.equal(w.urls.length, 4);
  await w.advance(500);
  assert.equal(w.urls.length, 5);
  assert.equal(w.controller.getSnapshot().offline, false);

  // Back to the normal rhythm.
  await w.advance(POLL_SCHEDULED_MS - 500);
  assert.equal(w.urls.length, 5);
  await w.advance(500);
  assert.equal(w.urls.length, 6);
});

test("a first load that fails shows the error state, then recovers on its own", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  w.script.respond = (call) => (call === 1 ? Promise.reject(new Error("offline")) : w.ok());
  w.controller.start();
  await flush();

  assert.equal(w.controller.getSnapshot().phase, "error");
  assert.equal(w.controller.getSnapshot().detail, null);

  await w.advance(RETRY_DELAYS_MS[0]);
  assert.equal(w.urls.length, 2);
  assert.equal(w.controller.getSnapshot().phase, "ready");
  assert.equal(w.controller.getSnapshot().offline, false);
});

test("a missing session, or sessions switched off, is final: nothing more is requested", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  w.script.respond = () => ({ status: 404, body: { success: false } });
  w.controller.start();
  await flush();

  assert.equal(w.controller.getSnapshot().phase, "notfound");
  assert.equal(w.controller.getSnapshot().detail, null);
  await w.advance(300_000);
  w.controller.refresh();
  assert.equal(w.urls.length, 1);
});

test("sessions switched off while people listen silence the sound", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 + 50_000 });
  w.controller.start();
  await flush();
  w.controller.engine.join();
  assert.deepEqual(w.audio.srcWrites, [url(101)]);

  w.script.respond = () => ({ status: 404, body: null });
  await w.advance(POLL_LIVE_MS + 500);
  assert.equal(w.controller.getSnapshot().phase, "notfound");
  assert.equal(w.audio.src, "");
  assert.equal(w.audio.paused, true);
});

test("an answer that makes no sense is an error and never reaches the audio", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 + 50_000 });
  w.script.respond = () => ({
    status: 200,
    body: { success: true, serverTime: new Date(w.clock.now).toISOString(), session: sessionJson({ tracks: [{ trackId: 101, durationSec: 0, available: true }] }) },
  });
  w.controller.start();
  await flush();

  assert.equal(w.controller.getSnapshot().phase, "error");
  w.controller.engine.join();
  await w.advance(2_000);
  assert.deepEqual(w.audio.srcWrites, []);
});

test("a session cancelled while people listen goes silent and is not polled again", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 + 50_000 });
  w.controller.start();
  await flush();
  assert.equal(w.controller.getSnapshot().status, "live");
  w.controller.engine.join();
  assert.deepEqual(w.audio.srcWrites, [url(101)]);

  w.script.respond = () => w.ok({ status: "cancelled" });
  await w.advance(POLL_LIVE_MS + 500);
  assert.equal(w.controller.getSnapshot().status, "cancelled");
  assert.equal(w.audio.src, "");
  assert.equal(w.audio.paused, true);

  const calls = w.urls.length;
  await w.advance(300_000);
  assert.equal(w.urls.length, calls);
});

test("the half-second tick moves the audio from track to track on the server clock", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 + 198_000 });
  w.controller.start();
  await flush();
  w.controller.engine.join();
  assert.deepEqual(w.audio.srcWrites, [url(101)]);

  await w.advance(2_500);
  assert.equal(w.audio.src, "");
  await w.advance(9_500);
  assert.deepEqual(w.audio.srcWrites, [url(101), url(102)]);
});

test("a returning tab asks for a fresh look, but close requests count as one", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  w.controller.start();
  await flush();
  assert.equal(w.urls.length, 1);

  w.controller.refresh();
  assert.equal(w.urls.length, 1);

  await w.advance(MIN_REFRESH_GAP_MS);
  w.controller.refresh();
  assert.equal(w.urls.length, 2);
  await flush();

  // While a request is out, further asks wait for it and then look exactly once more.
  let release: (result: FetchResult) => void = () => undefined;
  w.script.respond = () =>
    new Promise<FetchResult>((resolve) => {
      release = resolve;
    });
  await w.advance(MIN_REFRESH_GAP_MS);
  w.controller.refresh();
  assert.equal(w.urls.length, 3);
  await w.advance(MIN_REFRESH_GAP_MS);
  w.controller.refresh();
  w.controller.refresh();
  assert.equal(w.urls.length, 3);

  w.script.respond = () => w.ok();
  release(w.ok());
  await flush();
  assert.equal(w.urls.length, 4);
  await flush();
  assert.equal(w.urls.length, 4);
});

test("a finished session is not refreshed", async (t) => {
  const w = makeWorld(t, { deviceNowMs: END + 60_000 });
  w.controller.start();
  await flush();
  assert.equal(w.controller.getSnapshot().status, "ended");

  await w.advance(MIN_REFRESH_GAP_MS);
  w.controller.refresh();
  await w.advance(300_000);
  assert.equal(w.urls.length, 1);
});

test("a failed look that is answered after the set is over is no reason for a warning or a retry", async (t) => {
  const w = makeWorld(t, { deviceNowMs: END - 30_000 });
  w.controller.start();
  await flush();
  assert.equal(w.controller.getSnapshot().status, "live");

  // The poll goes out 5 s before the end and is only answered, with an error, after it.
  let release: (result: FetchResult) => void = () => undefined;
  w.script.respond = () =>
    new Promise<FetchResult>((resolve) => {
      release = resolve;
    });
  await w.advance(POLL_LIVE_MS);
  assert.equal(w.urls.length, 2);
  await w.advance(10_000);
  assert.equal(w.controller.getSnapshot().status, "ended");

  release({ status: 500, body: null });
  await flush();
  assert.equal(w.controller.getSnapshot().status, "ended");
  assert.equal(w.controller.getSnapshot().offline, false);
  await w.advance(300_000);
  assert.equal(w.urls.length, 2);
});

test("an unchanged answer does not redraw the page, a changed one does", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  w.controller.start();
  await flush();
  const first = w.controller.getSnapshot().detail;
  const before = w.notified();

  await w.advance(POLL_SCHEDULED_MS);
  assert.equal(w.urls.length, 2);
  assert.equal(w.controller.getSnapshot().detail, first);
  assert.equal(w.notified(), before);

  w.script.respond = () => w.ok({ title: "Moved to Sunday" });
  await w.advance(POLL_SCHEDULED_MS);
  assert.notEqual(w.controller.getSnapshot().detail, first);
  assert.equal(w.controller.getSnapshot().detail?.title, "Moved to Sunday");
  assert.ok(w.notified() > before);
});

test("stopping ends the timers, aborts the request and frees the audio", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 + 50_000 });
  let aborted = false;
  w.script.respond = (call, signal) =>
    call === 1
      ? w.ok()
      : new Promise<FetchResult>((_, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        });
  w.controller.start();
  await flush();
  w.controller.engine.join();
  await w.advance(POLL_LIVE_MS);
  assert.equal(w.urls.length, 2);

  w.controller.stop();
  await flush();
  assert.equal(aborted, true);
  assert.equal(w.audio.listenerCount(), 0);
  assert.equal(w.audio.src, "");
  assert.equal(w.controller.getSnapshot().offline, false);

  await w.advance(300_000);
  assert.equal(w.urls.length, 2);
  w.controller.stop();
  w.controller.refresh();
  assert.equal(w.urls.length, 2);
});

test("thirty seconds of real listening is recorded once, for the track that was heard", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 + 50_000 });
  w.controller.start();
  await flush();
  w.controller.engine.join();
  assert.deepEqual(w.audio.srcWrites, [url(101)]);

  // The element plays in step with the clock, as a real one would.
  const listenFor = async (seconds: number) => {
    for (let i = 0; i < seconds * 2; i += 1) {
      w.audio.tickTime(0.5);
      await w.advance(500);
    }
  };
  await listenFor(25);
  assert.deepEqual(w.recorded, []);
  await listenFor(10);
  assert.deepEqual(w.recorded, [101]);
  await listenFor(20);
  assert.deepEqual(w.recorded, [101]);
});

test("an answer that arrives while the device clock stepped back gives no clock reading: the first one is a failed look", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000 });
  w.script.respond = (call) => {
    if (call > 1) return w.ok();
    w.clock.now -= 1_000;
    return {
      status: 200,
      body: { success: true, serverTime: new Date(w.clock.now).toISOString(), session: sessionJson() },
    };
  };
  w.controller.start();
  await flush();
  assert.equal(w.controller.getSnapshot().phase, "error");
  assert.equal(w.controller.getSnapshot().detail, null);

  await w.advance(RETRY_DELAYS_MS[0]);
  assert.equal(w.urls.length, 2);
  assert.equal(w.controller.getSnapshot().phase, "ready");
});

test("once the clock is known, a reading from a clock that stepped back is skipped but the answer is still used", async (t) => {
  const w = makeWorld(t, { deviceNowMs: T0 - 600_000, skewMs: 5_000 });
  w.controller.start();
  await flush();
  assert.equal(w.controller.serverNow() - w.clock.now, 5_000);

  w.script.respond = () => {
    w.clock.now -= 1_000;
    return {
      status: 200,
      body: {
        success: true,
        serverTime: new Date(w.clock.now + 5_000).toISOString(),
        session: sessionJson({ title: "Renamed" }),
      },
    };
  };
  await w.advance(POLL_SCHEDULED_MS);
  assert.equal(w.urls.length, 2);
  assert.equal(w.controller.getSnapshot().detail?.title, "Renamed");
  assert.equal(w.controller.getSnapshot().offline, false);
  assert.equal(w.controller.serverNow() - w.clock.now, 5_000);
});

test("fetchSessionJson reads the status and the JSON body, and never uses the browser cache", async (t) => {
  const calls: Array<{ input: unknown; init?: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  const request = new AbortController();

  const result = await fetchSessionJson("/api/listening-sessions/12", request.signal);

  assert.deepEqual(result, { status: 200, body: { success: true } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "/api/listening-sessions/12");
  assert.equal(calls[0].init?.cache, "no-store");
  assert.equal(calls[0].init?.signal, request.signal);
  assert.deepEqual(calls[0].init?.headers, { Accept: "application/json" });
});

test("fetchSessionJson keeps the status of an answer that is not JSON, and lets network errors through", async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>Bad gateway</html>", { status: 502 }),
  );
  assert.deepEqual(await fetchSessionJson("/x", new AbortController().signal), { status: 502, body: null });

  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(fetchSessionJson("/x", new AbortController().signal), TypeError);
});

test("pollDelayMs: faster while live, retry delays after a failure, nothing once over", () => {
  assert.equal(pollDelayMs("scheduled", 0), POLL_SCHEDULED_MS);
  assert.equal(pollDelayMs("live", 0), POLL_LIVE_MS);
  assert.equal(pollDelayMs(null, 0), null);
  assert.equal(pollDelayMs("ended", 0), null);
  assert.equal(pollDelayMs("cancelled", 0), null);

  assert.deepEqual(
    [1, 2, 3, 4, 5, 50].map((failures) => pollDelayMs("live", failures)),
    [5_000, 10_000, 20_000, 30_000, 30_000, 30_000],
  );
  assert.equal(pollDelayMs(null, 1), 5_000);
  assert.equal(pollDelayMs("ended", 3), null);
  assert.equal(pollDelayMs("cancelled", 3), null);
});

const serverTime = "2026-11-08T19:59:00.000Z";
const withSession = (overrides: Record<string, unknown>) => ({ serverTime, session: sessionJson(overrides) });

test("parseSessionResponse accepts the API shape and fills the gaps", () => {
  const parsed = parseSessionResponse(
    withSession({
      description: "",
      hostName: null,
      trackCount: 99,
      totalDurationSec: undefined,
      tracks: [
        { trackId: 101, durationSec: 200, available: true, grade: "Z", artistName: "", title: 7 },
        { trackId: 102, durationSec: 100, available: false },
      ],
    }),
    12,
  );
  assert.ok(parsed);
  assert.equal(parsed.serverTime, serverTime);
  assert.equal(parsed.detail.description, null);
  assert.equal(parsed.detail.hostName, null);
  assert.equal(parsed.detail.trackCount, 2);
  assert.equal(parsed.detail.totalDurationSec, 470);
  assert.deepEqual(parsed.detail.tracks[0], {
    position: 0,
    trackId: 101,
    title: "",
    artistName: null,
    durationSec: 200,
    startOffsetSec: 0,
    grade: null,
    available: true,
  });
  assert.equal(parsed.detail.tracks[1].position, 1);
  assert.equal(parsed.detail.tracks[1].available, false);

  const full = parseSessionResponse(withSession({}), 12);
  assert.equal(full?.detail.tracks[0].grade, "S");
  assert.equal(full?.detail.tracks[1].grade, null);
  assert.equal(full?.detail.tracks[2].grade, "B");
});

test("parseSessionResponse refuses whatever could not be scheduled safely", () => {
  const goodTrack = { trackId: 101, durationSec: 200, available: true };
  const bad: Array<[string, unknown]> = [
    ["no body", null],
    ["a string", "session"],
    ["an array", []],
    ["no server time", { session: sessionJson() }],
    ["a server time that is not text", { serverTime: 5, session: sessionJson() }],
    ["no session", { serverTime }],
    ["another session's id", withSession({ id: 13 })],
    ["an id sent as text", withSession({ id: "12" })],
    ["an unknown status", withSession({ status: "paused" })],
    ["a start that is not a time", withSession({ startsAt: "soon" })],
    ["an end that is not text", withSession({ endsAt: 5 })],
    ["an end before the start", withSession({ endsAt: new Date(T0 - 1_000).toISOString() })],
    ["an end equal to the start", withSession({ endsAt: new Date(T0).toISOString() })],
    ["a negative pause", withSession({ gapSeconds: -1 })],
    ["a pause sent as text", withSession({ gapSeconds: "10" })],
    ["no tracks", withSession({ tracks: [] })],
    ["tracks that are not a list", withSession({ tracks: "none" })],
    ["a track id of zero", withSession({ tracks: [{ ...goodTrack, trackId: 0 }] })],
    ["a fractional track id", withSession({ tracks: [{ ...goodTrack, trackId: 1.5 }] })],
    ["a track id sent as text", withSession({ tracks: [{ ...goodTrack, trackId: "101" }] })],
    ["a zero length", withSession({ tracks: [{ ...goodTrack, durationSec: 0 }] })],
    ["a negative length", withSession({ tracks: [{ ...goodTrack, durationSec: -5 }] })],
    ["a length that is not a number", withSession({ tracks: [{ ...goodTrack, durationSec: null }] })],
    ["no availability flag", withSession({ tracks: [{ trackId: 101, durationSec: 200 }] })],
    ["a track that is not an object", withSession({ tracks: [goodTrack, 7] })],
  ];
  for (const [label, body] of bad) {
    assert.equal(parseSessionResponse(body, 12), null, label);
  }
});

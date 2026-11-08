/**
 * The live side of one session page, with no React in it: it fetches the session, keeps an
 * estimate of the server clock, works out the status on that clock, and steers the audio
 * engine. The browser pieces are injected, so the polling, retry and clock rules can be
 * tested with fake timers.
 */
import {
  SESSION_STATUSES,
  isSignedGrade,
  type SessionDetail,
  type SessionStatus,
  type SessionTrackView,
} from "@shared/listening-session";
import { liveStatus } from "./listening-session-format";
import { createLiveAudioEngine, type EngineAudio, type LiveAudioEngine } from "./listening-session-player";
import {
  addClockSample,
  measureClockSample,
  pickClockOffset,
  planPlayback,
  serverNowMs,
  type ClockSample,
  type PlaybackPlan,
} from "./listening-session-sync";

export const POLL_SCHEDULED_MS = 30_000;
export const POLL_LIVE_MS = 25_000;
/** After a failed request: 5 s, 10 s, 20 s, then every 30 s. */
export const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000] as const;
export const TICK_MS = 500;
/** A returning tab or a network that came back asks for a fetch; two of them this close are one. */
export const MIN_REFRESH_GAP_MS = 2_000;

export interface FetchResult {
  status: number;
  body: unknown;
}

export type FetchJson = (url: string, signal: AbortSignal) => Promise<FetchResult>;

export type LivePhase = "loading" | "ready" | "notfound" | "error";

export interface LiveSessionSnapshot {
  phase: LivePhase;
  detail: SessionDetail | null;
  /** The status on the server clock; null until a session is loaded. */
  status: SessionStatus | null;
  /** The last request failed: the page keeps the old data and says it is reconnecting. */
  offline: boolean;
}

export interface LiveSessionController {
  readonly engine: LiveAudioEngine;
  getSnapshot(): LiveSessionSnapshot;
  subscribe(listener: () => void): () => void;
  /** The server clock now, from the device clock and the estimated offset. */
  serverNow(): number;
  /** Ask for a fetch now (a returning tab, the network coming back). */
  refresh(): void;
  start(): void;
  /** Final: stops the timers and the request, and disposes the engine. */
  stop(): void;
}

/** The browser's `fetch`, reduced to a status and a JSON body that may be missing. */
export async function fetchSessionJson(url: string, signal: AbortSignal): Promise<FetchResult> {
  const response = await fetch(url, { cache: "no-store", signal, headers: { Accept: "application/json" } });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/** How long to wait before the next fetch; null means there is nothing more to learn. */
export function pollDelayMs(status: SessionStatus | null, failures: number): number | null {
  if (status === "ended" || status === "cancelled") return null;
  if (failures > 0) return RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length) - 1];
  if (status === "scheduled") return POLL_SCHEDULED_MS;
  if (status === "live") return POLL_LIVE_MS;
  return null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const textOrEmpty = (value: unknown): string => (typeof value === "string" ? value : "");

const textOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

function parseTrack(value: unknown, index: number): SessionTrackView | null {
  if (!isRecord(value)) return null;
  const { trackId, durationSec, available } = value;
  if (typeof trackId !== "number" || !Number.isInteger(trackId) || trackId <= 0) return null;
  if (!isFiniteNumber(durationSec) || durationSec <= 0) return null;
  if (typeof available !== "boolean") return null;
  return {
    position: isFiniteNumber(value.position) ? value.position : index,
    trackId,
    title: textOrEmpty(value.title),
    artistName: textOrNull(value.artistName),
    durationSec,
    startOffsetSec: isFiniteNumber(value.startOffsetSec) ? value.startOffsetSec : 0,
    grade: isSignedGrade(value.grade) ? value.grade : null,
    available,
  };
}

/**
 * Checks a `GET /api/listening-sessions/:id` body before anything schedules audio from it.
 * One malformed track or time makes the whole response unusable, so a half-understood
 * schedule never plays.
 */
export function parseSessionResponse(
  body: unknown,
  expectedId: number,
): { detail: SessionDetail; serverTime: string } | null {
  if (!isRecord(body) || typeof body.serverTime !== "string" || !isRecord(body.session)) return null;
  const session = body.session;
  if (session.id !== expectedId) return null;
  const status = session.status;
  if (typeof status !== "string" || !(SESSION_STATUSES as readonly string[]).includes(status)) return null;
  const { startsAt, endsAt, gapSeconds } = session;
  if (typeof startsAt !== "string" || typeof endsAt !== "string") return null;
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  if (!isFiniteNumber(gapSeconds) || gapSeconds < 0) return null;
  if (!Array.isArray(session.tracks) || session.tracks.length === 0) return null;

  const tracks: SessionTrackView[] = [];
  for (let index = 0; index < session.tracks.length; index += 1) {
    const track = parseTrack(session.tracks[index], index);
    if (!track) return null;
    tracks.push(track);
  }

  return {
    serverTime: body.serverTime,
    detail: {
      id: expectedId,
      title: textOrEmpty(session.title),
      description: textOrNull(session.description),
      hostName: textOrNull(session.hostName),
      startsAt,
      endsAt,
      status: status as SessionStatus,
      gapSeconds,
      trackCount: tracks.length,
      totalDurationSec: isFiniteNumber(session.totalDurationSec)
        ? session.totalDurationSec
        : Math.round((endMs - startMs) / 1000),
      tracks,
    },
  };
}

const SILENT_PLAN: PlaybackPlan = { kind: "idle", reason: "ended", startsInSec: null };

export function createLiveSessionController(options: {
  sessionId: number;
  fetchJson: FetchJson;
  createAudio: () => EngineAudio;
  recordPlay: (trackId: number) => void;
  /** The device clock; only used for differences and for the offset to the server. */
  nowMs?: () => number;
}): LiveSessionController {
  const { sessionId, fetchJson } = options;
  const nowMs = options.nowMs ?? Date.now;
  const url = `/api/listening-sessions/${sessionId}`;

  let snapshot: LiveSessionSnapshot = { phase: "loading", detail: null, status: null, offline: false };
  const listeners = new Set<() => void>();
  let clockWindow: ClockSample[] = [];
  let offsetMs = 0;
  let failures = 0;
  let inFlight = false;
  let queued = false;
  let started = false;
  let stopped = false;
  /** The session does not exist (or sessions are switched off): there is nothing to poll for. */
  let gone = false;
  let lastFetchAt: number | null = null;
  let abort: AbortController | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let tickTimer: ReturnType<typeof setInterval> | null = null;

  const serverNow = () => serverNowMs(offsetMs, nowMs());

  function currentPlan(): PlaybackPlan {
    const detail = snapshot.detail;
    if (!detail) return SILENT_PLAN;
    const now = serverNow();
    return planPlayback({ status: liveStatus(detail, now), schedule: detail, serverNowMs: now });
  }

  const engine = createLiveAudioEngine({
    sessionId,
    getPlan: currentPlan,
    deps: {
      createAudio: options.createAudio,
      nowMs,
      streamUrl: (trackId) => `/api/music/tracks/${trackId}/stream`,
      recordPlay: options.recordPlay,
    },
  });

  function setSnapshot(patch: Partial<LiveSessionSnapshot>) {
    const next = { ...snapshot, ...patch };
    if (
      next.phase === snapshot.phase &&
      next.detail === snapshot.detail &&
      next.status === snapshot.status &&
      next.offline === snapshot.offline
    ) {
      return;
    }
    snapshot = next;
    for (const listener of [...listeners]) listener();
  }

  function clearPoll() {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function scheduleNext() {
    if (stopped || gone) return;
    const delay = pollDelayMs(snapshot.status, failures);
    if (delay === null) return;
    clearPoll();
    pollTimer = setTimeout(() => {
      pollTimer = null;
      void load();
    }, delay);
  }

  function fail() {
    failures += 1;
    if (!snapshot.detail) {
      setSnapshot({ phase: "error", offline: true });
    } else if (snapshot.status !== "ended" && snapshot.status !== "cancelled") {
      // A finished session has nothing left to learn, so a failed look is not worth a warning.
      setSnapshot({ offline: true });
    }
  }

  function handle(result: FetchResult, sentAtMs: number, receivedAtMs: number) {
    if (result.status === 404) {
      gone = true;
      failures = 0;
      setSnapshot({ phase: "notfound", detail: null, status: null, offline: false });
      return;
    }
    if (result.status !== 200) {
      fail();
      return;
    }
    const parsed = parseSessionResponse(result.body, sessionId);
    if (!parsed) {
      fail();
      return;
    }
    const sample = measureClockSample({ serverTime: parsed.serverTime, sentAtMs, receivedAtMs });
    if (sample) {
      clockWindow = addClockSample(clockWindow, sample);
      offsetMs = pickClockOffset(clockWindow);
    } else if (clockWindow.length === 0) {
      // Without any clock estimate the schedule cannot be placed in time.
      fail();
      return;
    }
    failures = 0;
    // An unchanged session keeps the same object, so the page does not redraw for nothing.
    const detail =
      snapshot.detail && JSON.stringify(snapshot.detail) === JSON.stringify(parsed.detail)
        ? snapshot.detail
        : parsed.detail;
    setSnapshot({ phase: "ready", detail, status: liveStatus(detail, serverNow()), offline: false });
  }

  async function load(): Promise<void> {
    if (stopped) return;
    if (inFlight) {
      queued = true;
      return;
    }
    inFlight = true;
    queued = false;
    clearPoll();
    const request = new AbortController();
    abort = request;
    const sentAtMs = nowMs();
    lastFetchAt = sentAtMs;
    try {
      const result = await fetchJson(url, request.signal);
      if (!stopped) handle(result, sentAtMs, nowMs());
    } catch {
      if (!stopped) fail();
    } finally {
      inFlight = false;
      abort = null;
      if (!stopped) {
        if (queued) {
          queued = false;
          void load();
        } else {
          scheduleNext();
        }
      }
    }
  }

  function onTick() {
    if (stopped) return;
    engine.tick();
    const detail = snapshot.detail;
    if (!detail) return;
    const status = liveStatus(detail, serverNow());
    if (status === snapshot.status) return;
    const previous = snapshot.status;
    setSnapshot({ status });
    if (status === "live" && previous === "scheduled") {
      // The start is the moment a changed schedule or set matters most: look again.
      void load();
    } else if (status === "ended" || status === "cancelled") {
      clearPoll();
    }
  }

  return {
    engine,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    serverNow,
    refresh() {
      if (!started || stopped || gone) return;
      if (snapshot.status === "ended" || snapshot.status === "cancelled") return;
      if (lastFetchAt !== null && nowMs() - lastFetchAt < MIN_REFRESH_GAP_MS) return;
      void load();
    },
    start() {
      if (started || stopped) return;
      started = true;
      tickTimer = setInterval(onTick, TICK_MS);
      void load();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (tickTimer !== null) clearInterval(tickTimer);
      clearPoll();
      abort?.abort();
      engine.dispose();
      listeners.clear();
    },
  };
}

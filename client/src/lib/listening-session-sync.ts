/**
 * Pure sync logic for the live listening-session player. Nothing here touches the
 * DOM, the network or the clock: the hook passes in what it measured and applies
 * the action it gets back. That keeps the rules testable at an exact instant.
 *
 * The server clock decides what everyone hears. The browser estimates how far its
 * own clock is from the server's, then walks the same ordered set the API uses
 * (`computeNowPlaying`), so every listener lands on the same track at the same
 * second without any streaming infrastructure.
 */
import {
  computeNowPlaying,
  type SessionChatMessage,
  type SessionStatus,
  type SessionTrackView,
} from "@shared/listening-session";

/** Re-seek only when the audio is this far from where the schedule says it should be. */
export const DRIFT_RESEEK_SEC = 2;

/** Real playback needed before a track counts as a stream: the 30 s rule of /api/streaming/record-play. */
export const PLAY_CREDIT_SEC = 30;

/** One tick never credits more than this, so a frozen or throttled tab cannot fake listening. */
export const MAX_CREDIT_STEP_MS = 2_000;

/** Messages kept in the chat panel; older ones scroll away. */
export const CHAT_KEEP = 300;

// ─── clock ───────────────────────────────────────────────────────────────

export interface ClockSample {
  offsetMs: number;
  roundTripMs: number;
}

/**
 * One request gives one estimate: the server stamped `serverTime` somewhere between
 * send and receive, so the midpoint is the best guess and the round trip is the error bar.
 */
export function measureClockSample(input: {
  serverTime: string;
  sentAtMs: number;
  receivedAtMs: number;
}): ClockSample | null {
  const server = Date.parse(input.serverTime);
  const roundTripMs = input.receivedAtMs - input.sentAtMs;
  if (!Number.isFinite(server) || !Number.isFinite(roundTripMs) || roundTripMs < 0) return null;
  return { offsetMs: server - (input.sentAtMs + roundTripMs / 2), roundTripMs };
}

/** The sample with the shortest round trip is the most trustworthy. */
export function pickClockOffset(samples: readonly ClockSample[]): number {
  if (samples.length === 0) return 0;
  let best = samples[0];
  for (const sample of samples) {
    if (sample.roundTripMs < best.roundTripMs) best = sample;
  }
  return best.offsetMs;
}

/** Samples kept for the clock estimate. */
export const CLOCK_WINDOW = 8;

/** A reliable sample this far from the estimate means the device clock was changed. */
export const CLOCK_JUMP_MS = 5_000;

/** Past this round trip a sample says too little to be used once there is already an estimate. */
export const CLOCK_MAX_ROUND_TRIP_MS = 5_000;

/** Adds a sample to the sliding window. A sudden jump in the offset drops the old samples. */
export function addClockSample(
  window: readonly ClockSample[],
  sample: ClockSample,
  max: number = CLOCK_WINDOW,
): ClockSample[] {
  if (window.length === 0) return [sample];
  if (sample.roundTripMs > CLOCK_MAX_ROUND_TRIP_MS) return window as ClockSample[];
  if (Math.abs(sample.offsetMs - pickClockOffset(window)) > CLOCK_JUMP_MS) return [sample];
  const next = [...window, sample];
  return next.length > max ? next.slice(next.length - max) : next;
}

export const serverNowMs = (offsetMs: number, clientNowMs: number): number => clientNowMs + offsetMs;

// ─── what should be playing ──────────────────────────────────────────────

export interface SessionSchedule {
  startsAt: string;
  gapSeconds: number;
  tracks: readonly Pick<SessionTrackView, "trackId" | "durationSec" | "available">[];
}

export type PlaybackPlan =
  | { kind: "idle"; reason: "scheduled" | "ended" | "cancelled"; startsInSec: number | null }
  | { kind: "gap"; nextTrackId: number; gapRemainingSec: number }
  | { kind: "unavailable"; index: number; trackId: number; remainingSec: number }
  | {
      kind: "play";
      index: number;
      trackId: number;
      targetSec: number;
      remainingSec: number;
      nextTrackId: number | null;
    };

export function planPlayback(input: {
  status: SessionStatus;
  schedule: SessionSchedule;
  serverNowMs: number;
}): PlaybackPlan {
  if (input.status === "cancelled") return { kind: "idle", reason: "cancelled", startsInSec: null };

  const { schedule } = input;
  const nowPlaying = computeNowPlaying({
    startsAt: schedule.startsAt,
    now: input.serverNowMs,
    tracks: schedule.tracks.map(({ trackId, durationSec }) => ({ trackId, durationSec })),
    gapSec: schedule.gapSeconds,
  });

  switch (nowPlaying.state) {
    case "scheduled":
      return { kind: "idle", reason: "scheduled", startsInSec: nowPlaying.startsInSec };
    case "ended":
      return { kind: "idle", reason: "ended", startsInSec: null };
    case "gap":
      return { kind: "gap", nextTrackId: nowPlaying.nextTrackId, gapRemainingSec: nowPlaying.gapRemainingSec };
    case "playing": {
      const slot = schedule.tracks[nowPlaying.index];
      // A track that was unpublished keeps its slot, so the schedule never moves; it is simply silent.
      if (!slot?.available) {
        return {
          kind: "unavailable",
          index: nowPlaying.index,
          trackId: nowPlaying.trackId,
          remainingSec: nowPlaying.remainingSec,
        };
      }
      return {
        kind: "play",
        index: nowPlaying.index,
        trackId: nowPlaying.trackId,
        targetSec: nowPlaying.offsetSec,
        remainingSec: nowPlaying.remainingSec,
        nextTrackId: nowPlaying.nextTrackId,
      };
    }
  }
}

// ─── what to do with the audio element ───────────────────────────────────

export interface AudioSnapshot {
  /** The track the element currently has loaded, or null when it is empty. */
  trackId: number | null;
  currentTimeSec: number;
  paused: boolean;
  ended: boolean;
  /** Enough data to judge the position (readyState >= 2). */
  ready: boolean;
  /** The loaded track errored; stay silent until the schedule moves on. */
  failed: boolean;
}

export type AudioAction =
  | { type: "none" }
  | { type: "silence" }
  | { type: "load"; trackId: number; startAtSec: number }
  | { type: "seek"; toSec: number }
  | { type: "resume" };

export function reconcileAudio(
  plan: PlaybackPlan,
  audio: AudioSnapshot,
  options: { driftSec?: number } = {},
): AudioAction {
  if (plan.kind !== "play") {
    return audio.trackId === null ? { type: "none" } : { type: "silence" };
  }

  if (audio.trackId !== plan.trackId) {
    return { type: "load", trackId: plan.trackId, startAtSec: plan.targetSec };
  }
  if (audio.failed || audio.ended || !audio.ready) return { type: "none" };

  const drift = Math.abs(audio.currentTimeSec - plan.targetSec);
  if (drift > (options.driftSec ?? DRIFT_RESEEK_SEC)) return { type: "seek", toSec: plan.targetSec };
  if (audio.paused) return { type: "resume" };
  return { type: "none" };
}

// ─── play credit ─────────────────────────────────────────────────────────

export interface PlayCreditTracker {
  /** Returns true exactly once per slot, when it reaches the credit threshold. */
  tick(input: { slotKey: string | null; playing: boolean; elapsedMs: number }): boolean;
}

/**
 * A listener is credited with a stream after `PLAY_CREDIT_SEC` of real playback of one
 * slot of the set, the same bar as a /stream play. Leaving and rejoining keeps the time
 * already heard; moving to another slot starts over.
 */
export function createPlayCreditTracker(
  thresholdMs: number = PLAY_CREDIT_SEC * 1000,
  maxStepMs: number = MAX_CREDIT_STEP_MS,
): PlayCreditTracker {
  let slotKey: string | null = null;
  let heardMs = 0;
  let credited = false;

  return {
    tick(input) {
      if (input.slotKey !== slotKey) {
        slotKey = input.slotKey;
        heardMs = 0;
        credited = false;
      }
      if (slotKey === null || credited || !input.playing) return false;
      if (!Number.isFinite(input.elapsedMs) || input.elapsedMs <= 0) return false;

      heardMs += Math.min(input.elapsedMs, maxStepMs);
      if (heardMs < thresholdMs) return false;
      credited = true;
      return true;
    },
  };
}

export const playSlotKey = (sessionId: number, index: number, trackId: number): string =>
  `${sessionId}:${index}:${trackId}`;

// ─── chat ────────────────────────────────────────────────────────────────

/** Merge a fetched page into what is on screen: no duplicates, oldest first, newest kept. */
export function mergeChatMessages(
  current: readonly SessionChatMessage[],
  incoming: readonly SessionChatMessage[],
  keep: number = CHAT_KEEP,
): SessionChatMessage[] {
  if (incoming.length === 0) return current as SessionChatMessage[];
  const byId = new Map<number, SessionChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  const merged = [...byId.values()].sort((a, b) => a.id - b.id);
  return merged.length > keep ? merged.slice(merged.length - keep) : merged;
}

/** The newest message id on screen, used as the `afterId` cursor of the next poll. */
export function lastChatId(messages: readonly SessionChatMessage[]): number | null {
  return messages.length === 0 ? null : messages[messages.length - 1].id;
}

// ─── display helpers for the current slot ────────────────────────────────

export interface CurrentSlot {
  index: number;
  track: SessionTrackView;
  /** 0 to 1 along the current track. */
  progress: number;
}

export function currentSlot(
  plan: PlaybackPlan,
  tracks: readonly SessionTrackView[],
): CurrentSlot | null {
  if (plan.kind !== "play" && plan.kind !== "unavailable") return null;
  const track = tracks[plan.index];
  if (!track) return null;
  const duration = track.durationSec;
  const elapsed = plan.kind === "play" ? plan.targetSec : duration - plan.remainingSec;
  const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;
  return { index: plan.index, track, progress };
}

/** The track announced as "up next": the one after the current slot, or the one after a gap. */
export function upNextTrack(
  plan: PlaybackPlan,
  tracks: readonly SessionTrackView[],
): SessionTrackView | null {
  if (plan.kind === "gap") return tracks.find((track) => track.trackId === plan.nextTrackId) ?? null;
  if (plan.kind === "play") {
    return plan.nextTrackId === null
      ? null
      : (tracks.slice(plan.index + 1).find((track) => track.trackId === plan.nextTrackId) ?? null);
  }
  if (plan.kind === "unavailable") return tracks[plan.index + 1] ?? null;
  return null;
}

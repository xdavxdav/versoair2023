/**
 * The audio side of a live listening session, with no React in it. One audio element is
 * created when the listener presses Join (inside the click, so the browser allows sound)
 * and is steered on every tick toward whatever the schedule says should be playing now.
 * The browser pieces are injected, so the autoplay, retry, drift and play-credit rules
 * can be tested against a fake element.
 */
import {
  createPlayCreditTracker,
  playSlotKey,
  reconcileAudio,
  type AudioSnapshot,
  type PlaybackPlan,
} from "./listening-session-sync";

/** The part of HTMLAudioElement the engine uses; the real element satisfies it as is. */
export interface EngineAudio {
  src: string;
  currentTime: number;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly readyState: number;
  readonly error: { code: number } | null;
  muted: boolean;
  preload: string;
  play(): Promise<void> | void;
  pause(): void;
  load(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface EngineDeps {
  createAudio: () => EngineAudio;
  /** The device clock in milliseconds; only differences between calls are used. */
  nowMs: () => number;
  streamUrl: (trackId: number) => string;
  /** Called once per slot when the listener has really heard it for the credit time. */
  recordPlay: (trackId: number) => void;
}

export interface EngineState {
  joined: boolean;
  /** Sound is waiting for a tap: the browser blocked autoplay, or the listener paused it. */
  needsTap: boolean;
  muted: boolean;
  /** The current track could not be loaded, even after the retries. */
  failedTrackId: number | null;
}

export interface LiveAudioEngine {
  getState(): EngineState;
  subscribe(listener: () => void): () => void;
  /** Call inside the click handler: creates the element and starts sound in the same gesture. */
  join(): void;
  /** Call inside the tap handler after `needsTap`: rejoins the live position. */
  tap(): void;
  leave(): void;
  /** Steer the element toward the schedule; call about twice a second. */
  tick(): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

/** One first try and three retries per track. */
export const MAX_LOAD_ATTEMPTS = 4;
export const LOAD_RETRY_MS = 4_000;
/** Between two measurements the audio must have moved at least this share of the time that passed. */
export const MIN_ADVANCE_RATIO = 0.5;
/** Ticks closer together than this (the audio events) do not move the credit clock. */
export const MIN_CREDIT_STEP_MS = 200;

const MEDIA_ERR_ABORTED = 1;

interface LoadFailure {
  trackId: number;
  attempts: number;
  lastErrorAt: number;
  /** A reload is in progress; the element has not yet said whether it worked. */
  retrying: boolean;
}

export function createLiveAudioEngine(options: {
  sessionId: number;
  getPlan: () => PlaybackPlan;
  deps: EngineDeps;
}): LiveAudioEngine {
  const { sessionId, getPlan, deps } = options;

  const credit = createPlayCreditTracker();
  const listeners = new Set<() => void>();

  let audio: EngineAudio | null = null;
  let state: EngineState = { joined: false, needsTap: false, muted: false, failedTrackId: null };
  let loadedTrackId: number | null = null;
  let failure: LoadFailure | null = null;
  let lastTickAt: number | null = null;
  let lastTimeSec: number | null = null;
  let playAttempt = 0;
  let stepping = false;
  let disposed = false;

  function setState(patch: Partial<EngineState>) {
    const next = { ...state, ...patch };
    if (
      next.joined === state.joined &&
      next.needsTap === state.needsTap &&
      next.muted === state.muted &&
      next.failedTrackId === state.failedTrackId
    ) {
      return;
    }
    state = next;
    for (const listener of [...listeners]) listener();
  }

  function setFailure(next: LoadFailure | null) {
    failure = next;
    const exhausted = next !== null && !next.retrying && next.attempts >= MAX_LOAD_ATTEMPTS;
    setState({ failedTrackId: exhausted ? next.trackId : null });
  }

  function snapshot(element: EngineAudio): AudioSnapshot {
    return {
      trackId: loadedTrackId,
      currentTimeSec: element.currentTime,
      paused: element.paused,
      ended: element.ended,
      ready: element.readyState >= 2,
      failed: failure !== null && !failure.retrying && failure.trackId === loadedTrackId,
    };
  }

  function startPlayback(element: EngineAudio) {
    const attempt = ++playAttempt;
    let result: Promise<void> | void;
    try {
      result = element.play();
    } catch {
      return;
    }
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch((error: unknown) => {
        // Only the newest attempt decides; an older one was cut off by a new source or a leave.
        if (disposed || attempt !== playAttempt || !state.joined) return;
        if ((error as { name?: string } | null)?.name === "NotAllowedError") setState({ needsTap: true });
      });
    }
  }

  function silence(element: EngineAudio) {
    playAttempt += 1;
    element.pause();
    element.removeAttribute("src");
    element.load();
    loadedTrackId = null;
    setFailure(null);
  }

  function loadTrack(element: EngineAudio, trackId: number, startAtSec: number, mayPlay: boolean) {
    playAttempt += 1;
    element.src = deps.streamUrl(trackId);
    loadedTrackId = trackId;
    if (failure && failure.trackId !== trackId) setFailure(null);
    try {
      element.currentTime = startAtSec;
    } catch {
      // Some browsers refuse until the metadata is in; the drift rule seeks once it is.
    }
    if (mayPlay) startPlayback(element);
  }

  function step(fromGesture: boolean) {
    const element = audio;
    if (!element || !state.joined || disposed || stepping) return;
    stepping = true;
    try {
      const now = deps.nowMs();
      const plan = getPlan();
      let disturbed = false;

      // The credit is judged on what the element did since the last tick, before this tick moves it.
      const sameTrack = plan.kind === "play" && loadedTrackId === plan.trackId;
      const sinceLastTickMs = lastTickAt === null ? null : now - lastTickAt;
      const timeStep = sinceLastTickMs === null || sinceLastTickMs >= MIN_CREDIT_STEP_MS;
      if (timeStep) {
        const advancedMs = lastTimeSec === null ? 0 : (element.currentTime - lastTimeSec) * 1000;
        const playing =
          sameTrack &&
          sinceLastTickMs !== null &&
          !element.paused &&
          !element.ended &&
          element.readyState >= 2 &&
          advancedMs >= sinceLastTickMs * MIN_ADVANCE_RATIO;
        const slotKey = plan.kind === "play" ? playSlotKey(sessionId, plan.index, plan.trackId) : null;
        if (credit.tick({ slotKey, playing, elapsedMs: sinceLastTickMs ?? 0 }) && plan.kind === "play") {
          deps.recordPlay(plan.trackId);
        }
        lastTickAt = now;
      }

      if (fromGesture) {
        setState({ needsTap: false });
        const current = snapshot(element);
        if (plan.kind === "play" && loadedTrackId === plan.trackId && !current.failed && element.paused && !element.ended) {
          startPlayback(element);
        }
      }

      // A failed track is tried again after a pause, a few times, and then left silent.
      if (
        failure &&
        !failure.retrying &&
        plan.kind === "play" &&
        plan.trackId === failure.trackId &&
        loadedTrackId === failure.trackId &&
        failure.attempts < MAX_LOAD_ATTEMPTS &&
        now - failure.lastErrorAt >= LOAD_RETRY_MS
      ) {
        setFailure({ ...failure, retrying: true });
        loadTrack(element, plan.trackId, plan.targetSec, !state.needsTap || fromGesture);
        disturbed = true;
      } else {
        const action = reconcileAudio(plan, snapshot(element));
        const mayAct = !state.needsTap || fromGesture;
        switch (action.type) {
          case "silence":
            silence(element);
            disturbed = true;
            break;
          case "load":
            loadTrack(element, action.trackId, action.startAtSec, mayAct);
            disturbed = true;
            break;
          case "seek":
            if (mayAct) {
              element.currentTime = action.toSec;
              disturbed = true;
            }
            break;
          case "resume":
            if (mayAct) startPlayback(element);
            break;
          case "none":
            break;
        }
      }

      // A seek or a new source breaks the comparison, so the next measurement starts afresh.
      if (disturbed) lastTimeSec = null;
      else if (timeStep) lastTimeSec = loadedTrackId !== null ? element.currentTime : null;
    } finally {
      stepping = false;
    }
  }

  const onSettled = () => {
    // The reload got far enough to read the file, so the earlier failure is over.
    if (failure?.retrying && failure.trackId === loadedTrackId) setFailure(null);
    step(false);
  };

  const onPlaying = () => {
    if (!state.joined) return;
    if (failure && failure.trackId === loadedTrackId) setFailure(null);
    setState({ needsTap: false });
  };

  const onError = () => {
    const element = audio;
    if (!element || !state.joined || loadedTrackId === null) return;
    if (element.error?.code === MEDIA_ERR_ABORTED) return;
    const attempts = failure && failure.trackId === loadedTrackId ? failure.attempts + 1 : 1;
    setFailure({ trackId: loadedTrackId, attempts, lastErrorAt: deps.nowMs(), retrying: false });
  };

  const onPause = () => {
    const element = audio;
    if (!element || !state.joined || loadedTrackId === null) return;
    if (element.ended || !element.paused) return;
    // Not ours: the engine clears the loaded track before it pauses. The listener (headphone
    // button, lock screen) or the system (a call) did this, so wait for a tap instead of fighting it.
    setState({ needsTap: true });
  };

  const handlers: Record<string, () => void> = {
    loadedmetadata: onSettled,
    canplay: onSettled,
    ended: onSettled,
    playing: onPlaying,
    error: onError,
    pause: onPause,
  };

  function ensureAudio(): EngineAudio {
    if (audio) return audio;
    const element = deps.createAudio();
    element.preload = "auto";
    element.muted = state.muted;
    for (const [type, handler] of Object.entries(handlers)) element.addEventListener(type, handler);
    audio = element;
    return element;
  }

  function join() {
    if (disposed) return;
    ensureAudio();
    lastTickAt = null;
    lastTimeSec = null;
    if (!state.joined) setFailure(null);
    setState({ joined: true, needsTap: false });
    step(true);
  }

  function tap() {
    if (disposed) return;
    if (state.joined) step(true);
    else join();
  }

  function leave() {
    if (audio && state.joined) silence(audio);
    lastTickAt = null;
    lastTimeSec = null;
    setState({ joined: false, needsTap: false, failedTrackId: null });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    listeners.clear();
    if (audio) {
      for (const [type, handler] of Object.entries(handlers)) audio.removeEventListener(type, handler);
      silence(audio);
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    join,
    tap,
    leave,
    tick: () => step(false),
    setMuted(muted) {
      if (audio) audio.muted = muted;
      setState({ muted });
    },
    dispose,
  };
}

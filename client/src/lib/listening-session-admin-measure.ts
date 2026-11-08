/**
 * Measures how long each track of a set is by loading only its metadata in a hidden audio
 * element: the browser's own reading of the file is the length a listener will really hear.
 * The parts that touch the browser (the element and the timers) are passed in, so the logic
 * is tested without one.
 */
import { ceilMeasuredDuration } from "./listening-session-admin";

/** The part of HTMLAudioElement the measurer uses; the real element satisfies it as is. */
export interface MeasureAudio {
  src: string;
  preload: string;
  readonly duration: number;
  load(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface MeasureTimers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export type MeasureOutcome = { ok: true; durationSec: number } | { ok: false };

export interface MeasurerOptions {
  createAudio: () => MeasureAudio;
  streamUrl: (trackId: number) => string;
  /** Called once per track that was still wanted when its element settled. */
  onResult: (trackId: number, outcome: MeasureOutcome) => void;
  /** How many elements load at the same time. */
  concurrency?: number;
  /** How long one track may take before it counts as unknown. */
  timeoutMs?: number;
  timers?: MeasureTimers;
}

export interface DurationMeasurer {
  /**
   * Makes these the tracks being measured: new ones are queued, ones no longer listed are
   * dropped and their elements freed. A track already in progress is left alone.
   */
  sync(wanted: readonly number[]): void;
  /** Frees every element and stops reporting. The measurer cannot be used afterwards. */
  dispose(): void;
}

export const MEASURE_CONCURRENCY = 2;
// A track can be slow to answer when the server has to read it from the database first.
export const MEASURE_TIMEOUT_MS = 30_000;

const defaultTimers: MeasureTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

interface Job {
  audio: MeasureAudio;
  timer: unknown;
  onLoaded: () => void;
  onError: () => void;
}

export function createDurationMeasurer(options: MeasurerOptions): DurationMeasurer {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? MEASURE_CONCURRENCY));
  const timeoutMs = options.timeoutMs ?? MEASURE_TIMEOUT_MS;
  const timers = options.timers ?? defaultTimers;
  const queue: number[] = [];
  const active = new Map<number, Job>();
  let disposed = false;

  // Removing the source and loading again is what makes the browser abandon the download.
  function release(job: Job) {
    timers.clear(job.timer);
    job.audio.removeEventListener("loadedmetadata", job.onLoaded);
    job.audio.removeEventListener("error", job.onError);
    job.audio.removeAttribute("src");
    job.audio.load();
  }

  function settle(trackId: number, outcome: MeasureOutcome) {
    const job = active.get(trackId);
    if (!job) return;
    active.delete(trackId);
    release(job);
    try {
      options.onResult(trackId, outcome);
    } finally {
      pump();
    }
  }

  function start(trackId: number) {
    const audio = options.createAudio();
    const job: Job = {
      audio,
      timer: undefined,
      onLoaded: () => {
        const durationSec = ceilMeasuredDuration(audio.duration);
        settle(trackId, durationSec === null ? { ok: false } : { ok: true, durationSec });
      },
      onError: () => settle(trackId, { ok: false }),
    };
    job.timer = timers.set(() => settle(trackId, { ok: false }), timeoutMs);
    active.set(trackId, job);
    audio.addEventListener("loadedmetadata", job.onLoaded);
    audio.addEventListener("error", job.onError);
    audio.preload = "metadata";
    audio.src = options.streamUrl(trackId);
  }

  function pump() {
    while (!disposed && active.size < concurrency) {
      const next = queue.shift();
      if (next === undefined) return;
      start(next);
    }
  }

  return {
    sync(wanted) {
      if (disposed) return;
      const keep = new Set(wanted);
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        if (!keep.has(queue[index])) queue.splice(index, 1);
      }
      for (const [trackId, job] of [...active]) {
        if (keep.has(trackId)) continue;
        active.delete(trackId);
        release(job);
      }
      for (const trackId of keep) {
        if (!active.has(trackId) && !queue.includes(trackId)) queue.push(trackId);
      }
      pump();
    },

    dispose() {
      disposed = true;
      queue.length = 0;
      for (const job of active.values()) release(job);
      active.clear();
    },
  };
}

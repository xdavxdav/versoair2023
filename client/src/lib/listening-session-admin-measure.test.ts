import assert from "node:assert/strict";
import test from "node:test";

import {
  MEASURE_TIMEOUT_MS,
  createDurationMeasurer,
  type MeasureAudio,
  type MeasureOutcome,
  type MeasureTimers,
} from "./listening-session-admin-measure";

class FakeMeasureAudio implements MeasureAudio {
  src = "";
  preload = "";
  duration = Number.NaN;
  loadCalls = 0;
  readonly removedAttributes: string[] = [];
  private readonly handlers = new Map<string, Set<() => void>>();

  load(): void {
    this.loadCalls += 1;
  }
  removeAttribute(name: string): void {
    this.removedAttributes.push(name);
    if (name === "src") this.src = "";
  }
  addEventListener(type: string, listener: () => void): void {
    const set = this.handlers.get(type) ?? new Set<() => void>();
    set.add(listener);
    this.handlers.set(type, set);
  }
  removeEventListener(type: string, listener: () => void): void {
    this.handlers.get(type)?.delete(listener);
  }
  emit(type: string): void {
    for (const listener of [...(this.handlers.get(type) ?? [])]) listener();
  }
  get listenerCount(): number {
    return [...this.handlers.values()].reduce((sum, set) => sum + set.size, 0);
  }
  /** Fully released: no listeners, the source attribute removed, and a load() to abandon the download. */
  get released(): boolean {
    return this.listenerCount === 0 && this.removedAttributes.includes("src") && this.src === "" && this.loadCalls > 0;
  }
}

class FakeTimers implements MeasureTimers {
  private next = 1;
  readonly pending = new Map<number, { callback: () => void; ms: number }>();

  set(callback: () => void, ms: number): unknown {
    const id = this.next++;
    this.pending.set(id, { callback, ms });
    return id;
  }
  clear(handle: unknown): void {
    this.pending.delete(handle as number);
  }
  fireAll(): void {
    const due = [...this.pending.values()];
    this.pending.clear();
    for (const { callback } of due) callback();
  }
}

function setup(options: { concurrency?: number; onResult?: (trackId: number) => void } = {}) {
  const elements: FakeMeasureAudio[] = [];
  const results: Array<[number, MeasureOutcome]> = [];
  const timers = new FakeTimers();
  const measurer = createDurationMeasurer({
    createAudio: () => {
      const audio = new FakeMeasureAudio();
      elements.push(audio);
      return audio;
    },
    streamUrl: (trackId) => `/api/music/tracks/${trackId}/stream`,
    onResult: (trackId, outcome) => {
      results.push([trackId, outcome]);
      options.onResult?.(trackId);
    },
    timers,
    concurrency: options.concurrency,
  });
  return { measurer, elements, results, timers };
}

const finish = (audio: FakeMeasureAudio, duration: number) => {
  audio.duration = duration;
  audio.emit("loadedmetadata");
};

test("a track is measured from its metadata only, and the length is rounded up", () => {
  const { measurer, elements, results, timers } = setup();
  measurer.sync([7]);

  assert.equal(elements.length, 1);
  assert.equal(elements[0].preload, "metadata");
  assert.equal(elements[0].src, "/api/music/tracks/7/stream");
  assert.equal([...timers.pending.values()][0].ms, MEASURE_TIMEOUT_MS);

  finish(elements[0], 184.2);
  assert.deepEqual(results, [[7, { ok: true, durationSec: 185 }]]);
  assert.equal(elements[0].released, true);
  assert.equal(timers.pending.size, 0);
});

test("an element that cannot be read reports the length as unknown and is freed", () => {
  const { measurer, elements, results } = setup();
  measurer.sync([7]);
  elements[0].emit("error");

  assert.deepEqual(results, [[7, { ok: false }]]);
  assert.equal(elements[0].released, true);
});

test("a length that is not a positive finite number counts as unknown", () => {
  for (const duration of [Number.POSITIVE_INFINITY, Number.NaN, 0, -3]) {
    const { measurer, elements, results } = setup();
    measurer.sync([1]);
    finish(elements[0], duration);
    assert.deepEqual(results, [[1, { ok: false }]], `duration ${duration}`);
    assert.equal(elements[0].released, true);
  }
});

test("a track that never answers times out, is freed, and a late event changes nothing", () => {
  const { measurer, elements, results, timers } = setup();
  measurer.sync([7]);
  timers.fireAll();

  assert.deepEqual(results, [[7, { ok: false }]]);
  assert.equal(elements[0].released, true);

  finish(elements[0], 200);
  assert.equal(results.length, 1);
});

test("only a couple of elements load at once, and the next one starts as soon as one finishes", () => {
  const { measurer, elements, results } = setup();
  measurer.sync([1, 2, 3, 4]);
  assert.equal(elements.length, 2);

  finish(elements[0], 60);
  assert.equal(elements.length, 3);
  assert.equal(elements[2].src, "/api/music/tracks/3/stream");

  finish(elements[1], 61);
  assert.equal(elements.length, 4);
  finish(elements[2], 62);
  finish(elements[3], 63);

  assert.deepEqual(
    results.map(([trackId, outcome]) => [trackId, outcome.ok && outcome.durationSec]),
    [
      [1, 60],
      [2, 61],
      [3, 62],
      [4, 63],
    ],
  );
  assert.ok(elements.every((element) => element.released));
});

test("syncing the same tracks again never starts one twice", () => {
  const { measurer, elements } = setup();
  measurer.sync([1, 2, 3]);
  measurer.sync([1, 2, 3]);
  assert.equal(elements.length, 2);

  finish(elements[0], 90);
  measurer.sync([2, 3]);
  assert.equal(elements.length, 3);
  assert.equal(elements[2].src, "/api/music/tracks/3/stream");
});

test("a track that is no longer wanted is dropped, queued or running, without a result", () => {
  const { measurer, elements, results } = setup();
  measurer.sync([1, 2, 3]);
  measurer.sync([2]);

  assert.equal(elements[0].released, true);
  assert.equal(elements[1].released, false);
  assert.equal(elements.length, 2);

  finish(elements[1], 120);
  assert.deepEqual(results, [[2, { ok: true, durationSec: 120 }]]);
  assert.equal(elements.length, 2);

  finish(elements[0], 99);
  assert.equal(results.length, 1);
});

test("disposing frees every element and ignores late events and later requests", () => {
  const { measurer, elements, results, timers } = setup();
  measurer.sync([1, 2, 3]);
  measurer.dispose();

  assert.ok(elements.every((element) => element.released));
  assert.equal(timers.pending.size, 0);

  finish(elements[0], 100);
  elements[1].emit("error");
  assert.deepEqual(results, []);

  measurer.sync([5]);
  assert.equal(elements.length, 2);
});

test("a result handler that throws cannot stall the queue", () => {
  let first = true;
  const { measurer, elements } = setup({
    concurrency: 1,
    onResult: () => {
      if (!first) return;
      first = false;
      throw new Error("handler failed");
    },
  });
  measurer.sync([1, 2]);
  assert.equal(elements.length, 1);

  assert.throws(() => finish(elements[0], 30), /handler failed/);
  assert.equal(elements.length, 2);
  assert.equal(elements[0].released, true);
});

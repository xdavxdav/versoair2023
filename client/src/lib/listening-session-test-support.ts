/** Shared by the listening-session tests only; nothing in the app imports this. */
import type { EngineAudio } from "./listening-session-player";

export const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Behaves like an HTMLAudioElement where it matters: a new source pauses and resets it. */
export class FakeAudio implements EngineAudio {
  readonly currentTimeWrites: number[] = [];
  readonly srcWrites: string[] = [];
  playCalls = 0;
  pauseCalls = 0;
  paused = true;
  ended = false;
  readyState = 0;
  error: { code: number } | null = null;
  muted = false;
  preload = "";
  playOutcome: "ok" | "blocked" | "aborted" = "ok";
  autoReady = true;
  ignoreEarlySeek = false;
  stalled = false;
  private source = "";
  private time = 0;
  private readonly handlers = new Map<string, Set<() => void>>();

  get src(): string {
    return this.source;
  }
  set src(value: string) {
    this.source = value;
    this.srcWrites.push(value);
    this.paused = true;
    this.ended = false;
    this.error = null;
    this.time = 0;
    this.readyState = this.autoReady ? 4 : 0;
  }
  get currentTime(): number {
    return this.time;
  }
  set currentTime(value: number) {
    this.currentTimeWrites.push(value);
    if (this.ignoreEarlySeek && this.readyState < 2) return;
    this.time = value;
  }

  play(): Promise<void> {
    this.playCalls += 1;
    if (this.playOutcome !== "ok") {
      const name = this.playOutcome === "blocked" ? "NotAllowedError" : "AbortError";
      return Promise.reject(Object.assign(new Error(this.playOutcome), { name }));
    }
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }
  load(): void {
    this.readyState = 0;
    this.time = 0;
  }
  removeAttribute(name: string): void {
    if (name === "src") this.source = "";
  }
  addEventListener(type: string, listener: () => void): void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(listener);
    this.handlers.set(type, set);
  }
  removeEventListener(type: string, listener: () => void): void {
    this.handlers.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const handler of [...(this.handlers.get(type) ?? [])]) handler();
  }
  listenerCount(): number {
    let total = 0;
    for (const set of this.handlers.values()) total += set.size;
    return total;
  }
  tickTime(seconds: number): void {
    this.time += seconds;
  }
  finish(): void {
    this.ended = true;
    this.paused = true;
  }
}

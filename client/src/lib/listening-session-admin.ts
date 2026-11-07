/**
 * Pure helpers behind the GeoAdmin listening-sessions form: converting a wall-clock time in
 * a chosen zone to the exact instant, editing the ordered set, and building the request
 * bodies. The component only holds state and calls the API.
 */
import {
  SESSION_LIMITS,
  computeEndsAt,
  normalizeSessionDescription,
  normalizeSessionTitle,
  orderSignedFirst,
  setDurationSec,
  validateSetTracks,
  type AdminSessionDetail,
  type AdminSessionSummary,
  type AdminTrackOption,
  type SessionTrackView,
  type SetTrack,
  type SignedGrade,
} from "@shared/listening-session";

// ─── time zones ──────────────────────────────────────────────────────────

export const DEFAULT_ADMIN_TIME_ZONE = "America/Toronto";

export const ADMIN_TIME_ZONES: readonly { value: string; label: string }[] = [
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Denver", label: "Denver" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "America/Halifax", label: "Halifax" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Brussels", label: "Brussels" },
  { value: "Africa/Abidjan", label: "Abidjan" },
  { value: "Africa/Dakar", label: "Dakar" },
  { value: "Africa/Lagos", label: "Lagos" },
  { value: "Africa/Casablanca", label: "Casablanca" },
  { value: "UTC", label: "UTC" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// Building a formatter is far slower than using one, and the form asks on every keystroke.
// An unknown zone throws before anything is cached.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function wallClock(timeZone: string, instantMs: number): WallClock {
  const parts = formatterFor(timeZone).formatToParts(instantMs);
  const part = (type: string): number => Number(parts.find((item) => item.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

/** How far the zone's wall clock is ahead of UTC at an instant (negative west of Greenwich). */
function zoneOffsetMs(timeZone: string, instantMs: number): number {
  const wall = wallClock(timeZone, instantMs);
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return wallAsUtc - Math.floor(instantMs / 1000) * 1000;
}

export type ZonedTimeResult =
  | { ok: true; iso: string; ms: number }
  | { ok: false; reason: "invalid" | "invalid_zone" | "nonexistent" | "ambiguous" };

/**
 * `2026-11-08T15:00` on a Toronto wall clock is `2026-11-08T20:00:00.000Z`. A time that does
 * not exist (clocks jumped forward) or happens twice (clocks went back) is refused rather
 * than guessed, so a session can never start an hour from where the owner meant.
 */
export function zonedTimeToUtc(local: string, timeZone: string): ZonedTimeResult {
  const match = LOCAL_TIME.exec(local);
  if (!match) return { ok: false, reason: "invalid" };
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(naive);
  if (
    year < 2000 ||
    year > 2100 ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return { ok: false, reason: "invalid" };
  }

  let offsets: Set<number>;
  try {
    offsets = new Set([zoneOffsetMs(timeZone, naive - DAY_MS), zoneOffsetMs(timeZone, naive + DAY_MS)]);
  } catch {
    return { ok: false, reason: "invalid_zone" };
  }

  const candidates = new Set<number>();
  for (const offset of offsets) {
    const candidate = naive - offset;
    if (zoneOffsetMs(timeZone, candidate) === offset) candidates.add(candidate);
  }
  if (candidates.size === 0) return { ok: false, reason: "nonexistent" };
  if (candidates.size > 1) return { ok: false, reason: "ambiguous" };
  const [ms] = [...candidates];
  return { ok: true, ms, iso: new Date(ms).toISOString() };
}

/** The wall-clock text for a `datetime-local` input: `2026-11-08T15:00`. */
export function utcToZonedInput(iso: string, timeZone: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const wall = wallClock(timeZone, ms);
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  return `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

/** The next whole minute at least `minutes` from now, as wall-clock text, for the quick-test button. */
export function startInMinutes(nowMs: number, minutes: number, timeZone: string): string {
  const target = Math.ceil((nowMs + minutes * 60_000) / 60_000) * 60_000;
  return utcToZonedInput(new Date(target).toISOString(), timeZone);
}

export const ZONED_TIME_MESSAGES: Record<Extract<ZonedTimeResult, { ok: false }>["reason"], string> = {
  invalid: "Pick a date and a time.",
  invalid_zone: "That time zone is not recognised.",
  nonexistent: "That time does not exist in this zone (the clocks jump forward). Pick another time.",
  ambiguous: "That time happens twice in this zone (the clocks go back). Pick another time.",
};

// ─── the set ─────────────────────────────────────────────────────────────

/** One slot of the set while it is being built. `durationSec` stays null until it is measured. */
export interface SetRow {
  trackId: number;
  title: string;
  artistName: string | null;
  grade: SignedGrade | null;
  durationSec: number | null;
  /** False for a track that was unpublished after the set was saved. */
  available: boolean;
}

export const rowFromOption = (option: AdminTrackOption, durationSec: number | null = null): SetRow => ({
  trackId: option.id,
  title: option.title,
  artistName: option.artistName,
  grade: option.grade,
  durationSec,
  available: true,
});

export const rowFromView = (track: SessionTrackView): SetRow => ({
  trackId: track.trackId,
  title: track.title,
  artistName: track.artistName,
  grade: track.grade,
  durationSec: track.durationSec,
  available: track.available,
});

/**
 * A browser-measured length, rounded up: a track that is a fraction longer than its slot
 * would be cut off, while a fraction of silence before the next one is harmless.
 */
export function ceilMeasuredDuration(rawSeconds: number): number | null {
  return Number.isFinite(rawSeconds) && rawSeconds > 0 ? Math.ceil(rawSeconds) : null;
}

export type AddTrackResult =
  | { ok: true; rows: SetRow[] }
  | { ok: false; reason: "duplicate" | "full" };

export function addTrack(rows: readonly SetRow[], row: SetRow): AddTrackResult {
  if (rows.some((existing) => existing.trackId === row.trackId)) return { ok: false, reason: "duplicate" };
  if (rows.length >= SESSION_LIMITS.maxTracks) return { ok: false, reason: "full" };
  return { ok: true, rows: [...rows, row] };
}

export const removeTrack = (rows: readonly SetRow[], trackId: number): SetRow[] =>
  rows.filter((row) => row.trackId !== trackId);

/** Moves one row a step up (-1) or down (+1); at either end the same array comes back. */
export function moveTrack(rows: readonly SetRow[], index: number, direction: -1 | 1): readonly SetRow[] {
  const target = index + direction;
  if (!Number.isInteger(index) || index < 0 || index >= rows.length || target < 0 || target >= rows.length) {
    return rows;
  }
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const setRowDuration = (rows: readonly SetRow[], trackId: number, durationSec: number | null): SetRow[] =>
  rows.map((row) => (row.trackId === trackId ? { ...row, durationSec } : row));

/** S, A, B, C, then regular artists, each group keeping its order. */
export const signedFirst = (rows: readonly SetRow[]): SetRow[] => orderSignedFirst(rows);

export interface SetSummary {
  count: number;
  signed: number;
  regular: number;
  unmeasured: number;
  unavailable: number;
  /** Null while any length is still unknown. */
  totalSec: number | null;
}

export function summarizeSet(rows: readonly SetRow[], gapSeconds: number): SetSummary {
  const unmeasured = rows.filter((row) => row.durationSec === null).length;
  const signed = rows.filter((row) => row.grade !== null).length;
  return {
    count: rows.length,
    signed,
    regular: rows.length - signed,
    unmeasured,
    unavailable: rows.filter((row) => !row.available).length,
    totalSec:
      rows.length === 0 || unmeasured > 0
        ? null
        : setDurationSec(
            rows.map((row) => ({ trackId: row.trackId, durationSec: row.durationSec as number })),
            gapSeconds,
          ),
  };
}

/** When the set would end, from the start and the lengths measured so far; null until all are known. */
export function previewEndsAt(
  startsAtIso: string | null,
  rows: readonly SetRow[],
  gapSeconds: number,
): string | null {
  if (!startsAtIso || rows.length === 0 || rows.some((row) => row.durationSec === null)) return null;
  const tracks = rows.map((row) => ({ trackId: row.trackId, durationSec: row.durationSec as number }));
  return computeEndsAt(startsAtIso, tracks, gapSeconds).toISOString();
}

/** Sessions whose time window overlaps the proposed one; cancelled sessions and the one being edited do not count. */
export function findOverlaps<T extends Pick<AdminSessionSummary, "id" | "startsAt" | "endsAt" | "status">>(
  startMs: number,
  endMs: number,
  sessions: readonly T[],
  excludeId?: number,
): T[] {
  return sessions.filter(
    (session) =>
      session.id !== excludeId &&
      session.status !== "cancelled" &&
      Date.parse(session.startsAt) < endMs &&
      startMs < Date.parse(session.endsAt),
  );
}

// ─── the form and its request bodies ─────────────────────────────────────

export interface SessionDraft {
  title: string;
  description: string;
  /** Null keeps the signed-in admin as the host (create) or leaves the host unchanged (edit). */
  hostUserId: number | null;
  /** Wall-clock text from a `datetime-local` input. */
  localStart: string;
  timeZone: string;
  gapSeconds: number;
  rows: readonly SetRow[];
}

export interface DraftIssue {
  field: "title" | "description" | "start" | "gap" | "set";
  message: string;
}

export type BuildResult<T> = { ok: true; payload: T } | { ok: false; issues: DraftIssue[] };

export interface CreatePayload {
  title: string;
  description?: string;
  hostUserId?: number;
  startsAt: string;
  gapSeconds: number;
  tracks: SetTrack[];
}

export type UpdatePayload = Partial<Omit<CreatePayload, "description">> & { description?: string };

/** The server allows a start up to a minute in the past and at most this far ahead. */
export const START_GRACE_MS = 60_000;
export const MAX_START_AHEAD_MS = 366 * DAY_MS;

export const emptyDraft = (timeZone: string = DEFAULT_ADMIN_TIME_ZONE): SessionDraft => ({
  title: "",
  description: "",
  hostUserId: null,
  localStart: "",
  timeZone,
  gapSeconds: 15,
  rows: [],
});

export const draftFromSession = (session: AdminSessionDetail, timeZone: string): SessionDraft => ({
  title: session.title,
  description: session.description ?? "",
  hostUserId: session.hostUserId,
  localStart: utcToZonedInput(session.startsAt, timeZone),
  timeZone,
  gapSeconds: session.gapSeconds,
  rows: session.tracks.map(rowFromView),
});

function checkText(draft: SessionDraft, issues: DraftIssue[]) {
  const title = normalizeSessionTitle(draft.title);
  if (!title) issues.push({ field: "title", message: "A title is required." });
  else if (title.length > SESSION_LIMITS.titleMax) {
    issues.push({ field: "title", message: `The title can have at most ${SESSION_LIMITS.titleMax} characters.` });
  }
  const description = normalizeSessionDescription(draft.description);
  if (description.length > SESSION_LIMITS.descriptionMax) {
    issues.push({
      field: "description",
      message: `The description can have at most ${SESSION_LIMITS.descriptionMax} characters.`,
    });
  }
  return { title, description };
}

function checkStart(draft: SessionDraft, nowMs: number, issues: DraftIssue[]): { iso: string; ms: number } | null {
  const start = zonedTimeToUtc(draft.localStart, draft.timeZone);
  if (!start.ok) {
    issues.push({ field: "start", message: ZONED_TIME_MESSAGES[start.reason] });
    return null;
  }
  if (start.ms < nowMs - START_GRACE_MS) {
    issues.push({ field: "start", message: "That start time is already in the past." });
    return null;
  }
  if (start.ms > nowMs + MAX_START_AHEAD_MS) {
    issues.push({ field: "start", message: "That start time is more than a year away." });
    return null;
  }
  return start;
}

function checkGap(draft: SessionDraft, issues: DraftIssue[]): boolean {
  if (
    !Number.isInteger(draft.gapSeconds) ||
    draft.gapSeconds < 0 ||
    draft.gapSeconds > SESSION_LIMITS.gapSecondsMax
  ) {
    issues.push({
      field: "gap",
      message: `The pause between tracks must be a whole number from 0 to ${SESSION_LIMITS.gapSecondsMax} seconds.`,
    });
    return false;
  }
  return true;
}

function checkSet(rows: readonly SetRow[], issues: DraftIssue[]): SetTrack[] | null {
  const unmeasured = rows.filter((row) => row.durationSec === null).length;
  if (unmeasured > 0) {
    issues.push({
      field: "set",
      message: `${unmeasured} track${unmeasured === 1 ? " has" : "s have"} no measured length yet.`,
    });
    return null;
  }
  const unavailable = rows.filter((row) => !row.available).length;
  if (unavailable > 0) {
    issues.push({
      field: "set",
      message: `${unavailable} track${unavailable === 1 ? " is" : "s are"} no longer published. Replace ${unavailable === 1 ? "it" : "them"} first.`,
    });
    return null;
  }
  const result = validateSetTracks(
    rows.map((row) => ({ trackId: row.trackId, durationSec: row.durationSec })),
  );
  if (!result.ok) {
    issues.push({ field: "set", message: result.message });
    return null;
  }
  return result.tracks;
}

export function buildCreatePayload(draft: SessionDraft, options: { nowMs: number }): BuildResult<CreatePayload> {
  const issues: DraftIssue[] = [];
  const { title, description } = checkText(draft, issues);
  const start = checkStart(draft, options.nowMs, issues);
  const gapOk = checkGap(draft, issues);
  const tracks = checkSet(draft.rows, issues);
  if (issues.length > 0 || !start || !gapOk || !tracks) return { ok: false, issues };

  return {
    ok: true,
    payload: {
      title,
      ...(description ? { description } : {}),
      ...(draft.hostUserId !== null ? { hostUserId: draft.hostUserId } : {}),
      startsAt: start.iso,
      gapSeconds: draft.gapSeconds,
      tracks,
    },
  };
}

/** Only a session that has not started can have its time, gap or set changed. */
export const isScheduleLocked = (status: AdminSessionDetail["status"]): boolean => status !== "scheduled";

/**
 * The patch for an edit: only what changed. The set is sent only when the set itself was
 * edited, because the server re-checks that every track is still published whenever one is sent.
 * Once the session has started only the title, description and host can change.
 */
export function buildUpdatePayload(
  original: Pick<
    AdminSessionDetail,
    "title" | "description" | "hostUserId" | "startsAt" | "gapSeconds" | "status"
  >,
  draft: SessionDraft,
  options: { nowMs: number; setEdited: boolean },
): BuildResult<UpdatePayload> {
  if (original.status === "cancelled") {
    return { ok: false, issues: [{ field: "title", message: "A cancelled session cannot be edited." }] };
  }

  const issues: DraftIssue[] = [];
  const { title, description } = checkText(draft, issues);
  const payload: UpdatePayload = {};

  if (title && title !== original.title) payload.title = title;
  if (description !== (original.description ?? "")) payload.description = description;
  if (draft.hostUserId !== null && draft.hostUserId !== original.hostUserId) payload.hostUserId = draft.hostUserId;

  if (!isScheduleLocked(original.status)) {
    const originalMinute = Math.floor(Date.parse(original.startsAt) / 60_000);
    const start = zonedTimeToUtc(draft.localStart, draft.timeZone);
    if (!start.ok) {
      issues.push({ field: "start", message: ZONED_TIME_MESSAGES[start.reason] });
    } else if (Math.floor(start.ms / 60_000) !== originalMinute) {
      if (start.ms < options.nowMs - START_GRACE_MS) {
        issues.push({ field: "start", message: "That start time is already in the past." });
      } else if (start.ms > options.nowMs + MAX_START_AHEAD_MS) {
        issues.push({ field: "start", message: "That start time is more than a year away." });
      } else {
        payload.startsAt = start.iso;
      }
    }

    if (checkGap(draft, issues) && draft.gapSeconds !== original.gapSeconds) payload.gapSeconds = draft.gapSeconds;

    if (options.setEdited) {
      const tracks = checkSet(draft.rows, issues);
      if (tracks) payload.tracks = tracks;
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, payload };
}

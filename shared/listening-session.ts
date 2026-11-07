/**
 * Pure rules for listening sessions. The API and the browser import this same
 * file, so both compute the same answer. Nothing here reads the clock: callers
 * pass `now`, which keeps every rule testable at an exact instant.
 *
 * All schedule arithmetic is done in whole milliseconds so a boundary can never
 * be missed by floating-point error.
 */

export const SESSION_STATUSES = ["scheduled", "live", "ended", "cancelled"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_LIMITS = {
  titleMax: 160,
  descriptionMax: 2000,
  maxTracks: 60,
  trackSecondsMax: 60 * 60,
  gapSecondsMax: 300,
  totalSecondsMax: 6 * 60 * 60,
} as const;

export interface SetTrack {
  trackId: number;
  durationSec: number;
}

export type TimeInput = Date | string | number;

export function toMs(value: TimeInput): number {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError("Invalid time value");
  return ms;
}

// A zero, negative or non-finite length counts as nothing, so bad data can
// never produce NaN or a loop that does not advance.
const trackMs = (track: SetTrack): number =>
  Number.isFinite(track.durationSec) && track.durationSec > 0
    ? Math.round(track.durationSec * 1000)
    : 0;

const gapMs = (gapSec: number): number =>
  Number.isFinite(gapSec) && gapSec > 0 ? Math.round(gapSec * 1000) : 0;

function setDurationMs(tracks: readonly SetTrack[], gapSec: number): number {
  if (tracks.length === 0) return 0;
  let total = 0;
  for (const track of tracks) total += trackMs(track);
  return total + gapMs(gapSec) * (tracks.length - 1);
}

/** Total length of a set: every track plus the silence between tracks. */
export function setDurationSec(tracks: readonly SetTrack[], gapSec: number): number {
  return setDurationMs(tracks, gapSec) / 1000;
}

/** `ends_at = starts_at + sum of track lengths + gap x (tracks - 1)`. */
export function computeEndsAt(
  startsAt: TimeInput,
  tracks: readonly SetTrack[],
  gapSec: number,
): Date {
  return new Date(toMs(startsAt) + setDurationMs(tracks, gapSec));
}

/** Seconds from the session start at which each track begins. */
export function trackStartOffsetsSec(
  tracks: readonly SetTrack[],
  gapSec: number,
): number[] {
  const gap = gapMs(gapSec);
  const offsets: number[] = [];
  let cursor = 0;
  tracks.forEach((track, index) => {
    offsets.push(cursor / 1000);
    cursor += trackMs(track);
    if (index < tracks.length - 1) cursor += gap;
  });
  return offsets;
}

/** The server clock decides. A cancelled session stays cancelled whatever the time. */
export function deriveStatus(input: {
  storedStatus?: string | null;
  startsAt: TimeInput;
  endsAt: TimeInput;
  now: TimeInput;
}): SessionStatus {
  if (input.storedStatus === "cancelled") return "cancelled";
  const now = toMs(input.now);
  if (now < toMs(input.startsAt)) return "scheduled";
  if (now < toMs(input.endsAt)) return "live";
  return "ended";
}

export type NowPlaying =
  | { state: "scheduled"; startsInSec: number }
  | {
      state: "playing";
      index: number;
      trackId: number;
      offsetSec: number;
      remainingSec: number;
      nextTrackId: number | null;
    }
  | {
      state: "gap";
      afterIndex: number;
      gapRemainingSec: number;
      nextTrackId: number;
    }
  | { state: "ended" };

function nextPlayableTrackId(tracks: readonly SetTrack[], after: number): number | null {
  for (let i = after + 1; i < tracks.length; i++) {
    if (trackMs(tracks[i]) > 0) return tracks[i].trackId;
  }
  return null;
}

/**
 * What everyone should be hearing at `now`: elapsed time since `startsAt`, walked
 * along the ordered set. A track starts at its own offset, so a listener who joins
 * late is placed `offsetSec` into the current track.
 */
export function computeNowPlaying(input: {
  startsAt: TimeInput;
  now: TimeInput;
  tracks: readonly SetTrack[];
  gapSec: number;
}): NowPlaying {
  const elapsedMs = toMs(input.now) - toMs(input.startsAt);
  if (elapsedMs < 0) {
    return { state: "scheduled", startsInSec: Math.ceil(-elapsedMs / 1000) };
  }

  const { tracks } = input;
  const gap = gapMs(input.gapSec);
  const lastIndex = tracks.length - 1;
  let cursor = 0;

  for (let index = 0; index <= lastIndex; index++) {
    const end = cursor + trackMs(tracks[index]);
    if (elapsedMs < end) {
      return {
        state: "playing",
        index,
        trackId: tracks[index].trackId,
        offsetSec: (elapsedMs - cursor) / 1000,
        remainingSec: (end - elapsedMs) / 1000,
        nextTrackId: nextPlayableTrackId(tracks, index),
      };
    }
    cursor = end;

    if (index < lastIndex && gap > 0) {
      const gapEnd = cursor + gap;
      if (elapsedMs < gapEnd) {
        const nextTrackId = nextPlayableTrackId(tracks, index);
        if (nextTrackId === null) return { state: "ended" };
        return {
          state: "gap",
          afterIndex: index,
          gapRemainingSec: (gapEnd - elapsedMs) / 1000,
          nextTrackId,
        };
      }
      cursor = gapEnd;
    }
  }

  return { state: "ended" };
}

export type SetValidation =
  | { ok: true; tracks: SetTrack[] }
  | { ok: false; code: string; message: string };

const invalidSet = (code: string, message: string): SetValidation => ({
  ok: false,
  code,
  message,
});

/** Checks a set before it is stored: sizes, ids, lengths, no repeats, a sane total. */
export function validateSetTracks(input: unknown): SetValidation {
  if (!Array.isArray(input) || input.length === 0) {
    return invalidSet("set_empty", "Add at least one track to the set.");
  }
  if (input.length > SESSION_LIMITS.maxTracks) {
    return invalidSet(
      "set_too_many_tracks",
      `A set can hold at most ${SESSION_LIMITS.maxTracks} tracks.`,
    );
  }

  const seen = new Set<number>();
  const tracks: SetTrack[] = [];
  let total = 0;
  for (const item of input) {
    const trackId = (item as { trackId?: unknown } | null)?.trackId;
    const durationSec = (item as { durationSec?: unknown } | null)?.durationSec;
    if (typeof trackId !== "number" || !Number.isSafeInteger(trackId) || trackId <= 0) {
      return invalidSet("track_id_invalid", "Every track needs a valid id.");
    }
    if (
      typeof durationSec !== "number" ||
      !Number.isInteger(durationSec) ||
      durationSec < 1 ||
      durationSec > SESSION_LIMITS.trackSecondsMax
    ) {
      return invalidSet(
        "track_duration_invalid",
        "Every track needs a length between 1 second and 1 hour.",
      );
    }
    if (seen.has(trackId)) {
      return invalidSet("track_duplicate", "A track can appear only once in a set.");
    }
    seen.add(trackId);
    tracks.push({ trackId, durationSec });
    total += durationSec;
  }

  if (total > SESSION_LIMITS.totalSecondsMax) {
    return invalidSet("set_too_long", "A set can run for at most 6 hours.");
  }
  return { ok: true, tracks };
}

export function isValidGapSeconds(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= SESSION_LIMITS.gapSecondsMax
  );
}

// Control characters (a NUL would make Postgres reject the insert), bidirectional
// overrides and zero-width marks. Tab, line feed and carriage return are handled
// by the callers because their treatment differs.
const INVISIBLE_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

/** A title is one clean line: no control characters, runs of spaces collapsed. */
export function normalizeSessionTitle(value: string): string {
  return value
    .replace(/[\t\n\r\v\f\u2028\u2029]+/g, " ")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A description keeps its line breaks (at most one blank line in a row). */
export function normalizeSessionDescription(value: string): string {
  return value
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(INVISIBLE_CHARACTERS, "")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const SIGNED_GRADES = ["S", "A", "B", "C"] as const;
export type SignedGrade = (typeof SIGNED_GRADES)[number];

export function isSignedGrade(value: unknown): value is SignedGrade {
  return typeof value === "string" && (SIGNED_GRADES as readonly string[]).includes(value);
}

/** "Verso Signed . S" for a contracted artist; `null` for a regular artist. */
export function formatSignedBadge(grade: SignedGrade | null | undefined): string | null {
  return grade ? `Verso Signed \u00b7 ${grade}` : null;
}

/** S, A, B, C, then regular artists. Order inside each group is kept. */
export function orderSignedFirst<T extends { grade: SignedGrade | null }>(
  items: readonly T[],
): T[] {
  const rank = (grade: SignedGrade | null) =>
    grade ? SIGNED_GRADES.indexOf(grade) : SIGNED_GRADES.length;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item.grade) - rank(b.item.grade) || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * What the public API returns. Never an email, a user id or a royalty share.
 * A track that is no longer published keeps its slot (the schedule does not
 * move) but is `available: false` with an empty title and no artist.
 */
export interface SessionTrackView {
  position: number;
  trackId: number;
  title: string;
  artistName: string | null;
  durationSec: number;
  startOffsetSec: number;
  grade: SignedGrade | null;
  available: boolean;
}

export interface SessionSummary {
  id: number;
  title: string;
  description: string | null;
  hostName: string | null;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  gapSeconds: number;
  trackCount: number;
  totalDurationSec: number;
}

export interface SessionDetail extends SessionSummary {
  tracks: SessionTrackView[];
}

export interface SessionChatMessage {
  id: number;
  body: string;
  createdAt: string;
  author: string;
  isHost: boolean;
}

/** `GET /:id/now-playing`. `nowPlaying` is null for a cancelled session. */
export interface NowPlayingResponse {
  serverTime: string;
  sessionId: number;
  status: SessionStatus;
  startsAt: string;
  endsAt: string;
  gapSeconds: number;
  nowPlaying: NowPlaying | null;
}

/** Admin-only extras; the public views never expose who the host account is. */
export interface AdminSessionSummary extends SessionSummary {
  hostUserId: number | null;
  playlistId: number | null;
}

export interface AdminSessionDetail extends SessionDetail {
  hostUserId: number | null;
  playlistId: number | null;
}

/** A published track offered by the set-builder; `grade` null means a regular artist. */
export interface AdminTrackOption {
  id: number;
  title: string;
  artistName: string | null;
  grade: SignedGrade | null;
}

export interface AdminHostOption {
  id: number;
  name: string;
  role: string | null;
}

export interface AdminPlaylistOption {
  id: number;
  name: string;
  trackCount: number;
}

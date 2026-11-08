/**
 * Set-builder helpers that the base admin module does not cover: loading a playlist into the
 * set, typed-in lengths, applying a measured length, and the wording of the messages that
 * explain what happened.
 */
import { SESSION_LIMITS, type AdminTrackOption } from "@shared/listening-session";
import { addTrack, rowFromOption, type AddTrackResult, type SetRow } from "./listening-session-admin";

/** How the set-builder components change the rows: a function of the current rows, never a stale copy. */
export type RowsUpdate = (rows: readonly SetRow[]) => readonly SetRow[];

export type PlaylistMode = "replace" | "append";

export interface PlaylistMerge {
  rows: SetRow[];
  /** Tracks this load put into the set. */
  added: number;
  skippedDuplicates: number;
  skippedFull: number;
}

/**
 * Replacing starts from an empty set but keeps the length of a track that was already
 * measured, so it is not measured twice. Appending keeps the current rows first. A track the
 * set already has is skipped, and so is everything past the size limit.
 */
export function mergePlaylistRows(
  current: readonly SetRow[],
  playlistTracks: readonly AdminTrackOption[],
  mode: PlaylistMode,
): PlaylistMerge {
  const knownLengths = new Map(current.map((row) => [row.trackId, row.durationSec]));
  let rows: SetRow[] = mode === "append" ? [...current] : [];
  let added = 0;
  let skippedDuplicates = 0;
  let skippedFull = 0;

  for (const track of playlistTracks) {
    const keptLength = mode === "replace" ? (knownLengths.get(track.id) ?? null) : null;
    const result = addTrack(rows, rowFromOption(track, keptLength));
    if (result.ok) {
      rows = result.rows;
      added += 1;
    } else if (result.reason === "duplicate") {
      skippedDuplicates += 1;
    } else {
      skippedFull += 1;
    }
  }
  return { rows, added, skippedDuplicates, skippedFull };
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

export function describePlaylistMerge(merge: PlaylistMerge, mode: PlaylistMode, playlistName: string): string {
  const name = playlistName.trim() || "the playlist";
  let lead: string;
  if (merge.added === 0) {
    lead =
      merge.skippedDuplicates + merge.skippedFull === 0
        ? `"${name}" has no published tracks.`
        : `Nothing was added from "${name}".`;
  } else if (mode === "replace") {
    lead = `The set now has the ${plural(merge.added, "track")} of "${name}".`;
  } else {
    lead = `Added ${plural(merge.added, "track")} from "${name}".`;
  }
  const notes: string[] = [];
  if (merge.skippedDuplicates > 0) notes.push(`${plural(merge.skippedDuplicates, "duplicate")} skipped`);
  if (merge.skippedFull > 0) {
    notes.push(
      `${plural(merge.skippedFull, "track")} left out because a set holds at most ${SESSION_LIMITS.maxTracks} tracks`,
    );
  }
  return notes.length > 0 ? `${lead} ${notes.join("; ")}.` : lead;
}

export function describeAddFailure(reason: Extract<AddTrackResult, { ok: false }>["reason"], title: string): string {
  return reason === "duplicate"
    ? `"${title}" is already in the set.`
    : `The set is full: it holds at most ${SESSION_LIMITS.maxTracks} tracks.`;
}

export type ManualSeconds = { ok: true; seconds: number } | { ok: false; message: string };

/** A length typed in by hand, in whole seconds, within what one slot of a set can hold. */
export function parseManualSeconds(text: string): ManualSeconds {
  const trimmed = text.trim();
  const message = `Enter the length in whole seconds, from 1 to ${SESSION_LIMITS.trackSecondsMax}.`;
  if (!/^\d{1,5}$/.test(trimmed)) return { ok: false, message };
  const seconds = Number(trimmed);
  return seconds >= 1 && seconds <= SESSION_LIMITS.trackSecondsMax ? { ok: true, seconds } : { ok: false, message };
}

/** A measured length fills a slot that is still unknown, and never overwrites one typed in meanwhile. */
export const applyMeasuredDuration = (rows: readonly SetRow[], trackId: number, durationSec: number): SetRow[] =>
  rows.map((row) => (row.trackId === trackId && row.durationSec === null ? { ...row, durationSec } : row));

/** The tracks that still need a measured length and have not failed to give one. */
export const unmeasuredTrackIds = (rows: readonly SetRow[], failed: ReadonlySet<number>): number[] =>
  rows.filter((row) => row.durationSec === null && !failed.has(row.trackId)).map((row) => row.trackId);

/**
 * Forgets the failure mark of a track that left the set or got a length, so adding it
 * again measures it again. The same set comes back when nothing changed.
 */
export function pruneFailed(failed: ReadonlySet<number>, rows: readonly SetRow[]): ReadonlySet<number> {
  const stillUnknown = new Set(rows.filter((row) => row.durationSec === null).map((row) => row.trackId));
  const kept = [...failed].filter((trackId) => stillUnknown.has(trackId));
  return kept.length === failed.size ? failed : new Set(kept);
}

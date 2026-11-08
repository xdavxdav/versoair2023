import assert from "node:assert/strict";
import test from "node:test";

import { SESSION_LIMITS, type AdminTrackOption, type SignedGrade } from "@shared/listening-session";

import type { SetRow } from "./listening-session-admin";
import {
  applyMeasuredDuration,
  describeAddFailure,
  describePlaylistMerge,
  mergePlaylistRows,
  parseManualSeconds,
  pruneFailed,
  unmeasuredTrackIds,
} from "./listening-session-admin-set";

const row = (trackId: number, over: Partial<SetRow> = {}): SetRow => ({
  trackId,
  title: `Track ${trackId}`,
  artistName: `Artist ${trackId}`,
  grade: null,
  durationSec: 180,
  available: true,
  ...over,
});

const option = (id: number, grade: SignedGrade | null = null): AdminTrackOption => ({
  id,
  title: `Track ${id}`,
  artistName: `Artist ${id}`,
  grade,
});

const ids = (rows: readonly SetRow[]) => rows.map((entry) => entry.trackId);

test("replacing a set takes the playlist's order and keeps lengths that were already measured", () => {
  const current = [row(1, { durationSec: 200 }), row(2, { durationSec: null }), row(3, { durationSec: 150 })];
  const merge = mergePlaylistRows(current, [option(3), option(9, "A"), option(1)], "replace");

  assert.deepEqual(ids(merge.rows), [3, 9, 1]);
  assert.deepEqual(
    merge.rows.map((entry) => entry.durationSec),
    [150, null, 200],
  );
  assert.equal(merge.rows[1].grade, "A");
  assert.deepEqual(
    { added: merge.added, skippedDuplicates: merge.skippedDuplicates, skippedFull: merge.skippedFull },
    { added: 3, skippedDuplicates: 0, skippedFull: 0 },
  );
});

test("appending keeps the current set first and skips what it already has", () => {
  const current = [row(1), row(2)];
  const merge = mergePlaylistRows(current, [option(2), option(5), option(1), option(6)], "append");

  assert.deepEqual(ids(merge.rows), [1, 2, 5, 6]);
  assert.equal(merge.rows[0], current[0]);
  assert.equal(merge.rows[2].durationSec, null);
  assert.deepEqual(
    { added: merge.added, skippedDuplicates: merge.skippedDuplicates, skippedFull: merge.skippedFull },
    { added: 2, skippedDuplicates: 2, skippedFull: 0 },
  );
});

test("a track repeated inside the playlist is added once", () => {
  const merge = mergePlaylistRows([], [option(4), option(4), option(5)], "replace");
  assert.deepEqual(ids(merge.rows), [4, 5]);
  assert.equal(merge.skippedDuplicates, 1);
});

test("a set never grows past its size limit, and the rest is counted", () => {
  const current = Array.from({ length: SESSION_LIMITS.maxTracks - 1 }, (_, index) => row(index + 1));
  const appended = mergePlaylistRows(current, [option(1000), option(1001), option(1002)], "append");
  assert.equal(appended.rows.length, SESSION_LIMITS.maxTracks);
  assert.equal(appended.added, 1);
  assert.equal(appended.skippedFull, 2);

  const playlist = Array.from({ length: SESSION_LIMITS.maxTracks + 2 }, (_, index) => option(index + 1));
  const replaced = mergePlaylistRows([], playlist, "replace");
  assert.equal(replaced.rows.length, SESSION_LIMITS.maxTracks);
  assert.equal(replaced.skippedFull, 2);
});

test("the playlist message says what was added and what was left out", () => {
  const replace = mergePlaylistRows([row(1)], [option(5), option(6)], "replace");
  assert.equal(describePlaylistMerge(replace, "replace", "Warm up"), 'The set now has the 2 tracks of "Warm up".');

  const single = mergePlaylistRows([], [option(5)], "replace");
  assert.equal(describePlaylistMerge(single, "replace", "Warm up"), 'The set now has the 1 track of "Warm up".');

  const append = mergePlaylistRows([row(1)], [option(1), option(7)], "append");
  assert.equal(describePlaylistMerge(append, "append", " Warm up "), 'Added 1 track from "Warm up". 1 duplicate skipped.');

  const nothing = mergePlaylistRows([row(1)], [option(1)], "append");
  assert.equal(describePlaylistMerge(nothing, "append", "Warm up"), 'Nothing was added from "Warm up". 1 duplicate skipped.');

  const empty = mergePlaylistRows([row(1)], [], "append");
  assert.equal(describePlaylistMerge(empty, "append", ""), '"the playlist" has no published tracks.');

  const full = mergePlaylistRows(
    Array.from({ length: SESSION_LIMITS.maxTracks }, (_, index) => row(index + 1)),
    [option(900)],
    "append",
  );
  assert.match(describePlaylistMerge(full, "append", "Big"), /1 track left out because a set holds at most 60 tracks\.$/);
});

test("adding a track that cannot be added explains why", () => {
  assert.equal(describeAddFailure("duplicate", "Sunrise"), '"Sunrise" is already in the set.');
  assert.equal(describeAddFailure("full", "Sunrise"), `The set is full: it holds at most ${SESSION_LIMITS.maxTracks} tracks.`);
});

test("a typed length is whole seconds between one second and the slot limit", () => {
  assert.deepEqual(parseManualSeconds("185"), { ok: true, seconds: 185 });
  assert.deepEqual(parseManualSeconds("  90 "), { ok: true, seconds: 90 });
  assert.deepEqual(parseManualSeconds("1"), { ok: true, seconds: 1 });
  assert.deepEqual(parseManualSeconds(String(SESSION_LIMITS.trackSecondsMax)), {
    ok: true,
    seconds: SESSION_LIMITS.trackSecondsMax,
  });

  for (const bad of ["", " ", "0", "00", "3601", "1.5", "-5", "3:05", "abc", "12s", "１２３", "123456"]) {
    assert.equal(parseManualSeconds(bad).ok, false, `"${bad}" should be refused`);
  }
  assert.match((parseManualSeconds("0") as { message: string }).message, /whole seconds, from 1 to 3600/);
});

test("a measured length fills an unknown slot but never overwrites one typed in meanwhile", () => {
  const rows = [row(1, { durationSec: null }), row(2, { durationSec: 240 }), row(3, { durationSec: null })];

  const filled = applyMeasuredDuration(rows, 1, 185);
  assert.deepEqual(
    filled.map((entry) => entry.durationSec),
    [185, 240, null],
  );
  assert.equal(filled[1], rows[1]);

  assert.deepEqual(
    applyMeasuredDuration(rows, 2, 99).map((entry) => entry.durationSec),
    [null, 240, null],
  );
  assert.deepEqual(
    applyMeasuredDuration(rows, 42, 99).map((entry) => entry.durationSec),
    [null, 240, null],
  );
});

test("only tracks without a length and without a failed attempt are still wanted", () => {
  const rows = [row(1, { durationSec: null }), row(2), row(3, { durationSec: null }), row(4, { durationSec: null })];
  assert.deepEqual(unmeasuredTrackIds(rows, new Set()), [1, 3, 4]);
  assert.deepEqual(unmeasuredTrackIds(rows, new Set([3])), [1, 4]);
});

test("a failure mark is forgotten once its track leaves the set or gets a length", () => {
  const failed = new Set([1, 3]);
  const rows = [row(1, { durationSec: null }), row(2), row(3, { durationSec: null })];
  assert.equal(pruneFailed(failed, rows), failed);

  assert.deepEqual([...pruneFailed(failed, [row(1, { durationSec: 90 }), row(3, { durationSec: null })])], [3]);
  assert.deepEqual([...pruneFailed(failed, [row(2)])], []);
});

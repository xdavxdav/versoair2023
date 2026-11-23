import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regression: one listen was counted 3x because several endpoints bumped
// music_tracks.streams. Only /api/streaming/record-play may do it.
test("track file serving never increments stream counters", () => {
  const src = readFileSync("server/routes/music.ts", "utf8");
  assert.doesNotMatch(src, /SET\s+play_count\s*=/i);
  assert.doesNotMatch(src, /SET[^;`"]*\bstreams\s*=\s*COALESCE/i);
});

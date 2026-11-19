import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regression: one listen was counted 3x because several endpoints bumped
// music_tracks.streams. Only the validated play-recording handler may do it.
test("track file serving never increments stream counters", () => {
  const src = readFileSync("server/routes/music.ts", "utf8");
  assert.doesNotMatch(src, /SET\s+play_count\s*=/i);
  assert.doesNotMatch(src, /SET[^;`"]*\bstreams\s*=\s*COALESCE/i);
});

test("legacy play route shares the validated play-recording handler", () => {
  const src = readFileSync("server/routes/streaming.ts", "utf8");
  assert.match(src, /router\.post\("\/record-play",\s*recordPlayHandler\)/);
  assert.match(src, /router\.post\("\/play",\s*recordPlayHandler\)/);
});

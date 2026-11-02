import assert from "node:assert/strict";
import test from "node:test";
import { followedArtistIds, likedTrackIds } from "./streaming-ids";

test("reads the lists the server really sends", () => {
  assert.deepEqual(followedArtistIds({ following: [1, 5, 12] }), [1, 5, 12]);
  assert.deepEqual(followedArtistIds({ following: [] }), []);
  assert.deepEqual(likedTrackIds({ likedTrackIds: [7, 9] }), [7, 9]);
  assert.deepEqual(likedTrackIds({ likedTrackIds: [] }), []);
});

test("each reader only looks at its own key", () => {
  assert.deepEqual(followedArtistIds({ likedTrackIds: [1] }), []);
  assert.deepEqual(likedTrackIds({ following: [1] }), []);
});

test("the page can ask whether one id is in the list", () => {
  assert.equal(followedArtistIds({ following: [1, 5] }).includes(5), true);
  assert.equal(followedArtistIds({ following: [1, 5] }).includes(2), false);
  assert.equal(likedTrackIds({ likedTrackIds: [3] }).includes(3), true);
  assert.equal(likedTrackIds({ likedTrackIds: [3] }).includes(4), false);
});

test("ids that arrive as numeric strings still match", () => {
  assert.deepEqual(followedArtistIds({ following: ["3", 4] }), [3, 4]);
  assert.deepEqual(likedTrackIds({ likedTrackIds: ["10"] }), [10]);
});

test("a body that is not the expected shape means none, not a crash", () => {
  const badBodies = [undefined, null, {}, [], [1, 2], "x", 7, { following: null }, { following: "1" }, { following: { 0: 1 } }];
  for (const body of badBodies) {
    assert.deepEqual(followedArtistIds(body), [], JSON.stringify(body));
    assert.deepEqual(likedTrackIds(body), [], JSON.stringify(body));
  }
  assert.deepEqual(likedTrackIds({ likedTrackIds: null }), []);
  assert.deepEqual(likedTrackIds({ likedTrackIds: "7" }), []);
});

test("entries that are not whole-number ids are skipped", () => {
  assert.deepEqual(followedArtistIds({ following: [1, null, {}, "abc", "", " ", "2.5", 2.5, true, 3] }), [1, 3]);
});

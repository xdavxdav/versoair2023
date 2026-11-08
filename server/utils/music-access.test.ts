import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageArtist,
  collaborationParty,
  isMusicStaff,
  mayChangeCollaborationStatus,
  userOwnsArtist,
  type QueryRunner,
} from "./music-access";

// artistsByUser: user id -> ids of the artist profiles that user owns.
function fakeDb(artistsByUser: Record<number, number[]>) {
  const calls: Array<{ text: string; params: unknown[] }> = [];
  const db: QueryRunner = {
    async query(text, params = []) {
      calls.push({ text, params });
      if (text.includes("WHERE id = $1 AND user_id = $2")) {
        const [artistId, userId] = params as number[];
        const owned = artistsByUser[userId] ?? [];
        return { rows: owned.includes(artistId) ? [{ "?column?": 1 }] : [] };
      }
      if (text.includes("WHERE user_id = $1")) {
        const [userId] = params as number[];
        return { rows: (artistsByUser[userId] ?? []).map((id) => ({ id })) };
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };
  return { db, calls };
}

test("admin, superuser and moderator are staff; artists and customers are not", () => {
  for (const role of ["admin", "superuser", "moderator"]) {
    assert.equal(isMusicStaff({ userId: 1, role }), true, role);
  }
  for (const role of ["artist", "customer", "business", "", undefined]) {
    assert.equal(isMusicStaff({ userId: 1, role }), false, String(role));
  }
  assert.equal(isMusicStaff(undefined), false);
  assert.equal(isMusicStaff(null), false);
});

test("userOwnsArtist matches on artists.user_id, comparing numbers not strings", async () => {
  const { db } = fakeDb({ 7: [3] });
  // req.user.userId is a string at runtime.
  assert.equal(await userOwnsArtist(db, { userId: "7" }, 3), true);
  assert.equal(await userOwnsArtist(db, { userId: 7 }, "3"), true);
  assert.equal(await userOwnsArtist(db, { userId: "7" }, 4), false);
  assert.equal(await userOwnsArtist(db, { userId: "8" }, 3), false);
});

test("userOwnsArtist never queries for ids it cannot parse", async () => {
  const { db, calls } = fakeDb({ 7: [3] });
  for (const [user, artist] of [
    [{ userId: undefined }, 3],
    [{ userId: "7" }, undefined],
    [{ userId: "7" }, null],
    [{ userId: "7" }, true],
    [{ userId: "7" }, "3; DROP TABLE artists"],
    [{ userId: true }, 3],
    [null, 3],
  ] as const) {
    assert.equal(await userOwnsArtist(db, user as never, artist), false);
  }
  assert.equal(calls.length, 0);
});

test("canManageArtist lets staff through without a lookup and keeps orphans staff-only", async () => {
  const { db, calls } = fakeDb({ 7: [3] });
  assert.equal(await canManageArtist(db, { userId: 1, role: "admin" }, 999), true);
  assert.equal(await canManageArtist(db, { userId: 1, role: "moderator" }, null), true);
  assert.equal(calls.length, 0);

  assert.equal(await canManageArtist(db, { userId: "7", role: "artist" }, 3), true);
  assert.equal(await canManageArtist(db, { userId: "7", role: "artist" }, 4), false);
  // Content with no artist has no owner.
  assert.equal(await canManageArtist(db, { userId: "7", role: "artist" }, null), false);
});

test("collaborationParty tells requester, target, staff and strangers apart", async () => {
  const { db } = fakeDb({ 7: [3], 8: [4], 9: [] });
  const collaboration = { requester_id: 3, target_id: 4 };
  assert.equal(await collaborationParty(db, { userId: "7", role: "artist" }, collaboration), "requester");
  assert.equal(await collaborationParty(db, { userId: "8", role: "artist" }, collaboration), "target");
  assert.equal(await collaborationParty(db, { userId: "9", role: "artist" }, collaboration), "none");
  assert.equal(await collaborationParty(db, { userId: 1, role: "admin" }, collaboration), "staff");
  assert.equal(await collaborationParty(db, { role: "artist" }, collaboration), "none");
});

test("an artist on both sides is treated as the target", async () => {
  const { db } = fakeDb({ 7: [3, 4] });
  assert.equal(
    await collaborationParty(db, { userId: 7, role: "artist" }, { requester_id: 3, target_id: 4 }),
    "target",
  );
});

test("collaboration status rules per party", () => {
  // staff: anything
  assert.equal(mayChangeCollaborationStatus("staff", "active", "pending"), true);
  assert.equal(mayChangeCollaborationStatus("staff", "completed", "declined"), true);
  // strangers: nothing
  for (const next of ["active", "declined", "completed"] as const) {
    assert.equal(mayChangeCollaborationStatus("none", next, "pending"), false);
  }
  // target: accept, decline, complete
  for (const next of ["active", "declined", "completed"] as const) {
    assert.equal(mayChangeCollaborationStatus("target", next, "pending"), true);
  }
  // requester: cannot accept their own request, may withdraw a pending one, may complete
  assert.equal(mayChangeCollaborationStatus("requester", "active", "pending"), false);
  assert.equal(mayChangeCollaborationStatus("requester", "declined", "pending"), true);
  assert.equal(mayChangeCollaborationStatus("requester", "declined", "active"), false);
  assert.equal(mayChangeCollaborationStatus("requester", "completed", "active"), true);
});

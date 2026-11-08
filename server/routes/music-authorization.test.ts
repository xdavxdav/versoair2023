import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import musicRouter from "./music";

// user 7 owns artist 3, user 8 owns artist 4, user 9 owns nothing.
const ARTISTS_OF_USER: Record<number, number[]> = { 7: [3], 8: [4], 9: [] };
const TRACKS: Record<number, { id: number; title: string; artist_id: number | null; file_path: null }> = {
  10: { id: 10, title: "Mine", artist_id: 3, file_path: null },
  11: { id: 11, title: "Theirs", artist_id: 4, file_path: null },
  12: { id: 12, title: "Orphan", artist_id: null, file_path: null },
};
const ALBUMS: Record<number, { id: number; artist_id: number | null }> = {
  20: { id: 20, artist_id: 3 },
  21: { id: 21, artist_id: 4 },
};
const COLLABORATIONS: Record<number, { requester_id: number; target_id: number; status: string }> = {
  30: { requester_id: 3, target_id: 4, status: "pending" },
};

function scriptedMusicDb() {
  return scriptPool((sql, params) => {
    if (sql.startsWith("SELECT id, title, artist_id, file_path FROM music_tracks WHERE id = $1")) {
      const track = TRACKS[params[0] as number];
      return { rows: track ? [track] : [] };
    }
    if (sql.startsWith("SELECT file_path FROM music_tracks WHERE id = $1")) {
      const track = TRACKS[params[0] as number];
      return { rows: track ? [{ file_path: track.file_path }] : [] };
    }
    if (sql.startsWith("SELECT 1 FROM artists WHERE id = $1 AND user_id = $2")) {
      const [artistId, userId] = params as number[];
      return { rows: (ARTISTS_OF_USER[userId] ?? []).includes(artistId) ? [{ ok: 1 }] : [] };
    }
    if (sql.startsWith("SELECT id FROM artists WHERE user_id = $1")) {
      const [userId] = params as number[];
      return { rows: (ARTISTS_OF_USER[userId] ?? []).map((id) => ({ id })) };
    }
    if (sql.startsWith("SELECT id, artist_id FROM albums WHERE id = $1")) {
      const album = ALBUMS[params[0] as number];
      return { rows: album ? [album] : [] };
    }
    if (sql.startsWith("UPDATE music_tracks SET") && sql.includes("RETURNING")) {
      return { rows: [{ id: params[params.length - 1], artist_id: 3, title: "t" }] };
    }
    if (sql.startsWith("UPDATE albums")) {
      return { rows: [{ id: params[6] }] };
    }
    if (sql.startsWith("INSERT INTO albums")) {
      return { rows: [{ id: 500, artist_id: params[1] }] };
    }
    if (sql.startsWith("SELECT requester_id, target_id, status FROM artist_collaborations")) {
      const collaboration = COLLABORATIONS[params[0] as number];
      return { rows: collaboration ? [collaboration] : [] };
    }
    if (sql.startsWith("UPDATE artist_collaborations SET status")) {
      return { rows: [{ id: params[1], status: params[0] }] };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedMusicDb>;

const changes = (db: ScriptedDb) => db.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

const owner = { id: 7, role: "artist" };
const otherArtist = { id: 8, role: "artist" };
const admin = { id: 1, role: "admin" };

const trackWrites: Array<{ label: string; method: string; path: (id: number) => string; body?: unknown }> = [
  { label: "delete", method: "DELETE", path: (id) => `/tracks/${id}` },
  { label: "edit", method: "PUT", path: (id) => `/tracks/${id}/edit`, body: { title: "New title" } },
  { label: "status", method: "PATCH", path: (id) => `/tracks/${id}/status`, body: { status: "draft" } },
  { label: "monetization", method: "PUT", path: (id) => `/tracks/${id}/monetization`, body: { price: 12.5 } },
];

test("anonymous requests are refused before anything is looked up", async () => {
  const db = scriptedMusicDb();
  await withRouter(musicRouter, async (origin) => {
    for (const write of trackWrites) {
      const res = await call(origin, write.method, write.path(10), { body: write.body });
      assert.equal(res.status, 401, write.label);
    }
  });
  assert.equal(changes(db).length, 0);
  assert.equal(db.matching("music_tracks").length, 0);
});

for (const write of trackWrites) {
  test(`track ${write.label}: another artist is refused, the owner and staff are not`, async () => {
    const db = scriptedMusicDb();
    await withRouter(musicRouter, async (origin) => {
      const refused = await call(origin, write.method, write.path(10), {
        headers: signIn(otherArtist),
        body: write.body,
      });
      assert.equal(refused.status, 403);
      assert.equal(refused.body?.error, "Not your track");
      assert.equal(changes(db).length, 0, "a refused request must not write");

      const mine = await call(origin, write.method, write.path(10), {
        headers: signIn(owner),
        body: write.body,
      });
      assert.equal(mine.status, 200, JSON.stringify(mine.body));

      const staff = await call(origin, write.method, write.path(11), {
        headers: signIn(admin),
        body: write.body,
      });
      assert.equal(staff.status, 200, JSON.stringify(staff.body));
    });
  });
}

test("a track with no artist is staff-only, and a missing track is a 404", async () => {
  const db = scriptedMusicDb();
  await withRouter(musicRouter, async (origin) => {
    const orphanByOwner = await call(origin, "DELETE", "/tracks/12", { headers: signIn(owner) });
    assert.equal(orphanByOwner.status, 403);
    assert.equal(changes(db).length, 0);

    const orphanByStaff = await call(origin, "DELETE", "/tracks/12", { headers: signIn(admin) });
    assert.equal(orphanByStaff.status, 200);

    const missing = await call(origin, "DELETE", "/tracks/99", { headers: signIn(admin) });
    assert.equal(missing.status, 404);
  });
});

test("an artist sets a price, but revenue and download counters are staff-only", async () => {
  const db = scriptedMusicDb();
  await withRouter(musicRouter, async (origin) => {
    const price = await call(origin, "PUT", "/tracks/10/monetization", {
      headers: signIn(owner),
      body: { price: 12.5 },
    });
    assert.equal(price.status, 200);
    const [update] = changes(db);
    assert.match(update.sql, /SET price = \$1 WHERE id = \$2/);
    assert.deepEqual(update.params, ["12.5", 10]);

    const before = changes(db).length;
    for (const body of [{ revenue: 1000000 }, { downloads: 9999 }, { price: 1, revenue: 5 }]) {
      const res = await call(origin, "PUT", "/tracks/10/monetization", {
        headers: signIn(owner),
        body,
      });
      assert.equal(res.status, 403, JSON.stringify(body));
    }
    assert.equal(changes(db).length, before);

    const staff = await call(origin, "PUT", "/tracks/10/monetization", {
      headers: signIn(admin),
      body: { revenue: 40, downloads: 3 },
    });
    assert.equal(staff.status, 200);
  });
});

test("album update and delete are limited to the owning artist and staff", async () => {
  const db = scriptedMusicDb();
  await withRouter(musicRouter, async (origin) => {
    for (const [method, body] of [
      ["PUT", { title: "Hijacked" }],
      ["DELETE", undefined],
    ] as const) {
      const refused = await call(origin, method, "/albums/20", { headers: signIn(otherArtist), body });
      assert.equal(refused.status, 403, method);
      assert.equal(refused.body?.error, "Not your album");
    }
    assert.equal(changes(db).length, 0);

    const edited = await call(origin, "PUT", "/albums/20", {
      headers: signIn(owner),
      body: { title: "Mine again", trackIds: [10, 11] },
    });
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    // Re-linking is filtered by the album's own artist, so foreign tracks stay put.
    const relinks = db.matching("UPDATE music_tracks SET album_id = $1 WHERE id = $2");
    assert.equal(relinks.length, 2);
    for (const relink of relinks) {
      assert.match(relink.sql, /AND artist_id = \$3/);
      assert.equal(relink.params[2], 3);
    }

    const removed = await call(origin, "DELETE", "/albums/20", { headers: signIn(owner) });
    assert.equal(removed.status, 200);
    assert.equal(db.matching("DELETE FROM albums").length, 1);

    const missing = await call(origin, "DELETE", "/albums/99", { headers: signIn(admin) });
    assert.equal(missing.status, 404);
  });
});

test("creating an album only attaches tracks that belong to the creating artist", async () => {
  const db = scriptedMusicDb();
  await withRouter(musicRouter, async (origin) => {
    const created = await call(origin, "POST", "/albums", {
      headers: signIn(owner),
      body: { title: "Debut", trackIds: [10, 11] },
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const [insert] = db.matching("INSERT INTO albums");
    assert.equal(insert.params[1], 3, "the album is bound to the session user's artist");

    const attaches = db.matching("UPDATE music_tracks SET album_id = $1 WHERE id = $2");
    assert.equal(attaches.length, 2);
    for (const attach of attaches) {
      assert.match(attach.sql, /AND artist_id = \$3/);
      assert.deepEqual([attach.params[0], attach.params[2]], [500, 3]);
    }
  });

  const noArtist = scriptedMusicDb();
  await withRouter(musicRouter, async (origin) => {
    const created = await call(origin, "POST", "/albums", {
      headers: signIn({ id: 9, role: "customer" }),
      body: { title: "Loose", trackIds: [10, 11] },
    });
    assert.equal(created.status, 200);
  });
  assert.equal(noArtist.matching("UPDATE music_tracks SET album_id").length, 0);
});

test("collaboration status: only the parties may move it, and the requester may not accept their own request", async () => {
  const db = scriptedMusicDb();
  const setStatus = (origin: string, account: { id: number; role: string }, status: unknown, id = 30) =>
    call(origin, "PUT", `/collaborations/${id}/status`, {
      headers: signIn(account),
      body: { status },
    });

  await withRouter(musicRouter, async (origin) => {
    // requester (user 7, artist 3) cannot accept; a stranger cannot do anything
    assert.equal((await setStatus(origin, owner, "active")).status, 403);
    assert.equal((await setStatus(origin, { id: 9, role: "artist" }, "active")).status, 403);
    assert.equal((await setStatus(origin, { id: 9, role: "artist" }, "declined")).status, 403);
    assert.equal(db.matching("UPDATE artist_collaborations").length, 0);

    // validation and lookup come first
    assert.equal((await setStatus(origin, admin, "bogus")).status, 400);
    assert.equal((await setStatus(origin, admin, "active", 99)).status, 404);

    // the invited artist accepts; the requester withdraws a pending request; staff can do either
    assert.equal((await setStatus(origin, otherArtist, "active")).status, 200);
    assert.equal((await setStatus(origin, owner, "declined")).status, 200);
    assert.equal((await setStatus(origin, admin, "completed")).status, 200);
    assert.equal(db.matching("UPDATE artist_collaborations").length, 3);
  });
});

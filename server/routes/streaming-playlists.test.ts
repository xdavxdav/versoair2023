import assert from "node:assert/strict";
import test from "node:test";
import {
  actAs,
  call,
  injectSession,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import streamingRouter from "./streaming";

// playlist 1: user 7, public. 2: user 8, private. 3: user 8, public.
const PLAYLISTS: Record<number, { id: number; user_id: number; is_public: boolean; name: string }> = {
  1: { id: 1, user_id: 7, is_public: true, name: "Mine" },
  2: { id: 2, user_id: 8, is_public: false, name: "Secret" },
  3: { id: 3, user_id: 8, is_public: true, name: "Shared" },
};

function scriptedStreamingDb() {
  return scriptPool((sql, params) => {
    if (sql.startsWith("SELECT user_id FROM playlists WHERE id = $1")) {
      const playlist = PLAYLISTS[Number(params[0])];
      return { rows: playlist ? [{ user_id: playlist.user_id }] : [] };
    }
    if (sql.includes("next_pos")) return { rows: [{ next_pos: 0 }] };
    if (sql.startsWith("SELECT p.*, u.username as creator_name")) {
      const playlist = PLAYLISTS[Number(params[0])];
      return { rows: playlist ? [playlist] : [] };
    }
    if (sql.startsWith("UPDATE playlists SET name")) {
      const playlist = PLAYLISTS[Number(params[3])];
      const owned = playlist && String(playlist.user_id) === String(params[4]);
      return { rows: owned ? [playlist] : [] };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedStreamingDb>;
const changes = (db: ScriptedDb) => db.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

const viewer = { id: 7, role: "user" };
const owner = { id: 8, role: "user" };

const writes: Array<{ label: string; method: string; path: (id: string) => string; body?: unknown }> = [
  { label: "add a track", method: "POST", path: (id) => `/playlists/${id}/tracks`, body: { trackId: 5 } },
  { label: "remove a track", method: "DELETE", path: (id) => `/playlists/${id}/tracks/5` },
  { label: "reorder", method: "PUT", path: (id) => `/playlists/${id}/reorder`, body: { trackIds: [6, 5] } },
];

test("changing the contents of a playlist needs a signed-in owner", async () => {
  const db = scriptedStreamingDb();
  await withRouter(streamingRouter, async (origin) => {
    for (const write of writes) {
      const anonymous = await call(origin, write.method, write.path("2"), { body: write.body });
      assert.equal(anonymous.status, 401, `${write.label} anonymous`);

      const stranger = await call(origin, write.method, write.path("2"), {
        headers: signIn(viewer),
        body: write.body,
      });
      assert.equal(stranger.status, 403, `${write.label} by another user`);
      assert.equal(stranger.body?.error, "Not your playlist");

      const missing = await call(origin, write.method, write.path("99"), {
        headers: signIn(owner),
        body: write.body,
      });
      assert.equal(missing.status, 404, `${write.label} on a missing playlist`);
    }
    assert.equal(changes(db).length, 0, "refused requests must not write");

    for (const write of writes) {
      const mine = await call(origin, write.method, write.path("2"), {
        headers: signIn(owner),
        body: write.body,
      });
      assert.equal(mine.status, 200, `${write.label} by the owner: ${JSON.stringify(mine.body)}`);
    }
    assert.ok(changes(db).length >= 3);
  });
});

test("a playlist id that is not a positive integer never reaches the database", async () => {
  const db = scriptedStreamingDb();
  await withRouter(streamingRouter, async (origin) => {
    for (const id of ["abc", "0", "-1", "1.5", "99999999999"]) {
      const res = await call(origin, "POST", `/playlists/${id}/tracks`, {
        headers: signIn(owner),
        body: { trackId: 5 },
      });
      assert.equal(res.status, 404, id);
    }
  });
  assert.equal(db.matching("playlists").length, 0);
});

test("renaming a playlist is tied to the signed-in owner", async () => {
  const db = scriptedStreamingDb();
  await withRouter(streamingRouter, async (origin) => {
    assert.equal((await call(origin, "PUT", "/playlists/2", { body: { name: "x" } })).status, 401);

    const stranger = await call(origin, "PUT", "/playlists/2", {
      headers: signIn(viewer),
      body: { name: "Hijacked" },
    });
    assert.equal(stranger.status, 404);

    const mine = await call(origin, "PUT", "/playlists/2", {
      headers: signIn(owner),
      body: { name: "Renamed" },
    });
    assert.equal(mine.status, 200);
  });
  for (const update of db.matching("UPDATE playlists SET name")) {
    assert.match(update.sql, /WHERE id = \$4 AND user_id = \$5/);
    assert.doesNotMatch(update.sql, /IS NULL/);
  }
});

test("a playlist read only returns that playlist's tracks, and keeps private playlists private", async () => {
  const db = scriptedStreamingDb();
  await withRouter(
    streamingRouter,
    async (origin) => {
      // private: invisible to everyone but its owner
      assert.equal((await call(origin, "GET", "/playlists/2")).status, 404);
      actAs(viewer);
      assert.equal((await call(origin, "GET", "/playlists/2")).status, 404);
      actAs(owner);
      assert.equal((await call(origin, "GET", "/playlists/2")).status, 200);

      // public: anyone
      actAs(undefined);
      const shared = await call(origin, "GET", "/playlists/3");
      assert.equal(shared.status, 200);
      assert.equal(shared.body.playlist.name, "Shared");
    },
    { before: [injectSession] },
  );

  const trackQueries = db.log.filter((entry) => entry.sql.includes("FROM playlist_tracks pt"));
  assert.equal(trackQueries.length, 2, "tracks are only fetched when the playlist is visible");
  for (const query of trackQueries) {
    assert.match(query.sql, /WHERE pt\.playlist_id = \$1/);
  }
  assert.deepEqual(trackQueries.map((query) => query.params), [["2"], ["3"]]);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  START_GRACE_MS,
  cancelSession,
  createSession,
  escapeLike,
  mapSessionRow,
  parseStoredSet,
  presentNowPlaying,
  presentPublicList,
  presentSessionDetail,
  publicDisplayName,
  summarizeSession,
  syncStoredStatuses,
  toPublicDetail,
  toPublicSummary,
  updateSession,
  type SessionRow,
  type SessionsPool,
} from "./listening-sessions";

const T0 = new Date("2026-11-08T20:00:00.000Z");
const at = (offsetSec: number) => new Date(T0.getTime() + offsetSec * 1000);

// Two 60 s tracks and a 10 s gap: the set is 130 s long.
const SET = [
  { trackId: 11, durationSec: 60 },
  { trackId: 12, durationSec: 60 },
];

function row(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 1,
    title: "Sunday Session",
    description: null,
    hostUserId: 7,
    hostName: "Luq",
    startsAt: T0,
    endsAt: at(130),
    playlistId: 9,
    storedStatus: "scheduled",
    setTracks: SET,
    gapSeconds: 10,
    ...over,
  };
}

// ─── names and parsing ───────────────────────────────────────────────────

test("publicDisplayName: the first usable candidate wins, and an email is never usable", () => {
  assert.equal(publicDisplayName(["Luq", "other"], "Listener"), "Luq");
  assert.equal(publicDisplayName([null, "  ", "listener@example.com", "Luq O."], "Listener"), "Luq O.");
  assert.equal(publicDisplayName(["listener@example.com"], "Listener"), "Listener");
  assert.equal(publicDisplayName(["dj@home"], "Listener"), "Listener");
  assert.equal(publicDisplayName([undefined, 42, {}], null), null);
});

test("publicDisplayName: one line, controls removed, at most 60 whole characters", () => {
  assert.equal(publicDisplayName(["A\u0000B\n\tC"], "x"), "A B C");
  assert.equal(Array.from(publicDisplayName(["\u00e9".repeat(80)], "x")).length, 60);
  const cut = publicDisplayName(["\u{1F3B5}".repeat(70)], "x");
  assert.equal(Array.from(cut).length, 60, "never cut inside a surrogate pair");
});

test("escapeLike makes LIKE wildcards literal", () => {
  assert.equal(escapeLike("100%_\\"), "100\\%\\_\\\\");
  assert.equal(escapeLike("plain"), "plain");
});

test("parseStoredSet reads JSON text or an array and drops anything malformed", () => {
  const good = [
    { trackId: 5, durationSec: 61.5 },
    { trackId: "6", durationSec: "70" },
  ];
  const expected = [
    { trackId: 5, durationSec: 61.5 },
    { trackId: 6, durationSec: 70 },
  ];
  assert.deepEqual(parseStoredSet(good), expected);
  assert.deepEqual(parseStoredSet(JSON.stringify(good)), expected);
  assert.deepEqual(
    parseStoredSet([
      { trackId: 0, durationSec: 5 },
      { trackId: 3, durationSec: 0 },
      { trackId: 3, durationSec: -1 },
      { trackId: 1.5, durationSec: 5 },
      { durationSec: 5 },
      { trackId: 2, durationSec: Number.POSITIVE_INFINITY },
      null,
      "x",
    ]),
    [],
  );
  assert.deepEqual(parseStoredSet("not json"), []);
  assert.deepEqual(parseStoredSet({ trackId: 1, durationSec: 5 }), []);
  assert.deepEqual(parseStoredSet(null), []);
});

test("mapSessionRow: types are normalised and a host whose name is an email gets no name", () => {
  const raw = {
    id: "3",
    title: "T",
    description: null,
    host_user_id: 7,
    starts_at: "2026-11-08T20:00:00.000Z",
    ends_at: new Date("2026-11-08T20:02:10.000Z"),
    playlist_id: null,
    status: "live",
    set_tracks: '[{"trackId":1,"durationSec":60}]',
    gap_seconds: "5",
    host_display_name: null,
    host_username: "listener@example.com",
  };
  const mapped = mapSessionRow(raw);
  assert.equal(mapped.id, 3);
  assert.equal(mapped.hostName, null);
  assert.equal(mapped.playlistId, null);
  assert.equal(mapped.storedStatus, "live");
  assert.equal(mapped.gapSeconds, 5);
  assert.deepEqual(mapped.setTracks, [{ trackId: 1, durationSec: 60 }]);
  assert.equal(mapped.startsAt.toISOString(), "2026-11-08T20:00:00.000Z");
  assert.equal(mapSessionRow({ ...raw, host_display_name: "Luq" }).hostName, "Luq");
});

// ─── presentation ────────────────────────────────────────────────────────

test("summarizeSession: the clock decides the status; a cancelled session stays cancelled", () => {
  const stale = row({ storedStatus: "scheduled" });
  assert.equal(summarizeSession(stale, at(-1)).status, "scheduled");
  assert.equal(summarizeSession(stale, at(0)).status, "live");
  assert.equal(summarizeSession(stale, at(129)).status, "live");
  assert.equal(summarizeSession(stale, at(130)).status, "ended");
  assert.equal(summarizeSession(row({ storedStatus: "cancelled" }), at(60)).status, "cancelled");
  const summary = summarizeSession(stale, at(-1));
  assert.equal(summary.trackCount, 2);
  assert.equal(summary.totalDurationSec, 130);
});

test("public views never carry the host's account id or the playlist id", () => {
  const summary = summarizeSession(row(), at(-60));
  assert.equal(summary.hostUserId, 7);
  assert.equal(summary.playlistId, 9);
  const publicSummary = toPublicSummary(summary);
  assert.equal("hostUserId" in publicSummary, false);
  assert.equal("playlistId" in publicSummary, false);

  const detail = presentSessionDetail(row(), [], at(-60));
  assert.equal(detail.hostUserId, 7, "the admin view keeps them");
  const publicDetail = toPublicDetail(detail);
  assert.equal("hostUserId" in publicDetail, false);
  assert.equal("playlistId" in publicDetail, false);
  assert.deepEqual(publicDetail.tracks, []);
});

test("presentPublicList: live first, then upcoming by start, then ended newest first; cancelled hidden", () => {
  const rows = [
    row({ id: 1, startsAt: at(3600), endsAt: at(3730) }),
    row({ id: 2, startsAt: at(600), endsAt: at(730) }),
    row({ id: 3, startsAt: at(-60), endsAt: at(70), storedStatus: "scheduled" }),
    row({ id: 4, startsAt: at(-7200), endsAt: at(-7070), storedStatus: "ended" }),
    row({ id: 5, startsAt: at(-600), endsAt: at(-470), storedStatus: "live" }),
    row({ id: 6, startsAt: at(300), endsAt: at(430), storedStatus: "cancelled" }),
  ];
  assert.deepEqual(
    presentPublicList(rows, at(0)).map((s) => s.id),
    [3, 2, 1, 5, 4],
  );
});

test("presentPublicList keeps only the 20 most recent ended sessions", () => {
  const ended = Array.from({ length: 25 }, (_v, i) =>
    row({ id: i + 1, startsAt: at(-10_000 - i * 1000), endsAt: at(-9870 - i * 1000) }),
  );
  const list = presentPublicList(ended, at(0));
  assert.equal(list.length, 20);
  assert.equal(list[0].id, 1);
  assert.equal(list[19].id, 20);
});

test("presentNowPlaying follows the clock through scheduled, playing, gap and ended", () => {
  const r = row();
  const when = (offsetSec: number) => presentNowPlaying(r, at(offsetSec));

  assert.equal(when(-30).status, "scheduled");
  assert.deepEqual(when(-30).nowPlaying, { state: "scheduled", startsInSec: 30 });

  assert.equal(when(15).status, "live");
  assert.deepEqual(when(15).nowPlaying, {
    state: "playing",
    index: 0,
    trackId: 11,
    offsetSec: 15,
    remainingSec: 45,
    nextTrackId: 12,
  });
  assert.deepEqual(when(65).nowPlaying, {
    state: "gap",
    afterIndex: 0,
    gapRemainingSec: 5,
    nextTrackId: 12,
  });
  assert.deepEqual(when(75).nowPlaying, {
    state: "playing",
    index: 1,
    trackId: 12,
    offsetSec: 5,
    remainingSec: 55,
    nextTrackId: null,
  });
  assert.equal(when(130).status, "ended");
  assert.deepEqual(when(130).nowPlaying, { state: "ended" });
  assert.equal(when(15).serverTime, at(15).toISOString());
});

test("presentNowPlaying: a cancelled session has nothing playing, whatever the time", () => {
  const cancelled = row({ storedStatus: "cancelled" });
  for (const offset of [-30, 15, 65, 500]) {
    const result = presentNowPlaying(cancelled, at(offset));
    assert.equal(result.status, "cancelled");
    assert.equal(result.nowPlaying, null);
  }
});

// ─── writes, against a scripted database ─────────────────────────────────

interface Step {
  match: RegExp;
  rows?: any[];
  rowCount?: number;
  error?: Error;
}

/** Answers by pattern; anything unscripted (BEGIN, COMMIT, plain writes) succeeds with no rows. */
function scriptedPool(script: Step[]) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const released: Array<Error | boolean | undefined> = [];
  let connects = 0;
  const run = async (text: string, values?: unknown[]) => {
    const sql = text.replace(/\s+/g, " ").trim();
    calls.push({ sql, values });
    const step = script.find((candidate) => candidate.match.test(sql));
    if (step?.error) throw step.error;
    return { rows: step?.rows ?? [], rowCount: step?.rowCount ?? step?.rows?.length ?? 0 };
  };
  const client = { query: run, release: (error?: Error | boolean) => void released.push(error) };
  const pool: SessionsPool = {
    query: run,
    connect: async () => {
      connects++;
      return client;
    },
  };
  return {
    pool,
    calls,
    released,
    connects: () => connects,
    // The statement kinds in order, e.g. "BEGIN", "INSERT INTO playlists", "COMMIT".
    kinds: () =>
      calls.map(
        ({ sql }) =>
          sql.match(/^(?:BEGIN|COMMIT|ROLLBACK)$/)?.[0] ??
          sql.match(/^(?:INSERT INTO|UPDATE|DELETE FROM|SELECT [^ ]+ FROM) \w+/)?.[0] ??
          sql,
      ),
  };
}

const PUBLISHED = { match: /^SELECT id FROM music_tracks/, rows: [{ id: 11 }, { id: 12 }] };
const HOST_EXISTS = { match: /^SELECT 1 FROM users/, rows: [{ "?column?": 1 }] };

const NEW_SESSION = {
  title: "Sunday Session",
  description: null,
  hostUserId: 7,
  startsAt: T0,
  gapSeconds: 10,
  tracks: SET,
};

test("createSession: one transaction writes the playlist, its rows and the session, in order", async () => {
  const db = scriptedPool([
    PUBLISHED,
    HOST_EXISTS,
    { match: /^INSERT INTO playlists/, rows: [{ id: 90 }] },
    { match: /^INSERT INTO listening_sessions/, rows: [{ id: 5 }] },
  ]);
  const result = await createSession(db.pool, NEW_SESSION, { adminUserId: 1, now: at(-3600) });

  assert.deepEqual(result, { ok: true, value: { id: 5 } });
  assert.deepEqual(db.kinds(), [
    "SELECT id FROM music_tracks",
    "SELECT 1 FROM users",
    "BEGIN",
    "INSERT INTO playlists",
    "INSERT INTO playlist_tracks",
    "INSERT INTO listening_sessions",
    "COMMIT",
  ]);
  assert.equal(db.connects(), 1);
  assert.deepEqual(db.released, [undefined], "the connection goes back to the pool, trusted");

  const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO listening_sessions"))!;
  const [, , hostUserId, startsAt, endsAt, playlistId, status, setTracks, gapSeconds] =
    insert.values as any[];
  assert.equal(hostUserId, 7);
  assert.equal(startsAt, T0.toISOString());
  assert.equal(endsAt, at(130).toISOString(), "computed from the set, never taken from the caller");
  assert.equal(playlistId, 90);
  assert.equal(status, "scheduled");
  assert.deepEqual(JSON.parse(setTracks), SET);
  assert.equal(gapSeconds, 10);
});

test("createSession: a start within the grace is allowed and stored as live", async () => {
  const db = scriptedPool([
    PUBLISHED,
    HOST_EXISTS,
    { match: /^INSERT INTO playlists/, rows: [{ id: 90 }] },
    { match: /^INSERT INTO listening_sessions/, rows: [{ id: 5 }] },
  ]);
  const now = new Date(T0.getTime() + START_GRACE_MS);
  const result = await createSession(db.pool, NEW_SESSION, { adminUserId: 1, now });
  assert.equal(result.ok, true);
  const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO listening_sessions"))!;
  assert.equal((insert.values as any[])[6], "live");
});

test("createSession: refusals write nothing and never open a transaction", async () => {
  const past = scriptedPool([]);
  const tooLate = new Date(T0.getTime() + START_GRACE_MS + 1);
  const pastResult = await createSession(past.pool, NEW_SESSION, { adminUserId: 1, now: tooLate });
  assert.deepEqual(pastResult.ok === false && [pastResult.status, pastResult.code], [400, "starts_in_past"]);
  assert.equal(past.calls.length, 0, "refused before any query");

  const unknownTrack = scriptedPool([{ match: /^SELECT id FROM music_tracks/, rows: [{ id: 11 }] }]);
  const trackResult = await createSession(unknownTrack.pool, NEW_SESSION, {
    adminUserId: 1,
    now: at(-60),
  });
  assert.equal(trackResult.ok, false);
  if (!trackResult.ok) {
    assert.equal(trackResult.code, "track_unavailable");
    assert.deepEqual(trackResult.details, { trackIds: [12] });
  }
  assert.equal(unknownTrack.connects(), 0);

  const noHost = scriptedPool([PUBLISHED, { match: /^SELECT 1 FROM users/, rows: [] }]);
  const hostResult = await createSession(noHost.pool, NEW_SESSION, { adminUserId: 1, now: at(-60) });
  assert.deepEqual(hostResult.ok === false && hostResult.code, "host_not_found");
  assert.equal(noHost.connects(), 0);
  assert.equal(
    noHost.kinds().some((kind) => kind.startsWith("INSERT")),
    false,
  );
});

test("createSession: a failure inside the transaction rolls back, rethrows, and frees the connection", async () => {
  const boom = new Error("insert failed");
  const db = scriptedPool([
    PUBLISHED,
    HOST_EXISTS,
    { match: /^INSERT INTO playlists/, rows: [{ id: 90 }] },
    { match: /^INSERT INTO playlist_tracks/, error: boom },
  ]);
  await assert.rejects(createSession(db.pool, NEW_SESSION, { adminUserId: 1, now: at(-60) }), boom);
  assert.deepEqual(db.kinds().slice(-3), [
    "INSERT INTO playlists",
    "INSERT INTO playlist_tracks",
    "ROLLBACK",
  ]);
  assert.equal(db.kinds().includes("COMMIT"), false);
  assert.deepEqual(db.released, [undefined]);
});

test("createSession: a connection that cannot roll back is discarded, and the original error wins", async () => {
  const boom = new Error("insert failed");
  const stuck = new Error("connection lost");
  const db = scriptedPool([
    PUBLISHED,
    HOST_EXISTS,
    { match: /^INSERT INTO playlists/, error: boom },
    { match: /^ROLLBACK$/, error: stuck },
  ]);
  await assert.rejects(createSession(db.pool, NEW_SESSION, { adminUserId: 1, now: at(-60) }), boom);
  assert.equal(db.released.length, 1);
  assert.equal(db.released[0], stuck, "release(error) tells the pool not to reuse it");
});

const lockedRow = (over: Record<string, unknown> = {}) => ({
  match: /FOR UPDATE$/,
  rows: [
    {
      id: 1,
      title: "Sunday Session",
      description: null,
      host_user_id: 7,
      starts_at: T0,
      ends_at: at(130),
      status: "scheduled",
      set_tracks: SET,
      gap_seconds: 10,
      playlist_id: 90,
      ...over,
    },
  ],
});

test("updateSession: the row is locked while it is checked, inside the transaction", async () => {
  const db = scriptedPool([lockedRow()]);
  await updateSession(db.pool, 1, { title: "Renamed" }, { now: at(-600) });
  const sqls = db.calls.map((call) => call.sql);
  const begin = sqls.indexOf("BEGIN");
  const lock = sqls.findIndex((sql) => /FROM listening_sessions WHERE id = \$1 FOR UPDATE$/.test(sql));
  assert.ok(begin >= 0 && lock > begin, "SELECT ... FOR UPDATE comes after BEGIN");
  assert.ok(sqls.indexOf("COMMIT") > lock, "and is released by the COMMIT");
});

test("updateSession: values sent back unchanged are a no-op that writes nothing", async () => {
  const db = scriptedPool([PUBLISHED, HOST_EXISTS, lockedRow()]);
  const result = await updateSession(
    db.pool,
    1,
    { title: "Sunday Session", description: null, hostUserId: 7, startsAt: T0, gapSeconds: 10, tracks: SET },
    { now: at(-600) },
  );
  assert.deepEqual(result, { ok: true, value: { id: 1, changed: false } });
  assert.equal(
    db.kinds().some((kind) => /^(UPDATE|DELETE|INSERT)/.test(kind)),
    false,
  );
});

test("updateSession: before the start, a new set recomputes ends_at and replaces only that playlist's rows", async () => {
  const db = scriptedPool([
    { match: /^SELECT id FROM music_tracks/, rows: [{ id: 11 }, { id: 12 }, { id: 13 }] },
    lockedRow(),
  ]);
  const longer = [...SET, { trackId: 13, durationSec: 60 }];
  const result = await updateSession(db.pool, 1, { tracks: longer }, { now: at(-600) });
  assert.deepEqual(result, { ok: true, value: { id: 1, changed: true } });

  const update = db.calls.find((call) => call.sql.startsWith("UPDATE listening_sessions"))!;
  assert.match(update.sql, /ends_at = \$2::timestamptz/);
  assert.equal((update.values as any[])[1], at(200).toISOString(), "3 x 60 s plus two 10 s gaps");
  assert.deepEqual(db.kinds().slice(-5), [
    "UPDATE listening_sessions",
    "DELETE FROM playlist_tracks",
    "INSERT INTO playlist_tracks",
    "UPDATE playlists",
    "COMMIT",
  ]);
  const del = db.calls.find((call) => call.sql.startsWith("DELETE FROM playlist_tracks"))!;
  assert.deepEqual(del.values, [90]);
});

test("updateSession: after the start the schedule is locked, but the title can still change", async () => {
  const live = lockedRow({ starts_at: at(-30), ends_at: at(100), status: "live" });

  const locked = scriptedPool([PUBLISHED, live]);
  const refused = await updateSession(
    locked.pool,
    1,
    { tracks: [{ trackId: 12, durationSec: 60 }] },
    { now: at(0) },
  );
  assert.deepEqual(refused.ok === false && [refused.status, refused.code], [409, "session_started"]);
  assert.equal(
    locked.kinds().some((kind) => /^(UPDATE|DELETE|INSERT)/.test(kind)),
    false,
  );

  const moved = scriptedPool([live]);
  const startRefused = await updateSession(moved.pool, 1, { startsAt: at(600) }, { now: at(0) });
  assert.deepEqual(startRefused.ok === false && startRefused.code, "session_started");

  const renamed = scriptedPool([live]);
  const allowed = await updateSession(renamed.pool, 1, { title: "Renamed live" }, { now: at(0) });
  assert.deepEqual(allowed, { ok: true, value: { id: 1, changed: true } });
  assert.equal(
    renamed.kinds().includes("DELETE FROM playlist_tracks"),
    false,
    "a rename never touches the playlist rows",
  );
  assert.equal(renamed.kinds().includes("UPDATE playlists"), true, "but it renames the playlist");
});

test("updateSession: not found, cancelled, a start in the past and an unavailable track", async () => {
  const missing = scriptedPool([{ match: /FOR UPDATE$/, rows: [] }]);
  const notFound = await updateSession(missing.pool, 1, { title: "x" }, { now: at(0) });
  assert.deepEqual(notFound.ok === false && [notFound.status, notFound.code], [404, "not_found"]);

  const cancelled = scriptedPool([lockedRow({ status: "cancelled" })]);
  const refused = await updateSession(cancelled.pool, 1, { title: "x" }, { now: at(-600) });
  assert.deepEqual(refused.ok === false && [refused.status, refused.code], [409, "session_cancelled"]);

  const past = scriptedPool([lockedRow()]);
  const tooEarly = at(-600 - 61);
  const pastResult = await updateSession(past.pool, 1, { startsAt: tooEarly }, { now: at(-600) });
  assert.deepEqual(pastResult.ok === false && pastResult.code, "starts_in_past");

  const unpublished = scriptedPool([{ match: /^SELECT id FROM music_tracks/, rows: [] }]);
  const trackResult = await updateSession(
    unpublished.pool,
    1,
    { tracks: [{ trackId: 99, durationSec: 60 }] },
    { now: at(-600) },
  );
  assert.deepEqual(trackResult.ok === false && trackResult.code, "track_unavailable");
  assert.equal(unpublished.connects(), 0, "refused before the transaction opens");
});

test("cancelSession: allowed until the end, idempotent, and guarded against a lost race", async () => {
  const live = { id: 1, starts_at: T0, ends_at: at(130), status: "live" };
  const ok = scriptedPool([
    { match: /^SELECT id, starts_at, ends_at, status FROM listening_sessions/, rows: [live] },
    { match: /^UPDATE listening_sessions SET status = 'cancelled'/, rows: [{ id: 1 }] },
  ]);
  assert.deepEqual(await cancelSession(ok.pool, 1, { now: at(60) }), {
    ok: true,
    value: { id: 1, alreadyCancelled: false },
  });
  const update = ok.calls.find((call) => call.sql.startsWith("UPDATE"))!;
  assert.deepEqual(update.values, [1, at(60).toISOString()]);

  const twice = scriptedPool([
    { match: /^SELECT id, starts_at/, rows: [{ ...live, status: "cancelled" }] },
  ]);
  assert.deepEqual(await cancelSession(twice.pool, 1, { now: at(60) }), {
    ok: true,
    value: { id: 1, alreadyCancelled: true },
  });
  assert.equal(twice.calls.length, 1, "no write the second time");

  const ended = scriptedPool([{ match: /^SELECT id, starts_at/, rows: [live] }]);
  const endedResult = await cancelSession(ended.pool, 1, { now: at(130) });
  assert.deepEqual(endedResult.ok === false && [endedResult.status, endedResult.code], [409, "session_ended"]);
  assert.equal(ended.calls.length, 1);

  const unknown = scriptedPool([{ match: /^SELECT id, starts_at/, rows: [] }]);
  const unknownResult = await cancelSession(unknown.pool, 1, { now: at(0) });
  assert.deepEqual(unknownResult.ok === false && [unknownResult.status, unknownResult.code], [404, "not_found"]);

  const raced = scriptedPool([
    { match: /^SELECT id, starts_at/, rows: [live] },
    { match: /^UPDATE listening_sessions/, rows: [] },
  ]);
  const racedResult = await cancelSession(raced.pool, 1, { now: at(60) });
  assert.deepEqual(racedResult.ok === false && [racedResult.status, racedResult.code], [409, "session_changed"]);
});

test("syncStoredStatuses passes the clock it was given and reports how many rows moved", async () => {
  const db = scriptedPool([{ match: /^UPDATE listening_sessions/, rowCount: 3 }]);
  assert.equal(await syncStoredStatuses(db.pool, at(10)), 3);
  assert.deepEqual(db.calls[0].values, [at(10).toISOString()]);
  assert.match(db.calls[0].sql, /status <> 'cancelled'/, "a cancelled session is left alone");

  const none = scriptedPool([{ match: /^UPDATE/ }]);
  assert.equal(await syncStoredStatuses(none.pool, at(10)), 0);
});

import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import test from "node:test";
import express from "express";
import { createUserSessionsRouter } from "./listening-sessions-user";
import { resetRateLimitsForTests } from "../services/listening-session-rate-limits";

const NOW = new Date("2025-06-01T12:00:00.000Z");

interface Call {
  text: string;
  values: unknown[];
}

type Respond = (call: Call) => { rows: any[] } | undefined | Promise<{ rows: any[] } | undefined>;

async function start(respond: Respond) {
  const calls: Call[] = [];
  const run = async (text: string, values: unknown[] = []) => {
    const call = { text, values };
    calls.push(call);
    return (await respond(call)) ?? { rows: [] };
  };
  const pool = {
    query: run,
    async connect() {
      return { query: run, release() {} };
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = req.header("x-test-user");
    if (id) (req as any).user = { userId: id, id, role: "fan" };
    next();
  });
  app.use("/", createUserSessionsRouter({ getDb: async () => pool as any, now: () => NOW }));
  const server: Server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as { port: number };
  return {
    calls,
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

const eligible = (verified: boolean, registered = verified) => ({
  rows: [{ registered, verified }],
});

const goodBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Late night set",
  startsAt: new Date(NOW.getTime() + 3600_000).toISOString(),
  trackIds: [1, 2],
  ...overrides,
});

async function post(origin: string, path: string, body: unknown, user = "5") {
  return fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": user },
    body: JSON.stringify(body),
  });
}

const isEligibility = (call: Call) => call.text.includes("AS registered");
const isPublishedTrackSearch = (call: Call) =>
  call.text.includes("FROM music_tracks mt") && call.text.includes("LEFT JOIN music_artists ma");
const isPublishedTrackResolve = (call: Call) =>
  call.text.includes("SELECT mt.id, mt.duration") && call.text.includes("mt.status = 'published'");
const isQuota = (call: Call) => call.text.includes("SELECT created_at FROM listening_sessions");

test("a signed-out caller is refused on every route", async () => {
  const app = await start(() => undefined);
  try {
    for (const [method, path] of [
      ["GET", "/eligibility"],
      ["GET", "/tracks"],
      ["POST", "/create"],
      ["GET", "/my-sessions"],
      ["POST", "/3/cancel"],
    ]) {
      const res = await fetch(`${app.origin}${path}`, { method });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  } finally {
    await app.close();
  }
});

test("any signed-in user is eligible to host a listening session", async () => {
  const app = await start((call) => (isEligibility(call) ? eligible(false, false) : undefined));
  try {
    const res = await fetch(`${app.origin}/eligibility`, { headers: { "x-test-user": "5" } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.canHost, true);
    assert.equal(body.registeredArtist, false);
    assert.equal(body.verifiedArtist, false);
  } finally {
    await app.close();
  }
});

test("any signed-in user can search published tracks across artists", async () => {
  const app = await start((call) => {
    if (isPublishedTrackSearch(call)) {
      return {
        rows: [
          { id: 10, title: "Midnight Pulse", artist_name: "Artist A", duration: 215 },
          { id: 11, title: "Midnight Drive", artist_name: "Artist B", duration: 190 },
        ],
      };
    }
    return undefined;
  });
  try {
    const res = await fetch(`${app.origin}/tracks?q=midnight`, { headers: { "x-test-user": "5" } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.tracks.length, 2);
    assert.deepEqual(body.tracks[0], {
      id: 10,
      title: "Midnight Pulse",
      artistName: "Artist A",
      durationSec: 215,
    });
  } finally {
    await app.close();
  }
});

test("missing or unpublished tracks are refused", async () => {
  const app = await start((call) => {
    if (isPublishedTrackResolve(call)) return { rows: [{ id: 1, duration: 200 }] };
    return undefined;
  });
  try {
    const res = await post(app.origin, "/create", goodBody());
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "track_unavailable");
    assert.deepEqual(body.error.details.trackIds, [2]);
    assert.equal(app.calls.some((c) => c.text.includes("INSERT INTO listening_sessions")), false);
  } finally {
    await app.close();
  }
});

test("a client cannot choose track lengths: only trackIds are accepted", async () => {
  const app = await start(() => undefined);
  try {
    const res = await post(
      app.origin,
      "/create",
      goodBody({ trackIds: undefined, tracks: [{ trackId: 1, durationSec: 5 }] }),
    );
    assert.equal(res.status, 400);
  } finally {
    await app.close();
  }
});

test("the stored quota blocks a host who is in cooldown", async () => {
  const app = await start((call) => {
    if (isPublishedTrackResolve(call)) {
      return { rows: [{ id: 1, duration: 200 }, { id: 2, duration: 180 }] };
    }
    if (isQuota(call)) return { rows: [{ created_at: new Date(NOW.getTime() - 5 * 60_000) }] };
    return undefined;
  });
  try {
    const res = await post(app.origin, "/create", goodBody());
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error.code, "rate_limited");
  } finally {
    await app.close();
  }
});

function createdRow() {
  return {
    id: 77,
    title: "Late night set",
    description: null,
    host_user_id: 5,
    starts_at: new Date(NOW.getTime() + 3600_000),
    ends_at: new Date(NOW.getTime() + 3600_000 + 380_000),
    playlist_id: 9,
    status: "scheduled",
    set_tracks: [
      { trackId: 1, durationSec: 200 },
      { trackId: 2, durationSec: 180 },
    ],
    gap_seconds: 0,
    host_display_name: "Host",
  };
}

function happyPath(call: Call) {
  if (isEligibility(call)) return eligible(false, false);
  if (isPublishedTrackResolve(call)) {
    return { rows: [{ id: 1, duration: 200 }, { id: 2, duration: 180 }] };
  }
  if (call.text.includes("SELECT id FROM music_tracks")) return { rows: [{ id: 1 }, { id: 2 }] };
  if (call.text.includes("SELECT 1 FROM users")) return { rows: [{ "?column?": 1 }] };
  if (call.text.includes("INSERT INTO playlists")) return { rows: [{ id: 9 }] };
  if (call.text.includes("INSERT INTO listening_sessions")) return { rows: [{ id: 77 }] };
  if (call.text.includes("WHERE ls.id = $1")) return { rows: [createdRow()] };
  return undefined;
}

test("any signed-in user can create a listening session from any published tracks, with stored lengths", async () => {
  resetRateLimitsForTests();
  const app = await start(happyPath);
  try {
    const res = await post(app.origin, "/create", goodBody({ gapSeconds: 0 }));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.session.id, 77);
    assert.equal(body.session.status, "scheduled");

    const insert = app.calls.find((c) => c.text.includes("INSERT INTO listening_sessions"));
    assert.ok(insert);
    const stored = JSON.parse(String(insert.values[7]));
    assert.deepEqual(stored, [
      { trackId: 1, durationSec: 200 },
      { trackId: 2, durationSec: 180 },
    ]);
    assert.equal(insert.values[2], 5, "the caller is the host");
  } finally {
    await app.close();
    resetRateLimitsForTests();
  }
});

test("two parallel creates for one user: the second is refused while the first is in flight", async () => {
  resetRateLimitsForTests();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const app = await start(async (call) => {
    if (call.text.includes("INSERT INTO playlists")) await gate;
    return happyPath(call);
  });
  try {
    const first = post(app.origin, "/create", goodBody());
    // Let the first request reach the held insert before the second one starts.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = await post(app.origin, "/create", goodBody());
    assert.equal(second.status, 429);
    release();
    assert.equal((await first).status, 201);
    assert.equal(app.calls.filter((c) => c.text.includes("INSERT INTO listening_sessions")).length, 1);
  } finally {
    release();
    await app.close();
    resetRateLimitsForTests();
  }
});

test("my-sessions returns the caller's sessions with the stored status names", async () => {
  const app = await start((call) => {
    if (call.text.includes("WHERE ls.host_user_id = $1")) return { rows: [createdRow()] };
    return undefined;
  });
  try {
    const res = await fetch(`${app.origin}/my-sessions`, { headers: { "x-test-user": "5" } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sessions.length, 1);
    assert.equal(body.sessions[0].status, "scheduled");
    assert.equal(body.sessions[0].trackCount, 2);
    assert.equal(body.rateLimitStatus.maxPerDay, 3);
  } finally {
    await app.close();
  }
});

test("a user cannot cancel someone else's session", async () => {
  const app = await start((call) =>
    call.text.includes("SELECT host_user_id FROM listening_sessions")
      ? { rows: [{ host_user_id: 99 }] }
      : undefined,
  );
  try {
    const res = await post(app.origin, "/3/cancel", {});
    assert.equal(res.status, 403);
    assert.equal(app.calls.some((c) => c.text.includes("UPDATE listening_sessions")), false);
  } finally {
    await app.close();
  }
});

test("the host can cancel their own upcoming session", async () => {
  const app = await start((call) => {
    if (call.text.includes("SELECT host_user_id FROM listening_sessions")) {
      return { rows: [{ host_user_id: 5 }] };
    }
    if (call.text.includes("SELECT id, starts_at, ends_at, status FROM listening_sessions")) {
      return {
        rows: [
          {
            id: 3,
            status: "scheduled",
            starts_at: new Date(NOW.getTime() + 3600_000),
            ends_at: new Date(NOW.getTime() + 7200_000),
          },
        ],
      };
    }
    if (call.text.includes("UPDATE listening_sessions SET status = 'cancelled'")) {
      return { rows: [{ id: 3 }] };
    }
    return undefined;
  });
  try {
    const res = await post(app.origin, "/3/cancel", {});
    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);
  } finally {
    await app.close();
  }
});

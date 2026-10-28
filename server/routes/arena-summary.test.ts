import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import express from "express";

process.env.DATABASE_URL = "postgres://x@127.0.0.1:1/x";
process.env.JWT_SECRET = "x".repeat(40);

const { pool } = await import("../db");
const { globalAuthGate } = await import("../middleware/auth");
const arena = (await import("./arena")).default;

type Row = Record<string, string>;
const queries: string[] = [];
let rows: Row[] = [];
let failure: Error | null = null;

// No database is reachable in this test: every query the router makes is answered here.
(pool as unknown as { query: (text: string) => Promise<{ rows: Row[] }> }).query =
  async (text) => {
    queries.push(text);
    if (failure) throw failure;
    return { rows };
  };

function summaryRow(active: number, total: number, signedUp: number): Row[] {
  return [
    {
      active_contests: String(active),
      total_contests: String(total),
      signed_up_artists: String(signedUp),
    },
  ];
}

async function withServer(fn: (origin: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use(globalAuthGate);
  app.use("/api/arena", arena);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

const get = (origin: string, path: string) =>
  fetch(`${origin}${path}`, { signal: AbortSignal.timeout(3000) });

test("a signed-out visitor gets the arena counts and nothing personal", async () => {
  rows = summaryRow(2, 5, 9);
  failure = null;
  await withServer(async (origin) => {
    const res = await get(origin, "/api/arena/summary");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      success: true,
      activeContests: 2,
      totalContests: 5,
      signedUpArtists: 9,
      threshold: 16,
      canLaunch: false,
    });
  });
});

test("contests can launch from exactly 16 signed-up artists", async () => {
  failure = null;
  await withServer(async (origin) => {
    for (const [signedUp, canLaunch] of [
      [0, false],
      [15, false],
      [16, true],
      [40, true],
    ] as const) {
      rows = summaryRow(0, 0, signedUp);
      const body = await (await get(origin, "/api/arena/summary")).json();
      assert.equal(body.signedUpArtists, signedUp);
      assert.equal(body.threshold, 16);
      assert.equal(body.canLaunch, canLaunch, `${signedUp} artists`);
    }
  });
});

test("signed-up artists use the same eligibility rule as /eligible-artists", async () => {
  rows = summaryRow(0, 0, 0);
  failure = null;
  queries.length = 0;
  await withServer(async (origin) => {
    assert.equal((await get(origin, "/api/arena/summary")).status, 200);
  });
  const sql = queries.join("\n").replace(/\s+/g, " ");
  assert.match(sql, /FROM artist_profiles WHERE is_active = true AND current_badge_tier >= 3/);
  assert.match(sql, /FROM arena_contests WHERE status IN \('open', 'in_progress'\)/);

  const source = readFileSync(new URL("./arena.ts", import.meta.url), "utf8");
  const eligible = source.slice(source.indexOf('router.get("/eligible-artists"'));
  assert.match(
    eligible.replace(/\s+/g, " "),
    /WHERE ap\.is_active = true AND ap\.current_badge_tier >= 3/,
  );
});

test("a database failure is a 500 that leaks nothing", async () => {
  failure = new Error("connect ECONNREFUSED postgres://user:hunter2@db.internal/app");
  try {
    await withServer(async (origin) => {
      const res = await get(origin, "/api/arena/summary");
      assert.equal(res.status, 500);
      const text = await res.text();
      assert.deepEqual(JSON.parse(text), {
        success: false,
        error: "Failed to fetch arena summary",
      });
      assert.doesNotMatch(text, /hunter2|ECONNREFUSED/);
    });
  } finally {
    failure = null;
  }
});

test("the rest of /api/arena behaves as before for a signed-out visitor", async () => {
  rows = [];
  failure = null;
  await withServer(async (origin) => {
    const active = await get(origin, "/api/arena/active");
    assert.equal(active.status, 200);
    assert.deepEqual(await active.json(), { success: true, arenas: [] });

    for (const path of ["/api/arena/eligible-artists", "/api/arena/participation-stats"]) {
      assert.equal((await get(origin, path)).status, 401, path);
    }
    assert.equal((await get(origin, "/api/arena/summary/extra")).status, 401);

    const post = (path: string) =>
      fetch(`${origin}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: "Afrobeats" }),
        signal: AbortSignal.timeout(3000),
      });
    assert.equal((await post("/api/arena/create")).status, 401);
    assert.equal((await post("/api/arena/summary")).status, 401);
  });
});

after(async () => {
  await pool.end().catch(() => {});
  setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
});

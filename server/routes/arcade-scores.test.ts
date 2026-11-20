import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import arcadeScoresRouter from "./arcade-scores";

const player1 = { id: 7, role: "user" };
const player2 = { id: 8, role: "user" };

function forgeRunToken(payload: {
  runId: string;
  userId: number;
  game: string;
  startedAt: number;
}, secret = process.env.JWT_SECRET!) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function scriptedArcadeDb() {
  const rows: any[] = [];
  const seenRunIds = new Set<string>();
  return {
    rows,
    db: scriptPool((sql, params) => {
      if (sql.includes("INSERT INTO arcade_scores")) {
        const [userId, game, runId, score, durationMs, level] = params as [
          number,
          string,
          string,
          number,
          number,
          number,
        ];
        if (seenRunIds.has(runId)) return { rows: [] };
        seenRunIds.add(runId);
        const entry = {
          id: rows.length + 1,
          user_id: userId,
          game,
          run_id: runId,
          score,
          duration_ms: durationMs,
          level,
          created_at: new Date().toISOString(),
        };
        rows.push(entry);
        return { rows: [entry] };
      }
      if (sql.includes("MAX(score)::int AS best_score") && sql.includes("WHERE user_id = $1 AND game = $2")) {
        const [userId, game] = params as [number, string];
        const max = rows
          .filter((r) => r.user_id === userId && r.game === game)
          .reduce((acc, r) => Math.max(acc, r.score), 0);
        return { rows: [{ best_score: max }] };
      }
      if (sql.includes("FROM arcade_scores s")) {
        return {
          rows: [
            {
              user_id: 7,
              display_name: "jdcz",
              score: 420,
              level: 3,
              created_at: "2026-11-20T12:00:00.000Z",
            },
          ],
        };
      }
      if (sql.includes("GROUP BY game")) {
        return {
          rows: [
            { game: "snake", best_score: 420, max_level: 3 },
            { game: "xensia", best_score: 980, max_level: 4 },
          ],
        };
      }
      return { rows: [] };
    }),
  };
}

test("POST /runs requires authentication and rejects invalid games", async () => {
  scriptedArcadeDb();
  await withRouter(arcadeScoresRouter, async (origin) => {
    const anon = await call(origin, "POST", "/runs", { body: { game: "snake" } });
    assert.equal(anon.status, 401);

    const badGame = await call(origin, "POST", "/runs", {
      headers: signIn(player1),
      body: { game: "roulette" },
    });
    assert.equal(badGame.status, 400);

    const ok = await call(origin, "POST", "/runs", {
      headers: signIn(player1),
      body: { game: "xensia" },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body?.game, "xensia");
    assert.ok(typeof ok.body?.runToken === "string" && ok.body.runToken.includes("."));
  });
});

test("POST /scores validates token, plausibility, dedupes by run_id, and never queries wallet tables", async () => {
  const { db } = scriptedArcadeDb();
  await withRouter(arcadeScoresRouter, async (origin) => {
    const anon = await call(origin, "POST", "/scores", {
      body: { game: "snake", score: 10, runToken: "x.y" },
    });
    assert.equal(anon.status, 401);

    const tampered = await call(origin, "POST", "/scores", {
      headers: signIn(player1),
      body: { game: "snake", score: 10, runToken: "tampered.token" },
    });
    assert.equal(tampered.status, 400);

    const otherUserToken = forgeRunToken({
      runId: "run-other-user-1234",
      userId: player2.id,
      game: "snake",
      startedAt: Date.now() - 10_000,
    });
    const wrongUser = await call(origin, "POST", "/scores", {
      headers: signIn(player1),
      body: { game: "snake", score: 100, runToken: otherUserToken },
    });
    assert.equal(wrongUser.status, 403);

    const validToken = forgeRunToken({
      runId: "run-valid-snake-1234",
      userId: player1.id,
      game: "snake",
      startedAt: Date.now() - 12_000,
    });

    const implausible = await call(origin, "POST", "/scores", {
      headers: signIn(player1),
      body: { game: "snake", score: 99_999, runToken: validToken },
    });
    assert.equal(implausible.status, 400);

    const first = await call(origin, "POST", "/scores", {
      headers: signIn(player1),
      body: { game: "snake", score: 240, level: 2, runToken: validToken },
    });
    assert.equal(first.status, 201);
    assert.equal(first.body?.duplicate, false);
    assert.equal(first.body?.isPersonalBest, true);
    assert.equal(first.body?.bestScore, 240);

    const second = await call(origin, "POST", "/scores", {
      headers: signIn(player1),
      body: { game: "snake", score: 240, level: 2, runToken: validToken },
    });
    assert.equal(second.status, 200);
    assert.equal(second.body?.duplicate, true);

    const touchedWallet = db.log.some((entry) =>
      /\b(wallet|wallets|credits|credit_ledger|transactions|paypal|stripe)\b/i.test(entry.sql),
    );
    assert.equal(touchedWallet, false);
  });
});

test("GET /leaderboard is public with display names only, and GET /my-best requires auth", async () => {
  scriptedArcadeDb();
  await withRouter(arcadeScoresRouter, async (origin) => {
    const bad = await call(origin, "GET", "/leaderboard?game=unknown");
    assert.equal(bad.status, 400);

    const lb = await call(origin, "GET", "/leaderboard?game=snake&period=7d");
    assert.equal(lb.status, 200);
    assert.equal(lb.body?.entries?.[0]?.displayName, "jdcz");
    assert.equal("email" in (lb.body?.entries?.[0] || {}), false);

    const myAnon = await call(origin, "GET", "/my-best");
    assert.equal(myAnon.status, 401);

    const myAuthed = await call(origin, "GET", "/my-best", { headers: signIn(player1) });
    assert.equal(myAuthed.status, 200);
    assert.equal(myAuthed.body?.bestByGame?.snake?.score, 420);
    assert.equal(myAuthed.body?.bestByGame?.xensia?.score, 980);
  });
});

test("GeoAdmin arcade config & custom questions require owner role and block disabled games", async () => {
  const settings = new Map<string, unknown>();
  scriptPool((sql, params) => {
    if (sql.includes("SELECT value FROM system_settings WHERE key = $1")) {
      const key = String(params[0]);
      return { rows: settings.has(key) ? [{ value: settings.get(key) }] : [] };
    }
    if (sql.includes("INSERT INTO system_settings")) {
      settings.set(String(params[0]), JSON.parse(String(params[1])));
      return { rows: [] };
    }
    return { rows: [] };
  });

  const prevOwnerEmail = process.env.SUPERADMIN_EMAIL;
  const owner = { id: 18, role: "superuser", email: "superadmin@versoair.com" };
  process.env.SUPERADMIN_EMAIL = owner.email;
  const delegatedAdmin = { id: 23, role: "admin", email: "admin@versoair.com" };
  const signInGeoAdmin = (account: { id: number; role: string; email: string }) => {
    signIn(account);
    const token = jwt.sign(
      {
        userId: account.id,
        email: account.email,
        role: account.role,
        ownerMfa: account.role === "superuser",
        geoAdminCodeAuthenticated: true,
      },
      process.env.JWT_SECRET!,
    );
    return { Authorization: `Bearer ${token}` };
  };

  try {
    await withRouter(arcadeScoresRouter, async (origin) => {
    // Public config defaults to all games enabled
    const pub = await call(origin, "GET", "/config");
    assert.equal(pub.status, 200);
    assert.equal(pub.body?.enabledGames?.snake, true);
    assert.equal(pub.body?.enabledGames?.lyrics, true);

    // Non-owner and delegated admin cannot access GeoAdmin arcade routes
    assert.equal(
      (await call(origin, "GET", "/admin/overview", { headers: signIn(player1) })).status,
      403,
    );
    assert.equal(
      (await call(origin, "GET", "/admin/overview", { headers: signInGeoAdmin(delegatedAdmin) })).status,
      403,
    );

    // Owner pauses snake and sets maintenance banner
    const update = await call(origin, "PUT", "/admin/config", {
      headers: signInGeoAdmin(owner),
      body: { enabledGames: { snake: false }, maintenanceMessage: "Tournoi en préparation" },
    });
    assert.equal(update.status, 200);
    assert.equal(update.body?.config?.enabledGames?.snake, false);

    // Starting a paused game is rejected
    const blockedRun = await call(origin, "POST", "/runs", {
      headers: signIn(player1),
      body: { game: "snake" },
    });
    assert.equal(blockedRun.status, 403);

    // Owner can add and delete a custom lyrics question
    const added = await call(origin, "POST", "/admin/questions", {
      headers: signInGeoAdmin(owner),
      body: {
        category: "lyrics",
        q: "Complétez : 'Verso Air ____ all night'",
        options: ["grooves", "sleeps", "stops", "fades"],
        answer: 0,
      },
    });
    assert.equal(added.status, 201);
    const questionId = added.body?.question?.id;
    assert.ok(typeof questionId === "string" && questionId.length > 0);

    const overview = await call(origin, "GET", "/admin/overview", {
      headers: signInGeoAdmin(owner),
    });
    assert.equal(overview.status, 200);
    assert.equal(overview.body?.customQuestions?.length, 1);

    const removed = await call(origin, "DELETE", `/admin/questions/${questionId}`, {
      headers: signInGeoAdmin(owner),
    });
    assert.equal(removed.status, 200);
  });
  } finally {
    if (prevOwnerEmail === undefined) delete process.env.SUPERADMIN_EMAIL;
    else process.env.SUPERADMIN_EMAIL = prevOwnerEmail;
  }
});

test("POST /runs rate-limits a user who farms run tokens", async () => {
  scriptedArcadeDb();
  const farmer = { id: 99, role: "user" };
  await withRouter(arcadeScoresRouter, async (origin) => {
    let lastStatus = 0;
    for (let i = 0; i < 61; i += 1) {
      const res = await call(origin, "POST", "/runs", {
        headers: signIn(farmer),
        body: { game: "snake" },
      });
      lastStatus = res.status;
      if (i < 60) assert.equal(res.status, 201);
    }
    assert.equal(lastStatus, 429);
  });
});

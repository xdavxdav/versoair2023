import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import gamesRouter from "./games";

const host = { id: 7, role: "user" };
const guest = { id: 8, role: "user" };
const outsider = { id: 9, role: "user" };

function scriptedGamesDb() {
  const base = {
    wager_amount: "0",
    round_count: 3,
    current_round: 0,
    player1_score: 0,
    player2_score: 0,
    game_state: {
      questions: [
        { q: "Q1", options: ["a", "b", "c"], _answer: 2 },
        { q: "Q2", options: ["a", "b", "c"], _answer: 0 },
        { q: "Q3", options: ["a", "b", "c"], _answer: 1 },
      ],
    },
  };
  // player ids come back from pg as numbers
  const matches: Record<number, Record<string, any>> = {
    1: { ...base, id: 1, player1_id: 7, player2_id: null, status: "waiting" },
    2: { ...base, id: 2, player1_id: 7, player2_id: null, status: "waiting", wager_amount: "5.00" },
    3: { ...base, id: 3, player1_id: 7, player2_id: 8, status: "active" },
  };
  return scriptPool((sql, params) => {
    if (sql.startsWith("SELECT * FROM game_matches WHERE id = $1 AND status = 'waiting'")) {
      const match = matches[Number(params[0])];
      return { rows: match?.status === "waiting" ? [match] : [] };
    }
    if (sql.startsWith("SELECT * FROM game_matches WHERE id = $1")) {
      const match = matches[Number(params[0])];
      return { rows: match ? [match] : [] };
    }
    if (sql.startsWith("UPDATE game_matches SET player2_id = $1")) {
      const match = matches[Number(params[1])];
      return { rows: [{ ...match, player2_id: params[0], status: "active" }] };
    }
    if (sql.startsWith("SELECT id FROM game_moves WHERE match_id = $1")) return { rows: [] };
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedGamesDb>;
const changes = (db: ScriptedDb) => db.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

const join = (origin: string, account: typeof host | undefined, id: number) =>
  call(origin, "POST", `/${id}/join`, { headers: account ? signIn(account) : {} });
const answer = (origin: string, account: typeof host, id: number, body: unknown) =>
  call(origin, "POST", `/${id}/answer`, { headers: signIn(account), body });

test("joining a match: not your own, not a wagered one, and the joiner becomes player 2", async () => {
  const db = scriptedGamesDb();
  await withRouter(gamesRouter, async (origin) => {
    assert.equal((await join(origin, undefined, 1)).status, 401);
    assert.equal((await join(origin, guest, 99)).status, 404);

    // The session id is the string "7"; player1_id is the number 7.
    const own = await join(origin, host, 1);
    assert.equal(own.status, 400);
    assert.equal(own.body?.error, "Cannot join your own match");

    assert.equal((await join(origin, guest, 2)).status, 403);
    assert.equal(changes(db).length, 0);

    const joined = await join(origin, guest, 1);
    assert.equal(joined.status, 200, JSON.stringify(joined.body));
    const [update] = db.matching("UPDATE game_matches SET player2_id = $1");
    assert.deepEqual(update.params, [8, 1]);
    // answers never leave the server
    for (const question of joined.body.match.game_state.questions) {
      assert.deepEqual(Object.keys(question).sort(), ["options", "q"]);
    }
  });
});

test("both players can answer, and each one's score goes to their own column", async () => {
  const db = scriptedGamesDb();
  await withRouter(gamesRouter, async (origin) => {
    const first = await answer(origin, host, 3, { answerIndex: 2, responseTimeMs: 1200 });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.isCorrect, true);
    assert.equal(first.body.points, 11);
    assert.deepEqual(db.matching("INSERT INTO game_moves")[0].params.slice(0, 3), [3, 7, 0]);
    assert.deepEqual(db.matching("SET player1_score = $1 WHERE id = $2")[0].params, [11, 3]);

    const second = await answer(origin, guest, 3, { answerIndex: 0, responseTimeMs: 9000 });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.equal(second.body.isCorrect, false);
    assert.equal(second.body.points, 0);
    assert.deepEqual(db.matching("INSERT INTO game_moves")[1].params.slice(0, 3), [3, 8, 0]);
    assert.equal(db.matching("SET player2_score = $1 WHERE id = $2").length, 1);
  });
});

test("someone who is not in the match cannot answer in it", async () => {
  const db = scriptedGamesDb();
  await withRouter(gamesRouter, async (origin) => {
    assert.equal((await call(origin, "POST", "/3/answer", { body: { answerIndex: 2 } })).status, 401);

    const res = await answer(origin, outsider, 3, { answerIndex: 2 });
    assert.equal(res.status, 403);
    assert.equal(res.body?.error, "Not a participant");

    assert.equal((await answer(origin, host, 99, { answerIndex: 2 })).status, 404);
  });
  assert.equal(changes(db).length, 0);
});

test("solo lyrics/trivia match returns next round match state and caps round_count to question bank", async () => {
  const soloMatch: Record<string, any> = {
    id: 10,
    game_type: "lyrics",
    player1_id: 7,
    player2_id: null,
    wager_amount: "0",
    round_count: 2,
    current_round: 0,
    player1_score: 0,
    player2_score: 0,
    status: "active",
    game_state: {
      questions: [
        { q: "Lyrics 1", options: ["A", "B", "C", "D"], _answer: 1 },
        { q: "Lyrics 2", options: ["A", "B", "C", "D"], _answer: 3 },
      ],
    },
  };

  scriptPool((sql, params) => {
    if (sql.includes("SELECT value FROM system_settings")) return { rows: [] };
    if (sql.includes("INSERT INTO game_matches")) {
      const [gameType, , wager, roundCount, status] = params;
      return {
        rows: [
          {
            id: 11,
            game_type: gameType,
            wager_amount: wager,
            round_count: roundCount,
            status,
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    if (sql.startsWith("SELECT * FROM game_matches WHERE id = $1")) {
      return { rows: Number(params[0]) === 10 ? [soloMatch] : [] };
    }
    if (sql.startsWith("SELECT 1 FROM game_moves")) return { rows: [] };
    if (sql.startsWith("SELECT id FROM game_moves")) return { rows: [] };
    if (sql.startsWith("UPDATE game_matches SET player1_score = $1, current_round = $2")) {
      soloMatch.player1_score = Number(params[0]);
      soloMatch.current_round = Number(params[1]);
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE game_matches SET status = 'completed'")) {
      soloMatch.status = "completed";
      soloMatch.winner_id = Number(params[0]);
      return { rows: [] };
    }
    return { rows: [] };
  });

  await withRouter(gamesRouter, async (origin) => {
    // Creating a lyrics challenge with rounds: 10 caps round_count to the actual questions length (6 built-in)
    const created = await call(origin, "POST", "/challenge", {
      headers: signIn(host),
      body: { game_type: "lyrics", wager_amount: 0, round_count: 10 },
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal(
      created.body.match.roundCount,
      created.body.match.gameState.questions.length,
    );

    // Round 0 answer returns updated match with current_round = 1 and snake_case + camelCase fields
    const r0 = await answer(origin, host, 10, { answerIndex: 1, responseTimeMs: 1000 });
    assert.equal(r0.status, 200, JSON.stringify(r0.body));
    assert.equal(r0.body.isCorrect, true);
    assert.equal(r0.body.is_correct, true);
    assert.equal(r0.body.correct_index, 1);
    assert.equal(r0.body.matchComplete, false);
    assert.equal(r0.body.match?.current_round, 1);
    assert.equal(r0.body.your_score > 0, true);
    // Server answers must never leak in match payload
    for (const q of r0.body.match.game_state.questions) {
      assert.equal("_answer" in q, false);
    }

    // Final round completes the match
    const r1 = await answer(origin, host, 10, { answerIndex: 3, responseTimeMs: 1500 });
    assert.equal(r1.status, 200, JSON.stringify(r1.body));
    assert.equal(r1.body.matchComplete, true);
    assert.equal(r1.body.match?.status, "completed");
    assert.equal(r1.body.winner, 7);
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { CHALLENGE_EXPIRY_MINUTES } from "../../shared/arcade-rules";
import {
  buildGameState,
  countedMatchSql,
  decideAnswer,
  decideCancel,
  decideJoin,
  expiresInSecondsSql,
  isExpiredSql,
  isPracticeState,
  openChallengeSql,
  parseAnswerIndex,
  parseRound,
  resolveWinnerId,
  sanitizeResponseTime,
  scoreAnswer,
  toMatchSummary,
  toMatchView,
  toPublicState,
  viewerResult,
  type MatchRow,
} from "./arcade-matches";

const base: MatchRow = {
  id: 1,
  game_type: "trivia",
  player1_id: 10,
  player2_id: null,
  wager_amount: "0.00",
  round_count: 3,
  current_round: 0,
  player1_score: 0,
  player2_score: 0,
  status: "waiting",
  is_expired: false,
  game_state: { questions: [{ q: "q", options: ["a", "b", "c", "d"], _answer: 1, lang: "fr" }] },
};
const match = (patch: Partial<MatchRow>): MatchRow => ({ ...base, ...patch });
const denied = (d: ReturnType<typeof decideJoin>) => (d.ok ? null : `${d.status} ${d.code}`);

test("joining: a live challenge from someone else can be joined", () => {
  assert.deepEqual(decideJoin(match({}), 20), { ok: true });
});

test("joining: an expired challenge is refused with 410 CHALLENGE_EXPIRED, for everyone", () => {
  assert.equal(denied(decideJoin(match({ is_expired: true }), 20)), "410 CHALLENGE_EXPIRED");
  assert.equal(denied(decideJoin(match({ is_expired: true }), 10)), "410 CHALLENGE_EXPIRED");
});

test("joining: started, finished and cancelled matches cannot be joined", () => {
  for (const status of ["active", "completed", "cancelled"]) {
    assert.equal(denied(decideJoin(match({ status, player2_id: 30 }), 20)), "409 MATCH_ALREADY_STARTED", status);
  }
});

test("joining: your own challenge, and other people's practice games", () => {
  assert.equal(denied(decideJoin(match({}), 10)), "400 CANNOT_JOIN_OWN_MATCH");
  const practice = match({ status: "active", game_state: { practice: true, questions: [] } });
  assert.equal(denied(decideJoin(practice, 20)), "404 MATCH_NOT_FOUND");
  assert.equal(denied(decideJoin(practice, 10)), "409 MATCH_ALREADY_STARTED");
});

test("joining: paid matches stay closed", () => {
  assert.equal(denied(decideJoin(match({ wager_amount: "5.00" }), 20)), "403 PAID_PLAY_CLOSED");
});

const active = (patch: Partial<MatchRow> = {}) => match({ status: "active", player2_id: 20, ...patch });
const open = { round: null, alreadyAnswered: false };

test("answering: only active matches accept answers", () => {
  assert.deepEqual(decideAnswer(active(), 10, open), { ok: true });
  assert.equal(denied(decideAnswer(match({}), 10, open)), "409 MATCH_WAITING");
  assert.equal(denied(decideAnswer(match({ is_expired: true }), 10, open)), "410 CHALLENGE_EXPIRED");
  assert.equal(denied(decideAnswer(active({ status: "completed" }), 10, open)), "409 MATCH_FINISHED");
  assert.equal(denied(decideAnswer(active({ status: "cancelled" }), 10, open)), "409 MATCH_NOT_ACTIVE");
  assert.equal(denied(decideAnswer(active({ current_round: 3 }), 10, open)), "409 MATCH_FINISHED");
});

test("answering: outsiders are refused before anything about the match is revealed", () => {
  assert.equal(denied(decideAnswer(match({}), 99, open)), "403 NOT_A_PARTICIPANT");
  assert.equal(denied(decideAnswer(active(), 99, open)), "403 NOT_A_PARTICIPANT");
  const practice = active({ player2_id: null, game_state: { practice: true } });
  assert.equal(denied(decideAnswer(practice, 20, open)), "403 NOT_A_PARTICIPANT");
  assert.deepEqual(decideAnswer(practice, 10, open), { ok: true });
});

test("answering: one answer per player per round", () => {
  assert.equal(denied(decideAnswer(active(), 10, { round: 0, alreadyAnswered: true })), "409 ALREADY_ANSWERED");
  assert.equal(denied(decideAnswer(active(), 10, { round: null, alreadyAnswered: true })), "409 ALREADY_ANSWERED");
  assert.equal(denied(decideAnswer(active({ current_round: 2 }), 10, { round: 1, alreadyAnswered: false })), "409 ALREADY_ANSWERED");
  assert.equal(denied(decideAnswer(active({ current_round: 1 }), 10, { round: 2, alreadyAnswered: false })), "409 ROUND_MISMATCH");
  assert.deepEqual(decideAnswer(active({ current_round: 1 }), 10, { round: 1, alreadyAnswered: false }), { ok: true });
});

test("answering: paid matches stay closed", () => {
  assert.equal(denied(decideAnswer(active({ wager_amount: 5 }), 10, open)), "403 PAID_PLAY_CLOSED");
});

test("cancelling: only the creator, only while waiting", () => {
  assert.deepEqual(decideCancel(match({}), 10), { ok: true });
  assert.deepEqual(decideCancel(match({ is_expired: true }), 10), { ok: true });
  assert.equal(denied(decideCancel(match({}), 20)), "403 NOT_YOUR_CHALLENGE");
  assert.equal(denied(decideCancel(active(), 10)), "409 MATCH_NOT_WAITING");
  assert.equal(denied(decideCancel(match({ status: "cancelled" }), 10)), "409 MATCH_NOT_WAITING");
});

test("scoring: 10 points for a right answer, 1 extra under five seconds, nothing for a wrong one", () => {
  assert.equal(scoreAnswer(true, 1200), 11);
  assert.equal(scoreAnswer(true, 4999), 11);
  assert.equal(scoreAnswer(true, 5000), 10);
  assert.equal(scoreAnswer(true, null), 10);
  assert.equal(scoreAnswer(true, 0), 10);
  assert.equal(scoreAnswer(false, 100), 0);
});

test("input parsing", () => {
  assert.equal(parseAnswerIndex(2), 2);
  assert.equal(parseAnswerIndex(0), 0);
  for (const bad of [-1, 4, 1.5, "1", null, undefined, NaN, {}]) assert.equal(parseAnswerIndex(bad), null, String(bad));
  assert.equal(sanitizeResponseTime(1234.6), 1235);
  assert.equal(sanitizeResponseTime(-5), null);
  assert.equal(sanitizeResponseTime("12"), null);
  assert.equal(sanitizeResponseTime(Infinity), null);
  assert.equal(sanitizeResponseTime(10 ** 9), 600000);
  assert.equal(parseRound(undefined), null);
  assert.equal(parseRound(null), null);
  assert.equal(parseRound(0), 0);
  assert.equal(parseRound(3), 3);
  for (const bad of [-1, 1.5, "1", NaN]) assert.equal(parseRound(bad), "invalid", String(bad));
});

test("winner: a tie is a draw, practice has no winner", () => {
  const scored = (p1: number, p2: number) => ({ player1_id: 10, player2_id: 20, player1_score: p1, player2_score: p2 });
  assert.equal(resolveWinnerId(scored(30, 20), false), 10);
  assert.equal(resolveWinnerId(scored(20, 30), false), 20);
  assert.equal(resolveWinnerId(scored(20, 20), false), null);
  assert.equal(resolveWinnerId({ player1_id: 10, player2_id: null, player1_score: 50, player2_score: 0 }, true), null);
});

test("game state: practice flag and language are stored, answers never leave the server", () => {
  const state = buildGameState({
    questions: [{ q: "Q", options: ["a", "b", "c", "d"], answer: 3, lang: "fr" }],
    practice: true,
    language: "en",
  });
  assert.deepEqual(state, {
    questions: [{ q: "Q", options: ["a", "b", "c", "d"], _answer: 3, lang: "fr" }],
    practice: true,
    language: "en",
  });
  assert.equal(isPracticeState(state), true);
  assert.equal(isPracticeState({}), false);
  assert.equal(isPracticeState(null), false);
  assert.equal(isPracticeState({ practice: "true" }), false);

  const safe = toPublicState(state);
  assert.deepEqual(safe, {
    questions: [{ q: "Q", options: ["a", "b", "c", "d"], lang: "fr" }],
    practice: true,
    language: "en",
  });
  assert.ok(!JSON.stringify(safe).includes("_answer"));
  assert.deepEqual(toPublicState(null), { questions: [] });

  const pvp = buildGameState({ questions: [], practice: false, language: "es" });
  assert.equal(pvp.practice, undefined);
});

test("match view: an expired challenge reads as expired, solo games read as practice", () => {
  const live = toMatchSummary(match({ expires_in_seconds: 1500 }), 10);
  assert.equal(live.status, "waiting");
  assert.equal(live.expiresInSeconds, 1500);
  assert.equal(live.practice, false);
  assert.equal(live.isCreator, true);

  const expired = toMatchSummary(match({ is_expired: true, expires_in_seconds: 0 }), 10);
  assert.equal(expired.status, "expired");
  assert.equal(expired.expiresInSeconds, null);

  const practice = toMatchSummary(match({ status: "active", game_state: { practice: true } }), 10);
  assert.equal(practice.practice, true);
  const legacySolo = toMatchSummary(match({ status: "completed" }), 10);
  assert.equal(legacySolo.practice, true, "old no-opponent matches are solo games");
  assert.equal(toMatchSummary(match({ status: "cancelled" }), 10).practice, false);
});

test("match view: scores and names are from the viewer's side and no answer key is exposed", () => {
  const row = match({
    status: "active",
    player2_id: 20,
    player1_score: 21,
    player2_score: 10,
    player1_name: "ann",
    player2_name: "bob",
  });
  const asCreator = toMatchView(row, 10, { hasAnswered: true });
  assert.equal(asCreator.yourScore, 21);
  assert.equal(asCreator.opponentScore, 10);
  assert.equal(asCreator.opponentName, "bob");
  assert.equal(asCreator.hasAnswered, true);
  const asJoiner = toMatchView(row, 20);
  assert.equal(asJoiner.yourScore, 10);
  assert.equal(asJoiner.opponentName, "ann");
  assert.equal(asJoiner.isCreator, false);
  assert.ok(!JSON.stringify(asCreator).includes("_answer"));
  assert.ok(!("wager_amount" in asCreator) && !("wagerAmount" in asCreator));
});

test("results: won, lost, draw, and none for practice or unfinished games", () => {
  const done = (winner: number | null, patch: Partial<MatchRow> = {}) =>
    ({ ...match({ status: "completed", player2_id: 20, ...patch }), winner_id: winner });
  assert.equal(viewerResult(done(10), 10), "won");
  assert.equal(viewerResult(done(10), 20), "lost");
  assert.equal(viewerResult(done(null), 10), "draw");
  assert.equal(viewerResult(done(null, { game_state: { practice: true } }), 10), null);
  assert.equal(viewerResult(done(null, { player2_id: null }), 10), null);
  assert.equal(viewerResult({ ...done(10), status: "active" }, 10), null);
});

test("SQL fragments use the one expiry constant and keep practice out of counted matches", () => {
  for (const sql of [isExpiredSql("gm"), expiresInSecondsSql("gm"), openChallengeSql("gm")]) {
    assert.ok(sql.includes(`${CHALLENGE_EXPIRY_MINUTES} minutes`), sql);
  }
  assert.ok(isExpiredSql("m").includes("m.status = 'waiting'"));
  assert.ok(isExpiredSql("m").includes("m.created_at <= NOW()"));
  const open = openChallengeSql("gm");
  assert.ok(open.includes("gm.status = 'waiting'"));
  assert.ok(open.includes("gm.player2_id IS NULL"));
  assert.ok(open.includes("practice"));
  const counted = countedMatchSql("gm");
  assert.ok(counted.includes("gm.status = 'completed'"));
  assert.ok(counted.includes("gm.player2_id IS NOT NULL"));
  assert.ok(counted.includes("game_state->>'practice'"));
});

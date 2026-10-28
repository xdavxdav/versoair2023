/**
 * Pure Arcade match rules: who may do what to a match, how answers are scored,
 * and the SQL fragments that apply the 30-minute expiry lazily.
 * The routes in server/routes/games.ts run these decisions inside a
 * transaction on a row-locked match, so parallel requests cannot slip past them.
 */
import {
  CHALLENGE_EXPIRY_MINUTES,
  type ArcadeErrorCode,
  type ArcadeLanguage,
} from "@shared/arcade-rules";
import type { BankQuestion } from "./arcade-questions";

export interface MatchRow {
  id: number;
  game_type: string;
  player1_id: number;
  player2_id: number | null;
  wager_amount?: string | number | null;
  round_count: number;
  current_round: number | null;
  player1_score: number | null;
  player2_score: number | null;
  status: string;
  /** Computed in SQL (see isExpiredSql): a waiting challenge older than the expiry window. */
  is_expired?: boolean;
  game_state: Record<string, any> | null;
}

export type Decision =
  | { ok: true }
  | { ok: false; status: number; code: ArcadeErrorCode };

const allow: Decision = { ok: true };
const deny = (status: number, code: ArcadeErrorCode): Decision => ({
  ok: false,
  status,
  code,
});

const wagerOf = (match: Pick<MatchRow, "wager_amount">) =>
  parseFloat(String(match.wager_amount ?? "0")) || 0;

export function isPracticeState(state: unknown): boolean {
  return (
    !!state &&
    typeof state === "object" &&
    (state as Record<string, unknown>).practice === true
  );
}

export function decideJoin(match: MatchRow, userId: number): Decision {
  const practice = isPracticeState(match.game_state);
  if (practice) {
    return match.player1_id === userId
      ? deny(409, "MATCH_ALREADY_STARTED")
      : deny(404, "MATCH_NOT_FOUND");
  }
  if (match.status === "waiting" && match.is_expired) {
    return deny(410, "CHALLENGE_EXPIRED");
  }
  if (match.status !== "waiting" || match.player2_id) {
    return deny(409, "MATCH_ALREADY_STARTED");
  }
  if (match.player1_id === userId) return deny(400, "CANNOT_JOIN_OWN_MATCH");
  if (wagerOf(match) > 0) return deny(403, "PAID_PLAY_CLOSED");
  return allow;
}

export function decideAnswer(
  match: MatchRow,
  userId: number,
  input: { round: number | null; alreadyAnswered: boolean },
): Decision {
  if (wagerOf(match) > 0) return deny(403, "PAID_PLAY_CLOSED");
  if (match.player1_id !== userId && match.player2_id !== userId) {
    return deny(403, "NOT_A_PARTICIPANT");
  }
  if (match.status === "waiting") {
    return match.is_expired
      ? deny(410, "CHALLENGE_EXPIRED")
      : deny(409, "MATCH_WAITING");
  }
  if (match.status === "completed") return deny(409, "MATCH_FINISHED");
  if (match.status !== "active") return deny(409, "MATCH_NOT_ACTIVE");

  const currentRound = match.current_round ?? 0;
  if (currentRound >= match.round_count) return deny(409, "MATCH_FINISHED");
  if (input.round !== null && input.round !== currentRound) {
    return input.round < currentRound
      ? deny(409, "ALREADY_ANSWERED")
      : deny(409, "ROUND_MISMATCH");
  }
  if (input.alreadyAnswered) return deny(409, "ALREADY_ANSWERED");
  return allow;
}

export function decideCancel(match: MatchRow, userId: number): Decision {
  if (match.player1_id !== userId) return deny(403, "NOT_YOUR_CHALLENGE");
  if (match.status !== "waiting") return deny(409, "MATCH_NOT_WAITING");
  return allow;
}

export function parseAnswerIndex(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 3
    ? value
    : null;
}

/** null when the client did not say which round it is answering. */
export function parseRound(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : "invalid";
}

const MAX_RESPONSE_TIME_MS = 10 * 60 * 1000;

export function sanitizeResponseTime(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.min(Math.round(value), MAX_RESPONSE_TIME_MS);
}

/** 10 points for a right answer, +1 when answered in under five seconds. */
export function scoreAnswer(
  isCorrect: boolean,
  responseTimeMs: number | null,
): number {
  if (!isCorrect) return 0;
  const speedBonus = responseTimeMs && responseTimeMs < 5000 ? 1 : 0;
  return 10 + speedBonus;
}

/** A tie is a draw (no winner). Practice games never have one. */
export function resolveWinnerId(
  match: Pick<
    MatchRow,
    "player1_id" | "player2_id" | "player1_score" | "player2_score"
  >,
  practice: boolean,
): number | null {
  if (practice || !match.player2_id) return null;
  const p1 = match.player1_score ?? 0;
  const p2 = match.player2_score ?? 0;
  if (p1 === p2) return null;
  return p1 > p2 ? match.player1_id : match.player2_id;
}

export interface StoredQuestion {
  q: string;
  options: readonly string[];
  _answer: number;
  lang: ArcadeLanguage;
}

export function buildGameState(input: {
  questions: readonly BankQuestion[];
  practice: boolean;
  language: ArcadeLanguage;
}) {
  return {
    questions: input.questions.map<StoredQuestion>((item) => ({
      q: item.q,
      options: item.options,
      _answer: item.answer,
      lang: item.lang,
    })),
    ...(input.practice ? { practice: true } : {}),
    language: input.language,
  };
}

/** The state a browser may see: no answer keys. */
export function toPublicState(state: Record<string, any> | null | undefined) {
  const source = state ?? {};
  const questions = Array.isArray(source.questions) ? source.questions : [];
  return {
    questions: questions.map((item: any) => ({
      q: item.q,
      options: item.options,
      ...(item.lang ? { lang: item.lang } : {}),
    })),
    ...(source.practice === true ? { practice: true } : {}),
    ...(source.language ? { language: source.language } : {}),
  };
}

export interface MatchViewRow extends MatchRow {
  winner_id?: number | null;
  expires_in_seconds?: number | null;
  player1_name?: string | null;
  player2_name?: string | null;
  created_at?: Date | string | null;
  completed_at?: Date | string | null;
}

export type MatchResult = "won" | "lost" | "draw";

/** How a finished two-player match ended for this player. Practice games have no result. */
export function viewerResult(
  row: Pick<MatchViewRow, "status" | "player2_id" | "winner_id" | "game_state">,
  viewerId: number,
): MatchResult | null {
  if (row.status !== "completed" || !row.player2_id) return null;
  if (isPracticeState(row.game_state)) return null;
  if (!row.winner_id) return "draw";
  return row.winner_id === viewerId ? "won" : "lost";
}

const asIso = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

/**
 * A match as one of its players sees it. `status` is "expired" once a waiting
 * challenge is past the expiry window, even though the stored status is still
 * "waiting" (expiry is applied lazily, never written by a cron).
 * Solo games (practice, and legacy no-opponent matches) are flagged `practice`.
 */
export function toMatchSummary(row: MatchViewRow, viewerId: number) {
  const status =
    row.status === "waiting" && row.is_expired ? "expired" : row.status;
  const isCreator = row.player1_id === viewerId;
  const practice =
    isPracticeState(row.game_state) ||
    (!row.player2_id && (row.status === "active" || row.status === "completed"));
  return {
    id: row.id,
    gameType: row.game_type,
    status,
    practice,
    roundCount: row.round_count,
    currentRound: row.current_round ?? 0,
    yourScore: (isCreator ? row.player1_score : row.player2_score) ?? 0,
    opponentScore: (isCreator ? row.player2_score : row.player1_score) ?? 0,
    isCreator,
    opponentName:
      (isCreator ? row.player2_name : row.player1_name) ?? null,
    result: viewerResult(row, viewerId),
    expiresInSeconds:
      status === "waiting" ? (row.expires_in_seconds ?? null) : null,
    language: (row.game_state?.language as string | undefined) ?? null,
    createdAt: asIso(row.created_at),
    completedAt: asIso(row.completed_at),
  };
}

export function toMatchView(
  row: MatchViewRow,
  viewerId: number,
  extras: { hasAnswered?: boolean; opponentAnswered?: boolean } = {},
) {
  return {
    ...toMatchSummary(row, viewerId),
    hasAnswered: extras.hasAnswered ?? false,
    opponentAnswered: extras.opponentAnswered ?? false,
    gameState: toPublicState(row.game_state),
  };
}

// SQL fragments. The expiry is evaluated by the database against NOW(), so
// every query and join sees the same answer and no cron is needed.
const EXPIRY_INTERVAL = `INTERVAL '${CHALLENGE_EXPIRY_MINUTES} minutes'`;

export const isExpiredSql = (alias = "gm") =>
  `(${alias}.status = 'waiting' AND ${alias}.created_at <= NOW() - ${EXPIRY_INTERVAL})`;

export const expiresInSecondsSql = (alias = "gm") =>
  `GREATEST(0, CEIL(EXTRACT(EPOCH FROM (${alias}.created_at + ${EXPIRY_INTERVAL} - NOW()))))::int`;

export const practiceSql = (alias = "gm") =>
  `COALESCE(${alias}.game_state->>'practice', 'false') = 'true'`;

/** A challenge someone else can still join. */
export const openChallengeSql = (alias = "gm") =>
  `(${alias}.status = 'waiting' AND ${alias}.player2_id IS NULL AND NOT ${practiceSql(alias)} AND ${alias}.created_at > NOW() - ${EXPIRY_INTERVAL})`;

/** Finished two-player matches: the only ones that count for stats and the leaderboard. */
export const countedMatchSql = (alias = "gm") =>
  `(${alias}.status = 'completed' AND ${alias}.player2_id IS NOT NULL AND NOT ${practiceSql(alias)})`;

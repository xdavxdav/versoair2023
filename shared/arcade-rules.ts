/**
 * Arcade rules shared by the server routes, the Arcade page and the native
 * EN/FR/ES dictionary. Keep every number or code that more than one of them
 * needs in this file so they cannot drift apart.
 */

// An open challenge that nobody joins is expired after this many minutes.
// The server enforces it lazily in SQL (no cron); the lobby shows the countdown.
export const CHALLENGE_EXPIRY_MINUTES = 30;

export const ARCADE_MIN_ROUNDS = 3;
export const ARCADE_MAX_ROUNDS = 10;
export const ARCADE_DEFAULT_ROUNDS = 10;

export const ARCADE_LANGUAGES = ["en", "fr", "es"] as const;
export type ArcadeLanguage = (typeof ARCADE_LANGUAGES)[number];
export const DEFAULT_ARCADE_LANGUAGE: ArcadeLanguage = "en";

export function isArcadeLanguage(value: unknown): value is ArcadeLanguage {
  return (
    typeof value === "string" &&
    (ARCADE_LANGUAGES as readonly string[]).includes(value)
  );
}

/** "fr", "FR", " fr-CA " -> "fr". Anything that is not en|fr|es -> "en". */
export function parseArcadeLanguage(value: unknown): ArcadeLanguage {
  if (typeof value !== "string") return DEFAULT_ARCADE_LANGUAGE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isArcadeLanguage(primary) ? primary : DEFAULT_ARCADE_LANGUAGE;
}

// Machine-readable codes the server returns in `code`; the page turns each one
// into native EN/FR/ES text, so the server never sends user-facing prose in
// another language. `error` always carries the English text below.
export const ARCADE_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "INVALID_GAME_TYPE",
  "GAME_NOT_AVAILABLE",
  "INVALID_REQUEST",
  "PAID_PLAY_CLOSED",
  "MATCH_NOT_FOUND",
  "CHALLENGE_EXPIRED",
  "CANNOT_JOIN_OWN_MATCH",
  "MATCH_ALREADY_STARTED",
  "MATCH_NOT_WAITING",
  "NOT_A_PARTICIPANT",
  "NOT_YOUR_CHALLENGE",
  "MATCH_WAITING",
  "MATCH_FINISHED",
  "MATCH_NOT_ACTIVE",
  "ALREADY_ANSWERED",
  "ROUND_MISMATCH",
  "INVALID_ANSWER",
  "NO_QUESTION",
  "SERVER_ERROR",
] as const;

// Codes of the paid-play gates. They stay in the server code but are closed:
// nothing on the public Arcade advertises them.
export const ARCADE_DORMANT_ERROR_CODES = [
  "DATE_OF_BIRTH_REQUIRED",
  "UNDERAGE",
  "CONTRACT_REQUIRED",
  "AGE_VERIFICATION_REQUIRED",
  "FUNDS_REQUIRED",
] as const;

export type ArcadeErrorCode =
  | (typeof ARCADE_ERROR_CODES)[number]
  | (typeof ARCADE_DORMANT_ERROR_CODES)[number];

export const ARCADE_ERROR_MESSAGES = {
  NOT_AUTHENTICATED: "Please sign in to play.",
  INVALID_GAME_TYPE: "That game does not exist.",
  GAME_NOT_AVAILABLE: "That game is not available yet.",
  INVALID_REQUEST: "That request is not valid.",
  PAID_PLAY_CLOSED: "Arcade games are free to play. Paid play is closed.",
  MATCH_NOT_FOUND: "That match was not found.",
  CHALLENGE_EXPIRED: "This challenge has expired.",
  CANNOT_JOIN_OWN_MATCH: "You cannot join your own challenge.",
  MATCH_ALREADY_STARTED: "This match has already started.",
  MATCH_NOT_WAITING: "This challenge is no longer waiting for an opponent.",
  NOT_A_PARTICIPANT: "You are not a player in this match.",
  NOT_YOUR_CHALLENGE: "Only the player who opened this challenge can cancel it.",
  MATCH_WAITING: "This match is still waiting for an opponent.",
  MATCH_FINISHED: "This match is already finished.",
  MATCH_NOT_ACTIVE: "This match is not active.",
  ALREADY_ANSWERED: "You already answered this round.",
  ROUND_MISMATCH: "That answer is for a different round.",
  INVALID_ANSWER: "That answer is not valid.",
  NO_QUESTION: "This round has no question.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  DATE_OF_BIRTH_REQUIRED: "Date of birth required",
  UNDERAGE: "You must be 18 or older.",
  CONTRACT_REQUIRED: "A signed contract is required.",
  AGE_VERIFICATION_REQUIRED: "Age verification required",
  FUNDS_REQUIRED: "Insufficient funds",
} as const satisfies Record<ArcadeErrorCode, string>;

export const ARCADE_EVENT_CODES = [
  "opponent_joined",
  "opponent_answered",
  "round_complete",
  "match_complete",
] as const;
export type ArcadeEventCode = (typeof ARCADE_EVENT_CODES)[number];

export function isArcadeEventCode(value: unknown): value is ArcadeEventCode {
  return (
    typeof value === "string" &&
    (ARCADE_EVENT_CODES as readonly string[]).includes(value)
  );
}

/**
 * Pure question selection for Arcade matches.
 *
 * Rules (see docs/arcade-question-bank.md):
 *  1. Questions written in the visitor's language come first.
 *  2. A short bank is topped up from English, then from any other language.
 *  3. A match never serves fewer questions than the round count while enough
 *     distinct questions exist, and never repeats one (translations of one
 *     question share a `group` and count once).
 *  4. Selection is deterministic for a seeded RNG, so it can be tested exactly.
 */
import {
  ARCADE_DEFAULT_ROUNDS,
  ARCADE_MAX_ROUNDS,
  ARCADE_MIN_ROUNDS,
  type ArcadeLanguage,
} from "@shared/arcade-rules";

export interface BankQuestion {
  /** Question text, written in `lang`. Must be unique across the whole bank. */
  q: string;
  /** Exactly four answers. */
  options: readonly string[];
  /** Index (0-3) of the correct option. Never sent to the client. */
  answer: number;
  /** Language the question text is written in. */
  lang: ArcadeLanguage;
  /** Translations of the same question share one group id so a match never serves both. */
  group?: string;
}

export type Rng = () => number;

/** mulberry32: tiny, fast and good enough for shuffling; deterministic per seed. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy (the usual sort(() => Math.random() - 0.5) is biased). */
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function selectQuestions(
  bank: readonly BankQuestion[],
  options: { language: ArcadeLanguage; count: number; rng?: Rng },
): BankQuestion[] {
  const { language, rng = Math.random } = options;
  const count = Math.max(0, Math.floor(Number(options.count) || 0));
  if (count === 0) return [];

  const tiers: BankQuestion[][] = [
    bank.filter((item) => item.lang === language),
    language === "en" ? [] : bank.filter((item) => item.lang === "en"),
    bank.filter((item) => item.lang !== language && item.lang !== "en"),
  ];

  const picked: BankQuestion[] = [];
  const used = new Set<string>();
  for (const tier of tiers) {
    for (const item of shuffled(tier, rng)) {
      if (picked.length >= count) return picked;
      const key = item.group ?? item.q;
      if (used.has(key)) continue;
      used.add(key);
      picked.push(item);
    }
  }
  return picked;
}

/**
 * Rounds for a new match: the requested number (default 10) kept within the
 * allowed range, then lowered to what the bank can actually serve so a match
 * can always finish.
 */
export function resolveRoundCount(requested: unknown, available: number): number {
  const parsed = Math.floor(Number(requested));
  const wanted = Number.isFinite(parsed) && parsed > 0 ? parsed : ARCADE_DEFAULT_ROUNDS;
  const allowed = Math.min(Math.max(wanted, ARCADE_MIN_ROUNDS), ARCADE_MAX_ROUNDS);
  return Math.max(0, Math.min(allowed, available));
}

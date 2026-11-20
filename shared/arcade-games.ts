export const CASUAL_ARCADE_GAME_IDS = [
  "snake",
  "tetris",
  "brick_ball",
  "xensia",
] as const;

export type CasualArcadeGameId = (typeof CASUAL_ARCADE_GAME_IDS)[number];

export interface CasualArcadeGameMeta {
  id: CasualArcadeGameId;
  name: string;
  tagline: string;
  maxScore: number;
  maxRatePerSec: number;
  baseGraceScore: number;
}

export const CASUAL_ARCADE_GAMES: Record<
  CasualArcadeGameId,
  CasualArcadeGameMeta
> = {
  snake: {
    id: "snake",
    name: "Snake",
    tagline: "Serpent néon • Swipe ou D-pad",
    maxScore: 50_000,
    maxRatePerSec: 80,
    baseGraceScore: 150,
  },
  tetris: {
    id: "tetris",
    name: "Tetris",
    tagline: "Blocs Royale • Lignes & combos",
    maxScore: 500_000,
    maxRatePerSec: 180,
    baseGraceScore: 300,
  },
  brick_ball: {
    id: "brick_ball",
    name: "Brick Ball",
    tagline: "Casse-briques • Glisser la raquette",
    maxScore: 250_000,
    maxRatePerSec: 150,
    baseGraceScore: 250,
  },
  xensia: {
    id: "xensia",
    name: "Xensia",
    tagline: "Capture de territoire • Style Xonix",
    maxScore: 300_000,
    maxRatePerSec: 250,
    baseGraceScore: 350,
  },
};

export const ARCADE_RUN_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;
export const ARCADE_MIN_RUN_AGE_FOR_SCORE_MS = 1_500;

export function isCasualArcadeGameId(
  value: unknown,
): value is CasualArcadeGameId {
  return (
    typeof value === "string" &&
    (CASUAL_ARCADE_GAME_IDS as readonly string[]).includes(value)
  );
}

export function isScorePlausible(
  game: CasualArcadeGameId,
  score: number,
  elapsedMs: number,
): { ok: true } | { ok: false; reason: string } {
  const meta = CASUAL_ARCADE_GAMES[game];
  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, reason: "Score invalide" };
  }
  if (score > meta.maxScore) {
    return { ok: false, reason: "Score hors limites" };
  }
  if (score === 0) return { ok: true };
  if (elapsedMs < ARCADE_MIN_RUN_AGE_FOR_SCORE_MS) {
    return { ok: false, reason: "Partie trop courte" };
  }
  const elapsedSec = Math.max(1, elapsedMs / 1000);
  const maxAllowed = Math.min(
    meta.maxScore,
    meta.baseGraceScore + Math.ceil(elapsedSec * meta.maxRatePerSec),
  );
  if (score > maxAllowed) {
    return { ok: false, reason: "Score incompatible avec la durée" };
  }
  return { ok: true };
}

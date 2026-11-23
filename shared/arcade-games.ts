export const CASUAL_ARCADE_GAME_IDS = [
  "snake",
  "tetris",
  "brick_ball",
  "xensia",
] as const;

export type CasualArcadeGameId = (typeof CASUAL_ARCADE_GAME_IDS)[number];

export const MUSIC_ARCADE_GAME_IDS = [
  "trivia",
  "lyrics",
  "guess",
  "decade",
  "artist",
] as const;

export type MusicArcadeGameId = (typeof MUSIC_ARCADE_GAME_IDS)[number];

export const ALL_ARCADE_GAME_IDS = [
  ...CASUAL_ARCADE_GAME_IDS,
  ...MUSIC_ARCADE_GAME_IDS,
] as const;

export type AllArcadeGameId = (typeof ALL_ARCADE_GAME_IDS)[number];

export const CUSTOM_QUESTION_CATEGORIES = [
  "lyrics",
  "trivia",
  "guess",
  "decade",
] as const;

export type CustomQuestionCategory =
  (typeof CUSTOM_QUESTION_CATEGORIES)[number];

export interface CustomArcadeQuestion {
  id: string;
  category: CustomQuestionCategory;
  q: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  createdAt: string;
}

export interface ArcadeGamesAdminConfig {
  enabledGames: Record<AllArcadeGameId, boolean>;
  maintenanceMessage: string;
}

export const MUSIC_ARCADE_GAMES: Record<
  MusicArcadeGameId,
  { id: MusicArcadeGameId; name: string; tagline: string; backendType: string }
> = {
  trivia: {
    id: "trivia",
    name: "Music Trivia Duel",
    tagline: "Culture musicale • Quiz rapide",
    backendType: "music_trivia",
  },
  lyrics: {
    id: "lyrics",
    name: "Lyrics Challenge",
    tagline: "Complète les paroles • Texte (aucun téléchargement)",
    backendType: "lyrics",
  },
  guess: {
    id: "guess",
    name: "Name That Track",
    tagline: "Identifie les hits & créateurs",
    backendType: "guess",
  },
  decade: {
    id: "decade",
    name: "Decade Dash",
    tagline: "Devine la décennie de sortie",
    backendType: "decade",
  },
  artist: {
    id: "artist",
    name: "Artist Showdown",
    tagline: "Relie les albums & titres aux artistes",
    backendType: "artist",
  },
};

export function createDefaultArcadeGamesConfig(): ArcadeGamesAdminConfig {
  return {
    enabledGames: {
      snake: true,
      tetris: true,
      brick_ball: true,
      xensia: true,
      trivia: true,
      lyrics: true,
      guess: true,
      decade: true,
      artist: true,
    },
    maintenanceMessage: "",
  };
}

export function normalizeMusicGameTypeToId(
  gameType: string,
): MusicArcadeGameId | null {
  if (gameType === "music_trivia" || gameType === "trivia") return "trivia";
  if (gameType === "lyrics") return "lyrics";
  if (gameType === "guess") return "guess";
  if (gameType === "decade") return "decade";
  if (gameType === "artist") return "artist";
  return null;
}

export function isAllArcadeGameId(value: unknown): value is AllArcadeGameId {
  return (
    typeof value === "string" &&
    (ALL_ARCADE_GAME_IDS as readonly string[]).includes(value)
  );
}

export function isCustomQuestionCategory(
  value: unknown,
): value is CustomQuestionCategory {
  return (
    typeof value === "string" &&
    (CUSTOM_QUESTION_CATEGORIES as readonly string[]).includes(value)
  );
}

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

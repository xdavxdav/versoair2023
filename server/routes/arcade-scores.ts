import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { ensureArcadeScoresSchema } from "../services/arcade-scores-schema";
import {
  ARCADE_RUN_TOKEN_TTL_MS,
  CASUAL_ARCADE_GAME_IDS,
  isCasualArcadeGameId,
  isScorePlausible,
  type CasualArcadeGameId,
} from "@shared/arcade-games";

const router = Router();

interface ArcadeRunTokenPayload {
  runId: string;
  userId: number;
  game: CasualArcadeGameId;
  startedAt: number;
}

const SCORE_RATE_WINDOW_MS = 5 * 60 * 1000;
const SCORE_RATE_MAX = 25;
const userSubmitBuckets = new Map<number, number[]>();

function checkUserRateLimit(userId: number, nowMs: number): boolean {
  const recent = (userSubmitBuckets.get(userId) || []).filter(
    (t) => nowMs - t < SCORE_RATE_WINDOW_MS,
  );
  if (recent.length >= SCORE_RATE_MAX) {
    userSubmitBuckets.set(userId, recent);
    return false;
  }
  recent.push(nowMs);
  userSubmitBuckets.set(userId, recent);
  return true;
}

function getRunSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function signRunToken(payload: ArcadeRunTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", getRunSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyRunToken(token: string): ArcadeRunTokenPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;
  const expectedSig = createHmac("sha256", getRunSecret())
    .update(encoded)
    .digest("base64url");
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (
      !parsed ||
      typeof parsed.runId !== "string" ||
      parsed.runId.length < 8 ||
      parsed.runId.length > 64 ||
      typeof parsed.userId !== "number" ||
      !Number.isInteger(parsed.userId) ||
      !isCasualArcadeGameId(parsed.game) ||
      typeof parsed.startedAt !== "number" ||
      !Number.isFinite(parsed.startedAt)
    ) {
      return null;
    }
    return parsed as ArcadeRunTokenPayload;
  } catch {
    return null;
  }
}

/** POST /api/arcade/runs — issue an HMAC-signed run token before a game starts */
router.post("/runs", requireAuth(), async (req: Request, res: Response) => {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  const game = req.body?.game;
  if (!isCasualArcadeGameId(game)) {
    return res.status(400).json({ error: "Jeu invalide" });
  }
  const payload: ArcadeRunTokenPayload = {
    runId: randomUUID(),
    userId,
    game,
    startedAt: Date.now(),
  };
  return res.status(201).json({
    runId: payload.runId,
    game,
    startedAt: payload.startedAt,
    runToken: signRunToken(payload),
  });
});

/** POST /api/arcade/scores — validate run token + plausibility and persist score */
router.post("/scores", requireAuth(), async (req: Request, res: Response) => {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  const nowMs = Date.now();
  if (!checkUserRateLimit(userId, nowMs)) {
    return res
      .status(429)
      .json({ error: "Trop de soumissions récentes, réessayez dans un moment." });
  }

  const { runToken, game, score, level } = req.body ?? {};
  if (!isCasualArcadeGameId(game)) {
    return res.status(400).json({ error: "Jeu invalide" });
  }
  const claims = verifyRunToken(runToken);
  if (!claims) {
    return res.status(400).json({ error: "Jeton de partie invalide" });
  }
  if (claims.userId !== userId) {
    return res.status(403).json({ error: "Jeton non autorisé" });
  }
  if (claims.game !== game) {
    return res.status(400).json({ error: "Jeu incompatible avec le jeton" });
  }

  const elapsedMs = nowMs - claims.startedAt;
  if (elapsedMs < 0 || elapsedMs > ARCADE_RUN_TOKEN_TTL_MS) {
    return res.status(400).json({ error: "Session de jeu expirée" });
  }

  const numericScore = Number(score);
  const plausibility = isScorePlausible(game, numericScore, elapsedMs);
  if (!plausibility.ok) {
    return res.status(400).json({ error: plausibility.reason });
  }

  const cleanLevel =
    typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 999
      ? level
      : 1;
  const cleanDurationMs = Math.max(0, Math.min(ARCADE_RUN_TOKEN_TTL_MS, Math.floor(elapsedMs)));

  try {
    await ensureArcadeScoresSchema(pool);

    const inserted = await pool.query(
      `INSERT INTO arcade_scores (user_id, game, run_id, score, duration_ms, level)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (run_id) DO NOTHING
       RETURNING id, game, score, level, duration_ms, created_at`,
      [userId, game, claims.runId, numericScore, cleanDurationMs, cleanLevel],
    );

    const bestRow = await pool.query(
      `SELECT COALESCE(MAX(score), 0)::int AS best_score
       FROM arcade_scores
       WHERE user_id = $1 AND game = $2`,
      [userId, game],
    );
    const bestScore = Number(bestRow.rows[0]?.best_score ?? numericScore);

    if (inserted.rows.length === 0) {
      return res.status(200).json({
        duplicate: true,
        bestScore,
        isPersonalBest: false,
      });
    }

    return res.status(201).json({
      duplicate: false,
      entry: inserted.rows[0],
      bestScore,
      isPersonalBest: numericScore > 0 && numericScore >= bestScore,
    });
  } catch (error) {
    console.error("[ArcadeScores] POST /scores failed:", error);
    return res.status(500).json({ error: "Impossible d'enregistrer le score" });
  }
});

/** GET /api/arcade/leaderboard?game=snake&period=all|7d|30d — public display-name leaderboard */
router.get("/leaderboard", async (req: Request, res: Response) => {
  const game = req.query.game;
  if (!isCasualArcadeGameId(game)) {
    return res.status(400).json({ error: "Jeu invalide" });
  }
  const period =
    req.query.period === "7d" || req.query.period === "30d"
      ? req.query.period
      : "all";
  const rawLimit = Number(req.query.limit ?? 20);
  const limit = Number.isInteger(rawLimit)
    ? Math.max(1, Math.min(50, rawLimit))
    : 20;

  const periodClause =
    period === "7d"
      ? "AND s.created_at >= NOW() - INTERVAL '7 days'"
      : period === "30d"
        ? "AND s.created_at >= NOW() - INTERVAL '30 days'"
        : "";

  try {
    await ensureArcadeScoresSchema(pool);
    const result = await pool.query(
      `SELECT DISTINCT ON (s.user_id)
         s.user_id,
         COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), 'Joueur #' || s.user_id) AS display_name,
         s.score,
         s.level,
         s.created_at
       FROM arcade_scores s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.game = $1 ${periodClause}
       ORDER BY s.user_id, s.score DESC, s.created_at ASC`,
      [game],
    );

    const sorted = [...result.rows]
      .sort(
        (a, b) =>
          Number(b.score) - Number(a.score) ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .slice(0, limit)
      .map((row, index) => ({
        rank: index + 1,
        userId: Number(row.user_id),
        displayName: String(row.display_name || "Joueur"),
        score: Number(row.score),
        level: Number(row.level || 1),
        createdAt: row.created_at,
      }));

    return res.json({ game, period, entries: sorted });
  } catch (error) {
    console.error("[ArcadeScores] GET /leaderboard failed:", error);
    return res.status(500).json({ error: "Impossible de charger le classement" });
  }
});

/** GET /api/arcade/my-best — personal best per casual game */
router.get("/my-best", requireAuth(), async (req: Request, res: Response) => {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  try {
    await ensureArcadeScoresSchema(pool);
    const result = await pool.query(
      `SELECT game, MAX(score)::int AS best_score, MAX(level)::int AS max_level
       FROM arcade_scores
       WHERE user_id = $1
       GROUP BY game`,
      [userId],
    );
    const bestByGame: Record<string, { score: number; level: number }> = {};
    for (const id of CASUAL_ARCADE_GAME_IDS) {
      bestByGame[id] = { score: 0, level: 1 };
    }
    for (const row of result.rows) {
      if (isCasualArcadeGameId(row.game)) {
        bestByGame[row.game] = {
          score: Number(row.best_score || 0),
          level: Number(row.max_level || 1),
        };
      }
    }
    return res.json({ bestByGame });
  } catch (error) {
    console.error("[ArcadeScores] GET /my-best failed:", error);
    return res.status(500).json({ error: "Impossible de charger vos records" });
  }
});

export default router;

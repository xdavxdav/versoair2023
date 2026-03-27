/**
 * Verso Air — PvP Skill Games Engine
 * Music Trivia Duel, Prediction Market, Card Battle
 * All outcomes are server-validated — client never decides winners
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// TRIVIA QUESTION BANK (expandable — eventually from DB)
// ═══════════════════════════════════════════════════════════════════
const TRIVIA_QUESTIONS = [
  {
    q: "Quel artiste a popularisé l'Afrobeats à l'international en 2020 ?",
    options: ["Burna Boy", "Davido", "Wizkid", "Tiwa Savage"],
    answer: 0,
  },
  {
    q: "Dans quel pays est né le genre musical Amapiano ?",
    options: ["Nigeria", "Ghana", "Afrique du Sud", "Kenya"],
    answer: 2,
  },
  {
    q: "Quel instrument est central dans la musique Highlife ?",
    options: ["Djembé", "Guitare", "Kora", "Balafon"],
    answer: 1,
  },
  {
    q: "Qui est considéré comme le père du Reggae ?",
    options: ["Peter Tosh", "Bob Marley", "Jimmy Cliff", "Burning Spear"],
    answer: 1,
  },
  {
    q: "Le Coupé-Décalé est originaire de quel pays ?",
    options: ["Sénégal", "Cameroun", "Côte d'Ivoire", "Mali"],
    answer: 2,
  },
  {
    q: "Quel genre musical utilise le 'log drum' comme signature sonore ?",
    options: ["Amapiano", "Dancehall", "Afrobeats", "Zouk"],
    answer: 0,
  },
  {
    q: "Fela Kuti est le créateur de quel genre musical ?",
    options: ["Jùjú", "Highlife", "Afrobeat", "Fuji"],
    answer: 2,
  },
  {
    q: "Quel pays est le berceau du Dancehall ?",
    options: ["Trinidad", "Jamaïque", "Barbade", "Haïti"],
    answer: 1,
  },
  {
    q: "Le Zouk est originaire de quelles îles ?",
    options: ["Martinique & Guadeloupe", "Haïti", "Réunion", "Maurice"],
    answer: 0,
  },
  {
    q: "Quel artiste a rendu le Ndombolo populaire ?",
    options: ["Koffi Olomide", "Papa Wemba", "Awilo Longomba", "Fally Ipupa"],
    answer: 0,
  },
  {
    q: "Le Mbalax est associé à quel pays ?",
    options: ["Mali", "Sénégal", "Guinée", "Gambie"],
    answer: 1,
  },
  {
    q: "Quelle chanteuse béninoise est connue pour 'Désolé' ?",
    options: ["Angélique Kidjo", "Fatoumata Diawara", "Asa", "Yemi Alade"],
    answer: 0,
  },
  {
    q: "Le Gqom vient de quelle ville ?",
    options: ["Johannesburg", "Lagos", "Durban", "Accra"],
    answer: 2,
  },
  {
    q: "Combien de cordes possède une Kora traditionnelle ?",
    options: ["12", "15", "21", "25"],
    answer: 2,
  },
  {
    q: "Quel producteur est derrière le hit 'One Dance' de Drake ?",
    options: ["Sarz", "Wizkid", "Masterkraft", "Tekno"],
    answer: 1,
  },
];

function pickRandomQuestions(count: number) {
  const shuffled = [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
async function getOrCreateWallet(userId: number) {
  let w = await pool.query(
    "SELECT * FROM platform_wallets WHERE user_id = $1",
    [userId],
  );
  if (w.rows.length === 0) {
    w = await pool.query(
      `INSERT INTO platform_wallets (user_id, balance, currency, withdrawal_locked)
       VALUES ($1, '0.00', 'USD', true) RETURNING *`,
      [userId],
    );
  }
  return w.rows[0];
}

async function holdWager(
  userId: number,
  amount: number,
): Promise<string | null> {
  if (amount <= 0) return "free";
  const wallet = await getOrCreateWallet(userId);
  const balance = parseFloat(wallet.balance || "0");
  if (balance < amount) return null; // insufficient

  const balanceAfter = balance - amount;
  const frozenAfter = parseFloat(wallet.frozen_balance || "0") + amount;

  await pool.query(
    `UPDATE platform_wallets SET balance = $1, frozen_balance = $2, updated_at = NOW() WHERE user_id = $3`,
    [balanceAfter.toFixed(2), frozenAfter.toFixed(2), userId],
  );

  const txn = await pool.query(
    `INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description, status)
     VALUES ($1, $2, 'purchase', $3, $4, $5, 'Game wager hold', 'pending')
     RETURNING id`,
    [
      userId,
      wallet.id,
      (-amount).toFixed(2),
      balance.toFixed(2),
      balanceAfter.toFixed(2),
    ],
  );
  return txn.rows[0]?.id || "held";
}

async function releaseWager(userId: number, amount: number) {
  if (amount <= 0) return;
  await pool.query(
    `UPDATE platform_wallets
     SET frozen_balance = GREATEST(0, CAST(frozen_balance AS NUMERIC) - $1),
         balance = CAST(balance AS NUMERIC) + $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [amount.toFixed(2), userId],
  );
}

async function settleMatch(
  matchId: number,
  winnerId: number,
  loserId: number,
  wagerAmount: number,
) {
  const totalPot = wagerAmount * 2;
  const platformCut = totalPot * 0.1; // 10% house
  const winnerPrize = totalPot - platformCut;

  await pool.query("BEGIN");

  // Deduct loser's frozen balance (already held)
  await pool.query(
    `UPDATE platform_wallets
     SET frozen_balance = GREATEST(0, CAST(frozen_balance AS NUMERIC) - $1), updated_at = NOW()
     WHERE user_id = $2`,
    [wagerAmount.toFixed(2), loserId],
  );

  // Credit winner: release their frozen + add winnings
  const winnerWallet = await getOrCreateWallet(winnerId);
  const winnerBalance = parseFloat(winnerWallet.balance || "0");
  const winnerFrozen = parseFloat(winnerWallet.frozen_balance || "0");

  await pool.query(
    `UPDATE platform_wallets
     SET balance = $1,
         frozen_balance = GREATEST(0, $2),
         total_earned = CAST(total_earned AS NUMERIC) + $3,
         updated_at = NOW()
     WHERE user_id = $4`,
    [
      (winnerBalance + winnerPrize).toFixed(2),
      (winnerFrozen - wagerAmount).toFixed(2),
      winnerPrize.toFixed(2),
      winnerId,
    ],
  );

  // Log winner transaction
  await pool.query(
    `INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description, related_entity_type, related_entity_id, status)
     VALUES ($1, $2, 'arena_reward', $3, $4, $5, 'Game win', 'game', $6, 'completed')`,
    [
      winnerId,
      winnerWallet.id,
      winnerPrize.toFixed(2),
      winnerBalance.toFixed(2),
      (winnerBalance + winnerPrize).toFixed(2),
      String(matchId),
    ],
  );

  // Update match
  await pool.query(
    `UPDATE game_matches SET status = 'completed', winner_id = $1, platform_cut = $2, completed_at = NOW() WHERE id = $3`,
    [winnerId, platformCut.toFixed(2), matchId],
  );

  await pool.query("COMMIT");
  return { winnerPrize, platformCut };
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/games/challenge — Create a new game match
// ═══════════════════════════════════════════════════════════════════
router.post("/challenge", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const gameType = req.body.gameType || req.body.game_type;
    const wagerAmount = req.body.wagerAmount ?? req.body.wager_amount;
    const rounds = req.body.rounds || req.body.round_count;

    // Validate game type
    const validTypes = ["music_trivia", "prediction_market", "card_battle"];
    if (!validTypes.includes(gameType)) {
      return res.status(400).json({ error: "Invalid game type" });
    }

    // Validate wager
    const wager = parseFloat(wagerAmount) || 0;
    if (wager < 0 || wager > 100) {
      return res
        .status(400)
        .json({ error: "Wager must be between 0 and 100 credits" });
    }

    // Contract gate: user must have signed contract + valid platform ID to wager
    if (wager > 0) {
      const contract = await pool.query(
        `SELECT ac.status, ac.grade, ap.artist_code
         FROM artist_contracts ac
         JOIN artist_profiles ap ON ap.id = ac.artist_id
         WHERE ap.user_id = $1 AND ac.status = 'approved'
         LIMIT 1`,
        [userId],
      );
      if (contract.rows.length === 0) {
        return res.status(403).json({
          error:
            "Contrat requis — signez un contrat artiste ou utilisateur pour accéder aux mises.",
          requiresContract: true,
        });
      }
    }

    // Age check for wagering
    if (wager > 0) {
      const user = await pool.query(
        "SELECT date_of_birth, age_verified_at FROM users WHERE id = $1",
        [userId],
      );
      const u = user.rows[0];
      if (!u?.age_verified_at) {
        return res.status(403).json({
          error: "Age verification required for wagering",
          requiresAgeVerification: true,
        });
      }
    }

    // Hold wager
    if (wager > 0) {
      const holdResult = await holdWager(userId, wager);
      if (!holdResult) {
        return res
          .status(402)
          .json({ error: "Insufficient credits", requiresDeposit: true });
      }
    }

    // Generate questions for trivia
    const roundCount = Math.min(Math.max(parseInt(rounds) || 5, 3), 10);
    let gameState: Record<string, any> = {};

    if (gameType === "music_trivia") {
      const questions = pickRandomQuestions(roundCount);
      gameState = {
        questions: questions.map((q) => ({
          q: q.q,
          options: q.options,
          // Answer stored server-side only — stripped from client response
          _answer: q.answer,
        })),
      };
    } else if (gameType === "prediction_market") {
      // Prediction: which artist will get the most streams this week
      const topArtists = await pool.query(
        `SELECT id, stage_name, profile_image_url FROM artist_profiles
         WHERE total_streams > 0 ORDER BY RANDOM() LIMIT 4`,
      );
      gameState = {
        candidates:
          topArtists.rows.length > 0
            ? topArtists.rows.map((a: any) => ({
                id: a.id,
                name: a.stage_name,
                image: a.profile_image_url,
              }))
            : [
                { id: 0, name: "Artiste A", image: null },
                { id: 0, name: "Artiste B", image: null },
                { id: 0, name: "Artiste C", image: null },
                { id: 0, name: "Artiste D", image: null },
              ],
        resolvesAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    }

    // Create match
    const match = await pool.query(
      `INSERT INTO game_matches (game_type, player1_id, wager_amount, round_count, status, game_state, created_at)
       VALUES ($1, $2, $3, $4, 'waiting', $5, NOW())
       RETURNING id, game_type, wager_amount, round_count, status, created_at`,
      [
        gameType,
        userId,
        wager.toFixed(2),
        roundCount,
        JSON.stringify(gameState),
      ],
    );

    const m = match.rows[0];

    // Return match without answers
    const safeState =
      gameType === "music_trivia"
        ? {
            questions: gameState.questions.map((q: any) => ({
              q: q.q,
              options: q.options,
            })),
          }
        : gameState;

    res.json({
      success: true,
      match: {
        id: m.id,
        gameType: m.game_type,
        wagerAmount: parseFloat(m.wager_amount),
        roundCount: m.round_count,
        status: m.status,
        gameState: safeState,
        createdAt: m.created_at,
      },
    });
  } catch (err: any) {
    console.error("[GAMES] Challenge error:", err);
    res.status(500).json({ error: "Failed to create game" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/games/:id/join — Join an existing match
// ═══════════════════════════════════════════════════════════════════
router.post("/:id/join", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const matchId = parseInt(req.params.id);

    const match = await pool.query(
      "SELECT * FROM game_matches WHERE id = $1 AND status = 'waiting'",
      [matchId],
    );
    if (match.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Match not found or already started" });
    }

    const m = match.rows[0];
    if (m.player1_id === userId) {
      return res.status(400).json({ error: "Cannot join your own match" });
    }

    const wager = parseFloat(m.wager_amount || "0");

    // Contract gate
    if (wager > 0) {
      const contract = await pool.query(
        `SELECT ac.status FROM artist_contracts ac
         JOIN artist_profiles ap ON ap.id = ac.artist_id
         WHERE ap.user_id = $1 AND ac.status = 'approved' LIMIT 1`,
        [userId],
      );
      if (contract.rows.length === 0) {
        return res.status(403).json({
          error:
            "Contrat requis — signez un contrat pour rejoindre les duels avec mise.",
          requiresContract: true,
        });
      }
    }

    // Age check
    if (wager > 0) {
      const user = await pool.query(
        "SELECT age_verified_at FROM users WHERE id = $1",
        [userId],
      );
      if (!user.rows[0]?.age_verified_at) {
        return res.status(403).json({
          error: "Age verification required",
          requiresAgeVerification: true,
        });
      }
    }

    // Hold wager
    if (wager > 0) {
      const holdResult = await holdWager(userId, wager);
      if (!holdResult) {
        return res
          .status(402)
          .json({ error: "Insufficient credits", requiresDeposit: true });
      }
    }

    // Update match to active
    await pool.query(
      `UPDATE game_matches SET player2_id = $1, status = 'active', started_at = NOW() WHERE id = $2`,
      [userId, matchId],
    );

    res.json({ success: true, message: "Joined match", matchId });
  } catch (err: any) {
    console.error("[GAMES] Join error:", err);
    res.status(500).json({ error: "Failed to join game" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/games/:id/answer — Submit an answer for trivia (one round)
// ═══════════════════════════════════════════════════════════════════
router.post("/:id/answer", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const matchId = parseInt(req.params.id);
    const { answerIndex, responseTimeMs } = req.body;

    const match = await pool.query("SELECT * FROM game_matches WHERE id = $1", [
      matchId,
    ]);
    if (match.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    const m = match.rows[0];
    if (m.player1_id !== userId && m.player2_id !== userId) {
      return res.status(403).json({ error: "Not a participant" });
    }

    const gameState = m.game_state || {};
    const currentRound = m.current_round || 0;

    if (currentRound >= m.round_count) {
      return res.status(400).json({ error: "Match already finished" });
    }

    // Check answer
    const question = gameState.questions?.[currentRound];
    if (!question) {
      return res.status(400).json({ error: "No question for this round" });
    }

    const isCorrect = answerIndex === question._answer;
    const speedBonus = responseTimeMs && responseTimeMs < 5000 ? 1 : 0;
    const points = isCorrect ? 10 + speedBonus : 0;

    // Record move
    await pool.query(
      `INSERT INTO game_moves (match_id, user_id, round, move_data, is_correct, points_earned, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        matchId,
        userId,
        currentRound,
        JSON.stringify({ answerIndex }),
        isCorrect,
        points,
        responseTimeMs || null,
      ],
    );

    // Update score
    const isPlayer1 = m.player1_id === userId;
    const scoreField = isPlayer1 ? "player1_score" : "player2_score";
    const newScore = (isPlayer1 ? m.player1_score : m.player2_score) + points;

    // Check if both players answered this round (for PvP) or advance for solo
    const otherAnswered = await pool.query(
      "SELECT id FROM game_moves WHERE match_id = $1 AND round = $2 AND user_id != $3",
      [matchId, currentRound, userId],
    );

    const advanceRound = !m.player2_id || otherAnswered.rows.length > 0;

    if (advanceRound) {
      const nextRound = currentRound + 1;
      const isLastRound = nextRound >= m.round_count;

      await pool.query(
        `UPDATE game_matches SET ${scoreField} = $1, current_round = $2 WHERE id = $3`,
        [newScore, nextRound, matchId],
      );

      // If last round, determine winner
      if (isLastRound) {
        const updatedMatch = await pool.query(
          "SELECT * FROM game_matches WHERE id = $1",
          [matchId],
        );
        const um = updatedMatch.rows[0];
        const p1Score = isPlayer1 ? newScore : um.player1_score;
        const p2Score = isPlayer1 ? um.player2_score : newScore;

        const wager = parseFloat(um.wager_amount || "0");

        if (um.player2_id && wager > 0) {
          // PvP with wager — settle
          const winner = p1Score >= p2Score ? um.player1_id : um.player2_id;
          const loser =
            winner === um.player1_id ? um.player2_id : um.player1_id;
          const result = await settleMatch(matchId, winner, loser, wager);

          return res.json({
            success: true,
            isCorrect,
            points,
            newScore,
            roundComplete: true,
            matchComplete: true,
            winner,
            player1Score: p1Score,
            player2Score: p2Score,
            prize: result.winnerPrize,
          });
        } else {
          // Solo or free match — just complete
          const winnerId = um.player2_id
            ? p1Score >= p2Score
              ? um.player1_id
              : um.player2_id
            : um.player1_id;

          await pool.query(
            `UPDATE game_matches SET status = 'completed', winner_id = $1, completed_at = NOW() WHERE id = $2`,
            [winnerId, matchId],
          );

          return res.json({
            success: true,
            isCorrect,
            points,
            newScore,
            roundComplete: true,
            matchComplete: true,
            winner: winnerId,
            player1Score: p1Score,
            player2Score: p2Score,
            prize: 0,
          });
        }
      }
    } else {
      // Just update this player's score, wait for opponent
      await pool.query(
        `UPDATE game_matches SET ${scoreField} = $1 WHERE id = $2`,
        [newScore, matchId],
      );
    }

    res.json({
      success: true,
      isCorrect,
      points,
      newScore,
      correctAnswer: question._answer,
      roundComplete: advanceRound,
      matchComplete: false,
    });
  } catch (err: any) {
    console.error("[GAMES] Answer error:", err);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/games/open — List open matches waiting for opponents
// ═══════════════════════════════════════════════════════════════════
router.get("/open", async (_req: Request, res: Response) => {
  try {
    const matches = await pool.query(
      `SELECT gm.id, gm.game_type, gm.wager_amount, gm.round_count, gm.created_at,
              u.username as creator_name
       FROM game_matches gm
       JOIN users u ON u.id = gm.player1_id
       WHERE gm.status = 'waiting'
         AND gm.created_at > NOW() - INTERVAL '30 minutes'
       ORDER BY gm.created_at DESC
       LIMIT 20`,
    );
    res.json({ success: true, matches: matches.rows });
  } catch (err: any) {
    console.error("[GAMES] Open matches error:", err);
    res.status(500).json({ error: "Failed to list matches" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/games/my — List current user's matches
// ═══════════════════════════════════════════════════════════════════
router.get("/my", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const matches = await pool.query(
      `SELECT gm.*, u1.username as player1_name, u2.username as player2_name
       FROM game_matches gm
       JOIN users u1 ON u1.id = gm.player1_id
       LEFT JOIN users u2 ON u2.id = gm.player2_id
       WHERE gm.player1_id = $1 OR gm.player2_id = $1
       ORDER BY gm.created_at DESC
       LIMIT 20`,
      [userId],
    );

    // Strip answer keys from game state
    const safe = matches.rows.map((m: any) => {
      const state = m.game_state || {};
      if (state.questions) {
        state.questions = state.questions.map((q: any) => ({
          q: q.q,
          options: q.options,
        }));
      }
      return { ...m, game_state: state };
    });

    res.json({ success: true, matches: safe });
  } catch (err: any) {
    console.error("[GAMES] My matches error:", err);
    res.status(500).json({ error: "Failed to list matches" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/games/verify-age — Simple DOB self-declaration
// ═══════════════════════════════════════════════════════════════════
router.post("/verify-age", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { dateOfBirth } = req.body;

    if (!dateOfBirth) {
      return res.status(400).json({ error: "Date of birth required" });
    }

    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return res.status(403).json({
        error:
          "Vous devez avoir 18 ans ou plus pour participer aux jeux de mise",
        verified: false,
      });
    }

    await pool.query(
      "UPDATE users SET date_of_birth = $1, age_verified_at = NOW() WHERE id = $2",
      [dateOfBirth, userId],
    );

    res.json({ success: true, verified: true, age });
  } catch (err: any) {
    console.error("[GAMES] Age verify error:", err);
    res.status(500).json({ error: "Failed to verify age" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/games/leaderboard — Top players by winnings
// ═══════════════════════════════════════════════════════════════════
router.get("/leaderboard", async (_req: Request, res: Response) => {
  try {
    const leaders = await pool.query(
      `SELECT u.username,
              COUNT(gm.id) as games_won,
              COALESCE(SUM(CAST(gm.wager_amount AS NUMERIC) * 2 - CAST(gm.platform_cut AS NUMERIC)), 0) as total_winnings
       FROM game_matches gm
       JOIN users u ON u.id = gm.winner_id
       WHERE gm.status = 'completed' AND gm.winner_id IS NOT NULL
       GROUP BY u.id, u.username
       ORDER BY total_winnings DESC
       LIMIT 20`,
    );
    res.json({ success: true, leaderboard: leaders.rows });
  } catch (err: any) {
    console.error("[GAMES] Leaderboard error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;

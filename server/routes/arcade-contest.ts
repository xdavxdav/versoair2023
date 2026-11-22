import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAdminElevation } from "../middleware/admin-elevation";
import { isOwner, requireAdminPanel, requireAuth } from "../middleware/auth";
import { canAccessAdminPanelSection } from "@shared/admin-panel-access";
import { ensureArcadeContestSchema } from "../services/arcade-contest-schema";
import {
  artistPayouts,
  castVotes,
  closeSeason,
  contestStandings,
  getContest,
  listContests,
  listPayouts,
  markPayoutPaid,
  normalizeCountryCode,
  playerStatus,
  poolBalance,
  recentLedger,
  releaseEligibleEscrow,
  saveContest,
  updateContestSchema,
  type ContestConfig,
  type Failure,
} from "../services/arcade-contest";
import { isSeasonKey, seasonKeyFor } from "../services/arcade-contest-math";
import { onlinePaymentsEnabled } from "../utils/commercial-gates";

/**
 * Country arcade contests. Every country runs its own contest, currency, pool
 * and payouts. Players only ever see and vote in the contest of their billing
 * country, and a contest is closed until staff switch that country on.
 */
const router = Router();

router.use(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureArcadeContestSchema(pool);
    next();
  } catch (error) {
    console.error("[ArcadeContest] schema setup failed:", error);
    res.status(503).json({ success: false, error: "The arcade contest is unavailable" });
  }
});

function ownerOnly(req: Request, res: Response, next: NextFunction) {
  if (canAccessAdminPanelSection("arcade-games", isOwner(req.user))) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: "Reserved for the platform owner.",
  });
}

// These routes open countries, close seasons and record payouts, so they also
// need the re-authenticated admin session that /api/admin requires.
const adminGuard = [requireAdminPanel, ownerOnly, requireAdminElevation];

function actorId(req: Request): number | null {
  const id = Number(req.user?.id ?? req.user?.userId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendFailure(res: Response, failure: Failure) {
  return res
    .status(failure.status)
    .json({ success: false, code: failure.code, error: failure.error });
}

function isFailure(value: unknown): value is Failure {
  return typeof value === "object" && value !== null && (value as Failure).ok === false;
}

function serverError(res: Response, label: string, error: unknown) {
  console.error(`[ArcadeContest] ${label} failed:`, error);
  return res.status(500).json({ success: false, error: "Something went wrong" });
}

function publicContest(contest: ContestConfig) {
  return {
    countryCode: contest.countryCode,
    currency: contest.currency,
    enabled: contest.enabled,
    priceMinor: contest.priceMinor,
    votesPerHour: contest.votesPerHour,
    maxVotesPerArtistPerDay: contest.maxVotesPerArtistPerDay,
    poolPercent: contest.poolBps / 100,
    voteWeightPercent: contest.voteWeightBps / 100,
    streamWeightPercent: contest.streamWeightBps / 100,
    minPayoutMinor: contest.minPayoutMinor,
  };
}

// ─── Open contests ───────────────────────────────────────────────────────────

/** GET /api/arcade-contest/contests — the contests that are open, each with its open pool. Public. */
router.get("/contests", async (_req: Request, res: Response) => {
  try {
    const seasonKey = seasonKeyFor(new Date());
    const contests = (await listContests(pool)).filter((contest) => contest.enabled);
    const data = await Promise.all(
      contests.map(async (contest) => ({
        ...publicContest(contest),
        poolMinor: Math.max(0, await poolBalance(pool, contest.countryCode, seasonKey)),
      })),
    );
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      success: true,
      data: { seasonKey, paymentsOpen: onlinePaymentsEnabled(), contests: data },
    });
  } catch (error) {
    return serverError(res, "GET /contests", error);
  }
});

/** GET /api/arcade-contest/:countryCode/leaderboard — votes per artist this season. Signed-in players only. */
router.get("/:countryCode/leaderboard", async (req: Request, res: Response) => {
  const countryCode = normalizeCountryCode(req.params.countryCode);
  if (!countryCode) {
    return res.status(400).json({ success: false, error: "Invalid country" });
  }
  try {
    const contest = await getContest(pool, countryCode);
    if (!contest || !contest.enabled) {
      return res
        .status(404)
        .json({ success: false, error: "No open contest in that country" });
    }
    const standings = await contestStandings(pool, countryCode, seasonKeyFor(new Date()));
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      success: true,
      data: { contest: publicContest(contest), ...standings },
    });
  } catch (error) {
    return serverError(res, "GET /:countryCode/leaderboard", error);
  }
});

// ─── Signed-in players and artists ───────────────────────────────────────────

/** GET /api/arcade-contest/me — the player's contest, remaining votes and billing country. */
router.get("/me", requireAuth(), async (req: Request, res: Response) => {
  const userId = actorId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  try {
    const status = await playerStatus(pool, userId);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      success: true,
      data: {
        country: status.country,
        seasonKey: status.seasonKey,
        paymentsOpen: onlinePaymentsEnabled(),
        contest: status.contest ? publicContest(status.contest) : null,
        votes: status.votes,
      },
    });
  } catch (error) {
    return serverError(res, "GET /me", error);
  }
});

/** GET /api/arcade-contest/me/payouts — contest earnings of the artist profile(s) of this account. */
router.get("/me/payouts", requireAuth(), async (req: Request, res: Response) => {
  const userId = actorId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  try {
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, data: await artistPayouts(pool, userId) });
  } catch (error) {
    return serverError(res, "GET /me/payouts", error);
  }
});

const voteSchema = z
  .object({
    artistId: z.number().int().positive(),
    count: z.number().int().min(1).max(1000),
  })
  .strict();

/** POST /api/arcade-contest/vote — spend votes that came with paid play time. */
router.post("/vote", requireAuth(), async (req: Request, res: Response) => {
  const userId = actorId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  const parsed = voteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Invalid vote" });
  }
  try {
    const result = await castVotes(pool, {
      userId,
      artistId: parsed.data.artistId,
      count: parsed.data.count,
    });
    if (isFailure(result)) return sendFailure(res, result);
    return res.json({ success: true, data: result });
  } catch (error) {
    return serverError(res, "POST /vote", error);
  }
});

// ─── Owner: settings, season close, payouts ──────────────────────────────────

/** GET /api/arcade-contest/admin/contests — settings plus the open pool of each country. */
router.get("/admin/contests", ...adminGuard, async (_req: Request, res: Response) => {
  try {
    const seasonKey = seasonKeyFor(new Date());
    const contests = await listContests(pool);
    const data = await Promise.all(
      contests.map(async (contest) => ({
        ...publicContest(contest),
        escrowDays: contest.escrowDays,
        poolBps: contest.poolBps,
        voteWeightBps: contest.voteWeightBps,
        poolMinor: await poolBalance(pool, contest.countryCode, seasonKey),
      })),
    );
    return res.json({
      success: true,
      data: { seasonKey, paymentsOpen: onlinePaymentsEnabled(), contests: data },
    });
  } catch (error) {
    return serverError(res, "GET /admin/contests", error);
  }
});

/** PUT /api/arcade-contest/admin/contests/:countryCode — on/off, price, pool share, weights, escrow. */
router.put(
  "/admin/contests/:countryCode",
  ...adminGuard,
  async (req: Request, res: Response) => {
    const countryCode = normalizeCountryCode(req.params.countryCode);
    if (!countryCode) {
      return res.status(400).json({ success: false, error: "Invalid country" });
    }
    const parsed = updateContestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid settings",
      });
    }
    try {
      const saved = await saveContest(pool, countryCode, parsed.data, actorId(req));
      if (isFailure(saved)) return sendFailure(res, saved);
      return res.json({ success: true, data: publicContest(saved) });
    } catch (error) {
      return serverError(res, "PUT /admin/contests/:countryCode", error);
    }
  },
);

const closeSchema = z
  .object({
    seasonKey: z.string().refine(isSeasonKey, "Season must look like 2026-11"),
    commit: z.boolean().optional(),
  })
  .strict();

/**
 * POST /api/arcade-contest/admin/contests/:countryCode/close
 * Without `commit: true` this only returns who would be paid what.
 */
router.post(
  "/admin/contests/:countryCode/close",
  ...adminGuard,
  async (req: Request, res: Response) => {
    const countryCode = normalizeCountryCode(req.params.countryCode);
    const parsed = closeSchema.safeParse(req.body ?? {});
    if (!countryCode || !parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid season close request" });
    }
    try {
      const result = await closeSeason(pool, {
        countryCode,
        seasonKey: parsed.data.seasonKey,
        actorId: actorId(req),
        commit: parsed.data.commit === true,
      });
      if (isFailure(result)) return sendFailure(res, result);
      return res.json({ success: true, data: result });
    } catch (error) {
      return serverError(res, "POST /admin/contests/:countryCode/close", error);
    }
  },
);

/** GET /api/arcade-contest/admin/contests/:countryCode/ledger — the append-only money log. */
router.get(
  "/admin/contests/:countryCode/ledger",
  ...adminGuard,
  async (req: Request, res: Response) => {
    const countryCode = normalizeCountryCode(req.params.countryCode);
    if (!countryCode) {
      return res.status(400).json({ success: false, error: "Invalid country" });
    }
    try {
      return res.json({
        success: true,
        data: await recentLedger(pool, countryCode, Number(req.query.limit) || 100),
      });
    } catch (error) {
      return serverError(res, "GET /admin/contests/:countryCode/ledger", error);
    }
  },
);

/** GET /api/arcade-contest/admin/payouts?country=CA&status=payable */
router.get("/admin/payouts", ...adminGuard, async (req: Request, res: Response) => {
  const country = req.query.country ? normalizeCountryCode(req.query.country) : null;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  if (req.query.country && !country) {
    return res.status(400).json({ success: false, error: "Invalid country" });
  }
  if (status && !["accrued", "escrow", "payable", "paid", "merged"].includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid status" });
  }
  try {
    return res.json({
      success: true,
      data: await listPayouts(pool, { countryCode: country ?? undefined, status }),
    });
  } catch (error) {
    return serverError(res, "GET /admin/payouts", error);
  }
});

/** POST /api/arcade-contest/admin/payouts/release-escrow — verified artists' escrow becomes payable. */
router.post(
  "/admin/payouts/release-escrow",
  ...adminGuard,
  async (req: Request, res: Response) => {
    const country = req.body?.countryCode ? normalizeCountryCode(req.body.countryCode) : null;
    if (req.body?.countryCode && !country) {
      return res.status(400).json({ success: false, error: "Invalid country" });
    }
    try {
      const released = await releaseEligibleEscrow(pool, country ?? undefined);
      return res.json({ success: true, data: { released } });
    } catch (error) {
      return serverError(res, "POST /admin/payouts/release-escrow", error);
    }
  },
);

const paidSchema = z
  .object({ reference: z.string().trim().min(3).max(200) })
  .strict();

/** POST /api/arcade-contest/admin/payouts/:id/paid — records that the money was sent, with its reference. */
router.post(
  "/admin/payouts/:id/paid",
  ...adminGuard,
  async (req: Request, res: Response) => {
    const payoutId = Number(req.params.id);
    const parsed = paidSchema.safeParse(req.body ?? {});
    if (!Number.isSafeInteger(payoutId) || payoutId <= 0 || !parsed.success) {
      return res
        .status(400)
        .json({ success: false, error: "A payment reference is required" });
    }
    try {
      const result = await markPayoutPaid(pool, {
        payoutId,
        reference: parsed.data.reference,
        actorId: actorId(req),
      });
      if (isFailure(result)) return sendFailure(res, result);
      return res.json({ success: true });
    } catch (error) {
      return serverError(res, "POST /admin/payouts/:id/paid", error);
    }
  },
);

export default router;

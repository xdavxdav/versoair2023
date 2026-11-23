/**
 * Country arcade contests: players buy play time in their own country's
 * currency, the pool share of every payment sits in an append-only ledger, and
 * at season end it is split between that country's artists by votes and
 * streams. Pools, currencies and payouts never cross borders.
 */
import { z } from "zod";
import { inTransaction } from "./db-transaction";
import type { Queryable, TxClient, TxPool } from "./marketing-checkout";
import {
  allocatePool,
  isSeasonKey,
  nextSeasonKey,
  seasonKeyFor,
  seasonRange,
  splitPurchase,
  type ContestEntry,
} from "./arcade-contest-math";
import {
  MAX_CHARGE_MINOR_UNITS,
  SUPPORTED_CHARGE_CURRENCIES,
} from "../utils/stripe-amount";

export interface ContestConfig {
  countryCode: string;
  currency: string;
  enabled: boolean;
  priceMinor: number;
  votesPerHour: number;
  maxVotesPerArtistPerDay: number;
  poolBps: number;
  voteWeightBps: number;
  streamWeightBps: number;
  escrowDays: number;
  minPayoutMinor: number;
}

export type Failure = {
  ok: false;
  status: number;
  code: string;
  error: string;
};

const fail = (status: number, code: string, error: string): Failure => ({
  ok: false,
  status,
  code,
  error,
});

const CONFIG_COLUMNS = `country_code, currency, enabled, price_minor, votes_per_hour,
  max_votes_per_artist_per_day, pool_bps, vote_weight_bps, stream_weight_bps,
  escrow_days, min_payout_minor`;

function toConfig(row: any): ContestConfig {
  return {
    countryCode: String(row.country_code).trim(),
    currency: String(row.currency).trim(),
    enabled: row.enabled === true,
    priceMinor: Number(row.price_minor),
    votesPerHour: Number(row.votes_per_hour),
    maxVotesPerArtistPerDay: Number(row.max_votes_per_artist_per_day),
    poolBps: Number(row.pool_bps),
    voteWeightBps: Number(row.vote_weight_bps),
    streamWeightBps: Number(row.stream_weight_bps),
    escrowDays: Number(row.escrow_days),
    minPayoutMinor: Number(row.min_payout_minor),
  };
}

export function normalizeCountryCode(value: unknown): string | null {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export async function listContests(db: Queryable): Promise<ContestConfig[]> {
  const res = await db.query(
    `SELECT ${CONFIG_COLUMNS} FROM arcade_contests ORDER BY country_code`,
  );
  return res.rows.map(toConfig);
}

export async function getContest(
  db: Queryable,
  countryCode: string,
): Promise<ContestConfig | null> {
  const res = await db.query(
    `SELECT ${CONFIG_COLUMNS} FROM arcade_contests WHERE country_code = $1`,
    [countryCode],
  );
  return res.rows[0] ? toConfig(res.rows[0]) : null;
}

export const updateContestSchema = z
  .object({
    enabled: z.boolean().optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine((c) => SUPPORTED_CHARGE_CURRENCIES.includes(c), "Unsupported currency")
      .optional(),
    priceMinor: z.number().int().min(1).max(MAX_CHARGE_MINOR_UNITS).optional(),
    votesPerHour: z.number().int().min(0).max(1000).optional(),
    maxVotesPerArtistPerDay: z.number().int().min(1).max(1000).optional(),
    poolBps: z.number().int().min(0).max(10_000).optional(),
    voteWeightBps: z.number().int().min(0).max(10_000).optional(),
    escrowDays: z.number().int().min(0).max(365).optional(),
    minPayoutMinor: z.number().int().min(0).max(MAX_CHARGE_MINOR_UNITS).optional(),
  })
  .strict();

export async function saveContest(
  db: Queryable,
  countryCode: string,
  patch: z.infer<typeof updateContestSchema>,
  actorId: number | null,
): Promise<ContestConfig | Failure> {
  const current = await getContest(db, countryCode);
  if (!current) return fail(404, "CONTEST_NOT_FOUND", "Unknown contest country");

  if (patch.currency && patch.currency !== current.currency) {
    const booked = await db.query(
      `SELECT 1 FROM arcade_contest_ledger WHERE country_code = $1 LIMIT 1`,
      [countryCode],
    );
    if (booked.rows.length > 0) {
      return fail(
        409,
        "CURRENCY_LOCKED",
        "This country's books already hold money; its currency can no longer change.",
      );
    }
  }

  const next = { ...current, ...stripUndefined(patch) };
  if (patch.voteWeightBps !== undefined) {
    next.streamWeightBps = 10_000 - patch.voteWeightBps;
  }
  const res = await db.query(
    `UPDATE arcade_contests
        SET currency = $2, enabled = $3, price_minor = $4, votes_per_hour = $5,
            max_votes_per_artist_per_day = $6, pool_bps = $7, vote_weight_bps = $8,
            stream_weight_bps = $9, escrow_days = $10, min_payout_minor = $11,
            updated_by = $12, updated_at = NOW()
      WHERE country_code = $1
      RETURNING ${CONFIG_COLUMNS}`,
    [
      countryCode,
      next.currency,
      next.enabled,
      next.priceMinor,
      next.votesPerHour,
      next.maxVotesPerArtistPerDay,
      next.poolBps,
      next.voteWeightBps,
      next.streamWeightBps,
      next.escrowDays,
      next.minPayoutMinor,
      actorId,
    ],
  );
  return toConfig(res.rows[0]);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/** The country a player pays and votes in: always their billing country. */
export async function billingCountry(
  db: Queryable,
  userId: number,
): Promise<string | null> {
  const res = await db.query(
    `SELECT country FROM user_billing_profiles WHERE user_id = $1`,
    [userId],
  );
  return normalizeCountryCode(res.rows[0]?.country);
}

interface LedgerEntry {
  countryCode: string;
  currency: string;
  seasonKey: string;
  kind:
    | "pool_credit"
    | "platform_credit"
    | "pool_reversal"
    | "platform_reversal"
    | "distribution"
    | "carry_out"
    | "carry_in"
    | "payout_paid";
  amountMinor: number;
  ref: string;
  purchaseId?: number;
  artistId?: number;
  note?: string;
}

/** Idempotent on `ref`; returns false when the entry already existed. */
async function appendLedger(db: Queryable, e: LedgerEntry): Promise<boolean> {
  const res = await db.query(
    `INSERT INTO arcade_contest_ledger
       (country_code, currency, season_key, kind, amount_minor, ref, purchase_id, artist_id, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (ref) DO NOTHING
     RETURNING id`,
    [
      e.countryCode,
      e.currency,
      e.seasonKey,
      e.kind,
      e.amountMinor,
      e.ref,
      e.purchaseId ?? null,
      e.artistId ?? null,
      e.note ?? null,
    ],
  );
  return res.rows.length > 0;
}

const POOL_KINDS = `('pool_credit','pool_reversal','carry_in','carry_out','distribution')`;

export async function poolBalance(
  db: Queryable,
  countryCode: string,
  seasonKey: string,
): Promise<number> {
  const res = await db.query(
    `SELECT COALESCE(SUM(amount_minor), 0) AS total
       FROM arcade_contest_ledger
      WHERE country_code = $1 AND season_key = $2 AND kind IN ${POOL_KINDS}`,
    [countryCode, seasonKey],
  );
  return Number(res.rows[0]?.total ?? 0);
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export interface PreparedPurchase {
  ok: true;
  purchase: {
    id: number;
    countryCode: string;
    currency: string;
    hours: number;
    amountMinor: number;
  };
}

export async function prepareArcadePurchase(
  db: Queryable,
  userId: number,
  hours: number,
): Promise<PreparedPurchase | Failure> {
  if (!Number.isInteger(hours) || hours < 1 || hours > 24) {
    return fail(400, "INVALID_HOURS", "Choose between 1 and 24 hours.");
  }
  const country = await billingCountry(db, userId);
  if (!country) {
    return fail(
      400,
      "BILLING_COUNTRY_REQUIRED",
      "Add your billing country before buying play time.",
    );
  }
  const contest = await getContest(db, country);
  if (!contest || !contest.enabled) {
    return fail(
      403,
      "CONTEST_NOT_AVAILABLE",
      "The arcade contest is not open in your country yet.",
    );
  }
  const amountMinor = contest.priceMinor * hours;
  if (!Number.isSafeInteger(amountMinor) || amountMinor > MAX_CHARGE_MINOR_UNITS) {
    return fail(400, "INVALID_AMOUNT", "That amount is too large to charge.");
  }
  const res = await db.query(
    `INSERT INTO arcade_contest_purchases
       (user_id, country_code, currency, hours, amount_minor, votes_granted, pool_bps)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      userId,
      contest.countryCode,
      contest.currency,
      hours,
      amountMinor,
      contest.votesPerHour * hours,
      contest.poolBps,
    ],
  );
  return {
    ok: true,
    purchase: {
      id: Number(res.rows[0].id),
      countryCode: contest.countryCode,
      currency: contest.currency,
      hours,
      amountMinor,
    },
  };
}

export async function attachCheckoutSession(
  db: Queryable,
  purchaseId: number,
  sessionId: string,
): Promise<void> {
  await db.query(
    `UPDATE arcade_contest_purchases SET stripe_session_id = $2
      WHERE id = $1 AND status = 'pending'`,
    [purchaseId, sessionId],
  );
}

export async function cancelPendingPurchase(
  db: Queryable,
  purchaseId: number,
  userId: number,
): Promise<boolean> {
  const res = await db.query(
    `UPDATE arcade_contest_purchases SET status = 'cancelled'
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      RETURNING id`,
    [purchaseId, userId],
  );
  return res.rows.length > 0;
}

export type FulfillOutcome =
  | { fulfilled: true; poolMinor: number; platformMinor: number }
  | {
      fulfilled: false;
      mismatch:
        | "purchase_not_found"
        | "not_pending"
        | "amount_mismatch"
        | "currency_mismatch"
        | "country_mismatch";
    };

/**
 * Applies a paid Checkout Session. The caller has already claimed the session
 * id in `transactions`, so this runs at most once per payment. A payment that
 * does not match its purchase is left for a person to reconcile; no pool money
 * is credited for it. A card billed in another country than the contest's is
 * held the same way, so a country's pool only holds that country's players'
 * money.
 */
export async function fulfillArcadePurchaseInTx(
  client: TxClient,
  input: {
    purchaseId: number;
    userId: number;
    sessionId: string;
    paidMinor: number | null;
    paidCurrency: string | null;
    billingCountry?: string | null;
    now?: Date;
  },
): Promise<FulfillOutcome> {
  const found = await client.query(
    `SELECT id, country_code, currency, amount_minor, pool_bps, status
       FROM arcade_contest_purchases
      WHERE id = $1 AND user_id = $2
      FOR UPDATE`,
    [input.purchaseId, input.userId],
  );
  const row = found.rows[0];
  if (!row) return { fulfilled: false, mismatch: "purchase_not_found" };
  if (row.status !== "pending") return { fulfilled: false, mismatch: "not_pending" };
  if (input.paidMinor === null || input.paidMinor !== Number(row.amount_minor)) {
    return { fulfilled: false, mismatch: "amount_mismatch" };
  }
  const currency = String(row.currency).trim();
  if (input.paidCurrency !== null && input.paidCurrency.toUpperCase() !== currency) {
    return { fulfilled: false, mismatch: "currency_mismatch" };
  }
  const countryCode = String(row.country_code).trim();
  const cardCountry = normalizeCountryCode(input.billingCountry);
  if (cardCountry !== null && cardCountry !== countryCode) {
    return { fulfilled: false, mismatch: "country_mismatch" };
  }

  const seasonKey = seasonKeyFor(input.now ?? new Date());
  const { poolMinor, platformMinor } = splitPurchase(
    Number(row.amount_minor),
    Number(row.pool_bps),
  );
  await client.query(
    `UPDATE arcade_contest_purchases
        SET status = 'paid', stripe_session_id = $2, season_key = $3,
            pool_minor = $4, platform_minor = $5, paid_at = NOW()
      WHERE id = $1`,
    [input.purchaseId, input.sessionId, seasonKey, poolMinor, platformMinor],
  );
  const base = { countryCode, currency, seasonKey, purchaseId: input.purchaseId };
  await appendLedger(client, {
    ...base,
    kind: "pool_credit",
    amountMinor: poolMinor,
    ref: `purchase:${input.purchaseId}:pool`,
  });
  await appendLedger(client, {
    ...base,
    kind: "platform_credit",
    amountMinor: platformMinor,
    ref: `purchase:${input.purchaseId}:platform`,
  });
  return { fulfilled: true, poolMinor, platformMinor };
}

export type ArcadeReversalKind =
  | "refund"
  | "dispute_opened"
  | "dispute_won"
  | "dispute_lost";

/**
 * A full refund or a lost dispute takes the pool share back out of the ledger
 * and voids any votes the purchase paid for. Partial refunds and open disputes
 * leave the books alone. When the purchase's season is already closed the
 * reversal lands in the current season, so the next pool absorbs the loss.
 */
export async function reverseArcadePurchaseInTx(
  client: TxClient,
  sessionId: string,
  kind: ArcadeReversalKind,
  fullRefund: boolean,
  note: string,
  now: Date = new Date(),
): Promise<"reversed" | "status_only" | "unmatched" | "noop"> {
  const found = await client.query(
    `SELECT id, user_id, country_code, currency, status, season_key, pool_minor, platform_minor
       FROM arcade_contest_purchases
      WHERE stripe_session_id = $1
      FOR UPDATE`,
    [sessionId],
  );
  const row = found.rows[0];
  if (!row) return "unmatched";

  if (kind === "dispute_opened") {
    if (row.status === "paid") {
      await client.query(
        `UPDATE arcade_contest_purchases SET status = 'disputed' WHERE id = $1`,
        [row.id],
      );
    }
    return "status_only";
  }
  if (kind === "dispute_won") {
    if (row.status === "disputed") {
      await client.query(
        `UPDATE arcade_contest_purchases SET status = 'paid' WHERE id = $1`,
        [row.id],
      );
    }
    return "status_only";
  }
  const withdraws = kind === "dispute_lost" || (kind === "refund" && fullRefund);
  if (!withdraws) return "noop";
  if (!["paid", "disputed"].includes(row.status)) return "noop";

  const countryCode = String(row.country_code).trim();
  const currency = String(row.currency).trim();
  const purchaseSeason = String(row.season_key).trim();
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    `arcade_close:${countryCode}:${purchaseSeason}`,
  ]);
  const closed = await client.query(
    `SELECT 1 FROM arcade_contest_seasons WHERE country_code = $1 AND season_key = $2`,
    [countryCode, purchaseSeason],
  );
  const bookSeason = closed.rows.length > 0 ? seasonKeyFor(now) : purchaseSeason;

  await client.query(
    `UPDATE arcade_contest_purchases SET status = $2 WHERE id = $1`,
    [row.id, kind === "dispute_lost" ? "chargeback" : "refunded"],
  );
  const base = { countryCode, currency, seasonKey: bookSeason, purchaseId: Number(row.id), note };
  await appendLedger(client, {
    ...base,
    kind: "pool_reversal",
    amountMinor: -Number(row.pool_minor),
    ref: `purchase:${row.id}:pool_reversal`,
  });
  await appendLedger(client, {
    ...base,
    kind: "platform_reversal",
    amountMinor: -Number(row.platform_minor),
    ref: `purchase:${row.id}:platform_reversal`,
  });
  await reconcileVotesInTx(client, Number(row.user_id), countryCode, purchaseSeason);
  return "reversed";
}

/** Voids the newest votes that the player's remaining paid purchases no longer cover. */
async function reconcileVotesInTx(
  client: TxClient,
  userId: number,
  countryCode: string,
  seasonKey: string,
): Promise<void> {
  const { granted, cast } = await voteTotals(client, userId, countryCode, seasonKey);
  let excess = cast - granted;
  if (excess <= 0) return;
  const rows = await client.query(
    `SELECT id, votes FROM arcade_contest_votes
      WHERE user_id = $1 AND country_code = $2 AND season_key = $3 AND voided = FALSE
      ORDER BY created_at DESC, id DESC`,
    [userId, countryCode, seasonKey],
  );
  for (const row of rows.rows) {
    if (excess <= 0) break;
    const votes = Number(row.votes);
    if (votes <= excess) {
      await client.query(`UPDATE arcade_contest_votes SET voided = TRUE WHERE id = $1`, [row.id]);
      excess -= votes;
    } else {
      await client.query(`UPDATE arcade_contest_votes SET votes = votes - $2 WHERE id = $1`, [
        row.id,
        excess,
      ]);
      excess = 0;
    }
  }
}

// ─── Votes ───────────────────────────────────────────────────────────────────

async function voteTotals(
  db: Queryable,
  userId: number,
  countryCode: string,
  seasonKey: string,
): Promise<{ granted: number; cast: number; remaining: number }> {
  const granted = await db.query(
    `SELECT COALESCE(SUM(votes_granted), 0) AS total FROM arcade_contest_purchases
      WHERE user_id = $1 AND country_code = $2 AND season_key = $3
        AND status IN ('paid', 'disputed')`,
    [userId, countryCode, seasonKey],
  );
  const cast = await db.query(
    `SELECT COALESCE(SUM(votes), 0) AS total FROM arcade_contest_votes
      WHERE user_id = $1 AND country_code = $2 AND season_key = $3 AND voided = FALSE`,
    [userId, countryCode, seasonKey],
  );
  const g = Number(granted.rows[0].total);
  const c = Number(cast.rows[0].total);
  return { granted: g, cast: c, remaining: Math.max(0, g - c) };
}

export async function playerStatus(db: Queryable, userId: number, now = new Date()) {
  const country = await billingCountry(db, userId);
  const contest = country ? await getContest(db, country) : null;
  const seasonKey = seasonKeyFor(now);
  const votes =
    contest && country
      ? await voteTotals(db, userId, country, seasonKey)
      : { granted: 0, cast: 0, remaining: 0 };
  return { country, contest, seasonKey, votes };
}

export async function castVotes(
  db: TxPool,
  input: { userId: number; artistId: number; count: number; now?: Date },
): Promise<
  { ok: true; remaining: number; artistId: number } | Failure
> {
  const now = input.now ?? new Date();
  return inTransaction(db, async (client): Promise<any> => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `arcade_votes:${input.userId}`,
    ]);
    const country = await billingCountry(client, input.userId);
    const contest = country ? await getContest(client, country) : null;
    if (!country || !contest || !contest.enabled) {
      return fail(403, "CONTEST_NOT_AVAILABLE", "The arcade contest is not open in your country.");
    }
    if (
      !Number.isInteger(input.count) ||
      input.count < 1 ||
      input.count > contest.maxVotesPerArtistPerDay
    ) {
      return fail(
        400,
        "INVALID_VOTE_COUNT",
        `Cast between 1 and ${contest.maxVotesPerArtistPerDay} votes at a time.`,
      );
    }
    const artist = await client.query(
      `SELECT a.id, a.user_id
         FROM artists a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.id = $1 AND a.country_code = $2
          AND COALESCE(u.role, 'artist') NOT IN ('admin', 'superuser')`,
      [input.artistId, country],
    );
    if (!artist.rows[0]) {
      return fail(404, "ARTIST_NOT_IN_CONTEST", "That artist is not in your country's contest.");
    }
    if (artist.rows[0].user_id !== null && Number(artist.rows[0].user_id) === input.userId) {
      return fail(403, "SELF_VOTE", "You cannot vote for yourself.");
    }

    const seasonKey = seasonKeyFor(now);
    const { remaining } = await voteTotals(client, input.userId, country, seasonKey);
    if (input.count > remaining) {
      return fail(409, "NO_VOTES_LEFT", "You have no votes left. Buy play time to earn more.");
    }
    const voteDay = now.toISOString().slice(0, 10);
    const today = await client.query(
      `SELECT COALESCE(SUM(votes), 0) AS total FROM arcade_contest_votes
        WHERE user_id = $1 AND artist_id = $2 AND vote_day = $3 AND voided = FALSE`,
      [input.userId, input.artistId, voteDay],
    );
    if (Number(today.rows[0].total) + input.count > contest.maxVotesPerArtistPerDay) {
      return fail(429, "DAILY_ARTIST_CAP", "Daily vote limit for this artist reached.");
    }
    await client.query(
      `INSERT INTO arcade_contest_votes (user_id, artist_id, country_code, season_key, vote_day, votes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.userId, input.artistId, country, seasonKey, voteDay, input.count],
    );
    return { ok: true, remaining: remaining - input.count, artistId: input.artistId };
  });
}

// ─── Public standings ────────────────────────────────────────────────────────

export async function contestStandings(
  db: Queryable,
  countryCode: string,
  seasonKey: string,
) {
  const rows = await db.query(
    `SELECT a.id, a.stage_name, COALESCE(SUM(v.votes), 0)::int AS votes
       FROM artists a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN arcade_contest_votes v
              ON v.artist_id = a.id AND v.country_code = $1
             AND v.season_key = $2 AND v.voided = FALSE
      WHERE a.country_code = $1
        AND COALESCE(u.role, 'artist') NOT IN ('admin', 'superuser')
      GROUP BY a.id, a.stage_name
      ORDER BY votes DESC, a.stage_name ASC
      LIMIT 50`,
    [countryCode, seasonKey],
  );
  return {
    seasonKey,
    poolMinor: Math.max(0, await poolBalance(db, countryCode, seasonKey)),
    artists: rows.rows.map((r: any) => ({
      artistId: Number(r.id),
      stageName: String(r.stage_name),
      votes: Number(r.votes),
    })),
  };
}

// ─── Season close ────────────────────────────────────────────────────────────

export interface ClosePlanRow {
  artistId: number;
  stageName: string;
  /** This season's share of the pool. */
  amountMinor: number;
  /** Earlier shares that stayed under the minimum and are added to this one. */
  carriedInMinor: number;
  /** amountMinor + carriedInMinor, the artist's balance after this close. */
  totalMinor: number;
  /** False while the balance is still under the minimum payout: it keeps accruing. */
  releases: boolean;
  votes: number;
  streams: number;
  /** Verified for payout with an approved contract; otherwise held in escrow. */
  eligible: boolean;
}

export interface ClosePlan {
  countryCode: string;
  currency: string;
  seasonKey: string;
  poolMinor: number;
  leftoverMinor: number;
  rows: ClosePlanRow[];
}

const ELIGIBLE_SQL = `(
  EXISTS (SELECT 1 FROM artist_profiles ap
           WHERE ap.user_id = a.user_id AND ap.verified_for_payout = TRUE)
  AND EXISTS (SELECT 1 FROM artist_contracts c
               WHERE c.user_id = a.user_id AND c.status = 'approved')
)`;

/** Streams of each artist this season; empty when the data cannot be matched. */
async function streamCounts(
  db: Queryable,
  countryCode: string,
  seasonKey: string,
): Promise<Map<number, number>> {
  const { start, end } = seasonRange(seasonKey);
  try {
    const res = await db.query(
      `SELECT a.id AS artist_id, COUNT(*)::int AS streams
         FROM stream_plays sp
         JOIN music_artists ma ON ma.id = sp.artist_id
         JOIN artists a ON LOWER(a.stage_name) = LOWER(ma.name) AND a.country_code = $1
        WHERE sp.created_at >= $2 AND sp.created_at < $3
          AND COALESCE(sp.completed, FALSE) = TRUE
          AND sp.user_id IS DISTINCT FROM a.user_id
        GROUP BY a.id`,
      [countryCode, start, end],
    );
    return new Map(res.rows.map((r: any) => [Number(r.artist_id), Number(r.streams)]));
  } catch {
    return new Map();
  }
}

async function buildClosePlan(
  db: Queryable,
  contest: ContestConfig,
  seasonKey: string,
): Promise<ClosePlan> {
  const poolMinor = await poolBalance(db, contest.countryCode, seasonKey);
  const voteRows = await db.query(
    `SELECT artist_id, SUM(votes)::int AS votes FROM arcade_contest_votes
      WHERE country_code = $1 AND season_key = $2 AND voided = FALSE
      GROUP BY artist_id`,
    [contest.countryCode, seasonKey],
  );
  const votes = new Map<number, number>(
    voteRows.rows.map((r: any) => [Number(r.artist_id), Number(r.votes)]),
  );
  const streams = await streamCounts(db, contest.countryCode, seasonKey);

  const ids = new Set([...votes.keys(), ...streams.keys()]);
  const entries: ContestEntry[] = [...ids].map((artistId) => ({
    artistId,
    votes: votes.get(artistId) ?? 0,
    streams: streams.get(artistId) ?? 0,
  }));
  // The minimum applies to an artist's running balance, not to the pool, so
  // nobody's share is dropped here.
  const { allocations } = allocatePool(
    poolMinor,
    entries,
    { voteBps: contest.voteWeightBps, streamBps: contest.streamWeightBps },
    1,
  );
  const share = new Map(allocations.map((a) => [a.artistId, a.amountMinor]));
  const accruedRows = await db.query(
    `SELECT artist_id, SUM(amount_minor) AS total FROM arcade_contest_payouts
      WHERE country_code = $1 AND status = 'accrued' GROUP BY artist_id`,
    [contest.countryCode],
  );
  const accrued = new Map<number, number>(
    accruedRows.rows.map((r: any) => [Number(r.artist_id), Number(r.total)]),
  );
  const artistIds = [...new Set([...share.keys(), ...accrued.keys()])].sort((a, b) => a - b);

  const info = artistIds.length
    ? await db.query(
        `SELECT a.id, a.stage_name, ${ELIGIBLE_SQL} AS eligible
           FROM artists a WHERE a.id = ANY($1::int[])`,
        [artistIds],
      )
    : { rows: [] as any[] };
  const byId = new Map<number, any>(info.rows.map((r: any) => [Number(r.id), r]));

  const minPayout = Math.max(1, contest.minPayoutMinor);
  const rows: ClosePlanRow[] = artistIds
    .map((artistId) => {
      const amountMinor = share.get(artistId) ?? 0;
      const carriedInMinor = accrued.get(artistId) ?? 0;
      const totalMinor = amountMinor + carriedInMinor;
      return {
        artistId,
        stageName: String(byId.get(artistId)?.stage_name ?? `Artist #${artistId}`),
        amountMinor,
        carriedInMinor,
        totalMinor,
        releases: totalMinor >= minPayout,
        votes: votes.get(artistId) ?? 0,
        streams: streams.get(artistId) ?? 0,
        eligible: byId.get(artistId)?.eligible === true,
      };
    })
    .filter((row) => row.amountMinor > 0 || row.releases);
  const distributed = rows.reduce((sum, r) => sum + r.amountMinor, 0);
  return {
    countryCode: contest.countryCode,
    currency: contest.currency,
    seasonKey,
    poolMinor,
    leftoverMinor: poolMinor - distributed,
    rows,
  };
}

/**
 * Closes one country's season. With commit=false it only returns the plan, so
 * staff can read exactly who would be paid what before anything is written.
 */
export async function closeSeason(
  db: TxPool,
  input: {
    countryCode: string;
    seasonKey: string;
    actorId: number | null;
    commit: boolean;
    now?: Date;
  },
): Promise<{ ok: true; committed: boolean; plan: ClosePlan } | Failure> {
  const now = input.now ?? new Date();
  if (!isSeasonKey(input.seasonKey)) {
    return fail(400, "INVALID_SEASON", "Season must look like 2026-11.");
  }
  return inTransaction(db, async (client): Promise<any> => {
    // Accrued balances span seasons, so closes of one country are serialized
    // on top of each season's own lock.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `arcade_close_country:${input.countryCode}`,
    ]);
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `arcade_close:${input.countryCode}:${input.seasonKey}`,
    ]);
    const contest = await getContest(client, input.countryCode);
    if (!contest) return fail(404, "CONTEST_NOT_FOUND", "Unknown contest country");
    if (seasonRange(input.seasonKey).end > now) {
      return fail(409, "SEASON_NOT_ENDED", "That season is still running.");
    }
    const closed = await client.query(
      `SELECT 1 FROM arcade_contest_seasons WHERE country_code = $1 AND season_key = $2`,
      [input.countryCode, input.seasonKey],
    );
    if (closed.rows.length > 0) {
      return fail(409, "ALREADY_CLOSED", "That season is already closed.");
    }

    const plan = await buildClosePlan(client, contest, input.seasonKey);
    if (!input.commit) return { ok: true, committed: false, plan };

    const base = {
      countryCode: contest.countryCode,
      currency: contest.currency,
      seasonKey: input.seasonKey,
    };
    await client.query(
      `INSERT INTO arcade_contest_seasons (country_code, season_key, closed_by, pool_minor, carried_minor)
       VALUES ($1, $2, $3, $4, $5)`,
      [contest.countryCode, input.seasonKey, input.actorId, plan.poolMinor, plan.leftoverMinor],
    );
    for (const row of plan.rows) {
      if (row.releases) {
        await client.query(
          `INSERT INTO arcade_contest_payouts
             (country_code, season_key, artist_id, currency, amount_minor, status, claim_deadline)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            contest.countryCode,
            input.seasonKey,
            row.artistId,
            contest.currency,
            row.totalMinor,
            row.eligible ? "payable" : "escrow",
            new Date(now.getTime() + contest.escrowDays * 86_400_000),
          ],
        );
        if (row.carriedInMinor > 0) {
          await client.query(
            `UPDATE arcade_contest_payouts SET status = 'merged'
              WHERE country_code = $1 AND artist_id = $2 AND status = 'accrued'`,
            [contest.countryCode, row.artistId],
          );
        }
      } else {
        await client.query(
          `INSERT INTO arcade_contest_payouts
             (country_code, season_key, artist_id, currency, amount_minor, status, claim_deadline)
           VALUES ($1, $2, $3, $4, $5, 'accrued', $6)`,
          [contest.countryCode, input.seasonKey, row.artistId, contest.currency, row.amountMinor, now],
        );
      }
      if (row.amountMinor > 0) {
        await appendLedger(client, {
          ...base,
          kind: "distribution",
          amountMinor: -row.amountMinor,
          ref: `distribution:${contest.countryCode}:${input.seasonKey}:${row.artistId}`,
          artistId: row.artistId,
        });
      }
    }
    if (plan.leftoverMinor !== 0) {
      await appendLedger(client, {
        ...base,
        kind: "carry_out",
        amountMinor: -plan.leftoverMinor,
        ref: `carry_out:${contest.countryCode}:${input.seasonKey}`,
      });
      await appendLedger(client, {
        ...base,
        seasonKey: nextSeasonKey(input.seasonKey),
        kind: "carry_in",
        amountMinor: plan.leftoverMinor,
        ref: `carry_in:${contest.countryCode}:${input.seasonKey}`,
      });
    }
    return { ok: true, committed: true, plan };
  });
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export async function listPayouts(
  db: Queryable,
  filter: { countryCode?: string; status?: string },
) {
  const res = await db.query(
    `SELECT p.id, p.country_code, p.season_key, p.artist_id, a.stage_name, p.currency,
            p.amount_minor, p.status, p.claim_deadline, p.paid_reference, p.paid_at,
            ${ELIGIBLE_SQL} AS eligible
       FROM arcade_contest_payouts p JOIN artists a ON a.id = p.artist_id
      WHERE ($1::text IS NULL OR p.country_code = $1)
        AND ($2::text IS NULL OR p.status = $2)
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 200`,
    [filter.countryCode ?? null, filter.status ?? null],
  );
  return res.rows.map((r: any) => ({
    id: Number(r.id),
    countryCode: String(r.country_code).trim(),
    seasonKey: String(r.season_key).trim(),
    artistId: Number(r.artist_id),
    stageName: String(r.stage_name),
    currency: String(r.currency).trim(),
    amountMinor: Number(r.amount_minor),
    status: String(r.status),
    claimDeadline: r.claim_deadline,
    overdue: r.status === "escrow" && new Date(r.claim_deadline) < new Date(),
    eligible: r.eligible === true,
    paidReference: r.paid_reference ?? null,
    paidAt: r.paid_at ?? null,
  }));
}

/** Artists' own earnings, for the rows linked to their account. */
export async function artistPayouts(db: Queryable, userId: number) {
  const res = await db.query(
    `SELECT p.id, p.country_code, p.season_key, a.stage_name, p.currency, p.amount_minor,
            p.status, p.claim_deadline, ${ELIGIBLE_SQL} AS eligible
       FROM arcade_contest_payouts p JOIN artists a ON a.id = p.artist_id
      WHERE a.user_id = $1 AND p.status <> 'merged'
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 100`,
    [userId],
  );
  return res.rows.map((r: any) => ({
    id: Number(r.id),
    countryCode: String(r.country_code).trim(),
    seasonKey: String(r.season_key).trim(),
    stageName: String(r.stage_name),
    currency: String(r.currency).trim(),
    amountMinor: Number(r.amount_minor),
    status: String(r.status),
    claimDeadline: r.status === "escrow" ? r.claim_deadline : null,
    needsVerification: r.status === "escrow" && r.eligible !== true,
  }));
}

/** Escrowed payouts whose artist has since been verified become payable. */
export async function releaseEligibleEscrow(
  db: Queryable,
  countryCode?: string,
): Promise<number> {
  const res = await db.query(
    `UPDATE arcade_contest_payouts p SET status = 'payable'
       FROM artists a
      WHERE a.id = p.artist_id AND p.status = 'escrow'
        AND ($1::text IS NULL OR p.country_code = $1)
        AND ${ELIGIBLE_SQL}
      RETURNING p.id`,
    [countryCode ?? null],
  );
  return res.rows.length;
}

export async function markPayoutPaid(
  db: TxPool,
  input: { payoutId: number; reference: string; actorId: number | null },
): Promise<{ ok: true } | Failure> {
  return inTransaction(db, async (client): Promise<any> => {
    const res = await client.query(
      `UPDATE arcade_contest_payouts
          SET status = 'paid', paid_reference = $2, paid_at = NOW(), paid_by = $3
        WHERE id = $1 AND status = 'payable'
        RETURNING country_code, season_key, artist_id, currency, amount_minor`,
      [input.payoutId, input.reference, input.actorId],
    );
    const row = res.rows[0];
    if (!row) {
      return fail(409, "NOT_PAYABLE", "That payout is not waiting to be paid.");
    }
    await appendLedger(client, {
      countryCode: String(row.country_code).trim(),
      currency: String(row.currency).trim(),
      seasonKey: String(row.season_key).trim(),
      kind: "payout_paid",
      amountMinor: Number(row.amount_minor),
      ref: `payout_paid:${input.payoutId}`,
      artistId: Number(row.artist_id),
      note: input.reference,
    });
    return { ok: true };
  });
}

export async function recentLedger(
  db: Queryable,
  countryCode: string,
  limit = 100,
) {
  const res = await db.query(
    `SELECT id, season_key, kind, amount_minor, currency, ref, purchase_id, artist_id, note, created_at
       FROM arcade_contest_ledger WHERE country_code = $1
      ORDER BY id DESC LIMIT $2`,
    [countryCode, Math.min(Math.max(limit, 1), 500)],
  );
  return res.rows.map((r: any) => ({
    id: Number(r.id),
    seasonKey: String(r.season_key).trim(),
    kind: String(r.kind),
    amountMinor: Number(r.amount_minor),
    currency: String(r.currency).trim(),
    ref: String(r.ref),
    purchaseId: r.purchase_id === null ? null : Number(r.purchase_id),
    artistId: r.artist_id === null ? null : Number(r.artist_id),
    note: r.note ?? null,
    createdAt: r.created_at,
  }));
}

/**
 * Integer-only maths for the country arcade contests. Amounts are whole minor
 * units (XOF and XAF have none), so no float ever touches money here.
 */
export const BPS = 10_000;

export function splitPurchase(
  amountMinor: number,
  poolBps: number,
): { poolMinor: number; platformMinor: number } {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError("amountMinor must be a positive integer");
  }
  if (!Number.isInteger(poolBps) || poolBps < 0 || poolBps > BPS) {
    throw new RangeError("poolBps must be between 0 and 10000");
  }
  const poolMinor = Number((BigInt(amountMinor) * BigInt(poolBps)) / BigInt(BPS));
  return { poolMinor, platformMinor: amountMinor - poolMinor };
}

export interface ContestEntry {
  artistId: number;
  votes: number;
  streams: number;
}

export interface ContestWeights {
  voteBps: number;
  streamBps: number;
}

export interface Allocation {
  artistId: number;
  amountMinor: number;
}

export interface PoolAllocation {
  allocations: Allocation[];
  /** Money that stays in the pool for the next season. */
  carriedMinor: number;
}

/**
 * Splits `poolMinor` as voteBps * vote share + streamBps * stream share. A side
 * with no activity drops out and the other side takes its weight, so a season
 * without stream data pays on votes alone. Shares are exact rationals and the
 * rounding remainder goes to the largest fractions, so the allocations always
 * add up to the pool. Payouts under `minPayoutMinor` are carried forward.
 */
export function allocatePool(
  poolMinor: number,
  entries: readonly ContestEntry[],
  weights: ContestWeights,
  minPayoutMinor: number,
): PoolAllocation {
  const pool = Math.max(0, Math.trunc(poolMinor));
  const totalVotes = entries.reduce((sum, e) => sum + Math.max(0, e.votes), 0);
  const totalStreams = entries.reduce((sum, e) => sum + Math.max(0, e.streams), 0);
  const voteWeight = totalVotes > 0 ? weights.voteBps : 0;
  const streamWeight = totalStreams > 0 ? weights.streamBps : 0;
  if (pool === 0 || voteWeight + streamWeight === 0) {
    return { allocations: [], carriedMinor: pool };
  }

  const votesBase = BigInt(voteWeight > 0 ? totalVotes : 1);
  const streamsBase = BigInt(streamWeight > 0 ? totalStreams : 1);
  const denominator = BigInt(voteWeight + streamWeight) * votesBase * streamsBase;
  const poolBig = BigInt(pool);

  const rows = entries
    .map((entry) => {
      const numerator =
        BigInt(voteWeight) * BigInt(Math.max(0, entry.votes)) * streamsBase +
        BigInt(streamWeight) * BigInt(Math.max(0, entry.streams)) * votesBase;
      const scaled = poolBig * numerator;
      return {
        artistId: entry.artistId,
        amount: scaled / denominator,
        remainder: scaled % denominator,
      };
    })
    .filter((row) => row.amount > BigInt(0) || row.remainder > BigInt(0));

  let leftover = poolBig - rows.reduce((sum, row) => sum + row.amount, BigInt(0));
  const byFraction = [...rows].sort((a, b) =>
    a.remainder === b.remainder
      ? a.artistId - b.artistId
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const row of byFraction) {
    if (leftover <= BigInt(0)) break;
    row.amount += BigInt(1);
    leftover -= BigInt(1);
  }

  const allocations: Allocation[] = [];
  let carried = BigInt(0);
  for (const row of rows.sort((a, b) => a.artistId - b.artistId)) {
    if (row.amount <= BigInt(0)) continue;
    if (row.amount < BigInt(Math.max(1, minPayoutMinor))) {
      carried += row.amount;
    } else {
      allocations.push({ artistId: row.artistId, amountMinor: Number(row.amount) });
    }
  }
  return { allocations, carriedMinor: Number(carried + leftover) };
}

const SEASON_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isSeasonKey(value: unknown): value is string {
  return typeof value === "string" && SEASON_KEY.test(value);
}

/** Contests run on UTC calendar months. */
export function seasonKeyFor(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function seasonRange(key: string): { start: Date; end: Date } {
  const match = SEASON_KEY.exec(key);
  if (!match) throw new RangeError("Invalid season key");
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

export function nextSeasonKey(key: string): string {
  return seasonKeyFor(seasonRange(key).end);
}

import { STREAMROYALE_ROYALTY_RULES } from "@shared/streamroyale-policy";

export const ROYALTY_RULES = STREAMROYALE_ROYALTY_RULES;

export const MINIMUM_ROYALTY_CREDIT_CENTS =
  ROYALTY_RULES.minimumWalletCreditCents;

export function getRoyaltyQualification(
  validStreams: number,
  payingListeners: number,
) {
  const qualifies =
    validStreams >= ROYALTY_RULES.minimumValidStreams &&
    payingListeners >= ROYALTY_RULES.minimumPayingListeners;
  const streamsNeeded = ROYALTY_RULES.minimumValidStreams - validStreams;
  const listenersNeeded =
    ROYALTY_RULES.minimumPayingListeners - payingListeners;
  return {
    qualifies,
    reason: qualifies
      ? "Qualifies"
      : streamsNeeded > 0
        ? `Needs ${streamsNeeded} more valid stream${streamsNeeded === 1 ? "" : "s"}`
        : `Needs ${listenersNeeded} more paying listener${listenersNeeded === 1 ? "" : "s"}`,
  };
}

export type RoyaltyArtistInput = {
  artistProfileId: number;
  weightedStreams: number;
  badgeBoostPercent: number;
  carryForwardCents: number;
};

export type RoyaltyArtistAllocation = {
  artistProfileId: number;
  guaranteedCents: number;
  performanceCents: number;
  badgeBonusCents: number;
  earnedCents: number;
  walletCreditCents: number;
  carryForwardCents: number;
};

export type WeeklyRoyaltyCalculation = {
  totalPoolCents: number;
  guaranteedFundCents: number;
  performancePoolCents: number;
  platformCutCents: number;
  allocations: RoyaltyArtistAllocation[];
  totalEarnedCents: number;
};

function toCents(amount: number, label: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number`);
  }
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`${label} exceeds the safe currency range`);
  }
  return cents;
}

function splitEvenly(cents: number, ids: number[]): Map<number, number> {
  const sortedIds = [...ids].sort((a, b) => a - b);
  const base = Math.floor(cents / sortedIds.length);
  const remainder = cents - base * sortedIds.length;
  return new Map(
    sortedIds.map((id, index) => [id, base + (index < remainder ? 1 : 0)]),
  );
}

function apportionWeighted(
  cents: number,
  artists: RoyaltyArtistInput[],
): Map<number, number> {
  const weighted = artists.map((artist) => {
    if (!Number.isFinite(artist.weightedStreams) || artist.weightedStreams < 0) {
      throw new RangeError("weightedStreams must be finite and non-negative");
    }
    if (
      !Number.isFinite(artist.badgeBoostPercent) ||
      artist.badgeBoostPercent < 0
    ) {
      throw new RangeError("badgeBoostPercent must be finite and non-negative");
    }

    const weight =
      artist.weightedStreams * (1 + artist.badgeBoostPercent / 100);
    if (!Number.isFinite(weight)) {
      throw new RangeError("weighted performance must be finite");
    }
    return {
      id: artist.artistProfileId,
      weight,
    };
  });
  const totalWeight = weighted.reduce((sum, artist) => sum + artist.weight, 0);
  if (!Number.isFinite(totalWeight)) {
    throw new RangeError("total weighted performance must be finite");
  }
  if (totalWeight === 0) return new Map(weighted.map(({ id }) => [id, 0]));

  const shares = weighted.map(({ id, weight }) => {
    const exact = (cents * weight) / totalWeight;
    return { id, cents: Math.floor(exact), remainder: exact % 1 };
  });
  let remaining = cents - shares.reduce((sum, share) => sum + share.cents, 0);
  const byLargestRemainder = [...shares].sort(
    (a, b) => b.remainder - a.remainder || a.id - b.id,
  );
  for (let i = 0; i < remaining; i++) {
    byLargestRemainder[i].cents++;
  }

  return new Map(shares.map(({ id, cents: shareCents }) => [id, shareCents]));
}

export function calculateWeeklyRoyalties(
  totalPool: number,
  artists: RoyaltyArtistInput[],
): WeeklyRoyaltyCalculation {
  const totalPoolCents = toCents(totalPool, "totalPool");
  const guaranteedFundCents = Math.floor(
    (totalPoolCents * ROYALTY_RULES.guaranteedPoolPercent) / 100,
  );
  const performancePoolCents = Math.floor(
    (totalPoolCents * ROYALTY_RULES.performancePoolPercent) / 100,
  );
  const platformCutCents =
    totalPoolCents - guaranteedFundCents - performancePoolCents;
  const ids = artists.map((artist) => artist.artistProfileId);

  if (new Set(ids).size !== ids.length) {
    throw new Error("artistProfileId values must be unique");
  }

  const guaranteedShares = splitEvenly(guaranteedFundCents, ids);
  const performanceShares = apportionWeighted(performancePoolCents, artists);
  const allocations = artists.map((artist) => {
    const guaranteedCents = guaranteedShares.get(artist.artistProfileId) ?? 0;
    const totalPerformanceCents =
      performanceShares.get(artist.artistProfileId) ?? 0;
    const boostFactor = 1 + artist.badgeBoostPercent / 100;
    const basePerformanceCents = Math.floor(totalPerformanceCents / boostFactor);
    const badgeBonusCents = totalPerformanceCents - basePerformanceCents;
    const earnedCents = guaranteedCents + totalPerformanceCents;
    if (
      !Number.isSafeInteger(artist.carryForwardCents) ||
      artist.carryForwardCents < 0
    ) {
      throw new RangeError("carryForwardCents must be a non-negative integer");
    }
    const priorCarryCents = artist.carryForwardCents;
    const accruedCents = earnedCents + priorCarryCents;
    if (!Number.isSafeInteger(accruedCents)) {
      throw new RangeError("accrued royalty exceeds the safe currency range");
    }
    const walletCreditCents =
      accruedCents >= MINIMUM_ROYALTY_CREDIT_CENTS ? accruedCents : 0;

    return {
      artistProfileId: artist.artistProfileId,
      guaranteedCents,
      performanceCents: basePerformanceCents,
      badgeBonusCents,
      earnedCents,
      walletCreditCents,
      carryForwardCents: accruedCents - walletCreditCents,
    };
  });

  return {
    totalPoolCents,
    guaranteedFundCents,
    performancePoolCents,
    platformCutCents,
    allocations,
    totalEarnedCents: allocations.reduce(
      (sum, allocation) => sum + allocation.earnedCents,
      0,
    ),
  };
}

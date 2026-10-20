import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateWeeklyRoyalties,
  getRoyaltyQualification,
} from "./royalty-calculation.ts";

test("qualification matches the configured stream and paying-listener thresholds", () => {
  assert.deepEqual(getRoyaltyQualification(9, 3), {
    qualifies: false,
    reason: "Needs 1 more valid stream",
  });
  assert.deepEqual(getRoyaltyQualification(10, 2), {
    qualifies: false,
    reason: "Needs 1 more paying listener",
  });
  assert.deepEqual(getRoyaltyQualification(10, 3), {
    qualifies: true,
    reason: "Qualifies",
  });
});

test("one artist receives the guaranteed and performance shares without exceeding the pool", () => {
  const result = calculateWeeklyRoyalties(1, [
    {
      artistProfileId: 1,
      weightedStreams: 10,
      badgeBoostPercent: 0,
      carryForwardCents: 0,
    },
  ]);

  assert.equal(result.guaranteedFundCents, 20);
  assert.equal(result.performancePoolCents, 70);
  assert.equal(result.platformCutCents, 10);
  assert.equal(result.totalEarnedCents, 90);
  assert.equal(result.allocations[0].walletCreditCents, 0);
  assert.equal(result.allocations[0].carryForwardCents, 90);
  assert.ok(
    result.guaranteedFundCents +
      result.performancePoolCents +
      result.platformCutCents <=
      result.totalPoolCents,
  );
});

test("1,000 artists and a one-cent pool preserve the pool invariant", () => {
  const artists = Array.from({ length: 1000 }, (_, index) => ({
    artistProfileId: index + 1,
    weightedStreams: 1,
    badgeBoostPercent: 0,
    carryForwardCents: 0,
  }));
  const result = calculateWeeklyRoyalties(0.01, artists);

  assert.equal(result.totalEarnedCents, 0);
  assert.equal(result.platformCutCents, 1);
  assert.equal(
    result.allocations.reduce((sum, allocation) => sum + allocation.earnedCents, 0),
    0,
  );
  assert.ok(
    result.guaranteedFundCents +
      result.performancePoolCents +
      result.platformCutCents <=
      result.totalPoolCents,
  );
});

test("badge boosts change relative performance shares but remain inside the pool", () => {
  const result = calculateWeeklyRoyalties(10, [
    {
      artistProfileId: 1,
      weightedStreams: 10,
      badgeBoostPercent: 0,
      carryForwardCents: 0,
    },
    {
      artistProfileId: 2,
      weightedStreams: 10,
      badgeBoostPercent: 5,
      carryForwardCents: 0,
    },
  ]);

  const boosted = result.allocations.find((row) => row.artistProfileId === 2)!;
  const unboosted = result.allocations.find((row) => row.artistProfileId === 1)!;
  const allArtistEarnings = result.allocations.reduce(
    (sum, allocation) => sum + allocation.earnedCents,
    0,
  );

  assert.ok(boosted.performanceCents + boosted.badgeBonusCents >
    unboosted.performanceCents + unboosted.badgeBonusCents);
  assert.equal(
    result.allocations.reduce(
      (sum, allocation) =>
        sum + allocation.performanceCents + allocation.badgeBonusCents,
      0,
    ),
    result.performancePoolCents,
  );
  assert.ok(allArtistEarnings <= result.totalPoolCents);
});

test("royalty balances roll forward until they reach one dollar", () => {
  const firstWeek = calculateWeeklyRoyalties(1, [
    {
      artistProfileId: 1,
      weightedStreams: 1,
      badgeBoostPercent: 0,
      carryForwardCents: 0,
    },
  ]);
  const nextWeek = calculateWeeklyRoyalties(1, [
    {
      artistProfileId: 1,
      weightedStreams: 1,
      badgeBoostPercent: 0,
      carryForwardCents: firstWeek.allocations[0].carryForwardCents,
    },
  ]);

  assert.equal(firstWeek.allocations[0].walletCreditCents, 0);
  assert.equal(nextWeek.allocations[0].walletCreditCents, 180);
  assert.equal(nextWeek.allocations[0].carryForwardCents, 0);
});

test("rejects duplicate artists and invalid pool inputs", () => {
  const artist = {
    artistProfileId: 1,
    weightedStreams: 1,
    badgeBoostPercent: 0,
    carryForwardCents: 0,
  };

  assert.throws(() => calculateWeeklyRoyalties(-1, []), RangeError);
  assert.throws(() => calculateWeeklyRoyalties(Number.MAX_VALUE, []), RangeError);
  assert.throws(() => calculateWeeklyRoyalties(1, [artist, artist]), /unique/);
  assert.throws(
    () =>
      calculateWeeklyRoyalties(1, [
        {
          ...artist,
          weightedStreams: 1_000_000,
          badgeBoostPercent: Number.MAX_VALUE,
        },
      ]),
    /finite/,
  );
});

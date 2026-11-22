import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocatePool,
  nextSeasonKey,
  seasonKeyFor,
  seasonRange,
  splitPurchase,
} from "./arcade-contest-math";

const WEIGHTS = { voteBps: 6000, streamBps: 4000 };
const total = (rows: { amountMinor: number }[]) =>
  rows.reduce((sum, row) => sum + row.amountMinor, 0);

describe("splitPurchase", () => {
  it("keeps every minor unit and never rounds the pool up", () => {
    assert.deepEqual(splitPurchase(500, 7000), { poolMinor: 350, platformMinor: 150 });
    assert.deepEqual(splitPurchase(2001, 7000), { poolMinor: 1400, platformMinor: 601 });
    assert.deepEqual(splitPurchase(1, 7000), { poolMinor: 0, platformMinor: 1 });
  });

  it("rejects non-integer or out-of-range input", () => {
    assert.throws(() => splitPurchase(5.5, 7000));
    assert.throws(() => splitPurchase(0, 7000));
    assert.throws(() => splitPurchase(500, 10001));
  });
});

describe("allocatePool", () => {
  it("pays 60% on vote share and 40% on stream share", () => {
    const result = allocatePool(
      10_000,
      [
        { artistId: 1, votes: 30, streams: 0 },
        { artistId: 2, votes: 10, streams: 100 },
      ],
      WEIGHTS,
      0,
    );
    // artist 1: 0.6 * 0.75 = 45%; artist 2: 0.6 * 0.25 + 0.4 * 1 = 55%
    assert.deepEqual(result.allocations, [
      { artistId: 1, amountMinor: 4500 },
      { artistId: 2, amountMinor: 5500 },
    ]);
    assert.equal(result.carriedMinor, 0);
  });

  it("always adds up to the pool, whatever the rounding", () => {
    const entries = [
      { artistId: 1, votes: 7, streams: 13 },
      { artistId: 2, votes: 11, streams: 5 },
      { artistId: 3, votes: 3, streams: 29 },
    ];
    for (const pool of [1, 2, 3, 97, 1000, 123_457, 99_999_999]) {
      const result = allocatePool(pool, entries, WEIGHTS, 0);
      assert.equal(total(result.allocations) + result.carriedMinor, pool);
    }
  });

  it("pays on votes alone when no streams were recorded", () => {
    const result = allocatePool(
      1000,
      [
        { artistId: 1, votes: 1, streams: 0 },
        { artistId: 2, votes: 3, streams: 0 },
      ],
      WEIGHTS,
      0,
    );
    assert.deepEqual(result.allocations, [
      { artistId: 1, amountMinor: 250 },
      { artistId: 2, amountMinor: 750 },
    ]);
  });

  it("carries the whole pool when nobody voted or streamed", () => {
    const result = allocatePool(5000, [{ artistId: 1, votes: 0, streams: 0 }], WEIGHTS, 0);
    assert.deepEqual(result, { allocations: [], carriedMinor: 5000 });
  });

  it("carries shares under the minimum payout forward", () => {
    const result = allocatePool(
      1000,
      [
        { artistId: 1, votes: 95, streams: 0 },
        { artistId: 2, votes: 5, streams: 0 },
      ],
      WEIGHTS,
      100,
    );
    assert.deepEqual(result.allocations, [{ artistId: 1, amountMinor: 950 }]);
    assert.equal(result.carriedMinor, 50);
  });

  it("breaks rounding ties by artist id so a rerun gives the same result", () => {
    const entries = [
      { artistId: 9, votes: 1, streams: 0 },
      { artistId: 4, votes: 1, streams: 0 },
      { artistId: 7, votes: 1, streams: 0 },
    ];
    const a = allocatePool(100, entries, WEIGHTS, 0);
    const b = allocatePool(100, [...entries].reverse(), WEIGHTS, 0);
    assert.deepEqual(a, b);
    assert.deepEqual(a.allocations, [
      { artistId: 4, amountMinor: 34 },
      { artistId: 7, amountMinor: 33 },
      { artistId: 9, amountMinor: 33 },
    ]);
  });

  it("ignores a negative pool", () => {
    const result = allocatePool(-500, [{ artistId: 1, votes: 5, streams: 0 }], WEIGHTS, 0);
    assert.deepEqual(result, { allocations: [], carriedMinor: 0 });
  });
});

describe("seasons", () => {
  it("uses UTC calendar months", () => {
    assert.equal(seasonKeyFor(new Date("2026-11-30T23:59:59Z")), "2026-11");
    assert.equal(seasonKeyFor(new Date("2026-12-01T00:00:00Z")), "2026-12");
    assert.equal(nextSeasonKey("2026-12"), "2027-01");
    assert.equal(seasonRange("2026-02").end.toISOString(), "2026-03-01T00:00:00.000Z");
    assert.throws(() => seasonRange("2026-13"));
  });
});

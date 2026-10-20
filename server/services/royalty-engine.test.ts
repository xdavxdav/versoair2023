import assert from "node:assert/strict";
import test from "node:test";
import type { PoolClient } from "pg";

import { distributeWeeklyPool } from "./royalty-engine.ts";

const poolRow = { id: 23, total_pool: "100.00" };
const artistRow = {
  artist_profile_id: 5,
  revenue_boost_percent: 0,
  royalty_carry_forward: "0.25",
  user_id: null,
  stage_name: "Test Artist",
  league_id: 1,
  stream_count: "10",
  weighted_streams: "8",
};

function fakeClient(options: {
  artists?: typeof artistRow[];
  failOn?: string;
} = {}) {
  const calls: Array<{ query: string; values?: unknown[] }> = [];
  let released = false;
  const client = {
    async query(query: string, values?: unknown[]) {
      calls.push({ query, values });
      if (options.failOn && query.includes(options.failOn)) {
        throw new Error("simulated database failure");
      }
      if (
        query.includes("UPDATE weekly_pools SET status = 'locked'") &&
        query.includes("RETURNING *")
      ) {
        return { rows: [poolRow], rowCount: 1 };
      }
      if (query.includes("FROM weekly_pools") && query.includes("FOR UPDATE")) {
        return { rows: [poolRow], rowCount: 1 };
      }
      if (query.includes("WITH weekly_events AS")) {
        return { rows: options.artists ?? [artistRow], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {
      released = true;
    },
  };

  return {
    calls,
    client: client as unknown as PoolClient,
    wasReleased: () => released,
    connect: async () => client as unknown as PoolClient,
  };
}

function matchingCall(
  calls: Array<{ query: string; values?: unknown[] }>,
  fragment: string,
) {
  const call = calls.find(({ query }) => query.includes(fragment));
  assert.ok(call, `expected query containing: ${fragment}`);
  return call;
}

test("dry-run previews allocations and rolls back without issuing writes", async () => {
  const fake = fakeClient();

  const result = await distributeWeeklyPool(12, 2026, {
    dryRun: true,
    connect: fake.connect,
  });

  assert.equal(result.distributed, false);
  assert.equal(result.dryRun, true);
  assert.equal(result.totalDistributed, 90);
  assert.equal(result.qualifyingArtists, 1);
  assert.deepEqual(result.distributions, [
    {
      artistProfileId: 5,
      stageName: "Test Artist",
      streams: 10,
      weightedStreams: 8,
      guaranteedAmount: 20,
      performanceAmount: 70,
      badgeBonus: 0,
      totalEarnings: 90,
      walletCredit: 90.25,
      carryForward: 0,
    },
  ]);

  assert.ok(fake.calls.some(({ query }) => query === "BEGIN"));
  assert.ok(fake.calls.some(({ query }) => query === "ROLLBACK"));
  assert.ok(!fake.calls.some(({ query }) => query === "COMMIT"));
  assert.equal(
    fake.calls.filter(({ query }) =>
      /^(INSERT|UPDATE|DELETE)\b/i.test(query.trim()),
    ).length,
    0,
  );
  const qualificationQuery = matchingCall(fake.calls, "WITH weekly_events AS").query;
  assert.match(qualificationQuery, /ls\.current_period_start IS NOT NULL/);
  assert.match(qualificationQuery, /ls\.current_period_end > se\.created_at/);
  assert.equal(fake.wasReleased(), true);
});

test("successful distribution atomically credits wallets and closes the pool", async () => {
  const fake = fakeClient();

  const result = await distributeWeeklyPool(12, 2026, {
    connect: fake.connect,
  });

  assert.equal(result.distributed, true);
  assert.equal(result.totalDistributed, 90);
  assert.equal(result.qualifyingArtists, 1);
  assert.equal(fake.calls.at(-1)?.query, "COMMIT");

  const royaltyInsert = matchingCall(fake.calls, "INSERT INTO artist_royalties");
  assert.deepEqual(royaltyInsert.values?.slice(0, 8), [
    5, 12, 2026, "20.00", "70.00", "0.00", "90.00", 10,
  ]);
  const walletUpdate = matchingCall(fake.calls, "wallet_balance = COALESCE");
  assert.deepEqual(walletUpdate.values, ["90.25", "0.00", 5]);
  const poolUpdate = matchingCall(
    fake.calls,
    "qualifying_artists = $4, status = 'distributed'",
  );
  assert.deepEqual(poolUpdate.values, ["20.00", "70.00", "10.00", 1, 23]);
  assert.equal(fake.wasReleased(), true);
});

test("database failures roll back the distribution and release the client", async () => {
  const fake = fakeClient({ failOn: "wallet_balance = COALESCE" });

  await assert.rejects(
    distributeWeeklyPool(12, 2026, { connect: fake.connect }),
    /simulated database failure/,
  );

  assert.ok(fake.calls.some(({ query }) => query === "ROLLBACK"));
  assert.ok(!fake.calls.some(({ query }) => query === "COMMIT"));
  assert.equal(fake.wasReleased(), true);
});

test("dry-run with no qualifying artists rolls back and reports no payouts", async () => {
  const fake = fakeClient({ artists: [] });

  const result = await distributeWeeklyPool(12, 2026, {
    dryRun: true,
    connect: fake.connect,
  });

  assert.equal(result.distributed, false);
  assert.equal(result.dryRun, true);
  assert.equal(result.qualifyingArtists, 0);
  assert.equal(result.reason, "No qualifying artists");
  assert.ok(fake.calls.some(({ query }) => query === "ROLLBACK"));
  assert.ok(
    !fake.calls.some(({ query }) =>
      /^(INSERT|UPDATE|DELETE)\b/i.test(query.trim()),
    ),
  );
  assert.equal(fake.wasReleased(), true);
});

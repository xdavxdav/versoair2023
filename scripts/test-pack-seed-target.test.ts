import assert from "node:assert/strict";
import test from "node:test";

import { assertTestPackSeedTarget } from "./test-pack-seed-target";

const LOCAL = "postgresql://127.0.0.1:5432/versoair_payments_sandbox";
const STAGING = "postgresql://db.example.test:5432/versoair_staging";

test("local seeding requires an explicit opt-in and permits loopback only", () => {
  assert.doesNotThrow(() =>
    assertTestPackSeedTarget({
      ALLOW_TEST_PACK_SEED: "true",
      DATABASE_URL: LOCAL,
      NODE_ENV: "development",
    }),
  );
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        ALLOW_TEST_PACK_SEED: "true",
        DATABASE_URL: "postgresql://db.example.test:5432/versoair_staging",
        NODE_ENV: "development",
      }),
    /loopback database/,
  );
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        ALLOW_TEST_PACK_SEED: "true",
        DATABASE_URL: LOCAL,
        NODE_ENV: "production",
      }),
    /Refusing to seed a test pack in production/,
  );
});

test("staging seeding requires an explicit target and the exact staging database", () => {
  assert.doesNotThrow(() =>
    assertTestPackSeedTarget({
      ALLOW_TEST_PACK_SEED: "true",
      TEST_PACK_TARGET: "staging",
      DATABASE_URL: STAGING,
      NODE_ENV: "production",
    }),
  );
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        ALLOW_TEST_PACK_SEED: "true",
        TEST_PACK_TARGET: "staging",
        DATABASE_URL: "postgresql://db.example.test:5432/versoair_business_intelligence",
        NODE_ENV: "production",
      }),
    /versoair_staging database/,
  );
});

test("seeding refuses missing opt-in, invalid URLs, and unknown targets", () => {
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        DATABASE_URL: LOCAL,
        NODE_ENV: "development",
      }),
    /ALLOW_TEST_PACK_SEED=true/,
  );
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        ALLOW_TEST_PACK_SEED: "true",
        DATABASE_URL: "not-a-url",
        NODE_ENV: "development",
      }),
    /valid PostgreSQL URL/,
  );
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        ALLOW_TEST_PACK_SEED: "true",
        DATABASE_URL: "postgresql://127.0.0.1:5432",
        NODE_ENV: "development",
      }),
    /must name a database/,
  );
  assert.throws(
    () =>
      assertTestPackSeedTarget({
        ALLOW_TEST_PACK_SEED: "true",
        TEST_PACK_TARGET: "production",
        DATABASE_URL: LOCAL,
        NODE_ENV: "development",
      }),
    /must be local or staging/,
  );
});

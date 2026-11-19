export interface TestPackSeedEnvironment {
  ALLOW_TEST_PACK_SEED?: string;
  TEST_PACK_TARGET?: string;
  NODE_ENV?: string;
  DATABASE_URL?: string;
}

export function assertTestPackSeedTarget(
  env: TestPackSeedEnvironment,
): void {
  if (env.NODE_ENV === "production" && env.TEST_PACK_TARGET !== "staging") {
    throw new Error("Refusing to seed a test pack in production.");
  }
  if (env.ALLOW_TEST_PACK_SEED !== "true") {
    throw new Error("Set ALLOW_TEST_PACK_SEED=true to seed the test pack.");
  }
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }
  if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  const host = databaseUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("DATABASE_URL has an invalid database name.");
  }
  if (!databaseName) throw new Error("DATABASE_URL must name a database.");
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const target = env.TEST_PACK_TARGET ?? "local";

  if (target === "local") {
    if (!localHost) {
      throw new Error("The local test pack seeder only permits a loopback database.");
    }
    return;
  }

  if (target === "staging") {
    if (databaseName !== "versoair_staging") {
      throw new Error(
        "Staging test-pack seeding only permits the versoair_staging database.",
      );
    }
    return;
  }

  throw new Error("TEST_PACK_TARGET must be local or staging.");
}

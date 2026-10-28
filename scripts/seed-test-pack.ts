import "dotenv/config";

function assertLocalSeedTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a test pack in production.");
  }
  if (process.env.ALLOW_TEST_PACK_SEED !== "true") {
    throw new Error("Set ALLOW_TEST_PACK_SEED=true to seed the local test pack.");
  }
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL is required.");
  const host = new URL(rawUrl).hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    throw new Error("The test pack seeder only permits a loopback database.");
  }
}

async function main() {
  assertLocalSeedTarget();
  const { pool } = await import("../server/db");
  try {
    const result = await pool.query(
      `INSERT INTO marketing_packs
         (name, slug, tier, description, price_cents, features, active, sort_order)
       VALUES
         ('Round 8 Sandbox Test Pack', 'round-8-sandbox-test-pack', 'starter',
          'Local-only CAD checkout verification item.', 100,
          '[]'::jsonb, true, 0)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             tier = EXCLUDED.tier,
             description = EXCLUDED.description,
             price_cents = EXCLUDED.price_cents,
             features = EXCLUDED.features,
             active = true
       RETURNING id, slug, price_cents`,
    );
    console.log("Local Stripe test item ready:", result.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Could not seed the local Stripe test item:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});

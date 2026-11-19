import "dotenv/config";
import { assertTestPackSeedTarget } from "./test-pack-seed-target";

async function main() {
  assertTestPackSeedTarget(process.env);
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
    console.log("Stripe test item ready:", result.rows[0]);
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

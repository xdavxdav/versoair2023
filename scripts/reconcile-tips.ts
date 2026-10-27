// Read-only. Usage: DATABASE_URL=... LEGACY_TIP_INCOME=0 npx tsx scripts/reconcile-tips.ts
import pg from "pg";
import { reconcileTips } from "./reconcile-tips-core";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  const debits = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM wallet_transactions
      WHERE type = 'tip_sent' AND status = 'completed'`,
  );
  const income = await client.query(
    `SELECT COALESCE(SUM(tip_income), 0)::text AS total FROM artist_royalties`,
  );
  await client.query("ROLLBACK");

  const result = reconcileTips({
    debitedTotal: Number(debits.rows[0].total),
    artistTipIncome: Number(income.rows[0].total),
    legacyCreditedWithoutDebit: Number(process.env.LEGACY_TIP_INCOME ?? 0),
  });
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
} finally {
  await client.end();
}

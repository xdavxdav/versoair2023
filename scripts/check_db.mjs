import pkg from "pg";
const { Client } = pkg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Please set DATABASE_URL env var");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const tables = ["businesses", "ad_performance", "reservations"];
    for (const t of tables) {
      const res = await client.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
      console.log(`${t}:`, res.rows[0].cnt);
    }

    // sample preview
    const sample = await client.query(
      "SELECT * FROM businesses ORDER BY created_at DESC LIMIT 5"
    );
    console.log("\nLatest 5 businesses:");
    console.table(sample.rows);
  } catch (err) {
    console.error("Query error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();

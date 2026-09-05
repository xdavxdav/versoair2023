const pg = require("pg");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 30000, // 30 second timeout
});

async function test() {
  try {
    console.log("🔗 Connecting to NEON...");
    await client.connect();
    console.log("✅ Connected!");
    
    console.log("⏱️  Testing query...");
    const result = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;");
    console.log("✅ Query successful!");
    console.log(`Found ${result.rows.length} tables (showing first 5):`);
    console.table(result.rows);
    
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
    console.log("🔌 Connection closed");
  }
}

test();

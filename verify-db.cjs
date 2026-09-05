const pg = require("pg");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 30000,
});

async function verify() {
  try {
    await client.connect();
    console.log("\n✅ NEON Database Connection: OK\n");
    
    // Check transactions table
    const transResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `);
    
    console.log("📋 Transactions Table Structure:");
    console.table(transResult.rows);
    
    // Check if data exists
    const countResult = await client.query("SELECT COUNT(*) as count FROM transactions;");
    console.log(`\n📊 Transaction Records: ${countResult.rows[0].count}\n`);
    
    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`✅ Total Tables in Database: ${tablesResult.rows.length}\n`);
    
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

verify();

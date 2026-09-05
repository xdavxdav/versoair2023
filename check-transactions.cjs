const pg = require("pg");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect().then(() => {
  console.log("📊 Checking transactions table constraints...\n");
  
  return client.query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'transactions'
    ORDER BY constraint_name;
  `).then(result => {
    console.log("Current constraints on 'transactions' table:");
    console.table(result.rows);
    
    console.log("\n📋 Checking transactions table columns...\n");
    return client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `);
  }).then(result => {
    console.log("Columns in 'transactions' table:");
    console.table(result.rows);
  });
}).then(() => client.end())
  .catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });

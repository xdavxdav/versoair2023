import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function getAllBusinesses() {
  try {
    await client.connect();

    // First, check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("\n=== Available Tables ===");
    console.log(tablesResult.rows.map((r: any) => r.table_name).join("\n"));

    // Check if businesses table exists and what columns it has
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'businesses'
      ORDER BY ordinal_position;
    `);

    console.log("\n=== Businesses Table Columns ===");
    if (columnsResult.rows.length > 0) {
      columnsResult.rows.forEach((col: any) => {
        console.log(`${col.column_name}: ${col.data_type}`);
      });

      // Get all businesses
      const allBusinesses = await client.query("SELECT * FROM businesses");
      console.log(
        `\n✓ Found ${allBusinesses.rows.length} businesses in the database\n`,
      );
      console.log(JSON.stringify(allBusinesses.rows, null, 2));
    } else {
      console.log("No businesses table found");
    }
  } catch (error) {
    console.error("Error querying businesses:", error);
  } finally {
    await client.end();
  }
}

getAllBusinesses();

import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();

    console.log("=== CLEANUP: Removing Test Data ===\n");

    // Delete test finance businesses
    await client.query(`
      DELETE FROM businesses WHERE category_id = 5 AND slug IN (
        'global-banking-solutions',
        'forex-exchange-pro',
        'investment-capital-group',
        'microfinance-international',
        'digital-wallet-services',
        'stock-brokerage-plus',
        'insurance-protect-ltd',
        'asset-management-pro',
        'fintech-innovations-inc',
        'crypto-exchange-hub'
      )
    `);
    console.log("✓ Deleted test finance businesses");

    // Delete other test records
    await client.query("DELETE FROM businesses WHERE id IN (1, 2)");
    console.log("✓ Deleted test businesses (ID 1-2)");

    // Check pool tables
    console.log("\n=== CHECKING POOL TABLES ===\n");
    const poolTables = [
      "restaurants_businesses",
      "hotellerie_businesses",
      "technology_businesses",
      "healthcare_businesses",
      "commerce_businesses",
      "retail_businesses",
      "automobile_businesses",
      "advertising_businesses",
      "divertissement_businesses",
    ];

    for (const table of poolTables) {
      try {
        const result = await client.query(
          `SELECT COUNT(*) as count FROM ${table}`,
        );
        console.log(`✓ ${table}: ${result.rows[0].count} records`);
      } catch (err: any) {
        console.log(`✗ ${table}: TABLE DOES NOT EXIST`);
      }
    }

    // Show current data
    console.log("\n=== CURRENT DATABASE STATUS ===\n");

    const bizCount = await client.query(
      "SELECT COUNT(*) as count FROM businesses",
    );
    const catCount = await client.query(
      "SELECT COUNT(*) as count FROM business_categories",
    );
    const userCount = await client.query("SELECT COUNT(*) as count FROM users");

    console.log(`Businesses: ${bizCount.rows[0].count} records`);
    console.log(`Categories: ${catCount.rows[0].count} records`);
    console.log(`Users: ${userCount.rows[0].count} records`);

    console.log("\n=== CATEGORIES ===\n");
    const categories = await client.query(
      "SELECT id, name, slug FROM business_categories ORDER BY id",
    );
    categories.rows.forEach((row: any) => {
      console.log(`  ${row.id}: ${row.name} (${row.slug})`);
    });

    console.log("\n=== REMAINING BUSINESSES ===\n");
    const businesses = await client.query(
      "SELECT id, name, category_id FROM businesses LIMIT 10",
    );
    if (businesses.rows.length > 0) {
      businesses.rows.forEach((row: any) => {
        console.log(`  ${row.id}: ${row.name} (category: ${row.category_id})`);
      });
    } else {
      console.log("  No businesses found");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

main();

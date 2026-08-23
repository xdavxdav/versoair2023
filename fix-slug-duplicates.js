const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixDuplicates() {
  try {
    console.log("\n🔍 Step 1: Checking for duplicate slugs...");
    const checkDuplicates = await pool.query(`
      SELECT slug, COUNT(*) as count
      FROM business_categories
      GROUP BY slug
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `);

    if (checkDuplicates.rows.length === 0) {
      console.log("✅ No duplicates found! All slugs are unique.");
      await pool.end();
      return;
    }

    console.log(`⚠️  Found ${checkDuplicates.rows.length} duplicate slugs:`);
    checkDuplicates.rows.forEach((row) => {
      console.log(`   - "${row.slug}" appears ${row.count} times`);
    });

    console.log("\n🔧 Step 2: Fixing duplicates by appending ID...");
    const fixResult = await pool.query(`
      UPDATE business_categories
      SET slug = slug || '-' || id
      WHERE slug IN (
        SELECT slug
        FROM business_categories
        GROUP BY slug
        HAVING COUNT(*) > 1
      );
    `);

    console.log(`✅ Fixed ${fixResult.rowCount} duplicate entries`);

    console.log("\n✔️  Step 3: Verifying all slugs are now unique...");
    const verifyResult = await pool.query(`
      SELECT slug, COUNT(*) as count
      FROM business_categories
      GROUP BY slug
      HAVING COUNT(*) > 1;
    `);

    if (verifyResult.rows.length === 0) {
      console.log(
        "✅ Perfect! All 359 business_categories now have unique slugs.",
      );
    } else {
      console.log("❌ Warning: Still found duplicates:", verifyResult.rows);
    }

    console.log(
      "\n📊 Total unique categories:",
      (await pool.query("SELECT COUNT(*) as count FROM business_categories"))
        .rows[0].count,
    );

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

fixDuplicates();

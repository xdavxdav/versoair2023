import pg from "pg";

const pool = new pg.Pool({
  user: "versoair",
  password: "versoair2025",
  host: "localhost",
  port: 5432,
  database: "versoair_business_intelligence",
});

(async () => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug FROM business_categories ORDER BY name`,
    );

    console.log("\n📊 DATABASE CATEGORIES:\n");
    console.log("ID | Slug | Name");
    console.log("-".repeat(80));
    result.rows.forEach((row) => {
      console.log(
        `${String(row.id).padEnd(3)} | ${row.slug.padEnd(25)} | ${row.name}`,
      );
    });

    console.log("\n\n📄 PAGE ENDPOINTS vs DATABASE SLUGS:\n");
    console.log("-".repeat(80));

    const pageMapping = [
      { page: "commerce.tsx", endpoint: "commerce" },
      { page: "finances.tsx", endpoint: "finance" },
      { page: "hotellerie.tsx", endpoint: "hotels" },
      { page: "automobile.tsx", endpoint: "automotive-motorbike" },
      { page: "batiment.tsx", endpoint: "building-construction" },
      { page: "divertissement.tsx", endpoint: "tourism-leisure" },
    ];

    pageMapping.forEach(({ page, endpoint }) => {
      const found = result.rows.find((r) => r.slug === endpoint);
      const status = found ? "✅ CONNECTED" : "❌ MISSING";
      const info = found
        ? `(ID: ${found.id}, Name: ${found.name})`
        : "(NO MATCHING CATEGORY)";
      console.log(
        `${status.padEnd(14)} ${page.padEnd(20)} -> /api/category/${endpoint.padEnd(25)} ${info}`,
      );
    });

    console.log("\n");

    // Check for businesses in each category
    console.log("📊 BUSINESSES PER CATEGORY:\n");
    console.log("-".repeat(80));

    for (const { endpoint } of pageMapping) {
      const catResult = await pool.query(
        `SELECT COUNT(*) as count FROM businesses 
         WHERE category_id = (SELECT id FROM business_categories WHERE slug = $1)`,
        [endpoint],
      );
      const count = catResult.rows[0]?.count || 0;
      console.log(`${endpoint.padEnd(25)} | ${count} businesses`);
    }

    console.log("\n");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();

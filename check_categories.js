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
    console.log("---".repeat(30));
    result.rows.forEach((row) => {
      console.log(`${row.id} | ${row.slug} | ${row.name}`);
    });

    console.log("\n\n📄 PAGE ENDPOINTS vs DATABASE SLUGS:\n");

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
      const status = found ? "✅" : "❌";
      console.log(
        `${status} ${page.padEnd(20)} -> /api/category/${endpoint} ${found ? "(ID: " + found.id + ")" : "(NOT FOUND)"}`,
      );
    });

    console.log("\n");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node
/**
 * Launch business seed script (idempotent)
 *
 * Seeds realistic business rows tied to existing category/country/region/city records.
 * Safe to run multiple times: duplicate (name + city_id) rows are skipped.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed-launch-businesses.cjs
 *   DATABASE_URL=... node scripts/seed-launch-businesses.cjs --count=200
 */

const pg = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const countArg = process.argv.find((a) => a.startsWith("--count="));
const targetCount = Number(countArg?.split("=")[1] || 150);
if (!Number.isFinite(targetCount) || targetCount <= 0) {
  console.error("❌ Invalid --count value");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const BRAND_PREFIXES = [
  "Nova",
  "Atlas",
  "Prime",
  "Urban",
  "Blue",
  "Metro",
  "Elite",
  "Global",
  "Vertex",
  "Apex",
  "Silver",
  "Golden",
];

const BRAND_SUFFIXES = [
  "Group",
  "Hub",
  "Solutions",
  "Studios",
  "Partners",
  "Center",
  "Network",
  "Works",
  "Collective",
  "Point",
];

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function pick(arr, i) {
  return arr[i % arr.length];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  const client = await pool.connect();
  try {
    const categoriesRes = await client.query(
      `
      SELECT id, name, slug
      FROM business_categories
      ORDER BY main_category DESC, id ASC
      `,
    );
    const citiesRes = await client.query(
      `
      SELECT
        c.id,
        c.name,
        c.region_id,
        r.country_id,
        COALESCE(ct.code, 'US') AS country_code
      FROM cities c
      LEFT JOIN regions r ON r.id = c.region_id
      LEFT JOIN countries ct ON ct.id = r.country_id
      ORDER BY c.id ASC
      `,
    );

    if (categoriesRes.rows.length === 0) {
      throw new Error(
        "No business categories found. Run structural seed first (scripts/seed-production.cjs).",
      );
    }
    if (citiesRes.rows.length === 0) {
      throw new Error(
        "No cities found. Run structural seed first (scripts/seed-production.cjs).",
      );
    }

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < targetCount; i++) {
      const category = pick(categoriesRes.rows, i);
      const city = pick(citiesRes.rows, i * 3 + 7);
      const prefix = pick(BRAND_PREFIXES, i * 5 + 2);
      const suffix = pick(BRAND_SUFFIXES, i * 7 + 4);

      const businessName = `${prefix} ${city.name} ${suffix}`;
      const websiteSlug = slugify(`${businessName}-${category.slug || category.name}`);
      const emailSlug = slugify(`${prefix}-${city.name}-${i}`);
      const rating = (Math.random() * 1.6 + 3.2).toFixed(1); // 3.2..4.8
      const reviewsCount = randomInt(4, 260);
      const description = `${businessName} provides ${category.name} services in ${city.name}.`;

      const result = await client.query(
        `
        INSERT INTO businesses (
          name,
          description,
          phone,
          email,
          address,
          location,
          country_code,
          country_id,
          region_id,
          city_id,
          city_name,
          category_id,
          website,
          rating,
          reviews_count,
          is_verified,
          is_active,
          tier,
          featured,
          approval_status,
          created_at,
          updated_at
        )
        SELECT
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20,
          NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM businesses b
          WHERE LOWER(b.name) = LOWER($1)
            AND b.city_id = $10
        )
        RETURNING id
        `,
        [
          businessName,
          description,
          `+1-555-${String(1000 + (i % 9000))}`,
          `contact+${emailSlug}@versoair.local`,
          `${randomInt(10, 990)} ${city.name} Business Ave`,
          city.name,
          city.country_code,
          city.country_id || null,
          city.region_id || null,
          city.id,
          city.name,
          category.id,
          `https://${websiteSlug}.example.com`,
          rating,
          reviewsCount,
          i % 3 === 0,
          true,
          i % 8 === 0 ? "premium" : "free",
          i % 11 === 0,
          "approved",
        ],
      );

      if (result.rowCount > 0) {
        inserted += 1;
      } else {
        skipped += 1;
      }
    }

    const totals = await client.query(
      `
      SELECT
        COUNT(*)::int AS total_businesses,
        COUNT(DISTINCT category_id)::int AS categories_used,
        COUNT(DISTINCT country_code)::int AS countries_used
      FROM businesses
      `,
    );

    const summary = totals.rows[0];
    console.log("✅ Launch business seed complete");
    console.log(`   Requested: ${targetCount}`);
    console.log(`   Inserted : ${inserted}`);
    console.log(`   Skipped  : ${skipped}`);
    console.log(`   Total businesses : ${summary.total_businesses}`);
    console.log(`   Categories used  : ${summary.categories_used}`);
    console.log(`   Countries used   : ${summary.countries_used}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌ Launch seed failed:", err.message || err);
  process.exit(1);
});

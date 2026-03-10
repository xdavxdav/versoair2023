/**
 * Production Seed Script
 * ─────────────────────
 * Seeds essential data into the Render PostgreSQL database:
 *   1. Test users (6 accounts with bcrypt-hashed passwords)
 *   2. Countries (35 countries for geo filters)
 *   3. Main business categories (32 top-level categories)
 *
 * Idempotent — safe to run multiple times (ON CONFLICT DO NOTHING).
 * Usage: DATABASE_URL=... node scripts/seed-production.cjs
 */

const pg = require("pg");
const bcrypt = require("bcryptjs");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ─── 1. TEST USERS ──────────────────────────────────────────────────────────
const PASSWORD = "VersoTest2026!";

const TEST_USERS = [
  { username: "superadmin_test", email: "superadmin@versoair.test", role: "superuser", tier: "enterprise" },
  { username: "sys_operator",    email: "operator@versoair.test",   role: "superuser", tier: "enterprise" },
  { username: "admin_test",      email: "admin@versoair.test",      role: "admin",     tier: "max" },
  { username: "moderator_test",  email: "moderator@versoair.test",  role: "moderator", tier: "verified" },
  { username: "business_owner_test", email: "owner@versoair.test",  role: "business_owner", tier: "essential" },
  { username: "free_user_test",  email: "freeuser@versoair.test",   role: "user",      tier: "free" },
];

// ─── 2. COUNTRIES ────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: "United States", code: "US" },
  { name: "Canada", code: "CA" },
  { name: "Mexico", code: "MX" },
  { name: "Brazil", code: "BR" },
  { name: "Haiti", code: "HT" },
  { name: "France", code: "FR" },
  { name: "Germany", code: "DE" },
  { name: "United Kingdom", code: "GB" },
  { name: "Belgium", code: "BE" },
  { name: "Switzerland", code: "CH" },
  { name: "Spain", code: "ES" },
  { name: "Italy", code: "IT" },
  { name: "Portugal", code: "PT" },
  { name: "Côte d'Ivoire", code: "CI" },
  { name: "Senegal", code: "SN" },
  { name: "Cameroon", code: "CM" },
  { name: "Mali", code: "ML" },
  { name: "Burkina Faso", code: "BF" },
  { name: "Guinea", code: "GN" },
  { name: "Togo", code: "TG" },
  { name: "Benin", code: "BJ" },
  { name: "Niger", code: "NE" },
  { name: "Madagascar", code: "MG" },
  { name: "DR Congo", code: "CD" },
  { name: "Congo", code: "CG" },
  { name: "Gabon", code: "GA" },
  { name: "Morocco", code: "MA" },
  { name: "Algeria", code: "DZ" },
  { name: "Tunisia", code: "TN" },
  { name: "South Africa", code: "ZA" },
  { name: "Nigeria", code: "NG" },
  { name: "Japan", code: "JP" },
  { name: "China", code: "CN" },
  { name: "India", code: "IN" },
  { name: "United Arab Emirates", code: "AE" },
];

// ─── 3. MAIN BUSINESS CATEGORIES ────────────────────────────────────────────
const CATEGORIES = [
  { name: "Commerce", slug: "commerce", desc: "Retail shops, stores and commercial services." },
  { name: "Tourism & Leisure", slug: "tourism-leisure", desc: "Tours, hospitality, transport, events and leisure activities." },
  { name: "Building & Construction", slug: "building-construction", desc: "Building companies, civil engineering, public works, construction materials and equipment." },
  { name: "Automotive & Motorbike", slug: "automotive-motorbike", desc: "Car dealerships, repair shops, tire services, parts and motorcycle businesses." },
  { name: "Finance", slug: "finance", desc: "Banks, insurance, microfinance, investment and money transfer services." },
  { name: "Entertainment & Sports", slug: "entertainment-sports", desc: "Restaurants, bars, cinemas, sports venues and live music." },
  { name: "Health", slug: "health", desc: "Hospitals, clinics, pharmacies, laboratories and wellness." },
  { name: "Real Estate", slug: "real-estate", desc: "Property agencies, developers, management and appraisers." },
  { name: "Communication & Advertising", slug: "communication-advertising", desc: "Advertising agencies, marketing, media and graphic design." },
  { name: "IT & Internet", slug: "it-internet", desc: "Software, IT support, cloud services, ISPs and cybersecurity." },
  { name: "Accounting, Legal & Advisory", slug: "accounting-legal-advisory", desc: "Accounting firms, law offices, notaries and tax advisors." },
  { name: "Food & Beverage", slug: "food-beverage", desc: "Restaurants, cafés, bakeries, catering and food retail." },
  { name: "Animals & Pets", slug: "animals-pets", desc: "Veterinary clinics, pet shops, grooming and livestock." },
  { name: "Artisans & Trades", slug: "artisans-trades", desc: "Carpenters, welders, painters, flooring and cleaning services." },
  { name: "Home & Interior Design", slug: "home-interior-design", desc: "Interior design, furniture, décor and lighting." },
  { name: "Fashion & Textiles", slug: "fashion-textiles", desc: "Clothing stores, designers, fabric shops and accessories." },
  { name: "Telecommunications", slug: "telecommunications", desc: "Phone operators, ISPs, network equipment and support." },
  { name: "Agri-Food & Agriculture", slug: "agri-food-agriculture", desc: "Agricultural suppliers, crops, livestock and food processing." },
  { name: "Transportation & Logistics", slug: "transportation-logistics", desc: "Shipping, warehousing, taxis, airlines and port services." },
  { name: "Administration & Government", slug: "administration-government", desc: "Government agencies, social services, education and public safety." },
  { name: "Education & Training", slug: "education-training", desc: "Schools, universities, vocational training, language and e-learning." },
  { name: "Import & Export", slug: "import-export", desc: "Importers, exporters, customs brokers and trade associations." },
  { name: "Professional Services", slug: "professional-services", desc: "HR, recruitment, consulting and brokerage services." },
  { name: "Utilities & Energy", slug: "utilities-energy", desc: "Electricity, water, gas and renewable energy providers." },
  { name: "Media & Entertainment", slug: "media-entertainment", desc: "Radio, TV, newspapers, music and recording studios." },
  { name: "Sports & Fitness", slug: "sports-fitness", desc: "Gyms, sports clubs, equipment and personal training." },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", desc: "Hair salons, spas, cosmetics and barber shops." },
  { name: "Manufacturing & Industry", slug: "manufacturing-industry", desc: "Heavy industry, textiles, plastics and chemical production." },
  { name: "Wholesale & Distribution", slug: "wholesale-distribution", desc: "General, food, electronics and pharmaceutical wholesale." },
  { name: "Security & Safety", slug: "security-safety", desc: "Security companies, surveillance, fire safety and risk management." },
  { name: "Waste Management", slug: "waste-management", desc: "Collection, recycling, hazardous waste and composting." },
  { name: "Miscellaneous Services", slug: "miscellaneous-services", desc: "Repair shops, rental services, storage and translation." },
];

// ─── RUN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("\n🌱 Production Seed — starting...\n");

  try {
    // ── Check DB connectivity ──
    const client = await pool.connect();
    console.log("✅ Database connected");
    client.release();

    // ── Detect available columns in users table ──
    const colResult = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
    );
    const cols = colResult.rows.map((r) => r.column_name);
    const hasVerified = cols.includes("is_verified");
    const hasTier = cols.includes("subscription_tier");
    const hasStatus = cols.includes("subscription_status");

    // ── Seed Users ──
    console.log("\n👤 Seeding users...");
    const hash = bcrypt.hashSync(PASSWORD, 12);

    for (const u of TEST_USERS) {
      try {
        let insertCols = "username, email, password, role, created_at";
        let insertVals = "$1, $2, $3, $4, NOW()";
        let params = [u.username, u.email, hash, u.role];
        let idx = 5;

        if (hasVerified) {
          insertCols += ", is_verified";
          insertVals += `, $${idx++}`;
          params.push(true);
        }
        if (hasTier) {
          insertCols += ", subscription_tier";
          insertVals += `, $${idx++}`;
          params.push(u.tier);
        }
        if (hasStatus) {
          insertCols += ", subscription_status";
          insertVals += `, $${idx++}`;
          params.push("active");
        }

        await pool.query(
          `INSERT INTO users (${insertCols}) VALUES (${insertVals})
           ON CONFLICT (email) DO UPDATE SET
             password = EXCLUDED.password,
             role = EXCLUDED.role
             ${hasTier ? ", subscription_tier = EXCLUDED.subscription_tier" : ""}
             ${hasStatus ? ", subscription_status = EXCLUDED.subscription_status" : ""}
             ${hasVerified ? ", is_verified = EXCLUDED.is_verified" : ""}`,
          params
        );
        console.log(`  ✅ ${u.role.padEnd(16)} | ${u.email}`);
      } catch (err) {
        console.error(`  ❌ ${u.email}: ${err.message}`);
      }
    }

    // ── Seed Countries ──
    console.log("\n🌍 Seeding countries...");
    let countriesInserted = 0;
    for (const c of COUNTRIES) {
      try {
        const result = await pool.query(
          `INSERT INTO countries (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING id`,
          [c.name, c.code]
        );
        if (result.rowCount > 0) countriesInserted++;
      } catch (err) {
        // Table might not exist yet — skip silently
        if (err.code === "42P01") {
          console.log("  ⚠️  countries table not found — skipping");
          break;
        }
      }
    }
    console.log(`  ✅ ${countriesInserted} new countries inserted (${COUNTRIES.length} total defined)`);

    // ── Seed Business Categories ──
    console.log("\n📂 Seeding business categories...");
    let catsInserted = 0;
    for (const cat of CATEGORIES) {
      try {
        const result = await pool.query(
          `INSERT INTO business_categories (name, slug, description, main_category)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (slug) DO NOTHING RETURNING id`,
          [cat.name, cat.slug, cat.desc]
        );
        if (result.rowCount > 0) catsInserted++;
      } catch (err) {
        if (err.code === "42P01") {
          console.log("  ⚠️  business_categories table not found — skipping");
          break;
        }
      }
    }
    console.log(`  ✅ ${catsInserted} new categories inserted (${CATEGORIES.length} total defined)`);

    // ── Summary ──
    console.log("\n" + "─".repeat(60));
    console.log("🎉 Production seed complete!");
    console.log("─".repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS (all accounts):");
    console.log(`   Password: ${PASSWORD}`);
    console.log("─".repeat(60));
    for (const u of TEST_USERS) {
      console.log(`   ${u.role.toUpperCase().padEnd(16)} → ${u.email}`);
    }
    console.log("─".repeat(60) + "\n");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

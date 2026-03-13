/**
 * Production Seed Script — STRUCTURAL DATA ONLY
 * ────────────────────────────────────────────────
 * Seeds essential structural/reference data into PostgreSQL:
 *   1. Superadmin user
 *   2. Countries (35)
 *   3. Regions (60+)
 *   4. Cities (60+)
 *   5. Business categories (32)
 *   6. Payment card types (4)
 *
 * All business/user data is populated organically by real users.
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

// ════════════════════════════════════════════════════════════════════════════
// 1. TEST USERS
// ════════════════════════════════════════════════════════════════════════════
const PASSWORD = "JoeyD000";

const TEST_USERS = [
  {
    username: "superadmin_test",
    email: "superadmin@versoair.test",
    role: "superuser",
    tier: "enterprise",
    gateUsername: "joel_007",
  },
];

// ════════════════════════════════════════════════════════════════════════════
// 2. COUNTRIES
// ════════════════════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════════════════════
// 3. REGIONS
// ════════════════════════════════════════════════════════════════════════════
const REGIONS = [
  // Côte d'Ivoire
  { name: "Lagunes", country: "CI" },
  { name: "Haut-Sassandra", country: "CI" },
  { name: "Savanes", country: "CI" },
  { name: "Sassandra-Marahoué", country: "CI" },
  { name: "Vallée du Bandama", country: "CI" },
  { name: "Comoé", country: "CI" },
  { name: "Montagnes", country: "CI" },
  // France
  { name: "Île-de-France", country: "FR" },
  { name: "Provence-Alpes-Côte d'Azur", country: "FR" },
  { name: "Auvergne-Rhône-Alpes", country: "FR" },
  { name: "Nouvelle-Aquitaine", country: "FR" },
  { name: "Occitanie", country: "FR" },
  // USA
  { name: "New York", country: "US" },
  { name: "California", country: "US" },
  { name: "Texas", country: "US" },
  { name: "Florida", country: "US" },
  { name: "Illinois", country: "US" },
  // Senegal
  { name: "Dakar", country: "SN" },
  { name: "Thiès", country: "SN" },
  { name: "Saint-Louis", country: "SN" },
  // Cameroon
  { name: "Centre", country: "CM" },
  { name: "Littoral", country: "CM" },
  { name: "Ouest-CM", country: "CM" },
  // Haiti
  { name: "Ouest-HT", country: "HT" },
  { name: "Nord", country: "HT" },
  { name: "Sud", country: "HT" },
  // Nigeria
  { name: "Lagos", country: "NG" },
  { name: "Abuja FCT", country: "NG" },
  { name: "Rivers", country: "NG" },
  // Morocco
  { name: "Casablanca-Settat", country: "MA" },
  { name: "Rabat-Salé-Kénitra", country: "MA" },
  { name: "Marrakech-Safi", country: "MA" },
  // South Africa
  { name: "Gauteng", country: "ZA" },
  { name: "Western Cape", country: "ZA" },
  { name: "KwaZulu-Natal", country: "ZA" },
  // Canada
  { name: "Québec", country: "CA" },
  { name: "Ontario", country: "CA" },
  { name: "British Columbia", country: "CA" },
  // Germany
  { name: "Berlin", country: "DE" },
  { name: "Bavaria", country: "DE" },
  { name: "North Rhine-Westphalia", country: "DE" },
  // UK
  { name: "Greater London", country: "GB" },
  { name: "West Midlands", country: "GB" },
  { name: "Greater Manchester", country: "GB" },
  // Belgium
  { name: "Brussels-Capital", country: "BE" },
  { name: "Wallonia", country: "BE" },
  { name: "Flanders", country: "BE" },
  // Gabon
  { name: "Estuaire", country: "GA" },
  { name: "Haut-Ogooué", country: "GA" },
  // DR Congo
  { name: "Kinshasa", country: "CD" },
  { name: "Haut-Katanga", country: "CD" },
  // Guinea
  { name: "Conakry", country: "GN" },
  // Mali
  { name: "Bamako", country: "ML" },
  // Togo
  { name: "Maritime", country: "TG" },
  // Benin
  { name: "Littoral-BJ", country: "BJ" },
  // Madagascar
  { name: "Analamanga", country: "MG" },
  // UAE
  { name: "Dubai", country: "AE" },
  { name: "Abu Dhabi", country: "AE" },
];

// ════════════════════════════════════════════════════════════════════════════
// 4. CITIES
// ════════════════════════════════════════════════════════════════════════════
const CITIES = [
  // Côte d'Ivoire
  { name: "Abidjan", region: "Lagunes", country: "CI" },
  { name: "Bingerville", region: "Lagunes", country: "CI" },
  { name: "Grand-Bassam", region: "Lagunes", country: "CI" },
  { name: "Daloa", region: "Haut-Sassandra", country: "CI" },
  { name: "Korhogo", region: "Savanes", country: "CI" },
  { name: "Bouaké", region: "Vallée du Bandama", country: "CI" },
  { name: "San-Pédro", region: "Sassandra-Marahoué", country: "CI" },
  { name: "Man", region: "Montagnes", country: "CI" },
  { name: "Aboisso", region: "Comoé", country: "CI" },
  // France
  { name: "Paris", region: "Île-de-France", country: "FR" },
  { name: "Marseille", region: "Provence-Alpes-Côte d'Azur", country: "FR" },
  { name: "Lyon", region: "Auvergne-Rhône-Alpes", country: "FR" },
  { name: "Bordeaux", region: "Nouvelle-Aquitaine", country: "FR" },
  { name: "Toulouse", region: "Occitanie", country: "FR" },
  { name: "Nice", region: "Provence-Alpes-Côte d'Azur", country: "FR" },
  // USA
  { name: "New York City", region: "New York", country: "US" },
  { name: "Los Angeles", region: "California", country: "US" },
  { name: "Houston", region: "Texas", country: "US" },
  { name: "Miami", region: "Florida", country: "US" },
  { name: "Chicago", region: "Illinois", country: "US" },
  { name: "San Francisco", region: "California", country: "US" },
  // Senegal
  { name: "Dakar", region: "Dakar", country: "SN" },
  { name: "Thiès", region: "Thiès", country: "SN" },
  { name: "Saint-Louis", region: "Saint-Louis", country: "SN" },
  // Cameroon
  { name: "Yaoundé", region: "Centre", country: "CM" },
  { name: "Douala", region: "Littoral", country: "CM" },
  { name: "Bafoussam", region: "Ouest-CM", country: "CM" },
  // Haiti
  { name: "Port-au-Prince", region: "Ouest-HT", country: "HT" },
  { name: "Cap-Haïtien", region: "Nord", country: "HT" },
  { name: "Les Cayes", region: "Sud", country: "HT" },
  // Nigeria
  { name: "Lagos", region: "Lagos", country: "NG" },
  { name: "Abuja", region: "Abuja FCT", country: "NG" },
  { name: "Port Harcourt", region: "Rivers", country: "NG" },
  // Morocco
  { name: "Casablanca", region: "Casablanca-Settat", country: "MA" },
  { name: "Rabat", region: "Rabat-Salé-Kénitra", country: "MA" },
  { name: "Marrakech", region: "Marrakech-Safi", country: "MA" },
  // South Africa
  { name: "Johannesburg", region: "Gauteng", country: "ZA" },
  { name: "Cape Town", region: "Western Cape", country: "ZA" },
  { name: "Durban", region: "KwaZulu-Natal", country: "ZA" },
  // Canada
  { name: "Montréal", region: "Québec", country: "CA" },
  { name: "Toronto", region: "Ontario", country: "CA" },
  { name: "Vancouver", region: "British Columbia", country: "CA" },
  // Germany
  { name: "Berlin", region: "Berlin", country: "DE" },
  { name: "Munich", region: "Bavaria", country: "DE" },
  { name: "Cologne", region: "North Rhine-Westphalia", country: "DE" },
  // UK
  { name: "London", region: "Greater London", country: "GB" },
  { name: "Birmingham", region: "West Midlands", country: "GB" },
  { name: "Manchester", region: "Greater Manchester", country: "GB" },
  // Belgium
  { name: "Brussels", region: "Brussels-Capital", country: "BE" },
  { name: "Liège", region: "Wallonia", country: "BE" },
  { name: "Antwerp", region: "Flanders", country: "BE" },
  // Gabon
  { name: "Libreville", region: "Estuaire", country: "GA" },
  { name: "Franceville", region: "Haut-Ogooué", country: "GA" },
  // DR Congo
  { name: "Kinshasa", region: "Kinshasa", country: "CD" },
  { name: "Lubumbashi", region: "Haut-Katanga", country: "CD" },
  // Guinea
  { name: "Conakry", region: "Conakry", country: "GN" },
  // Mali
  { name: "Bamako", region: "Bamako", country: "ML" },
  // Togo
  { name: "Lomé", region: "Maritime", country: "TG" },
  // Benin
  { name: "Cotonou", region: "Littoral-BJ", country: "BJ" },
  // Madagascar
  { name: "Antananarivo", region: "Analamanga", country: "MG" },
  // UAE
  { name: "Dubai", region: "Dubai", country: "AE" },
  { name: "Abu Dhabi", region: "Abu Dhabi", country: "AE" },
];

// ════════════════════════════════════════════════════════════════════════════
// 5. BUSINESS CATEGORIES
// ════════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  {
    name: "Commerce",
    slug: "commerce",
    desc: "Retail shops, stores and commercial services.",
  },
  {
    name: "Tourism & Leisure",
    slug: "tourism-leisure",
    desc: "Tours, hospitality, transport, events and leisure.",
  },
  {
    name: "Building & Construction",
    slug: "building-construction",
    desc: "Building, civil engineering, construction materials.",
  },
  {
    name: "Automotive & Motorbike",
    slug: "automotive-motorbike",
    desc: "Car dealerships, repair shops, parts and motorcycles.",
  },
  {
    name: "Finance",
    slug: "finance",
    desc: "Banks, insurance, microfinance, investment and money transfer.",
  },
  {
    name: "Entertainment & Sports",
    slug: "entertainment-sports",
    desc: "Restaurants, bars, cinemas, sports and live music.",
  },
  {
    name: "Health",
    slug: "health",
    desc: "Hospitals, clinics, pharmacies, labs and wellness.",
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    desc: "Property agencies, developers and management.",
  },
  {
    name: "Communication & Advertising",
    slug: "communication-advertising",
    desc: "Advertising, marketing, media and design.",
  },
  {
    name: "IT & Internet",
    slug: "it-internet",
    desc: "Software, IT support, cloud, ISPs and cybersecurity.",
  },
  {
    name: "Accounting, Legal & Advisory",
    slug: "accounting-legal-advisory",
    desc: "Accounting, law, notaries and tax advisors.",
  },
  {
    name: "Food & Beverage",
    slug: "food-beverage",
    desc: "Restaurants, cafés, bakeries, catering and food retail.",
  },
  {
    name: "Animals & Pets",
    slug: "animals-pets",
    desc: "Veterinary, pet shops, grooming and livestock.",
  },
  {
    name: "Artisans & Trades",
    slug: "artisans-trades",
    desc: "Carpenters, welders, painters and trades.",
  },
  {
    name: "Home & Interior Design",
    slug: "home-interior-design",
    desc: "Interior design, furniture, décor and lighting.",
  },
  {
    name: "Fashion & Textiles",
    slug: "fashion-textiles",
    desc: "Clothing, designers, fabric and accessories.",
  },
  {
    name: "Telecommunications",
    slug: "telecommunications",
    desc: "Phone operators, ISPs, network equipment.",
  },
  {
    name: "Agri-Food & Agriculture",
    slug: "agri-food-agriculture",
    desc: "Agricultural suppliers, crops, livestock.",
  },
  {
    name: "Transportation & Logistics",
    slug: "transportation-logistics",
    desc: "Shipping, warehousing, taxis, airlines.",
  },
  {
    name: "Administration & Government",
    slug: "administration-government",
    desc: "Government, social services, public safety.",
  },
  {
    name: "Education & Training",
    slug: "education-training",
    desc: "Schools, universities, vocational, e-learning.",
  },
  {
    name: "Import & Export",
    slug: "import-export",
    desc: "Importers, exporters, customs brokers.",
  },
  {
    name: "Professional Services",
    slug: "professional-services",
    desc: "HR, recruitment, consulting, brokerage.",
  },
  {
    name: "Utilities & Energy",
    slug: "utilities-energy",
    desc: "Electricity, water, gas and renewable energy.",
  },
  {
    name: "Media & Entertainment",
    slug: "media-entertainment",
    desc: "Radio, TV, newspapers, music and studios.",
  },
  {
    name: "Sports & Fitness",
    slug: "sports-fitness",
    desc: "Gyms, sports clubs, equipment, training.",
  },
  {
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    desc: "Hair salons, spas, cosmetics, barbers.",
  },
  {
    name: "Manufacturing & Industry",
    slug: "manufacturing-industry",
    desc: "Heavy industry, textiles, plastics, chemicals.",
  },
  {
    name: "Wholesale & Distribution",
    slug: "wholesale-distribution",
    desc: "General, food, electronics, pharma wholesale.",
  },
  {
    name: "Security & Safety",
    slug: "security-safety",
    desc: "Security companies, surveillance, fire safety.",
  },
  {
    name: "Waste Management",
    slug: "waste-management",
    desc: "Collection, recycling, hazardous waste.",
  },
  {
    name: "Miscellaneous Services",
    slug: "miscellaneous-services",
    desc: "Repair, rental, storage, translation.",
  },
];

// ════════════════════════════════════════════════════════════════════════════
// 6. PAYMENT CARD TYPES
// ════════════════════════════════════════════════════════════════════════════
const PAYMENT_CARD_TYPES = [
  { name: "Visa", code: "VISA", desc: "Visa credit and debit cards" },
  { name: "Mastercard", code: "MC", desc: "Mastercard credit and debit cards" },
  {
    name: "American Express",
    code: "AMEX",
    desc: "American Express charge and credit cards",
  },
  { name: "Discover", code: "DISC", desc: "Discover credit cards" },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════════
(async () => {
  console.log("\n🌱 Production Seed (structural data) — starting...\n");

  try {
    const client = await pool.connect();
    console.log("✅ Database connected");
    client.release();

    // ── Detect user table columns ──
    const colResult = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position",
    );
    const cols = colResult.rows.map((r) => r.column_name);
    const hasVerified = cols.includes("is_verified");
    const hasTier = cols.includes("subscription_tier");
    const hasStatus = cols.includes("subscription_status");
    const hasGateUsername = cols.includes("gate_username");

    // ════════════════════════════════════════════════════════════════════
    // SEED 1: SUPERADMIN USER
    // ════════════════════════════════════════════════════════════════════
    console.log("\n👤 Seeding superadmin user...");
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
        if (hasGateUsername && u.gateUsername) {
          insertCols += ", gate_username";
          insertVals += `, $${idx++}`;
          params.push(u.gateUsername);
        }

        const result = await pool.query(
          `INSERT INTO users (${insertCols}) VALUES (${insertVals})
           ON CONFLICT (email) DO UPDATE SET
             password = EXCLUDED.password, role = EXCLUDED.role
             ${hasTier ? ", subscription_tier = EXCLUDED.subscription_tier" : ""}
             ${hasStatus ? ", subscription_status = EXCLUDED.subscription_status" : ""}
             ${hasVerified ? ", is_verified = EXCLUDED.is_verified" : ""}
             ${hasGateUsername && u.gateUsername ? ", gate_username = EXCLUDED.gate_username" : ""}
           RETURNING id`,
          params,
        );
        console.log(
          `  ✅ ${u.role.padEnd(16)} | ${u.email} (id=${result.rows[0].id})`,
        );
      } catch (err) {
        console.error(`  ❌ ${u.email}: ${err.message}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // SEED 2: COUNTRIES
    // ════════════════════════════════════════════════════════════════════
    console.log("\n🌍 Seeding countries...");
    const countryIdMap = {};
    let countriesInserted = 0;
    for (const c of COUNTRIES) {
      try {
        const result = await pool.query(
          `INSERT INTO countries (name, code) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
          [c.name, c.code],
        );
        countryIdMap[c.code] = result.rows[0].id;
        countriesInserted++;
      } catch (err) {
        if (err.code === "42P01") {
          console.log("  ⚠️  countries table not found — skipping");
          break;
        }
      }
    }
    console.log(`  ✅ ${countriesInserted} countries upserted`);

    // ════════════════════════════════════════════════════════════════════
    // SEED 3: REGIONS
    // ════════════════════════════════════════════════════════════════════
    console.log("\n🗺️  Seeding regions...");
    const regionIdMap = {};
    let regionsInserted = 0;
    for (const r of REGIONS) {
      try {
        const countryId = countryIdMap[r.country];
        if (!countryId) continue;
        const result = await pool.query(
          `INSERT INTO regions (name, country_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING RETURNING id`,
          [r.name, countryId],
        );
        if (result.rows.length > 0) {
          regionIdMap[`${r.name}|${r.country}`] = result.rows[0].id;
          regionsInserted++;
        } else {
          const existing = await pool.query(
            `SELECT id FROM regions WHERE name=$1 AND country_id=$2`,
            [r.name, countryId],
          );
          if (existing.rows.length > 0)
            regionIdMap[`${r.name}|${r.country}`] = existing.rows[0].id;
        }
      } catch (err) {
        if (err.code === "42P01") {
          console.log("  ⚠️  regions table not found — skipping");
          break;
        }
      }
    }
    console.log(
      `  ✅ ${regionsInserted} new regions (${REGIONS.length} defined)`,
    );

    // ════════════════════════════════════════════════════════════════════
    // SEED 4: CITIES
    // ════════════════════════════════════════════════════════════════════
    console.log("\n🏙️  Seeding cities...");
    let citiesInserted = 0;
    for (const c of CITIES) {
      try {
        const countryId = countryIdMap[c.country];
        const regionId = regionIdMap[`${c.region}|${c.country}`];
        await pool.query(
          `INSERT INTO cities (name, region_name, region_id, country_id) VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [c.name, c.region, regionId || null, countryId || null],
        );
        citiesInserted++;
      } catch (err) {
        if (err.code === "42P01") {
          console.log("  ⚠️  cities table not found — skipping");
          break;
        }
      }
    }
    console.log(
      `  ✅ ${citiesInserted} cities processed (${CITIES.length} defined)`,
    );

    // ════════════════════════════════════════════════════════════════════
    // SEED 5: BUSINESS CATEGORIES
    // ════════════════════════════════════════════════════════════════════
    console.log("\n📂 Seeding business categories...");
    let catsInserted = 0;
    for (const cat of CATEGORIES) {
      try {
        await pool.query(
          `INSERT INTO business_categories (name, slug, description, main_category)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
          [cat.name, cat.slug, cat.desc],
        );
        catsInserted++;
      } catch (err) {
        if (err.code === "42P01") {
          console.log("  ⚠️  business_categories table not found");
          break;
        }
      }
    }
    console.log(`  ✅ ${catsInserted} categories upserted`);

    // ════════════════════════════════════════════════════════════════════
    // SEED 6: PAYMENT CARD TYPES
    // ════════════════════════════════════════════════════════════════════
    console.log("\n💳 Seeding payment card types...");
    let cardsInserted = 0;
    for (const card of PAYMENT_CARD_TYPES) {
      try {
        await pool.query(
          `INSERT INTO payment_card_types (name, code, description) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [card.name, card.code, card.desc],
        );
        cardsInserted++;
      } catch (err) {
        if (err.code === "42P01") {
          console.log("  ⚠️  payment_card_types table not found");
          break;
        }
      }
    }
    console.log(`  ✅ ${cardsInserted} payment card types processed`);

    // ════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("🎉 PRODUCTION SEED COMPLETE!");
    console.log("═".repeat(60));
    console.log(`
  👤 Superadmin:       ${TEST_USERS.length}
  🌍 Countries:        ${COUNTRIES.length}
  🗺️  Regions:          ${REGIONS.length}
  🏙️  Cities:           ${CITIES.length}
  📂 Categories:       ${CATEGORIES.length}
  💳 Card Types:       ${PAYMENT_CARD_TYPES.length}

  ℹ️  All business data (listings, artists, jobs, properties,
     reviews, etc.) will be populated by real users.
`);
    console.log("📋 SUPERADMIN CREDENTIALS:");
    console.log(`   Password: ${PASSWORD}`);
    console.log("─".repeat(60));
    for (const u of TEST_USERS) {
      console.log(`   ${u.role.toUpperCase().padEnd(16)} → ${u.email}`);
    }
    console.log("═".repeat(60) + "\n");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

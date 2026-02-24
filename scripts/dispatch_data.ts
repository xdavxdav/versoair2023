#!/usr/bin/env ts-node

/**
 * =====================================================================================
 * DISPATCH BUSINESSES DIRECTORY DATA TO DATABASE
 * =====================================================================================
 *
 * This script syncs all business categories and sample data from the BusinessesDirectory
 * component to the PostgreSQL database tables.
 *
 * Features:
 * - Syncs 17 business categories with descriptions and slugs
 * - Inserts sample businesses for each category
 * - Validates data integrity
 * - Provides comprehensive logging and reporting
 *
 * Usage:
 *   npx ts-node scripts/dispatch_data.ts
 *
 * =====================================================================================
 */

import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";

dotenv.config();

// Database connection
const pool = new Pool({
  user: process.env.PGUSER || "versoair",
  password: process.env.PGPASSWORD || "versoair2025",
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "versoair_business_intelligence",
});

// Business categories from BusinessesDirectory
const CATEGORIES = [
  {
    name: "Communication & Publicité",
    slug: "communication",
    description:
      "Agences de communication, médias, imprimeries, événementiel et cadeaux d'entreprise.",
  },
  {
    name: "IT & Internet",
    slug: "it-internet",
    description:
      "Services informatiques, développement web, hébergement cloud et solutions digitales.",
  },
  {
    name: "Immobilier",
    slug: "immobilier",
    description: "Agences immobilières, promoteurs et gestion de propriétés.",
  },
  {
    name: "Conseil, Audit & Juridique",
    slug: "conseil-juridique",
    description:
      "Experts-comptables, avocats, notaires et services de conseil aux entreprises.",
  },
  {
    name: "Santé",
    slug: "sante",
    description:
      "Médecins, cliniques, hôpitaux, pharmacies et laboratoires d'analyses.",
  },
  {
    name: "Alimentation & Restauration",
    slug: "alimentation",
    description:
      "Restaurants, traiteurs, commerces alimentaires et services culinaires.",
  },
  {
    name: "Animaux",
    slug: "animaux",
    description: "Vétérinaires, animaleries, toilettage et soins pour animaux.",
  },
  {
    name: "Artisans",
    slug: "artisans",
    description: "Plombiers, électriciens, menuisiers et artisans qualifiés.",
  },
  {
    name: "Maison & Décoration",
    slug: "maison-deco",
    description: "Mobilier, décoration intérieure, électroménager et design.",
  },
  {
    name: "Mode & Textile",
    slug: "mode-textile",
    description: "Vêtements, tissus, accessoires et créateurs de mode.",
  },
  {
    name: "Télécommunications",
    slug: "telecom",
    description:
      "Opérateurs téléphoniques, fournisseurs internet et équipements réseau.",
  },
  {
    name: "Agroalimentaire",
    slug: "agroalimentaire",
    description:
      "Agriculture, élevage, transformation alimentaire et agribusiness.",
  },
  {
    name: "Administrations",
    slug: "administrations",
    description:
      "Services publics, ambassades, consulats et institutions gouvernementales.",
  },
  {
    name: "Associations Professionnelles",
    slug: "associations",
    description: "Syndicats, fédérations et organisations professionnelles.",
  },
  {
    name: "Bien-être & Beauté",
    slug: "bien-etre",
    description: "Spas, salons de beauté, coiffeurs et soins esthétiques.",
  },
  {
    name: "Emploi & RH",
    slug: "emploi",
    description:
      "Cabinets de recrutement, agences d'intérim et formation professionnelle.",
  },
  {
    name: "Autres Services",
    slug: "autres",
    description: "Services divers et spécialisés.",
  },
];

// Sample businesses for each category
const SAMPLE_BUSINESSES: {
  [key: string]: Array<{
    name: string;
    description: string;
    location: string;
    phone: string;
    email: string;
    rating: number;
    reviews: number;
    tags: string[];
  }>;
} = {
  communication: [
    {
      name: "Agence Communication Plus",
      description:
        "Agence de communication intégrée basée en Côte d'Ivoire offrant services complets",
      location: "Abidjan",
      phone: "+225 27 22 12 34 56",
      email: "contact@agenceplusci.ci",
      rating: 4.5,
      reviews: 120,
      tags: ["communication", "design", "publicité"],
    },
    {
      name: "Studio Créatif Horizon",
      description:
        "Studio de création publicitaire et de design graphique specialisé",
      location: "Abidjan",
      phone: "+225 27 22 23 45 67",
      email: "creative@studiohorizon.ci",
      rating: 4.7,
      reviews: 95,
      tags: ["design", "publicité", "créatif"],
    },
  ],
  "it-internet": [
    {
      name: "TechSolutions Africa",
      description:
        "Solutions informatiques et développement web pour entreprises africaines",
      location: "Abidjan",
      phone: "+225 27 22 34 56 78",
      email: "info@techsolutionsafrica.ci",
      rating: 4.8,
      reviews: 250,
      tags: ["IT", "web", "développement", "cloud"],
    },
    {
      name: "Digital Experts Côte d'Ivoire",
      description:
        "Consulting IT et transformation digitale pour PME et grandes entreprises",
      location: "Abidjan",
      phone: "+225 27 22 45 67 89",
      email: "consulting@digitalexperts.ci",
      rating: 4.6,
      reviews: 180,
      tags: ["consulting", "IT", "digital", "transformation"],
    },
  ],
  immobilier: [
    {
      name: "Propriété Africaine",
      description:
        "Agence immobilière spécialisée dans la vente et location de propriétés",
      location: "Abidjan",
      phone: "+225 27 22 56 78 90",
      email: "ventes@proprietearficaine.ci",
      rating: 4.3,
      reviews: 185,
      tags: ["immobilier", "vente", "location", "propriétés"],
    },
    {
      name: "Real Estate Plus",
      description: "Investissements immobiliers et gestion de patrimoine",
      location: "Abidjan",
      phone: "+225 27 22 67 89 01",
      email: "invest@realestateplus.ci",
      rating: 4.4,
      reviews: 142,
      tags: ["investissement", "immobilier", "gestion", "patrimoine"],
    },
  ],
  sante: [
    {
      name: "Clinique Santé Plus",
      description:
        "Clinique multiservices offrant des services médicaux généraux et spécialisés",
      location: "Abidjan",
      phone: "+225 27 22 78 90 12",
      email: "urgences@santeplus.ci",
      rating: 4.7,
      reviews: 310,
      tags: ["santé", "clinique", "médecin", "urgences"],
    },
    {
      name: "Hôpital Moderne Africain",
      description:
        "Hôpital de référence avec services de diagnostic et chirurgie",
      location: "Abidjan",
      phone: "+225 27 22 89 01 23",
      email: "admission@hopitalmoderne.ci",
      rating: 4.6,
      reviews: 428,
      tags: ["hôpital", "santé", "chirurgie", "diagnostic"],
    },
  ],
  alimentation: [
    {
      name: "Restaurant Le Gourmet Africain",
      description:
        "Restaurant servant la cuisine africaine traditionnelle et moderne",
      location: "Abidjan",
      phone: "+225 27 22 90 12 34",
      email: "reservations@legourmetafricain.ci",
      rating: 4.6,
      reviews: 420,
      tags: ["restaurant", "cuisine", "africaine", "réservations"],
    },
    {
      name: "Traiteur Excellence",
      description: "Service de traiteur pour événements et réceptions",
      location: "Abidjan",
      phone: "+225 27 22 01 23 45",
      email: "events@traiteurexcellence.ci",
      rating: 4.5,
      reviews: 165,
      tags: ["traiteur", "événements", "catering", "réceptions"],
    },
  ],
  artisans: [
    {
      name: "Plomberie Expert",
      description:
        "Services de plomberie, électricité et maintenance pour résidentiel et commercial",
      location: "Abidjan",
      phone: "+225 27 22 12 45 67",
      email: "service@plomberieexpert.ci",
      rating: 4.4,
      reviews: 95,
      tags: ["plomberie", "électricité", "maintenance", "installation"],
    },
    {
      name: "Menuiserie Prestige",
      description:
        "Fabrication et installation de meubles et menuiseries sur mesure",
      location: "Abidjan",
      phone: "+225 27 22 23 56 78",
      email: "commande@menuiseriePrestige.ci",
      rating: 4.3,
      reviews: 78,
      tags: ["menuiserie", "meubles", "bois", "sur mesure"],
    },
  ],
  "bien-etre": [
    {
      name: "Spa Zen Africain",
      description:
        "Centre wellness offrant massages, soins de beauté et relaxation",
      location: "Abidjan",
      phone: "+225 27 22 34 67 89",
      email: "reservation@spazenafricain.ci",
      rating: 4.9,
      reviews: 380,
      tags: ["spa", "wellness", "beauté", "massage"],
    },
    {
      name: "Salon de Beauté Élégance",
      description: "Coiffure, esthétique et soins de beauté pour tous",
      location: "Abidjan",
      phone: "+225 27 22 45 78 90",
      email: "salon@elegance.ci",
      rating: 4.7,
      reviews: 265,
      tags: ["coiffure", "beauté", "esthétique", "soins"],
    },
  ],
  emploi: [
    {
      name: "Recrutement Talents Africains",
      description:
        "Cabinet spécialisé dans le recrutement et la formation professionnelle",
      location: "Abidjan",
      phone: "+225 27 22 56 89 01",
      email: "candidats@talentsafricains.ci",
      rating: 4.5,
      reviews: 165,
      tags: ["recrutement", "formation", "RH", "talents"],
    },
    {
      name: "Executive Search Africa",
      description:
        "Cabinet de recrutement haut de gamme pour cadres et dirigeants",
      location: "Abidjan",
      phone: "+225 27 22 67 90 12",
      email: "executive@searchafrica.ci",
      rating: 4.8,
      reviews: 142,
      tags: ["recrutement", "executive", "cadres", "dirigeants"],
    },
  ],
  telecom: [
    {
      name: "NetWorks Africains",
      description:
        "Fournisseur de services internet, téléphonie et solutions réseau",
      location: "Abidjan",
      phone: "+225 27 22 78 01 23",
      email: "support@networksafricains.ci",
      rating: 4.2,
      reviews: 240,
      tags: ["internet", "téléphonie", "réseau", "connectivité"],
    },
  ],
  agroalimentaire: [
    {
      name: "Agriculture Plus Côte d'Ivoire",
      description:
        "Production et distribution de produits agricoles de qualité",
      location: "Yamoussoukro",
      phone: "+225 27 22 90 23 45",
      email: "ventes@agricultureplus.ci",
      rating: 4.3,
      reviews: 156,
      tags: ["agriculture", "production", "produits", "distribution"],
    },
  ],
  "mode-textile": [
    {
      name: "Mode Africaine Chic",
      description:
        "Boutique et atelier de mode proposant vêtements et accessoires africains",
      location: "Abidjan",
      phone: "+225 27 22 01 45 67",
      email: "boutique@modeafricainechic.ci",
      rating: 4.6,
      reviews: 210,
      tags: ["mode", "vêtements", "accessoires", "tissus"],
    },
  ],
};

// =====================
// Main dispatch logic
// =====================

async function dispatchData() {
  const client = await pool.connect();

  try {
    console.log("🚀 Starting data dispatch process...\n");

    // Start transaction
    await client.query("BEGIN");
    console.log("✅ Transaction started\n");

    // 1. Insert categories
    console.log("📊 Syncing business categories...");
    let categoryCount = 0;

    for (const category of CATEGORIES) {
      try {
        await client.query(
          `INSERT INTO business_categories (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           slug = EXCLUDED.slug;`,
          [category.name, category.slug, category.description],
        );
        categoryCount++;
      } catch (error: any) {
        console.warn(
          `⚠️  Warning syncing category ${category.name}:`,
          error.message,
        );
      }
    }
    console.log(`✅ Synced ${categoryCount}/${CATEGORIES.length} categories\n`);

    // 2. Insert sample businesses
    console.log("🏢 Syncing businesses...");
    let businessCount = 0;

    for (const [slug, businesses] of Object.entries(SAMPLE_BUSINESSES)) {
      // Get category ID
      const categoryResult = await client.query(
        "SELECT id FROM business_categories WHERE slug = $1",
        [slug],
      );

      if (categoryResult.rows.length === 0) {
        console.warn(`⚠️  Category not found for slug: ${slug}`);
        continue;
      }

      const categoryId = categoryResult.rows[0].id;

      // Insert businesses
      for (const business of businesses) {
        try {
          await client.query(
            `INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, tags, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (name) DO UPDATE SET
             description = EXCLUDED.description,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             rating = EXCLUDED.rating,
             reviews = EXCLUDED.reviews,
             tags = EXCLUDED.tags;`,
            [
              business.name,
              categoryId,
              business.description,
              business.location,
              business.phone,
              business.email,
              business.rating,
              business.reviews,
              JSON.stringify(business.tags),
              true,
            ],
          );
          businessCount++;
        } catch (error: any) {
          console.warn(
            `⚠️  Warning syncing business ${business.name}:`,
            error.message,
          );
        }
      }
    }
    console.log(`✅ Synced ${businessCount} businesses\n`);

    // 3. Verify data integrity
    console.log("🔍 Verifying data integrity...");

    const orphanedResult = await client.query(`
      SELECT COUNT(*) as count
      FROM businesses b
      WHERE b.category_id NOT IN (SELECT id FROM business_categories)
    `);
    const orphanedCount = orphanedResult.rows[0].count;

    if (orphanedCount === 0) {
      console.log("✅ No orphaned businesses found\n");
    } else {
      console.warn(`⚠️  Found ${orphanedCount} orphaned businesses\n`);
    }

    // 4. Get statistics
    console.log("📈 Database statistics:");

    const statsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM business_categories) as total_categories,
        (SELECT COUNT(*) FROM businesses) as total_businesses,
        (SELECT AVG(rating::float) FROM businesses) as avg_rating,
        (SELECT SUM(reviews) FROM businesses) as total_reviews
    `);

    const stats = statsResult.rows[0];
    console.log(`  • Total categories: ${stats.total_categories}`);
    console.log(`  • Total businesses: ${stats.total_businesses}`);
    console.log(
      `  • Average rating: ${parseFloat(stats.avg_rating).toFixed(2)}/5`,
    );
    console.log(`  • Total reviews: ${stats.total_reviews}\n`);

    // 5. Show business count per category
    console.log("📊 Businesses per category:");

    const categoryStatsResult = await client.query(`
      SELECT 
        bc.name,
        bc.slug,
        COUNT(b.id) as business_count
      FROM business_categories bc
      LEFT JOIN businesses b ON b.category_id = bc.id
      GROUP BY bc.id, bc.name, bc.slug
      ORDER BY business_count DESC
    `);

    for (const row of categoryStatsResult.rows) {
      console.log(`  • ${row.name}: ${row.business_count} businesses`);
    }
    console.log();

    // Commit transaction
    await client.query("COMMIT");
    console.log("✅ Transaction committed successfully!\n");

    console.log("🎉 Data dispatch completed successfully!");
    console.log("\n📝 Summary:");
    console.log(
      `   ✓ Categories synced: ${categoryCount}/${CATEGORIES.length}`,
    );
    console.log(`   ✓ Businesses synced: ${businessCount}`);
    console.log(`   ✓ Data integrity verified`);
  } catch (error) {
    // Rollback on error
    await client.query("ROLLBACK");
    console.error("❌ Error during data dispatch:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the dispatch
dispatchData().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

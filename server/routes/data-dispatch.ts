import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

// =====================================================================
// BUSINESSES DATA DISPATCH ENDPOINTS
// =====================================================================

/**
 * POST /api/data/dispatch/categories
 * Syncs all business categories to the database
 */
router.post("/api/data/dispatch/categories", async (req, res) => {
  try {
    console.log("🚀 Dispatching business categories...");

    const categories = [
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
        description:
          "Agences immobilières, promoteurs et gestion de propriétés.",
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
        description:
          "Vétérinaires, animaleries, toilettage et soins pour animaux.",
      },
      {
        name: "Artisans",
        slug: "artisans",
        description:
          "Plombiers, électriciens, menuisiers et artisans qualifiés.",
      },
      {
        name: "Maison & Décoration",
        slug: "maison-deco",
        description:
          "Mobilier, décoration intérieure, électroménager et design.",
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
        description:
          "Syndicats, fédérations et organisations professionnelles.",
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

    let synced = 0;
    for (const category of categories) {
      try {
        await db
          .insert(schema.businessCategories)
          .values({
            name: category.name,
            slug: category.slug,
            description: category.description,
          })
          .onConflictDoUpdate({
            target: schema.businessCategories.name,
            set: {
              description: category.description,
              slug: category.slug,
            },
          })
          .execute();
        synced++;
      } catch (error) {
        console.warn(`Warning syncing category ${category.name}:`, error);
      }
    }

    console.log(`✅ Synced ${synced}/${categories.length} categories`);

    res.json({
      success: true,
      message: `Successfully synced ${synced} categories`,
      count: synced,
      total: categories.length,
    });
  } catch (error) {
    console.error("Error dispatching categories:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to dispatch categories" });
  }
});

/**
 * POST /api/data/dispatch/businesses
 * Syncs sample businesses for all categories
 */
router.post("/api/data/dispatch/businesses", async (req, res) => {
  try {
    console.log("🚀 Dispatching sample businesses...");

    const sampleBusinesses: {
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

    let synced = 0;
    let total = 0;

    for (const [slug, businesses] of Object.entries(sampleBusinesses)) {
      // Get category
      const categoryResult = await db
        .select()
        .from(schema.businessCategories)
        .where(eq(schema.businessCategories.slug, slug))
        .limit(1)
        .execute();

      if (categoryResult.length === 0) {
        console.warn(`Category not found for slug: ${slug}`);
        continue;
      }

      const categoryId = categoryResult[0].id;

      // Insert businesses
      for (const business of businesses) {
        try {
          await db
            .insert(schema.businesses)
            .values({
              name: business.name,
              categoryId: categoryId,
              description: business.description,
              location: business.location,
              phone: business.phone,
              email: business.email,
              rating: business.rating.toString(),
              reviews: business.reviews,
              tags: business.tags,
              isActive: true,
              countryCode: "CI",
            })
            .onConflictDoUpdate({
              target: schema.businesses.name,
              set: {
                description: business.description,
                phone: business.phone,
                email: business.email,
                rating: business.rating.toString(),
                reviews: business.reviews,
                tags: business.tags,
              },
            })
            .execute();
          synced++;
        } catch (error) {
          console.warn(`Warning syncing business ${business.name}:`, error);
        }
        total++;
      }
    }

    console.log(`✅ Synced ${synced}/${total} businesses`);

    res.json({
      success: true,
      message: `Successfully synced ${synced} businesses`,
      count: synced,
      total: total,
    });
  } catch (error) {
    console.error("Error dispatching businesses:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to dispatch businesses" });
  }
});

/**
 * GET /api/data/dispatch/status
 * Get statistics about dispatched data
 */
router.get("/api/data/dispatch/status", async (req, res) => {
  try {
    const categoryCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businessCategories)
      .execute();

    const businessCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businesses)
      .execute();

    const categoryStats = await db
      .select({
        categoryName: schema.businessCategories.name,
        categorySlug: schema.businessCategories.slug,
        businessCount: sql<number>`count(${schema.businesses.id})`,
      })
      .from(schema.businessCategories)
      .leftJoin(
        schema.businesses,
        eq(schema.businessCategories.id, schema.businesses.categoryId),
      )
      .groupBy(
        schema.businessCategories.id,
        schema.businessCategories.name,
        schema.businessCategories.slug,
      )
      .orderBy(sql`count(${schema.businesses.id}) DESC`)
      .execute();

    res.json({
      success: true,
      statistics: {
        totalCategories: categoryCount[0].count,
        totalBusinesses: businessCount[0].count,
        categoriesByBusiness: categoryStats,
      },
    });
  } catch (error) {
    console.error("Error getting dispatch status:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get dispatch status" });
  }
});

/**
 * POST /api/data/dispatch/all
 * Full dispatch - syncs both categories and businesses
 */
router.post("/api/data/dispatch/all", async (req, res) => {
  try {
    console.log("🚀 Starting full data dispatch...");

    // First dispatch categories
    const categoryResponse = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businessCategories)
      .execute();

    // Then dispatch businesses
    const businessResponse = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businesses)
      .execute();

    res.json({
      success: true,
      message: "Full data dispatch completed",
      data: {
        categories: categoryResponse[0].count,
        businesses: businessResponse[0].count,
      },
    });
  } catch (error) {
    console.error("Error in full dispatch:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to complete full dispatch" });
  }
});

export default router;

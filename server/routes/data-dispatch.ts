import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

// =====================================================================
// BUSINESSES DATA DISPATCH ENDPOINTS
// Mounted at /api/data/dispatch
// =====================================================================

/**
 * POST /categories
 */
router.post("/categories", async (req, res) => {
  try {
    console.log("Dispatching business categories...");
    const categories = [
      {
        name: "Communication & Publicite",
        slug: "communication",
        description: "Agences de communication, medias, imprimeries.",
      },
      {
        name: "IT & Internet",
        slug: "it-internet",
        description: "Services informatiques, developpement web.",
      },
      {
        name: "Immobilier",
        slug: "immobilier",
        description: "Agences immobilieres, promoteurs.",
      },
      {
        name: "Conseil, Audit & Juridique",
        slug: "conseil-juridique",
        description: "Experts-comptables, avocats, notaires.",
      },
      {
        name: "Sante",
        slug: "sante",
        description: "Medecins, cliniques, hopitaux, pharmacies.",
      },
      {
        name: "Alimentation & Restauration",
        slug: "alimentation",
        description: "Restaurants, traiteurs, commerces alimentaires.",
      },
      {
        name: "Animaux",
        slug: "animaux",
        description: "Veterinaires, animaleries, toilettage.",
      },
      {
        name: "Artisans",
        slug: "artisans",
        description: "Plombiers, electriciens, menuisiers.",
      },
      {
        name: "Maison & Decoration",
        slug: "maison-deco",
        description: "Mobilier, decoration interieure.",
      },
      {
        name: "Mode & Textile",
        slug: "mode-textile",
        description: "Vetements, tissus, accessoires.",
      },
      {
        name: "Telecommunications",
        slug: "telecom",
        description: "Operateurs telephoniques, fournisseurs internet.",
      },
      {
        name: "Agroalimentaire",
        slug: "agroalimentaire",
        description: "Agriculture, elevage, transformation alimentaire.",
      },
      {
        name: "Administrations",
        slug: "administrations",
        description: "Services publics, ambassades, consulats.",
      },
      {
        name: "Associations Professionnelles",
        slug: "associations",
        description: "Syndicats, federations.",
      },
      {
        name: "Bien-etre & Beaute",
        slug: "bien-etre",
        description: "Spas, salons de beaute, coiffeurs.",
      },
      {
        name: "Emploi & RH",
        slug: "emploi",
        description: "Cabinets de recrutement, agences d interim.",
      },
      {
        name: "Autres Services",
        slug: "autres",
        description: "Services divers et specialises.",
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
            set: { description: category.description, slug: category.slug },
          })
          .execute();
        synced++;
      } catch (error) {
        console.warn("Warning syncing category:", error);
      }
    }

    res.json({
      success: true,
      message: `Synced ${synced} categories`,
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
 * GET /status
 */
router.get("/status", async (_req, res) => {
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
 * POST /all — Full dispatch summary
 */
router.post("/all", async (req, res) => {
  try {
    console.log("Starting full data dispatch...");
    const cats = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businessCategories)
      .execute();
    const biz = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businesses)
      .execute();
    res.json({
      success: true,
      message: "Full data dispatch completed",
      data: { categories: cats[0].count, businesses: biz[0].count },
    });
  } catch (error) {
    console.error("Error in full dispatch:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to complete full dispatch" });
  }
});

export default router;

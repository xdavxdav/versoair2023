import { Router } from "express";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post(
  "/seed-categories",
  asyncHandler(async (_req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        error: "Seed endpoint only available in development mode",
      });
    }

    const { CATEGORY_SEED_DATA } = await import("../services/category-seed-data");
    const createdCategories: any[] = [];
    const categorySlugMap = new Map<string, number>();

    for (const catData of CATEGORY_SEED_DATA) {
      try {
        const result = await db
          .insert(schema.businessCategories)
          .values({
            name: catData.name,
            slug: catData.slug,
            description: catData.description,
            mainCategory: catData.mainCategory || false,
          })
          .returning({
            id: schema.businessCategories.id,
            slug: schema.businessCategories.slug,
          });

        if (result.length > 0) {
          categorySlugMap.set(catData.slug, result[0].id);
          createdCategories.push(result[0]);
        }
      } catch {
        const existing = await db
          .select({ id: schema.businessCategories.id })
          .from(schema.businessCategories)
          .where(eq(schema.businessCategories.slug, catData.slug))
          .limit(1);

        if (existing.length > 0) {
          categorySlugMap.set(catData.slug, existing[0].id);
        }
      }
    }

    for (const catData of CATEGORY_SEED_DATA) {
      if (catData.parentSlug && categorySlugMap.has(catData.parentSlug)) {
        const catId = categorySlugMap.get(catData.slug);
        const parentId = categorySlugMap.get(catData.parentSlug);

        if (catId && parentId) {
          await db
            .update(schema.businessCategories)
            .set({ parentId })
            .where(eq(schema.businessCategories.id, catId));
        }
      }
    }

    res.json({
      success: true,
      message: "Categories seeded successfully",
      count: createdCategories.length,
      environment: process.env.NODE_ENV,
    });
  }),
);

export default router;

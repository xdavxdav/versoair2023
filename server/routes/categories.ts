import { Router } from "express";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/business-categories",
  asyncHandler(async (req, res) => {
    const { countryCode } = req.query;

    const result =
      countryCode && String(countryCode) !== "all"
        ? await db.execute(
            sql`SELECT bc.id, bc.name, bc.slug, bc.description, bc.parent_id,
                COUNT(b.id)::int AS business_count
              FROM business_categories bc
              LEFT JOIN businesses b ON b.category_id = bc.id
                AND UPPER(b.country_code) = UPPER(${String(countryCode)})
              GROUP BY bc.id, bc.name, bc.slug, bc.description, bc.parent_id
              ORDER BY bc.name`,
          )
        : await db.execute(
            sql`SELECT bc.id, bc.name, bc.slug, bc.description, bc.parent_id,
                COUNT(b.id)::int AS business_count
              FROM business_categories bc
              LEFT JOIN businesses b ON b.category_id = bc.id
              GROUP BY bc.id, bc.name, bc.slug, bc.description, bc.parent_id
              ORDER BY bc.name`,
          );

    res.json(result.rows);
  }),
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const result = await db
      .select({
        id: schema.businessCategories.id,
        name: schema.businessCategories.name,
        slug: schema.businessCategories.slug,
        description: schema.businessCategories.description,
        parentId: schema.businessCategories.parentId,
        mainCategory: schema.businessCategories.mainCategory,
      })
      .from(schema.businessCategories)
      .orderBy(schema.businessCategories.name);

    res.json(result);
  }),
);

export default router;

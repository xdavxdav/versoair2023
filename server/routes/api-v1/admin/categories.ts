import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import {
  businessCategories,
  auditLogs,
  businesses,
} from "../../../../shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { CATEGORY_SEED_DATA } from "../../../services/category-seed-data";

const router = Router();

/**
 * GET /api/v1/admin/categories
 * List all categories with pagination and filtering
 */
router.get(
  "/",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { page = "1", limit = "500", search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, parseInt(limit as string, 10) || 500);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(ilike(businessCategories.name, `${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch total count and paginated data
    const [totalResult, data] = await Promise.all([
      db.select({ total: count() }).from(businessCategories).where(where),
      db
        .select()
        .from(businessCategories)
        .where(where)
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      status: 200,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * POST /api/v1/admin/categories
 * Create a new category
 */
router.post(
  "/",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { name, slug, description } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Name and slug are required",
        },
      });
    }

    // Check if slug already exists
    const existing = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(eq(businessCategories.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "DUPLICATE_SLUG",
          message: "Category with this slug already exists",
        },
      });
    }

    const [category] = await db
      .insert(businessCategories)
      .values({
        name,
        slug,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "CREATE",
      entityType: "category",
      entityId: String(category.id),
      changes: JSON.stringify({ name, slug }),
    });

    res.status(201).json({
      success: true,
      status: 201,
      data: category,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * GET /api/v1/admin/categories/:id
 * Get a specific category
 */
router.get(
  "/:id",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);

    const [category] = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(eq(businessCategories.id, categoryId))
      .limit(1);

    if (!category) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      });
    }

    res.json({
      success: true,
      status: 200,
      data: category,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * PUT /api/v1/admin/categories/:id
 * Update a category
 */
router.put(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, description } = req.body;
    const categoryId = parseInt(id);

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Name and slug are required",
        },
      });
    }

    // Check if category exists
    const existing = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(eq(businessCategories.id, categoryId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      });
    }

    // Check if new slug conflicts with another category
    const slugConflict = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(
        and(
          eq(businessCategories.slug, slug),
          eq(businessCategories.id, categoryId),
        ),
      )
      .limit(1);

    if (!slugConflict.length) {
      const otherWithSlug = await db
        .select({
          id: businessCategories.id,
          name: businessCategories.name,
          slug: businessCategories.slug,
        })
        .from(businessCategories)
        .where(eq(businessCategories.slug, slug))
        .limit(1);

      if (otherWithSlug.length > 0) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: {
            code: "DUPLICATE_SLUG",
            message: "Another category with this slug already exists",
          },
        });
      }
    }

    const [updatedCategory] = await db
      .update(businessCategories)
      .set({
        name,
        slug,
      })
      .where(eq(businessCategories.id, categoryId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "UPDATE",
      entityType: "category",
      entityId: String(categoryId),
      changes: JSON.stringify({
        previous: existing[0],
        updated: updatedCategory,
      }),
    });

    res.json({
      success: true,
      status: 200,
      data: updatedCategory,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * DELETE /api/v1/admin/categories/:id
 * Delete a category
 */
router.delete(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // Check if category exists
    const [category] = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(eq(businessCategories.id, categoryId))
      .limit(1);

    if (!category) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      });
    }

    const [deletedCategory] = await db
      .delete(businessCategories)
      .where(eq(businessCategories.id, categoryId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "DELETE",
      entityType: "category",
      entityId: String(categoryId),
      changes: JSON.stringify(category),
    });

    res.json({
      success: true,
      status: 200,
      data: deletedCategory,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * GET /api/v1/admin/categories/:slug/businesses
 * Get businesses filtered by category slug
 */
router.get(
  "/:slug/businesses",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { page = "1", limit = "20", search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    // Find category by slug
    const [category] = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(eq(businessCategories.slug, slug))
      .limit(1);

    if (!category) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      });
    }

    // Build where conditions for businesses
    const conditions = [eq(businesses.categoryId, category.id)];

    if (search) {
      conditions.push(ilike(businesses.name, `${search}%`));
    }

    const where = and(...conditions);

    // Fetch total count and paginated data
    const [totalResult, data] = await Promise.all([
      db.select({ total: count() }).from(businesses).where(where),
      db
        .select({
          id: businesses.id,
          name: businesses.name,
          categoryId: businesses.categoryId,
          description: businesses.description,
          email: businesses.email,
          phone: businesses.phone,
          location: businesses.location,
          address: businesses.address,
          isVerified: businesses.isVerified,
          isAdvertiser: businesses.isAdvertiser,
          rating: businesses.rating,
          createdAt: businesses.createdAt,
        })
        .from(businesses)
        .where(where)
        .orderBy(desc(businesses.createdAt))
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      status: 200,
      data,
      category,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * POST /api/v1/admin/categories/seed/dev
 * Populate database with all 32 main + subcategories (development only)
 */
router.post(
  "/seed/dev",
  asyncHandler(async (req, res) => {
    // Dev-only check
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        error: "Seed endpoint only available in development mode",
      });
    }

    const createdCategories: any[] = [];
    const categorySlugMap = new Map<string, number>(); // slug -> id mapping

    try {
      // First pass: create all categories
      for (const catData of CATEGORY_SEED_DATA) {
        try {
          const result = await db
            .insert(businessCategories)
            .values({
              name: catData.name,
              slug: catData.slug,
              description: catData.description,
              mainCategory: catData.mainCategory || false,
            })
            .returning({
              id: businessCategories.id,
              slug: businessCategories.slug,
            });

          if (result.length > 0) {
            categorySlugMap.set(catData.slug, result[0].id);
            createdCategories.push(result[0]);
          }
        } catch (err) {
          // Category might already exist (unique slug), try to fetch it
          const existing = await db
            .select({ id: businessCategories.id })
            .from(businessCategories)
            .where(eq(businessCategories.slug, catData.slug))
            .limit(1);

          if (existing.length > 0) {
            categorySlugMap.set(catData.slug, existing[0].id);
          }
        }
      }

      // Second pass: update parent IDs for subcategories
      for (const catData of CATEGORY_SEED_DATA) {
        if (catData.parentSlug && categorySlugMap.has(catData.parentSlug)) {
          const catId = categorySlugMap.get(catData.slug);
          const parentId = categorySlugMap.get(catData.parentSlug);

          if (catId && parentId) {
            await db
              .update(businessCategories)
              .set({ parentId })
              .where(eq(businessCategories.id, catId));
          }
        }
      }

      res.json({
        success: true,
        message: "Categories seeded successfully",
        count: createdCategories.length,
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      console.error("[SEED] Error seeding categories:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

export default router;

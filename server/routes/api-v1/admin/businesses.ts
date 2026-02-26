import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import {
  businesses,
  businessCategories,
  auditLogs,
} from "../../../../shared/schema";
import { eq, ilike, and, or, count, desc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/v1/admin/businesses
 * List all businesses with pagination and filtering
 */
router.get(
  "/",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { page = "1", limit = "20", search, category, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions — only show active businesses by default
    const conditions: any[] = [eq(businesses.isActive, true)];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(businesses.name, searchTerm),
          ilike(businesses.email, searchTerm),
          ilike(businesses.address, searchTerm),
          ilike(businesses.description, searchTerm),
          ilike(businesses.phone, searchTerm),
          ilike(businesses.location, searchTerm),
        ),
      );
    }

    if (category) {
      conditions.push(eq(businesses.categoryId, parseInt(category as string)));
    }

    // Allow overriding active filter
    if (status === "inactive") {
      conditions[0] = eq(businesses.isActive, false);
    } else if (status === "all") {
      conditions.shift();
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

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
          isActive: businesses.isActive,
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
 * POST /api/v1/admin/businesses
 * Create a new business
 */
router.post(
  "/",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { name, categoryId, email, phone, description, address } = req.body;

    // Validate required fields
    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Name and categoryId are required",
        },
      });
    }

    // Verify category exists
    const category = await db
      .select({
        id: businessCategories.id,
        name: businessCategories.name,
        slug: businessCategories.slug,
      })
      .from(businessCategories)
      .where(eq(businessCategories.id, categoryId))
      .limit(1);

    if (!category.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Category does not exist",
        },
      });
    }

    const [business] = await db
      .insert(businesses)
      .values({
        name,
        categoryId,
        email,
        phone,
        description,
        address,
      })
      .returning({
        id: businesses.id,
        name: businesses.name,
        categoryId: businesses.categoryId,
        description: businesses.description,
        email: businesses.email,
        phone: businesses.phone,
        address: businesses.address,
        isActive: businesses.isActive,
        rating: businesses.rating,
        createdAt: businesses.createdAt,
      });

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "CREATE",
        entityType: "business",
        entityId: String(business.id),
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    res.status(201).json({
      success: true,
      status: 201,
      data: business,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * GET /api/v1/admin/businesses/:id
 * Get a specific business
 */
router.get(
  "/:id",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const businessId = parseInt(req.params.id);

    const business = await db
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
        isActive: businesses.isActive,
        rating: businesses.rating,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Business not found" },
      });
    }

    res.json({
      success: true,
      status: 200,
      data: business[0],
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * PUT /api/v1/admin/businesses/:id
 * Update a business
 */
router.put(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const businessId = parseInt(req.params.id);
    const { name, categoryId, email, phone, description, address, isActive } =
      req.body;

    // Get old values for audit
    const [oldBusiness] = await db
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
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!oldBusiness) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Business not found" },
      });
    }

    const [updated] = await db
      .update(businesses)
      .set({
        name: name || oldBusiness.name,
        categoryId: categoryId || oldBusiness.categoryId,
        email: email || oldBusiness.email,
        phone: phone || oldBusiness.phone,
        description: description || oldBusiness.description,
        address: address || oldBusiness.address,
      })
      .where(eq(businesses.id, businessId))
      .returning({
        id: businesses.id,
        name: businesses.name,
        categoryId: businesses.categoryId,
        description: businesses.description,
        email: businesses.email,
        phone: businesses.phone,
        address: businesses.address,
        isActive: businesses.isActive,
        rating: businesses.rating,
        createdAt: businesses.createdAt,
      });

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "UPDATE",
        entityType: "business",
        entityId: String(businessId),
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    res.json({
      success: true,
      status: 200,
      data: updated,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * DELETE /api/v1/admin/businesses/:id
 * Delete (soft delete) a business
 */
router.delete(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const businessId = parseInt(req.params.id);

    const [business] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Business not found" },
      });
    }

    // Soft-delete by setting isActive = false
    await db
      .update(businesses)
      .set({ isActive: false })
      .where(eq(businesses.id, businessId));

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "DELETE",
        entityType: "business",
        entityId: String(businessId),
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    res.json({
      success: true,
      status: 200,
      data: { id: businessId, deleted: true },
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * POST /api/v1/admin/businesses/seed/data
 * Populate database with seed data for testing
 */
router.post(
  "/seed/data",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const seedData = [
      {
        name: "Verso Air",
        categoryId: 1,
        email: "contact@verso-air.com",
        phone: "+33 1 58 50 50 50",
        address: "125 Avenue Champs-Élysées, Paris 75008",
        description:
          "Business Intelligence Platform for Multi-Sector Analytics",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
      {
        name: "Le Bistro Parisien",
        categoryId: 2,
        email: "contact@bistro.fr",
        phone: "+33 1 23 45 67 89",
        address: "123 Rue de Rivoli, Paris 75001",
        description: "Authentic French cuisine with wine selection",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
      {
        name: "Tech Solutions Inc",
        categoryId: 1,
        email: "sales@tech.com",
        phone: "+33 2 34 56 78 90",
        address: "456 Avenue du Commerce, Lyon",
        description: "Digital transformation services and software development",
        isVerified: true,
        isAdvertiser: false,
        isActive: true,
      },
      {
        name: "Hotel Elegance",
        categoryId: 3,
        email: "reservations@elegance.fr",
        phone: "+33 3 45 67 89 01",
        address: "789 Boulevard de la Liberté, Marseille",
        description: "Luxury 5-star hotel with spa and restaurant",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
      {
        name: "AutoRepair Pro",
        categoryId: 4,
        email: "service@autorepair.fr",
        phone: "+33 4 56 78 90 12",
        address: "101 Rue de l'Industrie, Toulouse",
        description: "Professional car repair and maintenance services",
        isVerified: true,
        isAdvertiser: false,
        isActive: true,
      },
      {
        name: "Artisan Boulangerie",
        categoryId: 2,
        email: "info@boulangerie.fr",
        phone: "+33 5 67 89 01 23",
        address: "202 Rue du Commerce, Nice",
        description: "Traditional French bakery with fresh daily products",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
    ];

    for (const data of seedData) {
      try {
        await db.insert(businesses).values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (err) {
        // Continue on duplicate or other errors
        console.log(`Skipping business ${data.name}:`, (err as any).message);
      }
    }

    res.json({
      success: true,
      status: 200,
      message: `${seedData.length} businesses added`,
      count: seedData.length,
    });
  }),
);

/**
 * POST /api/v1/admin/businesses/seed/dev
 * Development-only: Populate database with seed data without auth
 * (Automatically disabled in production via NODE_ENV check)
 */
router.post(
  "/seed/dev",
  asyncHandler(async (req, res) => {
    // Security: Only allow in development
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: "Seeding disabled in production",
      });
    }

    const seedData = [
      {
        name: "Verso Air",
        categoryId: 1,
        email: "contact@verso-air.com",
        phone: "+33 1 58 50 50 50",
        address: "125 Avenue Champs-Élysées, Paris 75008",
        description:
          "Business Intelligence Platform for Multi-Sector Analytics",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
      {
        name: "Le Bistro Parisien",
        categoryId: 2,
        email: "contact@bistro.fr",
        phone: "+33 1 23 45 67 89",
        address: "123 Rue de Rivoli, Paris 75001",
        description: "Authentic French cuisine with wine selection",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
      {
        name: "Tech Solutions Inc",
        categoryId: 1,
        email: "sales@tech.com",
        phone: "+33 2 34 56 78 90",
        address: "456 Avenue du Commerce, Lyon",
        description: "Digital transformation services and software development",
        isVerified: true,
        isAdvertiser: false,
        isActive: true,
      },
      {
        name: "Hotel Elegance",
        categoryId: 3,
        email: "reservations@elegance.fr",
        phone: "+33 3 45 67 89 01",
        address: "789 Boulevard de la Liberté, Marseille",
        description: "Luxury 5-star hotel with spa and restaurant",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
      {
        name: "AutoRepair Pro",
        categoryId: 4,
        email: "service@autorepair.fr",
        phone: "+33 4 56 78 90 12",
        address: "101 Rue de l'Industrie, Toulouse",
        description: "Professional car repair and maintenance services",
        isVerified: true,
        isAdvertiser: false,
        isActive: true,
      },
      {
        name: "Artisan Boulangerie",
        categoryId: 2,
        email: "info@boulangerie.fr",
        phone: "+33 5 67 89 01 23",
        address: "202 Rue du Commerce, Nice",
        description: "Traditional French bakery with fresh daily products",
        isVerified: true,
        isAdvertiser: true,
        isActive: true,
      },
    ];

    let insertedCount = 0;

    for (const data of seedData) {
      try {
        await db.insert(businesses).values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        insertedCount++;
      } catch (err) {
        // Continue on duplicate or other errors
        console.log(`Skipping business ${data.name}:`, (err as any).message);
      }
    }

    res.json({
      success: true,
      status: 200,
      message: `${insertedCount} businesses added`,
      count: insertedCount,
      environment: process.env.NODE_ENV || "development",
    });
  }),
);

export default router;

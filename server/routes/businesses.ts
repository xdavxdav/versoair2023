import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { validateBusinessCategory } from "../services/business-validation";
import { eq } from "drizzle-orm";
import { businesses, auditLogs } from "@shared/schema";

const router = Router();

// ============================================================================
// BUSINESSES ENDPOINTS
// ============================================================================

// GET all businesses with pagination and filtering
router.get("/api/businesses", async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      location: locationFilter = "",
      category = "",
      categoryId = "",
      categoryIds = "",
      sectorId = "",
      categoryName = "",
      isActive = "",
      sortBy = "created_at",
      order = "DESC",
    } = req.query;

    const offset = ((Number(page) - 1) * Number(limit)) as number;

    // Build WHERE clause
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (search) {
      whereClause +=
        " AND (b.name ILIKE $" +
        (params.length + 1) +
        " OR b.description ILIKE $" +
        (params.length + 1) +
        ")";
      params.push(`%${search}%`);
    }

    if (locationFilter) {
      whereClause +=
        " AND (b.location ILIKE $" +
        (params.length + 1) +
        " OR b.address ILIKE $" +
        (params.length + 1) +
        " OR b.city_name ILIKE $" +
        (params.length + 1) +
        ")";
      params.push(`%${locationFilter}%`);
    }

    // Support both 'category' (from dashboard-admin) and 'categoryId' (legacy)
    const effectiveCategoryId = category || categoryId;
    if (effectiveCategoryId) {
      whereClause += " AND b.category_id = $" + (params.length + 1);
      params.push(effectiveCategoryId);
    }

    // categoryIds: filter by multiple specific subcategory IDs (comma-separated)
    if (categoryIds) {
      const ids = String(categoryIds)
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n));
      if (ids.length > 0) {
        const placeholders = ids
          .map((_, i) => "$" + (params.length + 1 + i))
          .join(", ");
        whereClause += " AND b.category_id IN (" + placeholders + ")";
        params.push(...ids);
      }
    }

    // sectorId: filter by parent category — returns all businesses whose
    // category_id belongs to a subcategory under this parent, OR matches the
    // parent itself.
    if (sectorId) {
      whereClause +=
        " AND (b.category_id IN (SELECT id FROM business_categories WHERE parent_id = $" +
        (params.length + 1) +
        ") OR b.category_id = $" +
        (params.length + 1) +
        ")";
      params.push(Number(sectorId));
    }

    // categoryName: filter by category name (ILIKE match on the joined
    // business_categories table). Useful when the caller knows the category
    // name but not its numeric ID.
    if (categoryName) {
      whereClause += " AND bc.name ILIKE $" + (params.length + 1);
      params.push(`%${categoryName}%`);
    }

    if (isActive !== "") {
      whereClause += " AND b.is_active = $" + (params.length + 1);
      params.push(isActive === "true");
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = [
      "created_at",
      "name",
      "rating",
      "reviews",
      "category_id",
    ];
    const sortField = allowedSortFields.includes(String(sortBy))
      ? sortBy
      : "created_at";

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      ${whereClause}
    `;

    // 🛸 Growth Engine: Tier-weighted ranking algorithm
    // For now, order by the requested field
    // TODO: Implement tier-weighted ranking after confirming owner_id relationships exist
    const dataQuery = `
      SELECT 
        b.id, b.name, b.category_id, b.description, 
        b.location, b.address, b.phone, b.email,
        b.rating, b.reviews, b.tags, b.latitude, b.longitude,
        b.created_at, b.updated_at,
        bc.name as category_name,
        'free' as owner_tier
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      ${whereClause}
      ORDER BY b.${sortField} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(dataQuery, [...params, limit, offset]),
    ]);

    const total = countResult.rows[0]?.total || 0;

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch businesses",
      details: (error as Error).message,
    });
  }
});

// GET single business
router.get("/api/businesses/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        b.*,
        bc.name as category_name,
        json_agg(
          json_build_object(
            'id', bs.id,
            'name', bs.name,
            'price', bs.price,
            'category', bs.category
          )
        ) FILTER (WHERE bs.id IS NOT NULL) as services,
        json_agg(
          json_build_object(
            'id', br.id,
            'rating', br.rating,
            'title', br.title,
            'content', br.content
          )
        ) FILTER (WHERE br.id IS NOT NULL) as reviews
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      LEFT JOIN business_services bs ON b.id = bs.business_id
      LEFT JOIN business_reviews br ON b.id = br.business_id
      WHERE b.id = $1
      GROUP BY b.id, bc.name
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Business not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching business:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch business",
      details: (error as Error).message,
    });
  }
});

// CREATE business
router.post("/api/businesses", async (req: Request, res: Response) => {
  try {
    const {
      name,
      categoryId,
      description,
      location,
      address,
      phone,
      email,
      latitude,
      longitude,
      tags = [],
      isActive = true,
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, categoryId",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO businesses 
      (name, category_id, description, location, address, phone, email, latitude, longitude, tags, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `,
      [
        name,
        categoryId,
        description || null,
        location || null,
        address || null,
        phone || null,
        email || null,
        latitude || null,
        longitude || null,
        JSON.stringify(tags),
        isActive,
      ],
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Business created successfully",
    });
  } catch (error) {
    console.error("Error creating business:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create business",
      details: (error as Error).message,
    });
  }
});

// UPDATE business
router.put("/api/businesses/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = parseInt(id);
    const adminId = 1; // In production: extract from auth session (Clerk/NextAuth)
    const ipAddress = req.headers["x-forwarded-for"] || req.ip || "unknown";

    // Transaction: Get old data, update, and audit log in one go
    const result = await db.transaction(async (tx) => {
      // 1. Get the current state (for audit "before" snapshot)
      const [oldData] = await tx
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId));

      if (!oldData) {
        throw new Error("Business not found");
      }

      // 2. Prepare the update payload (only non-undefined fields)
      const updatePayload: any = {};
      const allowedFields = [
        "name",
        "description",
        "phone",
        "email",
        "rating",
        "isAdvertiser",
        "isVerified",
        "adBalance",
        "attributes",
        "tags",
      ];

      for (const field of allowedFields) {
        if (field in req.body && req.body[field] !== undefined) {
          updatePayload[field] = req.body[field];
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        throw new Error("No fields to update");
      }

      // Handle category change with validation
      if (req.body.categoryId !== undefined) {
        const validation = await validateBusinessCategory({
          id: businessId,
          name: updatePayload.name || oldData.name,
          description: updatePayload.description || oldData.description,
          category_id: req.body.categoryId,
        });

        if (!validation.isValid) {
          throw new Error(
            `Category validation failed: ${validation.errors.join(", ")}`,
          );
        }

        updatePayload.categoryId = req.body.categoryId;
      }

      // 3. Perform the update
      const [updatedBusiness] = await tx
        .update(businesses)
        .set({ ...updatePayload, updatedAt: new Date() })
        .where(eq(businesses.id, businessId))
        .returning();

      // 4. Log the change to auditLogs
      await tx.insert(auditLogs).values({
        userId: adminId,
        action: "UPDATE_BUSINESS_PROFILE",
        entityType: "business",
        entityId: businessId.toString(),
        changes: {
          before: oldData,
          after: updatedBusiness,
          fields: Object.keys(updatePayload),
        },
        ipAddress: String(ipAddress),
      });

      return updatedBusiness;
    });

    res.json({
      success: true,
      data: result,
      message: "Business updated successfully with audit trail",
    });
  } catch (error: any) {
    console.error("Error updating business:", error);
    res.status(error.message === "Business not found" ? 404 : 400).json({
      success: false,
      error: error.message || "Failed to update business",
    });
  }
});

// DELETE business
router.delete("/api/businesses/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM businesses WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Business not found",
      });
    }

    res.json({
      success: true,
      message: "Business deleted successfully",
      deletedId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error deleting business:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete business",
      details: (error as Error).message,
    });
  }
});

// GET business statistics
router.get(
  "/api/businesses/stats/summary",
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT 
        COUNT(*) as total_businesses,
        COUNT(CASE WHEN is_active THEN 1 END) as active_businesses,
        COUNT(CASE WHEN is_advertiser THEN 1 END) as advertisers,
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        ROUND(MAX(rating)::numeric, 2) as max_rating,
        COUNT(DISTINCT category_id) as total_categories,
        SUM(reviews) as total_reviews
      FROM businesses
    `);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error fetching business stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
        details: (error as Error).message,
      });
    }
  },
);

// GET businesses by category
router.get(
  "/api/businesses/category/:categoryId",
  async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const { limit = 100 } = req.query;

      // 🛸 Growth Engine: Tier-weighted ranking for category browsing
      const result = await pool.query(
        `
        SELECT 
          b.*, 
          bc.name as category_name,
          COALESCE(u.subscription_tier, 'free') as owner_tier
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        LEFT JOIN users u ON b.owner_id = u.id
        WHERE b.category_id = $1 AND b.is_active = true
        ORDER BY
          CASE COALESCE(u.subscription_tier, 'free')
            WHEN 'enterprise' THEN 1
            WHEN 'max'        THEN 2
            WHEN 'verified'   THEN 3
            WHEN 'essential'  THEN 4
            WHEN 'free'       THEN 5
            ELSE 5
          END ASC,
          b.rating DESC NULLS LAST
        LIMIT $2
      `,
        [categoryId, limit],
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error("Error fetching businesses by category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch businesses",
        details: (error as Error).message,
      });
    }
  },
);

// BULK UPDATE businesses
router.post(
  "/api/businesses/bulk/update",
  async (req: Request, res: Response) => {
    try {
      const { updates } = req.body; // Array of {id, ...updates}

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid bulk update format",
        });
      }

      const results = await Promise.all(
        updates.map((update: any) => {
          const { id, ...data } = update;
          const setClauses: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;

          for (const [key, value] of Object.entries(data)) {
            setClauses.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }

          setClauses.push(`updated_at = NOW()`);
          values.push(id);

          return pool.query(
            `
          UPDATE businesses
          SET ${setClauses.join(", ")}
          WHERE id = $${paramIndex}
          RETURNING id
        `,
            values,
          );
        }),
      );

      res.json({
        success: true,
        updated: results.filter((r: any) => r.rows.length > 0).length,
        message: `${results.filter((r: any) => r.rows.length > 0).length} businesses updated`,
      });
    } catch (error) {
      console.error("Error bulk updating businesses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk update businesses",
        details: (error as Error).message,
      });
    }
  },
);

// GET database table statistics
router.get("/api/database/tables", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename ASC
    `);

    const tables = result.rows.map((row: any) => ({
      table_name: row.tablename,
      row_count: parseInt(row.row_count),
    }));

    res.json({
      success: true,
      tables,
      total_tables: tables.length,
    });
  } catch (error) {
    console.error("Error fetching table stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch table statistics",
      details: (error as Error).message,
    });
  }
});

export default router;

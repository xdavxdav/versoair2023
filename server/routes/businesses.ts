import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { validateBusinessCategory } from "../services/business-validation";
import { eq } from "drizzle-orm";
import { businesses, auditLogs, users } from "@shared/schema";
import { generateBusinessPDF } from "../services/pdf-generator";
import {
  sendBusinessApprovalRequestEmail,
  sendBusinessApprovedEmail,
  sendBusinessRejectedEmail,
} from "../services/email-service";

const router = Router();

// ─── Cached column existence checks (production DB may lag behind schema) ───
const _bizColCache: Record<string, boolean | null> = {};
async function bizHasColumn(col: string): Promise<boolean> {
  if (_bizColCache[col] !== undefined && _bizColCache[col] !== null)
    return _bizColCache[col]!;
  try {
    await pool.query(`SELECT ${col} FROM businesses LIMIT 0`);
    _bizColCache[col] = true;
  } catch {
    _bizColCache[col] = false;
  }
  return _bizColCache[col]!;
}

// ============================================================================
// COUNTRIES ENDPOINT
// ============================================================================

// GET available countries (for country toggle filter)
router.get("/api/countries", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name, code FROM countries ORDER BY name ASC",
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch countries" });
  }
});

// GET detected country for current request (best-effort)
router.get("/api/location/country", async (req: Request, res: Response) => {
  const normalizeCode = (value?: string | null) => {
    const code = (value || "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "ZZ") {
      return code;
    }
    return "";
  };

  try {
    // 1) Prefer platform-provided headers (Cloudflare/Vercel/etc.)
    const headerCandidates = [
      req.header("cf-ipcountry"),
      req.header("x-vercel-ip-country"),
      req.header("x-country-code"),
      req.header("x-country"),
    ];

    for (const candidate of headerCandidates) {
      const code = normalizeCode(candidate);
      if (code) {
        return res.json({ success: true, countryCode: code, source: "header" });
      }
    }

    // 2) Fallback: resolve from client IP using ipwho.is
    const forwardedFor = req.header("x-forwarded-for") || "";
    const ipFromHeader = forwardedFor.split(",")[0]?.trim();
    const candidateIp = ipFromHeader || req.ip || "";

    if (candidateIp) {
      const ip = candidateIp.replace(/^::ffff:/, "");

      // Skip loopback/private IPs — they won't resolve to a real country
      const isPrivate =
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip === "localhost" ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

      if (!isPrivate) {
        const encodedIp = encodeURIComponent(ip);
        const response = await fetch(
          `https://ipwho.is/${encodedIp}?fields=success,country_code`,
          { signal: AbortSignal.timeout(4000) },
        );

        if (response.ok) {
          const data = await response.json();
          const code = normalizeCode(data?.country_code);
          if (data?.success && code) {
            return res.json({
              success: true,
              countryCode: code,
              source: "ip",
            });
          }
        }
      }
    }

    // 3) Final fallback: call ipwho.is with no IP (uses server's public IP)
    try {
      const response = await fetch(
        "https://ipwho.is/?fields=success,country_code",
        { signal: AbortSignal.timeout(4000) },
      );
      if (response.ok) {
        const data = await response.json();
        const code = normalizeCode(data?.country_code);
        if (data?.success && code) {
          return res.json({
            success: true,
            countryCode: code,
            source: "server-ip",
          });
        }
      }
    } catch {
      /* ignore — return empty below */
    }

    return res.status(200).json({ success: false, countryCode: "" });
  } catch (error) {
    console.warn("Country detection failed:", error);
    return res.status(200).json({ success: false, countryCode: "" });
  }
});

// GET detailed IP geolocation data (for location panel)
router.get("/api/location/ip-data", async (req: Request, res: Response) => {
  try {
    // Get client IP from headers or request object
    const forwardedFor = req.header("x-forwarded-for") || "";
    const ipFromHeader = forwardedFor.split(",")[0]?.trim();
    const candidateIp = ipFromHeader || req.ip || "";
    const ip = candidateIp.replace(/^::ffff:/, "");

    // Try ipwho.is (HTTPS-friendly, works in all environments)
    try {
      const response = await fetch(
        `https://ipwho.is/${ip}?fields=success,ip,city,region,region_code,country,country_code,postal,latitude,longitude,connection`,
        { signal: AbortSignal.timeout(4000) },
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          return res.json({
            success: true,
            ip: data.ip,
            city: data.city || "Unknown",
            region: data.region || "Unknown",
            region_code: data.region_code || "",
            country_code: data.country_code || "Unknown",
            postal: data.postal || "Unknown",
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            org:
              data?.connection?.org || data?.connection?.isp || "Unknown ISP",
            source: "ipwho.is",
          });
        }
      }
    } catch (error) {
      console.warn("ipwho.is lookup failed:", error);
    }

    // All providers failed - return minimal data
    return res.status(200).json({
      success: false,
      ip: ip || "unknown",
      city: "Unknown",
      region: "Unknown",
      country_code: "Unknown",
      postal: "Unknown",
      latitude: 0,
      longitude: 0,
      org: "Unknown ISP",
    });
  } catch (error) {
    console.error("Location data error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get location data" });
  }
});

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
      countryCode = "",
    } = req.query;

    const offset = ((Number(page) - 1) * Number(limit)) as number;

    // Build WHERE clause
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (search) {
      // Use full-text search with ts_rank when search_vector exists,
      // fallback to ILIKE for short queries or partial matches
      const searchTerm = String(search).trim();
      if (searchTerm.length >= 3) {
        whereClause +=
          " AND (to_tsvector('simple', COALESCE(b.name,'') || ' ' || COALESCE(b.description,'')) @@ plainto_tsquery('simple', $" +
          (params.length + 1) +
          ") OR b.name ILIKE $" +
          (params.length + 2) +
          ")";
        params.push(searchTerm);
        params.push(`${searchTerm}%`);
      } else {
        whereClause +=
          " AND (b.name ILIKE $" +
          (params.length + 1) +
          " OR b.description ILIKE $" +
          (params.length + 1) +
          ")";
        params.push(`${searchTerm}%`);
      }
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
      params.push(`${locationFilter}%`);
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
      params.push(`${categoryName}%`);
    }

    if (isActive !== "") {
      whereClause += " AND b.is_active = $" + (params.length + 1);
      params.push(isActive === "true");
    }

    if (countryCode) {
      whereClause +=
        " AND UPPER(b.country_code) = UPPER($" + (params.length + 1) + ")";
      params.push(String(countryCode));
    }

    // userId / ownerId filter — fetch businesses owned by a specific user
    const userIdFilter = req.query.userId || req.query.ownerId;
    if (userIdFilter) {
      whereClause += " AND b.owner_id = $" + (params.length + 1);
      params.push(Number(userIdFilter));
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
    // Joins owner's subscription tier and applies ranking multiplier:
    // enterprise(1) → max(2) → verified(3) → essential(4) → free(5)
    //
    // Dynamically include columns that may not exist on production yet
    const optionalCols = [
      "is_advertiser",
      "is_premium",
      "verified_at",
      "popularity_score",
      "pdf_path",
      "approval_status",
    ];
    const colChecks = await Promise.all(
      optionalCols.map(async (c) => ({
        col: c,
        exists: await bizHasColumn(c),
      })),
    );
    const extraSelect = colChecks
      .filter((c) => c.exists)
      .map((c) => `b.${c.col}`)
      .join(", ");
    const extraSelectClause = extraSelect ? `, ${extraSelect}` : "";

    const hasOwner = await bizHasColumn("owner_id");
    const ownerJoin = hasOwner ? "LEFT JOIN users u ON b.owner_id = u.id" : "";
    const ownerTierSelect = hasOwner
      ? ", COALESCE(u.subscription_tier, 'free') as owner_tier"
      : ", 'free' as owner_tier";
    const tierOrder = hasOwner
      ? `CASE COALESCE(u.subscription_tier, 'free')
          WHEN 'enterprise' THEN 1
          WHEN 'max'        THEN 2
          WHEN 'verified'   THEN 3
          WHEN 'essential'  THEN 4
          WHEN 'free'       THEN 5
          ELSE 5
        END ASC,`
      : "";

    const dataQuery = `
      SELECT 
        b.id, b.name, b.category_id, b.description, 
        b.location, b.address, b.phone, b.email,
        b.rating, b.reviews, b.tags, b.latitude, b.longitude,
        b.country_code, b.city_name,
        b.featured, b.is_active,
        b.is_verified, b.website,
        CASE WHEN b.is_verified THEN 'verified' ELSE 'unverified' END as verification_status,
        b.created_at, b.updated_at,
        bc.name as category_name
        ${ownerTierSelect}
        ${extraSelectClause}
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      ${ownerJoin}
      ${whereClause}
      ORDER BY
        b.featured DESC NULLS LAST,
        ${tierOrder}
        b.${sortField} ${order}
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
      countryCode,
      cityName,
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
      (name, category_id, description, location, address, phone, email, latitude, longitude, country_code, city_name, tags, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
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
        countryCode || null,
        cityName || null,
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
        "address",
        "countryCode",
        "cityName",
        "isActive",
        "rating",
        "isAdvertiser",
        "isVerified",
        "approvalStatus",
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

// BULK UPDATE businesses (transaction-wrapped)
router.post(
  "/api/businesses/bulk/update",
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { updates } = req.body; // Array of {id, ...updates}

      if (!Array.isArray(updates) || updates.length === 0) {
        client.release();
        return res.status(400).json({
          success: false,
          error: "Invalid bulk update format",
        });
      }

      await client.query("BEGIN");

      let updatedCount = 0;
      for (const update of updates) {
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

        const result = await client.query(
          `UPDATE businesses
           SET ${setClauses.join(", ")}
           WHERE id = $${paramIndex}
           RETURNING id`,
          values,
        );
        if (result.rows.length > 0) updatedCount++;
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        updated: updatedCount,
        message: `${updatedCount} businesses updated`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error bulk updating businesses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk update businesses",
        details: (error as Error).message,
      });
    } finally {
      client.release();
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

// ============================================================================
// BUSINESS APPROVAL WORKFLOW (GeoAdmin → SupUser/SuperUser review)
// ============================================================================

/**
 * SUBMIT business for approval (GeoAdmin users)
 * Creates the business with approval_status='pending',
 * auto-generates a PDF, and emails the admin SMTP address.
 */
router.post("/api/businesses/submit", async (req: Request, res: Response) => {
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
      countryCode,
      cityName,
      tags = [],
      username, // the geo-admin user who submitted
      userId, // the geo-admin user id
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, categoryId",
      });
    }

    // 1. Insert the business with approval_status = 'pending'
    const insertResult = await pool.query(
      `INSERT INTO businesses
         (name, category_id, description, location, address, phone, email,
          latitude, longitude, country_code, city_name, tags, is_active,
          approval_status, submitted_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,
                 'pending',$13,NOW(),NOW())
         RETURNING *`,
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
        countryCode || null,
        cityName || null,
        JSON.stringify(tags),
        userId || null,
      ],
    );

    const newBusiness = insertResult.rows[0];

    // 2. Look up category name for the PDF / email
    let categoryName = "";
    try {
      const catResult = await pool.query(
        "SELECT name FROM business_categories WHERE id = $1",
        [categoryId],
      );
      categoryName = catResult.rows[0]?.name || "";
    } catch {
      /* ignore */
    }

    // 3. Generate the registration PDF
    let pdfPath: string | undefined;
    try {
      pdfPath = await generateBusinessPDF({
        id: newBusiness.id,
        name,
        categoryName,
        description,
        address,
        cityName,
        countryCode,
        phone,
        email,
        submittedBy: username || "GeoAdmin User",
        submittedAt: new Date().toISOString(),
      });

      // Save PDF path back to the record
      await pool.query("UPDATE businesses SET pdf_path = $1 WHERE id = $2", [
        pdfPath,
        newBusiness.id,
      ]);
    } catch (pdfErr) {
      console.error("[SUBMIT] PDF generation failed:", pdfErr);
    }

    // 4. Send approval-request email to admin SMTP address
    const adminEmail = process.env.SMTP_USER || process.env.SMTP_FROM || "";
    if (adminEmail) {
      try {
        await sendBusinessApprovalRequestEmail(
          adminEmail,
          {
            businessId: newBusiness.id,
            businessName: name,
            categoryName,
            submittedBy: username || "GeoAdmin User",
            description,
            address,
            cityName,
            countryCode,
            phone,
            email,
          },
          pdfPath,
        );
      } catch (mailErr) {
        console.error("[SUBMIT] Email notification failed:", mailErr);
      }
    }

    // 5. Audit log
    try {
      await db.insert(auditLogs).values({
        userId: userId || null,
        action: "BUSINESS_SUBMITTED_FOR_APPROVAL",
        entityType: "business",
        entityId: String(newBusiness.id),
        changes: { name, categoryId, countryCode, cityName, username },
        ipAddress: String(
          req.headers["x-forwarded-for"] || req.ip || "unknown",
        ),
      });
    } catch {
      /* audit is best-effort */
    }

    res.status(201).json({
      success: true,
      data: newBusiness,
      message:
        "Business submitted for approval. An admin will review your registration shortly.",
    });
  } catch (error) {
    console.error("Error submitting business:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit business for approval",
      details: (error as Error).message,
    });
  }
});

/**
 * GET pending businesses (for admin dashboard review)
 */
router.get("/api/businesses/pending", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT b.*, bc.name as category_name, u.username as submitted_by_username
         FROM businesses b
         LEFT JOIN business_categories bc ON b.category_id = bc.id
         LEFT JOIN users u ON b.submitted_by = u.id
         WHERE b.approval_status = 'pending'
         ORDER BY b.created_at DESC`,
    );

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error("Error fetching pending businesses:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending businesses",
    });
  }
});

/**
 * APPROVE a pending business (SupUser / SuperUser)
 */
router.put(
  "/api/businesses/:id/approve",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedBy, notes } = req.body; // userId of the approver

      const result = await pool.query(
        `UPDATE businesses
         SET approval_status = 'approved',
             is_active = true,
             approved_by = $1,
             approval_notes = $2,
             updated_at = NOW()
         WHERE id = $3 AND approval_status = 'pending'
         RETURNING *`,
        [approvedBy || null, notes || null, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Business not found or not in pending state",
        });
      }

      const biz = result.rows[0];

      // Notify the submitter via email
      if (biz.submitted_by) {
        try {
          const userResult = await pool.query(
            "SELECT username, email FROM users WHERE id = $1",
            [biz.submitted_by],
          );
          const submitter = userResult.rows[0];
          if (submitter?.email) {
            await sendBusinessApprovedEmail(
              submitter.email,
              submitter.username,
              biz.name,
              notes,
            );
          }
        } catch {
          /* best-effort */
        }
      }

      // Audit log
      try {
        await db.insert(auditLogs).values({
          userId: approvedBy || null,
          action: "BUSINESS_APPROVED",
          entityType: "business",
          entityId: String(id),
          changes: { notes, businessName: biz.name },
          ipAddress: String(
            req.headers["x-forwarded-for"] || req.ip || "unknown",
          ),
        });
      } catch {
        /* best-effort */
      }

      res.json({
        success: true,
        data: biz,
        message: `Business "${biz.name}" has been approved.`,
      });
    } catch (error) {
      console.error("Error approving business:", error);
      res.status(500).json({
        success: false,
        error: "Failed to approve business",
        details: (error as Error).message,
      });
    }
  },
);

/**
 * REJECT a pending business (SupUser / SuperUser)
 */
router.put(
  "/api/businesses/:id/reject",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectedBy, reason } = req.body;

      const result = await pool.query(
        `UPDATE businesses
         SET approval_status = 'rejected',
             is_active = false,
             approved_by = $1,
             approval_notes = $2,
             updated_at = NOW()
         WHERE id = $3 AND approval_status = 'pending'
         RETURNING *`,
        [rejectedBy || null, reason || null, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Business not found or not in pending state",
        });
      }

      const biz = result.rows[0];

      // Notify the submitter via email
      if (biz.submitted_by) {
        try {
          const userResult = await pool.query(
            "SELECT username, email FROM users WHERE id = $1",
            [biz.submitted_by],
          );
          const submitter = userResult.rows[0];
          if (submitter?.email) {
            await sendBusinessRejectedEmail(
              submitter.email,
              submitter.username,
              biz.name,
              reason,
            );
          }
        } catch {
          /* best-effort */
        }
      }

      // Audit log
      try {
        await db.insert(auditLogs).values({
          userId: rejectedBy || null,
          action: "BUSINESS_REJECTED",
          entityType: "business",
          entityId: String(id),
          changes: { reason, businessName: biz.name },
          ipAddress: String(
            req.headers["x-forwarded-for"] || req.ip || "unknown",
          ),
        });
      } catch {
        /* best-effort */
      }

      res.json({
        success: true,
        data: biz,
        message: `Business "${biz.name}" has been rejected.`,
      });
    } catch (error) {
      console.error("Error rejecting business:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reject business",
        details: (error as Error).message,
      });
    }
  },
);

/**
 * DOWNLOAD business registration PDF
 */
router.get("/api/businesses/:id/pdf", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT pdf_path, name FROM businesses WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0 || !result.rows[0].pdf_path) {
      return res.status(404).json({
        success: false,
        error: "PDF not found for this business",
      });
    }

    const { pdf_path, name } = result.rows[0];
    const fs = await import("fs");
    if (!fs.existsSync(pdf_path)) {
      return res.status(404).json({
        success: false,
        error: "PDF file not found on server",
      });
    }

    res.download(pdf_path, `business-registration-${name}.pdf`);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download PDF",
    });
  }
});

// ============================================================================
// BUSINESS ADMIN MESSAGES (Teams-style conversation thread)
// ============================================================================

/**
 * GET messages for a business (conversation thread)
 */
router.get(
  "/api/businesses/:id/messages",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT * FROM business_messages
         WHERE business_id = $1
         ORDER BY created_at ASC`,
        [id],
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Error fetching business messages:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch messages" });
    }
  },
);

/**
 * POST a new message to a business thread
 */
router.post(
  "/api/businesses/:id/messages",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { senderId, senderName, senderRole, message, messageType } =
        req.body;

      if (!message || !senderName || !senderRole) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: message, senderName, senderRole",
        });
      }

      const result = await pool.query(
        `INSERT INTO business_messages
           (business_id, sender_id, sender_name, sender_role, message, message_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [
          id,
          senderId || null,
          senderName,
          senderRole,
          message,
          messageType || "text",
        ],
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Error posting business message:", error);
      res.status(500).json({ success: false, error: "Failed to post message" });
    }
  },
);

/**
 * GET full business dossier (all fields + owner info + category)
 */
router.get(
  "/api/businesses/:id/dossier",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT b.*,
            bc.name as category_name,
            u.username as owner_username,
            u.email as owner_email,
            u.role as owner_role,
            sub.username as submitted_by_username,
            appr.username as approved_by_username
         FROM businesses b
         LEFT JOIN business_categories bc ON b.category_id = bc.id
         LEFT JOIN users u ON b.owner_id = u.id
         LEFT JOIN users sub ON b.submitted_by = sub.id
         LEFT JOIN users appr ON b.approved_by = appr.id
         WHERE b.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Business not found" });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Error fetching business dossier:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch dossier" });
    }
  },
);

export default router;

import { Router } from "express";
import * as schema from "@shared/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/business/search",
  asyncHandler(async (req, res) => {
    const { query, category, location, page = "1", limit = "10" } = req.query;

    console.log("🔍 [BUSINESS] Search:", { query, category, location });

    const conditions: any[] = [];
    if (query && typeof query === "string") {
      const searchCondition = or(
        ilike(schema.businesses.name, `${query}%`),
        ilike(schema.businesses.description, `${query}%`),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (category && typeof category === "string") {
      const categoryRecord = await db
        .select()
        .from(schema.businessCategories)
        .where(eq(schema.businessCategories.slug, category))
        .limit(1);
      if (categoryRecord.length > 0) {
        conditions.push(eq(schema.businesses.categoryId, categoryRecord[0].id));
      }
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.businesses)
      .where(whereCondition);
    const totalCount = countResult[0]?.count || 0;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const businessResults = await db
      .select({
        id: schema.businesses.id,
        name: schema.businesses.name,
        description: schema.businesses.description,
        categoryId: schema.businesses.categoryId,
        categoryName: schema.businessCategories.name,
        createdAt: schema.businesses.createdAt,
        location: schema.businesses.location,
        address: schema.businesses.address,
        phone: schema.businesses.phone,
        email: schema.businesses.email,
        website: schema.businesses.website,
      })
      .from(schema.businesses)
      .leftJoin(
        schema.businessCategories,
        eq(schema.businesses.categoryId, schema.businessCategories.id),
      )
      .where(whereCondition)
      .orderBy(schema.businesses.name)
      .limit(limitNum)
      .offset(offset);

    const formattedResults = businessResults.map((business: any) => ({
      id: business.id.toString(),
      name: business.name,
      title: business.name,
      description: business.description || "",
      category: business.categoryName || "Unknown",
      location: business.location || "",
      address: business.address || "",
      phone: business.phone || "",
      email: business.email || "",
      rating: 4.5,
      reviews: 0,
      tags: [],
      latitude: 0,
      longitude: 0,
      created_at: business.createdAt?.toISOString(),
      website: business.website || "",
    }));

    res.json({
      success: true,
      data: formattedResults,
      total: formattedResults.length,
      totalInDatabase: totalCount,
      query: query?.toString() || "",
      category: category?.toString() || "",
      location: location?.toString() || "",
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  }),
);

router.get(
  "/category/:slug/search",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const {
      page = "1",
      limit = "10",
      query,
      location,
      min_rating,
    } = req.query as any;

    const categoryResult = await pool.query(
      `SELECT id, name, slug FROM business_categories WHERE slug = $1 LIMIT 1`,
      [slug],
    );

    if (!categoryResult.rows || categoryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    const category = categoryResult.rows[0];
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const whereConditions: string[] = ["b.category_id = $1"];
    const params: any[] = [category.id];
    let paramIndex = 2;

    if (query && typeof query === "string") {
      whereConditions.push(
        `(b.name ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex + 1})`,
      );
      params.push(`${query}%`, `${query}%`);
      paramIndex += 2;
    }

    if (location && typeof location === "string") {
      whereConditions.push(
        `(b.location ILIKE $${paramIndex} OR b.address ILIKE $${paramIndex} OR b.city_name ILIKE $${paramIndex} OR r.name ILIKE $${paramIndex})`,
      );
      params.push(`%${location}%`);
      paramIndex += 1;
    }

    if (min_rating) {
      whereConditions.push(`b.rating >= $${paramIndex}`);
      params.push(parseFloat(min_rating));
      paramIndex += 1;
    }

    const whereClause = whereConditions.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM businesses b LEFT JOIN regions r ON b.region_id = r.id WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    const businessesResult = await pool.query(
      `SELECT b.*, r.name as region_name,
         COALESCE(u.subscription_tier, 'free') as owner_tier
       FROM businesses b
       LEFT JOIN users u ON b.owner_id = u.id
       LEFT JOIN regions r ON b.region_id = r.id
       WHERE ${whereClause}
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
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset],
    );

    res.json({
      success: true,
      data: businessesResult.rows,
      total,
      page: pageNum,
      limit: limitNum,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
    });
  }),
);

router.get(
  "/business/categories",
  asyncHandler(async (_req, res) => {
    try {
      const categoriesResult = await db
        .select({
          id: schema.businessCategories.id,
          name: schema.businessCategories.name,
          slug: schema.businessCategories.slug,
        })
        .from(schema.businessCategories)
        .orderBy(schema.businessCategories.name);

      return res.json({
        success: true,
        categories: categoriesResult.map((c) => c.name),
        categoryData: categoriesResult,
        count: categoriesResult.length,
      });
    } catch (error) {
      console.error("❌ Failed to fetch categories:", error);
      return res.json({
        success: true,
        categories: ["technology", "agriculture", "real-estate", "logistics"],
        count: 4,
      });
    }
  }),
);

router.get(
  "/businesses/pool/:categoryName",
  asyncHandler(async (req, res) => {
    const { categoryName } = req.params;
    const { page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const poolMapping: Record<string, any> = {
      restaurants: {
        tableName: "restaurants_businesses",
        schemaKey: "restaurantsBusinesses",
        categoryId: 258,
        categoryName: "Food & Beverage",
      },
      hotellerie: {
        tableName: "hotellerie_businesses",
        schemaKey: "hotellerieBusinesses",
        categoryId: 242,
        categoryName: "Tourism & Leisure",
      },
      technology: {
        tableName: "technology_businesses",
        schemaKey: "technologyBusinesses",
        categoryId: 227,
        categoryName: "IT & Internet",
      },
      healthcare: {
        tableName: "healthcare_businesses",
        schemaKey: "healthcareBusinesses",
        categoryId: 246,
        categoryName: "Health",
      },
      commerce: {
        tableName: "commerce_businesses",
        schemaKey: "commerceBusinesses",
        categoryId: 290,
        categoryName: "Commerce",
      },
      retail: {
        tableName: "retail_businesses",
        schemaKey: "retailBusinesses",
        categoryId: 218,
        categoryName: "Retail",
      },
      automobile: {
        tableName: "automobile_businesses",
        schemaKey: "automobileBusinesses",
        categoryId: 343,
        categoryName: "Automotive",
      },
      advertising: {
        tableName: "advertising_businesses",
        schemaKey: "advertisingBusinesses",
        categoryId: 229,
        categoryName: "Digital Marketing & Advertising",
      },
    };

    const selectedPool = poolMapping[categoryName.toLowerCase()];
    if (!selectedPool) {
      return res.status(400).json({
        success: false,
        error: `Unknown category pool: ${categoryName}`,
        availablePools: Object.keys(poolMapping),
      });
    }

    const result = await db.execute(
      sql`
        SELECT
          id,
          business_name,
          created_at,
          is_active
        FROM ${sql.identifier(selectedPool.tableName)}
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `,
    );

    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM ${sql.identifier(selectedPool.tableName)} WHERE is_active = true`,
    );

    const businesses = result.rows.map((row: any) => ({
      id: row.id,
      name: row.business_name,
      pool: selectedPool.categoryName,
      categoryId: selectedPool.categoryId,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: businesses,
      pool: selectedPool.categoryName,
      total: businesses.length,
      totalInPool: countResult.rows[0]?.count || 0,
      page: pageNum,
      limit: limitNum,
    });
  }),
);

router.get(
  "/business/locations",
  asyncHandler(async (_req, res) => {
    try {
      const locResult = await db.execute(
        sql`SELECT DISTINCT location FROM businesses
            WHERE location IS NOT NULL AND TRIM(location) != ''
            ORDER BY location LIMIT 100`,
      );
      let locations = (locResult.rows as any[])
        .map((r) => r.location)
        .filter(Boolean);

      if (locations.length === 0) {
        const cityResult = await db.execute(
          sql`SELECT DISTINCT name FROM cities ORDER BY name LIMIT 50`,
        );
        locations = (cityResult.rows as any[])
          .map((r) => r.name)
          .filter(Boolean);
      }

      if (locations.length === 0) {
        locations = ["Abidjan", "Yamoussoukro", "Bouaké", "Daloa", "San-Pédro"];
      }

      return res.json({ success: true, locations, count: locations.length });
    } catch (error) {
      console.error("❌ Failed to fetch locations:", error);
      return res.json({
        success: true,
        locations: ["Abidjan", "Yamoussoukro", "Bouaké"],
        count: 3,
      });
    }
  }),
);

router.get(
  "/business/test-connection",
  asyncHandler(async (_req, res) => {
    try {
      const testResult = await db.execute(sql`
        SELECT
          NOW() as time,
          current_database() as database,
          version() as version,
          (SELECT COUNT(*) FROM businesses) as business_count,
          (SELECT COUNT(*) FROM business_categories) as category_count
      `);

      const row = testResult.rows[0];
      return res.json({
        success: true,
        database: {
          connected: true,
          name: row?.database,
          version: row?.version,
          time: row?.time,
          businessCount: row?.business_count,
          categoryCount: row?.category_count,
        },
        server: {
          status: "running",
          environment: process.env.NODE_ENV || "development",
        },
      });
    } catch (error: any) {
      console.error("❌ Database test failed:", error);
      return res.json({
        success: false,
        database: {
          connected: false,
          error: error.message,
        },
        server: {
          status: "running",
          environment: process.env.NODE_ENV || "development",
        },
      });
    }
  }),
);

export default router;

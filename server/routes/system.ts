import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    try {
      const dbTest = await db.execute(sql`SELECT NOW() as time`);
      return res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        message: "Server is running",
        environment: process.env.NODE_ENV || "development",
        database: {
          connected: true,
          time: dbTest.rows[0]?.time,
        },
      });
    } catch (error: any) {
      return res.json({
        status: "warning",
        timestamp: new Date().toISOString(),
        message: "Server is running but database connection failed",
        environment: process.env.NODE_ENV || "development",
        database: {
          connected: false,
          error: error.message,
        },
      });
    }
  }),
);

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    try {
      const dbTest = await db.execute(sql`SELECT NOW() as time`);
      return res.json({
        success: true,
        status: "ok",
        timestamp: new Date().toISOString(),
        message: "Server is running",
        environment: process.env.NODE_ENV || "development",
        database: {
          connected: true,
          time: dbTest.rows[0]?.time,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        status: "error",
        timestamp: new Date().toISOString(),
        message: "Server is running but database connection failed",
        environment: process.env.NODE_ENV || "development",
        database: {
          connected: false,
          error: error.message,
        },
      });
    }
  }),
);

router.get(
  "/verify-db-counts",
  asyncHandler(async (_req, res) => {
    const [
      allBusinesses,
      activeBusinesses,
      allCategories,
      mainCategories,
      subCategories,
      allJobs,
      activeJobs,
      distinctCountries,
      allUsers,
      allReviews,
      allReservations,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM businesses`),
      db.execute(sql`SELECT COUNT(*) as count FROM businesses WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*) as count FROM business_categories`),
      db.execute(sql`SELECT COUNT(*) as count FROM business_categories WHERE parent_id IS NULL`),
      db.execute(sql`SELECT COUNT(*) as count FROM business_categories WHERE parent_id IS NOT NULL`),
      db.execute(sql`SELECT COUNT(*) as count FROM jobs`),
      db.execute(sql`SELECT COUNT(*) as count FROM jobs WHERE status = 'active'`),
      db.execute(
        sql`SELECT COUNT(DISTINCT country_id) as count FROM businesses WHERE country_id IS NOT NULL AND is_active = true`,
      ),
      db.execute(sql`SELECT COUNT(*) as count FROM users`),
      db.execute(sql`SELECT COUNT(*) as count FROM business_reviews`),
      db.execute(sql`SELECT COUNT(*) as count FROM reservations`),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        businesses: {
          total: parseInt(String((allBusinesses.rows[0] as any)?.count || 0), 10),
          active: parseInt(
            String((activeBusinesses.rows[0] as any)?.count || 0),
            10,
          ),
        },
        categories: {
          total: parseInt(String((allCategories.rows[0] as any)?.count || 0), 10),
          mainCategories: parseInt(
            String((mainCategories.rows[0] as any)?.count || 0),
            10,
          ),
          subCategories: parseInt(
            String((subCategories.rows[0] as any)?.count || 0),
            10,
          ),
        },
        jobs: {
          total: parseInt(String((allJobs.rows[0] as any)?.count || 0), 10),
          active: parseInt(String((activeJobs.rows[0] as any)?.count || 0), 10),
        },
        countries: parseInt(
          String((distinctCountries.rows[0] as any)?.count || 0),
          10,
        ),
        users: parseInt(String((allUsers.rows[0] as any)?.count || 0), 10),
        reviews: parseInt(String((allReviews.rows[0] as any)?.count || 0), 10),
        reservations: parseInt(
          String((allReservations.rows[0] as any)?.count || 0),
          10,
        ),
      },
      notes: {
        businesses_dashboard_shows: "activeBusinesses (is_active = true)",
        categories_dashboard_shows: "allCategories (main + sub)",
        jobs_dashboard_shows: "activeJobs (status = 'active')",
        countries_dashboard_shows: "distinctCountries from active businesses",
      },
    });
  }),
);

router.get("/simple-test", (_req, res) => {
  res.json({
    message: "Server is working!",
    success: true,
    endpoints: [
      "/api/status",
      "/api/simple-test",
      "/api/countries",
      "/api/businesses",
      "/api/business/search",
      "/api/business/categories",
      "/api/business/locations",
      "/api/business/test-connection",
      "/api/commerce/analytics",
      "/api/commerce/ads/search",
      "/api/properties/analytics",
      "/api/properties/search",
    ],
  });
});

export default router;

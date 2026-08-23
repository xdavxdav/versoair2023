import { Router } from "express";
import { db, pool } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import {
  businesses,
  businessCategories,
  artists,
} from "../../../../shared/schema";
import { count, eq } from "drizzle-orm";
import businessesRouter from "./businesses";
import categoriesRouter from "./categories";
import artistsRouter from "./artists";
import campaignsRouter from "./campaigns";
import jobsRouter from "./jobs";
import gtmEventsRouter from "./gtm-events";
import verificationRouter from "./verification";
import securityRouter from "./security";
import usersRouter from "./users";
import rolesRouter from "./roles";

const router = Router();

const ADMIN_ANALYTICS_PERIODS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

router.get("/analytics", requireAuth(["admin"]), async (req, res) => {
  try {
    const days = ADMIN_ANALYTICS_PERIODS[String(req.query.period)] || 7;
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM businesses) AS "totalBusinesses",
         (SELECT COUNT(*)::int FROM content_pages) AS "totalPages",
         (SELECT COUNT(*)::int FROM users) AS "totalUsers",
         (SELECT COUNT(*)::int FROM users WHERE role IN ('admin', 'superuser')) AS "activeAdmins",
         (SELECT COUNT(*)::int FROM businesses WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')) AS "newBusinesses",
         (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')) AS "newUsers"`,
      [days],
    );
    const metrics = result.rows[0];
    res.json({
      success: true,
      data: {
        totalBusinesses: Number(metrics.totalBusinesses || 0),
        totalPages: Number(metrics.totalPages || 0),
        totalUsers: Number(metrics.totalUsers || 0),
        activeAdmins: Number(metrics.activeAdmins || 0),
        businessesTrend: Number(metrics.newBusinesses || 0),
        usersTrend: Number(metrics.newUsers || 0),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch admin analytics:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch analytics" });
  }
});

router.get("/activity-log", requireAuth(["admin"]), async (req, res) => {
  try {
    const days = ADMIN_ANALYTICS_PERIODS[String(req.query.period)] || 7;
    const result = await pool.query(
      `SELECT al.id, al.action, al.entity_type AS entity,
              al.created_at AS timestamp,
              COALESCE(u.display_name, u.username, 'System') AS "user"
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.created_at >= NOW() - ($1::int * INTERVAL '1 day')
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [days],
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("Failed to fetch admin activity log:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch activity log" });
  }
});

// Mount sub-routers
router.use("/businesses", businessesRouter);
router.use("/categories", categoriesRouter);
router.use("/artists", artistsRouter);
router.use("/campaigns", campaignsRouter);
router.use("/jobs", jobsRouter);
router.use("/gtm-events", gtmEventsRouter);
router.use("/verification", verificationRouter);
router.use("/security", securityRouter);
router.use("/users", usersRouter);
router.use("/roles", rolesRouter);

/**
 * GET /api/v1/admin/stats
 * Get dashboard statistics (counts of all entities)
 */
router.get(
  "/stats",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    try {
      const [businessCount, categoryCount, artistCount, activeBusinessCount] =
        await Promise.all([
          db.select({ total: count() }).from(businesses),
          db.select({ total: count() }).from(businessCategories),
          db.select({ total: count() }).from(artists),
          db
            .select({ total: count() })
            .from(businesses)
            .where(eq(businesses.isActive, true)),
        ]);

      res.json({
        success: true,
        status: 200,
        data: {
          businesses: businessCount[0]?.total || 0,
          categories: categoryCount[0]?.total || 0,
          artists: artistCount[0]?.total || 0,
          activeBusinesses: activeBusinessCount[0]?.total || 0,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({
        success: false,
        status: 500,
        error: {
          code: "STATS_ERROR",
          message: "Failed to fetch statistics",
        },
      });
    }
  }),
);

// All admin route modules are mounted above (businesses, categories, artists,
// campaigns, jobs, gtm-events, verification, security, users, roles).

export default router;

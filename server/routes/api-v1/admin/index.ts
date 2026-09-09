import { Router } from "express";
import { db, pool } from "../../../db";
import {
  requireAuth,
  requireJoelSuperadminForMutations,
} from "../../../middleware/auth";
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
import communitiesRouter from "./communities";

const router = Router();
router.use(requireJoelSuperadminForMutations);

const ADMIN_ANALYTICS_PERIODS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

router.get(
  "/control-center/summary",
  requireAuth(["admin", "moderator", "superuser"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM unified_profiles
           WHERE account_type = 'artisan' AND status = 'PENDING') AS "pendingArtisanProfiles",
          (SELECT COUNT(*)::int FROM artisan_community_join_requests
           WHERE status = 'PENDING') AS "pendingJoinRequests",
          (SELECT COUNT(*)::int FROM artisan_communities
           WHERE status <> 'PUBLISHED') AS "unpublishedCommunities",
          (SELECT COUNT(*)::int FROM community_posts
           WHERE is_hidden = TRUE) AS "moderationItems"
      `);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Failed to fetch GeoAdmin control-center summary:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch control-center summary",
      });
    }
  },
);

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

router.get("/pages", requireAuth(["admin", "superuser"]), async (_req, res) => {
  const result = await pool.query(
    `SELECT id, title, slug, content, is_published AS "isPublished", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM content_pages ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
  );
  res.json({ success: true, data: result.rows });
});

router.post("/pages", requireAuth(["admin", "superuser"]), async (req, res) => {
  const { title, slug, content = "", isPublished = false } = req.body || {};
  if (!String(title || "").trim() || !String(slug || "").trim())
    return res
      .status(400)
      .json({
        success: false,
        error: { message: "Title and slug are required" },
      });
  const result = await pool.query(
    `INSERT INTO content_pages (title, slug, content, is_published) VALUES ($1, $2, $3, $4) RETURNING id, title, slug, content, is_published AS "isPublished"`,
    [String(title).trim(), String(slug).trim(), content, Boolean(isPublished)],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

router.put(
  "/pages/:id",
  requireAuth(["admin", "superuser"]),
  async (req, res) => {
    const { title, slug, content = "", isPublished = false } = req.body || {};
    const result = await pool.query(
      `UPDATE content_pages SET title = $1, slug = $2, content = $3, is_published = $4, updated_at = NOW() WHERE id = $5 RETURNING id, title, slug, content, is_published AS "isPublished"`,
      [
        String(title || "").trim(),
        String(slug || "").trim(),
        content,
        Boolean(isPublished),
        Number(req.params.id),
      ],
    );
    if (!result.rowCount)
      return res
        .status(404)
        .json({ success: false, error: { message: "Page not found" } });
    res.json({ success: true, data: result.rows[0] });
  },
);

router.delete(
  "/pages/:id",
  requireAuth(["admin", "superuser"]),
  async (req, res) => {
    const result = await pool.query(
      `DELETE FROM content_pages WHERE id = $1 RETURNING id`,
      [Number(req.params.id)],
    );
    if (!result.rowCount)
      return res
        .status(404)
        .json({ success: false, error: { message: "Page not found" } });
    res.json({ success: true, id: result.rows[0].id });
  },
);

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
router.use("/communities", communitiesRouter);

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

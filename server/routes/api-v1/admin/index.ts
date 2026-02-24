import { Router } from "express";
import { db } from "../../../db";
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

// TODO: Add more admin route modules as they're created
// router.use('/advertising', advertisingRouter);
// router.use('/users', usersRouter);
// router.use('/analytics', analyticsRouter);
// router.use('/system', systemRouter);

export default router;

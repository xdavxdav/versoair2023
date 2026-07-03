import { Router } from "express";
import { requireAuth, optionalAuth } from "../../../middleware/auth";
import { requireTier } from "../../../middleware/tierGate";
import { asyncHandler } from "../../../middleware/asyncHandler";
import * as gtmService from "../../../services/gtm-events";

const router = Router();

/**
 * POST /api/v1/admin/gtm-events
 * Log a GTM event from frontend (works for both authenticated and anonymous users)
 */
router.post(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      eventName,
      eventCategory,
      eventLabel,
      eventValue,
      sessionId,
      pageUrl,
      referrer,
      userAgent,
      country,
      deviceType,
      customData,
    } = req.body;

    if (!eventName || !eventCategory || !sessionId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: eventName, eventCategory, sessionId",
      });
    }

    try {
      const event = gtmService.logEvent({
        eventName,
        eventCategory,
        eventLabel,
        eventValue: eventValue ? parseInt(eventValue) : undefined,
        userId:
          (req.user as any)?.userId?.toString() ||
          (req.user as any)?.sub?.toString(),
        sessionId,
        pageUrl,
        referrer,
        userAgent,
        country,
        deviceType,
        customData,
      });

      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      console.error("Error logging GTM event:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to log event",
      });
    }
  }),
);

/**
 * GET /api/v1/admin/gtm-events/stats
 * Get GTM event statistics
 */
router.get(
  "/stats",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const hoursBack = parseInt(req.query.hoursBack as string) || 24;

    try {
      const stats = gtmService.getEventStats(hoursBack);
      const timeline = gtmService.getEventTimeline(hoursBack);

      res.json({
        success: true,
        data: {
          ...stats,
          timeline,
          period: {
            hoursBack,
            from: new Date(Date.now() - hoursBack * 60 * 60 * 1000),
            to: new Date(),
          },
        },
      });
    } catch (error: any) {
      console.error("Error fetching GTM stats:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch statistics",
      });
    }
  }),
);

/**
 * GET /api/v1/admin/gtm-events/list
 * Get list of recent events
 */
router.get(
  "/list",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const hoursBack = parseInt(req.query.hoursBack as string) || 24;
    const category = req.query.category as string | undefined;

    try {
      const events = gtmService.getEvents({
        limit,
        offset,
        hoursBack,
        category,
      });

      res.json({
        success: true,
        data: events,
        pagination: {
          limit,
          offset,
          count: events.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching GTM events:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch events",
      });
    }
  }),
);

/**
 * GET /api/v1/admin/gtm-events/timeline
 * Get event timeline aggregated by hour
 */
router.get(
  "/timeline",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const hoursBack = parseInt(req.query.hoursBack as string) || 24;

    try {
      const timeline = gtmService.getEventTimeline(hoursBack);

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error: any) {
      console.error("Error fetching timeline:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch timeline",
      });
    }
  }),
);

export default router;

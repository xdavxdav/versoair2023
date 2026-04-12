/**
 * Geo-Action Queue — tiered access control for geo-admin operations
 *
 * TSR users → full CRUD, immediate execution (no delays)
 * High-tier subscribers (max/enterprise) → read-only + request queue with delays:
 *   - view actions: instant
 *   - edit requests: 24h delay (auto-approve after delay)
 *   - delete requests: 72h delay + admin approval required
 *
 * Endpoints:
 *   POST   /api/geo-actions/request          — subscriber submits an action request
 *   GET    /api/geo-actions/my-requests       — subscriber views their pending requests
 *   GET    /api/geo-actions/pending           — admin/TSR reviews pending requests
 *   POST   /api/geo-actions/:id/approve       — admin/TSR approves a request
 *   POST   /api/geo-actions/:id/reject        — admin/TSR rejects a request
 *   GET    /api/geo-actions/access-level      — returns caller's geo-admin access tier
 */

import { Router, Request, Response } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// ─── Helper: determine geo-admin access level for a user ───────────────────

type GeoAccessLevel = "full" | "read-only" | "none";

interface GeoAccess {
  level: GeoAccessLevel;
  role: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  requiresQueue: boolean;
  editDelayHours: number;
  deleteDelayHours: number;
}

async function getGeoAccessLevel(userId: number): Promise<GeoAccess> {
  const result = await db.execute(
    sql`SELECT role, subscription_tier, subscription_status FROM users WHERE id = ${userId} LIMIT 1`,
  );
  const user = result.rows?.[0] as any;
  if (!user) {
    return {
      level: "none",
      role: "unknown",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      requiresQueue: true,
      editDelayHours: 24,
      deleteDelayHours: 72,
    };
  }

  const staffRoles = ["admin", "moderator", "superuser", "tsr"];
  if (staffRoles.includes(user.role)) {
    return {
      level: "full",
      role: user.role,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      requiresQueue: false,
      editDelayHours: 0,
      deleteDelayHours: 0,
    };
  }

  const paidTiers = ["max", "enterprise"];
  const isActive = ["active", "trialing"].includes(
    user.subscription_status || "active",
  );
  if (paidTiers.includes(user.subscription_tier || "") && isActive) {
    return {
      level: "read-only",
      role: user.role || "user",
      canCreate: false,
      canEdit: false, // through queue only
      canDelete: false, // through queue only
      requiresQueue: true,
      editDelayHours: 24,
      deleteDelayHours: 72,
    };
  }

  return {
    level: "none",
    role: user.role || "user",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    requiresQueue: true,
    editDelayHours: 24,
    deleteDelayHours: 72,
  };
}

/**
 * GET /api/geo-actions/access-level
 * Returns the caller's geo-admin access tier info
 */
router.get(
  "/access-level",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const access = await getGeoAccessLevel(userId);
    res.json({ success: true, access });
  }),
);

/**
 * POST /api/geo-actions/request
 * Subscriber submits a geo-admin action request (edit/delete) to the queue.
 * TSR/admin/mod requests are auto-approved immediately.
 */
router.post(
  "/request",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const access = await getGeoAccessLevel(userId);

    if (access.level === "none") {
      res.status(403).json({
        success: false,
        message:
          "You do not have geo-admin access. Upgrade to Max or Enterprise tier.",
      });
      return;
    }

    const { actionType, entityType, entityId, requestedChange } = req.body;

    if (!actionType || !entityType || !entityId) {
      res.status(400).json({
        success: false,
        message: "actionType, entityType, and entityId are required",
      });
      return;
    }

    const validActions = ["create", "edit", "delete"];
    if (!validActions.includes(actionType)) {
      res.status(400).json({
        success: false,
        message: `actionType must be one of: ${validActions.join(", ")}`,
      });
      return;
    }

    // TSR/admin/mod — auto-approve immediately
    if (!access.requiresQueue) {
      const [inserted] = await db
        .insert(schema.geoActionRequests)
        .values({
          requestedBy: userId,
          actionType,
          entityType,
          entityId: String(entityId),
          requestedChange: requestedChange || null,
          delayHours: 0,
          status: "approved",
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: "Auto-approved (staff)",
          expiresAt: null,
        })
        .returning();

      res.json({
        success: true,
        message: "Action approved immediately (staff access)",
        request: inserted,
        autoApproved: true,
      });
      return;
    }

    // Subscriber queue — apply delays
    const delayHours =
      actionType === "delete"
        ? access.deleteDelayHours
        : actionType === "edit"
          ? access.editDelayHours
          : 0;

    const expiresAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

    const [inserted] = await db
      .insert(schema.geoActionRequests)
      .values({
        requestedBy: userId,
        actionType,
        entityType,
        entityId: String(entityId),
        requestedChange: requestedChange || null,
        delayHours,
        status: "pending",
        expiresAt,
      })
      .returning();

    res.json({
      success: true,
      message: `Request queued. ${
        actionType === "delete"
          ? "Delete requests require admin approval (72h window)."
          : `Edit will be auto-approved after ${delayHours}h delay.`
      }`,
      request: inserted,
      autoApproved: false,
      delayHours,
      expiresAt,
    });
  }),
);

/**
 * GET /api/geo-actions/my-requests
 * Subscriber views their own pending/processed requests
 */
router.get(
  "/my-requests",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    const requests = await db.execute(
      sql`SELECT gar.*, u.username AS reviewer_name
          FROM geo_action_requests gar
          LEFT JOIN users u ON u.id = gar.reviewed_by
          WHERE gar.requested_by = ${userId}
          ORDER BY gar.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`,
    );

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM geo_action_requests WHERE requested_by = ${userId}`,
    );

    res.json({
      success: true,
      requests: requests.rows,
      total: (countResult.rows[0] as any)?.total || 0,
      page,
      limit,
    });
  }),
);

/**
 * GET /api/geo-actions/pending
 * Admin/TSR views all pending requests awaiting review
 */
router.get(
  "/pending",
  requireAuth(["admin", "superuser", "moderator", "tsr"]),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || "pending";

    const requests = await db.execute(
      sql`SELECT gar.*, u.username AS requester_name, u.email AS requester_email,
                 u.subscription_tier AS requester_tier
          FROM geo_action_requests gar
          JOIN users u ON u.id = gar.requested_by
          WHERE gar.status = ${status}
          ORDER BY gar.created_at ASC
          LIMIT ${limit} OFFSET ${offset}`,
    );

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM geo_action_requests WHERE status = ${status}`,
    );

    res.json({
      success: true,
      requests: requests.rows,
      total: (countResult.rows[0] as any)?.total || 0,
      page,
      limit,
    });
  }),
);

/**
 * POST /api/geo-actions/:id/approve
 * Admin/TSR approves a pending request
 */
router.post(
  "/:id/approve",
  requireAuth(["admin", "superuser", "moderator", "tsr"]),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id);
    const reviewerId = (req as any).user.userId;
    const { reviewNotes } = req.body;

    const [existing] = await db
      .select()
      .from(schema.geoActionRequests)
      .where(eq(schema.geoActionRequests.id, requestId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    if (existing.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Request already ${existing.status}`,
      });
      return;
    }

    await db
      .update(schema.geoActionRequests)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || "Approved",
      })
      .where(eq(schema.geoActionRequests.id, requestId));

    console.log(
      `[GEO-ACTION] Request #${requestId} approved by user ${reviewerId}`,
    );

    res.json({
      success: true,
      message: "Request approved",
      requestId,
    });
  }),
);

/**
 * POST /api/geo-actions/:id/reject
 * Admin/TSR rejects a pending request
 */
router.post(
  "/:id/reject",
  requireAuth(["admin", "superuser", "moderator", "tsr"]),
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id);
    const reviewerId = (req as any).user.userId;
    const { reviewNotes } = req.body;

    const [existing] = await db
      .select()
      .from(schema.geoActionRequests)
      .where(eq(schema.geoActionRequests.id, requestId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    if (existing.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Request already ${existing.status}`,
      });
      return;
    }

    await db
      .update(schema.geoActionRequests)
      .set({
        status: "rejected",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || "Rejected",
      })
      .where(eq(schema.geoActionRequests.id, requestId));

    console.log(
      `[GEO-ACTION] Request #${requestId} rejected by user ${reviewerId}`,
    );

    res.json({
      success: true,
      message: "Request rejected",
      requestId,
    });
  }),
);

export default router;

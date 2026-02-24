import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { businesses, auditLogs } from "../../../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

type VerificationStatus = "unverified" | "verified" | "rejected";

/**
 * GET /api/v1/admin/verification/queue
 * Get all businesses pending verification (unverified or rejected)
 */
router.get(
  "/queue",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    // Get unverified and rejected businesses
    const [items, totalResult] = await Promise.all([
      db.execute(`
        SELECT 
          b.id,
          b.name,
          b.owner_id,
          b.category_id,
          (SELECT name FROM business_categories WHERE id = b.category_id) as category_name,
          b.verification_status,
          b.verification_reason,
          b.created_at,
          b.verification_date,
          b.verified_by,
          (SELECT username FROM users WHERE id = b.verified_by) as verified_by_username,
          b.is_active,
          b.rating,
          b.phone,
          b.email,
          b.address
        FROM businesses b
        WHERE b.verification_status IN ('unverified', 'rejected')
        ORDER BY 
          CASE WHEN b.verification_status = 'unverified' THEN 1 ELSE 2 END,
          b.created_at ASC
        LIMIT $1 OFFSET $2
      `),
      db.execute(`
        SELECT COUNT(*) as count
        FROM businesses
        WHERE verification_status IN ('unverified', 'rejected')
      `),
    ]);

    const total = totalResult.rows[0]?.count || 0;

    res.json({
      data: items.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }),
);

/**
 * PATCH /api/v1/admin/businesses/:id/verify
 * Approve or reject a business for verification
 *
 * Request body:
 * {
 *   action: 'approve' | 'reject',
 *   reason?: string (required for rejection, optional for approval)
 * }
 */
router.patch(
  "/businesses/:id/verify",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, reason } = req.body;
    const adminId = (req.user as any)?.id;

    // Validate input
    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action. Use 'approve' or 'reject'" });
    }

    if (action === "reject" && !reason) {
      return res
        .status(400)
        .json({
          error: "Rejection reason is required when rejecting a business",
        });
    }

    // Get current business
    const businessResult = await db.execute(
      "SELECT * FROM businesses WHERE id = $1",
      [id],
    );
    const business = businessResult.rows[0];

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Update verification status
    const newStatus: VerificationStatus =
      action === "approve" ? "verified" : "rejected";
    const updateResult = await db.execute(
      `
        UPDATE businesses 
        SET 
          verification_status = $1,
          verification_date = NOW(),
          verified_by = $2,
          verification_reason = $3
        WHERE id = $4
        RETURNING *
      `,
      [newStatus, adminId, reason || null, id],
    );

    const updatedBusiness = updateResult.rows[0];

    // Log to audit trail
    await db.execute(
      `
        INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [
        adminId,
        action === "approve" ? "VERIFY_APPROVE" : "VERIFY_REJECT",
        "business",
        id,
        JSON.stringify({
          businessName: business.name,
          previousStatus: business.verification_status,
          newStatus,
          reason,
        }),
      ],
    );

    res.json({
      success: true,
      message: `Business ${action === "approve" ? "approved" : "rejected"} successfully`,
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        verificationStatus: updatedBusiness.verification_status,
        verificationReason: updatedBusiness.verification_reason,
        verificationDate: updatedBusiness.verification_date,
        verifiedBy: updatedBusiness.verified_by,
        isActive: updatedBusiness.is_active,
      },
    });
  }),
);

/**
 * PATCH /api/v1/admin/businesses/:id/activate
 * Activate a verified business (with validation)
 *
 * Request body:
 * {
 *   is_active: boolean
 * }
 *
 * Constraint: Can only activate if verification_status = 'verified'
 */
router.patch(
  "/businesses/:id/activate",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    // Get current business
    const businessResult = await db.execute(
      "SELECT * FROM businesses WHERE id = $1",
      [id],
    );
    const business = businessResult.rows[0];

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Validate: Can only activate if verified
    if (is_active === true && business.verification_status !== "verified") {
      return res.status(403).json({
        error: "Cannot activate unverified business",
        details: `Business must be verified first (current status: ${business.verification_status})`,
      });
    }

    // Update is_active
    const updateResult = await db.execute(
      `UPDATE businesses SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id],
    );

    const updatedBusiness = updateResult.rows[0];

    // Log to audit trail
    const adminId = (req.user as any)?.id;
    await db.execute(
      `
        INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [
        adminId,
        is_active ? "BUSINESS_ACTIVATE" : "BUSINESS_DEACTIVATE",
        "business",
        id,
        JSON.stringify({
          businessName: business.name,
          verificationStatus: business.verification_status,
          previousActive: business.is_active,
          newActive: is_active,
        }),
      ],
    );

    res.json({
      success: true,
      message: `Business ${is_active ? "activated" : "deactivated"} successfully`,
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        isActive: updatedBusiness.is_active,
        verificationStatus: updatedBusiness.verification_status,
      },
    });
  }),
);

/**
 * GET /api/v1/admin/verification/stats
 * Get verification workflow statistics
 */
router.get(
  "/stats",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const result = await db.execute(`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'unverified') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as approved,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) as total
      FROM businesses
    `);

    const stats = result.rows[0];

    res.json({
      pending: parseInt(stats.pending) || 0,
      approved: parseInt(stats.approved) || 0,
      rejected: parseInt(stats.rejected) || 0,
      total: parseInt(stats.total) || 0,
    });
  }),
);

/**
 * GET /api/v1/admin/verification/audit/:id
 * Get verification audit history for a specific business
 */
router.get(
  "/audit/:id",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get all audit logs related to this business
    const result = await db.execute(
      `
        SELECT 
          al.id,
          al.admin_id,
          u.username as admin_username,
          al.action,
          al.details,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        WHERE al.target_type = 'business' AND al.target_id = $1
          AND al.action IN ('VERIFY_APPROVE', 'VERIFY_REJECT', 'BUSINESS_ACTIVATE', 'BUSINESS_DEACTIVATE')
        ORDER BY al.created_at DESC
      `,
      [id],
    );

    res.json({
      businessId: id,
      auditTrail: result.rows,
    });
  }),
);

export default router;

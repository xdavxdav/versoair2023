import { Router } from "express";
import { pool } from "../../../db";
import { requireAuth, requireOwner } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import {
  approveBusiness,
  cleanNote,
  rejectBusinessVerification,
} from "../../../services/business-verification";

const router = Router();
// Account, role, security and identity-verification management is owner-only.
router.use(requireOwner);

/**
 * GET /api/v1/admin/verification/queue
 * Businesses that are not verified-and-public yet, with their true flags
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
      pool.query(
        `
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
          b.is_verified,
          b.approval_status,
          b.rating,
          b.phone,
          b.email,
          b.address
        FROM businesses b
        WHERE b.verification_status IN ('unverified', 'rejected') OR b.is_verified IS NOT TRUE
        ORDER BY 
          CASE WHEN b.verification_status = 'unverified' THEN 1 ELSE 2 END,
          b.created_at ASC
        LIMIT $1 OFFSET $2
      `,
        [limitNum, offset],
      ),
      pool.query(`
        SELECT COUNT(*) as count
        FROM businesses
        WHERE verification_status IN ('unverified', 'rejected') OR is_verified IS NOT TRUE
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
 * PATCH /api/v1/admin/verification/businesses/:id/verify
 * The one canonical publish path. Works on any row.
 *
 * Request body:
 * {
 *   action: 'approve' | 'reject',
 *   reason: string (approve: the record that was checked; reject: why)
 * }
 *
 * approve -> verification_status 'verified', is_verified, is_active
 * reject  -> verification_status 'rejected', is_verified = false
 */
router.patch(
  "/businesses/:id/verify",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { action } = req.body ?? {};
    const note = cleanNote(req.body?.reason);

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action. Use 'approve' or 'reject'" });
    }
    if (!note) {
      return res.status(400).json({
        error:
          action === "approve"
            ? "An evidence note (what record was checked) is required to approve a business"
            : "Rejection reason is required when rejecting a business",
      });
    }

    const decide =
      action === "approve" ? approveBusiness : rejectBusinessVerification;
    const result = await decide({
      id: req.params.id,
      actorId: Number((req.user as any)?.id),
      note,
      ipAddress: String(req.headers["x-forwarded-for"] || req.ip || ""),
    });
    if (!result) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updated = result.business;
    res.json({
      success: true,
      message: `Business ${action === "approve" ? "approved" : "rejected"} successfully`,
      business: {
        id: updated.id,
        name: updated.name,
        verificationStatus: updated.verification_status,
        verificationReason: updated.verification_reason,
        verificationDate: updated.verification_date,
        verifiedBy: updated.verified_by,
        isActive: updated.is_active,
        isVerified: updated.is_verified,
      },
    });
  }),
);

/**
 * PATCH /api/v1/admin/verification/businesses/:id/activate
 * Activate a verified business (with validation)
 *
 * Request body:
 * {
 *   is_active: boolean
 * }
 *
 * Constraint: activating requires verification_status = 'verified' AND is_verified.
 * This is the visibility switch only; it never publishes an unverified row.
 */
router.patch(
  "/businesses/:id/activate",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body ?? {};
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active must be true or false" });
    }

    // Get current business
    const businessResult = await pool.query(
      "SELECT * FROM businesses WHERE id = $1",
      [id],
    );
    const business = businessResult.rows[0];

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Validate: Can only activate if verified
    if (
      is_active === true &&
      (business.verification_status !== "verified" ||
        business.is_verified !== true)
    ) {
      return res.status(403).json({
        error: "Cannot activate unverified business",
        details: `Business must be verified first (current status: ${business.verification_status}, verified flag: ${business.is_verified === true})`,
      });
    }

    // Update is_active
    const updateResult = await pool.query(
      `UPDATE businesses SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id],
    );

    const updatedBusiness = updateResult.rows[0];

    // Log to audit trail
    const adminId = (req.user as any)?.id;
    await pool.query(
      `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        adminId,
        is_active ? "BUSINESS_ACTIVATE" : "BUSINESS_DEACTIVATE",
        "business",
        String(id),
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
        isVerified: updatedBusiness.is_verified,
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
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'unverified') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as approved,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) as total
      FROM businesses
    `);

    const stats = result.rows[0];

    res.json({
      pending: parseInt(String(stats.pending)) || 0,
      approved: parseInt(String(stats.approved)) || 0,
      rejected: parseInt(String(stats.rejected)) || 0,
      total: parseInt(String(stats.total)) || 0,
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
    const result = await pool.query(
      `
        SELECT 
          al.id,
          al.user_id as admin_id,
          u.username as admin_username,
          al.action,
          al.changes as details,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_type = 'business' AND al.entity_id = $1
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

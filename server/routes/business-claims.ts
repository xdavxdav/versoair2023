import { Request, Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessClaimLimiter } from "../middleware/rate-limiter";
import { getBusinessClaimEvidence } from "../utils/business-claim";
import { isUniqueConstraintViolation } from "../utils/postgres-errors";
import { publicBusinessVisibilitySql } from "../utils/business-visibility";

const router = Router();

const claimSchema = z
  .object({
    message: z.string().trim().max(2000).optional(),
    claimantRole: z.string().trim().min(2).max(100),
    workEmail: z.string().trim().email().max(254).optional(),
    workPhone: z.string().trim().min(7).max(30).optional(),
  })
  .refine((value) => Boolean(value.workEmail || value.workPhone), {
    message: "Provide a work email or phone number",
  });

function positiveId(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function requestAuditContext(req: Request) {
  return {
    ipAddress: (req.ip || "").slice(0, 45) || null,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500) || null,
  };
}

router.get(
  "/claims/mine",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const userId = positiveId(req.user?.id || "");
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const [userResult, claimsResult] = await Promise.all([
      pool.query(
        `SELECT account_type, business_name, is_verified
         FROM users WHERE id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT bc.id, bc.business_id, bc.status, bc.message,
                bc.claimant_role, bc.work_email, bc.work_phone,
                bc.evidence, bc.review_note, bc.created_at, bc.updated_at,
                b.name AS business_name
         FROM business_claims bc
         JOIN businesses b ON b.id = bc.business_id
         WHERE bc.user_id = $1
         ORDER BY bc.created_at DESC`,
        [userId],
      ),
    ]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ success: false, error: "Account not found" });
    }

    res.json({
      success: true,
      accountType: userResult.rows[0].account_type || "general",
      businessName: userResult.rows[0].business_name || null,
      emailVerified: userResult.rows[0].is_verified === true,
      data: claimsResult.rows,
    });
  }),
);

router.post(
  "/:businessId/claim",
  requireAuth(),
  businessClaimLimiter,
  asyncHandler(async (req, res) => {
    const businessId = positiveId(req.params.businessId);
    const userId = positiveId(req.user?.id || "");
    if (!businessId) {
      return res.status(400).json({ success: false, error: "Invalid business id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid claim details",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        `SELECT id, account_type, is_verified
         FROM users WHERE id = $1`,
        [userId],
      );
      const user = userResult.rows[0];
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Account not found" });
      }
      if (user.account_type !== "business_owner") {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          code: "BUSINESS_OWNER_ACCOUNT_REQUIRED",
          error: "Switch to a Business Owner account before claiming a listing.",
        });
      }
      if (user.is_verified !== true) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          code: "EMAIL_VERIFICATION_REQUIRED",
          error: "Verify your email before submitting a business claim.",
        });
      }

      const businessResult = await client.query(
        `SELECT b.id, b.name, b.owner_id, b.email, b.phone, b.website
         FROM businesses b
         WHERE b.id = $1 AND ${publicBusinessVisibilitySql("b")}
         FOR UPDATE OF b`,
        [businessId],
      );
      const business = businessResult.rows[0];
      if (!business) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: "Business not found or not available to claim",
        });
      }
      if (business.owner_id !== null) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          code: "BUSINESS_ALREADY_CLAIMED",
          error: "This business already has an owner.",
        });
      }

      const evidence = getBusinessClaimEvidence(business, {
        workEmail: parsed.data.workEmail,
        workPhone: parsed.data.workPhone,
      });
      let inserted;
      try {
        inserted = await client.query(
          `INSERT INTO business_claims
            (business_id, user_id, message, claimant_role, work_email, work_phone, evidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
           RETURNING id, business_id, status, created_at`,
          [
            businessId,
            userId,
            parsed.data.message || null,
            parsed.data.claimantRole,
            parsed.data.workEmail?.toLowerCase() || null,
            parsed.data.workPhone || null,
            JSON.stringify(evidence),
          ],
        );
      } catch (error) {
        if (
          isUniqueConstraintViolation(error, [
            "business_claims_pending_business_user_unique",
          ])
        ) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            success: false,
            code: "PENDING_CLAIM_EXISTS",
            error: "You already have a pending claim for this business.",
          });
        }
        throw error;
      }

      const claim = inserted.rows[0];
      const audit = requestAuditContext(req);
      await client.query(
        `INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
         VALUES ($1, 'BUSINESS_CLAIM_SUBMITTED', 'business_claim', $2, $3::jsonb, $4, $5)`,
        [
          userId,
          String(claim.id),
          JSON.stringify({
            businessId,
            evidence,
            claimantRole: parsed.data.claimantRole,
          }),
          audit.ipAddress,
          audit.userAgent,
        ],
      );
      await client.query("COMMIT");
      return res.status(201).json({
        success: true,
        data: {
          id: claim.id,
          businessId: claim.business_id,
          status: claim.status,
          createdAt: claim.created_at,
        },
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original transaction error.
      }
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.delete(
  "/claims/:claimId",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const claimId = positiveId(req.params.claimId);
    const userId = positiveId(req.user?.id || "");
    if (!claimId) {
      return res.status(400).json({ success: false, error: "Invalid claim id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const claimResult = await client.query(
        `SELECT id, business_id, status
         FROM business_claims
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [claimId, userId],
      );
      const claim = claimResult.rows[0];
      if (!claim) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Claim not found" });
      }
      if (claim.status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "Only pending claims can be withdrawn.",
        });
      }

      await client.query(
        `UPDATE business_claims
         SET status = 'withdrawn', updated_at = NOW()
         WHERE id = $1`,
        [claimId],
      );
      const audit = requestAuditContext(req);
      await client.query(
        `INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
         VALUES ($1, 'BUSINESS_CLAIM_WITHDRAWN', 'business_claim', $2, $3::jsonb, $4, $5)`,
        [
          userId,
          String(claimId),
          JSON.stringify({ businessId: claim.business_id, status: "withdrawn" }),
          audit.ipAddress,
          audit.userAgent,
        ],
      );
      await client.query("COMMIT");
      return res.json({ success: true, status: "withdrawn" });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original transaction error.
      }
      throw error;
    } finally {
      client.release();
    }
  }),
);

export default router;

import { Request, Router } from "express";
import { z } from "zod";
import { pool } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { sendEmail } from "../../../services/email-service";
import { escapeEmailHtml } from "../../../utils/business-claim";

const router = Router();
router.use(requireAuth(["admin", "superuser"]));

const reviewSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reviewNote: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) => value.action !== "reject" || Boolean(value.reviewNote?.trim()),
    { message: "A reason is required when rejecting a claim." },
  );

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
  "/",
  asyncHandler(async (req, res) => {
    const status = String(req.query.status || "pending");
    if (!["pending", "approved", "rejected", "withdrawn", "all"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status filter" });
    }
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "25"), 10) || 25),
    );
    const offset = (page - 1) * limit;
    const statusClause = status === "all" ? "" : "WHERE bc.status = $1";
    const statusParams = status === "all" ? [] : [status];
    const paginationIndex = statusParams.length + 1;

    const [claims, total] = await Promise.all([
      pool.query(
        `SELECT bc.id, bc.business_id, bc.user_id, bc.status, bc.message,
                bc.claimant_role, bc.work_email, bc.work_phone, bc.evidence,
                bc.reviewed_at, bc.review_note, bc.created_at,
                b.name AS business_name, b.category_id, b.email AS listed_email,
                b.phone AS listed_phone, b.website AS listed_website,
                u.email AS claimant_account_email, u.business_name AS claimant_business_name
         FROM business_claims bc
         JOIN businesses b ON b.id = bc.business_id
         JOIN users u ON u.id = bc.user_id
         ${statusClause}
         ORDER BY
           CASE WHEN bc.evidence->>'emailMatchesListed' = 'true'
                     OR bc.evidence->>'emailDomainMatchesWebsite' = 'true'
                     OR bc.evidence->>'phoneMatchesListed' = 'true'
                THEN 0 ELSE 1 END,
           bc.created_at ASC
         LIMIT $${paginationIndex} OFFSET $${paginationIndex + 1}`,
        [...statusParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM business_claims bc
         ${statusClause}`,
        statusParams,
      ),
    ]);

    res.json({
      success: true,
      data: claims.rows,
      pagination: {
        page,
        limit,
        total: total.rows[0]?.total || 0,
      },
    });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const claimId = positiveId(req.params.id);
    const adminId = positiveId(req.user?.id || "");
    if (!claimId) {
      return res.status(400).json({ success: false, error: "Invalid claim id" });
    }
    if (!adminId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid review",
      });
    }

    const client = await pool.connect();
    let response: {
      claim: Record<string, unknown>;
      businessName: string;
      claimantEmail: string;
      affected: Array<{ id: number; user_id: number }>;
    } | null = null;
    try {
      await client.query("BEGIN");
      const initial = await client.query(
        `SELECT business_id FROM business_claims WHERE id = $1`,
        [claimId],
      );
      if (!initial.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Claim not found" });
      }

      const businessResult = await client.query(
        `SELECT id, name, owner_id FROM businesses WHERE id = $1 FOR UPDATE`,
        [initial.rows[0].business_id],
      );
      const business = businessResult.rows[0];
      if (!business) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Business not found" });
      }

      const claimResult = await client.query(
        `SELECT bc.id, bc.business_id, bc.user_id, bc.status,
                u.email AS claimant_email
         FROM business_claims bc
         JOIN users u ON u.id = bc.user_id
         WHERE bc.id = $1
         FOR UPDATE OF bc`,
        [claimId],
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
          error: "This claim has already been reviewed.",
        });
      }

      const { action, reviewNote } = parsed.data;
      if (action === "approve" && business.owner_id !== null) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "This business already has an owner; the claim cannot be approved.",
        });
      }

      if (action === "approve") {
        const ownerUpdate = await client.query(
          `UPDATE businesses SET owner_id = $1, updated_at = NOW()
           WHERE id = $2 AND owner_id IS NULL
           RETURNING id`,
          [claim.user_id, claim.business_id],
        );
        if (ownerUpdate.rowCount !== 1) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            success: false,
            error: "The business was claimed by another process.",
          });
        }
        await client.query(
          `UPDATE users SET role = 'business_owner'
           WHERE id = $1 AND role = 'user'`,
          [claim.user_id],
        );
      }

      const reviewed = await client.query(
        `UPDATE business_claims
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
             review_note = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, business_id, user_id, status, reviewed_at, review_note`,
        [
          action === "approve" ? "approved" : "rejected",
          adminId,
          reviewNote?.trim() || null,
          claimId,
        ],
      );

      const affected: Array<{ id: number; user_id: number }> = [
        { id: claimId, user_id: claim.user_id },
      ];
      if (action === "approve") {
        const rejected = await client.query(
          `UPDATE business_claims
           SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
               review_note = 'Business claim approved for another claimant',
               updated_at = NOW()
           WHERE business_id = $2 AND status = 'pending' AND id <> $3
           RETURNING id, user_id`,
          [adminId, claim.business_id, claimId],
        );
        affected.push(...rejected.rows);
      }

      const status = action === "approve" ? "approved" : "rejected";
      const notificationTitle =
        action === "approve" ? "Business claim approved" : "Business claim update";
      const notificationMessage =
        action === "approve"
          ? `${business.name} is now linked to your account.`
          : action === "reject"
            ? `Your claim for ${business.name} was not approved.${reviewNote ? ` ${reviewNote}` : ""}`
            : "";
      for (const item of affected) {
        const isMainClaim = item.id === claimId;
        const message = isMainClaim
          ? notificationMessage
          : `Another claim for ${business.name} was approved.`;
        await client.query(
          `INSERT INTO notifications
            (user_id, type, title, message)
           VALUES ($1, 'business_claim_status', $2, $3)`,
          [item.user_id, isMainClaim ? notificationTitle : "Business claim update", message],
        );
      }

      const audit = requestAuditContext(req);
      await client.query(
        `INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
         VALUES ($1, $2, 'business_claim', $3, $4::jsonb, $5, $6)`,
        [
          adminId,
          action === "approve" ? "BUSINESS_CLAIM_APPROVED" : "BUSINESS_CLAIM_REJECTED",
          String(claimId),
          JSON.stringify({
            businessId: claim.business_id,
            claimantUserId: claim.user_id,
            status,
            reviewNote: reviewNote?.trim() || null,
            otherPendingClaimsRejected: affected.length - 1,
          }),
          audit.ipAddress,
          audit.userAgent,
        ],
      );

      await client.query("COMMIT");
      response = {
        claim: reviewed.rows[0],
        businessName: business.name,
        claimantEmail: claim.claimant_email,
        affected,
      };
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

    if (!response) {
      throw new Error("Claim review completed without a result");
    }

    let emailSent = false;
    try {
      const actionLabel = parsed.data.action === "approve" ? "approved" : "not approved";
      const note = parsed.data.reviewNote?.trim()
        ? `<p>${escapeEmailHtml(parsed.data.reviewNote.trim())}</p>`
        : "";
      emailSent = await sendEmail(
        response.claimantEmail,
        `Update on your claim for ${response.businessName}`,
        `<p>Your claim for <strong>${escapeEmailHtml(response.businessName)}</strong> was ${actionLabel}.</p>${note}<p>Sign in to Verso Air to view your claim status.</p>`,
      );
    } catch (error) {
      console.error("[BUSINESS_CLAIMS] Decision email failed:", error);
    }

    res.json({
      success: true,
      data: response.claim,
      notificationsSent: response.affected.length,
      emailSent,
    });
  }),
);

export default router;

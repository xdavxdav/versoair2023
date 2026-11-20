import { Request, Router } from "express";
import type { PoolClient } from "pg";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { businessOwnerLimiter } from "../middleware/rate-limiter";

const router = Router();

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
});

function positiveId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function actorId(req: Request): number | null {
  return positiveId(req.user?.userId ?? req.user?.id);
}

function requestAuditContext(req: Request) {
  return {
    ipAddress: (req.ip || "").slice(0, 45) || null,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500) || null,
  };
}

async function writeAudit(
  client: PoolClient,
  req: Request,
  userId: number,
  action: string,
  businessId: number,
  changes: Record<string, unknown>,
) {
  const audit = requestAuditContext(req);
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
     VALUES ($1, $2, 'business_owner', $3, $4::jsonb, $5, $6)`,
    [
      userId,
      action,
      String(businessId),
      JSON.stringify(changes),
      audit.ipAddress,
      audit.userAgent,
    ],
  );
}

router.get(
  "/:businessId/owners",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const businessId = positiveId(req.params.businessId);
    const userId = actorId(req);
    if (!businessId) {
      return res.status(400).json({ success: false, error: "Invalid business id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { rows } = await pool.query(
      `SELECT b.owner_id,
              EXISTS (
                SELECT 1 FROM business_owners mine
                 WHERE mine.business_id = b.id AND mine.user_id = $2
                   AND mine.status = 'active'
              ) AS is_owner
         FROM businesses b WHERE b.id = $1`,
      [businessId, userId],
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, error: "Business not found" });
    }
    if (Number(rows[0].owner_id) !== userId && !rows[0].is_owner) {
      return res.status(403).json({ success: false, error: "Business owner access required" });
    }

    const owners = await pool.query(
      `SELECT bo.user_id, u.email, u.display_name, bo.status,
              bo.invited_at, bo.accepted_at
         FROM business_owners bo
         JOIN users u ON u.id = bo.user_id
        WHERE bo.business_id = $1
        ORDER BY CASE bo.status WHEN 'active' THEN 0 ELSE 1 END,
                 bo.accepted_at ASC NULLS LAST, bo.invited_at ASC`,
      [businessId],
    );
    res.json({ success: true, data: owners.rows });
  }),
);

router.post(
  "/:businessId/owners/invitations",
  requireAuth(),
  businessOwnerLimiter,
  asyncHandler(async (req, res) => {
    const businessId = positiveId(req.params.businessId);
    const userId = actorId(req);
    if (!businessId) {
      return res.status(400).json({ success: false, error: "Invalid business id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Valid email is required",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const businessResult = await client.query(
        `SELECT b.id, b.name, b.owner_id,
                EXISTS (
                  SELECT 1 FROM business_owners bo
                   WHERE bo.business_id = b.id AND bo.user_id = $2
                     AND bo.status = 'active'
                ) AS is_owner
           FROM businesses b WHERE b.id = $1 FOR UPDATE OF b`,
        [businessId, userId],
      );
      const business = businessResult.rows[0];
      if (!business) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Business not found" });
      }
      if (Number(business.owner_id) !== userId && !business.is_owner) {
        await client.query("ROLLBACK");
        return res.status(403).json({ success: false, error: "Business owner access required" });
      }

      const inviteeResult = await client.query(
        `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`,
        [parsed.data.email],
      );
      const invitee = inviteeResult.rows[0];
      if (!invitee) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          code: "INVITEE_ACCOUNT_REQUIRED",
          error: "The invited person must create an account before being added.",
        });
      }
      if (Number(invitee.id) === userId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "You already own this business" });
      }

      const membership = await client.query(
        `INSERT INTO business_owners
           (business_id, user_id, status, invited_by, invited_at, accepted_at, updated_at)
         VALUES ($1, $2, 'invited', $3, NOW(), NULL, NOW())
         ON CONFLICT (business_id, user_id) DO UPDATE
           SET status = 'invited', invited_by = EXCLUDED.invited_by,
               invited_at = NOW(), accepted_at = NULL, updated_at = NOW()
           WHERE business_owners.status = 'invited'
         RETURNING id`,
        [businessId, invitee.id, userId],
      );
      if (membership.rowCount !== 1) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "This account is already an owner of the business.",
        });
      }

      await writeAudit(client, req, userId, "BUSINESS_OWNER_INVITED", businessId, {
        inviteeUserId: invitee.id,
      });
      await client.query(
        `INSERT INTO notifications
          (user_id, type, title, message, data, action_url, created_at)
         VALUES ($1, 'business_owner_invitation', $2, $3, $4::jsonb, $5, NOW())`,
        [
          invitee.id,
          `Ownership invitation — ${business.name || "business"}`,
          "A business owner invited you to join their business.",
          JSON.stringify({ businessId }),
          `/business/${businessId}`,
        ],
      );
      await client.query("COMMIT");
      return res.status(201).json({
        success: true,
        data: { id: membership.rows[0].id, email: invitee.email, status: "invited" },
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

router.get(
  "/owner-invitations/mine",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const userId = actorId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { rows } = await pool.query(
      `SELECT bo.id, bo.business_id, bo.invited_at, b.name AS business_name,
              inviter.display_name AS invited_by_name
         FROM business_owners bo
         JOIN businesses b ON b.id = bo.business_id
         LEFT JOIN users inviter ON inviter.id = bo.invited_by
        WHERE bo.user_id = $1 AND bo.status = 'invited'
        ORDER BY bo.invited_at DESC`,
      [userId],
    );
    res.json({ success: true, data: rows });
  }),
);

router.post(
  "/owner-invitations/:invitationId/accept",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const invitationId = positiveId(req.params.invitationId);
    const userId = actorId(req);
    if (!invitationId) {
      return res.status(400).json({ success: false, error: "Invalid invitation id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const initial = await client.query(
        `SELECT business_id FROM business_owners
          WHERE id = $1 AND user_id = $2 AND status = 'invited'`,
        [invitationId, userId],
      );
      if (!initial.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Invitation not found" });
      }
      const businessId = Number(initial.rows[0].business_id);
      const business = await client.query(
        `SELECT id, owner_id FROM businesses WHERE id = $1 FOR UPDATE`,
        [businessId],
      );
      if (!business.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Business not found" });
      }
      const invitation = await client.query(
        `SELECT id FROM business_owners
          WHERE id = $1 AND business_id = $2 AND user_id = $3
            AND status = 'invited'
          FOR UPDATE`,
        [invitationId, businessId, userId],
      );
      if (!invitation.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, error: "Invitation is no longer available" });
      }
      const user = await client.query(
        `SELECT is_verified FROM users WHERE id = $1`,
        [userId],
      );
      if (user.rows[0]?.is_verified !== true) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          code: "EMAIL_VERIFICATION_REQUIRED",
          error: "Verify your email before accepting a business ownership invitation.",
        });
      }

      await client.query(
        `UPDATE business_owners
            SET status = 'active', accepted_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [invitationId],
      );
      await client.query(
        `UPDATE businesses SET owner_id = COALESCE(owner_id, $1), updated_at = NOW()
          WHERE id = $2`,
        [userId, businessId],
      );
      await client.query(
        `UPDATE users SET account_type = 'business_owner',
                          role = CASE WHEN role = 'user' THEN 'business_owner' ELSE role END
          WHERE id = $1`,
        [userId],
      );
      await writeAudit(client, req, userId, "BUSINESS_OWNER_INVITATION_ACCEPTED", businessId, {
        invitationId,
      });
      await client.query("COMMIT");
      return res.json({ success: true, businessId, status: "active" });
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
  "/:businessId/owners/invitations/:inviteeId",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const businessId = positiveId(req.params.businessId);
    const inviteeId = positiveId(req.params.inviteeId);
    const userId = actorId(req);
    if (!businessId || !inviteeId) {
      return res.status(400).json({ success: false, error: "Invalid business or invitee id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const businessResult = await client.query(
        `SELECT id, owner_id,
                EXISTS (
                  SELECT 1 FROM business_owners bo
                   WHERE bo.business_id = businesses.id AND bo.user_id = $2
                     AND bo.status = 'active'
                ) AS is_owner
           FROM businesses WHERE id = $1 FOR UPDATE`,
        [businessId, userId],
      );
      const business = businessResult.rows[0];
      if (!business) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Business not found" });
      }
      if (Number(business.owner_id) !== userId && !business.is_owner) {
        await client.query("ROLLBACK");
        return res.status(403).json({ success: false, error: "Business owner access required" });
      }
      const deleted = await client.query(
        `DELETE FROM business_owners
          WHERE business_id = $1 AND user_id = $2 AND status = 'invited'
          RETURNING id`,
        [businessId, inviteeId],
      );
      if (!deleted.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Pending invitation not found" });
      }
      await writeAudit(client, req, userId, "BUSINESS_OWNER_INVITATION_REVOKED", businessId, {
        inviteeUserId: inviteeId,
      });
      await client.query("COMMIT");
      return res.json({ success: true, status: "revoked" });
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
  "/owner-invitations/:invitationId",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const invitationId = positiveId(req.params.invitationId);
    const userId = actorId(req);
    if (!invitationId) {
      return res.status(400).json({ success: false, error: "Invalid invitation id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { rowCount } = await pool.query(
      `DELETE FROM business_owners
        WHERE id = $1 AND user_id = $2 AND status = 'invited'`,
      [invitationId, userId],
    );
    if (rowCount !== 1) {
      return res.status(404).json({ success: false, error: "Invitation not found" });
    }
    res.json({ success: true, status: "declined" });
  }),
);

router.delete(
  "/:businessId/owners/:ownerId",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const businessId = positiveId(req.params.businessId);
    const targetUserId = positiveId(req.params.ownerId);
    const userId = actorId(req);
    if (!businessId || !targetUserId) {
      return res.status(400).json({ success: false, error: "Invalid business or owner id" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const businessResult = await client.query(
        `SELECT id, owner_id,
                EXISTS (
                  SELECT 1 FROM business_owners bo
                   WHERE bo.business_id = businesses.id AND bo.user_id = $2
                     AND bo.status = 'active'
                ) AS is_owner
           FROM businesses WHERE id = $1 FOR UPDATE`,
        [businessId, userId],
      );
      const business = businessResult.rows[0];
      if (!business) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Business not found" });
      }
      if (Number(business.owner_id) !== userId && !business.is_owner) {
        await client.query("ROLLBACK");
        return res.status(403).json({ success: false, error: "Business owner access required" });
      }

      const target = await client.query(
        `SELECT id FROM business_owners
          WHERE business_id = $1 AND user_id = $2 AND status = 'active'
          FOR UPDATE`,
        [businessId, targetUserId],
      );
      if (!target.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Active owner not found" });
      }

      const nextOwner = await client.query(
        `SELECT user_id FROM business_owners
          WHERE business_id = $1 AND status = 'active' AND user_id <> $2
          ORDER BY accepted_at ASC NULLS LAST, id ASC LIMIT 1`,
        [businessId, targetUserId],
      );
      if (Number(business.owner_id) === targetUserId && !nextOwner.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "A business must retain at least one active owner.",
        });
      }

      await client.query(
        `DELETE FROM business_owners WHERE business_id = $1 AND user_id = $2`,
        [businessId, targetUserId],
      );
      const revokedInvitations = await client.query(
        `DELETE FROM business_owners
          WHERE business_id = $1 AND status = 'invited' AND invited_by = $2
          RETURNING user_id`,
        [businessId, targetUserId],
      );
      if (Number(business.owner_id) === targetUserId) {
        await client.query(
          `UPDATE businesses SET owner_id = $1, updated_at = NOW() WHERE id = $2`,
          [nextOwner.rows[0].user_id, businessId],
        );
      }
      await writeAudit(client, req, userId, "BUSINESS_OWNER_REMOVED", businessId, {
        removedUserId: targetUserId,
        revokedInviteeIds: revokedInvitations.rows.map((row) => row.user_id),
      });
      await client.query("COMMIT");
      return res.json({ success: true, status: "removed" });
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

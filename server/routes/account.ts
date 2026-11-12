import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { accountTypeLimiter } from "../middleware/rate-limiter";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
const accountTypeSchema = z.object({
  accountType: z.literal("business_owner"),
  businessName: z.string().trim().max(200).optional(),
});

router.post(
  "/account-type",
  requireAuth(),
  accountTypeLimiter,
  asyncHandler(async (req, res) => {
    const parsed = accountTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid account type",
      });
    }

    const userId = Number(req.user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        `SELECT id, account_type, business_name
         FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (!current.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Account not found" });
      }

      const user = current.rows[0];
      if (user.account_type === "business_owner") {
        await client.query("COMMIT");
        return res.json({
          success: true,
          accountType: "business_owner",
          businessName: user.business_name,
        });
      }
      if (user.account_type !== "general") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "This account type cannot be changed here",
        });
      }

      const businessName =
        parsed.data.businessName?.trim() || user.business_name || null;
      const updated = await client.query(
        `UPDATE users
         SET account_type = 'business_owner', business_name = $2
         WHERE id = $1 AND account_type = 'general'
         RETURNING account_type, business_name`,
        [userId, businessName],
      );
      if (updated.rowCount !== 1) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "Account type changed while this request was processing",
        });
      }

      await client.query(
        `INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
         VALUES ($1, 'ACCOUNT_TYPE_CHANGED', 'user', $1::text, $2::jsonb, $3, $4)`,
        [
          userId,
          JSON.stringify({
            before: {
              account_type: user.account_type,
              business_name: user.business_name,
            },
            after: {
              account_type: "business_owner",
              business_name: businessName,
            },
          }),
          (req.ip || "").slice(0, 45) || null,
          String(req.headers["user-agent"] || "").slice(0, 500) || null,
        ],
      );

      await client.query("COMMIT");
      return res.json({
        success: true,
        accountType: updated.rows[0].account_type,
        businessName: updated.rows[0].business_name,
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

export default router;

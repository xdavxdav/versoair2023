import { Router } from "express";
import { pool } from "../../../db";
import { requireAuth } from "../../../middleware/auth";

const router = Router();
const reviewRoles = ["admin", "moderator", "superuser"];
const manageRoles = ["admin", "superuser"];

async function recordAudit(
  entityType: string,
  entityId: number,
  action: string,
  performedBy: number,
  reason?: string,
) {
  await pool.query(
    `INSERT INTO community_operation_audit
       (entity_type, entity_id, action, performed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [entityType, entityId, action, performedBy, reason || null],
  );
}

router.get("/", requireAuth(reviewRoles), async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const values: string[] = [];
    const where = status ? `WHERE ac.status = $${values.push(status)}` : "";

    const result = await pool.query(
      `SELECT ac.id, ac.name, ac.slug, ac.region, ac.category, ac.focus,
              ac.description, ac.activities, ac.image_url, ac.status,
              ac.member_count, ac.created_at, ac.updated_at,
              COALESCE(u.display_name, u.username, u.email) AS owner_name,
              COUNT(jr.id) FILTER (WHERE jr.status = 'PENDING')::int AS pending_requests
       FROM artisan_communities ac
       LEFT JOIN users u ON u.id = ac.owner_id
       LEFT JOIN artisan_community_join_requests jr ON jr.community_id = ac.id
       ${where}
       GROUP BY ac.id, u.display_name, u.username, u.email
       ORDER BY ac.updated_at DESC NULLS LAST, ac.created_at DESC`,
      values,
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[admin:communities:list]", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load communities" });
  }
});

router.get("/join-requests", requireAuth(reviewRoles), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT jr.id, jr.community_id, jr.user_id, jr.message, jr.status,
              jr.created_at, jr.updated_at, ac.name AS community_name,
              COALESCE(u.display_name, u.username, u.email) AS applicant_name,
              u.email AS applicant_email
       FROM artisan_community_join_requests jr
       JOIN artisan_communities ac ON ac.id = jr.community_id
       JOIN users u ON u.id = jr.user_id
       WHERE jr.status = 'PENDING'
       ORDER BY jr.created_at ASC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[admin:communities:requests]", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load join requests" });
  }
});

router.get("/posts", requireAuth(reviewRoles), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT cp.id, cp.content, cp.is_hidden, cp.created_at,
              COALESCE(u.display_name, u.username, u.email) AS author_name,
              ac.name AS community_name
       FROM community_posts cp
       LEFT JOIN users u ON u.id = cp.user_id
       LEFT JOIN artisan_communities ac ON ac.id = cp.community_id
       ORDER BY cp.created_at DESC
       LIMIT 100`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[admin:communities:posts]", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load community posts" });
  }
});

router.patch("/:id/status", requireAuth(manageRoles), async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || "").toUpperCase();
  const reason = String(req.body?.reason || "")
    .trim()
    .slice(0, 1000);
  const allowed = new Set([
    "DRAFT",
    "PENDING",
    "PUBLISHED",
    "SUSPENDED",
    "ARCHIVED",
  ]);
  if (!Number.isInteger(id) || !allowed.has(status)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid community status" });
  }

  try {
    const result = await pool.query(
      `UPDATE artisan_communities
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, status, updated_at`,
      [status, id],
    );
    if (!result.rowCount) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found" });
    }
    await recordAudit(
      "community",
      id,
      `status_${status.toLowerCase()}`,
      Number(req.user?.userId),
      reason,
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[admin:communities:status]", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update community" });
  }
});

router.patch(
  "/join-requests/:id/status",
  requireAuth(reviewRoles),
  async (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "").toUpperCase();
    const reason = String(req.body?.reason || "")
      .trim()
      .slice(0, 1000);
    if (
      !Number.isInteger(id) ||
      !["APPROVED", "REJECTED", "CANCELLED"].includes(status)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request status" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE artisan_community_join_requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'PENDING'
       RETURNING id, community_id, user_id, status`,
        [status, id],
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, error: "Pending request not found" });
      }

      if (status === "APPROVED") {
        await client.query(
          `INSERT INTO artisan_community_memberships (community_id, user_id, status, joined_at, updated_at)
         VALUES ($1, $2, 'ACTIVE', NOW(), NOW())
         ON CONFLICT (community_id, user_id)
         DO UPDATE SET status = 'ACTIVE', removed_at = NULL, updated_at = NOW()`,
          [result.rows[0].community_id, result.rows[0].user_id],
        );
      }

      await client.query(
        `INSERT INTO community_operation_audit
         (entity_type, entity_id, action, performed_by, reason)
       VALUES ('join_request', $1, $2, $3, $4)`,
        [
          id,
          `join_${status.toLowerCase()}`,
          Number(req.user?.userId),
          reason || null,
        ],
      );

      await client.query(
        `UPDATE artisan_communities ac
       SET member_count = (
         SELECT COUNT(*)::int
         FROM artisan_community_memberships m
         WHERE m.community_id = ac.id AND m.status = 'ACTIVE'
       ), updated_at = NOW()
       WHERE ac.id = $1`,
        [result.rows[0].community_id],
      );

      await client.query("COMMIT");
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("[admin:communities:request-status]", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update join request" });
    } finally {
      client.release();
    }
  },
);

router.patch(
  "/posts/:id/moderation",
  requireAuth(reviewRoles),
  async (req, res) => {
    const id = Number(req.params.id);
    const action = String(req.body?.action || "").toLowerCase();
    const reason = String(req.body?.reason || "")
      .trim()
      .slice(0, 1000);
    if (
      !Number.isInteger(id) ||
      !["hide", "unhide", "remove"].includes(action)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid moderation action" });
    }
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, error: "A moderation reason is required" });
    }

    try {
      const result =
        action === "remove"
          ? await pool.query(
              "DELETE FROM community_posts WHERE id = $1 RETURNING id",
              [id],
            )
          : await pool.query(
              "UPDATE community_posts SET is_hidden = $1 WHERE id = $2 RETURNING id, is_hidden",
              [action === "hide", id],
            );
      if (!result.rowCount) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }
      await recordAudit(
        "post",
        id,
        `moderation_${action}`,
        Number(req.user?.userId),
        reason,
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("[admin:communities:moderation]", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to moderate post" });
    }
  },
);

export default router;

/**
 * Community Hub — Fan Wall API
 *
 * Phase 1 (MVP) rules:
 *   - GET /posts      : public (view-only for guests)
 *   - POST /posts     : auth required, 30s slow mode for free tier,
 *                       no cooldown for paid subscribers.
 *   - DELETE /posts/: : auth required, own-post or superuser only.
 *
 * Kept intentionally ungated by tier (fans must be able to talk to
 * creators for free) — spam control is handled purely by slow mode.
 */

import { Router, Request, Response } from "express";
import { pool } from "../db";
import { fanChatSlowMode } from "../middleware/rate-limiter";
import { requireAuth } from "./../middleware/auth";

const router = Router();

// GET /api/community/posts?limit=50&before=<id>
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
    const before = req.query.before
      ? parseInt(req.query.before as string)
      : null;

    const params: any[] = [];
    let where = "cp.is_hidden = FALSE AND cp.parent_id IS NULL";
    if (before) {
      params.push(before);
      where += ` AND cp.id < $${params.length}`;
    }
    params.push(limit);

    const result = await pool.query(
      `
      SELECT cp.id, cp.content, cp.author_name, cp.author_avatar, cp.created_at, cp.user_id,
             u.username, u.display_name, u.avatar_url
      FROM community_posts cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE ${where}
      ORDER BY cp.created_at DESC
      LIMIT $${params.length}
      `,
      params,
    );

    res.json({ success: true, posts: result.rows });
  } catch (err: any) {
    console.error("[COMMUNITY] GET /posts error:", err?.message);
    res.status(500).json({ success: false, error: "Failed to load posts" });
  }
});

// POST /api/community/posts  { content }
router.post(
  "/posts",
  requireAuth(),
  fanChatSlowMode,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.userId || user?.id;
      const content = String(req.body?.content || "").trim();

      if (!content) {
        return res
          .status(400)
          .json({ success: false, error: "Message content is required" });
      }
      if (content.length > 2000) {
        return res
          .status(400)
          .json({ success: false, error: "Message too long (2000 chars max)" });
      }

      const result = await pool.query(
        `INSERT INTO community_posts (user_id, author_name, author_avatar, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, author_name, author_avatar, user_id, created_at`,
        [
          userId,
          user?.displayName || user?.username || user?.email || "Anonymous",
          user?.avatarUrl || null,
          content,
        ],
      );

      res.json({ success: true, post: result.rows[0] });
    } catch (err: any) {
      console.error("[COMMUNITY] POST /posts error:", err?.message);
      res
        .status(500)
        .json({ success: false, error: "Failed to publish message" });
    }
  },
);

// DELETE /api/community/posts/:id — own post or superuser
router.delete(
  "/posts/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.userId || user?.id;
      const isSuper = user?.role === "superuser";
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid post id" });
      }

      const cond = isSuper ? "id = $1" : "id = $1 AND user_id = $2";
      const params = isSuper ? [postId] : [postId, userId];

      const result = await pool.query(
        `DELETE FROM community_posts WHERE ${cond} RETURNING id`,
        params,
      );

      if (!result.rowCount) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found or not yours" });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[COMMUNITY] DELETE /posts error:", err?.message);
      res.status(500).json({ success: false, error: "Failed to delete" });
    }
  },
);

export default router;

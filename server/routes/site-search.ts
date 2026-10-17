import { Router } from "express";
import { pool } from "../db";

const router = Router();

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/site-search?q=term — public, read-only, safe fields only
router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, 60);
  if (q.length < 2) {
    res.json({ success: true, data: [] });
    return;
  }
  const like = `%${escapeLike(q)}%`;
  const run = async (sql: string) => {
    try {
      return (await pool.query(sql, [like])).rows;
    } catch {
      return [];
    }
  };

  const [artists, posts, listings] = await Promise.all([
    run(
      `SELECT a.id, a.stage_name AS title, a.genre AS hint
       FROM artists a
       WHERE (a.stage_name ILIKE $1 OR a.genre ILIKE $1)
         AND NOT EXISTS (
           SELECT 1 FROM users u WHERE u.id = a.user_id
             AND LOWER(COALESCE(u.role, '')) IN ('admin','moderator','superadmin','superuser'))
       ORDER BY a.stage_name LIMIT 5`,
    ),
    run(
      `SELECT id, COALESCE(NULLIF(title, ''), LEFT(content, 80)) AS title, post_type AS hint
       FROM social_posts
       WHERE deleted_at IS NULL
         AND COALESCE(post_type, '') NOT IN ('dm_share', 'faq')
         AND (title ILIKE $1 OR content ILIKE $1)
       ORDER BY created_at DESC LIMIT 5`,
    ),
    run(
      `SELECT id, title, category AS hint
       FROM ad_journal_listings
       WHERE status = 'active' AND (title ILIKE $1 OR business_name ILIKE $1 OR category ILIKE $1)
       ORDER BY created_at DESC LIMIT 5`,
    ),
  ]);

  res.json({
    success: true,
    data: [
      ...artists.map((r) => ({ kind: "artist", id: r.id, title: r.title, hint: r.hint || "Artist", path: `/artist-catalogue/${r.id}` })),
      ...posts.map((r) => ({ kind: "post", id: r.id, title: r.title, hint: "Blog", path: "/blog" })),
      ...listings.map((r) => ({ kind: "listing", id: r.id, title: r.title, hint: r.hint || "Marketplace", path: "/marketplace" })),
    ],
  });
});

export default router;

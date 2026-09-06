import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { generateUniqueSlug } from "../services/profile-migration";

const router = Router();

function isAdmin(req: Request): boolean {
  return ["admin", "superuser", "moderator"].includes(req.user?.role || "");
}

router.get("/", async (req, res) => {
  try {
    const search = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const values: string[] = [];
    const filters = ["status = 'PUBLISHED'"];

    if (search) {
      values.push(`%${search}%`);
      filters.push(
        `(name ILIKE $${values.length} OR region ILIKE $${values.length} OR focus ILIKE $${values.length})`,
      );
    }
    if (category && category !== "all") {
      values.push(category);
      filters.push(`category = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT id, name, slug, region, category, focus, description, activities,
              image_url, member_count, created_at
       FROM artisan_communities
       WHERE ${filters.join(" AND ")}
       ORDER BY created_at DESC`,
      values,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[artisan-communities:list]", error);
    res.status(500).json({ error: "Failed to load communities" });
  }
});

router.post("/:id/join", requireAuth(), async (req, res) => {
  const communityId = Number(req.params.id);
  const message = String(req.body?.message || "")
    .trim()
    .slice(0, 1000);
  if (!Number.isInteger(communityId)) {
    return res.status(400).json({ error: "Invalid community id" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO artisan_community_join_requests (community_id, user_id, message)
       SELECT $1, $2, $3
       WHERE EXISTS (
         SELECT 1 FROM artisan_communities
         WHERE id = $1 AND status = 'PUBLISHED'
       )
       ON CONFLICT (community_id, user_id)
       DO UPDATE SET message = EXCLUDED.message, status = 'PENDING', updated_at = NOW()
       RETURNING id, community_id, status, created_at`,
      [communityId, Number(req.user?.userId), message || null],
    );

    if (!result.rowCount)
      return res.status(404).json({ error: "Community not found" });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[artisan-communities:join]", error);
    res.status(500).json({ error: "Failed to request membership" });
  }
});

router.post("/", requireAuth(), async (req, res) => {
  if (!isAdmin(req))
    return res.status(403).json({ error: "Admin access required" });

  const {
    name,
    region,
    category,
    focus,
    description,
    activities = [],
    imageUrl,
  } = req.body || {};
  if (!name || !region || !category || !focus || !description) {
    return res
      .status(400)
      .json({
        error: "Name, region, category, focus, and description are required",
      });
  }

  try {
    const slug = await generateUniqueSlug(String(name), "community");
    const result = await pool.query(
      `INSERT INTO artisan_communities
         (owner_id, name, slug, region, category, focus, description, activities, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'PUBLISHED')
       RETURNING *`,
      [
        Number(req.user?.userId),
        String(name).trim(),
        slug,
        String(region).trim(),
        String(category).trim(),
        String(focus).trim(),
        String(description).trim(),
        JSON.stringify(Array.isArray(activities) ? activities : []),
        imageUrl || null,
      ],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[artisan-communities:create]", error);
    res.status(500).json({ error: "Failed to create community" });
  }
});

export default router;

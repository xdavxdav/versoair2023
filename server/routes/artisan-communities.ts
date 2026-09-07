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

router.get("/me", requireAuth(), async (req, res) => {
  const userId = Number(req.user?.userId);

  try {
    const [memberships, requests] = await Promise.all([
      pool.query(
        `SELECT m.id, m.community_id, m.status, m.joined_at,
                ac.name, ac.slug, ac.region, ac.category, ac.focus,
                ac.description, ac.activities, ac.image_url, ac.member_count
         FROM artisan_community_memberships m
         JOIN artisan_communities ac ON ac.id = m.community_id
         WHERE m.user_id = $1 AND m.status = 'ACTIVE'
         ORDER BY m.joined_at DESC NULLS LAST, ac.name ASC`,
        [userId],
      ),
      pool.query(
        `SELECT jr.id, jr.community_id, jr.status, jr.message, jr.created_at,
                ac.name, ac.slug, ac.region, ac.category, ac.focus
         FROM artisan_community_join_requests jr
         JOIN artisan_communities ac ON ac.id = jr.community_id
         WHERE jr.user_id = $1 AND jr.status = 'PENDING'
         ORDER BY jr.created_at DESC`,
        [userId],
      ),
    ]);

    res.json({
      success: true,
      data: {
        memberships: memberships.rows,
        pendingRequests: requests.rows,
        counts: {
          joined: memberships.rowCount || 0,
          pending: requests.rowCount || 0,
          activities: memberships.rows.reduce(
            (total, community) =>
              total +
              (Array.isArray(community.activities)
                ? community.activities.length
                : 0),
            0,
          ),
        },
      },
    });
  } catch (error) {
    console.error("[artisan-communities:me]", error);
    res.status(500).json({ error: "Failed to load your community activity" });
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
    return res.status(400).json({
      error: "Name, region, category, focus, and description are required",
    });
  }

  try {
    const slug = await generateUniqueSlug(String(name), "community");
    const result = await pool.query(
      `INSERT INTO artisan_communities
         (owner_id, name, slug, region, category, focus, description, activities, image_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'DRAFT')
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

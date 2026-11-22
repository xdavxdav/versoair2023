/**
 * VXPP Communities API — mounted at /api/vxpp-communities
 *
 * Five normalized collections: Community, CommunityMember, CommunityPost,
 * CommunityComment, CommunityLike.
 *
 * Access rules (enforced strictly server-side):
 *  - Public reads across all collections.
 *  - All writes require a valid authenticated session; ownership & display name
 *    are always derived from the session (never from client-supplied author/id).
 *  - Community/Post/Comment updates & deletes: creator/author or admin.
 *  - Membership delete: member themselves or admin.
 *  - Like create/delete: creator only; one like per user per post (UNIQUE).
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { pool as defaultPool } from "../db";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { ensureVxppCommunitiesSchema } from "../services/vxpp-communities-schema";

export interface CommunitiesQueryPool {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
}

export interface VxppCommunitiesDeps {
  pool?: CommunitiesQueryPool;
  authMiddleware?: (req: Request, res: Response, next: NextFunction) => any;
  optionalAuthMiddleware?: (req: Request, res: Response, next: NextFunction) => any;
  skipSchemaEnsure?: boolean;
}

export const COMMUNITY_CATEGORIES = [
  "Business",
  "Culture",
  "Food",
  "Health",
  "Music",
  "Neighbourhood",
  "Technology",
  "Trades",
] as const;

export function slugifyCommunityName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const safeImageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (val) => {
      if (!val) return true;
      if (val.startsWith("/api/profile/post-media/") || val.startsWith("/uploads/")) {
        return true;
      }
      try {
        const u = new URL(val);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Invalid image URL." },
  );

const createCommunitySchema = z.object({
  name: z.string().trim().min(2, "Give your community a name.").max(60),
  tagline: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  category: z.string().trim().min(1).max(40).optional().default("Business"),
  emoji: z.string().trim().min(1).max(16).optional().default("◎"),
});

const updateCommunitySchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  emoji: z.string().trim().min(1).max(16).optional(),
});

const createPostSchema = z
  .object({
    body: z.string().trim().max(2000).optional().default(""),
    image_url: safeImageUrlSchema.optional().nullable(),
    imageUrl: safeImageUrlSchema.optional().nullable(),
  })
  .refine(
    (data) => Boolean(data.body.trim() || data.image_url || data.imageUrl),
    { message: "Write a message or attach a photo before posting." },
  );

const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty.")
    .max(500, "Comment must be 500 characters or fewer."),
});

function getActor(req: Request): { userId: number; role: string; isAdmin: boolean } | null {
  const rawId = (req as any).user?.userId ?? (req as any).user?.id;
  const userId = Number(rawId);
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;
  const role = String((req as any).user?.role || "user").toLowerCase();
  const isAdmin = ["admin", "superuser", "moderator"].includes(role);
  return { userId, role, isAdmin };
}

async function resolveSessionAuthorName(
  queryPool: CommunitiesQueryPool,
  userId: number,
  fallback?: string,
): Promise<string> {
  try {
    const { rows } = await queryPool.query(
      `SELECT display_name, username, email FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    const u = rows[0];
    if (u) {
      return (
        u.display_name ||
        u.username ||
        (typeof u.email === "string" ? u.email.split("@")[0] : null) ||
        "Member"
      );
    }
  } catch {
    // Fall back safely if lookup fails in unit test mocks
  }
  return fallback || "Member";
}

function toCountRecord(rows: Array<{ id?: number; community_id?: number; post_id?: number; count: number | string }>) {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const key = row.post_id ?? row.community_id ?? row.id;
    if (key !== undefined && key !== null) {
      map[String(key)] = Number(row.count) || 0;
    }
  }
  return map;
}

export function createVxppCommunitiesRouter(deps: VxppCommunitiesDeps = {}) {
  const router = Router();
  const queryPool: CommunitiesQueryPool = deps.pool ?? defaultPool;
  const auth = () => deps.authMiddleware ?? requireAuth();
  const optAuth = () => deps.optionalAuthMiddleware ?? optionalAuth;

  async function ensureSchema() {
    if (deps.skipSchemaEnsure) return;
    await ensureVxppCommunitiesSchema(queryPool);
  }

  // ── GET /api/vxpp-communities — list communities + grouped member & post counts ─
  router.get("/", async (req: Request, res: Response) => {
    try {
      await ensureSchema();
      const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 100);
      const [listRes, memberRows, postRows] = await Promise.all([
        queryPool.query(
          `SELECT id, name, slug, tagline, description, category, emoji, created_by, created_at AS created_date
           FROM vxpp_communities
           ORDER BY created_at DESC, id DESC
           LIMIT $1`,
          [limit],
        ),
        queryPool.query(
          `SELECT community_id, COUNT(*)::int AS count
           FROM vxpp_community_members
           GROUP BY community_id`,
        ),
        queryPool.query(
          `SELECT community_id, COUNT(*)::int AS count
           FROM vxpp_community_posts
           GROUP BY community_id`,
        ),
      ]);

      return res.json({
        success: true,
        items: listRes.rows,
        memberCounts: toCountRecord(memberRows.rows),
        postCounts: toCountRecord(postRows.rows),
      });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] GET / error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Could not load communities." });
    }
  });

  // ── POST /api/vxpp-communities — create a community ─────────────────────────
  router.post("/", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const parsed = createCommunitySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid community details.",
      });
    }

    const slug = slugifyCommunityName(parsed.data.name);
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "Use letters or numbers in the community name.",
      });
    }

    try {
      await ensureSchema();
      const dup = await queryPool.query(
        `SELECT id FROM vxpp_communities WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_SLUG",
          error: "A community with that name already exists.",
        });
      }

      const { rows } = await queryPool.query(
        `INSERT INTO vxpp_communities (name, slug, tagline, description, category, emoji, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, slug, tagline, description, category, emoji, created_by, created_at AS created_date`,
        [
          parsed.data.name,
          slug,
          parsed.data.tagline,
          parsed.data.description,
          parsed.data.category,
          parsed.data.emoji,
          actor.userId,
        ],
      );

      return res.status(201).json({ success: true, community: rows[0] });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_SLUG",
          error: "A community with that name already exists.",
        });
      }
      console.error("[VXPP-COMMUNITIES] POST / error:", error);
      return res
        .status(500)
        .json({ success: false, error: "The community could not be created." });
    }
  });

  // ── GET /api/vxpp-communities/posts/:postId/comments — list post comments ───
  router.get("/posts/:postId/comments", async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid post id." });
    }
    try {
      await ensureSchema();
      const { rows } = await queryPool.query(
        `SELECT id, post_id, community_id, author_id AS created_by, author_name, body, created_at AS created_date
         FROM vxpp_community_comments
         WHERE post_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 50`,
        [postId],
      );
      return res.json({ success: true, items: rows });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] GET comments error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Could not load comments." });
    }
  });

  // ── POST /api/vxpp-communities/posts/:postId/comments — add comment ─────────
  router.post("/posts/:postId/comments", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid post id." });
    }
    const parsed = createCommentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid comment.",
      });
    }

    try {
      await ensureSchema();
      const postRes = await queryPool.query(
        `SELECT id, community_id FROM vxpp_community_posts WHERE id = $1 LIMIT 1`,
        [postId],
      );
      const post = postRes.rows[0];
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found." });
      }
      const authorName = await resolveSessionAuthorName(
        queryPool,
        actor.userId,
        (req as any).user?.name,
      );
      const { rows } = await queryPool.query(
        `INSERT INTO vxpp_community_comments (post_id, community_id, author_id, author_name, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, post_id, community_id, author_id AS created_by, author_name, body, created_at AS created_date`,
        [postId, Number(post.community_id), actor.userId, authorName, parsed.data.body],
      );
      return res.status(201).json({ success: true, comment: rows[0] });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] POST comment error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Could not publish comment." });
    }
  });

  // ── DELETE /api/vxpp-communities/comments/:commentId — author or admin ──────
  router.delete("/comments/:commentId", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const commentId = Number(req.params.commentId);
    if (!Number.isSafeInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid comment id." });
    }
    try {
      await ensureSchema();
      const existing = await queryPool.query(
        `SELECT id, author_id FROM vxpp_community_comments WHERE id = $1 LIMIT 1`,
        [commentId],
      );
      const comment = existing.rows[0];
      if (!comment) {
        return res.status(404).json({ success: false, error: "Comment not found." });
      }
      if (Number(comment.author_id) !== actor.userId && !actor.isAdmin) {
        return res.status(403).json({ success: false, error: "Not authorized to delete this comment." });
      }
      await queryPool.query(`DELETE FROM vxpp_community_comments WHERE id = $1`, [commentId]);
      return res.json({ success: true });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] DELETE comment error:", error);
      return res.status(500).json({ success: false, error: "Could not delete comment." });
    }
  });

  // ── POST /api/vxpp-communities/posts/:postId/like — one like per user/post ──
  router.post("/posts/:postId/like", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid post id." });
    }
    try {
      await ensureSchema();
      const postRes = await queryPool.query(
        `SELECT id, community_id FROM vxpp_community_posts WHERE id = $1 LIMIT 1`,
        [postId],
      );
      const post = postRes.rows[0];
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found." });
      }
      await queryPool.query(
        `INSERT INTO vxpp_community_likes (post_id, community_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, Number(post.community_id), actor.userId],
      );
      const countRes = await queryPool.query(
        `SELECT COUNT(*)::int AS count FROM vxpp_community_likes WHERE post_id = $1`,
        [postId],
      );
      return res.json({
        success: true,
        liked: true,
        likeCount: Number(countRes.rows[0]?.count) || 0,
      });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] POST like error:", error);
      return res.status(500).json({ success: false, error: "Could not like post." });
    }
  });

  // ── DELETE /api/vxpp-communities/posts/:postId/like — creator only ──────────
  router.delete("/posts/:postId/like", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid post id." });
    }
    try {
      await ensureSchema();
      await queryPool.query(
        `DELETE FROM vxpp_community_likes WHERE post_id = $1 AND user_id = $2`,
        [postId, actor.userId],
      );
      const countRes = await queryPool.query(
        `SELECT COUNT(*)::int AS count FROM vxpp_community_likes WHERE post_id = $1`,
        [postId],
      );
      return res.json({
        success: true,
        liked: false,
        likeCount: Number(countRes.rows[0]?.count) || 0,
      });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] DELETE like error:", error);
      return res.status(500).json({ success: false, error: "Could not unlike post." });
    }
  });

  // ── DELETE /api/vxpp-communities/posts/:postId — author or admin ────────────
  router.delete("/posts/:postId", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid post id." });
    }
    try {
      await ensureSchema();
      const existing = await queryPool.query(
        `SELECT id, author_id FROM vxpp_community_posts WHERE id = $1 LIMIT 1`,
        [postId],
      );
      const post = existing.rows[0];
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found." });
      }
      if (Number(post.author_id) !== actor.userId && !actor.isAdmin) {
        return res.status(403).json({ success: false, error: "Not authorized to delete this post." });
      }
      await queryPool.query(`DELETE FROM vxpp_community_posts WHERE id = $1`, [postId]);
      return res.json({ success: true });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] DELETE post error:", error);
      return res.status(500).json({ success: false, error: "Could not delete post." });
    }
  });

  // ── POST /api/vxpp-communities/:id/membership — join community ──────────────
  router.post("/:id/membership", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const communityId = Number(req.params.id);
    if (!Number.isSafeInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid community id." });
    }
    try {
      await ensureSchema();
      const exists = await queryPool.query(
        `SELECT id FROM vxpp_communities WHERE id = $1 LIMIT 1`,
        [communityId],
      );
      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Community not found." });
      }
      const userName = await resolveSessionAuthorName(
        queryPool,
        actor.userId,
        (req as any).user?.name,
      );
      await queryPool.query(
        `INSERT INTO vxpp_community_members (community_id, user_id, user_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (community_id, user_id) DO NOTHING`,
        [communityId, actor.userId, userName],
      );
      const [memberRes, countRes] = await Promise.all([
        queryPool.query(
          `SELECT id, community_id, user_id AS created_by, user_name, created_at AS created_date
           FROM vxpp_community_members
           WHERE community_id = $1 AND user_id = $2
           LIMIT 1`,
          [communityId, actor.userId],
        ),
        queryPool.query(
          `SELECT COUNT(*)::int AS count FROM vxpp_community_members WHERE community_id = $1`,
          [communityId],
        ),
      ]);
      return res.status(201).json({
        success: true,
        membership: memberRes.rows[0] || null,
        memberCount: Number(countRes.rows[0]?.count) || 0,
      });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] POST membership error:", error);
      return res.status(500).json({ success: false, error: "Could not join community." });
    }
  });

  // ── DELETE /api/vxpp-communities/:id/membership — leave community ───────────
  router.delete("/:id/membership", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const communityId = Number(req.params.id);
    if (!Number.isSafeInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid community id." });
    }
    try {
      await ensureSchema();
      await queryPool.query(
        `DELETE FROM vxpp_community_members WHERE community_id = $1 AND user_id = $2`,
        [communityId, actor.userId],
      );
      const countRes = await queryPool.query(
        `SELECT COUNT(*)::int AS count FROM vxpp_community_members WHERE community_id = $1`,
        [communityId],
      );
      return res.json({
        success: true,
        membership: null,
        memberCount: Number(countRes.rows[0]?.count) || 0,
      });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] DELETE membership error:", error);
      return res.status(500).json({ success: false, error: "Could not leave community." });
    }
  });

  // ── POST /api/vxpp-communities/:id/posts — create post in community ─────────
  router.post("/:id/posts", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const communityId = Number(req.params.id);
    if (!Number.isSafeInteger(communityId) || communityId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid community id." });
    }
    const parsed = createPostSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Post cannot be empty.",
      });
    }
    try {
      await ensureSchema();
      const exists = await queryPool.query(
        `SELECT id FROM vxpp_communities WHERE id = $1 LIMIT 1`,
        [communityId],
      );
      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Community not found." });
      }
      const authorName = await resolveSessionAuthorName(
        queryPool,
        actor.userId,
        (req as any).user?.name,
      );
      const imageUrl = parsed.data.image_url || parsed.data.imageUrl || null;
      const body = parsed.data.body.trim() || "Shared a photo";
      const { rows } = await queryPool.query(
        `INSERT INTO vxpp_community_posts (community_id, author_id, author_name, body, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, community_id, author_id AS created_by, author_name, body, image_url, created_at AS created_date`,
        [communityId, actor.userId, authorName, body, imageUrl],
      );
      return res.status(201).json({ success: true, post: rows[0] });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] POST post error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Your post could not be published." });
    }
  });

  // ── GET /api/vxpp-communities/:slug — full community detail + feed ──────────
  router.get("/:slug", optAuth(), async (req: Request, res: Response) => {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      return res.status(404).json({ success: false, error: "Community not found." });
    }
    try {
      await ensureSchema();
      const commRes = await queryPool.query(
        `SELECT id, name, slug, tagline, description, category, emoji, created_by, created_at AS created_date
         FROM vxpp_communities
         WHERE slug = $1
         LIMIT 1`,
        [slug],
      );
      const community = commRes.rows[0];
      if (!community) {
        return res.status(404).json({ success: false, error: "Community not found." });
      }
      const communityId = Number(community.id);
      const actor = getActor(req);

      const [memberCountRes, postCountRes, postsRes, likeRows, commentRows, myMemberRes, myLikesRes] =
        await Promise.all([
          queryPool.query(
            `SELECT COUNT(*)::int AS count FROM vxpp_community_members WHERE community_id = $1`,
            [communityId],
          ),
          queryPool.query(
            `SELECT COUNT(*)::int AS count FROM vxpp_community_posts WHERE community_id = $1`,
            [communityId],
          ),
          queryPool.query(
            `SELECT id, community_id, author_id AS created_by, author_name, body, image_url, created_at AS created_date
             FROM vxpp_community_posts
             WHERE community_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT 30`,
            [communityId],
          ),
          queryPool.query(
            `SELECT post_id, COUNT(*)::int AS count
             FROM vxpp_community_likes
             WHERE community_id = $1
             GROUP BY post_id`,
            [communityId],
          ),
          queryPool.query(
            `SELECT post_id, COUNT(*)::int AS count
             FROM vxpp_community_comments
             WHERE community_id = $1
             GROUP BY post_id`,
            [communityId],
          ),
          actor
            ? queryPool.query(
                `SELECT id, community_id, user_id AS created_by, user_name, created_at AS created_date
                 FROM vxpp_community_members
                 WHERE community_id = $1 AND user_id = $2
                 LIMIT 1`,
                [communityId, actor.userId],
              )
            : Promise.resolve({ rows: [] }),
          actor
            ? queryPool.query(
                `SELECT post_id FROM vxpp_community_likes WHERE community_id = $1 AND user_id = $2 LIMIT 200`,
                [communityId, actor.userId],
              )
            : Promise.resolve({ rows: [] }),
        ]);

      return res.json({
        success: true,
        community,
        memberCount: Number(memberCountRes.rows[0]?.count) || 0,
        postCount: Number(postCountRes.rows[0]?.count) || 0,
        posts: postsRes.rows,
        likeCounts: toCountRecord(likeRows.rows),
        commentCounts: toCountRecord(commentRows.rows),
        membership: myMemberRes.rows[0] || null,
        myLikes: myLikesRes.rows.map((r: any) => Number(r.post_id)),
      });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] GET /:slug error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Could not load community." });
    }
  });

  // ── PATCH /api/vxpp-communities/:slug — creator or admin ────────────────────
  router.patch("/:slug", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    const parsed = updateCommunitySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid update.",
      });
    }
    try {
      await ensureSchema();
      const existing = await queryPool.query(
        `SELECT id, created_by FROM vxpp_communities WHERE slug = $1 LIMIT 1`,
        [String(req.params.slug || "").trim().toLowerCase()],
      );
      const comm = existing.rows[0];
      if (!comm) {
        return res.status(404).json({ success: false, error: "Community not found." });
      }
      if (Number(comm.created_by) !== actor.userId && !actor.isAdmin) {
        return res.status(403).json({ success: false, error: "Not authorized to edit this community." });
      }
      const updates: string[] = [];
      const params: unknown[] = [];
      const push = (col: string, val: unknown) => {
        params.push(val);
        updates.push(`${col} = $${params.length}`);
      };
      if (parsed.data.name !== undefined) push("name", parsed.data.name);
      if (parsed.data.tagline !== undefined) push("tagline", parsed.data.tagline);
      if (parsed.data.description !== undefined) push("description", parsed.data.description);
      if (parsed.data.category !== undefined) push("category", parsed.data.category);
      if (parsed.data.emoji !== undefined) push("emoji", parsed.data.emoji);
      if (updates.length === 0) {
        return res.json({ success: true, community: comm });
      }
      params.push(comm.id);
      const { rows } = await queryPool.query(
        `UPDATE vxpp_communities SET ${updates.join(", ")} WHERE id = $${params.length}
         RETURNING id, name, slug, tagline, description, category, emoji, created_by, created_at AS created_date`,
        params,
      );
      return res.json({ success: true, community: rows[0] });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] PATCH /:slug error:", error);
      return res.status(500).json({ success: false, error: "Could not update community." });
    }
  });

  // ── DELETE /api/vxpp-communities/:slug — creator or admin ───────────────────
  router.delete("/:slug", auth(), async (req: Request, res: Response) => {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Sign in required." });
    }
    try {
      await ensureSchema();
      const existing = await queryPool.query(
        `SELECT id, created_by FROM vxpp_communities WHERE slug = $1 LIMIT 1`,
        [String(req.params.slug || "").trim().toLowerCase()],
      );
      const comm = existing.rows[0];
      if (!comm) {
        return res.status(404).json({ success: false, error: "Community not found." });
      }
      if (Number(comm.created_by) !== actor.userId && !actor.isAdmin) {
        return res.status(403).json({ success: false, error: "Not authorized to delete this community." });
      }
      await queryPool.query(`DELETE FROM vxpp_communities WHERE id = $1`, [comm.id]);
      return res.json({ success: true });
    } catch (error) {
      console.error("[VXPP-COMMUNITIES] DELETE /:slug error:", error);
      return res.status(500).json({ success: false, error: "Could not delete community." });
    }
  });

  return router;
}

export default createVxppCommunitiesRouter();

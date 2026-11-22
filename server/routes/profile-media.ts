/**
 * vxpp Personal Profile, Avatar/Cover Media & Social Post Media API
 * Mounted at /api/profile
 *
 * All images are stored as PostgreSQL BYTEA so they persist across Render
 * redeploys and across devices. Uploads are strictly validated by magic bytes
 * (JPEG/PNG/WebP/GIF only — no SVG).
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { pool as defaultPool } from "../db";
import { requireAuth } from "../middleware/auth";
import { ensureVxppSchema } from "../services/vxpp-schema";
import {
  MAX_PROFILE_IMAGE_BYTES,
  validateRasterImageBuffer,
} from "../utils/raster-image";

export interface ProfileMediaQueryPool {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
}

export interface ProfileMediaDeps {
  pool?: ProfileMediaQueryPool;
  authMiddleware?: (req: Request, res: Response, next: NextFunction) => any;
  skipSchemaEnsure?: boolean;
}

const safeHttpUrl = z
  .string()
  .trim()
  .max(255)
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Website must be a valid http:// or https:// URL" },
  );

const updateProfileSchema = z.object({
  headline: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(600).optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  website: safeHttpUrl.optional().nullable(),
  profession: z.string().trim().max(100).optional().nullable(),
  company: z.string().trim().max(100).optional().nullable(),
  interests: z
    .array(z.string().trim().min(1).max(32))
    .max(12)
    .optional(),
  privacyLevel: z.enum(["public", "friends", "private"]).optional(),
});

function createSingleImageMiddleware(fieldName: string) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PROFILE_IMAGE_BYTES },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "Image is too large. Maximum size is 5 MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : "Could not read upload.",
      });
    });
  };
}

function getAuthenticatedUserId(req: Request): number | null {
  const raw = (req as any).user?.userId ?? (req as any).user?.id;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function ensureSocialUserRow(
  queryPool: ProfileMediaQueryPool,
  userId: number,
): Promise<void> {
  const existing = await queryPool.query(
    `SELECT id FROM social_users WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (existing.rows.length > 0) return;

  const userRes = await queryPool.query(
    `SELECT username, display_name FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  const u = userRes.rows[0];
  const baseUsername = (u?.username || `member_${userId}`).trim();
  const displayName = (u?.display_name || baseUsername || `Verso member ${userId}`).trim();

  try {
    await queryPool.query(
      `INSERT INTO social_users (user_id, username, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO NOTHING`,
      [userId, baseUsername, displayName],
    );
  } catch {
    // Fallback if username collided with an older row
  }

  const checkAgain = await queryPool.query(
    `SELECT id FROM social_users WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (checkAgain.rows.length === 0) {
    await queryPool.query(
      `INSERT INTO social_users (user_id, username, display_name)
       VALUES ($1, $2, $3)`,
      [userId, `member_${userId}_${Date.now().toString(36)}`, displayName],
    );
  }
}

function sendSafeImage(res: Response, buffer: Buffer, mime: string) {
  res.set({
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  res.type(mime || "application/octet-stream");
  return res.send(buffer);
}

export function createProfileMediaRouter(deps: ProfileMediaDeps = {}) {
  const router = Router();
  const queryPool: ProfileMediaQueryPool = deps.pool ?? defaultPool;
  const auth = () => deps.authMiddleware ?? requireAuth();

  async function ensureSchema() {
    if (deps.skipSchemaEnsure) return;
    await ensureVxppSchema(queryPool);
  }

  // ── GET /api/profile/me — owner's complete personal profile ─────────────────
  router.get("/me", auth(), async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    try {
      await ensureSchema();
      await ensureSocialUserRow(queryPool, userId);

      const { rows } = await queryPool.query(
        `SELECT u.id, u.username, u.email, u.display_name, u.role, u.account_type,
                u.subscription_tier, u.subscription_status, u.created_at,
                su.id AS social_user_id, su.avatar_url, su.cover_image_url,
                su.headline, su.bio, su.location, su.website,
                su.profession, su.company, su.interests, su.privacy_level,
                COALESCE((SELECT COUNT(*) FROM social_followers sf WHERE sf.following_id = su.id), 0) AS follower_count,
                COALESCE((SELECT COUNT(*) FROM social_followers sf WHERE sf.follower_id = su.id), 0) AS following_count,
                COALESCE((SELECT COUNT(*) FROM social_posts sp WHERE sp.author_id = su.id AND sp.deleted_at IS NULL), 0) AS post_count
         FROM users u
         LEFT JOIN social_users su ON su.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [userId],
      );
      const row = rows[0];
      if (!row) {
        return res.status(404).json({ success: false, message: "Profile not found." });
      }

      return res.json({
        success: true,
        profile: {
          id: Number(row.id),
          username: row.username,
          email: row.email,
          displayName: row.display_name || row.username,
          role: row.role || "user",
          accountType: row.account_type || "general",
          subscriptionTier: row.subscription_tier || "free",
          subscriptionStatus: row.subscription_status || "active",
          joinedAt: row.created_at ?? null,
          avatarUrl: row.avatar_url ?? null,
          coverImageUrl: row.cover_image_url ?? null,
          headline: row.headline ?? null,
          bio: row.bio ?? null,
          location: row.location ?? null,
          website: row.website ?? null,
          profession: row.profession ?? null,
          company: row.company ?? null,
          interests: Array.isArray(row.interests) ? row.interests : [],
          privacyLevel: row.privacy_level || "public",
          stats: {
            followerCount: Number(row.follower_count) || 0,
            followingCount: Number(row.following_count) || 0,
            postCount: Number(row.post_count) || 0,
          },
        },
      });
    } catch (error) {
      console.error("[PROFILE] GET /me error:", error);
      return res.status(500).json({ success: false, message: "Failed to load profile." });
    }
  });

  // ── PUT /api/profile/me — edit bio, headline, location, website, interests ──
  router.put("/me", auth(), async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const parsed = updateProfileSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid profile fields.",
      });
    }

    const data = parsed.data;
    const dedupedInterests =
      data.interests !== undefined
        ? Array.from(new Set(data.interests.map((tag) => tag.trim()).filter(Boolean)))
        : undefined;

    try {
      await ensureSchema();
      await ensureSocialUserRow(queryPool, userId);

      const updates: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [];

      const pushField = (col: string, val: unknown) => {
        params.push(val);
        updates.push(`${col} = $${params.length}`);
      };

      if (data.headline !== undefined) pushField("headline", data.headline || null);
      if (data.bio !== undefined) pushField("bio", data.bio || null);
      if (data.location !== undefined) pushField("location", data.location || null);
      if (data.website !== undefined) pushField("website", data.website || null);
      if (data.profession !== undefined) pushField("profession", data.profession || null);
      if (data.company !== undefined) pushField("company", data.company || null);
      if (dedupedInterests !== undefined) pushField("interests", dedupedInterests);
      if (data.privacyLevel !== undefined) pushField("privacy_level", data.privacyLevel);

      params.push(userId);
      const result = await queryPool.query(
        `UPDATE social_users
         SET ${updates.join(", ")}
         WHERE user_id = $${params.length}
         RETURNING headline, bio, location, website, profession, company, interests, privacy_level, avatar_url, cover_image_url`,
        params,
      );

      const row = result.rows[0] || {};
      return res.json({
        success: true,
        profile: {
          headline: row.headline ?? null,
          bio: row.bio ?? null,
          location: row.location ?? null,
          website: row.website ?? null,
          profession: row.profession ?? null,
          company: row.company ?? null,
          interests: Array.isArray(row.interests) ? row.interests : [],
          privacyLevel: row.privacy_level || "public",
          avatarUrl: row.avatar_url ?? null,
          coverImageUrl: row.cover_image_url ?? null,
        },
        message: "Profile updated.",
      });
    } catch (error) {
      console.error("[PROFILE] PUT /me error:", error);
      return res.status(500).json({ success: false, message: "Failed to save profile." });
    }
  });

  // ── POST /api/profile/avatar ────────────────────────────────────────────────
  router.post(
    "/avatar",
    auth(),
    createSingleImageMiddleware("avatar"),
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const check = validateRasterImageBuffer(req.file?.buffer, req.file?.mimetype);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }
      try {
        await ensureSchema();
        await ensureSocialUserRow(queryPool, userId);
        const avatarUrl = `/api/profile/media/${userId}/avatar?v=${Date.now()}`;
        await queryPool.query(
          `UPDATE social_users
           SET avatar_url = $1, avatar_data = $2, avatar_mime = $3, updated_at = NOW()
           WHERE user_id = $4`,
          [avatarUrl, req.file!.buffer, check.mime, userId],
        );
        return res.json({
          success: true,
          avatarUrl,
          message: "Profile picture updated.",
        });
      } catch (error) {
        console.error("[PROFILE] POST /avatar error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload profile picture." });
      }
    },
  );

  // ── DELETE /api/profile/avatar ──────────────────────────────────────────────
  router.delete("/avatar", auth(), async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    try {
      await ensureSchema();
      await queryPool.query(
        `UPDATE social_users
         SET avatar_url = NULL, avatar_data = NULL, avatar_mime = NULL, updated_at = NOW()
         WHERE user_id = $1`,
        [userId],
      );
      return res.json({ success: true, avatarUrl: null, message: "Profile picture removed." });
    } catch (error) {
      console.error("[PROFILE] DELETE /avatar error:", error);
      return res.status(500).json({ success: false, message: "Failed to remove profile picture." });
    }
  });

  // ── POST /api/profile/cover ─────────────────────────────────────────────────
  router.post(
    "/cover",
    auth(),
    createSingleImageMiddleware("cover"),
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const check = validateRasterImageBuffer(req.file?.buffer, req.file?.mimetype);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }
      try {
        await ensureSchema();
        await ensureSocialUserRow(queryPool, userId);
        const coverImageUrl = `/api/profile/media/${userId}/cover?v=${Date.now()}`;
        await queryPool.query(
          `UPDATE social_users
           SET cover_image_url = $1, cover_data = $2, cover_mime = $3, updated_at = NOW()
           WHERE user_id = $4`,
          [coverImageUrl, req.file!.buffer, check.mime, userId],
        );
        return res.json({
          success: true,
          coverImageUrl,
          message: "Cover photo updated.",
        });
      } catch (error) {
        console.error("[PROFILE] POST /cover error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload cover photo." });
      }
    },
  );

  // ── DELETE /api/profile/cover ───────────────────────────────────────────────
  router.delete("/cover", auth(), async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    try {
      await ensureSchema();
      await queryPool.query(
        `UPDATE social_users
         SET cover_image_url = NULL, cover_data = NULL, cover_mime = NULL, updated_at = NOW()
         WHERE user_id = $1`,
        [userId],
      );
      return res.json({ success: true, coverImageUrl: null, message: "Cover photo removed." });
    } catch (error) {
      console.error("[PROFILE] DELETE /cover error:", error);
      return res.status(500).json({ success: false, message: "Failed to remove cover photo." });
    }
  });

  // ── GET /api/profile/media/:userId/:kind — serve avatar or cover photo ──────
  router.get("/media/:userId/:kind", async (req: Request, res: Response) => {
    const { userId, kind } = req.params;
    if (!/^\d+$/.test(userId) || (kind !== "avatar" && kind !== "cover")) {
      return res.status(404).json({ success: false, message: "Image not found." });
    }
    try {
      await ensureSchema();
      const colData = kind === "avatar" ? "avatar_data" : "cover_data";
      const colMime = kind === "avatar" ? "avatar_mime" : "cover_mime";
      const { rows } = await queryPool.query(
        `SELECT ${colData} AS data, ${colMime} AS mime
         FROM social_users
         WHERE user_id = $1
         LIMIT 1`,
        [Number(userId)],
      );
      const row = rows[0];
      if (!row?.data) {
        return res.status(404).json({ success: false, message: "Image not found." });
      }
      return sendSafeImage(res, row.data, row.mime);
    } catch (error) {
      console.error("[PROFILE] GET /media error:", error);
      return res.status(500).json({ success: false, message: "Failed to load image." });
    }
  });

  // ── POST /api/profile/post-media — persistent image upload for social posts ─
  router.post(
    "/post-media",
    auth(),
    createSingleImageMiddleware("image"),
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const check = validateRasterImageBuffer(req.file?.buffer, req.file?.mimetype);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }
      try {
        await ensureSchema();
        const { rows } = await queryPool.query(
          `INSERT INTO social_post_media (owner_user_id, mime_type, data, size_bytes)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, check.mime, req.file!.buffer, check.size],
        );
        const mediaId = rows[0]?.id;
        return res.status(201).json({
          success: true,
          id: mediaId,
          url: `/api/profile/post-media/${mediaId}`,
        });
      } catch (error) {
        console.error("[PROFILE] POST /post-media error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload post image." });
      }
    },
  );

  // ── GET /api/profile/post-media/:mediaId — serve social post photo ──────────
  router.get("/post-media/:mediaId", async (req: Request, res: Response) => {
    const { mediaId } = req.params;
    if (!/^\d+$/.test(mediaId)) {
      return res.status(404).json({ success: false, message: "Image not found." });
    }
    try {
      await ensureSchema();
      const { rows } = await queryPool.query(
        `SELECT data, mime_type FROM social_post_media WHERE id = $1 LIMIT 1`,
        [Number(mediaId)],
      );
      const row = rows[0];
      if (!row?.data) {
        return res.status(404).json({ success: false, message: "Image not found." });
      }
      return sendSafeImage(res, row.data, row.mime_type);
    } catch (error) {
      console.error("[PROFILE] GET /post-media error:", error);
      return res.status(500).json({ success: false, message: "Failed to load post image." });
    }
  });

  return router;
}

export default createProfileMediaRouter();

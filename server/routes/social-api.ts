// API Routes for Verso Air Social Blog - Phase 1
// These are skeleton endpoints to be implemented
// Location: server/routes/social-api.ts

import { Router, Request, Response } from "express";
import { db, pool } from "../../server/db";
import { desc, eq, isNull, and, inArray, sql } from "drizzle-orm";
import {
  socialPosts,
  socialComments,
  socialLikes,
  socialFollowers,
  socialUsers,
  socialNotifications,
  socialPostAnalytics,
} from "../../shared/social-schema";
import { musicTracks, users } from "../../shared/schema";
import {
  notifyFollow,
  notifyLike,
  notifyComment,
} from "../services/notification-service";

const router = Router();

async function recordSocialAudit(event: {
  actorUserId?: number | string;
  postId?: number;
  eventType: string;
  outcome: string;
  metadata?: Record<string, unknown>;
}) {
  await pool.query(
    `INSERT INTO social_audit_events
      (actor_user_id, post_id, event_type, outcome, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      event.actorUserId || null,
      event.postId || null,
      event.eventType,
      event.outcome,
      JSON.stringify(event.metadata || {}),
    ],
  );
}

/**
 * Allowed `postType` values. Extended beyond the original
 * discussion/job/trend/announcement/faq set to cover the thread feeds
 * embedded on Marketplace, Musical Universe (/stream), Contractors and
 * Job Seekers pages — all reuse this same social-posts engine instead of
 * a bespoke system per page.
 */
const ALLOWED_POST_TYPES = [
  "discussion",
  "job",
  "trend",
  "announcement",
  "faq",
  "marketplace",
  "musical_universe",
  "music_post", // a social post with a playable track attached
  "contractor",
  "job_seeker",
  "dm_share", // a DM the sender chose to publish/promote to the public feed
];

async function getSocialProfileId(appUserId: number): Promise<number> {
  const [existingProfile] = await db
    .select({ id: socialUsers.id })
    .from(socialUsers)
    .where(eq(socialUsers.userId, appUserId))
    .limit(1);

  if (existingProfile) return existingProfile.id;

  const [profile] = await db
    .insert(socialUsers)
    .values({
      userId: appUserId,
      username: `member_${appUserId}`,
      displayName: `Verso member ${appUserId}`,
    })
    .returning({ id: socialUsers.id });

  return profile.id;
}

async function getTrackInfo(trackId: number) {
  const result = await pool.query(
    `SELECT id, title, artist_id, genre, duration, cover_art, pochette, has_audio_data, status
     FROM music_tracks WHERE id = $1 AND status = 'published'`,
    [trackId],
  );
  return result.rows[0] || null;
}

async function enrichPostsWithTracks(posts: any[]) {
  const trackIds = [...new Set(posts.map((p) => p.trackId).filter(Boolean))];
  if (trackIds.length === 0) return posts;

  const tracks = await pool.query(
    `SELECT id, title, artist_id, genre, duration, cover_art, pochette, has_audio_data, status
     FROM music_tracks WHERE id = ANY($1::int[]) AND status = 'published'`,
    [trackIds],
  );

  const trackMap = Object.fromEntries(tracks.rows.map((t: any) => [t.id, t]));

  return posts.map((post) => ({
    ...post,
    track: post.trackId ? trackMap[post.trackId] || null : null,
  }));
}

async function syncFollowerCount(socialUserId: number): Promise<void> {
  const followers = await db
    .select({ id: socialFollowers.id })
    .from(socialFollowers)
    .where(eq(socialFollowers.followingId, socialUserId));

  await db
    .update(socialUsers)
    .set({ followerCount: followers.length })
    .where(eq(socialUsers.id, socialUserId));
}

// ============================================
// POSTS ENDPOINTS
// ============================================

// GET /api/social/posts - Get feed with pagination, optional postType filter
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, sort = "recent", postType } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [isNull(socialPosts.deletedAt)];
    if (postType && typeof postType === "string") {
      conditions.push(eq(socialPosts.postType, postType));
    }

    let query = db
      .select()
      .from(socialPosts)
      .where(and(...conditions))
      .orderBy(
        sort === "trending"
          ? desc(socialPosts.engagementScore)
          : desc(socialPosts.createdAt),
      )
      .limit(limitNum)
      .offset(offset);

    const posts = await query;

    // Batch-fetch all authors in a single query instead of N+1
    const authorIds = [
      ...new Set(posts.map((p: any) => p.authorId).filter(Boolean)),
    ];
    let authorMap: Record<number, any> = {};

    if (authorIds.length > 0) {
      const authors = await db
        .select()
        .from(socialUsers)
        .where(inArray(socialUsers.id, authorIds));

      for (const author of authors) {
        authorMap[author.id] = author;
      }
    }

    const enrichedPosts = posts.map((post: any) => ({
      ...post,
      author: authorMap[post.authorId] || null,
    }));

    // Attach track info for music posts
    const withTracks = await enrichPostsWithTracks(enrichedPosts);

    res.json({
      success: true,
      data: withTracks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: posts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch posts" });
  }
});

// GET /api/social/posts/following - Get posts from users you follow
router.get("/posts/following", async (req: Request, res: Response) => {
  try {
    const appUserId = req.user?.userId;
    if (!appUserId) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0 },
      });
    }

    const followerId = await getSocialProfileId(Number(appUserId));
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const following = await db
      .select({ followingId: socialFollowers.followingId })
      .from(socialFollowers)
      .where(eq(socialFollowers.followerId, followerId));

    if (following.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: pageNum, limit: limitNum, total: 0 },
      });
    }

    const followingIds = following.map((f) => f.followingId);
    const posts = await db
      .select()
      .from(socialPosts)
      .where(
        and(
          isNull(socialPosts.deletedAt),
          inArray(socialPosts.authorId, followingIds),
        ),
      )
      .orderBy(desc(socialPosts.createdAt))
      .limit(limitNum)
      .offset(offset);

    const authorIds = [...new Set(posts.map((p: any) => p.authorId))];
    let authorMap: Record<number, any> = {};
    if (authorIds.length > 0) {
      const authors = await db
        .select()
        .from(socialUsers)
        .where(inArray(socialUsers.id, authorIds));
      for (const author of authors) authorMap[author.id] = author;
    }

    const enrichedPosts = posts.map((post: any) => ({
      ...post,
      author: authorMap[post.authorId] || null,
    }));

    const withTracks = await enrichPostsWithTracks(enrichedPosts);

    res.json({
      success: true,
      data: withTracks,
      pagination: { page: pageNum, limit: limitNum, total: posts.length },
    });
  } catch (error) {
    console.error("Error fetching following feed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch feed" });
  }
});

// GET /api/social/posts/music - Get music-only feed (posts with tracks)
router.get("/posts/music", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, sort = "recent" } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const posts = await db
      .select()
      .from(socialPosts)
      .where(
        and(
          isNull(socialPosts.deletedAt),
          eq(socialPosts.postType, "music_post"),
        ),
      )
      .orderBy(
        sort === "trending"
          ? desc(socialPosts.engagementScore)
          : desc(socialPosts.createdAt),
      )
      .limit(limitNum)
      .offset(offset);

    const authorIds = [...new Set(posts.map((p: any) => p.authorId))];
    let authorMap: Record<number, any> = {};
    if (authorIds.length > 0) {
      const authors = await db
        .select()
        .from(socialUsers)
        .where(inArray(socialUsers.id, authorIds));
      for (const author of authors) authorMap[author.id] = author;
    }

    const enrichedPosts = posts.map((post: any) => ({
      ...post,
      author: authorMap[post.authorId] || null,
    }));

    const withTracks = await enrichPostsWithTracks(enrichedPosts);

    res.json({
      success: true,
      data: withTracks,
      pagination: { page: pageNum, limit: limitNum, total: posts.length },
    });
  } catch (error) {
    console.error("Error fetching music feed:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch music feed" });
  }
});

// POST /api/social/posts - Create new post
router.post("/posts", async (req: Request, res: Response) => {
  try {
    const appUserId = req.user?.userId;
    const {
      content,
      imageUrls,
      videoUrl,
      allowMediaDownload = false,
      tags,
      postType = "discussion",
      trackId,
    } = req.body;

    if (!appUserId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required to post",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: content",
      });
    }

    if (!ALLOWED_POST_TYPES.includes(postType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid postType. Must be one of: ${ALLOWED_POST_TYPES.join(", ")}`,
      });
    }

    // Validate track exists and is published if attaching one
    if (trackId) {
      const track = await getTrackInfo(Number(trackId));
      if (!track) {
        return res.status(400).json({
          success: false,
          error: "Track not found or not published",
        });
      }
    }

    const authorId = await getSocialProfileId(Number(appUserId));
    const newPost = await db
      .insert(socialPosts)
      .values({
        authorId: Number(authorId),
        content,
        imageUrls,
        videoUrl: videoUrl || null,
        allowMediaDownload: Boolean(allowMediaDownload),
        tags,
        postType,
        trackId: trackId ? Number(trackId) : null,
        mediaType: trackId
          ? "audio"
          : videoUrl
            ? "video"
            : imageUrls
              ? "image"
              : "text",
      })
      .returning();

    await recordSocialAudit({
      actorUserId: appUserId,
      postId: newPost[0]?.id,
      eventType: "media_download_permission",
      outcome: allowMediaDownload ? "enabled" : "disabled",
    });

    res.status(201).json({
      success: true,
      data: newPost[0],
      message: "Post created successfully",
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ success: false, error: "Failed to create post" });
  }
});

// POST /api/social/audit/screenshot - record a visual audit capture
router.post("/audit/screenshot", async (req: Request, res: Response) => {
  try {
    await recordSocialAudit({
      actorUserId: req.user?.userId,
      eventType: "screenshot_capture",
      outcome: "captured",
      metadata: {
        path: typeof req.body?.path === "string" ? req.body.path : "unknown",
        viewport:
          typeof req.body?.viewport === "string"
            ? req.body.viewport
            : "unknown",
        theme: typeof req.body?.theme === "string" ? req.body.theme : "unknown",
      },
    });
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error recording screenshot audit:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to record screenshot audit" });
  }
});

// GET /api/social/posts/:postId/media-download - authorize post media download
router.get(
  "/posts/:postId/media-download",
  async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.postId);
      const [post] = await db
        .select({
          imageUrls: socialPosts.imageUrls,
          videoUrl: socialPosts.videoUrl,
          allowMediaDownload: socialPosts.allowMediaDownload,
        })
        .from(socialPosts)
        .where(and(eq(socialPosts.id, postId), isNull(socialPosts.deletedAt)))
        .limit(1);

      if (!post || !post.allowMediaDownload) {
        return res.status(403).json({
          success: false,
          error: "The author has disabled media downloads",
        });
      }

      const mediaUrl = post.videoUrl || post.imageUrls?.[0];
      if (!mediaUrl)
        return res
          .status(404)
          .json({ success: false, error: "No downloadable media found" });
      return res.redirect(mediaUrl);
    } catch (error) {
      console.error("Error authorizing media download:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to authorize media download" });
    }
  },
);

// GET /api/social/posts/:postId/media-download - authorize post media download
router.get(
  "/posts/:postId/media-download",
  async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.postId);
      const [post] = await db
        .select({
          imageUrls: socialPosts.imageUrls,
          videoUrl: socialPosts.videoUrl,
          allowMediaDownload: socialPosts.allowMediaDownload,
        })
        .from(socialPosts)
        .where(and(eq(socialPosts.id, postId), isNull(socialPosts.deletedAt)))
        .limit(1);
      if (!post || !post.allowMediaDownload) {
        await recordSocialAudit({
          actorUserId: req.user?.userId,
          postId,
          eventType: "media_download",
          outcome: "denied",
        });
        return res
          .status(403)
          .json({
            success: false,
            error: "The author has disabled media downloads",
          });
      }
      const mediaUrl = post.videoUrl || post.imageUrls?.[0];
      if (!mediaUrl)
        return res
          .status(404)
          .json({ success: false, error: "No downloadable media found" });
      await recordSocialAudit({
        actorUserId: req.user?.userId,
        postId,
        eventType: "media_download",
        outcome: "allowed",
      });
      return res.redirect(mediaUrl);
    } catch (error) {
      console.error("Error authorizing media download:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to authorize media download" });
    }
  },
);

// POST /api/social/posts/:postId/share - record a successful share
router.post("/posts/:postId/share", async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.postId);
    const [updatedPost] = await db
      .update(socialPosts)
      .set({ shareCount: sql`COALESCE(${socialPosts.shareCount}, 0) + 1` })
      .where(and(eq(socialPosts.id, postId), isNull(socialPosts.deletedAt)))
      .returning({ shareCount: socialPosts.shareCount });
    if (!updatedPost)
      return res.status(404).json({ success: false, error: "Post not found" });
    await recordSocialAudit({
      actorUserId: req.user?.userId,
      postId,
      eventType: "post_share",
      outcome: "success",
    });
    return res.json({ success: true, shareCount: updatedPost.shareCount });
  } catch (error) {
    console.error("Error recording share:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to record share" });
  }
});

// GET /api/social/posts/:postId - Get single post with comments
router.get("/posts/:postId", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, parseInt(postId)))
      .limit(1);

    if (!post.length) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    const comments = await db
      .select()
      .from(socialComments)
      .where(
        and(
          eq(socialComments.postId, parseInt(postId)),
          isNull(socialComments.deletedAt),
        ),
      )
      .orderBy(desc(socialComments.createdAt));

    res.json({
      success: true,
      data: {
        ...post[0],
        comments,
      },
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, error: "Failed to fetch post" });
  }
});

// ============================================
// LIKES ENDPOINTS
// ============================================

// POST /api/social/posts/:postId/like - Like a post
router.post("/posts/:postId/like", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const appUserId = req.user?.userId;

    if (!appUserId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const userId = await getSocialProfileId(Number(appUserId));

    // Check if already liked
    const existingLike = await db
      .select()
      .from(socialLikes)
      .where(
        and(
          eq(socialLikes.userId, userId),
          eq(socialLikes.postId, parseInt(postId)),
        ),
      )
      .limit(1);

    if (existingLike.length) {
      return res
        .status(400)
        .json({ success: false, error: "Already liked this post" });
    }

    // Add like
    await db.insert(socialLikes).values({
      userId,
      postId: parseInt(postId),
      likeType: "post",
    });

    // Update post like count
    const post = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, parseInt(postId)))
      .limit(1);

    const updatedPost = await db
      .update(socialPosts)
      .set({
        likeCount: (post[0].likeCount || 0) + 1,
        engagementScore: (
          ((typeof post[0].engagementScore === "string"
            ? parseFloat(post[0].engagementScore)
            : post[0].engagementScore) || 0) + 1
        ).toFixed(2),
      })
      .where(eq(socialPosts.id, parseInt(postId)))
      .returning();

    // Create notification for post author (don't notify yourself)
    if (post[0] && post[0].authorId !== userId) {
      try {
        const [postAuthor] = await db
          .select({ userId: socialUsers.userId })
          .from(socialUsers)
          .where(eq(socialUsers.id, post[0].authorId))
          .limit(1);

        const [likerInfo] = await db
          .select({
            name: users.displayName,
          })
          .from(users)
          .where(eq(users.id, Number(appUserId)))
          .limit(1);

        if (postAuthor && likerInfo) {
          await notifyLike({
            likerId: Number(appUserId),
            postAuthorId: postAuthor.userId,
            likerName: likerInfo.name || "Someone",
            postId: parseInt(postId),
          });
        }
      } catch (notifError) {
        console.error("[LIKE] Failed to create notification:", notifError);
      }
    }

    res.json({
      success: true,
      data: updatedPost[0],
      message: "Post liked successfully",
    });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ success: false, error: "Failed to like post" });
  }
});

// DELETE /api/social/posts/:postId/like - Unlike a post
router.delete("/posts/:postId/like", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const appUserId = req.user?.userId;

    if (!appUserId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const userId = await getSocialProfileId(Number(appUserId));

    await db
      .delete(socialLikes)
      .where(
        and(
          eq(socialLikes.userId, userId),
          eq(socialLikes.postId, parseInt(postId)),
        ),
      );

    // Update post like count
    const post = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, parseInt(postId)))
      .limit(1);

    const updatedPost = await db
      .update(socialPosts)
      .set({
        likeCount: Math.max(0, (post[0].likeCount || 1) - 1),
        engagementScore: Math.max(
          0,
          (parseFloat(post[0].engagementScore as unknown as string) || 1) - 1,
        ).toFixed(2),
      })
      .where(eq(socialPosts.id, parseInt(postId)))
      .returning();

    res.json({
      success: true,
      data: updatedPost[0],
      message: "Post unliked successfully",
    });
  } catch (error) {
    console.error("Error unliking post:", error);
    res.status(500).json({ success: false, error: "Failed to unlike post" });
  }
});

// ============================================
// COMMENTS ENDPOINTS
// ============================================

// POST /api/social/posts/:postId/comments - Add comment
router.post("/posts/:postId/comments", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const appUserId = req.user?.userId;
    const { content, parentCommentId } = req.body;

    if (!appUserId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: content",
      });
    }

    const trimmedContent = String(content).trim();
    const authorId = await getSocialProfileId(Number(appUserId));
    const newComment = await db
      .insert(socialComments)
      .values({
        postId: parseInt(postId),
        authorId,
        content: trimmedContent,
        parentCommentId,
      })
      .returning();

    // Update post comment count
    const post = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, parseInt(postId)))
      .limit(1);

    await db
      .update(socialPosts)
      .set({
        commentCount: (post[0].commentCount || 0) + 1,
        engagementScore: (
          (parseFloat(post[0].engagementScore as unknown as string) || 0) + 3
        ).toFixed(2), // Comment worth 3 points
      })
      .where(eq(socialPosts.id, parseInt(postId)));

    // Create notification for post author (don't notify yourself)
    if (post[0] && post[0].authorId !== authorId) {
      try {
        const [postAuthor] = await db
          .select({ userId: socialUsers.userId })
          .from(socialUsers)
          .where(eq(socialUsers.id, post[0].authorId))
          .limit(1);

        const [commenterInfo] = await db
          .select({
            name: users.displayName,
          })
          .from(users)
          .where(eq(users.id, Number(appUserId)))
          .limit(1);

        if (postAuthor && commenterInfo) {
          await notifyComment({
            commenterId: Number(appUserId),
            postAuthorId: postAuthor.userId,
            commenterName: commenterInfo.name || "Someone",
            postId: parseInt(postId),
            commentPreview: content,
          });
        }
      } catch (notifError) {
        console.error("[COMMENT] Failed to create notification:", notifError);
      }
    }

    res.status(201).json({
      success: true,
      data: Array.isArray(newComment) ? newComment[0] : newComment,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ success: false, error: "Failed to add comment" });
  }
});

// GET /api/social/posts/:postId/comments - Get all active comments for post
router.get("/posts/:postId/comments", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    const comments = await db
      .select()
      .from(socialComments)
      .where(
        and(
          eq(socialComments.postId, parseInt(postId)),
          isNull(socialComments.deletedAt),
        ),
      )
      .orderBy(desc(socialComments.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ success: false, error: "Failed to fetch comments" });
  }
});

// PATCH /api/social/posts/:postId/comments/:commentId - Update a comment
router.patch("/posts/:postId/comments/:commentId", async (req, res) => {
  try {
    const appUserId = req.user?.userId;
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const { content } = req.body;

    if (!appUserId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!trimmedContent) {
      return res.status(400).json({ success: false, error: "Comment content is required" });
    }

    const authorProfileId = await getSocialProfileId(Number(appUserId));
    const [existingComment] = await db
      .select()
      .from(socialComments)
      .where(
        and(
          eq(socialComments.id, commentId),
          eq(socialComments.postId, postId),
          eq(socialComments.authorId, authorProfileId),
          isNull(socialComments.deletedAt),
        ),
      )
      .limit(1);

    if (!existingComment) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    const [updatedComment] = await db
      .update(socialComments)
      .set({
        content: trimmedContent,
        isEdited: true,
        updatedAt: new Date(),
      })
      .where(eq(socialComments.id, commentId))
      .returning();

    res.json({ success: true, data: updatedComment, message: "Comment updated" });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ success: false, error: "Failed to update comment" });
  }
});

// DELETE /api/social/posts/:postId/comments/:commentId - Soft delete a comment
router.delete("/posts/:postId/comments/:commentId", async (req, res) => {
  try {
    const appUserId = req.user?.userId;
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);

    if (!appUserId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const authorProfileId = await getSocialProfileId(Number(appUserId));
    const [existingComment] = await db
      .select()
      .from(socialComments)
      .where(
        and(
          eq(socialComments.id, commentId),
          eq(socialComments.postId, postId),
          eq(socialComments.authorId, authorProfileId),
          isNull(socialComments.deletedAt),
        ),
      )
      .limit(1);

    if (!existingComment) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    const [deletedComment] = await db
      .update(socialComments)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(socialComments.id, commentId))
      .returning();

    const [postRow] = await db
      .select({ commentCount: socialPosts.commentCount })
      .from(socialPosts)
      .where(and(eq(socialPosts.id, postId), isNull(socialPosts.deletedAt)))
      .limit(1);

    if (postRow) {
      await db
        .update(socialPosts)
        .set({
          commentCount: Math.max(0, (postRow.commentCount || 0) - 1),
        })
        .where(eq(socialPosts.id, postId));
    }

    res.json({ success: true, data: deletedComment, message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ success: false, error: "Failed to delete comment" });
  }
});

// ============================================
// FOLLOW ENDPOINTS
// ============================================

// GET /api/social/follow/following - ids of the users the caller follows
router.get("/follow/following", async (req: Request, res: Response) => {
  try {
    const appUserId = req.user?.userId;
    if (!appUserId) {
      return res.json({ success: true, data: [] });
    }

    const followerId = await getSocialProfileId(Number(appUserId));
    const rows = await db
      .select({ appUserId: socialUsers.userId })
      .from(socialFollowers)
      .innerJoin(socialUsers, eq(socialUsers.id, socialFollowers.followingId))
      .where(eq(socialFollowers.followerId, followerId));

    res.json({
      success: true,
      data: rows.map((row) => row.appUserId).filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching following list:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch following list" });
  }
});

// POST /api/social/follow/:userId - Follow a user
router.post("/follow/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const appUserId = req.user?.userId;

    if (!appUserId) {
      return res.status(401).json({
        success: false,
        error: "Sign in to follow other members",
      });
    }

    const followerId = await getSocialProfileId(Number(appUserId));

    // ── Artist protection: non-artist users cannot follow artist accounts ──
    // Artists can view and link with users, but users cannot link with artists.
    // Users should use /api/streaming/follow for artist follows instead.
    try {
      const targetUser = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [parseInt(userId)],
      );
      const targetHasArtist = await pool.query(
        "SELECT id FROM artist_profiles WHERE user_id = $1 LIMIT 1",
        [parseInt(userId)],
      );
      if (
        targetUser.rows[0]?.role === "artist" ||
        targetHasArtist.rows.length > 0
      ) {
        // Check if the follower is also an artist — artists CAN follow other artists
        const followerUser = await pool.query(
          "SELECT role FROM users WHERE id = $1",
          [appUserId],
        );
        const followerHasArtist = await pool.query(
          "SELECT id FROM artist_profiles WHERE user_id = $1 LIMIT 1",
          [appUserId],
        );
        const followerIsArtist =
          followerUser.rows[0]?.role === "artist" ||
          followerHasArtist.rows.length > 0;

        if (!followerIsArtist) {
          return res.status(403).json({
            success: false,
            error: "Pour suivre un artiste, utilisez le portail streaming.",
            useStreamingFollow: true,
          });
        }
      }
    } catch (_artistCheckErr) {
      // If check fails, allow the follow to proceed
    }

    const followingId = await getSocialProfileId(parseInt(userId));

    if (followingId === followerId) {
      return res
        .status(400)
        .json({ success: false, error: "You cannot follow yourself" });
    }

    // Check if already following — following twice is a no-op, not an error
    const existingFollow = await db
      .select()
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followingId, followingId),
        ),
      )
      .limit(1);

    if (!existingFollow.length) {
      await db.insert(socialFollowers).values({ followerId, followingId });

      // Create notification for the followed user
      try {
        const [followerInfo] = await db
          .select({
            name: users.displayName,
          })
          .from(users)
          .where(eq(users.id, Number(appUserId)))
          .limit(1);

        if (followerInfo) {
          await notifyFollow({
            followerId: Number(appUserId),
            followingId: parseInt(userId),
            followerName: followerInfo.name || "Someone",
          });
        }
      } catch (notifError) {
        console.error("[FOLLOW] Failed to create notification:", notifError);
      }
    }

    await syncFollowerCount(followingId);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(socialFollowers)
      .where(eq(socialFollowers.followingId, followingId));

    res.json({
      success: true,
      following: true,
      followerCount: Number(count) || 0,
      message: "User followed successfully",
    });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ success: false, error: "Failed to follow user" });
  }
});

// DELETE /api/social/follow/:userId - Unfollow a user
router.delete("/follow/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const appUserId = req.user?.userId;

    if (!appUserId) {
      return res.status(401).json({
        success: false,
        error: "Sign in to manage the members you follow",
      });
    }

    const followerId = await getSocialProfileId(Number(appUserId));
    const followingId = await getSocialProfileId(parseInt(userId));

    await db
      .delete(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followingId, followingId),
        ),
      );

    await syncFollowerCount(followingId);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(socialFollowers)
      .where(eq(socialFollowers.followingId, followingId));

    res.json({
      success: true,
      following: false,
      followerCount: Number(count) || 0,
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ success: false, error: "Failed to unfollow user" });
  }
});

// ============================================
// USER ENDPOINTS
// ============================================

// GET /api/social/users/:userId - Get user profile
router.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const targetAppUserId = parseInt(req.params.userId, 10);

    if (!targetAppUserId || Number.isNaN(targetAppUserId)) {
      return res.status(400).json({ success: false, error: "Invalid user id" });
    }

    const [account] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        subscriptionTier: users.subscriptionTier,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, targetAppUserId))
      .limit(1);

    if (!account) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentAppUserId = req.user?.userId ? Number(req.user.userId) : null;
    const targetSocialId = await getSocialProfileId(targetAppUserId);
    const [socialProfile] = await db
      .select()
      .from(socialUsers)
      .where(eq(socialUsers.id, targetSocialId))
      .limit(1);

    if (!socialProfile) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let viewerSocialId: number | null = null;
    if (currentAppUserId) {
      viewerSocialId = await getSocialProfileId(currentAppUserId);
    }

    const [followerRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(socialFollowers)
      .where(eq(socialFollowers.followingId, targetSocialId));

    const [followingRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(socialFollowers)
      .where(eq(socialFollowers.followerId, targetSocialId));

    const [postStats] = await db
      .select({
        postCount: sql<number>`count(*)`,
        likeCount: sql<number>`coalesce(sum(${socialPosts.likeCount}), 0)`,
      })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.authorId, targetSocialId),
          isNull(socialPosts.deletedAt),
        ),
      );

    const [trackStats] = await db
      .select({
        trackCount: sql<number>`count(*)`,
        streamCount: sql<number>`coalesce(sum(${musicTracks.playCount}), 0)`,
      })
      .from(musicTracks)
      .where(eq(musicTracks.artistId, targetAppUserId));

    const artistCheck = await pool.query(
      "SELECT 1 FROM artist_profiles WHERE user_id = $1 LIMIT 1",
      [targetAppUserId],
    );

    let isFollowing = false;
    if (viewerSocialId && viewerSocialId !== targetSocialId) {
      const [followState] = await db
        .select({ id: socialFollowers.id })
        .from(socialFollowers)
        .where(
          and(
            eq(socialFollowers.followerId, viewerSocialId),
            eq(socialFollowers.followingId, targetSocialId),
          ),
        )
        .limit(1);
      isFollowing = Boolean(followState);
    }

    res.json({
      success: true,
      data: {
        id: account.id,
        userId: account.id,
        socialUserId: socialProfile.id,
        username: account.username,
        displayName:
          account.displayName || socialProfile.displayName || account.username,
        name:
          account.displayName || socialProfile.displayName || account.username,
        avatarUrl: socialProfile.avatarUrl ?? null,
        avatar: socialProfile.avatarUrl ?? null,
        bio: socialProfile.bio ?? null,
        location: socialProfile.location ?? null,
        website: socialProfile.website ?? null,
        profession: socialProfile.profession ?? null,
        role: account.role || "user",
        tier: account.subscriptionTier || "free",
        joinedAt: account.createdAt ?? null,
        isArtist: artistCheck.rows.length > 0,
        isFollowing,
        followerCount: Number(followerRow?.count) || 0,
        followingCount: Number(followingRow?.count) || 0,
        postCount: Number(postStats?.postCount) || 0,
        trackCount: Number(trackStats?.trackCount) || 0,
        streamCount: Number(trackStats?.streamCount) || 0,
        likeCount: Number(postStats?.likeCount) || 0,
        engagementScore: Number(socialProfile.engagementScore || 0),
        satisfactionRating: Number(socialProfile.satisfactionRating || 0),
        stats: {
          followerCount: Number(followerRow?.count) || 0,
          followingCount: Number(followingRow?.count) || 0,
          postCount: Number(postStats?.postCount) || 0,
          trackCount: Number(trackStats?.trackCount) || 0,
          streamCount: Number(trackStats?.streamCount) || 0,
          likeCount: Number(postStats?.likeCount) || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// ============================================
// USER CONTENT ENDPOINTS (for public profile tabs)
// ============================================

// GET /api/social/users/:userId/tracks - Get user's tracks
router.get("/users/:userId/tracks", async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    // Query music_tracks where artistId matches the user ID
    const tracks = await db
      .select({
        id: musicTracks.id,
        title: musicTracks.title,
        duration: musicTracks.duration,
        coverArt: musicTracks.coverArt,
        audioUrl: musicTracks.audioUrl,
        genre: musicTracks.genre,
        playCount: musicTracks.playCount,
        createdAt: musicTracks.createdAt,
      })
      .from(musicTracks)
      .where(eq(musicTracks.artistId, targetUserId))
      .orderBy(desc(musicTracks.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(musicTracks)
      .where(eq(musicTracks.artistId, targetUserId));

    res.json({
      success: true,
      data: tracks,
      meta: { total: totalResult?.count || 0, limit, offset },
    });
  } catch (error) {
    console.error("Error fetching user tracks:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tracks" });
  }
});

// GET /api/social/users/:userId/posts - Get user's posts
router.get("/users/:userId/posts", async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    // First get the social user ID for this app user
    const targetSocialId = await getSocialProfileId(targetUserId);

    // Query posts by authorId (social_users.id)
    const posts = await db
      .select()
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.authorId, targetSocialId),
          isNull(socialPosts.deletedAt),
        ),
      )
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.authorId, targetSocialId),
          isNull(socialPosts.deletedAt),
        ),
      );

    // Enrich with track info if applicable
    const enriched = await enrichPostsWithTracks(posts);

    res.json({
      success: true,
      data: enriched,
      meta: { total: totalResult?.count || 0, limit, offset },
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch posts" });
  }
});

export default router;

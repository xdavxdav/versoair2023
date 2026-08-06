// API Routes for Verso Air Social Blog - Phase 1
// These are skeleton endpoints to be implemented
// Location: server/routes/social-api.ts

import { Router, Request, Response } from "express";
import { db, pool } from "../../server/db";
import { desc, eq, isNull, and, inArray } from "drizzle-orm";
import {
  socialPosts,
  socialComments,
  socialLikes,
  socialFollowers,
  socialUsers,
  socialNotifications,
  socialPostAnalytics,
} from "../../shared/social-schema";

const router = Router();

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

    res.json({
      success: true,
      data: enrichedPosts,
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

// POST /api/social/posts - Create new post
router.post("/posts", async (req: Request, res: Response) => {
  try {
    // Use the authenticated user from JWT — never trust client-supplied
    // authorId (previously anyone could post as anyone by passing an
    // arbitrary authorId in the body).
    const appUserId = req.user?.userId;
    const { content, imageUrls, tags, postType = "discussion" } = req.body;

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

    const authorId = await getSocialProfileId(Number(appUserId));
    const newPost = await db
      .insert(socialPosts)
      .values({
        authorId: Number(authorId),
        content,
        imageUrls,
        tags,
        postType,
        mediaType: imageUrls ? "image" : "text",
      })
      .returning();

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
      .where(eq(socialComments.postId, parseInt(postId)))
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

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: content",
      });
    }

    const authorId = await getSocialProfileId(Number(appUserId));
    const newComment = await db
      .insert(socialComments)
      .values({
        postId: parseInt(postId),
        authorId,
        content,
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

// GET /api/social/posts/:postId/comments - Get all comments for post
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
      .where(eq(socialComments.postId, parseInt(postId)))
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

// ============================================
// FOLLOW ENDPOINTS
// ============================================

// POST /api/social/follow/:userId - Follow a user
router.post("/follow/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { followerId } = req.body;

    if (!followerId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing followerId" });
    }

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
          [followerId],
        );
        const followerHasArtist = await pool.query(
          "SELECT id FROM artist_profiles WHERE user_id = $1 LIMIT 1",
          [followerId],
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

    // Check if already following
    const existingFollow = await db
      .select()
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followingId, parseInt(userId)),
        ),
      )
      .limit(1);

    if (existingFollow.length) {
      return res
        .status(400)
        .json({ success: false, error: "Already following this user" });
    }

    // Add follow
    await db.insert(socialFollowers).values({
      followerId,
      followingId: parseInt(userId),
    });

    // Update counts
    await db
      .update(socialUsers)
      .set({
        followerCount:
          (
            await db
              .select()
              .from(socialFollowers)
              .where(eq(socialFollowers.followingId, parseInt(userId)))
          ).length + 1,
      })
      .where(eq(socialUsers.id, parseInt(userId)));

    res.json({
      success: true,
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
    const { followerId } = req.body;

    if (!followerId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing followerId" });
    }

    await db
      .delete(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followingId, parseInt(userId)),
        ),
      );

    res.json({
      success: true,
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
    const { userId } = req.params;

    const user = await db
      .select()
      .from(socialUsers)
      .where(eq(socialUsers.id, parseInt(userId)))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get user posts
    const posts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.authorId, parseInt(userId)));

    res.json({
      success: true,
      data: {
        ...user[0],
        postCount: posts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

export default router;

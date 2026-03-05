// API Routes for Verso Air Social Blog - Phase 1
// These are skeleton endpoints to be implemented
// Location: server/routes/social-api.ts

import { Router, Request, Response } from "express";
import { db } from "../../server/db";
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

// ============================================
// POSTS ENDPOINTS
// ============================================

// GET /api/social/posts - Get feed with pagination
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, sort = "recent" } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = db
      .select()
      .from(socialPosts)
      .where(isNull(socialPosts.deletedAt))
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
    const {
      authorId,
      content,
      imageUrls,
      tags,
      postType = "discussion",
    } = req.body;

    // Validation
    if (!authorId || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: authorId, content",
      });
    }

    const newPost = await db
      .insert(socialPosts)
      .values({
        authorId,
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }

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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }

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
    const { authorId, content, parentCommentId } = req.body;

    if (!authorId || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: authorId, content",
      });
    }

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

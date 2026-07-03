// FAQ API Routes
// Leverages shared social schema (socialPosts with postType='faq')
// Location: server/routes/faq-api.ts

import { Router, Request, Response } from "express";
import { db } from "../../server/db";
import { desc, eq, and, ilike, isNull, sql } from "drizzle-orm";
import {
  socialPosts,
  socialComments,
  socialUsers,
  socialLikes,
  faqCategories,
} from "../../shared/social-schema";

const router = Router();

// ============================================
// FAQ CATEGORIES
// ============================================

// GET /api/faq/categories - List all FAQ categories with post counts
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await db
      .select()
      .from(faqCategories)
      .orderBy(faqCategories.sortOrder);

    // If no categories exist, return defaults
    if (!categories.length) {
      const defaults = [
        {
          name: "general",
          label: "General",
          description: "General questions about the platform",
          icon: "HelpCircle",
          color: "cyan",
          sortOrder: 0,
        },
        {
          name: "account",
          label: "Account & Profile",
          description: "Account settings, login, and profile issues",
          icon: "User",
          color: "blue",
          sortOrder: 1,
        },
        {
          name: "billing",
          label: "Billing & Payments",
          description: "Invoices, subscriptions, and payment methods",
          icon: "CreditCard",
          color: "green",
          sortOrder: 2,
        },
        {
          name: "technical",
          label: "Technical Support",
          description: "Bug reports, errors, and technical issues",
          icon: "Wrench",
          color: "orange",
          sortOrder: 3,
        },
        {
          name: "business",
          label: "Business & Listings",
          description: "Managing your business listings and analytics",
          icon: "Building2",
          color: "purple",
          sortOrder: 4,
        },
        {
          name: "platform",
          label: "Platform Features",
          description: "How to use platform features and tools",
          icon: "Sparkles",
          color: "pink",
          sortOrder: 5,
        },
      ];

      return res.json({ success: true, data: defaults });
    }

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching FAQ categories:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch categories" });
  }
});

// ============================================
// FAQ POSTS (filtered socialPosts with postType='faq')
// ============================================

// GET /api/faq - List FAQ topics with pagination, search, and category filter
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 15,
      search,
      category,
      sort = "recent",
      resolved,
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 15;
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions: any[] = [
      eq(socialPosts.postType, "faq"),
      isNull(socialPosts.deletedAt),
    ];

    if (search) {
      conditions.push(
        sql`(${ilike(socialPosts.title, `${search}%`)} OR ${ilike(socialPosts.content, `${search}%`)})`,
      );
    }

    if (category && category !== "all") {
      conditions.push(eq(socialPosts.faqCategory, category as string));
    }

    if (resolved === "true") {
      conditions.push(eq(socialPosts.isResolved, true));
    } else if (resolved === "false") {
      conditions.push(eq(socialPosts.isResolved, false));
    }

    // Determine ordering
    const orderBy =
      sort === "popular"
        ? desc(socialPosts.viewCount)
        : sort === "most-replies"
          ? desc(socialPosts.commentCount)
          : desc(socialPosts.createdAt);

    const posts = await db
      .select()
      .from(socialPosts)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    // Enrich with author info
    const enrichedPosts = await Promise.all(
      posts.map(async (post: any) => {
        const author = await db
          .select()
          .from(socialUsers)
          .where(eq(socialUsers.id, post.authorId))
          .limit(1);

        return {
          ...post,
          author: author[0] || {
            displayName: "Anonymous",
            verifiedBadge: false,
          },
        };
      }),
    );

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(and(...conditions));

    const total = Number(totalResult[0]?.count || 0);

    res.json({
      success: true,
      data: enrichedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching FAQ posts:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch FAQ topics" });
  }
});

// GET /api/faq/search - Quick search for FAQ (used by search modal)
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const limitNum = parseInt(limit as string) || 5;

    const results = await db
      .select({
        id: socialPosts.id,
        title: socialPosts.title,
        faqCategory: socialPosts.faqCategory,
        commentCount: socialPosts.commentCount,
        isResolved: socialPosts.isResolved,
        createdAt: socialPosts.createdAt,
      })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.postType, "faq"),
          isNull(socialPosts.deletedAt),
          sql`(${ilike(socialPosts.title, `${q}%`)} OR ${ilike(socialPosts.content, `${q}%`)})`,
        ),
      )
      .orderBy(desc(socialPosts.viewCount))
      .limit(limitNum);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error searching FAQ:", error);
    res.status(500).json({ success: false, error: "Failed to search FAQ" });
  }
});

// GET /api/faq/:id - Get single FAQ topic with threaded replies
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);

    const post = await db
      .select()
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.id, postId),
          eq(socialPosts.postType, "faq"),
          isNull(socialPosts.deletedAt),
        ),
      )
      .limit(1);

    if (!post.length) {
      return res
        .status(404)
        .json({ success: false, error: "FAQ topic not found" });
    }

    // Get author
    const author = await db
      .select()
      .from(socialUsers)
      .where(eq(socialUsers.id, post[0].authorId))
      .limit(1);

    // Get all comments (replies) with authors
    const comments = await db
      .select()
      .from(socialComments)
      .where(
        and(
          eq(socialComments.postId, postId),
          isNull(socialComments.deletedAt),
        ),
      )
      .orderBy(desc(socialComments.likeCount), socialComments.createdAt);

    const enrichedComments = await Promise.all(
      comments.map(async (comment: any) => {
        const commentAuthor = await db
          .select()
          .from(socialUsers)
          .where(eq(socialUsers.id, comment.authorId))
          .limit(1);

        return {
          ...comment,
          author: commentAuthor[0] || {
            displayName: "Anonymous",
            verifiedBadge: false,
          },
        };
      }),
    );

    // Build threaded structure: top-level replies + nested replies
    const topLevel = enrichedComments.filter((c: any) => !c.parentCommentId);
    const nested = enrichedComments.filter((c: any) => c.parentCommentId);

    const threadedReplies = topLevel.map((reply: any) => ({
      ...reply,
      replies: nested.filter((n: any) => n.parentCommentId === reply.id),
    }));

    // Increment view count
    await db
      .update(socialPosts)
      .set({ viewCount: sql`${socialPosts.viewCount} + 1` })
      .where(eq(socialPosts.id, postId));

    res.json({
      success: true,
      data: {
        ...post[0],
        author: author[0] || { displayName: "Anonymous", verifiedBadge: false },
        replies: threadedReplies,
        totalReplies: comments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching FAQ topic:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch FAQ topic" });
  }
});

// POST /api/faq - Create a new FAQ topic
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      authorId,
      title,
      content,
      faqCategory = "general",
      tags,
    } = req.body;

    if (!authorId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: authorId, title, content",
      });
    }

    const newPost = await db
      .insert(socialPosts)
      .values({
        authorId,
        title,
        content,
        postType: "faq",
        faqCategory,
        tags,
        mediaType: "text",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newPost[0],
      message: "FAQ topic created successfully",
    });
  } catch (error) {
    console.error("Error creating FAQ topic:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create FAQ topic" });
  }
});

// POST /api/faq/:id/reply - Reply to a FAQ topic
router.post("/:id/reply", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);
    const { authorId, content, parentCommentId } = req.body;

    if (!authorId || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: authorId, content",
      });
    }

    // Verify the FAQ post exists
    const post = await db
      .select()
      .from(socialPosts)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.postType, "faq")))
      .limit(1);

    if (!post.length) {
      return res
        .status(404)
        .json({ success: false, error: "FAQ topic not found" });
    }

    const newComment = await db
      .insert(socialComments)
      .values({
        postId,
        authorId,
        content,
        parentCommentId: parentCommentId || null,
      })
      .returning();

    // Update reply count on post
    await db
      .update(socialPosts)
      .set({ commentCount: sql`${socialPosts.commentCount} + 1` })
      .where(eq(socialPosts.id, postId));

    // If replying to a comment, update its reply count
    if (parentCommentId) {
      await db
        .update(socialComments)
        .set({ replyCount: sql`${socialComments.replyCount} + 1` })
        .where(eq(socialComments.id, parentCommentId));
    }

    res.status(201).json({
      success: true,
      data: (newComment as any[])[0],
      message: "Reply posted successfully",
    });
  } catch (error) {
    console.error("Error posting reply:", error);
    res.status(500).json({ success: false, error: "Failed to post reply" });
  }
});

// POST /api/faq/:id/resolve - Mark FAQ as resolved
router.post("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);

    const updated = await db
      .update(socialPosts)
      .set({ isResolved: true, updatedAt: new Date() })
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.postType, "faq")))
      .returning();

    if (!updated.length) {
      return res
        .status(404)
        .json({ success: false, error: "FAQ topic not found" });
    }

    res.json({
      success: true,
      data: updated[0],
      message: "FAQ topic marked as resolved",
    });
  } catch (error) {
    console.error("Error resolving FAQ:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to resolve FAQ topic" });
  }
});

export default router;

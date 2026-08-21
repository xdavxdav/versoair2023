// Enhanced Verso Air Social Blog Schema
// This extends the existing versoair_business_intelligence database
// PostgreSQL + Drizzle ORM

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// ============================================
// USERS (Extended from existing)
// ============================================
export const socialUsers = pgTable(
  "social_users",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // References existing users table
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    coverImageUrl: text("cover_image_url"),
    location: text("location"),
    website: text("website"),
    profession: text("profession"), // e.g., "Business Owner", "Entrepreneur"
    company: text("company"),
    followerCount: integer("follower_count").default(0),
    followingCount: integer("following_count").default(0),
    postCount: integer("post_count").default(0),
    engagementScore: decimal("engagement_score", {
      precision: 10,
      scale: 2,
    }).default("0"),
    satisfactionRating: decimal("satisfaction_rating", {
      precision: 3,
      scale: 2,
    }).default("0"), // 0-5
    verifiedBadge: boolean("verified_badge").default(false),
    premiumMember: boolean("premium_member").default(false),
    darkModeEnabled: boolean("dark_mode_enabled").default(true),
    notificationsEnabled: boolean("notifications_enabled").default(true),
    privacyLevel: text("privacy_level").default("public"), // public, friends, private
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastActiveAt: timestamp("last_active_at"),
  },
  (t) => ({
    userIdIdx: index("social_users_user_id_idx").on(t.userId),
    usernameIdx: uniqueIndex("social_users_username_idx").on(t.username),
    engagementScoreIdx: index("social_users_engagement_score_idx").on(
      t.engagementScore,
    ),
  }),
);

// ============================================
// POSTS
// ============================================
export const socialPosts = pgTable(
  "social_posts",
  {
    id: serial("id").primaryKey(),
    authorId: integer("author_id")
      .notNull()
      .references(() => socialUsers.id),
    title: text("title"), // Required for FAQ posts, optional for blog
    content: text("content").notNull(),
    imageUrls: text("image_urls").array(), // Array of image URLs
    videoUrl: text("video_url"),
    mediaType: text("media_type"), // text, image, video, link
    postType: text("post_type").default("discussion"), // discussion, job, trend, announcement, faq
    faqCategory: text("faq_category"), // For FAQ posts: general, account, billing, technical, business, platform
    isResolved: boolean("is_resolved").default(false), // For FAQ: mark as answered
    tags: text("tags").array(), // Searchable tags
    mentionedUsers: integer("mentioned_users").array(), // User IDs mentioned
    likeCount: integer("like_count").default(0),
    commentCount: integer("comment_count").default(0),
    shareCount: integer("share_count").default(0),
    viewCount: integer("view_count").default(0),
    engagementScore: decimal("engagement_score", {
      precision: 10,
      scale: 2,
    }).default("0"),
    engagementRate: decimal("engagement_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),
    isTrending: boolean("is_trending").default(false),
    isPinned: boolean("is_pinned").default(false),
    isEdited: boolean("is_edited").default(false),
    editHistory: jsonb("edit_history"), // Array of {editedAt, content}
    metadata: jsonb("metadata"), // Additional data, analytics, A/B test flags
    // Attached music track — makes any post an instantly-playable music share
    trackId: integer("track_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  (t) => ({
    authorIdIdx: index("social_posts_author_id_idx").on(t.authorId),
    createdAtIdx: index("social_posts_created_at_idx").on(t.createdAt),
    engagementScoreIdx: index("social_posts_engagement_score_idx").on(
      t.engagementScore,
    ),
    isTrendingIdx: index("social_posts_is_trending_idx").on(t.isTrending),
    tagsIdx: index("social_posts_tags_idx").on(t.tags),
    postTypeIdx: index("social_posts_post_type_idx").on(t.postType),
    faqCategoryIdx: index("social_posts_faq_category_idx").on(t.faqCategory),
    trackIdIdx: index("social_posts_track_id_idx").on(t.trackId),
  }),
);

// ============================================
// FAQ CATEGORIES
// ============================================
export const faqCategories = pgTable("faq_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // general, account, billing, technical, business, platform
  label: text("label").notNull(), // Display name: "General", "Account & Profile", etc.
  description: text("description"),
  icon: text("icon"), // Lucide icon name
  color: text("color"), // Tailwind color class
  sortOrder: integer("sort_order").default(0),
  postCount: integer("post_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// COMMENTS
// ============================================
let socialComments: any;
socialComments = pgTable(
  "social_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPosts.id),
    authorId: integer("author_id")
      .notNull()
      .references(() => socialUsers.id),
    parentCommentId: integer("parent_comment_id").references(
      (): any => socialComments.id,
    ), // For nested replies
    content: text("content").notNull(),
    likeCount: integer("like_count").default(0),
    replyCount: integer("reply_count").default(0),
    isEdited: boolean("is_edited").default(false),
    editHistory: jsonb("edit_history"),
    mentionedUsers: integer("mentioned_users").array(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    postIdIdx: index("social_comments_post_id_idx").on(t.postId),
    authorIdIdx: index("social_comments_author_id_idx").on(t.authorId),
    parentCommentIdIdx: index("social_comments_parent_comment_id_idx").on(
      t.parentCommentId,
    ),
    createdAtIdx: index("social_comments_created_at_idx").on(t.createdAt),
  }),
);
export { socialComments };

// ============================================
// LIKES
// ============================================
export const socialLikes = pgTable(
  "social_likes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => socialUsers.id),
    postId: integer("post_id").references(() => socialPosts.id),
    commentId: integer("comment_id").references(() => socialComments.id),
    likeType: text("like_type").default("post"), // post, comment
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdIdx: index("social_likes_user_id_idx").on(t.userId),
    postIdIdx: index("social_likes_post_id_idx").on(t.postId),
    commentIdIdx: index("social_likes_comment_id_idx").on(t.commentId),
    uniqueLike: uniqueIndex("social_likes_unique").on(
      t.userId,
      t.postId,
      t.commentId,
    ),
  }),
);

// ============================================
// FOLLOWERS/FOLLOWING
// ============================================
export const socialFollowers = pgTable(
  "social_followers",
  {
    id: serial("id").primaryKey(),
    followerId: integer("follower_id")
      .notNull()
      .references(() => socialUsers.id),
    followingId: integer("following_id")
      .notNull()
      .references(() => socialUsers.id),
    isClose: boolean("is_close").default(false), // Close friend/priority notifications
    isMuted: boolean("is_muted").default(false), // Mute notifications
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    followerIdIdx: index("social_followers_follower_id_idx").on(t.followerId),
    followingIdIdx: index("social_followers_following_id_idx").on(
      t.followingId,
    ),
    uniqueFollow: uniqueIndex("social_followers_unique").on(
      t.followerId,
      t.followingId,
    ),
  }),
);

// ============================================
// NOTIFICATIONS
// ============================================
export const socialNotifications = pgTable(
  "social_notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => socialUsers.id),
    fromUserId: integer("from_user_id").references(() => socialUsers.id), // Who triggered it
    postId: integer("post_id").references(() => socialPosts.id),
    commentId: integer("comment_id").references(() => socialComments.id),
    notificationType: text("notification_type").notNull(), // like, comment, follow, mention, share
    message: text("message").notNull(),
    data: jsonb("data"), // Extra context
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    readAt: timestamp("read_at"),
  },
  (t) => ({
    userIdIdx: index("social_notifications_user_id_idx").on(t.userId),
    isReadIdx: index("social_notifications_is_read_idx").on(t.isRead),
    createdAtIdx: index("social_notifications_created_at_idx").on(t.createdAt),
  }),
);

// ============================================
// ANALYTICS & ENGAGEMENT
// ============================================
export const socialPostAnalytics = pgTable(
  "social_post_analytics",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPosts.id),
    viewCount: integer("view_count").default(0),
    clickCount: integer("click_count").default(0),
    shareCount: integer("share_count").default(0),
    saveCount: integer("save_count").default(0),
    engagementScore: decimal("engagement_score", {
      precision: 10,
      scale: 2,
    }).default("0"),
    sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }), // -1 to 1
    reachCount: integer("reach_count").default(0),
    impressionCount: integer("impression_count").default(0),
    impressionFromFollowers: integer("impression_from_followers").default(0),
    metricsDate: timestamp("metrics_date").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    postIdIdx: index("social_post_analytics_post_id_idx").on(t.postId),
    metricsDateIdx: index("social_post_analytics_metrics_date_idx").on(
      t.metricsDate,
    ),
  }),
);

export const socialUserAnalytics = pgTable(
  "social_user_analytics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => socialUsers.id),
    totalPosts: integer("total_posts").default(0),
    totalLikes: integer("total_likes").default(0),
    totalComments: integer("total_comments").default(0),
    totalShares: integer("total_shares").default(0),
    averageEngagementPerPost: decimal("average_engagement_per_post", {
      precision: 10,
      scale: 2,
    }).default("0"),
    followerGrowthRate: decimal("follower_growth_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),
    engagementRate: decimal("engagement_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),
    satisfactionScore: decimal("satisfaction_score", {
      precision: 3,
      scale: 2,
    }).default("0"), // Based on positive engagement
    tierLevel: text("tier_level").default("bronze"), // bronze, silver, gold, platinum
    analyticsDate: timestamp("analytics_date").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdIdx: index("social_user_analytics_user_id_idx").on(t.userId),
    analyticsDateIdx: index("social_user_analytics_analytics_date_idx").on(
      t.analyticsDate,
    ),
  }),
);

// ============================================
// AI RECOMMENDATIONS
// ============================================
export const aiRecommendations = pgTable(
  "ai_recommendations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => socialUsers.id),
    recommendedPostId: integer("recommended_post_id")
      .notNull()
      .references(() => socialPosts.id),
    recommendationReason: text("recommendation_reason"), // "Based on posts you liked", etc.
    relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }), // 0-1
    clicked: boolean("clicked").default(false),
    liked: boolean("liked").default(false),
    saved: boolean("saved").default(false),
    dismissedAt: timestamp("dismissed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"), // 24h expiry
  },
  (t) => ({
    userIdIdx: index("ai_recommendations_user_id_idx").on(t.userId),
    relevanceScoreIdx: index("ai_recommendations_relevance_score_idx").on(
      t.relevanceScore,
    ),
  }),
);

// ============================================
// TRENDING TOPICS
// ============================================
export const trendingTopics = pgTable(
  "trending_topics",
  {
    id: serial("id").primaryKey(),
    topic: text("topic").notNull().unique(),
    postCount: integer("post_count").default(0),
    engagementScore: decimal("engagement_score", {
      precision: 10,
      scale: 2,
    }).default("0"),
    growthRate: decimal("growth_rate", { precision: 5, scale: 2 }).default("0"),
    isTrending: boolean("is_trending").default(false),
    trendRank: integer("trend_rank"),
    category: text("category"), // business, tech, general, etc.
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    topicIdx: uniqueIndex("trending_topics_topic_idx").on(t.topic),
    trendRankIdx: index("trending_topics_trend_rank_idx").on(t.trendRank),
  }),
);

// ============================================
// SAVED POSTS (Bookmarks)
// ============================================
export const savedPosts = pgTable(
  "saved_posts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => socialUsers.id),
    postId: integer("post_id")
      .notNull()
      .references(() => socialPosts.id),
    collectionName: text("collection_name").default("Saved"), // For organizing bookmarks
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdIdx: index("saved_posts_user_id_idx").on(t.userId),
    postIdIdx: index("saved_posts_post_id_idx").on(t.postId),
    uniqueSave: uniqueIndex("saved_posts_unique").on(t.userId, t.postId),
  }),
);

// ============================================
// RELATIONS
// ============================================
export const socialUsersRelations = relations(socialUsers, ({ many }) => ({
  posts: many(socialPosts),
  comments: many(socialComments),
  likes: many(socialLikes),
  followers: many(socialFollowers, { relationName: "followers" }),
  following: many(socialFollowers, { relationName: "following" }),
  notifications: many(socialNotifications),
  recommendations: many(aiRecommendations),
  savedPosts: many(savedPosts),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  author: one(socialUsers, {
    fields: [socialPosts.authorId],
    references: [socialUsers.id],
  }),
  comments: many(socialComments),
  likes: many(socialLikes),
  analytics: many(socialPostAnalytics),
  recommendations: many(aiRecommendations),
  savedBy: many(savedPosts),
}));

export const socialCommentsRelations = relations(
  socialComments,
  ({ one, many }) => ({
    post: one(socialPosts, {
      fields: [socialComments.postId],
      references: [socialPosts.id],
    }),
    author: one(socialUsers, {
      fields: [socialComments.authorId],
      references: [socialUsers.id],
    }),
    parentComment: one(socialComments, {
      fields: [socialComments.parentCommentId],
      references: [socialComments.id],
      relationName: "parentComment",
    }),
    replies: many(socialComments, { relationName: "parentComment" }),
    likes: many(socialLikes),
  }),
);

export const socialLikesRelations = relations(socialLikes, ({ one }) => ({
  user: one(socialUsers, {
    fields: [socialLikes.userId],
    references: [socialUsers.id],
  }),
  post: one(socialPosts, {
    fields: [socialLikes.postId],
    references: [socialPosts.id],
  }),
  comment: one(socialComments, {
    fields: [socialLikes.commentId],
    references: [socialComments.id],
  }),
}));

export const socialFollowersRelations = relations(
  socialFollowers,
  ({ one }) => ({
    follower: one(socialUsers, {
      fields: [socialFollowers.followerId],
      references: [socialUsers.id],
      relationName: "followers",
    }),
    following: one(socialUsers, {
      fields: [socialFollowers.followingId],
      references: [socialUsers.id],
      relationName: "following",
    }),
  }),
);

// ============================================
// ZODSCHEMAS
// ============================================
export const insertSocialUserSchema = createInsertSchema(socialUsers);
export const insertSocialPostSchema = createInsertSchema(socialPosts);
export const insertSocialCommentSchema = createInsertSchema(socialComments);
export const insertSocialLikeSchema = createInsertSchema(socialLikes);
export const insertSocialFollowerSchema = createInsertSchema(socialFollowers);
export const insertSocialNotificationSchema =
  createInsertSchema(socialNotifications);
export const insertAiRecommendationSchema =
  createInsertSchema(aiRecommendations);
export const insertTrendingTopicSchema = createInsertSchema(trendingTopics);
export const insertSavedPostSchema = createInsertSchema(savedPosts);
export const insertFaqCategorySchema = createInsertSchema(faqCategories);

// Type exports
export type SocialUser = typeof socialUsers.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type SocialComment = typeof socialComments.$inferSelect;
export type FaqCategory = typeof faqCategories.$inferSelect;
export type InsertFaqCategory = typeof faqCategories.$inferInsert;

/**
 * Inbox API — Support Tickets + Business Networking
 *
 * Tier access rules:
 *   free        → support read + view-only; cannot create business_network threads
 *   essential   → support + 1 active business_network thread, 10 messages/day
 *   verified    → support (priority) + 5 concurrent business_network threads
 *   max         → support (fast-track) + unlimited threads
 *   enterprise  → all of max + dedicated priority label
 *
 * All endpoints require auth (globalAuthGate enforces JWT).
 * The SSE support stream is in ai-chat.ts (/api/ai/support/stream).
 */

import { Router, Request, Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { socialPosts } from "@shared/social-schema";
import { enqueueInboxMessage, drainInboxQueue } from "../services/redis-client";
import { marketplaceMessageLimiter } from "../middleware/rate-limiter";
import { notificationEmitter } from "../services/notification-service";

const router = Router();

// ─── Tier helpers ─────────────────────────────────────────────────────────────

type TierKey = "free" | "essential" | "verified" | "max" | "enterprise";

const TIER_NETWORKING_LIMIT: Record<TierKey, number> = {
  free: 0,
  essential: 1,
  verified: 5,
  max: 999,
  enterprise: 999,
};

const TIER_DAILY_MSG_LIMIT: Record<TierKey, number> = {
  free: 0,
  essential: 10,
  verified: 999,
  max: 999,
  enterprise: 999,
};

function getTierFromUser(user: any): TierKey {
  if (user.role === "superuser") return "enterprise";
  return (user.subscriptionTier as TierKey) || "free";
}

function priority(tier: TierKey): string {
  if (tier === "enterprise") return "priority";
  if (tier === "max") return "priority";
  if (tier === "verified") return "high";
  return "normal";
}

// ─── Cross-account mirroring ──────────────────────────────────────────────────
// Conversations are one-sided rows (owned by userId, pointing at participantId).
// Without a mirror, the OTHER side of a marketplace/music_artist DM never sees
// anything — this is the actual reason two accounts couldn't "communicate".
// Only mirrors when participantId resolves to a real numeric user (never for
// "support" or business-only ids that don't map to a user account).
async function getOrCreateMirrorConversation(
  recipientUserId: number,
  senderUserId: number,
  senderName: string,
  senderAvatar: string | null,
  type: string,
  businessId?: number | null,
): Promise<number | null> {
  const [existing] = await db
    .select({ id: schema.inboxConversations.id })
    .from(schema.inboxConversations)
    .where(
      and(
        eq(schema.inboxConversations.userId, recipientUserId),
        eq(schema.inboxConversations.participantId, String(senderUserId)),
        eq(schema.inboxConversations.type, type),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  const [conv] = await db
    .insert(schema.inboxConversations)
    .values({
      userId: recipientUserId,
      type,
      participantId: String(senderUserId),
      participantName: senderName,
      participantAvatar: senderAvatar || null,
      businessId: businessId ? Number(businessId) : null,
      unreadCount: 0,
    })
    .returning({ id: schema.inboxConversations.id });

  return conv?.id ?? null;
}

async function resolveUserDisplay(
  userId: number,
): Promise<{ name: string; avatar: string | null } | null> {
  const [u] = await db
    .select({
      displayName: schema.users.displayName,
      username: schema.users.username,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!u) return null;
  return { name: u.displayName || u.username, avatar: null };
}

// ─── GET /api/inbox/conversations ────────────────────────────────────────────
// List all conversations for the logged-in user, newest first.
// Automatically drains any queued messages from Redis into the DB on open.
router.get("/conversations", async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    // Drain any Redis-queued messages that arrived while DB was down
    const queued = await drainInboxQueue(userId);
    for (const item of queued) {
      if (item.conversationId && item.content) {
        try {
          await db.insert(schema.inboxMessages).values({
            conversationId: Number(item.conversationId),
            senderId: String(item.senderId ?? "support"),
            senderName: String(item.senderName ?? "Verso Air Support"),
            content: String(item.content),
            isAi: Boolean(item.isAi ?? false),
            isRead: false,
          });
        } catch {
          /* skip malformed queued item */
        }
      }
    }

    const rows = await db
      .select()
      .from(schema.inboxConversations)
      .where(eq(schema.inboxConversations.userId, Number(userId)))
      .orderBy(desc(schema.inboxConversations.updatedAt));

    return res.json({ success: true, conversations: rows });
  } catch (err: any) {
    console.error("[Inbox] GET /conversations error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load conversations" });
  }
});

// ─── GET /api/inbox/suggested-contacts ───────────────────────────────────────
// Hybrid source: verified businesses from the businesses table as suggested peers.
// Only accessible to essential+ tiers.
router.get("/suggested-contacts", async (req: Request, res: Response) => {
  const tier = getTierFromUser(req.user!);

  if (tier === "free") {
    return res.json({
      success: true,
      contacts: [],
      locked: true,
      message: "Business Networking requires Essential plan or above.",
    });
  }

  try {
    const search = (req.query.q as string) ?? "";
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const rows = await db.execute(
      sql`
        SELECT
          b.id,
          b.name,
          bc.name   AS category,
          b.city,
          b.country,
          b.rating,
          b.logo_url
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        WHERE b.verification_status = 'verified'
          AND b.is_active = true
          AND b.id != (
            SELECT id FROM businesses
            WHERE user_id = ${req.user!.userId}
            LIMIT 1
          )
          ${search ? sql`AND b.name ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY b.rating DESC NULLS LAST
        LIMIT ${limit}
      `,
    );

    return res.json({ success: true, contacts: rows.rows });
  } catch (err: any) {
    console.error("[Inbox] GET /suggested-contacts error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load contacts" });
  }
});

// ─── GET /api/inbox/conversations/:id/messages ───────────────────────────────
// Paginated message history. Marks all unread as read on fetch.
router.get(
  "/conversations/:id/messages",
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const convId = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    if (isNaN(convId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid conversation ID" });
    }

    try {
      // Verify ownership
      const [conv] = await db
        .select()
        .from(schema.inboxConversations)
        .where(
          and(
            eq(schema.inboxConversations.id, convId),
            eq(schema.inboxConversations.userId, Number(userId)),
          ),
        )
        .limit(1);

      if (!conv) {
        return res
          .status(404)
          .json({ success: false, error: "Conversation not found" });
      }

      const messages = await db
        .select()
        .from(schema.inboxMessages)
        .where(eq(schema.inboxMessages.conversationId, convId))
        .orderBy(desc(schema.inboxMessages.createdAt))
        .limit(limit)
        .offset(offset);

      // Mark unread → read (async, fire-and-forget)
      db.update(schema.inboxMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(schema.inboxMessages.conversationId, convId),
            eq(schema.inboxMessages.isRead, false),
          ),
        )
        .then(() =>
          db
            .update(schema.inboxConversations)
            .set({ unreadCount: 0 })
            .where(eq(schema.inboxConversations.id, convId)),
        )
        .catch(() => {
          /* non-critical */
        });

      return res.json({
        success: true,
        messages: messages.reverse(), // chronological order
        conversation: conv,
      });
    } catch (err: any) {
      console.error(
        "[Inbox] GET /conversations/:id/messages error:",
        err?.message,
      );
      return res
        .status(500)
        .json({ success: false, error: "Failed to load messages" });
    }
  },
);

// ─── POST /api/inbox/conversations ───────────────────────────────────────────
// Create a new conversation. Support threads auto-exist; this creates networking threads.
// NOTE: `marketplace` (buyer<->seller listing DMs) AND `music_artist` (fan<->artist
// direct chat) types are intentionally free/ungated for every tier — only rate-limited
// for spam control. Only `business_network` is tier-gated.
router.post(
  "/conversations",
  marketplaceMessageLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const tier = getTierFromUser(req.user!);
    const {
      participantId,
      participantName,
      participantAvatar,
      type = "business_network",
      businessId,
    } = req.body;

    if (!participantId || !participantName) {
      return res.status(400).json({
        success: false,
        error: "participantId and participantName are required",
      });
    }

    // Tier gate for business_network only — marketplace & music_artist DMs stay free
    if (type === "business_network") {
      const limit = TIER_NETWORKING_LIMIT[tier];
      if (limit === 0) {
        return res.status(403).json({
          success: false,
          error: "Business Networking requires Essential plan or above.",
          upgradeRequired: true,
        });
      }

      if (limit < 999) {
        // Count active networking threads
        const [{ count: activeCount }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.inboxConversations)
          .where(
            and(
              eq(schema.inboxConversations.userId, Number(userId)),
              eq(schema.inboxConversations.type, "business_network"),
            ),
          );

        if (Number(activeCount) >= limit) {
          return res.status(403).json({
            success: false,
            error: `Your ${tier} plan allows up to ${limit} active Business Network thread(s). Upgrade to add more.`,
            upgradeRequired: true,
          });
        }
      }
    }

    // Prevent duplicate conversations with same participant
    const [existing] = await db
      .select({ id: schema.inboxConversations.id })
      .from(schema.inboxConversations)
      .where(
        and(
          eq(schema.inboxConversations.userId, Number(userId)),
          eq(schema.inboxConversations.participantId, String(participantId)),
          eq(schema.inboxConversations.type, type),
        ),
      )
      .limit(1);

    if (existing) {
      return res.json({
        success: true,
        conversation: existing,
        existing: true,
      });
    }

    try {
      const [conv] = await db
        .insert(schema.inboxConversations)
        .values({
          userId: Number(userId),
          type,
          participantId: String(participantId),
          participantName: String(participantName),
          participantAvatar: participantAvatar || null,
          businessId: businessId ? Number(businessId) : null,
          priority: priority(tier),
          unreadCount: 0,
        })
        .returning();

      // Mirror to the recipient's own inbox so they can see and reply —
      // only when participantId is a real user account (not "support").
      const recipientUserId = Number(participantId);
      if (
        Number.isFinite(recipientUserId) &&
        recipientUserId !== Number(userId)
      ) {
        const sender = await resolveUserDisplay(Number(userId));
        if (sender) {
          await getOrCreateMirrorConversation(
            recipientUserId,
            Number(userId),
            sender.name,
            sender.avatar,
            type,
            businessId,
          );
        }
      }

      return res.json({ success: true, conversation: conv });
    } catch (err: any) {
      console.error("[Inbox] POST /conversations error:", err?.message);
      return res
        .status(500)
        .json({ success: false, error: "Failed to create conversation" });
    }
  },
);

// ─── POST /api/inbox/conversations/:id/messages ──────────────────────────────
// Send a message. Respects daily message limits per tier for business_network only.
// marketplace messages are free/ungated (rate-limited for spam only).
router.post(
  "/conversations/:id/messages",
  marketplaceMessageLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const tier = getTierFromUser(req.user!);
    const convId = Number(req.params.id);
    const { content, senderId, senderName, senderAvatar } = req.body;

    if (!content?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Message content is required" });
    }

    if (isNaN(convId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid conversation ID" });
    }

    try {
      // Verify ownership
      const [conv] = await db
        .select()
        .from(schema.inboxConversations)
        .where(
          and(
            eq(schema.inboxConversations.id, convId),
            eq(schema.inboxConversations.userId, Number(userId)),
          ),
        )
        .limit(1);

      if (!conv) {
        return res
          .status(404)
          .json({ success: false, error: "Conversation not found" });
      }

      // Daily limit check for business_network (essential tier)
      if (conv.type === "business_network") {
        const dailyLimit = TIER_DAILY_MSG_LIMIT[tier];
        if (dailyLimit < 999) {
          const [{ count: todayCount }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.inboxMessages)
            .where(
              and(
                eq(schema.inboxMessages.conversationId, convId),
                eq(schema.inboxMessages.senderId, String(userId)),
                sql`created_at > NOW() - INTERVAL '24 hours'`,
              ),
            );

          if (Number(todayCount) >= dailyLimit) {
            return res.status(429).json({
              success: false,
              error: `Daily message limit (${dailyLimit}) reached. Upgrade for unlimited messaging.`,
              upgradeRequired: true,
            });
          }
        }
      }

      const [message] = await db
        .insert(schema.inboxMessages)
        .values({
          conversationId: convId,
          senderId: String(senderId ?? userId),
          senderName: String(senderName ?? "You"),
          senderAvatar: senderAvatar || null,
          content: content.trim(),
          isRead: true,
          isAi: false,
        })
        .returning();

      // Update conversation summary (fire-and-forget)
      db.update(schema.inboxConversations)
        .set({
          lastMessage: content.trim().substring(0, 120),
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.inboxConversations.id, convId))
        .catch(() => {
          /* non-critical */
        });

      // Mirror the message to the recipient's own inbox, in real-time, so
      // the other account actually sees it (this was previously missing —
      // conversations are one-sided rows, so without this the recipient
      // never got the message at all).
      const recipientUserId = Number(conv.participantId);
      if (
        Number.isFinite(recipientUserId) &&
        recipientUserId !== Number(userId)
      ) {
        (async () => {
          try {
            const sender = await resolveUserDisplay(Number(userId));
            const mirrorConvId = await getOrCreateMirrorConversation(
              recipientUserId,
              Number(userId),
              sender?.name || String(senderName ?? "Member"),
              null,
              conv.type,
              conv.businessId,
            );
            if (!mirrorConvId) return;

            const [mirrorMessage] = await db
              .insert(schema.inboxMessages)
              .values({
                conversationId: mirrorConvId,
                senderId: String(userId),
                senderName: sender?.name || String(senderName ?? "Member"),
                senderAvatar: senderAvatar || null,
                content: content.trim(),
                isRead: false,
                isAi: false,
              })
              .returning();

            await db
              .update(schema.inboxConversations)
              .set({
                lastMessage: content.trim().substring(0, 120),
                lastMessageAt: new Date(),
                updatedAt: new Date(),
                unreadCount: sql`${schema.inboxConversations.unreadCount} + 1`,
              })
              .where(eq(schema.inboxConversations.id, mirrorConvId));

            notificationEmitter.emit("inbox_message", {
              toUserId: recipientUserId,
              conversationId: mirrorConvId,
              message: mirrorMessage,
            });
          } catch (mirrorErr: any) {
            console.error(
              "[Inbox] Mirror message error:",
              mirrorErr?.message,
            );
          }
        })();
      }

      return res.json({ success: true, message });
    } catch (err: any) {
      // DB down → enqueue in Redis
      console.error(
        "[Inbox] POST /messages error — enqueuing to Redis:",
        err?.message,
      );
      await enqueueInboxMessage(userId, {
        conversationId: convId,
        senderId: senderId ?? userId,
        senderName: senderName ?? "You",
        content: content.trim(),
        isAi: false,
      });
      return res.json({
        success: true,
        queued: true,
        message: {
          id: `queued-${Date.now()}`,
          conversationId: convId,
          senderId: senderId ?? userId,
          senderName: senderName ?? "You",
          content: content.trim(),
          isRead: true,
          isAi: false,
          createdAt: new Date().toISOString(),
        },
      });
    }
  },
);

// ─── POST /api/inbox/messages/:id/publish ────────────────────────────────────
// Promote your own sent message into the public community feed (social_posts,
// postType='dm_share'). Messages always start private — publishing is an
// explicit, one-way opt-in action taken by the sender after the fact (never
// at send time, never reversible). Visibility is global for now.
router.post("/messages/:id/publish", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const messageId = Number(req.params.id);

  if (isNaN(messageId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid message ID" });
  }

  try {
    const [message] = await db
      .select()
      .from(schema.inboxMessages)
      .where(eq(schema.inboxMessages.id, messageId))
      .limit(1);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, error: "Message not found" });
    }

    // Only the sender can publish their own message
    if (message.senderId !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: "You can only publish your own messages",
      });
    }

    if (message.isPublished) {
      return res.status(400).json({
        success: false,
        error: "This message has already been published",
      });
    }

    // Verify the requester actually owns the parent conversation (defense
    // in depth — senderId is client-suppliable text, so don't rely on it alone)
    const [conv] = await db
      .select({ id: schema.inboxConversations.id })
      .from(schema.inboxConversations)
      .where(
        and(
          eq(schema.inboxConversations.id, message.conversationId),
          eq(schema.inboxConversations.userId, Number(userId)),
        ),
      )
      .limit(1);

    if (!conv) {
      return res.status(403).json({
        success: false,
        error: "You do not have access to this conversation",
      });
    }

    const [post] = await db
      .insert(socialPosts)
      .values({
        authorId: Number(userId),
        content: message.content,
        postType: "dm_share",
        mediaType: "text",
      })
      .returning({ id: socialPosts.id });

    await db
      .update(schema.inboxMessages)
      .set({ isPublished: true, publishedPostId: post.id })
      .where(eq(schema.inboxMessages.id, messageId));

    return res.json({ success: true, postId: post.id });
  } catch (err: any) {
    console.error("[Inbox] POST /messages/:id/publish error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to publish message" });
  }
});

// ─── PATCH /api/inbox/conversations/:id/read ─────────────────────────────────
// Mark all messages in a conversation as read and reset unread count.
router.patch("/conversations/:id/read", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const convId = Number(req.params.id);

  if (isNaN(convId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid conversation ID" });
  }

  try {
    const [conv] = await db
      .select({ id: schema.inboxConversations.id })
      .from(schema.inboxConversations)
      .where(
        and(
          eq(schema.inboxConversations.id, convId),
          eq(schema.inboxConversations.userId, Number(userId)),
        ),
      )
      .limit(1);

    if (!conv) {
      return res
        .status(404)
        .json({ success: false, error: "Conversation not found" });
    }

    await db
      .update(schema.inboxMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.inboxMessages.conversationId, convId),
          eq(schema.inboxMessages.isRead, false),
        ),
      );

    await db
      .update(schema.inboxConversations)
      .set({ unreadCount: 0 })
      .where(eq(schema.inboxConversations.id, convId));

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Inbox] PATCH /read error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to mark as read" });
  }
});

// ─── GET /api/inbox/ensure-support-thread ────────────────────────────────────
// Auto-create (or return) the user's support thread with VersoAI.
// Called on Inbox mount so there's always a support thread ready.
router.get("/ensure-support-thread", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tier = getTierFromUser(req.user!);

  try {
    // Check if support thread already exists
    const [existing] = await db
      .select()
      .from(schema.inboxConversations)
      .where(
        and(
          eq(schema.inboxConversations.userId, Number(userId)),
          eq(schema.inboxConversations.type, "support"),
        ),
      )
      .limit(1);

    if (existing) {
      return res.json({
        success: true,
        conversation: existing,
        created: false,
      });
    }

    // Create support thread
    const [conv] = await db
      .insert(schema.inboxConversations)
      .values({
        userId: Number(userId),
        type: "support",
        participantId: "support",
        participantName: "VersoAI Support",
        participantAvatar: null,
        priority: priority(tier),
        unreadCount: 1,
        lastMessage:
          "Hello! I'm VersoAI, your Verso Air assistant. How can I help you today?",
        lastMessageAt: new Date(),
      })
      .returning();

    // Insert welcome message from VersoAI
    await db.insert(schema.inboxMessages).values({
      conversationId: conv.id,
      senderId: "support",
      senderName: "VersoAI Support",
      content:
        "Hello! I'm VersoAI, your Verso Air assistant. How can I help you today?",
      isAi: true,
      isRead: false,
    });

    return res.json({ success: true, conversation: conv, created: true });
  } catch (err: any) {
    console.error("[Inbox] ensure-support-thread error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to ensure support thread" });
  }
});

export default router;

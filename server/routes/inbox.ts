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
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import * as schema from "@shared/schema";
import {
  socialPosts,
  socialUsers,
  socialFollowers,
} from "@shared/social-schema";
import { enqueueInboxMessage, drainInboxQueue } from "../services/redis-client";
import { marketplaceMessageLimiter } from "../middleware/rate-limiter";
import {
  notificationEmitter,
  notifyMessage,
} from "../services/notification-service";

const router = Router();

// ── Chat attachment uploads (images only) ──────────────────────────────────
const INBOX_UPLOADS_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "inbox")
    : path.resolve("uploads", "inbox");

try {
  if (!fs.existsSync(INBOX_UPLOADS_DIR)) {
    fs.mkdirSync(INBOX_UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`⚠️  Could not create inbox uploads dir: ${err.message}`);
}

const inboxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image attachments are allowed") as any, false);
  },
});

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

  const [su] = await db
    .select({
      avatarUrl: socialUsers.avatarUrl,
      displayName: socialUsers.displayName,
    })
    .from(socialUsers)
    .where(eq(socialUsers.userId, userId))
    .limit(1);

  return {
    name: su?.displayName || u.displayName || u.username,
    avatar: su?.avatarUrl || null,
  };
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

    const conversations = rows.map((conversation) => ({
      ...conversation,
      portal: conversation.type === "music_artist" ? "music" : "community",
    }));

    return res.json({ success: true, conversations });
  } catch (err: any) {
    console.error("[Inbox] GET /conversations error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load conversations" });
  }
});

// ─── GET /api/inbox/contacts ────────────────────────────────────────────────
// Return contacts the user follows, mutual connections, or platform members for
// starting a direct message thread. Ungated & available to all authenticated users.
router.get("/contacts", async (req: Request, res: Response) => {
  const userId = Number(req.user!.userId);
  const search = ((req.query.q as string) ?? "").trim();
  const limit = Math.min(Number(req.query.limit) || 40, 100);

  try {
    const contactsQuery = await db.execute(sql`
      WITH user_following AS (
        SELECT DISTINCT su_target.user_id AS target_user_id, true AS is_following
        FROM social_users su_me
        JOIN social_followers sf ON sf.follower_id = su_me.id
        JOIN social_users su_target ON su_target.id = sf.following_id
        WHERE su_me.user_id = ${userId}
      ),
      user_conns AS (
        SELECT DISTINCT
          CASE WHEN requester_id = ${userId} THEN receiver_id ELSE requester_id END AS target_user_id,
          true AS is_connection
        FROM connections
        WHERE (requester_id = ${userId} OR receiver_id = ${userId})
          AND status = 'accepted'
      ),
      existing_convs AS (
        SELECT 
          NULLIF(regexp_replace(participant_id, '[^0-9]', '', 'g'), '')::int AS target_user_id,
          id AS conversation_id
        FROM inbox_conversations
        WHERE user_id = ${userId}
      )
      SELECT DISTINCT
        u.id,
        COALESCE(su.display_name, u.display_name, u.username) AS name,
        u.username,
        u.role,
        COALESCE(su.avatar_url, null) AS avatar,
        su.bio,
        COALESCE(uf.is_following, false) AS "isFollowing",
        COALESCE(uc.is_connection, false) AS "isConnection",
        ec.conversation_id AS "conversationId"
      FROM users u
      LEFT JOIN social_users su ON su.user_id = u.id
      LEFT JOIN user_following uf ON uf.target_user_id = u.id
      LEFT JOIN user_conns uc ON uc.target_user_id = u.id
      LEFT JOIN existing_convs ec ON ec.target_user_id = u.id
      WHERE u.id != ${userId}
        AND (
          ${search ? sql`(u.username ILIKE ${"%" + search + "%"} OR u.display_name ILIKE ${"%" + search + "%"} OR su.display_name ILIKE ${"%" + search + "%"})` : sql`(uf.is_following = true OR uc.is_connection = true OR ec.conversation_id IS NOT NULL OR u.role IN ('artist', 'business', 'admin'))`}
        )
      ORDER BY 
        (COALESCE(uf.is_following, false) OR COALESCE(uc.is_connection, false)) DESC,
        u.id DESC
      LIMIT ${limit}
    `);

    const contacts = (contactsQuery.rows || []).map((row: any) => ({
      id: Number(row.id),
      name: row.name || row.username || `Member #${row.id}`,
      username: row.username || `user_${row.id}`,
      role: row.role || "user",
      avatar: row.avatar || null,
      bio: row.bio || null,
      isFollowing: Boolean(row.isFollowing),
      isConnection: Boolean(row.isConnection),
      conversationId: row.conversationId ? Number(row.conversationId) : null,
    }));

    return res.json({ success: true, contacts });
  } catch (err: any) {
    console.error("[Inbox] GET /contacts error:", err?.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load contacts" });
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
// Create or resume a conversation. Direct, community, marketplace, and music_artist
// chats are ungated and free for all users. Only business_network is tier-gated.
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
      type = "direct",
      businessId,
    } = req.body;

    if (!participantId || !participantName) {
      return res.status(400).json({
        success: false,
        error: "participantId and participantName are required",
      });
    }

    // Tier gate for business_network only — direct, marketplace & music_artist DMs stay free
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
      .select()
      .from(schema.inboxConversations)
      .where(
        and(
          eq(schema.inboxConversations.userId, Number(userId)),
          eq(schema.inboxConversations.participantId, String(participantId)),
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

// ─── POST /api/inbox/attachments — upload a chat image, returns its URL ──────
router.post(
  "/attachments",
  inboxUpload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }
    try {
      const [attachment] = await db
        .insert(schema.inboxAttachments)
        .values({
          data: req.file.buffer,
          mimeType: req.file.mimetype,
        })
        .returning({ id: schema.inboxAttachments.id });

      const url = `/api/inbox/attachments/file/${attachment.id}`;
      return res.json({ success: true, url });
    } catch (error) {
      console.error("[Inbox] Attachment persistence error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to store attachment" });
    }
  },
);

// ─── GET /api/inbox/attachments/file/:filename — serve an uploaded chat image ─
router.get("/attachments/file/:filename", (req: Request, res: Response) => {
  const { filename } = req.params;

  if (/^\d+$/.test(filename)) {
    db.select({
      data: schema.inboxAttachments.data,
      mimeType: schema.inboxAttachments.mimeType,
    })
      .from(schema.inboxAttachments)
      .where(eq(schema.inboxAttachments.id, Number(filename)))
      .limit(1)
      .then(([attachment]) => {
        if (!attachment) {
          return res
            .status(404)
            .json({ success: false, error: "File not found" });
        }
        res.set("Cache-Control", "public, max-age=86400");
        res.type(attachment.mimeType);
        return res.send(attachment.data);
      })
      .catch((error) => {
        console.error("[Inbox] Attachment read error:", error);
        res.status(500).json({ success: false, error: "File unavailable" });
      });
    return;
  }

  if (/[^a-zA-Z0-9._-]/.test(filename)) {
    return res.status(400).json({ success: false, error: "Invalid filename" });
  }
  const filePath = path.join(INBOX_UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "File not found" });
  }
  res.set("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

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
    const { content, senderId, senderName, senderAvatar, attachmentUrl } =
      req.body;

    if (!content?.trim() && !attachmentUrl) {
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
          content: content?.trim() || "",
          attachmentUrl: attachmentUrl || null,
          isRead: true,
          isAi: false,
        })
        .returning();

      // Update conversation summary (fire-and-forget)
      db.update(schema.inboxConversations)
        .set({
          lastMessage: content?.trim()
            ? content.trim().substring(0, 120)
            : "📷 Photo",
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

            // Create notification for recipient
            await notifyMessage({
              senderId: Number(userId),
              recipientId: recipientUserId,
              senderName: sender?.name || String(senderName ?? "Member"),
              messagePreview: content.trim(),
              conversationId: mirrorConvId,
            });

            notificationEmitter.emit("inbox_message", {
              toUserId: recipientUserId,
              conversationId: mirrorConvId,
              message: mirrorMessage,
            });
          } catch (mirrorErr: any) {
            console.error("[Inbox] Mirror message error:", mirrorErr?.message);
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

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
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { db } from "../db";
import * as schema from "@shared/schema";
import {
  socialPosts,
  socialUsers,
  socialFollowers,
} from "@shared/social-schema";
import { drainInboxQueue } from "../services/redis-client";
import { marketplaceMessageLimiter } from "../middleware/rate-limiter";
import {
  notificationEmitter,
  notifyMessage,
} from "../services/notification-service";
import {
  getPostgresErrorDetails,
} from "../utils/postgres-errors";
import { buildContactsQuery } from "../utils/inbox-contacts-query";
import {
  INBOX_ATTACHMENT_URL_PREFIX,
  attachmentReadableBy,
  attachmentUploadedBy,
  inboxAttachmentUrl,
  legacyFileReadableBy,
  parseInboxAttachmentUrl,
} from "../utils/inbox-attachment-access";
import { receiveInboxAttachment } from "../utils/inbox-upload";
import {
  normalizeSendPayload,
  parseClientMessageId,
  replyForStoredSend,
  sentReply,
} from "../utils/inbox-send-idempotency";

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
    name: u.displayName || su?.displayName || u.username,
    avatar: su?.avatarUrl || null,
  };
}

async function resolveUserDisplays(
  userIds: number[],
): Promise<Map<number, { name: string; avatar: string | null }>> {
  const uniqueIds = [...new Set(userIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (uniqueIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      socialDisplayName: socialUsers.displayName,
      avatar: socialUsers.avatarUrl,
    })
    .from(schema.users)
    .leftJoin(socialUsers, eq(socialUsers.userId, schema.users.id))
    .where(inArray(schema.users.id, uniqueIds))
    .orderBy(asc(schema.users.id), desc(socialUsers.updatedAt));

  const displays = new Map<number, { name: string; avatar: string | null }>();
  for (const row of rows) {
    if (displays.has(row.id)) continue;
    displays.set(row.id, {
      name: row.displayName || row.socialDisplayName || row.username,
      avatar: row.avatar || null,
    });
  }
  return displays;
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

    const participantIds = rows
      .map((conversation) => Number(conversation.participantId))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    const displays = await resolveUserDisplays(participantIds);
    const conversations = rows.map((conversation) => {
      const display = displays.get(Number(conversation.participantId));
      return {
        ...conversation,
        participantName: display?.name || conversation.participantName,
        participantAvatar:
          display?.avatar || conversation.participantAvatar,
        portal: conversation.type === "music_artist" ? "music" : "community",
      };
    });

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
    const contactsQuery = await db.execute(
      buildContactsQuery(userId, search, limit),
    );

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
      const senderIds = messages
        .map((message) => Number(message.senderId))
        .filter((id) => Number.isSafeInteger(id) && id > 0);
      const senderDisplays = await resolveUserDisplays(senderIds);
      const currentMessages = messages.map((message) => ({
        ...message,
        senderName:
          senderDisplays.get(Number(message.senderId))?.name ||
          message.senderName,
      }));
      const participantDisplay = await resolveUserDisplays([
        Number(conv.participantId),
      ]);
      const currentConversation = {
        ...conv,
        participantName:
          participantDisplay.get(Number(conv.participantId))?.name ||
          conv.participantName,
        participantAvatar:
          participantDisplay.get(Number(conv.participantId))?.avatar ||
          conv.participantAvatar,
      };

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
        messages: currentMessages.reverse(), // chronological order
        conversation: currentConversation,
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
  receiveInboxAttachment,
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
          uploadedBy: Number(req.user!.userId),
        })
        .returning({ id: schema.inboxAttachments.id });

      const url = inboxAttachmentUrl(attachment.id);
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
// Readable by its uploader and by people with a message carrying it in their
// own conversation. Anyone else gets the same 404 as a file that doesn't exist.
router.get(
  "/attachments/file/:filename",
  async (req: Request, res: Response) => {
    const { filename } = req.params;
    const notFound = () =>
      res.status(404).json({ success: false, error: "File not found" });

    try {
      const userId = Number(req.user!.userId);

      if (/^\d+$/.test(filename)) {
        const attachmentId = parseInboxAttachmentUrl(
          `${INBOX_ATTACHMENT_URL_PREFIX}${filename}`,
        );
        if (attachmentId === null) return notFound();

        const [attachment] = await db
          .select({
            data: schema.inboxAttachments.data,
            mimeType: schema.inboxAttachments.mimeType,
          })
          .from(schema.inboxAttachments)
          .where(attachmentReadableBy(userId, attachmentId))
          .limit(1);
        if (!attachment) return notFound();

        res.set("Cache-Control", "private, max-age=86400");
        res.type(attachment.mimeType);
        return res.send(attachment.data);
      }

      if (/[^a-zA-Z0-9._-]/.test(filename)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid filename" });
      }

      const granted = await db.execute(
        sql`SELECT 1 AS granted WHERE ${legacyFileReadableBy(userId, filename)}`,
      );
      const filePath = path.join(INBOX_UPLOADS_DIR, filename);
      if (granted.rows.length === 0 || !fs.existsSync(filePath)) {
        return notFound();
      }
      res.set("Cache-Control", "private, max-age=86400");
      return res.sendFile(filePath);
    } catch (error) {
      console.error("[Inbox] Attachment read error:", error);
      return res
        .status(500)
        .json({ success: false, error: "File unavailable" });
    }
  },
);

// The stored copy for a send key. It is scoped to the caller's own conversation
// and own sender id, so a key can never return someone else's message, and two
// users can use the same key independently.
async function findKeyedMessage(
  convId: number,
  senderUserId: number | string,
  key: string,
) {
  const [row] = await db
    .select()
    .from(schema.inboxMessages)
    .where(
      and(
        eq(schema.inboxMessages.conversationId, convId),
        eq(schema.inboxMessages.senderId, String(senderUserId)),
        eq(schema.inboxMessages.clientMessageId, key),
      ),
    )
    .limit(1);
  return row;
}

// ─── POST /api/inbox/conversations/:id/messages ──────────────────────────────
// Send a message. Respects daily message limits per tier for business_network only.
// marketplace messages are free/ungated (rate-limited for spam only).
//
// A send may carry a `clientMessageId` (one UUID per send attempt). The key is
// stored on the sender's own copy only, so a retry whose first response was
// lost gets that copy back and writes nothing else: no second message, no
// second mirror copy, no second unread bump, notification or socket event.
// Requests without a key behave exactly as they always have.
router.post(
  "/conversations/:id/messages",
  marketplaceMessageLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const tier = getTierFromUser(req.user!);
    const convId = Number(req.params.id);
    const { content, attachmentUrl, clientMessageId } = req.body;

    if (
      (typeof content !== "string" || !content.trim()) &&
      (typeof attachmentUrl !== "string" || !attachmentUrl.trim())
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Message content is required" });
    }

    if (typeof content === "string" && content.length > 10000) {
      return res
        .status(400)
        .json({ success: false, error: "Message content is too long" });
    }

    if (isNaN(convId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid conversation ID" });
    }

    const keyCheck = parseClientMessageId(clientMessageId);
    if (!keyCheck.ok) {
      return res
        .status(400)
        .json({ success: false, error: keyCheck.message });
    }
    const messageKey = keyCheck.key;
    const payload = normalizeSendPayload(content, attachmentUrl);

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

      // Replay lookup. It runs before the daily limit on purpose: a retry of a
      // message that was stored as the last allowed one must get that message
      // back, not a 429.
      if (messageKey) {
        const stored = await findKeyedMessage(convId, userId, messageKey);
        if (stored) {
          const reply = replyForStoredSend(stored, payload);
          return res.status(reply.status).json(reply.body);
        }
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

      const sender = await resolveUserDisplay(Number(userId));
      const trustedSenderName =
        sender?.name || req.user!.email.split("@")[0] || "Member";
      const trustedSenderAvatar = sender?.avatar || null;
      const normalizedContent = payload.content;
      const normalizedAttachmentUrl = payload.attachmentUrl;

      // Only the uploader may put an attachment on a message; otherwise
      // pointing a message at someone else's upload would let you read it.
      if (normalizedAttachmentUrl) {
        const attachmentId = parseInboxAttachmentUrl(normalizedAttachmentUrl);
        const [ownAttachment] =
          attachmentId === null
            ? []
            : await db
                .select({ id: schema.inboxAttachments.id })
                .from(schema.inboxAttachments)
                .where(attachmentUploadedBy(Number(userId), attachmentId))
                .limit(1);
        if (!ownAttachment) {
          return res.status(400).json({
            success: false,
            error:
              "That image could not be attached. Remove it and attach it again.",
          });
        }
      }
      const recipientUserId = Number(conv.participantId);
      const shouldMirror =
        Number.isFinite(recipientUserId) &&
        recipientUserId !== Number(userId);

      const { message, mirror } = await db.transaction(async (tx) => {
        const senderCopy = {
          conversationId: convId,
          senderId: String(userId),
          senderName: trustedSenderName,
          senderAvatar: trustedSenderAvatar,
          content: normalizedContent,
          attachmentUrl: normalizedAttachmentUrl,
          isRead: true,
          isAi: false,
        };
        // A keyed send loses the insert if a concurrent send with the same key
        // committed first; then nothing else is written (zero rows returned).
        const [createdMessage] = messageKey
          ? await tx
              .insert(schema.inboxMessages)
              .values({ ...senderCopy, clientMessageId: messageKey })
              .onConflictDoNothing({
                target: [
                  schema.inboxMessages.conversationId,
                  schema.inboxMessages.senderId,
                  schema.inboxMessages.clientMessageId,
                ],
                where: sql`client_message_id IS NOT NULL`,
              })
              .returning()
          : await tx
              .insert(schema.inboxMessages)
              .values(senderCopy)
              .returning();

        if (!createdMessage) {
          return { message: null, mirror: null };
        }

        const preview = normalizedContent
          ? normalizedContent.substring(0, 120)
          : "📷 Photo";
        await tx
          .update(schema.inboxConversations)
          .set({
            lastMessage: preview,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.inboxConversations.id, convId));

        if (!shouldMirror) {
          return { message: createdMessage, mirror: null };
        }

        let [mirrorConversation] = await tx
          .select({ id: schema.inboxConversations.id })
          .from(schema.inboxConversations)
          .where(
            and(
              eq(schema.inboxConversations.userId, recipientUserId),
              eq(schema.inboxConversations.participantId, String(userId)),
              eq(schema.inboxConversations.type, conv.type),
            ),
          )
          .limit(1);

        if (!mirrorConversation) {
          [mirrorConversation] = await tx
            .insert(schema.inboxConversations)
            .values({
              userId: recipientUserId,
              type: conv.type,
              participantId: String(userId),
              participantName: trustedSenderName,
              participantAvatar: trustedSenderAvatar,
              businessId: conv.businessId,
              unreadCount: 0,
            })
            .returning({ id: schema.inboxConversations.id });
        }

        const [mirrorMessage] = await tx
          .insert(schema.inboxMessages)
          .values({
            conversationId: mirrorConversation.id,
            senderId: String(userId),
            senderName: trustedSenderName,
            senderAvatar: trustedSenderAvatar,
            content: normalizedContent,
            attachmentUrl: normalizedAttachmentUrl,
            isRead: false,
            isAi: false,
          })
          .returning();

        await tx
          .update(schema.inboxConversations)
          .set({
            lastMessage: preview,
            lastMessageAt: new Date(),
            updatedAt: new Date(),
            unreadCount: sql`${schema.inboxConversations.unreadCount} + 1`,
          })
          .where(eq(schema.inboxConversations.id, mirrorConversation.id));

        return {
          message: createdMessage,
          mirror: {
            conversationId: mirrorConversation.id,
            message: mirrorMessage,
          },
        };
      });

      if (!message) {
        // A concurrent send with the same key won the insert and has committed
        // (the insert waited for it), so answer from its row.
        const winner = messageKey
          ? await findKeyedMessage(convId, userId, messageKey)
          : undefined;
        if (!winner) {
          throw new Error("Keyed send lost its insert but no stored row exists");
        }
        const reply = replyForStoredSend(winner, payload);
        return res.status(reply.status).json(reply.body);
      }

      if (mirror) {
        try {
          await notifyMessage({
            senderId: Number(userId),
            recipientId: recipientUserId,
            senderName: trustedSenderName,
            messagePreview: normalizedContent,
            conversationId: mirror.conversationId,
          });
        } catch (notificationError) {
          console.error(
            "[Inbox] Message notification failed",
            getPostgresErrorDetails(notificationError) ?? {
              errorType: "notification",
            },
          );
        }

        notificationEmitter.emit("inbox_message", {
          toUserId: recipientUserId,
          conversationId: mirror.conversationId,
          message: mirror.message,
        });
      }

      const reply = sentReply(message);
      return res.status(reply.status).json(reply.body);
    } catch (err: any) {
      console.error("[Inbox] POST /messages failed", {
        postgres: getPostgresErrorDetails(err),
        errorType: getPostgresErrorDetails(err) ? undefined : "message_write",
      });
      return res.status(503).json({
        success: false,
        error: "Message could not be saved. Please try again.",
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

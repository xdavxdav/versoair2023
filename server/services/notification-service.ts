import { db } from "../db";
import {
  connections,
  users,
  auditLogs,
  notifications,
  emailSubscriptions,
  emailQueue,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { EventEmitter } from "events";
import {
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendJobAlertEmail,
  sendContractAlertEmail,
  sendReservationUpdateEmail,
  type JobAlertData,
  type ContractAlertData,
  type ReservationUpdateData,
} from "./email-service";

/**
 * Notification Service
 * Handles real-time alerts for connection requests, profile updates, and user activity
 * Integrates with the connections table (LinkedIn-style)
 */

export interface NotificationPayload {
  type:
    | "connection_request"
    | "connection_accepted"
    | "profile_update"
    | "message";
  fromUserId: number;
  toUserId: number;
  entityType?: string;
  entityId?: string;
  message?: string;
}

export interface Notification {
  id: string;
  userId: number;
  type: string;
  fromUserId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// Global event emitter for real-time notifications
export const notificationEmitter = new EventEmitter();

/**
 * Create a connection request notification
 * Triggered when user clicks "Connect" on someone's profile
 */
export async function notifyConnectionRequest(
  fromUserId: number,
  toUserId: number,
): Promise<Notification | null> {
  try {
    // Get requester details
    const [requester] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, fromUserId));

    if (!requester) {
      throw new Error("Requester not found");
    }

    // Create audit log entry
    await db.insert(auditLogs).values({
      userId: fromUserId,
      action: "CREATE_CONNECTION_REQUEST",
      entityType: "connection",
      entityId: toUserId.toString(),
      changes: { fromUserId, toUserId, status: "pending" },
      ipAddress: "system",
    });

    // Emit real-time event (for WebSocket or Socket.io)
    notificationEmitter.emit("connection_request", {
      id: `conn-${fromUserId}-${toUserId}`,
      fromUserId,
      toUserId,
      fromUserName: requester.username,
      timestamp: new Date().toISOString(),
      type: "connection_request",
    });

    // Send email notification asynchronously (don't block the response)
    (async () => {
      try {
        const [recipient] = await db
          .select({ email: users.email, username: users.username })
          .from(users)
          .where(eq(users.id, toUserId));

        if (recipient?.email) {
          await sendConnectionRequestEmail(
            recipient.email,
            recipient.username || "User",
            requester.username,
            `${process.env.VERSOAIR_URL || "http://localhost:5003"}/blog?connections=pending`,
          );
          console.log(
            `[NOTIFICATION] Email sent for connection request to ${recipient.email}`,
          );
        }
      } catch (emailError) {
        console.error(
          "[NOTIFICATION] Error sending connection request email:",
          emailError,
        );
        // Error is logged in email-service.ts as SYSTEM_ERROR in auditLogs
      }
    })();

    // Return notification object for API response
    return {
      id: `conn-${fromUserId}-${toUserId}`,
      userId: toUserId,
      type: "connection_request",
      fromUserId,
      title: `${requester.username} sent you a connection request`,
      message: `${requester.username} wants to connect with you`,
      isRead: false,
      createdAt: new Date(),
      relatedEntityType: "user",
      relatedEntityId: fromUserId.toString(),
    };
  } catch (error) {
    console.error("Error notifying connection request:", error);
    return null;
  }
}

/**
 * Accept a connection request and notify both parties
 * Transactional: updates connection status and creates notifications
 */
export async function acceptConnectionRequest(
  connectionId: number,
  userId: number,
): Promise<{ accepted: boolean; notification?: Notification }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get connection details
      const [connection] = await tx
        .select()
        .from(connections)
        .where(eq(connections.id, connectionId));

      if (!connection) {
        throw new Error("Connection request not found");
      }

      if (connection.receiverId !== userId) {
        throw new Error("Not authorized to accept this connection");
      }

      // Update connection status
      await tx
        .update(connections)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(connections.id, connectionId));

      // Audit the acceptance
      await tx.insert(auditLogs).values({
        userId,
        action: "ACCEPT_CONNECTION_REQUEST",
        entityType: "connection",
        entityId: connectionId.toString(),
        changes: { status: "pending" },
        ipAddress: "system",
      });

      // Get requester info for notification
      const [requester] = await tx
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, connection.requesterId));

      return {
        connection,
        requester,
      };
    });

    // Emit real-time events
    notificationEmitter.emit("connection_accepted", {
      id: `conn-accept-${result.connection.id}`,
      fromUserId: result.connection.requesterId,
      toUserId: userId,
      toUserName: result.requester?.username || "A user",
      timestamp: new Date().toISOString(),
      type: "connection_accepted",
    });

    // Send email notification asynchronously
    (async () => {
      try {
        const [requesterData] = await db
          .select({ email: users.email, username: users.username })
          .from(users)
          .where(eq(users.id, result.connection.requesterId));

        if (requesterData?.email) {
          await sendConnectionAcceptedEmail(
            requesterData.email,
            requesterData.username || "User",
            result.requester?.username || "A user",
            `${process.env.VERSOAIR_URL || "http://localhost:5003"}/blog?network=true`,
          );
          console.log(
            `[NOTIFICATION] Email sent for connection accepted to ${requesterData.email}`,
          );
        }
      } catch (emailError) {
        console.error(
          "[NOTIFICATION] Error sending connection accepted email:",
          emailError,
        );
        // Error is logged in email-service.ts as SYSTEM_ERROR in auditLogs
      }
    })();

    return {
      accepted: true,
      notification: {
        id: `conn-accept-${result.connection.id}`,
        userId: result.connection.requesterId,
        type: "connection_accepted",
        fromUserId: userId,
        title: `${result.requester?.username || "A user"} accepted your connection request`,
        message: `You're now connected with ${result.requester?.username || "a user"}`,
        isRead: false,
        createdAt: new Date(),
        relatedEntityType: "user",
        relatedEntityId: userId.toString(),
      },
    };
  } catch (error) {
    console.error("Error accepting connection:", error);
    return { accepted: false };
  }
}

/**
 * Decline a connection request
 */
export async function declineConnectionRequest(
  connectionId: number,
  userId: number,
): Promise<boolean> {
  try {
    const result = await db.transaction(async (tx) => {
      const [connection] = await tx
        .select()
        .from(connections)
        .where(eq(connections.id, connectionId));

      if (!connection || connection.receiverId !== userId) {
        throw new Error("Not authorized");
      }

      // Delete the connection request
      await tx.delete(connections).where(eq(connections.id, connectionId));

      // Audit the decline
      await tx.insert(auditLogs).values({
        userId,
        action: "DECLINE_CONNECTION_REQUEST",
        entityType: "connection",
        entityId: connectionId.toString(),
        ipAddress: "system",
      });

      return true;
    });

    return result;
  } catch (error) {
    console.error("Error declining connection:", error);
    return false;
  }
}

/**
 * Get pending connection requests for a user
 * Used in the /profile or /connections page
 */
export async function getPendingConnections(userId: number) {
  return await db
    .select({
      id: connections.id,
      requesterId: connections.requesterId,
      requesterUsername: users.username,
      status: connections.status,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .innerJoin(users, eq(connections.requesterId, users.id))
    .where(
      and(
        eq(connections.receiverId, userId),
        eq(connections.status, "pending"),
      ),
    );
}

/**
 * Get all connections for a user (accepted)
 * Used in the LinkedIn-style network view
 */
export async function getUserConnections(userId: number) {
  return await db
    .select({
      id: connections.id,
      connectedUserId: sql<number>`CASE
        WHEN ${connections.requesterId} = ${userId} THEN ${connections.receiverId}
        ELSE ${connections.requesterId}
      END`,
      connectedUsername: users.username,
      connectedAt: connections.acceptedAt,
    })
    .from(connections)
    .innerJoin(
      users,
      sql`(
        (${connections.requesterId} = ${userId} AND ${users.id} = ${connections.receiverId})
        OR
        (${connections.receiverId} = ${userId} AND ${users.id} = ${connections.requesterId})
      )`,
    )
    .where(eq(connections.status, "accepted"));
}

/**
 * Notify on profile update
 * Used when a business or user updates their profile
 */
export async function notifyProfileUpdate(
  userId: number,
  entityType: "user" | "business",
  entityId: number,
  changes: Record<string, any>,
): Promise<void> {
  try {
    // Get user's connections
    const userConnections = await getUserConnections(userId);

    // Emit real-time event to all connections
    for (const connection of userConnections) {
      notificationEmitter.emit("profile_update", {
        fromUserId: userId,
        toUserId: connection.connectedUserId,
        entityType,
        entityId,
        changes,
        timestamp: new Date(),
      });
    }

    // Create audit log
    await db.insert(auditLogs).values({
      userId,
      action: "PROFILE_UPDATE",
      entityType,
      entityId: entityId.toString(),
      changes,
      ipAddress: "system",
    });
  } catch (error) {
    console.error("Error notifying profile update:", error);
  }
}

/**
 * Get notification summary for dashboard
 * Shows counts of pending requests, accepted connections, etc.
 */
export async function getNotificationSummary(userId: number) {
  const [pendingRequests] = await db
    .select({ count: sql<number>`count(*)` })
    .from(connections)
    .where(
      and(
        eq(connections.receiverId, userId),
        eq(connections.status, "pending"),
      ),
    );

  const [acceptedConnections] = await db
    .select({ count: sql<number>`count(*)` })
    .from(connections)
    .where(
      and(
        sql`(${connections.requesterId} = ${userId} OR ${connections.receiverId} = ${userId})`,
        eq(connections.status, "accepted"),
      ),
    );

  return {
    pendingConnectionRequests: pendingRequests?.count || 0,
    acceptedConnections: acceptedConnections?.count || 0,
    unreadNotifications: 0, // Would be from notifications table
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL SUBSCRIPTION TRIGGERS — Queue emails for matching subscribers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build the one-click unsubscribe URL for a subscription
 */
function buildUnsubscribeUrl(unsubscribeToken: string): string {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";
  return `${appUrl}/api/v1/email-subscriptions/unsubscribe/${unsubscribeToken}`;
}

/**
 * Notify subscribers when a new job is posted.
 * Finds all active job_alerts subscribers, checks filter matches,
 * and either sends instantly or queues for digest.
 */
export async function notifyNewJobPosted(job: {
  id: number;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  sector?: string;
}): Promise<{ instant: number; queued: number }> {
  let instant = 0;
  let queued = 0;

  try {
    // Find all active job_alerts subscriptions
    const subscribers = await db
      .select({
        subscription: emailSubscriptions,
        email: users.email,
        username: users.username,
      })
      .from(emailSubscriptions)
      .innerJoin(users, eq(emailSubscriptions.userId, users.id))
      .where(
        and(
          eq(emailSubscriptions.type, "job_alerts"),
          eq(emailSubscriptions.isActive, true),
        ),
      );

    const postedAt = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const appUrl =
      process.env.VITE_API_URL ||
      process.env.VERSOAIR_URL ||
      "http://localhost:5003";

    for (const sub of subscribers) {
      // Check filter match (if filters exist)
      const filters = (sub.subscription.filters as Record<string, any>) || {};
      if (filters.sectors && filters.sectors.length > 0 && job.sector) {
        if (!filters.sectors.includes(job.sector)) continue;
      }
      if (filters.locations && filters.locations.length > 0) {
        if (
          !filters.locations.some((loc: string) =>
            job.location?.toLowerCase().includes(loc.toLowerCase()),
          )
        )
          continue;
      }
      if (filters.keywords && filters.keywords.length > 0) {
        const jobText = `${job.title} ${job.company}`.toLowerCase();
        if (
          !filters.keywords.some((kw: string) =>
            jobText.includes(kw.toLowerCase()),
          )
        )
          continue;
      }

      const jobData: JobAlertData = {
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        type: job.type,
        postedAt,
        url: `${appUrl}/services/careers?job=${job.id}`,
      };

      if (sub.subscription.frequency === "instant") {
        // Send immediately
        const sent = await sendJobAlertEmail(
          sub.email!,
          sub.username || "User",
          [jobData],
          buildUnsubscribeUrl(sub.subscription.unsubscribeToken),
        );
        if (sent) instant++;

        // Update lastSentAt
        await db
          .update(emailSubscriptions)
          .set({ lastSentAt: new Date() })
          .where(eq(emailSubscriptions.id, sub.subscription.id));
      } else {
        // Queue for digest processing
        await db.insert(emailQueue).values({
          subscriptionId: sub.subscription.id,
          recipientEmail: sub.email!,
          recipientUserId: sub.subscription.userId,
          subject: `🎯 New job: ${job.title} at ${job.company}`,
          htmlBody: JSON.stringify(jobData), // Digest worker will render the full template
          status: "pending",
          emailType: "job_alert",
        });
        queued++;
      }
    }

    // Emit real-time event for Socket.io
    notificationEmitter.emit("job_posted", {
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: "job_posted",
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[NOTIFICATION] Job "${job.title}" → ${instant} instant emails sent, ${queued} queued for digest`,
    );
  } catch (error) {
    console.error("[NOTIFICATION] Error notifying job posted:", error);
  }

  return { instant, queued };
}

/**
 * Notify subscribers when a contract is posted.
 * Same pattern as job alerts, but for contract_alerts channel.
 */
export async function notifyNewContractPosted(contract: {
  id: number;
  title: string;
  client: string;
  location: string;
  budget?: string;
  duration?: string;
  skills: string[];
  sector?: string;
}): Promise<{ instant: number; queued: number }> {
  let instant = 0;
  let queued = 0;

  try {
    const subscribers = await db
      .select({
        subscription: emailSubscriptions,
        email: users.email,
        username: users.username,
      })
      .from(emailSubscriptions)
      .innerJoin(users, eq(emailSubscriptions.userId, users.id))
      .where(
        and(
          eq(emailSubscriptions.type, "contract_alerts"),
          eq(emailSubscriptions.isActive, true),
        ),
      );

    const postedAt = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const appUrl =
      process.env.VITE_API_URL ||
      process.env.VERSOAIR_URL ||
      "http://localhost:5003";

    for (const sub of subscribers) {
      const filters = (sub.subscription.filters as Record<string, any>) || {};
      if (filters.skills && filters.skills.length > 0) {
        const hasMatch = contract.skills.some((s) =>
          filters.skills.some((fs: string) =>
            s.toLowerCase().includes(fs.toLowerCase()),
          ),
        );
        if (!hasMatch) continue;
      }
      if (filters.locations && filters.locations.length > 0) {
        if (
          !filters.locations.some((loc: string) =>
            contract.location?.toLowerCase().includes(loc.toLowerCase()),
          )
        )
          continue;
      }

      const contractData: ContractAlertData = {
        title: contract.title,
        client: contract.client,
        location: contract.location,
        budget: contract.budget,
        duration: contract.duration,
        skills: contract.skills,
        postedAt,
        url: `${appUrl}/services/contractors?contract=${contract.id}`,
      };

      if (sub.subscription.frequency === "instant") {
        const sent = await sendContractAlertEmail(
          sub.email!,
          sub.username || "User",
          [contractData],
          buildUnsubscribeUrl(sub.subscription.unsubscribeToken),
        );
        if (sent) instant++;

        await db
          .update(emailSubscriptions)
          .set({ lastSentAt: new Date() })
          .where(eq(emailSubscriptions.id, sub.subscription.id));
      } else {
        await db.insert(emailQueue).values({
          subscriptionId: sub.subscription.id,
          recipientEmail: sub.email!,
          recipientUserId: sub.subscription.userId,
          subject: `🔨 New contract: ${contract.title}`,
          htmlBody: JSON.stringify(contractData),
          status: "pending",
          emailType: "contract_alert",
        });
        queued++;
      }
    }

    notificationEmitter.emit("contract_posted", {
      contractId: contract.id,
      title: contract.title,
      client: contract.client,
      type: "contract_posted",
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[NOTIFICATION] Contract "${contract.title}" → ${instant} instant, ${queued} queued`,
    );
  } catch (error) {
    console.error("[NOTIFICATION] Error notifying contract posted:", error);
  }

  return { instant, queued };
}

/**
 * Notify a user when their reservation status changes.
 * Targets the specific user who owns the reservation.
 */
export async function notifyReservationUpdate(reservation: {
  id: string | number;
  userId: number;
  businessName: string;
  date: string;
  time?: string;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "modified";
  totalPrice?: string;
  updateMessage?: string;
}): Promise<boolean> {
  try {
    // Check if user has reservation_tracking subscription
    const [sub] = await db
      .select({
        subscription: emailSubscriptions,
        email: users.email,
        username: users.username,
      })
      .from(emailSubscriptions)
      .innerJoin(users, eq(emailSubscriptions.userId, users.id))
      .where(
        and(
          eq(emailSubscriptions.userId, reservation.userId),
          eq(emailSubscriptions.type, "reservation_tracking"),
          eq(emailSubscriptions.isActive, true),
        ),
      );

    if (!sub) {
      console.log(
        `[NOTIFICATION] User ${reservation.userId} not subscribed to reservation_tracking`,
      );
      return false;
    }

    const reservationData: ReservationUpdateData = {
      reservationId: reservation.id.toString(),
      businessName: reservation.businessName,
      date: reservation.date,
      time: reservation.time,
      status: reservation.status,
      totalPrice: reservation.totalPrice,
      updateMessage: reservation.updateMessage,
    };

    // Reservation updates are always instant (status changes are time-sensitive)
    const sent = await sendReservationUpdateEmail(
      sub.email!,
      sub.username || "User",
      reservationData,
      buildUnsubscribeUrl(sub.subscription.unsubscribeToken),
    );

    if (sent) {
      await db
        .update(emailSubscriptions)
        .set({ lastSentAt: new Date() })
        .where(eq(emailSubscriptions.id, sub.subscription.id));
    }

    // Emit Socket.io event
    notificationEmitter.emit("reservation_update", {
      userId: reservation.userId,
      reservationId: reservation.id,
      businessName: reservation.businessName,
      status: reservation.status,
      type: "reservation_update",
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[NOTIFICATION] Reservation #${reservation.id} ${reservation.status} → email ${sent ? "sent" : "failed"}`,
    );
    return sent;
  } catch (error) {
    console.error("[NOTIFICATION] Error notifying reservation update:", error);
    return false;
  }
}

// ============================================
// GENERIC SOCIAL NOTIFICATIONS (NEW)
// ============================================

export interface CreateGenericNotificationParams {
  userId: number; // recipient
  type: string; // follow, like, comment, message, download, publish, etc.
  actorId?: number; // who triggered it (optional)
  actorName: string;
  message: string;
  entityUrl?: string;
}

/**
 * Create a generic notification for any social action
 * Used by: follow, like, comment, message, track publish, etc.
 */
export async function createGenericNotification(
  params: CreateGenericNotificationParams,
): Promise<boolean> {
  const { userId, type, actorName, message, entityUrl } = params;

  try {
    await db.insert(notifications).values({
      userId,
      type,
      title: actorName,
      message,
      actionUrl: entityUrl || null,
      isRead: false,
    });

    // Emit real-time event for WebSocket
    notificationEmitter.emit("notification", {
      userId,
      type,
      actorName,
      message,
      entityUrl,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error(
      "[NOTIFICATION] Failed to create generic notification:",
      error,
    );
    return false;
  }
}

/**
 * Notify when someone follows you
 */
export async function notifyFollow(params: {
  followerId: number;
  followingId: number;
  followerName: string;
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.followingId,
    type: "follow",
    actorId: params.followerId,
    actorName: params.followerName,
    message: "started following you",
    entityUrl: `/user/${params.followerId}`,
  });
}

/**
 * Notify when someone likes your post
 */
export async function notifyLike(params: {
  likerId: number;
  postAuthorId: number;
  likerName: string;
  postId: number;
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.postAuthorId,
    type: "like",
    actorId: params.likerId,
    actorName: params.likerName,
    message: "liked your post",
    entityUrl: `/post/${params.postId}`,
  });
}

/**
 * Notify when someone comments on your post
 */
export async function notifyComment(params: {
  commenterId: number;
  postAuthorId: number;
  commenterName: string;
  postId: number;
  commentPreview: string;
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.postAuthorId,
    type: "comment",
    actorId: params.commenterId,
    actorName: params.commenterName,
    message: `commented: "${params.commentPreview.slice(0, 50)}${params.commentPreview.length > 50 ? "..." : ""}"`,
    entityUrl: `/post/${params.postId}`,
  });
}

/**
 * Notify when someone sends you a message
 */
export async function notifyMessage(params: {
  senderId: number;
  recipientId: number;
  senderName: string;
  messagePreview: string;
  conversationId?: number;
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.recipientId,
    type: "message",
    actorId: params.senderId,
    actorName: params.senderName,
    message: `sent you a message: "${params.messagePreview.slice(0, 40)}${params.messagePreview.length > 40 ? "..." : ""}"`,
    entityUrl: params.conversationId
      ? `/inbox?conversation=${params.conversationId}`
      : "/inbox",
  });
}

/**
 * Notify when your track is published/approved
 */
export async function notifyTrackPublished(params: {
  artistId: number;
  trackTitle: string;
  trackId: number;
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.artistId,
    type: "publish",
    actorName: "Verso Air",
    message: `Your track "${params.trackTitle}" has been published!`,
    entityUrl: `/streaming/${params.trackId}`,
  });
}

/**
 * Notify when someone downloads your track
 */
export async function notifyTrackDownload(params: {
  artistId: number;
  downloaderId: number;
  downloaderName: string;
  trackTitle: string;
  trackId: number;
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.artistId,
    type: "download",
    actorId: params.downloaderId,
    actorName: params.downloaderName,
    message: `downloaded your track "${params.trackTitle}"`,
    entityUrl: `/streaming/${params.trackId}`,
  });
}

/**
 * Notify when someone mentions you in a post/comment
 */
export async function notifyMention(params: {
  mentionedUserId: number;
  mentionerId: number;
  mentionerName: string;
  postId: number;
  context: string; // "post" or "comment"
}): Promise<boolean> {
  return createGenericNotification({
    userId: params.mentionedUserId,
    type: "mention",
    actorId: params.mentionerId,
    actorName: params.mentionerName,
    message: `mentioned you in a ${params.context}`,
    entityUrl: `/post/${params.postId}`,
  });
}

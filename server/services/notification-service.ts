import { db } from "../db";
import { connections, users, auditLogs, notifications } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { EventEmitter } from "events";
import {
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
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

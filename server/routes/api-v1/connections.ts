import { Router, Request, Response } from "express";
import { db } from "../../db";
import { connections, users, auditLogs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  notifyConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getPendingConnections,
  getUserConnections,
} from "../../services/notification-service";
import { connectionRequestLimiter } from "../../middleware/rate-limiter";
import { resolveRequestActingUserId } from "../../utils/acting-user";

const router = Router();

/**
 * POST /api/v1/connections/request
 * Send a connection request (always from the signed-in user)
 */
router.post(
  "/request",
  connectionRequestLimiter,
  async (req: Request, res: Response) => {
    try {
      // fromUserId is optional; when sent it must be the signed-in user
      const fromUserId = resolveRequestActingUserId(
        req,
        res,
        req.body?.fromUserId,
      );
      if (fromUserId === null) return;

      const toUserId = Number(req.body?.toUserId);
      if (!Number.isSafeInteger(toUserId) || toUserId <= 0) {
        return res.status(400).json({
          success: false,
          error: "A valid toUserId is required",
        });
      }

      if (fromUserId === toUserId) {
        return res.status(400).json({
          success: false,
          error: "Cannot send connection request to yourself",
        });
      }

      // Check if connection already exists
      const existingConnection = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.requesterId, fromUserId),
            eq(connections.receiverId, toUserId),
          ),
        )
        .limit(1);

      if (existingConnection.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Connection request already exists",
        });
      }

      // Create connection request
      const [newConnection] = await db
        .insert(connections)
        .values({
          requesterId: fromUserId,
          receiverId: toUserId,
          status: "pending",
        })
        .returning();

      // Send notification
      const notification = await notifyConnectionRequest(fromUserId, toUserId);

      res.status(201).json({
        success: true,
        data: newConnection,
        notification,
        message: "Connection request sent successfully",
      });
    } catch (error: any) {
      console.error("Error sending connection request:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send connection request",
      });
    }
  },
);

/**
 * POST /api/v1/connections/:id/accept
 * Accept a connection request
 */
router.post("/:id/accept", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const result = await acceptConnectionRequest(
      parseInt(id),
      parseInt(userId as string),
    );

    if (!result.accepted) {
      return res.status(400).json({
        success: false,
        error: "Failed to accept connection or not authorized",
      });
    }

    res.json({
      success: true,
      notification: result.notification,
      message: "Connection request accepted",
    });
  } catch (error: any) {
    console.error("Error accepting connection:", error);
    res.status(500).json({
      success: false,
      error: "Failed to accept connection request",
    });
  }
});

/**
 * POST /api/v1/connections/:id/decline
 * Decline a connection request
 */
router.post("/:id/decline", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const success = await declineConnectionRequest(
      parseInt(id),
      parseInt(userId as string),
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        error: "Failed to decline connection",
      });
    }

    res.json({
      success: true,
      message: "Connection request declined",
    });
  } catch (error: any) {
    console.error("Error declining connection:", error);
    res.status(500).json({
      success: false,
      error: "Failed to decline connection request",
    });
  }
});

/**
 * GET /api/v1/connections/pending/:userId
 * Get pending connection requests for a user
 */
router.get("/pending/:userId", async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestActingUserId(req, res, req.params.userId, {
      staffRoles: ["admin", "superuser"],
    });
    if (userId === null) return;

    const pending = await getPendingConnections(userId);

    res.json({
      success: true,
      data: pending,
      count: pending.length,
    });
  } catch (error: any) {
    console.error("Error fetching pending connections:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending connections",
    });
  }
});

/**
 * GET /api/v1/connections/network/:userId
 * Get all connections for a user (accepted)
 */
router.get("/network/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const connections = await getUserConnections(parseInt(userId));

    res.json({
      success: true,
      data: connections,
      count: connections.length,
    });
  } catch (error: any) {
    console.error("Error fetching user connections:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user connections",
    });
  }
});

export default router;

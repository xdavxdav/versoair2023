import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { notificationEmitter } from "../services/notification-service";

let io: SocketIOServer | null = null;
const userConnections = new Map<number, string[]>(); // userId -> [socketIds]

export function initializeSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        "http://localhost:5003", // Single port for frontend + backend
        "http://localhost:3000",
        process.env.PRODUCTION_URL || "http://localhost:5003",
      ],
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // ---------- CONNECTION HANDLERS ----------
  io.on("connection", (socket: Socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // User joins their personal notification room
    socket.on("user_auth", (userId: number) => {
      const roomName = `user_${userId}`;
      socket.join(roomName);

      // Track this connection
      const connections = userConnections.get(userId) || [];
      connections.push(socket.id);
      userConnections.set(userId, connections);

      console.log(
        `[SOCKET] User ${userId} joined room ${roomName} (socket ${socket.id})`,
      );

      // Emit confirmation
      socket.emit("auth_confirmed", { userId, roomName });
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);

      // Clean up user connections map
      for (const [userId, socketIds] of userConnections.entries()) {
        const filtered = socketIds.filter((id) => id !== socket.id);
        if (filtered.length === 0) {
          userConnections.delete(userId);
        } else {
          userConnections.set(userId, filtered);
        }
      }
    });

    socket.on("error", (err: Error) => {
      console.error(`[SOCKET] Error on socket ${socket.id}:`, err.message);
    });
  });

  // ---------- NOTIFICATION EMITTER INTEGRATION ----------
  // Broadcast connection requests to recipient in real-time
  notificationEmitter.on("connection_request", (data) => {
    if (!io) return;

    const roomName = `user_${data.toUserId}`;
    console.log(
      `[SOCKET] Broadcasting connection_request to ${roomName}`,
      data,
    );

    io.to(roomName).emit("notification", {
      id: data.id,
      type: "connection_request",
      title: `${data.fromUserName} sent you a connection request`,
      message: `Check out their profile and connect!`,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
      timestamp: new Date().toISOString(),
      read: false,
    });
  });

  // Broadcast connection accepted notifications
  notificationEmitter.on("connection_accepted", (data) => {
    if (!io) return;

    const roomName = `user_${data.fromUserId}`;
    console.log(
      `[SOCKET] Broadcasting connection_accepted to ${roomName}`,
      data,
    );

    io.to(roomName).emit("notification", {
      id: data.id,
      type: "connection_accepted",
      title: `${data.toUserName} accepted your connection request`,
      message: `You are now connected!`,
      toUserId: data.toUserId,
      toUserName: data.toUserName,
      timestamp: new Date().toISOString(),
      read: false,
    });
  });

  // Broadcast profile update notifications
  notificationEmitter.on("profile_updated", (data) => {
    if (!io) return;

    const roomName = `user_${data.userId}`;
    console.log(`[SOCKET] Broadcasting profile_updated to ${roomName}`, data);

    io.to(roomName).emit("notification", {
      id: data.id,
      type: "profile_updated",
      title: "Your profile has been updated",
      message: data.changes || "Your profile information has changed",
      timestamp: new Date().toISOString(),
      read: false,
    });
  });

  // Broadcast new job posted (to all connected users — client filters relevance)
  notificationEmitter.on("job_posted", (data) => {
    if (!io) return;

    console.log(`[SOCKET] Broadcasting job_posted globally`, data);
    io.emit("notification", {
      id: `job-${data.jobId}`,
      type: "job_posted",
      title: `New job: ${data.title}`,
      message: `${data.company} · ${data.location}`,
      timestamp: data.timestamp,
      read: false,
    });
  });

  // Broadcast new contract posted
  notificationEmitter.on("contract_posted", (data) => {
    if (!io) return;

    console.log(`[SOCKET] Broadcasting contract_posted globally`, data);
    io.emit("notification", {
      id: `contract-${data.contractId}`,
      type: "contract_posted",
      title: `New contract: ${data.title}`,
      message: `${data.client}`,
      timestamp: data.timestamp,
      read: false,
    });
  });

  // Broadcast reservation update to specific user
  notificationEmitter.on("reservation_update", (data) => {
    if (!io) return;

    const roomName = `user_${data.userId}`;
    console.log(
      `[SOCKET] Broadcasting reservation_update to ${roomName}`,
      data,
    );

    io.to(roomName).emit("notification", {
      id: `reservation-${data.reservationId}`,
      type: "reservation_update",
      title: `Reservation ${data.status}`,
      message: `Your booking at ${data.businessName} has been ${data.status}`,
      timestamp: data.timestamp,
      read: false,
    });
  });

  // Broadcast track review result to the artist (Purgatoire)
  notificationEmitter.on("track_reviewed", (data) => {
    if (!io) return;

    const roomName = `user_${data.userId}`;
    const isApproved = data.status === "approved";
    console.log(
      `[SOCKET] Broadcasting track_reviewed (${data.status}) to ${roomName}: "${data.trackTitle}"`,
    );

    io.to(roomName).emit("notification", {
      id: `track-review-${data.trackId}-${Date.now()}`,
      type: "track_review",
      title: isApproved ? "✅ Track Approved!" : "⚠️ Track Needs Revision",
      message: data.message,
      timestamp: new Date().toISOString(),
      read: false,
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function isUserConnected(userId: number): boolean {
  return (
    userConnections.has(userId) &&
    (userConnections.get(userId)?.length || 0) > 0
  );
}

export function getUserSocketCount(userId: number): number {
  return userConnections.get(userId)?.length || 0;
}

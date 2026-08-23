import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { notificationEmitter } from "../services/notification-service";

let io: SocketIOServer | null = null;
const userConnections = new Map<number, string[]>(); // userId -> [socketIds]

/**
 * Mirrors the HTTP CORS allowlist in server/index.ts so socket origins can't
 * drift from the app's. In production CORS_ORIGIN is authoritative.
 */
function socketAllowedOrigins(): string[] {
  return process.env.NODE_ENV === "production"
    ? (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [
        "http://localhost:5003",
        "http://localhost:5004",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
      ];
}

/** Reads a cookie value out of a raw `Cookie` header. */
function cookieFromHeader(
  header: string | undefined,
  name: string,
): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * Verifies the JWT presented on the socket handshake and returns the numeric
 * user id. The token is the ONLY source of identity — a client-supplied
 * userId is never trusted, otherwise any connected socket could join another
 * user's notification room and read their private notifications.
 */
function authenticateHandshake(socket: Socket): number | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const handshakeToken = socket.handshake.auth?.token;
  const token =
    (typeof handshakeToken === "string" && handshakeToken) ||
    cookieFromHeader(socket.handshake.headers.cookie, "auth_token");
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret) as { userId?: string | number };
    const userId = Number(decoded?.userId);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
}

export function initializeSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: socketAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // ---------- HANDSHAKE AUTH ----------
  // Unauthenticated sockets are still allowed to connect (public broadcasts
  // like job_posted are not user-scoped), but they get no verified identity
  // and therefore can never join a `user_*` room.
  io.use((socket, next) => {
    socket.data.userId = authenticateHandshake(socket);
    next();
  });

  // ---------- CONNECTION HANDLERS ----------
  io.on("connection", (socket: Socket) => {
    const userId: number | null = socket.data.userId ?? null;
    console.log(
      `[SOCKET] Connected: ${socket.id} (user: ${userId ?? "anonymous"})`,
    );

    // Join the personal notification room automatically, using the identity
    // proven by the JWT. No client event is required or trusted for this.
    if (userId !== null) {
      const roomName = `user_${userId}`;
      socket.join(roomName);

      const connections = userConnections.get(userId) || [];
      connections.push(socket.id);
      userConnections.set(userId, connections);

      console.log(
        `[SOCKET] User ${userId} joined room ${roomName} (socket ${socket.id})`,
      );

      socket.emit("authenticated", { userId, roomName });
      socket.emit("auth_confirmed", { userId, roomName }); // legacy event name
    } else {
      socket.emit("unauthenticated", {
        message: "No valid session — only public broadcasts will be received.",
      });
    }

    // Legacy no-ops: identity is established at handshake time. These remain so
    // older clients emitting them don't error, but the payload is ignored.
    socket.on("authenticate", () => {
      if (socket.data.userId !== null && socket.data.userId !== undefined) {
        socket.emit("authenticated", { userId: socket.data.userId });
      }
    });
    socket.on("user_auth", () => {
      if (socket.data.userId !== null && socket.data.userId !== undefined) {
        socket.emit("auth_confirmed", { userId: socket.data.userId });
      }
    });

    // Game room: player joins a match room for real-time PvP sync
    socket.on("join_game_room", (data: { room: string }) => {
      if (socket.data.userId === null || socket.data.userId === undefined) {
        return; // authenticated users only
      }
      if (data?.room && data.room.startsWith("game_")) {
        socket.join(data.room);
        console.log(`[SOCKET] ${socket.id} joined game room ${data.room}`);
      }
    });

    socket.on("leave_game_room", (data: { room: string }) => {
      if (data?.room && data.room.startsWith("game_")) {
        socket.leave(data.room);
      }
    });

    // Inbox typing indicator — relayed to the other participant's room only.
    socket.on(
      "inbox_typing",
      (data: {
        toUserId: number;
        conversationId: number;
        isTyping: boolean;
      }) => {
        if (socket.data.userId === null || socket.data.userId === undefined) {
          return;
        }
        if (!data?.toUserId || !data?.conversationId) return;
        io?.to(`user_${data.toUserId}`).emit("inbox_typing", {
          conversationId: data.conversationId,
          fromUserId: socket.data.userId,
          isTyping: Boolean(data.isTyping),
        });
      },
    );

    // Presence check — respond with whether the requested user has an active socket
    socket.on("presence_check", (data: { userId: number }) => {
      if (!data?.userId) return;
      socket.emit("presence_status", {
        userId: data.userId,
        online: isUserConnected(data.userId),
      });
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

  // Broadcast an inbox message to the recipient in real-time — powers live
  // updates in MessengerPanel/MessengerLauncher without polling.
  notificationEmitter.on("inbox_message", (data) => {
    if (!io) return;

    const roomName = `user_${data.toUserId}`;
    io.to(roomName).emit("inbox_message", {
      conversationId: data.conversationId,
      message: data.message,
    });

    io.to(roomName).emit("notification", {
      id: `inbox-${data.message?.id ?? Date.now()}`,
      type: "message",
      title: `New message from ${data.message?.senderName || "someone"}`,
      message: data.message?.content?.slice(0, 100) || "",
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

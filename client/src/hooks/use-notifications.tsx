import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { AuthUser } from "./use-auth";

export interface Notification {
  id: string;
  fromUserId: number;
  fromUser?: {
    id: number;
    name: string;
    email: string;
  };
  type: "connection_request" | "connection_accepted" | "message" | "activity";
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

/**
 * Hook to manage Socket.io connection and notifications
 * Connects to real-time notification updates for authenticated user
 */
export function useNotifications(
  user: AuthUser | null,
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!user) {
      // Disconnect if no user
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      setIsConnected(false);
      return;
    }

    try {
      // Create socket connection with auth header
      const socket = io(window.location.origin, {
        auth: {
          token: localStorage.getItem("authToken") || "",
          userId: user.id,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      // Connection handlers
      socket.on("connect", () => {
        console.log(
          `[SOCKET] Connected to server with ID: ${socket.id} for user: ${user.id}`,
        );
        setIsConnected(true);
        setError(null);

        // Authenticate in user-specific room
        socket.emit("authenticate", {
          userId: user.id,
          token: localStorage.getItem("authToken"),
        });
      });

      socket.on("authenticated", () => {
        console.log(`[SOCKET] User authenticated in room: user_${user.id}`);
      });

      socket.on("connect_error", (error: any) => {
        console.error("[SOCKET] Connection error:", error);
        setError(error.message || "Connection error");
        setIsConnected(false);
      });

      socket.on("disconnect", (reason) => {
        console.log(`[SOCKET] Disconnected: ${reason}`);
        setIsConnected(false);
      });

      // Notification handlers
      socket.on("connection_request", (data: any) => {
        console.log("[NOTIFICATION] Connection request received:", data);
        const notification: Notification = {
          id: `${Date.now()}_${Math.random()}`,
          fromUserId: data.fromUserId,
          fromUser: data.fromUser,
          type: "connection_request",
          title: `${data.fromUser?.name || "User"} sent a connection request`,
          description: data.message || "Click to view request",
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [notification, ...prev]);
      });

      socket.on("connection_accepted", (data: any) => {
        console.log("[NOTIFICATION] Connection accepted:", data);
        const notification: Notification = {
          id: `${Date.now()}_${Math.random()}`,
          fromUserId: data.fromUserId,
          fromUser: data.fromUser,
          type: "connection_accepted",
          title: `${data.fromUser?.name || "User"} accepted your connection`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [notification, ...prev]);
      });

      socket.on("new_notification", (data: any) => {
        console.log("[NOTIFICATION] New notification:", data);
        const notification: Notification = {
          id: data.id || `${Date.now()}_${Math.random()}`,
          fromUserId: data.fromUserId || 0,
          type: data.type || "activity",
          title: data.title,
          description: data.description,
          timestamp: data.timestamp || new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [notification, ...prev]);
      });

      socket.on("error", (error: any) => {
        console.error("[SOCKET] Socket error:", error);
        setError(error?.message || "Socket error occurred");
      });

      socketRef.current = socket;

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    } catch (err) {
      console.error("[useNotifications] Error initializing socket:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize socket",
      );
    }
  }, [user]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    clearNotifications,
  };
}

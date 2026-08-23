/**
 * useInboxSocket — single shared socket.io connection for real-time inbox
 * messages. Powers MessengerLauncher (unread badge) and MessengerPanel
 * (live message push) without polling.
 */
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/auth";

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      path: "/socket.io",
      withCredentials: true,
      auth: { token: getAuthToken() ?? undefined },
      transports: ["websocket", "polling"],
    });
  }
  return sharedSocket;
}

export interface InboxMessageEvent {
  conversationId: number;
  message: {
    id: number;
    conversationId: number;
    senderId: string;
    senderName: string;
    senderAvatar?: string | null;
    content: string;
    isRead: boolean;
    createdAt: string;
  };
}

export function useInboxSocket(onMessage?: (data: InboxMessageEvent) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    refCount++;

    const handler = (data: InboxMessageEvent) => onMessage?.(data);
    if (onMessage) socket.on("inbox_message", handler);

    return () => {
      if (onMessage) socket.off("inbox_message", handler);
      refCount--;
      if (refCount <= 0) {
        sharedSocket?.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, [onMessage]);

  return socketRef;
}

export interface TypingEvent {
  conversationId: number;
  fromUserId: number;
  isTyping: boolean;
}

/** Listen for typing indicator events from the other participant. */
export function useInboxTyping(onTyping?: (data: TypingEvent) => void) {
  useEffect(() => {
    if (!onTyping) return;
    const socket = getSocket();
    refCount++;
    socket.on("inbox_typing", onTyping);
    return () => {
      socket.off("inbox_typing", onTyping);
      refCount--;
      if (refCount <= 0) {
        sharedSocket?.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, [onTyping]);
}

/** Emit a typing state change to the other participant in a conversation. */
export function emitInboxTyping(
  toUserId: number,
  conversationId: number,
  isTyping: boolean,
) {
  getSocket().emit("inbox_typing", { toUserId, conversationId, isTyping });
}

/** One-shot presence check — resolves via the "presence_status" callback. */
export function checkPresence(
  userId: number,
  onStatus: (online: boolean) => void,
) {
  const socket = getSocket();
  const handler = (data: { userId: number; online: boolean }) => {
    if (data.userId === userId) {
      onStatus(data.online);
      socket.off("presence_status", handler);
    }
  };
  socket.on("presence_status", handler);
  socket.emit("presence_check", { userId });
}

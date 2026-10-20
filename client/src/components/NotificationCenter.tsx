// Global notification bell — amber badge, real-time socket, click-to-read.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  Download,
  Radio,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";
import {
  useInboxSocket,
  useNotificationSocket,
  type SocketNotificationEvent,
} from "@/hooks/use-inbox-socket";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface AppNotification {
  id: string;
  type:
    | "follow"
    | "like"
    | "comment"
    | "message"
    | "mention"
    | "download"
    | "publish";
  actorName: string;
  actorAvatar?: string | null;
  text: string;
  entityUrl?: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

const TYPE_ICON: Record<AppNotification["type"], React.ReactNode> = {
  follow: <UserPlus className="w-4 h-4 text-amber-400" />,
  like: <Heart className="w-4 h-4 text-red-400" />,
  comment: <MessageCircle className="w-4 h-4 text-blue-400" />,
  message: <MessageCircle className="w-4 h-4 text-violet-400" />,
  mention: <MessageCircle className="w-4 h-4 text-cyan-400" />,
  download: <Download className="w-4 h-4 text-amber-400" />,
  publish: <Radio className="w-4 h-4 text-green-400" />,
};

export default function NotificationCenter() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const loadRequestId = useRef(0);
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const push = usePushNotifications();

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    loadRequestId.current++;
    setNotifications([]);
    setLoadError(null);
    setLoading(false);
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadRequestId.current;
    const userId = user.id;
    setLoading(true);
    setLoadError(null);
    try {
      const r = await authenticatedFetch("/api/notifications");
      if (!r.ok) {
        throw new Error(`Request failed with status ${r.status}`);
      }
      const data = await r.json();
      if (!data?.success || !Array.isArray(data.notifications)) {
        throw new Error("Unexpected notifications response");
      }
      if (
        requestId !== loadRequestId.current ||
        currentUserId.current !== userId
      ) {
        return;
      }
      setNotifications(data.notifications);
    } catch (error) {
      console.error("[NotificationCenter] Failed to load notifications:", error);
      if (
        requestId === loadRequestId.current &&
        currentUserId.current === userId
      ) {
        setLoadError("Unable to load notifications. Please try again.");
      }
    } finally {
      if (
        requestId === loadRequestId.current &&
        currentUserId.current === userId
      ) {
        setLoading(false);
      }
    }
  }, [user]);

  // Fetch immediately on mount so red dot shows on page load
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user, fetchNotifications]);

  // Live real-time notifications via WebSocket
  const handleRealtimeNotification = useCallback(
    (data: SocketNotificationEvent) => {
      const typeKey = (data.type || "publish") as AppNotification["type"];
      const newNotif: AppNotification = {
        id: String(data.id || `live-notif-${Date.now()}`),
        type: TYPE_ICON[typeKey] ? typeKey : "publish",
        actorName: data.actorName || data.title || "Someone",
        actorAvatar: data.actorAvatar || null,
        text: data.text || data.message || "New notification",
        entityUrl: data.entityUrl || undefined,
        read: false,
        createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
      };

      setNotifications((prev) => [
        newNotif,
        ...prev.filter((n) => n.id !== newNotif.id),
      ]);
    },
    [],
  );
  useNotificationSocket(user ? handleRealtimeNotification : undefined);

  // Live push via inbox socket for messages
  const handleLiveMessage = useCallback(() => {
    if (!open) {
      setNotifications((prev) => [
        {
          id: `live-msg-${Date.now()}`,
          type: "message",
          actorName: "Someone",
          text: "sent you a message",
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  }, [open]);
  useInboxSocket(user ? handleLiveMessage : undefined);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    const userId = user?.id;
    const previousReadState = new Map(
      notifications.map((notification) => [notification.id, notification.read]),
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const response = await authenticatedFetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      if (currentUserId.current !== userId) return;
      window.dispatchEvent(new CustomEvent("notifications:read"));
      setLoadError(null);
    } catch (error) {
      console.error("[NotificationCenter] Failed to mark all as read:", error);
      if (currentUserId.current !== userId) return;
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read:
            previousReadState.get(notification.id) ?? notification.read,
        })),
      );
      setLoadError("Unable to update notifications. Please try again.");
    }
  };

  const markOne = async (id: string): Promise<boolean> => {
    const userId = user?.id;
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return false;
    if (notification.read) return true;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      const response = await authenticatedFetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      if (currentUserId.current !== userId) return false;
      setLoadError(null);
      return true;
    } catch (error) {
      console.error("[NotificationCenter] Failed to mark notification as read:", error);
      if (currentUserId.current !== userId) return false;
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: notification.read } : item,
        ),
      );
      setLoadError("Unable to update notifications. Please try again.");
      return false;
    }
  };

  const handleOpenToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && unread > 0) void markAllRead();
  };

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger */}
      <button
        onClick={handleOpenToggle}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-[300] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-white text-sm">
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {push.isSupported && (
                  <button
                    onClick={() =>
                      push.isSubscribed ? push.unsubscribe() : push.subscribe()
                    }
                    disabled={push.isLoading}
                    className="flex items-center gap-1 text-xs text-white/50 hover:text-amber-300 transition-colors disabled:opacity-50"
                    title={
                      push.isSubscribed
                        ? "Disable browser notifications"
                        : "Enable browser notifications (even when the app is closed)"
                    }
                  >
                    <BellRing className="w-3.5 h-3.5" />
                  </button>
                )}
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              )}
              {!loading && loadError && (
                <div className="py-8 text-center space-y-3">
                  <p className="text-rose-300 text-sm">{loadError}</p>
                  <button
                    onClick={fetchNotifications}
                    className="text-sm text-amber-300 underline underline-offset-4"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loading && !loadError && notifications.length === 0 && (
                  <div className="py-12 text-center space-y-2">
                    <Bell className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-white/40 text-sm">
                      No notifications yet
                    </p>
                  </div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={async () => {
                    const markedRead = await markOne(n.id);
                    if (!markedRead) return;
                    if (n.entityUrl) {
                      try {
                        const destination = new URL(
                          n.entityUrl,
                          window.location.origin,
                        );
                        if (destination.origin !== window.location.origin) {
                          setLoadError("This notification link is unavailable.");
                          return;
                        }
                        window.location.assign(destination.href);
                      } catch (error) {
                        console.error(
                          "[NotificationCenter] Invalid notification link:",
                          error,
                        );
                        setLoadError("This notification link is unavailable.");
                        return;
                      }
                    }
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!n.read ? "bg-amber-500/5" : ""}`}
                >
                  {/* Actor avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {n.actorAvatar ? (
                      <img
                        src={n.actorAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white/60">
                        {n.actorName?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {TYPE_ICON[n.type] || TYPE_ICON.publish}
                      <p className="text-sm text-white truncate">
                        <span className="font-semibold">{n.actorName}</span>{" "}
                        {n.text}
                      </p>
                    </div>
                    <p className="text-[11px] text-white/30">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

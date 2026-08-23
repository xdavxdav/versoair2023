// Global notification bell — amber badge, real-time socket, click-to-read.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X, Check, CheckCheck, Heart, MessageCircle, UserPlus, Download, Radio } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";
import { useInboxSocket } from "@/hooks/use-inbox-socket";

interface AppNotification {
  id: string;
  type: "follow" | "like" | "comment" | "message" | "mention" | "download" | "publish";
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
  follow:   <UserPlus className="w-4 h-4 text-amber-400" />,
  like:     <Heart className="w-4 h-4 text-red-400" />,
  comment:  <MessageCircle className="w-4 h-4 text-blue-400" />,
  message:  <MessageCircle className="w-4 h-4 text-violet-400" />,
  mention:  <MessageCircle className="w-4 h-4 text-cyan-400" />,
  download: <Download className="w-4 h-4 text-amber-400" />,
  publish:  <Radio className="w-4 h-4 text-green-400" />,
};

export default function NotificationCenter() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Fetch on first open
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    authenticatedFetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data?.notifications) setNotifications(data.notifications);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user]);

  // Live push via inbox socket — any new-message event bumps unread count
  const handleLive = useCallback(() => {
    if (!open) {
      setNotifications((prev) => [
        {
          id: `live-${Date.now()}`,
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
  useInboxSocket(user ? handleLive : undefined);

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
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    authenticatedFetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  };

  const markOne = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    authenticatedFetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  };

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
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
              <span className="font-semibold text-white text-sm">Notifications</span>
              <div className="flex items-center gap-2">
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
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
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
              {!loading && notifications.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <Bell className="w-8 h-8 text-white/20 mx-auto" />
                  <p className="text-white/40 text-sm">No notifications yet</p>
                </div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { markOne(n.id); if (n.entityUrl) window.location.href = n.entityUrl; }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!n.read ? 'bg-amber-500/5' : ''}`}
                >
                  {/* Actor avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {n.actorAvatar ? (
                      <img
                        src={n.actorAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white/60">{n.actorName?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {TYPE_ICON[n.type]}
                      <p className="text-sm text-white truncate">
                        <span className="font-semibold">{n.actorName}</span>{' '}{n.text}
                      </p>
                    </div>
                    <p className="text-[11px] text-white/30">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

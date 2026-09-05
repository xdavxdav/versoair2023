/**
 * VERSO AIR — TWITTER-LIKE UNIFIED MESSENGER
 * Portal-themed: Musical Universe = Purple | Community = Cyan
 * Drop-in replacement for your broken messaging system.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Search,
  ChevronLeft,
  Loader2,
  Music,
  Users,
  CheckCheck,
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  Mic,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/* -------------------------------------------------------------------------- */
/* PORTAL THEME TOKENS */
/* -------------------------------------------------------------------------- */

const PORTALS = {
  music: {
    key: "music",
    label: "Musical Universe",
    color: "#8b5cf6", // violet-500
    bg: "bg-violet-500",
    bgLight: "bg-violet-500/10",
    bgHover: "hover:bg-violet-500/[0.07]",
    border: "border-violet-500/25",
    text: "text-violet-400",
    textStrong: "text-violet-300",
    ring: "ring-violet-500/30",
    shadow: "shadow-[0_0_12px_rgba(139,92,246,0.12)]",
    icon: Music,
  },
  community: {
    key: "community",
    label: "Community",
    color: "#06b6d4", // cyan-500
    bg: "bg-cyan-500",
    bgLight: "bg-cyan-500/10",
    bgHover: "hover:bg-cyan-500/[0.07]",
    border: "border-cyan-500/25",
    text: "text-cyan-400",
    textStrong: "text-cyan-300",
    ring: "ring-cyan-500/30",
    shadow: "shadow-[0_0_12px_rgba(6,182,212,0.12)]",
    icon: Users,
  },
} as const;

type PortalKey = keyof typeof PORTALS;

/* -------------------------------------------------------------------------- */
/* 1. HEADER MESSAGES BUTTON (Twitter-style, minimal) */
/* -------------------------------------------------------------------------- */

export function HeaderMessagesButton({
  className = "",
}: {
  className?: string;
}) {
  const { user, loading: isLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || isLoading) return;

    let cancelled = false;

    fetch("/api/inbox/conversations", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        const count = (data.conversations || []).reduce(
          (sum: number, c: any) => sum + (c.unreadCount || 0),
          0,
        );
        setUnreadCount(count);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user, isLoading]);

  const handleClick = () => {
    if (!user) {
      window.location.href = `/signin?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    window.location.assign("/messages");
  };

  if (isLoading) return null;

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100 ${className}`}
      aria-label="Messages"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Messages</span>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. /messages PAGE (Real page, not redirect trap) */
/* -------------------------------------------------------------------------- */

export function MessagesPage() {
  const { user, loading: isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      setLocation(`/signin?returnTo=${returnTo}`);
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex h-screen max-w-[1200px] border-x border-white/[0.06]">
        <div className="flex-1">
          <TwitterMessenger
            open={true}
            onClose={() => setLocation("/")}
            inline
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. TWITTER-STYLE MESSENGER PANEL */
/* -------------------------------------------------------------------------- */

interface TwitterMessengerProps {
  open: boolean;
  onClose: () => void;
  inline?: boolean;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  type: "direct" | "group";
  portal: PortalKey;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string | number;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  pending?: boolean;
  portal?: PortalKey;
}

export function TwitterMessenger({
  open,
  onClose,
  inline = false,
}: TwitterMessengerProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [portalFilter, setPortalFilter] = useState<"all" | PortalKey>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Load conversations ── */
  useEffect(() => {
    if (!open || !user) {
      setConversations([]);
      setSelectedConv(null);
      setMessages([]);
      setError(null);
      return;
    }

    setLoadingConvs(true);
    setError(null);

    fetch("/api/inbox/conversations", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.success) {
          setError(data?.error?.message || "Could not load conversations.");
          setConversations([]);
          return;
        }
        setConversations(data.conversations || []);
      })
      .catch((err) => {
        setError(err?.message || "Network error. Please try again.");
        setConversations([]);
      })
      .finally(() => setLoadingConvs(false));
  }, [open, user]);

  /* ── Load messages ── */
  useEffect(() => {
    if (!selectedConv?.id) {
      setMessages([]);
      return;
    }

    setLoadingMsgs(true);

    fetch(`/api/inbox/conversations/${selectedConv.id}/messages`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setMessages(data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [selectedConv]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  /* ── Send ── */
  const sendMessage = useCallback(async () => {
    const text = msgText.trim();
    if (!text || !selectedConv || sending) return;

    setSending(true);

    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      conversationId: selectedConv.id,
      senderId: String(user?.id),
      senderName:
        user?.name || user?.username || user?.email?.split("@")[0] || "You",
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      pending: true,
      portal: selectedConv.portal,
    };

    setMessages((prev) => [...prev, optimistic]);
    setMsgText("");

    try {
      const res = await fetch(
        `/api/inbox/conversations/${selectedConv.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: text }),
        },
      );

      const data = await res.json();

      if (data?.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m)),
        );
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === selectedConv.id);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: text,
            lastMessageAt: new Date().toISOString(),
          };
          const [item] = updated.splice(idx, 1);
          return [item, ...updated];
        });
      } else {
        throw new Error(data?.error?.message || "Send failed");
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Message could not be sent.");
    } finally {
      setSending(false);
    }
  }, [msgText, selectedConv, sending, user]);

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    let list = conversations;
    if (portalFilter !== "all") {
      list = list.filter((c) => c.portal === portalFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        (c.participantName || "").toLowerCase().includes(q),
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.lastMessageAt || 0).getTime() -
        new Date(a.lastMessageAt || 0).getTime(),
    );
  }, [conversations, portalFilter, search]);

  /* ── Auth wall ── */
  if (!user) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`${inline ? "" : "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"}`}
            onClick={!inline ? onClose : undefined}
          >
            <div
              className={`rounded-2xl border border-white/10 bg-[#0a0a0f] p-8 text-center shadow-2xl ${inline ? "" : "w-full max-w-sm mx-4"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                <MessageCircle
                  className="h-7 w-7 text-cyan-400"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="mb-1 text-xl font-bold text-white">
                Sign in to Messages
              </h3>
              <p className="mb-6 text-sm text-white/40">
                Connect with the Musical Universe and Community.
              </p>
              <a
                href={`/signin?returnTo=${encodeURIComponent(window.location.pathname)}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-80"
              >
                Sign In
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const theme = selectedConv ? PORTALS[selectedConv.portal] : null;

  /* ── Panel Body ── */
  const panelBody = (
    <div
      className={`flex ${inline ? "h-full" : "h-[85vh] sm:h-[600px]"} overflow-hidden bg-black`}
    >
      {/* LEFT SIDEBAR — Conversation List */}
      <div
        className={`flex w-full flex-col border-r border-white/[0.06] sm:w-[320px] lg:w-[360px] ${selectedConv ? "hidden sm:flex" : "flex"}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-black/80 px-4 py-3 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white sm:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Portal Filter Tabs */}
          <div className="flex gap-1">
            {(["all", "music", "community"] as const).map((key) => {
              const active = portalFilter === key;
              const portal = key === "all" ? null : PORTALS[key];

              return (
                <button
                  key={key}
                  onClick={() => setPortalFilter(key)}
                  className={`relative flex-1 rounded-full py-1.5 text-xs font-medium transition-all ${
                    active ? "text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {key === "all" ? (
                    <span className="flex items-center justify-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      All
                    </span>
                  ) : portal ? (
                    <span className="flex items-center justify-center gap-1">
                      <portal.icon
                        className="h-3 w-3"
                        style={{ color: portal.color }}
                      />
                      {portal.label}
                    </span>
                  ) : null}
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 -z-10 rounded-full bg-white/10"
                      transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 300,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Direct Messages"
              className="w-full rounded-full border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-cyan-500/30 focus:bg-white/[0.05] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          )}

          {error && !loadingConvs && (
            <div className="px-4 py-8 text-center">
              <p className="mb-2 text-sm text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-cyan-400 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loadingConvs && !error && filtered.length === 0 && (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03]">
                <MessageCircle className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-sm font-medium text-white/60">
                No conversations yet
              </p>
              <p className="mt-1 text-xs text-white/30">
                Start messaging from a profile or listing.
              </p>
            </div>
          )}

          {filtered.map((conv) => {
            const portal = PORTALS[conv.portal];
            const isUnread = (conv.unreadCount || 0) > 0;
            const isSelected = selectedConv?.id === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConv(conv);
                  setError(null);
                }}
                className={`group flex w-full items-start gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                }`}
              >
                {/* Avatar with portal ring */}
                <div className={`relative flex-shrink-0`}>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] ${isUnread ? portal.ring : ""} ring-2`}
                  >
                    <span className="text-sm font-semibold text-white/70">
                      {(conv.participantName || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Portal dot */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-black"
                    style={{ backgroundColor: portal.color }}
                  >
                    <portal.icon className="h-2 w-2 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-sm ${isUnread ? "font-bold text-white" : "font-medium text-white/80"}`}
                    >
                      {conv.participantName || "Unknown"}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[11px] ${isUnread ? "font-semibold text-cyan-400" : "text-white/30"}`}
                    >
                      {formatShortTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 truncate text-[13px] leading-5 ${isUnread ? "font-medium text-white/90" : "text-white/40"}`}
                  >
                    {conv.lastMessage || "No messages yet"}
                  </p>
                  {isUnread && (
                    <span className="mt-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-bold text-black">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Message Thread */}
      <div
        className={`flex flex-1 flex-col ${selectedConv ? "flex" : "hidden sm:flex"}`}
      >
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/[0.06] bg-black/80 px-4 py-3 backdrop-blur-md">
              <button
                onClick={() => setSelectedConv(null)}
                className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white sm:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] ${theme?.ring || ""} ring-2`}
              >
                <span className="text-sm font-bold text-white/80">
                  {(selectedConv.participantName || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-white">
                  {selectedConv.participantName}
                </p>
                <p
                  className={`flex items-center gap-1 text-[11px] ${theme?.text || "text-white/30"}`}
                >
                  {theme?.icon && <theme.icon className="h-3 w-3" />}
                  {theme?.label || "Direct message"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-full p-2.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
                  title="Voice call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  className="rounded-full p-2.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
                  title="Video call"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  className="rounded-full p-2.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
                  title="Conversation info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
            >
              {loadingMsgs && messages.length === 0 && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-white/20" />
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = String(msg.senderId) === String(user?.id);
                const showDate =
                  idx === 0 ||
                  dateDivider(messages[idx - 1]?.createdAt, msg.createdAt);
                const msgPortal = PORTALS[msg.portal || selectedConv.portal];

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="my-4 flex items-center justify-center">
                        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/30">
                          {formatDateDivider(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`group relative max-w-[80%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}
                      >
                        {!isMe &&
                          (idx === 0 ||
                            String(messages[idx - 1].senderId) !==
                              String(msg.senderId)) && (
                            <span className="mb-1 ml-1 text-[11px] font-medium text-white/40">
                              {msg.senderName}
                            </span>
                          )}

                        <div
                          className={`relative rounded-2xl px-4 py-2.5 text-[14px] leading-5 ${
                            isMe
                              ? `${msgPortal.bg} text-white`
                              : "bg-white/[0.06] text-white/90"
                          } ${msg.pending ? "opacity-50" : ""}`}
                          style={
                            isMe ? { backgroundColor: msgPortal.color } : {}
                          }
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`mt-1 flex items-center gap-1 ${isMe ? "justify-end" : ""}`}
                          >
                            <span className="text-[10px] opacity-50">
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMe && !msg.pending && (
                              <CheckCheck className="h-3 w-3 opacity-50" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Composer */}
            <div className="border-t border-white/[0.06] bg-black px-4 py-3">
              <div className="flex items-end gap-2">
                <button className="rounded-full p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60">
                  <Smile className="h-5 w-5" />
                </button>
                <div
                  className={`flex flex-1 items-end rounded-full border px-4 py-2 transition-colors ${
                    msgText.trim()
                      ? theme
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-cyan-500/30 bg-cyan-500/[0.05]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Start a new message"
                    rows={1}
                    className="max-h-32 flex-1 resize-none bg-transparent py-1 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                    style={{ minHeight: "24px" }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!msgText.trim() || sending}
                  className={`rounded-full p-2.5 text-white transition-all ${
                    msgText.trim() && !sending
                      ? theme
                        ? ""
                        : "bg-cyan-500 text-black hover:opacity-80"
                      : "text-white/20"
                  }`}
                  style={
                    msgText.trim() && !sending && theme
                      ? { backgroundColor: theme.color }
                      : {}
                  }
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03]">
              <MessageCircle
                className="h-8 w-8 text-white/15"
                strokeWidth={1}
              />
            </div>
            <div>
              <p className="text-xl font-bold text-white">Select a message</p>
              <p className="mt-1 max-w-xs text-sm text-white/35">
                Choose from your existing conversations, or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return open ? panelBody : null;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-end p-3 sm:items-center sm:justify-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="h-[90vh] w-full max-w-[1000px] overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl sm:h-[700px]"
            onClick={(e) => e.stopPropagation()}
          >
            {panelBody}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/* HELPERS */
/* -------------------------------------------------------------------------- */

function formatShortTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function dateDivider(a?: string, b?: string) {
  if (!a || !b) return true;
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() !== db.toDateString();
}

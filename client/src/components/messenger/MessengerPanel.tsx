// Messenger Panel — Instagram-web style slide-in overlay.
// Not a route/page: it overlays the current page from the right without any
// navigation happening underneath. Reuses the existing /api/inbox endpoints
// (same data already used by Marketplace "Message Seller" / Artist "Message").
//
// Every message starts private. The sender can later hit "Publish" on their
// own sent message to promote it into the public community feed (one-way,
// not toggleable at send time, not un-publishable).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Send,
  ArrowLeft,
  Loader2,
  Globe2,
  Lock,
  Check,
  CheckCheck,
  Search,
  Paperclip,
} from "lucide-react";
import { authenticatedFetch, getAuthToken } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import FollowButton from "@/components/FollowButton";
import {
  useInboxSocket,
  useInboxTyping,
  emitInboxTyping,
  checkPresence,
} from "@/hooks/use-inbox-socket";

interface Conversation {
  id: number;
  type: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
}

interface InboxMessage {
  id: number;
  conversationId: number;
  senderId: string;
  senderName: string;
  content: string;
  attachmentUrl?: string | null;
  isRead: boolean;
  isPublished?: boolean;
  createdAt: string;
  /** Client-only: true while optimistically shown before the server confirms it. */
  pending?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  support: "Support",
  business_network: "Business",
  marketplace: "Marketplace",
  music_artist: "Music",
  dm_share: "Community",
};

const FILTER_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "marketplace", label: "Marketplace" },
  { id: "music_artist", label: "Music" },
  { id: "business_network", label: "Business" },
  { id: "support", label: "Support" },
];

function formatTimestamp(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MessengerPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [followingUserIds, setFollowingUserIds] = useState<number[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<string | null>(
    null,
  );
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConvoRef = useRef<Conversation | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  activeConvoRef.current = activeConvo;

  useEffect(() => {
    if (!open || !user) return;
    setLoadingConvos(true);
    authenticatedFetch("/api/inbox/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setConversations(data.conversations || []);
      })
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, [open, user]);

  useEffect(() => {
    if (!open || !user) {
      setFollowingUserIds([]);
      return;
    }

    let cancelled = false;

    authenticatedFetch("/api/social/follow/following")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success || !Array.isArray(data.data)) return;
        setFollowingUserIds(
          data.data.map((id: unknown) => Number(id)).filter(Boolean),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Live push: new message arrives via socket while the panel is open.
  const handleLiveMessage = useCallback(
    (evt: { conversationId: number; message: InboxMessage }) => {
      if (activeConvoRef.current?.id === evt.conversationId) {
        setMessages((prev) => [...prev, evt.message]);
      }
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === evt.conversationId);
        if (idx === -1) {
          // New conversation opened by the other side — refresh the list.
          authenticatedFetch("/api/inbox/conversations")
            .then((r) => r.json())
            .then((data) => {
              if (data?.success) setConversations(data.conversations || []);
            })
            .catch(() => {});
          return prev;
        }
        const updated = [...prev];
        const isActive = activeConvoRef.current?.id === evt.conversationId;
        updated[idx] = {
          ...updated[idx],
          lastMessage: evt.message.content,
          lastMessageAt: evt.message.createdAt,
          unreadCount: isActive ? 0 : updated[idx].unreadCount + 1,
        };
        // bump to top, newest first
        const [moved] = updated.splice(idx, 1);
        return [moved, ...updated];
      });
    },
    [],
  );
  useInboxSocket(open && user ? handleLiveMessage : undefined);

  // Typing indicator from the other participant, scoped to the active conversation
  const handleTyping = useCallback(
    (evt: {
      conversationId: number;
      fromUserId: number;
      isTyping: boolean;
    }) => {
      if (activeConvoRef.current?.id === evt.conversationId) {
        setOtherTyping(evt.isTyping);
      }
    },
    [],
  );
  useInboxTyping(open && activeConvo ? handleTyping : undefined);

  // Check the other participant's online status whenever a thread is opened
  useEffect(() => {
    if (!activeConvo) {
      setOtherOnline(false);
      return;
    }
    checkPresence(Number(activeConvo.participantId), setOtherOnline);
  }, [activeConvo]);

  useEffect(() => {
    if (!activeConvo) return;
    setLoadingMessages(true);
    authenticatedFetch(`/api/inbox/conversations/${activeConvo.id}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setMessages(data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [activeConvo]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = async () => {
    const content = draft.trim();
    if ((!content && !pendingAttachment) || !activeConvo || sending) return;
    setSending(true);
    setDraft("");
    const attachmentUrl = pendingAttachment;
    setPendingAttachment(null);
    emitInboxTyping(Number(activeConvo.participantId), activeConvo.id, false);
    // Optimistic bubble — shows instantly with a pending/SENDING state
    const tempId = -Date.now();
    const optimisticMsg: InboxMessage = {
      id: tempId,
      conversationId: activeConvo.id,
      senderId: String(user?.id),
      senderName: user?.name || "You",
      content,
      attachmentUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      const res = await authenticatedFetch(
        `/api/inbox/conversations/${activeConvo.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, attachmentUrl }),
        },
      );
      const data = await res.json();
      if (data?.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m)),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      // silent — best-effort UI, existing rate-limiter surfaces its own errors
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Debounced typing emitter — fires isTyping:true then auto-clears after 2s idle
  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!activeConvo) return;
    emitInboxTyping(Number(activeConvo.participantId), activeConvo.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitInboxTyping(Number(activeConvo.participantId), activeConvo.id, false);
    }, 2000);
  };

  const handleAttachmentPick = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/inbox/attachments", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data?.success && data.url) setPendingAttachment(data.url);
    } catch {
      // silent — user can retry
    } finally {
      setUploadingAttachment(false);
    }
  };

  const publishMessage = async (messageId: number) => {
    setPublishingId(messageId);
    try {
      const res = await authenticatedFetch(
        `/api/inbox/messages/${messageId}/publish`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isPublished: true } : m,
          ),
        );
      }
    } catch {
      // silent
    } finally {
      setPublishingId(null);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter !== "all" && c.type !== activeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.participantName?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, activeFilter, searchQuery]);

  const drawerUserId = activeConvo ? Number(activeConvo.participantId) : NaN;
  const canFollowFromDrawer =
    !!activeConvo &&
    Number.isFinite(drawerUserId) &&
    drawerUserId > 0 &&
    activeConvo.type !== "support" &&
    String(user?.id) !== String(activeConvo.participantId);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — click to close, page underneath stays mounted (no navigation) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[200]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-[#0f0f17] border-l border-white/10 z-[201] flex flex-col shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              {activeConvo && (
                <button
                  onClick={() => {
                    setActiveConvo(null);
                    setShowProfileDrawer(false);
                  }}
                  className="p-1 text-white/60 hover:text-white"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {activeConvo && (
                <button
                  onClick={() => setShowProfileDrawer(true)}
                  className="relative w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-semibold text-amber-300 overflow-hidden shrink-0"
                  aria-label="View profile"
                >
                  {activeConvo.participantAvatar ? (
                    <img
                      src={activeConvo.participantAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    activeConvo.participantName?.[0]?.toUpperCase()
                  )}
                  {otherOnline && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#0f0f17]" />
                  )}
                </button>
              )}
              <h2 className="flex-1 min-w-0 truncate">
                <span className="text-white font-semibold text-sm block truncate">
                  {activeConvo ? activeConvo.participantName : "Messages"}
                </span>
                {activeConvo && (
                  <span className="text-[11px] text-white/40">
                    {otherTyping
                      ? "typing…"
                      : otherOnline
                        ? "online"
                        : TYPE_LABELS[activeConvo.type] || activeConvo.type}
                  </span>
                )}
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-white/60 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile preview drawer */}
            <AnimatePresence>
              {showProfileDrawer && activeConvo && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-14 left-0 right-0 z-10 bg-[#161622] border-b border-white/10 shadow-xl px-4 py-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-lg font-semibold text-amber-300 overflow-hidden shrink-0">
                      {activeConvo.participantAvatar ? (
                        <img
                          src={activeConvo.participantAvatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        activeConvo.participantName?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {activeConvo.participantName}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {otherOnline ? "Online now" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canFollowFromDrawer ? (
                      <FollowButton
                        userId={drawerUserId}
                        initialIsFollowing={followingUserIds.includes(
                          drawerUserId,
                        )}
                        initialFollowerCount={0}
                        size="sm"
                        className="flex-1 rounded-lg border-amber-500/30"
                        onFollowChange={(isFollowing) => {
                          setFollowingUserIds((prev) =>
                            isFollowing
                              ? prev.includes(drawerUserId)
                                ? prev
                                : [...prev, drawerUserId]
                              : prev.filter((id) => id !== drawerUserId),
                          );
                        }}
                      />
                    ) : null}
                    <a
                      href={`/user/${activeConvo.participantId}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/70 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      View Profile
                    </a>
                    <button
                      onClick={() => setShowProfileDrawer(false)}
                      className="px-3 py-2 rounded-lg bg-white/5 text-white/50 text-xs border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!activeConvo ? (
              // ── Conversation list ──
              <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations…"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeFilter === tab.id
                          ? "bg-purple-500/30 text-purple-200 border border-purple-500/40"
                          : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {loadingConvos && (
                  <div className="flex items-center justify-center py-10 text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {!loadingConvos && conversations.length === 0 && (
                  <div className="px-4 py-12 text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Send className="w-7 h-7 text-amber-400" />
                    </div>
                    <p className="text-white font-semibold">
                      Start a conversation
                    </p>
                    <p className="text-white/40 text-sm max-w-xs mx-auto">
                      Messages from Marketplace sellers, artists, and the
                      community will show up here.
                    </p>
                    <div className="text-left rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5 text-[11px] leading-relaxed">
                      <p className="text-white/75 font-medium">Sample flow</p>
                      <p>
                        1. Start a private message from Marketplace (Message
                        Seller), Blog (Message), or Music/Artist pages.
                      </p>
                      <p>
                        2. The private thread appears in this inbox immediately.
                      </p>
                      <p>
                        3. Tap Publish on your own sent message to make it
                        visible in the public community feed.
                      </p>
                    </div>
                  </div>
                )}
                {!loadingConvos &&
                  conversations.length > 0 &&
                  filteredConversations.length === 0 && (
                    <div className="px-4 py-8 text-center text-white/40 text-sm">
                      No conversations match your search.
                    </div>
                  )}
                {filteredConversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveConvo(c);
                      setShowProfileDrawer(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-white/5 ${
                      c.unreadCount > 0
                        ? "bg-slate-800/50 hover:bg-slate-800"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-semibold text-amber-300 overflow-hidden shrink-0">
                      {c.participantAvatar ? (
                        <img
                          src={c.participantAvatar}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        c.participantName?.[0]?.toUpperCase()
                      )}
                      {/* online dot placeholder — will be driven by socket status */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`text-sm font-medium truncate ${c.unreadCount > 0 ? "text-white" : "text-white/70"}`}
                        >
                          {c.participantName}
                        </p>
                        <span className="shrink-0 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-white/40">
                          {TYPE_LABELS[c.type] || c.type}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 truncate">
                        {c.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] text-white/30">
                        {formatTimestamp(c.lastMessageAt)}
                      </span>
                      {c.unreadCount > 0 && (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-amber-500"
                          aria-label={`${c.unreadCount} unread`}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              // ── Thread view ──
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                >
                  {loadingMessages && (
                    <div className="flex items-center justify-center py-10 text-white/40">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  {messages.map((m) => {
                    const isMine = m.senderId === String(user?.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            isMine
                              ? "bg-amber-600 text-white rounded-br-sm"
                              : "bg-slate-700 text-white/90 rounded-bl-sm"
                          } ${m.pending ? "opacity-60" : ""}`}
                        >
                          {m.attachmentUrl && (
                            <button
                              onClick={() => setLightboxUrl(m.attachmentUrl!)}
                              className="block mb-1.5 rounded-lg overflow-hidden max-w-[220px]"
                            >
                              <img
                                src={m.attachmentUrl}
                                alt="Attachment"
                                className="w-full h-auto object-cover"
                              />
                            </button>
                          )}
                          {m.content && (
                            <p className="whitespace-pre-wrap break-words">
                              {m.content}
                            </p>
                          )}
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-white/30">
                            {formatTimestamp(m.createdAt)}
                            {isMine && (
                              <>
                                {m.pending ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5" />
                                ) : m.isRead ? (
                                  <CheckCheck className="w-3 h-3 ml-0.5 text-amber-300" />
                                ) : (
                                  <Check className="w-3 h-3 ml-0.5" />
                                )}
                              </>
                            )}
                          </span>
                          {isMine && !m.pending && (
                            <button
                              onClick={() =>
                                !m.isPublished && publishMessage(m.id)
                              }
                              disabled={m.isPublished || publishingId === m.id}
                              className={`mt-1 flex items-center gap-1 text-[10px] ${
                                m.isPublished
                                  ? "text-emerald-400"
                                  : "text-white/40 hover:text-purple-300"
                              } transition-colors disabled:cursor-default`}
                              title={
                                m.isPublished
                                  ? "Published to the community feed"
                                  : "Publish this message to the public community feed"
                              }
                            >
                              {m.isPublished ? (
                                <>
                                  <Check className="w-3 h-3" /> Published
                                </>
                              ) : publishingId === m.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Globe2 className="w-3 h-3" /> Publish
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {otherTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>

                {pendingAttachment && (
                  <div className="px-4 pt-2 flex items-center gap-2">
                    <div className="relative">
                      <img
                        src={pendingAttachment}
                        alt="Attachment preview"
                        className="w-14 h-14 rounded-lg object-cover border border-white/10"
                      />
                      <button
                        onClick={() => setPendingAttachment(null)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center"
                        aria-label="Remove attachment"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAttachmentPick}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="shrink-0 p-1.5 text-white/40 hover:text-amber-400 transition-colors disabled:opacity-40"
                    aria-label="Attach image"
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Write a message…"
                    maxLength={2000}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={(!draft.trim() && !pendingAttachment) || sending}
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-amber-600 text-white disabled:opacity-40 hover:bg-amber-500 transition-colors"
                    aria-label="Send"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="px-4 pb-3 text-[11px] text-white/45 border-t border-white/5">
                  Private by default. Use Publish on your own message to surface
                  it in the public community feed.
                </div>
              </>
            )}

            {/* Lightbox — full-screen preview for attachment images */}
            <AnimatePresence>
              {lightboxUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setLightboxUrl(null)}
                  className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-6"
                >
                  <img
                    src={lightboxUrl}
                    alt="Attachment"
                    className="max-w-full max-h-full rounded-lg object-contain"
                  />
                  <button
                    onClick={() => setLightboxUrl(null)}
                    className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
                    aria-label="Close preview"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

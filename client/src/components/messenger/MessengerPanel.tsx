// Messenger Panel — Instagram-web style slide-in overlay.
// Not a route/page: it overlays the current page from the right without any
// navigation happening underneath. Reuses the existing /api/inbox endpoints
// (same data already used by Marketplace "Message Seller" / Artist "Message").
//
// Every message starts private. The sender can later hit "Publish" on their
// own sent message to promote it into the public community feed (one-way,
// not toggleable at send time, not un-publishable).

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, ArrowLeft, Loader2, Globe2, Lock, Check } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";

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
  isRead: boolean;
  isPublished?: boolean;
  createdAt: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!content || !activeConvo || sending) return;
    setSending(true);
    try {
      const res = await authenticatedFetch(
        `/api/inbox/conversations/${activeConvo.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const data = await res.json();
      if (data?.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setDraft("");
      }
    } catch {
      // silent — best-effort UI, existing rate-limiter surfaces its own errors
    } finally {
      setSending(false);
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
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-[#0f0f17] border-l border-white/10 z-[201] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              {activeConvo && (
                <button
                  onClick={() => setActiveConvo(null)}
                  className="p-1 text-white/60 hover:text-white"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="flex-1 text-white font-semibold text-sm truncate">
                {activeConvo ? activeConvo.participantName : "Messages"}
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-white/60 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!activeConvo ? (
              // ── Conversation list ──
              <div className="flex-1 overflow-y-auto">
                {loadingConvos && (
                  <div className="flex items-center justify-center py-10 text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {!loadingConvos && conversations.length === 0 && (
                  <div className="px-4 py-10 text-center text-white/40 text-sm">
                    No conversations yet. Messages from Marketplace sellers,
                    artists, and the community will show up here.
                  </div>
                )}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvo(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-semibold text-purple-300 overflow-hidden shrink-0">
                      {c.participantAvatar ? (
                        <img
                          src={c.participantAvatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        c.participantName?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {c.participantName}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {c.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500 text-[10px] text-white flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
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
                              ? "bg-purple-500/20 text-white border border-purple-500/30"
                              : "bg-white/5 text-white/90 border border-white/10"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.content}
                          </p>
                          {isMine && (
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
                </div>

                <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Write a private message…"
                    maxLength={2000}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 disabled:opacity-40 hover:bg-purple-500/30 transition-colors"
                    aria-label="Send"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

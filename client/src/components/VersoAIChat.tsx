import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Minimize2,
  Bot,
  Maximize2,
  RotateCcw,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: "ollama" | "fallback";
}

// ─── Quick action suggestions ─────────────────────────────────────────────────
const QUICK_ACTIONS = [
  "🔍 Find hotels in France",
  "📊 Platform analytics",
  "🏷️ Available sectors",
  "✍️ Write a business description",
  "📍 Businesses in Morocco",
  "🚀 Platform features",
];

// ─── Simple markdown renderer (bold + bullets) ────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;

    // Replace **text** with bold spans
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? (
        <strong key={j} className="font-semibold text-white">
          {part}
        </strong>
      ) : (
        <span key={j}>{part}</span>
      ),
    );

    // Bullet lines
    if (line.startsWith("•") || line.startsWith("-")) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
          <span>{rendered}</span>
        </div>
      );
    }

    // Numbered lines
    if (/^\d+\./.test(line)) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-blue-400 shrink-0">
            {line.match(/^\d+/)?.[0]}.
          </span>
          <span>{rendered.slice(1)}</span>
        </div>
      );
    }

    return (
      <div key={i} className="my-0.5">
        {rendered}
      </div>
    );
  });
}

// ─── VersoAIChat Component ────────────────────────────────────────────────────
export default function VersoAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! 👋 I'm **VersoAI**, your intelligent Verso Air assistant.\n\nI have live access to the platform database — businesses, analytics, countries, and more. What can I help you with?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<"ollama" | "fallback" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Check AI status once on open
  useEffect(() => {
    if (isOpen && aiStatus === null) {
      fetch("/api/ai/status")
        .then((r) => r.json())
        .then((data) => setAiStatus(data.status ?? "fallback"))
        .catch(() => setAiStatus("fallback"));
    }
  }, [isOpen, aiStatus]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Build the payload — send only role/content (no internal fields)
        const payload = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ messages: payload }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Unknown error");
        }

        const aiMessage: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          provider: data.provider,
        };

        setMessages((prev) => [...prev, aiMessage]);
        if (data.provider) setAiStatus(data.provider);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "⚠️ I'm having trouble connecting right now. Please try again in a moment.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, isLoading],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation reset! 🔄 How can I help you with Verso Air today?",
        timestamp: new Date(),
      },
    ]);
  };

  const showQuickActions = messages.length <= 1;

  const chatWidth = isExpanded ? "w-[480px]" : "w-96";
  const chatHeight = isExpanded ? "h-[640px]" : "h-[520px]";

  return (
    <>
      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 ${chatWidth} ${chatHeight} bg-slate-900/97 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-900/40 z-50 flex flex-col transition-all duration-200 overscroll-contain`}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">
                  VersoAI
                </p>
                <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                  {aiStatus === "ollama" ? "AI · Full mode" : "AI · Smart mode"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Reset */}
              <button
                onClick={resetConversation}
                title="Reset conversation"
                className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              {/* Expand/Shrink */}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                title={isExpanded ? "Shrink" : "Expand"}
                className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent"
            style={{ overscrollBehaviorY: "contain" }}
            onWheel={(e) => {
              const el = e.currentTarget;
              const atTop = el.scrollTop === 0 && e.deltaY < 0;
              const atBottom =
                el.scrollTop + el.clientHeight >= el.scrollHeight - 1 &&
                e.deltaY > 0;
              if (atTop || atBottom) e.preventDefault();
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm"
                      : "bg-slate-800/70 border border-blue-500/15 text-blue-100 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant"
                    ? renderMarkdown(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <div className="bg-slate-800/70 border border-blue-500/15 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick action chips */}
            {showQuickActions && !isLoading && (
              <div className="pt-1">
                <p className="text-xs text-blue-400/70 mb-2 pl-8">
                  Quick actions:
                </p>
                <div className="flex flex-wrap gap-2 pl-8">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() =>
                        sendMessage(action.replace(/^[^\s]+\s/, ""))
                      }
                      className="text-xs bg-slate-800/60 border border-blue-500/20 hover:border-blue-400/50 hover:bg-slate-700/60 text-blue-200 px-3 py-1.5 rounded-full transition-all"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-blue-500/20 shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask VersoAI anything…"
                disabled={isLoading}
                maxLength={1000}
                className="flex-1 bg-slate-800/50 border border-blue-500/20 focus:border-blue-400/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-blue-300/40 focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed p-2.5 rounded-xl transition-all"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Trigger Button (hidden when chat is open) ── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-2xl shadow-blue-900/60 hover:shadow-blue-500/50 hover:scale-110 flex items-center justify-center transition-all"
            aria-label="Open VersoAI chat"
          >
            <MessageSquare className="h-6 w-6 text-white" />
            {/* Unread indicator */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </button>

          {/* Tooltip label */}
          <div className="absolute bottom-16 right-0 bg-slate-900 border border-blue-500/30 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            Ask VersoAI
          </div>
        </div>
      )}
    </>
  );
}

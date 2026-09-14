import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  MessageSquare,
  X,
  Send,
  Minimize2,
  Bot,
  Maximize2,
  RotateCcw,
  Zap,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatSource {
  name: string;
  snippet: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: "ollama" | "groq" | "fallback";
  sources?: ChatSource[];
  searchMethod?: string;
}

// ─── Quick action suggestions ─────────────────────────────────────────────────
const QUICK_ACTIONS = [
  "🔍 Find hotels in France",
  "📊 Platform analytics",
  "🏷️ Available sectors",
  "✍️ Write a business description",
  "📍 Businesses in Morocco",
  "🚀 Platform features",
  "🧠 Ask: best rated businesses?",
  "🔗 Data connector status",
];

// ─── Clean text for Speech Synthesis ──────────────────────────────────────────
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove bold markdown
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // markdown links
    .replace(/^[•\-\*]\s+/gm, "") // bullet points
    .replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, "") // emojis
    .replace(/```[\s\S]*?```/g, "Code block omitted.") // code blocks
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

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

// ─── Source citation renderer ──────────────────────────────────────────────────
function RenderSources({
  sources,
  onSourceClick,
}: {
  sources: ChatSource[];
  onSourceClick: (name: string) => void;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-blue-500/20">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider">
          Live Database Sources
        </span>
      </div>
      <div className="space-y-1.5">
        {sources.map((source, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSourceClick(source.name)}
            className="w-full text-left flex items-start justify-between gap-2 text-[11px] text-blue-200/80 bg-slate-800/60 hover:bg-slate-700/80 border border-blue-500/20 hover:border-blue-400/40 rounded-lg px-2.5 py-1.5 transition-all group"
          >
            <div className="flex items-start gap-1.5">
              <span className="text-blue-400/70 shrink-0 font-medium">
                {idx + 1}.
              </span>
              <div>
                <span className="text-white font-medium group-hover:text-amber-300 transition-colors">
                  {source.name}
                </span>
                {source.snippet && (
                  <span className="text-blue-300/60 block text-[10px] line-clamp-1">
                    {source.snippet}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-blue-400/50 group-hover:text-blue-300 shrink-0 mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Search method badge ──────────────────────────────────────────────────────
function SearchMethodBadge({ method }: { method?: string }) {
  if (!method) return null;
  const labels: Record<string, { text: string; color: string }> = {
    fulltext: {
      text: "Full-text",
      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    ilike: {
      text: "Keyword",
      color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    filter: {
      text: "Filtered",
      color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
  };
  const label = labels[method] ?? {
    text: method,
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full border ${label.color}`}
    >
      <Radio className="h-2.5 w-2.5 animate-pulse" /> {label.text}
    </span>
  );
}

// ─── VersoAIChat Component ────────────────────────────────────────────────────
export default function VersoAIChat() {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Voice & Speech States ──
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [talkMode, setTalkMode] = useState(false); // Auto-reads AI replies out loud
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Context calculation ──
  const getPageContext = useCallback(() => {
    const path = location.toLowerCase();
    if (path.includes("commerce"))
      return "The user is currently viewing the Commerce sector dashboard. Focus answers on retail, e-commerce, and business directory features within Verso Air.";
    if (path.includes("hotellerie") || path.includes("hospitality"))
      return "The user is on the Hospitality sector dashboard. Focus on hotel/restaurant listings, reservations, and hospitality analytics within Verso Air.";
    if (path.includes("batiment") || path.includes("construction"))
      return "The user is on the Construction sector dashboard. Focus on contractor listings, project management, and construction analytics within Verso Air.";
    if (path.includes("automobile"))
      return "The user is on the Automotive sector dashboard. Focus on vehicle listings, dealerships, and automotive services within Verso Air.";
    if (path.includes("finance"))
      return "The user is on the Finance sector dashboard. Focus on financial services, banking partners, and financial analytics within Verso Air.";
    if (path.includes("divertissement") || path.includes("entertainment"))
      return "The user is on the Entertainment sector dashboard. Focus on entertainment venues, events, and leisure analytics within Verso Air.";
    if (path.includes("streaming") || path.includes("music"))
      return "The user is on the Verso Air Musical Universe & Stream platform. Focus on music streaming, artist features, track management, and listening analytics.";
    if (path.includes("marketplace"))
      return "The user is browsing the Verso Air Marketplace. Help with listings, buying/selling, and marketplace features.";
    if (path.includes("dashboard"))
      return "The user is on their personal dashboard. Help with account management, business analytics, and platform navigation.";
    if (path.includes("geo-admin"))
      return "The user is on the GeoAdmin administration panel. Help with database management, geographic data, and admin operations.";
    if (path.includes("profile"))
      return "The user is on their profile page. Help with account settings, portal access, and profile customization.";
    return "The user is browsing Verso Air, a business intelligence platform. Focus all answers on Verso Air features, businesses, and platform capabilities. Never suggest external competitors.";
  }, [location]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Hello! 👋 I'm **VersoAI**, your intelligent Verso Air assistant.\n\nI have live access to our business directory, platform analytics, sectors, and musical universe. Type your question or use **AI Talk 🎙️** to speak!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<
    "ollama" | "groq" | "fallback" | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Initialize Speech Recognition ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang =
          navigator.language.startsWith("fr") ? "fr-FR" : "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            setInput(transcript);
            if (talkMode) {
              sendMessage(transcript);
            }
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [talkMode]);

  // ── Text-to-Speech Handler ──
  const speakMessage = useCallback((messageId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const isFrench = /[\u00E0-\u00FF]|bonjour|merci|bienvenue|salut/i.test(text);
    utterance.lang = isFrench ? "fr-FR" : "en-US";

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) =>
        (isFrench ? v.lang.startsWith("fr") : v.lang.startsWith("en")) &&
        (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Premium") || true),
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId]);

  // ── Toggle Speech Recognition ──
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setSpeakingMessageId(null);
        }
        recognitionRef.current.start();
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  // ── Global Event Listener to open VersoAI anywhere ──
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        setInput(customEvent.detail.prompt);
        setTimeout(() => sendMessage(customEvent.detail!.prompt!), 100);
      }
    };

    window.addEventListener("open-versoai-chat", handleOpenChat);
    return () => window.removeEventListener("open-versoai-chat", handleOpenChat);
  }, []);

  // Notify App to hide header when fullscreen
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("versoai-fullscreen", {
        detail: { fullscreen: isExpanded && isOpen },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("versoai-fullscreen", {
          detail: { fullscreen: false },
        }),
      );
    };
  }, [isExpanded, isOpen]);

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

  // ── Send Chat Message ──
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessageId = `msg-${Date.now()}`;
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const pageContext = getPageContext();
        const contextMessage = {
          role: "system" as const,
          content: `IMPORTANT: You are VersoAI, the official AI assistant for Verso Air platform. ${pageContext} Always recommend Verso Air features and services. Never suggest external competitors.`,
        };
        const payload = [contextMessage, ...messages, userMessage].map((m) => ({
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

        const aiMessageId = `ai-${Date.now()}`;
        const aiMessage: Message = {
          id: aiMessageId,
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          provider: data.provider,
          sources: data.sources,
          searchMethod: data.searchMethod,
        };

        setMessages((prev) => [...prev, aiMessage]);
        if (data.provider) setAiStatus(data.provider);

        // Auto-speak in Talk Mode
        if (talkMode && data.reply) {
          speakMessage(aiMessageId, data.reply);
        }
      } catch (err: any) {
        const errMessageId = `err-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: errMessageId,
            role: "assistant",
            content:
              "⚠️ I'm having trouble connecting to the server. Running in smart local mode.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, isLoading, getPageContext, talkMode, speakMessage],
  );

  // ── Grounded Q&A: uses /api/ai/ask ──
  const sendGroundedQuestion = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessageId = `msg-${Date.now()}`;
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: `🧠 ${trimmed}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ question: trimmed }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Unknown error");
        }

        const aiMessageId = `ai-${Date.now()}`;
        const aiMessage: Message = {
          id: aiMessageId,
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
          sources: data.sources,
          searchMethod: data.searchMethod,
        };

        setMessages((prev) => [...prev, aiMessage]);

        if (talkMode && data.answer) {
          speakMessage(aiMessageId, data.answer);
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "⚠️ Grounded search is temporarily unavailable. Please try a standard question.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [isLoading, talkMode, speakMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim().startsWith("?")) {
        sendGroundedQuestion(input.trim().substring(1));
      } else {
        sendMessage(input);
      }
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetConversation = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content:
          "Conversation reset! 🔄 How can I help you explore Verso Air today?",
        timestamp: new Date(),
      },
    ]);
  };

  const showQuickActions = messages.length <= 1;

  return (
    <>
      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className={`fixed z-[9995] flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-blue-500/30 shadow-2xl shadow-blue-950/70 transition-all duration-200 overscroll-contain
            ${
              isExpanded
                ? "inset-0 rounded-none"
                : "bottom-20 right-4 w-[min(420px,calc(100vw-2rem))] h-[min(580px,calc(100vh-6rem))] sm:w-[440px] sm:h-[600px] rounded-2xl"
            }
          `}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/20 bg-slate-900/80 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-sm leading-none">
                    VersoAI
                  </p>
                  <span className="text-[10px] bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                    TALK & CHAT
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                  {aiStatus === "ollama"
                    ? "Local LLM · Grounded"
                    : aiStatus === "groq"
                      ? "Cloud LLM · Grounded"
                      : "Smart Engine · Live DB"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Talk Mode Toggle */}
              <button
                onClick={() => setTalkMode(!talkMode)}
                title={talkMode ? "Talk Mode ON (Auto-reads replies)" : "Talk Mode OFF"}
                className={`p-1.5 rounded-lg transition-all ${
                  talkMode
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                    : "text-blue-300/70 hover:text-white hover:bg-blue-500/20"
                }`}
              >
                {talkMode ? (
                  <Volume2 className="h-4 w-4 text-purple-300 animate-pulse" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>

              {/* Reset */}
              <button
                onClick={resetConversation}
                title="Reset conversation"
                className="p-1.5 text-blue-300/70 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Expand/Shrink */}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                title={isExpanded ? "Shrink" : "Expand"}
                className="p-1.5 text-blue-300/70 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    setSpeakingMessageId(null);
                  }
                }}
                className="p-1.5 text-blue-300/70 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent"
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
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} w-full`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm shadow-blue-500/20">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm shadow-md shadow-blue-900/30"
                        : "bg-slate-900/90 border border-blue-500/20 text-blue-100 rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        {msg.searchMethod && (
                          <div className="mb-1.5">
                            <SearchMethodBadge method={msg.searchMethod} />
                          </div>
                        )}
                        {renderMarkdown(msg.content)}
                        {msg.sources && msg.sources.length > 0 && (
                          <RenderSources
                            sources={msg.sources}
                            onSourceClick={(name) => {
                              setIsOpen(false);
                              navigate(
                                `/businesses-directory?search=${encodeURIComponent(name)}`,
                              );
                            }}
                          />
                        )}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>

                {/* Assistant Message Actions (Speak / Copy) */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 pl-8 mt-1 text-[11px] text-blue-300/60">
                    <button
                      onClick={() => speakMessage(msg.id, msg.content)}
                      className="hover:text-blue-200 flex items-center gap-1 transition-colors"
                      title={
                        speakingMessageId === msg.id
                          ? "Stop reading aloud"
                          : "Read aloud"
                      }
                    >
                      {speakingMessageId === msg.id ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                          <span className="text-amber-300">Speaking…</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Speak</span>
                        </>
                      )}
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => copyToClipboard(msg.id, msg.content)}
                      className="hover:text-blue-200 flex items-center gap-1 transition-colors"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Listening Banner */}
            {isListening && (
              <div className="flex items-center gap-3 bg-purple-900/40 border border-purple-500/40 rounded-xl px-4 py-2.5 text-purple-200 animate-pulse">
                <Mic className="h-4 w-4 text-purple-400 animate-bounce" />
                <span className="text-xs font-medium">
                  Listening to your voice… speak now!
                </span>
              </div>
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <div className="bg-slate-900/90 border border-blue-500/20 px-4 py-3 rounded-2xl rounded-bl-sm">
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
              <div className="pt-2">
                <p className="text-xs font-medium text-blue-400/80 mb-2 pl-8 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Suggested topics:
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pl-8 pr-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => {
                        const text = action.replace(/^[^\s]+\s/, "");
                        if (action.includes("Ask:")) {
                          sendGroundedQuestion(text.replace(/^Ask:\s*/, ""));
                        } else if (action.includes("connector")) {
                          sendMessage("Show me the data connector status");
                        } else {
                          sendMessage(text);
                        }
                      }}
                      className="text-xs bg-slate-900/80 border border-blue-500/20 hover:border-blue-400/50 hover:bg-slate-800 text-blue-200 px-3 py-1.5 rounded-full transition-all text-left"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-blue-500/20 bg-slate-900/80 rounded-b-2xl shrink-0">
            <div className="flex gap-2 items-center">
              {/* Mic Voice Button */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Stop listening" : "Talk with AI (Voice input)"}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening
                      ? "bg-red-500/80 text-white animate-pulse shadow-lg shadow-red-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 border border-purple-500/30"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? "Listening to voice…"
                    : "Ask VersoAI or type ?question for grounded search…"
                }
                disabled={isLoading}
                maxLength={1000}
                className="flex-1 min-w-0 bg-slate-950/80 border border-blue-500/25 focus:border-blue-400/70 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-white placeholder-blue-300/40 focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed p-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
                aria-label="Send message"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Trigger Button (hidden when chat is open) ── */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[9990] group">
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-full shadow-2xl shadow-blue-900/60 hover:shadow-blue-500/60 hover:scale-105 flex items-center justify-center transition-all border border-blue-400/30"
            aria-label="Open VersoAI Talk & Chat"
          >
            <Bot className="h-6 w-6 text-white" />
            {/* Unread / Active indicator */}
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
          </button>

          {/* Tooltip label */}
          <div className="absolute bottom-16 right-0 bg-slate-950/90 border border-blue-500/30 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg backdrop-blur-md">
            VersoAI Talk & Chat 🎙️
          </div>
        </div>
      )}
    </>
  );
}

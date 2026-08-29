// FAQ Page - Reddit-style discussion forum for FAQ topics
// Accessible via /faq route, linked from Blog sidebar and search modal
// Location: client/src/pages/faq.tsx

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import {
  Search,
  MessageCircleQuestion,
  ChevronLeft,
  ChevronRight,
  Send,
  ThumbsUp,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Filter,
  Plus,
  ArrowLeft,
  HelpCircle,
  User,
  CreditCard,
  Wrench,
  Building2,
  Sparkles,
  X,
  ArrowUpRight,
} from "lucide-react";
import ScrollToTop from "@/components/ScrollToTop";

// ─── Types ──────────────────────────────────────────────
interface FaqPost {
  id: number;
  title: string;
  content: string;
  faqCategory: string;
  authorId: number;
  commentCount: number;
  viewCount: number;
  isResolved: boolean;
  createdAt: string;
  author: {
    displayName: string;
    profession?: string;
    verifiedBadge: boolean;
    avatarUrl?: string;
  };
}

interface FaqReply {
  id: number;
  content: string;
  authorId: number;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  parentCommentId: number | null;
  author: {
    displayName: string;
    profession?: string;
    verifiedBadge: boolean;
    avatarUrl?: string;
  };
  replies?: FaqReply[];
}

interface FaqDetail extends FaqPost {
  replies: FaqReply[];
  totalReplies: number;
}

interface FaqCategory {
  name: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// ─── Constants ──────────────────────────────────────────
const CATEGORY_ICONS: Record<string, any> = {
  general: HelpCircle,
  account: User,
  billing: CreditCard,
  technical: Wrench,
  business: Building2,
  platform: Sparkles,
};

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  general: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/20",
  },
  account: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    badge: "bg-blue-500/20",
  },
  billing: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    badge: "bg-green-500/20",
  },
  technical: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    badge: "bg-orange-500/20",
  },
  business: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    badge: "bg-purple-500/20",
  },
  platform: {
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/30",
    badge: "bg-pink-500/20",
  },
};

// ─── Default Categories ─────────────────────────────
const DEFAULT_CATEGORIES: FaqCategory[] = [
  {
    name: "general",
    label: "General",
    description: "General questions about the platform",
    icon: "HelpCircle",
    color: "cyan",
  },
  {
    name: "account",
    label: "Account & Profile",
    description: "Account settings, login, and profile",
    icon: "User",
    color: "blue",
  },
  {
    name: "billing",
    label: "Billing & Payments",
    description: "Invoices, subscriptions, payments",
    icon: "CreditCard",
    color: "green",
  },
  {
    name: "technical",
    label: "Technical Support",
    description: "Bug reports and technical issues",
    icon: "Wrench",
    color: "orange",
  },
  {
    name: "business",
    label: "Business & Listings",
    description: "Business listings and analytics",
    icon: "Building2",
    color: "purple",
  },
  {
    name: "platform",
    label: "Platform Features",
    description: "How to use platform features",
    icon: "Sparkles",
    color: "pink",
  },
];

// ─── Helper: Time ago ───────────────────────────────────
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ═════════════════════════════════════════════════════════
// FAQ PAGE COMPONENT
// ═════════════════════════════════════════════════════════
export default function FaqPage() {
  const { user: faqUser } = useAuth();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialSearch = params.get("search") || "";
  const initialTopic = params.get("topic");

  // State
  const [categories, setCategories] =
    useState<FaqCategory[]>(DEFAULT_CATEGORIES);
  const [posts, setPosts] = useState<FaqPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "most-replies">(
    "recent",
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Detail view state
  const [selectedTopic, setSelectedTopic] = useState<FaqDetail | null>(null);
  const [isDetailView, setIsDetailView] = useState(!!initialTopic);
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  // Create topic modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  // ─── Data Fetching ──────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        sort: sortBy,
      });
      if (searchQuery) queryParams.set("search", searchQuery);
      if (selectedCategory !== "all")
        queryParams.set("category", selectedCategory);

      const res = await fetch(`/api/faq?${queryParams}`);
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        setPosts(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        // No results from API
        setPosts([]);
        setTotalPages(1);
      }
    } catch {
      // API error — show empty state
      setPosts([]);
      setTotalPages(1);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, searchQuery, selectedCategory]);

  const fetchTopicDetail = useCallback(async (topicId: number) => {
    try {
      const res = await fetch(`/api/faq/${topicId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTopic(data.data);
        setIsDetailView(true);
        return;
      }
    } catch {
      // fallback
    }
    // No API data — show nothing
    setSelectedTopic(null);
    setIsDetailView(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (initialTopic) {
      fetchTopicDetail(parseInt(initialTopic));
    }
  }, [initialTopic, fetchTopicDetail]);

  // Fetch categories
  useEffect(() => {
    fetch("/api/faq/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) setCategories(data.data);
      })
      .catch(() => {});
  }, []);

  // ─── Handlers ───────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const openTopic = (post: FaqPost) => {
    fetchTopicDetail(post.id);
  };

  const closeTopic = () => {
    setIsDetailView(false);
    setSelectedTopic(null);
    setReplyContent("");
    setReplyingTo(null);
    // Remove topic param from URL
    navigate("/faq");
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !selectedTopic) return;
    if (!faqUser) {
      alert("Please sign in to reply.");
      return;
    }

    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const res = await fetch(`/api/faq/${selectedTopic.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          content: replyContent,
          parentCommentId: replyingTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTopicDetail(selectedTopic.id);
        setReplyContent("");
        setReplyingTo(null);
        return;
      }
      // Show server error to user
      alert(data.error || "Failed to post reply. Please try again.");
    } catch {
      alert("Network error. Please check your connection and try again.");
    }
  };

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    if (!faqUser) {
      alert("Please sign in to create a topic.");
      return;
    }

    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          faqCategory: newCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setNewTitle("");
        setNewContent("");
        setNewCategory("general");
        fetchPosts();
        return;
      }
      // Show server error
      alert(data.error || "Failed to create topic. Please try again.");
    } catch {
      alert("Network error. Please check your connection and try again.");
    }
  };

  // ═══════════════════════════════════════════════════════
  // RENDER: Detail View
  // ═══════════════════════════════════════════════════════
  if (isDetailView && selectedTopic) {
    const catColors =
      CATEGORY_COLORS[selectedTopic.faqCategory] || CATEGORY_COLORS.general;
    const CatIcon = CATEGORY_ICONS[selectedTopic.faqCategory] || HelpCircle;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <ScrollToTop />

        {/* Back Header */}
        <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={closeTopic}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to FAQ</span>
            </button>
            <div className="flex items-center gap-2">
              {selectedTopic.isResolved && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Resolved
                </span>
              )}
              <span
                className={`text-xs px-2 py-1 rounded-full ${catColors.badge} ${catColors.text}`}
              >
                {categories.find((c) => c.name === selectedTopic.faqCategory)
                  ?.label || selectedTopic.faqCategory}
              </span>
            </div>
          </div>
        </div>

        {/* Topic Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-b from-slate-900/80 to-slate-800/50 rounded-xl border border-white/10 p-6 mb-6"
          >
            <h1 className="text-2xl font-bold text-white mb-4">
              {selectedTopic.title}
            </h1>

            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {selectedTopic.author.displayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
                    {selectedTopic.author.displayName}
                  </span>
                  {selectedTopic.author.verifiedBadge && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {selectedTopic.author.profession} ·{" "}
                  {timeAgo(selectedTopic.createdAt)}
                </span>
              </div>
            </div>

            {/* Content */}
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {selectedTopic.content}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Eye className="w-3.5 h-3.5" /> {selectedTopic.viewCount} views
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />{" "}
                {selectedTopic.totalReplies} replies
              </span>
            </div>
          </motion.div>

          {/* Replies */}
          <div className="space-y-1 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Replies ({selectedTopic.totalReplies})
            </h2>

            {selectedTopic.replies.map((reply, idx) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* Top-level Reply */}
                <div className="bg-slate-900/60 rounded-lg border border-white/5 p-4 mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {reply.author.displayName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">
                          {reply.author.displayName}
                        </span>
                        {reply.author.verifiedBadge && (
                          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        )}
                        <span className="text-xs text-slate-500">
                          {timeAgo(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {reply.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                          <ThumbsUp className="w-3 h-3" /> {reply.likeCount}
                        </button>
                        <button
                          onClick={() =>
                            setReplyingTo(
                              replyingTo === reply.id ? null : reply.id,
                            )
                          }
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            replyingTo === reply.id
                              ? "text-cyan-400"
                              : "text-slate-400 hover:text-cyan-400"
                          }`}
                        >
                          <MessageSquare className="w-3 h-3" /> Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Replies */}
                  {reply.replies && reply.replies.length > 0 && (
                    <div className="ml-6 sm:ml-11 mt-3 space-y-2 border-l-2 border-white/5 pl-3 sm:pl-4">
                      {reply.replies.map((nested) => (
                        <div key={nested.id} className="py-2">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                              {nested.author.displayName.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-white text-xs font-medium">
                                  {nested.author.displayName}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {timeAgo(nested.createdAt)}
                                </span>
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed break-words whitespace-pre-wrap">
                                {nested.content}
                              </p>
                              <button className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors mt-1">
                                <ThumbsUp className="w-2.5 h-2.5" />{" "}
                                {nested.likeCount}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Reply Box */}
                  <AnimatePresence>
                    {replyingTo === reply.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-6 sm:ml-11 mt-3"
                      >
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Reply to ${reply.author.displayName}...`}
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSubmitReply()
                            }
                          />
                          <button
                            onClick={handleSubmitReply}
                            disabled={!replyContent.trim()}
                            className="w-full sm:w-auto px-3 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}

            {selectedTopic.replies.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  No replies yet. Be the first!
                </p>
              </div>
            )}
          </div>

          {/* Main Reply Box */}
          {!replyingTo && (
            <div className="sticky bottom-4 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitReply()}
                />
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Reply
                </button>
              </div>
            </div>
          )}

          {/* Link to Blog */}
          <div className="mt-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              Join the community discussion on the Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: List View
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      <ScrollToTop />

      {/* Header */}
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),transparent_35%),linear-gradient(135deg,#f8f5f1_0%,#f2ede6_25%,#efe7dd_100%)]">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                <MessageCircleQuestion className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                FAQ & Discussions
              </h1>
            </div>
            <p className="mx-auto max-w-lg text-sm text-slate-600 sm:text-base">
              Find answers, ask questions, and discuss topics with the
              community.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSearch}
            className="relative mx-auto mt-6 max-w-xl"
          >
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.form>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6">
        {/* Mobile/Tablet: Horizontal category pills */}
        <div className="mb-4 lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setPage(1);
              }}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "border border-amber-400 bg-amber-100 text-amber-700"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const CatIcon = CATEGORY_ICONS[cat.name] || HelpCircle;
              const colors =
                CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.general;
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setPage(1);
                  }}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? `${colors.badge} ${colors.text} border ${colors.border}`
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CatIcon className="h-3 w-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
          {/* Mobile sort */}
          <div className="mt-2 flex items-center gap-2">
            {[
              { value: "recent", label: "Recent" },
              { value: "popular", label: "Popular" },
              { value: "most-replies", label: "Top Replies" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setSortBy(value as any);
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  sortBy === value
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* Sidebar - Categories (desktop only) */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="sticky top-20 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_35px_rgba(15,23,42,0.04)]">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Filter className="h-4 w-4 text-amber-600" />
                Categories
              </h3>

              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setPage(1);
                }}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === "all"
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                All Topics
              </button>

              {categories.map((cat) => {
                const CatIcon = CATEGORY_ICONS[cat.name] || HelpCircle;
                const colors =
                  CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.general;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setPage(1);
                    }}
                    className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === cat.name
                        ? `${colors.bg} ${colors.text}`
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <CatIcon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}

              {/* Sort Options */}
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Sort By
                </h3>
                {[
                  { value: "recent", label: "Most Recent" },
                  { value: "popular", label: "Most Viewed" },
                  { value: "most-replies", label: "Most Replies" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSortBy(value as any);
                      setPage(1);
                    }}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      sortBy === value
                        ? "bg-amber-100 text-amber-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Link to Blog */}
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Link
                  href="/blog"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 transition-colors hover:bg-slate-100"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Community Blog
                </Link>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="space-y-3">
            {/* Top Bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {posts.length} topic{posts.length !== 1 ? "s" : ""}
                {selectedCategory !== "all" &&
                  ` in ${categories.find((c) => c.name === selectedCategory)?.label}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New Topic
              </button>
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-[22px] border border-slate-200 bg-white p-5"
                  >
                    <div className="mb-3 h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center">
                <MessageCircleQuestion className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <h3 className="mb-2 text-lg font-medium text-slate-700">
                  No topics found
                </h3>
                <p className="text-sm text-slate-500">
                  {searchQuery
                    ? `No results for "${searchQuery}". Try a different search.`
                    : "Be the first to start a discussion!"}
                </p>
              </div>
            ) : (
              /* Topics List */
              <div className="space-y-2">
                {posts.map((post, idx) => {
                  const catColors =
                    CATEGORY_COLORS[post.faqCategory] ||
                    CATEGORY_COLORS.general;
                  const CatIcon =
                    CATEGORY_ICONS[post.faqCategory] || HelpCircle;
                  return (
                    <motion.button
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => openTopic(post)}
                      className="group w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-[0_18px_35px_rgba(15,23,42,0.04)] transition-all hover:border-amber-300 hover:bg-slate-50 sm:p-5"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Category Icon */}
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${catColors.bg}`}
                        >
                          <CatIcon className={`h-5 w-5 ${catColors.text}`} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-amber-700 sm:text-base">
                              {post.title}
                            </h3>
                            {post.isResolved && (
                              <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-1 text-xs text-slate-600 sm:text-sm">
                            {post.content}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>{post.author.displayName}</span>
                            <span className={`${catColors.text}`}>
                              {categories.find(
                                (c) => c.name === post.faqCategory,
                              )?.label || post.faqCategory}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />{" "}
                              {post.commentCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {post.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{" "}
                              {timeAgo(post.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg bg-white p-2 text-slate-600 shadow-sm transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg bg-white p-2 text-slate-600 shadow-sm transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Topic Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setIsCreateOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <Plus className="h-5 w-5 text-amber-600" />
                  New FAQ Topic
                </h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-500 transition-colors hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What's your question?"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const CatIcon = CATEGORY_ICONS[cat.name] || HelpCircle;
                      const colors =
                        CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.general;
                      return (
                        <button
                          key={cat.name}
                          onClick={() => setNewCategory(cat.name)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                            newCategory === cat.name
                              ? `${colors.bg} ${colors.text} ${colors.border}`
                              : "border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <CatIcon className="h-3 w-3" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Details
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Describe your question or topic in detail..."
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateTopic}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="w-full rounded-xl bg-slate-950 px-4 py-3 font-medium text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Post Topic
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

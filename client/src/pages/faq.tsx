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

// ─── Mock Data (fallback when DB unavailable) ───────────
const MOCK_CATEGORIES: FaqCategory[] = [
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

const generateMockFaqPosts = (): FaqPost[] => {
  const topics = [
    {
      title: "How do I reset my password?",
      category: "account",
      content:
        "I forgot my password and the reset email isn't arriving. What should I do?",
      resolved: true,
    },
    {
      title: "Can I export my analytics data?",
      category: "business",
      content:
        "I need to download my business analytics as a CSV file. Is this possible?",
      resolved: true,
    },
    {
      title: "What payment methods are accepted?",
      category: "billing",
      content:
        "I want to know which credit cards and payment services are supported for premium subscriptions.",
      resolved: true,
    },
    {
      title: "How to add a new business listing?",
      category: "business",
      content:
        "I'm trying to add my restaurant to the directory but I can't find the right form.",
      resolved: false,
    },
    {
      title: "Dashboard loading slowly on mobile",
      category: "technical",
      content:
        "The analytics dashboard takes 10+ seconds to load on my iPhone. Anyone else experiencing this?",
      resolved: false,
    },
    {
      title: "What is Geo Admin?",
      category: "platform",
      content:
        "I see a Geo Admin option in the menu but I'm not sure what it does. Can someone explain?",
      resolved: true,
    },
    {
      title: "How do reservations work?",
      category: "general",
      content:
        "I want to book a table through the platform. How does the RSVP system work?",
      resolved: false,
    },
    {
      title: "API rate limits for developers",
      category: "technical",
      content:
        "What are the current API rate limits for the v1 endpoints? I'm building an integration.",
      resolved: true,
    },
    {
      title: "How to verify my business?",
      category: "business",
      content:
        "I submitted my verification documents last week but haven't heard back. What's the timeline?",
      resolved: false,
    },
    {
      title: "Multi-language support?",
      category: "platform",
      content:
        "Is the platform available in languages other than English and French?",
      resolved: false,
    },
    {
      title: "Cancel subscription anytime?",
      category: "billing",
      content:
        "If I sign up for the annual plan, can I cancel mid-year and get a refund?",
      resolved: true,
    },
    {
      title: "Two-factor authentication setup",
      category: "account",
      content: "How do I enable 2FA on my account? I want to improve security.",
      resolved: true,
    },
  ];

  return topics.map((topic, i) => ({
    id: i + 1,
    title: topic.title,
    content: topic.content,
    faqCategory: topic.category,
    authorId: i + 1,
    commentCount: Math.floor(Math.random() * 20) + 1,
    viewCount: Math.floor(Math.random() * 500) + 50,
    isResolved: topic.resolved,
    createdAt: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    author: {
      displayName: [
        "Alex Martin",
        "Sophie Dubois",
        "Jean Moreau",
        "Marie Laurent",
        "Thomas Bernard",
        "Clara Petit",
      ][i % 6],
      profession: [
        "Developer",
        "Business Owner",
        "Analyst",
        "Manager",
        "Designer",
        "Consultant",
      ][i % 6],
      verifiedBadge: Math.random() > 0.5,
    },
  }));
};

const generateMockReplies = (): FaqReply[] => [
  {
    id: 1,
    content:
      "You can reset your password from the login page — click 'Forgot Password' and follow the email link. If the email doesn't arrive, check your spam folder.",
    authorId: 2,
    likeCount: 12,
    replyCount: 1,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    parentCommentId: null,
    author: {
      displayName: "Sophie Dubois",
      profession: "Support Team",
      verifiedBadge: true,
    },
    replies: [
      {
        id: 3,
        content: "This worked! Thank you Sophie.",
        authorId: 1,
        likeCount: 3,
        replyCount: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        parentCommentId: 1,
        author: { displayName: "Alex Martin", verifiedBadge: false },
      },
    ],
  },
  {
    id: 2,
    content:
      "Also make sure to use the email address you originally signed up with, not a different one.",
    authorId: 3,
    likeCount: 5,
    replyCount: 0,
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    parentCommentId: null,
    author: {
      displayName: "Jean Moreau",
      profession: "Developer",
      verifiedBadge: false,
    },
    replies: [],
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
  const [categories, setCategories] = useState<FaqCategory[]>(MOCK_CATEGORIES);
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
        // Fallback to mock data
        let mockPosts = generateMockFaqPosts();
        if (searchQuery) {
          mockPosts = mockPosts.filter(
            (p) =>
              p.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
              p.content.toLowerCase().startsWith(searchQuery.toLowerCase()),
          );
        }
        if (selectedCategory !== "all") {
          mockPosts = mockPosts.filter(
            (p) => p.faqCategory === selectedCategory,
          );
        }
        setPosts(mockPosts);
        setTotalPages(1);
      }
    } catch {
      // Use mock data on error
      let mockPosts = generateMockFaqPosts();
      if (searchQuery) {
        mockPosts = mockPosts.filter(
          (p) =>
            p.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
            p.content.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
      }
      if (selectedCategory !== "all") {
        mockPosts = mockPosts.filter((p) => p.faqCategory === selectedCategory);
      }
      setPosts(mockPosts);
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
    // Mock fallback
    const mockPost = generateMockFaqPosts().find((p) => p.id === topicId);
    if (mockPost) {
      setSelectedTopic({
        ...mockPost,
        replies: generateMockReplies(),
        totalReplies: 3,
      });
      setIsDetailView(true);
    }
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

    try {
      const res = await fetch(`/api/faq/${selectedTopic.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: faqUser?.id ? parseInt(faqUser.id) : 1,
          content: replyContent,
          parentCommentId: replyingTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh topic
        fetchTopicDetail(selectedTopic.id);
        setReplyContent("");
        setReplyingTo(null);
        return;
      }
    } catch {
      // fallback
    }
    // Mock: add reply locally
    const newReply: FaqReply = {
      id: Date.now(),
      content: replyContent,
      authorId: 1,
      likeCount: 0,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      parentCommentId: replyingTo,
      author: { displayName: "You", verifiedBadge: false },
      replies: [],
    };
    setSelectedTopic((prev) =>
      prev
        ? {
            ...prev,
            replies: replyingTo
              ? prev.replies.map((r) =>
                  r.id === replyingTo
                    ? { ...r, replies: [...(r.replies || []), newReply] }
                    : r,
                )
              : [...prev.replies, newReply],
            totalReplies: prev.totalReplies + 1,
          }
        : prev,
    );
    setReplyContent("");
    setReplyingTo(null);
  };

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: faqUser?.id ? parseInt(faqUser.id) : 1,
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
    } catch {
      // fallback
    }
    // Mock: add locally
    const mockNew: FaqPost = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
      faqCategory: newCategory,
      authorId: 1,
      commentCount: 0,
      viewCount: 0,
      isResolved: false,
      createdAt: new Date().toISOString(),
      author: { displayName: "You", verifiedBadge: false },
    };
    setPosts((prev) => [mockNew, ...prev]);
    setIsCreateOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewCategory("general");
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
                      <p className="text-slate-300 text-sm leading-relaxed">
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
                    <div className="ml-11 mt-3 space-y-2 border-l-2 border-white/5 pl-4">
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
                              <p className="text-slate-300 text-xs leading-relaxed">
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
                        className="ml-11 mt-3"
                      >
                        <div className="flex gap-2">
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
                            className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
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
              <div className="flex gap-3">
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
                  className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all font-medium flex items-center gap-2"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <ScrollToTop />

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-transparent border-b border-white/5">
        <div className="max-w-[95vw] mx-auto px-4 py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <MessageCircleQuestion className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                FAQ & Discussions
              </h1>
            </div>
            <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
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
            className="max-w-xl mx-auto mt-6 relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.form>
        </div>
      </div>

      <div className="max-w-[95vw] mx-auto px-4 py-6">
        {/* Mobile/Tablet: Horizontal category pills */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setPage(1);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700"
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
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? `${colors.badge} ${colors.text} border ${colors.border}`
                      : "bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700"
                  }`}
                >
                  <CatIcon className="w-3 h-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
          {/* Mobile sort */}
          <div className="flex items-center gap-2 mt-2">
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
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  sortBy === value
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar - Categories (desktop only) */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="bg-slate-900/60 rounded-xl border border-white/10 p-4 sticky top-20">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-cyan-400" />
                Categories
              </h3>

              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setPage(1);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  selectedCategory === "all"
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 flex items-center gap-2 ${
                      selectedCategory === cat.name
                        ? `${colors.bg} ${colors.text}`
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}

              {/* Sort Options */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                      sortBy === value
                        ? "bg-cyan-500/10 text-cyan-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Link to Blog */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <Link
                  href="/blog"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors rounded-lg hover:bg-white/5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Community Blog
                </Link>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="space-y-3">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">
                {posts.length} topic{posts.length !== 1 ? "s" : ""}
                {selectedCategory !== "all" &&
                  ` in ${categories.find((c) => c.name === selectedCategory)?.label}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                New Topic
              </button>
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 rounded-xl border border-white/5 p-5 animate-pulse"
                  >
                    <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-slate-700/30 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircleQuestion className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  No topics found
                </h3>
                <p className="text-slate-500 text-sm">
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
                      className="w-full text-left bg-slate-900/40 hover:bg-slate-900/70 rounded-xl border border-white/5 hover:border-white/10 p-4 sm:p-5 transition-all group"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Category Icon */}
                        <div
                          className={`w-10 h-10 rounded-lg ${catColors.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <CatIcon className={`w-5 h-5 ${catColors.text}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-white font-medium text-sm sm:text-base group-hover:text-cyan-300 transition-colors truncate">
                              {post.title}
                            </h3>
                            {post.isResolved && (
                              <span className="flex items-center gap-0.5 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs sm:text-sm line-clamp-1">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span>{post.author.displayName}</span>
                            <span className={`${catColors.text}`}>
                              {categories.find(
                                (c) => c.name === post.faqCategory,
                              )?.label || post.faqCategory}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />{" "}
                              {post.commentCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {post.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{" "}
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
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-400 px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
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
              className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-400" />
                  New FAQ Topic
                </h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What's your question?"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
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
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all border ${
                            newCategory === cat.name
                              ? `${colors.bg} ${colors.text} ${colors.border}`
                              : "border-white/5 text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          <CatIcon className="w-3 h-3" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Details
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Describe your question or topic in detail..."
                    rows={4}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <button
                  onClick={handleCreateTopic}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-all"
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

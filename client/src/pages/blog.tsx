// Blog/Social Feed Page - Phase 2 Implementation
// Features: Scroll-aware navbar, authentication flow, view-only mode for guests

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Filter, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import GuestFeedPreview from "@/components/community/GuestFeedPreview";
import CommunityStrip from "@/components/community/CommunityStrip";
import AuthModal from "@/components/AuthModal";
import VxppGuestIntro from "@/components/vxpp/VxppGuestIntro";
import BackLink from "@/components/BackLink";
import { navigateBackSafely } from "@/lib/safe-navigation";
import AdBanner from "@/components/AdBanner";
import { useSocialFeed } from "@/hooks/use-social-feed";
import { authenticatedFetch } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { isContentNavPath } from "@/components/ContentNav";

export default function BlogPage() {
  // ═══ Unified auth: AuthContext (main/artist/geo-admin) OR community session ═══
  const { user: globalUser, login: setGlobalLogin } = useAuthContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("blog_community_user") || "User";
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [verificationPending, setVerificationPending] = useState<{
    email: string;
    emailSent?: boolean | null;
    message?: string;
  } | null>(null);

  // Check auth on mount — global AuthContext first, then community session
  useEffect(() => {
    // If already authed via main auth / artist / geo-admin → skip gate
    if (globalUser) {
      setIsAuthenticated(true);
      const displayName =
        globalUser.name ||
        globalUser.displayName ||
        globalUser.username ||
        globalUser.email?.split("@")[0] ||
        "User";
      setUserName(displayName);
      // Also persist so marketplace picks it up
      localStorage.setItem("blog_community_auth", "true");
      localStorage.setItem("blog_community_user", displayName);
      return;
    }
    // Fallback: check community session via server
    const checkAuth = async () => {
      try {
        const { checkAuth: authCheck } = await import("@/lib/auth");
        const user = await authCheck();
        if (user) {
          setIsAuthenticated(true);
          const displayName =
            user.name ||
            user.displayName ||
            user.username ||
            localStorage.getItem("blog_community_user") ||
            user.email?.split("@")[0] ||
            "User";
          setUserName(displayName);
          localStorage.setItem("blog_community_auth", "true");
        }
      } catch {
        // Not authenticated
      }
    };
    checkAuth();
  }, [globalUser]);

  // Blog state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "trending">("recent");
  const [currentPath, setLocation] = useLocation();

  const SAVED_KEY = "blog_saved_posts";
  const [savedPosts, setSavedPosts] = useState<Record<number, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const toggleSavePost = (post: any) => {
    setSavedPosts((cur) => {
      const next = { ...cur };
      if (next[post.id]) delete next[post.id];
      else next[post.id] = post;
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        // storage full or unavailable
      }
      return next;
    });
  };
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  // Real API data via useSocialFeed hook
  const {
    posts: feedPosts,
    isLoading: feedLoading,
    loadMore,
    hasNextPage,
    createPost: apiCreatePost,
    likePost,
    unlikePost,
  } = useSocialFeed(
    1,
    10,
    sortBy,
    typeFilter === "all" || typeFilter === "saved" ? undefined : typeFilter,
    debouncedSearch || undefined,
  );

  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<number[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Authentication handlers — use real community auth endpoints
  const handleAuthenticate = async (
    identifier: string,
    password: string,
    isSignUp: boolean,
  ) => {
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const endpoint = isSignUp
        ? "/auth/community/register"
        : "/auth/community/login";
      const body: Record<string, any> = { email: identifier, password };
      if (isSignUp) {
        body.displayName =
          identifier.split("@")[0].charAt(0).toUpperCase() +
          identifier.split("@")[0].slice(1);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (data.requiresVerification) {
        setVerificationPending({
          email: data.email || identifier,
          emailSent: data.emailSent,
          message: data.message,
        });
        return;
      }

      if (!response.ok) {
        setAuthError(
          data.message || data.error || "Sign-in could not be completed.",
        );
        return;
      }

      if (data.success) {
        // Store token if provided
        if (data.token) {
          const { setAuthToken } = await import("@/lib/auth");
          setAuthToken(data.token);
        }

        const name =
          data.user?.displayName ||
          data.user?.username ||
          identifier.split("@")[0].charAt(0).toUpperCase() +
            identifier.split("@")[0].slice(1);
        if (data.token && data.user) {
          setGlobalLogin(data.token, { ...data.user, name });
        }
        setUserName(name);
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);

        // Persist display name for UI
        localStorage.setItem("blog_community_user", name);
      } else {
        setAuthError(data.message || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setAuthError(error.message || "Network error. Please try again.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { logout } = await import("@/lib/auth");
      await logout();
    } catch {
      // Logout anyway on error
    }
    setIsAuthenticated(false);
    setUserName("User");
    setIsCreatePostOpen(false);
    // Clear persisted blog community session
    localStorage.removeItem("blog_community_user");
  };

  // Sync posts from API
  useEffect(() => {
    if (feedPosts) setPosts(feedPosts);
  }, [feedPosts]);

  // Load the members the signed-in user already follows
  useEffect(() => {
    if (!isAuthenticated) {
      setConnectedUsers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await authenticatedFetch(
          "/api/social/follow/following",
        );
        const data = await response.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setConnectedUsers(data.data.map((id: any) => Number(id)));
        }
      } catch {
        // Falls back to an empty list; the follow action still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Define loadMorePosts FIRST (needed by useEffect)
  const loadMorePosts = useCallback(() => {
    if (hasNextPage) {
      setIsLoadingMore(true);
      loadMore();
      setIsLoadingMore(false);
    }
  }, [hasNextPage, loadMore]);

  // ALL HOOKS MUST BE CALLED BEFORE CONDITIONAL LOGIC
  // Simulate infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMore, loadMorePosts]);

  const handleToggleLike = useCallback((postId: number) => {
    setLikedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId],
    );
  }, []);

  const handleEditPost = async (postId: number, content: string) => {
    const response = await authenticatedFetch(`/api/social/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error("Post could not be updated");
    setPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, content, isEdited: true } : p)),
    );
    const { dismiss } = toast({
      title: "Post updated",
      duration: 2000,
    });
    window.setTimeout(() => dismiss(), 2000);
  };

  const handleDeletePost = async (postId: number) => {
    const response = await authenticatedFetch(`/api/social/posts/${postId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Post could not be deleted");
    setPosts((current) => current.filter((p) => p.id !== postId));
    const { dismiss } = toast({
      title: "Post deleted",
      duration: 2000,
    });
    window.setTimeout(() => dismiss(), 2000);
  };

  const handleComment = async (postId: number, content: string) => {
    const response = await authenticatedFetch(
      `/api/social/posts/${postId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
    if (!response.ok) throw new Error("Comment could not be posted");
  };

  const handleEditComment = async (
    postId: number,
    commentId: number,
    content: string,
  ) => {
    const response = await authenticatedFetch(
      `/api/social/posts/${postId}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
    if (!response.ok) throw new Error("Comment could not be updated");
  };

  const handleDeleteComment = async (postId: number, commentId: number) => {
    const response = await authenticatedFetch(
      `/api/social/posts/${postId}/comments/${commentId}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) throw new Error("Comment could not be deleted");
  };

  const handleFetchComments = async (postId: number) => {
    const response = await authenticatedFetch(
      `/api/social/posts/${postId}/comments?limit=50`,
    );
    if (!response.ok) throw new Error("Comments could not be loaded");
    const payload = await response.json();
    return payload.data || [];
  };

  const handleSharePost = async (postId: number) => {
    const shareTarget = posts.find((post) => post.id === postId);
    const shareText = shareTarget?.content
      ? `${shareTarget.content.slice(0, 120)}${shareTarget.content.length > 120 ? "…" : ""}`
      : "Check out this community post on Verso Air";

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Verso Air community post",
          text: shareText,
          url: `${window.location.origin}/blog`,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${shareText} — ${window.location.origin}/blog`,
        );
      }

      const shareRecord = await authenticatedFetch(
        `/api/social/posts/${postId}/share`,
        { method: "POST" },
      );
      if (!shareRecord.ok) throw new Error("Share could not be recorded");

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, shareCount: (post.shareCount || 0) + 1 }
            : post,
        ),
      );

      toast({
        title: "Post shared",
        description: "The link is ready to send or copy.",
      });
    } catch {
      toast({
        title: "Share cancelled",
        description: "You can still copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePost = (postData: {
    content: string;
    imageUrls?: string[];
    videoUrl?: string;
    allowMediaDownload?: boolean;
    tags?: string[];
  }) => {
    apiCreatePost({
      content: postData.content,
      imageUrls: postData.imageUrls,
      videoUrl: postData.videoUrl,
      allowMediaDownload: postData.allowMediaDownload,
      tags: postData.tags,
    });
    setIsCreatePostOpen(false);
  };

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  // If not authenticated, show Feed-specific guest introduction
  if (!isAuthenticated) {
    return (
      <>
        <VxppGuestIntro
          section="feed"
          redirectPath="/blog"
          onSignIn={() => setIsAuthModalOpen(true)}
          onSignUp={() => setIsAuthModalOpen(true)}
          onBack={() => navigateBackSafely(setLocation, "/")}
        />
        <GuestFeedPreview onJoin={() => setIsAuthModalOpen(true)} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
            setVerificationPending(null);
          }}
          onAuthenticate={handleAuthenticate}
          isLoading={isAuthLoading}
          error={authError}
          verificationPending={verificationPending}
        />
      </>
    );
  }

  const sortedPosts =
    sortBy === "trending"
      ? [...posts].sort((a, b) => b.engagementScore - a.engagementScore)
      : posts;
  const q = debouncedSearch;
  const displayPosts =
    typeFilter === "saved"
      ? Object.values(savedPosts).reverse()
      : sortedPosts;
  const TYPE_CHIPS = [
    ["all", "All"],
    ["discussion", "Discussions"],
    ["job", "Jobs"],
    ["marketplace", "Marketplace"],
    ["announcement", "Announcements"],
    ["trend", "Trends"],
    ["faq", "FAQ"],
    ["saved", "Saved"],
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f3ee] dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased">
      <ScrollToTop />

      {/* Main Content */}
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Feed Column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Quick Composer Bar */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-3">
              <Link
                href="/profile"
                className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-amber-600 to-amber-800 text-white text-xs font-bold flex items-center justify-center shrink-0"
              >
                {globalUser?.avatarUrl || globalUser?.avatar ? (
                  <img
                    src={(globalUser.avatarUrl || globalUser.avatar)!}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userName.slice(0, 2).toUpperCase()
                )}
              </Link>
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(true)}
                className="flex-1 text-left rounded-xl border border-stone-200 dark:border-slate-700 bg-[#faf8f4] dark:bg-slate-800/80 hover:bg-stone-100 dark:hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-300 transition-colors min-h-[44px]"
              >
                What&apos;s on your mind, {userName}? Share an update or photo…
              </button>
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(true)}
                className="rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 min-h-[44px] shrink-0 transition-colors"
              >
                Post
              </button>
            </div>

            <CommunityStrip />

            {/* Search + type filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search posts, tags or people"
                  aria-label="Search posts"
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 min-h-[44px]"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TYPE_CHIPS.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTypeFilter(val)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      typeFilter === val
                        ? "border-amber-700 bg-amber-700 text-white"
                        : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <Filter className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <button
                onClick={() => setSortBy("recent")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  sortBy === "recent"
                    ? "bg-cyan-700 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy("trending")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  sortBy === "trending"
                    ? "bg-cyan-700 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    window.location.href = `/signin?returnTo=${encodeURIComponent(window.location.pathname)}`;
                    return;
                  }
                  window.location.assign("/messages");
                }}
                className="ml-auto flex items-center gap-2 rounded-lg border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/50 px-3 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 transition-colors hover:bg-cyan-100 dark:hover:bg-cyan-900/50"
              >
                <MessageCircle className="h-4 w-4" />
                Messages
              </button>
            </div>

            {/* Posts */}
            {(q || typeFilter !== "all") && displayPosts.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">
                {typeFilter === "saved"
                  ? "Nothing saved yet. Tap the bookmark on a post to keep it here."
                  : "No posts match. Try another search or filter."}
              </p>
            )}
            {displayPosts.map((post, idx) => {
              const author = post.author || {};
              const isStaff =
                Boolean(globalUser?.isAdmin) ||
                ["admin", "superadmin", "superuser", "moderator"].includes(
                  String(globalUser?.role || "").toLowerCase(),
                );
              const canEdit =
                Boolean(globalUser?.id) &&
                (isStaff ||
                  (author.userId != null &&
                    Number(author.userId) === Number(globalUser?.id)));
              const cardPost = {
                id: post.id,
                author: {
                  id: author.id || post.authorId,
                  name: author.displayName || "Verso community member",
                  avatar:
                    author.avatarUrl ||
                    "https://api.dicebear.com/9.x/initials/svg?seed=Verso",
                  profession: author.profession,
                  verified: author.verifiedBadge,
                },
                content: post.content,
                images: post.imageUrls,
                videoUrl: post.videoUrl,
                allowMediaDownload: post.allowMediaDownload,
                timestamp: post.createdAt,
                likes: post.likeCount || 0,
                comments: post.commentCount || 0,
                shares: post.shareCount || 0,
                engagementScore: Number(post.engagementScore || 0),
                isTrending: post.isTrending,
                tags: post.tags,
              };
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <PostCard
                    post={cardPost}
                    canEdit={canEdit}
                    onEditPost={handleEditPost}
                    onDeletePost={handleDeletePost}
                    liked={likedPosts.includes(post.id)}
                    onLike={() => {
                      if (likedPosts.includes(post.id)) {
                        unlikePost({ postId: post.id });
                      } else {
                        likePost({ postId: post.id });
                      }
                      handleToggleLike(post.id);
                    }}
                    onComment={(postId, content) =>
                      handleComment(postId, content)
                    }
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onFetchComments={handleFetchComments}
                    onShare={handleSharePost}
                    saved={Boolean(savedPosts[post.id])}
                    onToggleSave={() => toggleSavePost(post)}
                  />
                </motion.div>
              );
            })}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="py-8 text-center">
              {isLoadingMore && (
                <div className="flex justify-center items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-slate-700 text-sm font-handstyle">
                    Loading more posts...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Topics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 p-4 shadow-sm backdrop-blur-sm transition-colors"
            >
              <h3 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Trends
              </h3>
              <div className="space-y-2">
                {[
                  { tag: "#RealTimeAnalytics", posts: "2.3K" },
                  { tag: "#DataDriven", posts: "1.8K" },
                  { tag: "#BusinessIntelligence", posts: "1.5K" },
                  { tag: "#SmallBizGrowth", posts: "987" },
                ].map((trend, idx) => (
                  <motion.button
                    key={trend.tag}
                    whileHover={{ x: 4 }}
                    className="w-full rounded-lg p-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-cyan-700 dark:text-cyan-400">
                        {trend.tag}
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-400">
                        {trend.posts}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 transition-colors"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 font-handstyle flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-cyan-700 dark:text-cyan-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
                FAQ & Help
              </h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm mb-3 font-handstyle">
                Got questions? Browse topics or ask the community.
              </p>
              <Link href="/faq">
                <button className="w-full py-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 dark:border-cyan-500/30 hover:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 rounded-lg text-sm font-medium transition-all font-handstyle flex items-center justify-center gap-2">
                  Browse FAQ
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmit={handleCreatePost}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthError("");
          setVerificationPending(null);
        }}
        onAuthenticate={handleAuthenticate}
        isLoading={isAuthLoading}
        error={authError}
        verificationPending={verificationPending}
      />
    </div>
  );
}

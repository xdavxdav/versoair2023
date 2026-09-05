// Blog/Social Feed Page - Phase 2 Implementation
// Features: Scroll-aware navbar, authentication flow, view-only mode for guests

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Filter } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import PostCard from "@/components/PostCard";
import UserProfileCard from "@/components/UserProfileCard";
import CreatePostModal from "@/components/CreatePostModal";
import UserConnectionModal from "@/components/UserConnectionModal";
import AuthModal from "@/components/AuthModal";
import ViewOnlyGate from "@/components/ViewOnlyGate";
import AdBanner from "@/components/AdBanner";
import { useSocialFeed } from "@/hooks/use-social-feed";
import { authenticatedFetch } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { isContentNavPath } from "@/components/ContentNav";

const TEST_ACCOUNTS = [
  {
    id: 23,
    name: "Verso Air Superadmin",
    profession: "Platform Superadmin",
    bio: "Test account for community posts, comments, and private threads.",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Superadmin",
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    engagementScore: 0,
    satisfactionRating: 5,
    verified: true,
    premiumMember: true,
    loginName: "joel_007",
  },
  {
    id: 24,
    name: "Verso Air CEO",
    profession: "Chief Executive Officer",
    bio: "Test account for community posts, comments, and private threads.",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=CEO",
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    engagementScore: 0,
    satisfactionRating: 5,
    verified: true,
    premiumMember: true,
    loginName: "admin_025",
  },
];

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

  // Check auth on mount — global AuthContext first, then community session
  useEffect(() => {
    // If already authed via main auth / artist / geo-admin → skip gate
    if (globalUser) {
      setIsAuthenticated(true);
      setUserName(globalUser.name || globalUser.email?.split("@")[0] || "User");
      // Also persist so marketplace picks it up
      localStorage.setItem("blog_community_auth", "true");
      localStorage.setItem(
        "blog_community_user",
        globalUser.name || globalUser.email?.split("@")[0] || "User",
      );
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
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"recent" | "trending">("recent");
  const [currentPath] = useLocation();

  // Real API data via useSocialFeed hook
  const {
    posts: feedPosts,
    isLoading: feedLoading,
    loadMore,
    hasNextPage,
    createPost: apiCreatePost,
    likePost,
    unlikePost,
  } = useSocialFeed(1, 10, sortBy);

  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<number[]>([]);
  const [followPendingIds, setFollowPendingIds] = useState<number[]>([]);
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
      const isStaffLogin =
        !isSignUp &&
        TEST_ACCOUNTS.some((account) => account.loginName === identifier);
      const endpoint = isStaffLogin
        ? "/auth/admin-gate"
        : isSignUp
          ? "/auth/community/register"
          : "/auth/community/login";
      const body: Record<string, any> = isStaffLogin
        ? { username: identifier, password }
        : { email: identifier, password };
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

      const data = await response.json();

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
    if (feedPosts && feedPosts.length > 0) {
      setPosts(feedPosts);
    }
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

  const handleShowUserModal = (user: any) => {
    setSelectedUser(user);
    setIsConnectionModalOpen(true);
  };

  const setFollowState = async (userId: number, shouldFollow: boolean) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      throw new Error("Sign in to follow other members");
    }
    // Optimistic update — flip the UI instantly, roll back only on failure
    const wasConnected = connectedUsers.includes(userId);
    setConnectedUsers((prev) =>
      shouldFollow
        ? prev.includes(userId)
          ? prev
          : [...prev, userId]
        : prev.filter((id) => id !== userId),
    );
    setFollowPendingIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
    try {
      const response = await authenticatedFetch(
        `/api/social/follow/${userId}`,
        { method: shouldFollow ? "POST" : "DELETE" },
      );
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not update this connection");
      }
      toast({
        title: shouldFollow ? "Following" : "Unfollowed",
        description: shouldFollow
          ? "You'll now see their activity in your feed"
          : "You've unfollowed this member",
      });
    } catch (err) {
      // Roll back to previous state
      setConnectedUsers((prev) =>
        wasConnected
          ? prev.includes(userId)
            ? prev
            : [...prev, userId]
          : prev.filter((id) => id !== userId),
      );
      toast({
        title: "Something went wrong",
        description:
          err instanceof Error
            ? err.message
            : "Could not update this connection",
        variant: "destructive",
      });
      throw err;
    } finally {
      setFollowPendingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleConnectUser = (userId: number) => setFollowState(userId, true);

  const handleDisconnectUser = (userId: number) =>
    setFollowState(userId, false);

  const handleMessageUser = async (userId: number) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    const account = TEST_ACCOUNTS.find((item) => item.id === userId);
    if (!account) return;

    try {
      const response = await authenticatedFetch("/api/inbox/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: account.id,
          participantName: account.name,
          participantAvatar: account.avatar,
          type: "marketplace",
        }),
      });
      if (response.ok) window.dispatchEvent(new Event("messenger:open"));
    } catch {
      // The inbox panel exposes retryable failures from its normal UI.
    }
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

  const handleShareUser = async (userId: number) => {
    const account = TEST_ACCOUNTS.find((item) => item.id === userId);
    if (!account) return;

    const shareText = `Meet ${account.name} on Verso Air`;
    const shareUrl = `${window.location.origin}/user/${userId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: account.name,
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} — ${shareUrl}`);
      }

      toast({
        title: "Profile shared",
        description: `You shared ${account.name}'s profile.`,
      });
    } catch {
      toast({
        title: "Share cancelled",
        description: "Your profile link was not sent.",
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
  // If not authenticated, show view-only gate
  if (!isAuthenticated) {
    return (
      <>
        <ViewOnlyGate
          onSignIn={() => setIsAuthModalOpen(true)}
          onSignUp={() => setIsAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthenticate={handleAuthenticate}
          isLoading={isAuthLoading}
        />
      </>
    );
  }

  const displayPosts =
    sortBy === "trending"
      ? [...posts].sort((a, b) => b.engagementScore - a.engagementScore)
      : posts;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(86,155,255,0.12),_transparent_34%),linear-gradient(135deg,#f8f5f1_0%,#f2ede6_38%,#efe7dd_100%)] text-slate-800 antialiased">
      <ScrollToTop />
      {isContentNavPath(currentPath) && (
        <div className="px-4 pt-4">
          <Link href="/">
            <button className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-500/15">
              <span aria-hidden="true">←</span>
              Back to home
            </button>
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto w-full max-w-[95vw] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Feed Column */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-sm leading-6 text-slate-600">
                Keep threads private, then publish your own updates when they
                deserve a wider audience.
              </p>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
              <Filter className="h-4 w-4 text-slate-500" />
              <button
                onClick={() => setSortBy("recent")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  sortBy === "recent"
                    ? "bg-cyan-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy("trending")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  sortBy === "trending"
                    ? "bg-cyan-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
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
                className="ml-auto flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
              >
                <MessageCircle className="h-4 w-4" />
                Messages
              </button>
            </div>

            {/* Posts */}
            {displayPosts.map((post, idx) => {
              const author = post.author || {};
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
                  />
                </motion.div>
              );
            })}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="py-8 text-center">
              {isLoadingMore && (
                <div className="flex justify-center items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-slate-400 text-sm font-handstyle">
                    Loading more posts...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Who to Follow */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-colors"
            >
              <h2 className="mb-3 text-lg font-semibold text-slate-800">
                Who to Follow
              </h2>
              <div className="space-y-3">
                {TEST_ACCOUNTS.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleShowUserModal(user)}
                    className="cursor-pointer"
                  >
                    <UserProfileCard
                      user={user as any}
                      isFollowing={connectedUsers.includes(user.id)}
                      isFollowPending={followPendingIds.includes(user.id)}
                      onFollow={(id) => {
                        void handleConnectUser(id).catch(() => {});
                      }}
                      onUnfollow={(id) => {
                        void handleDisconnectUser(id).catch(() => {});
                      }}
                      onMessage={() => handleMessageUser(user.id)}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Staff test sign-in:{" "}
                      <span className="text-cyan-700">{user.loginName}</span>
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Trending Topics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-colors"
            >
              <h3 className="mb-3 text-lg font-semibold text-slate-800">
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
                    className="w-full rounded-lg p-2 text-left transition-colors hover:bg-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-cyan-700">
                        {trend.tag}
                      </span>
                      <span className="text-xs text-slate-500">
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
              className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-colors"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-3 font-handstyle flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-cyan-400"
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
              <p className="text-slate-400 text-sm mb-3 font-handstyle">
                Got questions? Browse topics or ask the community.
              </p>
              <Link href="/faq">
                <button className="w-full py-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 rounded-lg text-sm font-medium transition-all font-handstyle flex items-center justify-center gap-2">
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

      <UserConnectionModal
        isOpen={isConnectionModalOpen}
        user={selectedUser}
        isConnected={
          selectedUser ? connectedUsers.includes(selectedUser.id) : false
        }
        onClose={() => {
          setIsConnectionModalOpen(false);
          setSelectedUser(null);
        }}
        onConnect={handleConnectUser}
        onDisconnect={handleDisconnectUser}
        onMessage={handleMessageUser}
        onShare={handleShareUser}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthError("");
        }}
        onAuthenticate={handleAuthenticate}
        isLoading={isAuthLoading}
        error={authError}
      />
    </div>
  );
}

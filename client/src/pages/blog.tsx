// Blog/Social Feed Page - Phase 2 Implementation
// Features: Scroll-aware navbar, authentication flow, view-only mode for guests

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Filter } from "lucide-react";
import { Link } from "wouter";
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
      setConnectedUsers((prev) =>
        shouldFollow
          ? prev.includes(userId)
            ? prev
            : [...prev, userId]
          : prev.filter((id) => id !== userId),
      );
    } finally {
      setFollowPendingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleConnectUser = (userId: number) => setFollowState(userId, true);

  const handleDisconnectUser = (userId: number) => setFollowState(userId, false);

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
    try {
      const response = await authenticatedFetch(
        `/api/social/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      if (response.ok) {
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? { ...post, commentCount: (post.commentCount || 0) + 1 }
              : post,
          ),
        );
      }
    } catch {
      // A failed comment stays unsent and can be retried.
    }
  };

  const handleShareUser = (userId: number) => {};

  const handleCreatePost = (postData: {
    content: string;
    imageUrls?: string[];
    tags?: string[];
  }) => {
    apiCreatePost({
      content: postData.content,
      imageUrls: postData.imageUrls,
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-handstyle">
      <ScrollToTop />

      {/* Main Content */}
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feed Column */}
          <div className="lg:col-span-2 space-y-6">
            <p className="text-sm text-slate-400">
              Keep threads private, then publish your own sent message when it
              deserves a wider audience.
            </p>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 pb-4 border-b border-white/10">
              <Filter className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => setSortBy("recent")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all font-handstyle ${
                  sortBy === "recent"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy("trending")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all font-handstyle ${
                  sortBy === "trending"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Trending
              </button>
              <button
                onClick={() =>
                  window.dispatchEvent(new Event("messenger:open"))
                }
                className="ml-auto flex items-center gap-2 px-3 py-2 bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/25 rounded-lg text-sm font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
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
              className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-colors"
            >
              <h2 className="text-lg font-semibold text-white mb-3 font-handstyle">
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
                      <span className="text-cyan-300">{user.loginName}</span>
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
              className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-3 font-handstyle">
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
                    className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors font-handstyle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-medium">
                        {trend.tag}
                      </span>
                      <span className="text-xs text-slate-400">
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
              <h3 className="text-lg font-semibold text-white mb-3 font-handstyle flex items-center gap-2">
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

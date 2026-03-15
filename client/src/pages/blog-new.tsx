// Blog/Social Feed Page - Phase 1 Implementation
// Location: client/src/pages/blog-new.tsx
// This is the new implementation, keeping old blog.tsx as fallback

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, Search, Filter } from "lucide-react";
import ScrollToTop from "@/components/ScrollToTop";
import PostCard from "@/components/PostCard";
import UserProfileCard from "@/components/UserProfileCard";
import CreatePostModal from "@/components/CreatePostModal";
import { useSocialFeed } from "@/hooks/use-social-feed";

// Mock data generator for initial launch
const generateMockPosts = (count: number) => {
  const posts = [];
  const names = [
    "Sarah Chen",
    "Marcus Johnson",
    "Elena Rodriguez",
    "James Wilson",
    "Priya Patel",
  ];
  const professions = [
    "Business Analyst",
    "Data Scientist",
    "Product Manager",
    "Strategy Consultant",
    "Marketing Director",
  ];
  const contents = [
    "Just launched our new analytics dashboard - the engagement metrics are incredible! Seeing 300% improvement in user satisfaction scores.",
    "Thinking about the future of small business intelligence... The gap between data-rich enterprises and SMBs is widening. What solutions are you seeing?",
    "Hot take: Real-time analytics should be the default, not a premium feature. Your customers deserve better visibility.",
    "Our team just hit 1000+ businesses in the network! So proud of what we're building together.",
    "Industry insight: 78% of business decisions are still made on gut feeling. That needs to change. Here's how we're tackling it.",
  ];
  const hashtags = [
    ["#Analytics", "#DataDriven", "#BusinessIntelligence"],
    ["#SmallBusiness", "#Startups", "#Growth"],
    ["#RealTime", "#Innovation", "#FutureOfWork"],
    ["#Community", "#Collaboration", "#Success"],
    ["#DataDecisions", "#Analytics", "#AI"],
  ];

  for (let i = 0; i < count; i++) {
    posts.push({
      id: i + 1,
      authorId: Math.floor(Math.random() * 5) + 1,
      content: contents[i % contents.length],
      tags: hashtags[i % hashtags.length],
      likeCount: Math.floor(Math.random() * 500),
      commentCount: Math.floor(Math.random() * 100),
      shareCount: Math.floor(Math.random() * 50),
      engagementScore: Math.random() * 100,
      isTrending: Math.random() > 0.7,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      author: {
        id: Math.floor(Math.random() * 5) + 1,
        displayName: names[i % names.length],
        profession: professions[i % professions.length],
        profileImageUrl: `https://images.unsplash.com/photo-${
          1494790108755 + i * 100
        }?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face`,
        verifiedBadge: Math.random() > 0.7,
        premiumMember: Math.random() > 0.5,
      },
    });
  }

  return posts;
};

const generateMockUsers = (count: number) => {
  const names = [
    "Sarah Chen",
    "Marcus Johnson",
    "Elena Rodriguez",
    "James Wilson",
    "Priya Patel",
  ];
  const professions = [
    "Business Analyst",
    "Data Scientist",
    "Product Manager",
    "Strategy Consultant",
    "Marketing Director",
  ];

  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: i + 1,
      displayName: names[i % names.length],
      profession: professions[i % professions.length],
      profileImageUrl: `https://images.unsplash.com/photo-${
        1494790108755 + i * 100
      }?ixlib=rb-4.0.3&w=400&h=400&fit=crop&crop=face`,
      coverImageUrl: `https://images.unsplash.com/photo-${
        1557821552 + i * 100
      }?ixlib=rb-4.0.3&w=600&h=300&fit=crop`,
      bio: "Passionate about business intelligence and data-driven decisions",
      verifiedBadge: Math.random() > 0.7,
      premiumMember: Math.random() > 0.5,
      followerCount: Math.floor(Math.random() * 5000),
      followingCount: Math.floor(Math.random() * 1000),
      postCount: Math.floor(Math.random() * 200),
      satisfactionRating: (Math.random() * 2 + 3.5).toFixed(1),
      engagementScore: (Math.random() * 50).toFixed(1),
    });
  }

  return users;
};

export default function BlogPage() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "trending">("recent");
  const [posts, setPosts] = useState(generateMockPosts(10));
  const [suggestedUsers] = useState(generateMockUsers(3));
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

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
  }, [isLoadingMore]);

  const loadMorePosts = useCallback(() => {
    setIsLoadingMore(true);
    // Simulate network delay
    setTimeout(() => {
      setPosts((prev) => [...prev, ...generateMockPosts(5)]);
      setIsLoadingMore(false);
    }, 800);
  }, []);

  const handleToggleLike = useCallback((postId: number) => {
    setLikedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId],
    );
  }, []);

  const handleCreatePost = (postData: {
    content: string;
    imageUrls?: string[];
    tags?: string[];
  }) => {
    const newPost = {
      id: Math.max(...posts.map((p) => p.id)) + 1,
      authorId: 1,
      content: postData.content,
      tags: postData.tags || [],
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      engagementScore: 0,
      isTrending: false,
      createdAt: new Date(),
      author: {
        id: 1,
        displayName: "You",
        profession: "Business Owner",
        profileImageUrl:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
        verifiedBadge: true,
        premiumMember: true,
      },
    };

    setPosts((prev) => [newPost, ...prev]);
    setIsCreatePostOpen(false);
  };

  const displayPosts =
    sortBy === "trending"
      ? [...posts].sort((a, b) => b.engagementScore - a.engagementScore)
      : posts;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <ScrollToTop />

      {/* Navigation */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Verso Social
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts, users, topics..."
                className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm"
              />
            </div>

            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Post
            </button>

            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="sm:hidden p-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feed Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sort Controls */}
            <div className="flex items-center gap-2 pb-4 border-b border-white/10">
              <Filter className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => setSortBy("recent")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "recent"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy("trending")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  sortBy === "trending"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" />
                Trending
              </button>
            </div>

            {/* Posts Feed */}
            <AnimatePresence mode="popLayout">
              {displayPosts.map((post, index) => (
                <motion.div
                  key={`${post.id}-${sortBy}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: index * 0.05,
                  }}
                >
                  <PostCard
                    post={post as any}
                    liked={likedPosts.includes(post.id)}
                    onLike={() => handleToggleLike(post.id)}
                    onComment={() => console.log("Comment on post", post.id)}
                    onShare={() => console.log("Share post", post.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Load More Trigger */}
            <div ref={observerTarget} className="py-12 text-center">
              {isLoadingMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center gap-1"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="w-2 h-2 bg-cyan-400 rounded-full"
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Suggested Users */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Who to Follow
              </h2>
              <div className="space-y-3">
                {suggestedUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <UserProfileCard user={user as any} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trending Topics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-3">Trends</h3>
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
                    className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors"
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
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
}

/**
 * Music Social Feed — The Twitter/Instagram for Verso Air artists and listeners.
 * Artists post tracks, listeners discover, everyone interacts.
 * Reuses the existing social_posts engine — zero duplicate logic.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Music2,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Play,
  Pause,
  Send,
  Image as ImageIcon,
  Mic2,
  TrendingUp,
  Users,
  Compass,
  Plus,
  X,
  Loader2,
  Verified,
  Globe,
  RefreshCw,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { useAudio } from "@/lib/audio-context";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrackAttachment {
  id: number;
  title: string;
  genre: string | null;
  duration: number | null;
  cover_art: string | null;
  pochette: string | null;
  has_audio_data: boolean;
}

interface PostAuthor {
  id: number;
  userId: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  verifiedBadge: boolean;
  profession: string | null;
}

interface SocialPost {
  id: number;
  authorId: number;
  content: string;
  imageUrls: string[] | null;
  postType: string;
  tags: string[] | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isTrending: boolean;
  createdAt: string;
  author: PostAuthor | null;
  track: TrackAttachment | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatDuration(secs: number | null): string {
  if (!secs) return "--:--";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

// ─── Track Card embedded in post ─────────────────────────────────────────────
function PostTrackCard({ track }: { track: TrackAttachment }) {
  const { currentTrack, isPlaying, playTrack } = useAudio();
  const isCurrent = currentTrack?.id === track.id;
  const coverSrc = track.pochette || track.cover_art;

  const handlePlay = () => {
    if (!track.has_audio_data) return;
    playTrack({
      id: track.id,
      title: track.title,
      artist: { stageName: "Artist" },
      streamUrl: `/api/music/tracks/${track.id}/stream`,
      coverArt: coverSrc || undefined,
    } as any);
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* Cover art with play overlay */}
        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-pink-600/30">
          {coverSrc && (
            <img
              src={coverSrc}
              alt={track.title}
              className="h-full w-full object-cover"
            />
          )}
          <button
            onClick={handlePlay}
            disabled={!track.has_audio_data}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all",
              track.has_audio_data
                ? "bg-black/40 hover:bg-black/60 cursor-pointer"
                : "bg-black/60 cursor-not-allowed",
            )}
          >
            {isCurrent && isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {track.title}
          </p>
          {track.genre && (
            <p className="text-xs text-white/50 truncate">{track.genre}</p>
          )}
        </div>

        <span className="text-xs text-white/40 shrink-0">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Compose Box ─────────────────────────────────────────────────────────────
function ComposeBox({
  onPosted,
  userAvatar,
}: {
  onPosted: () => void;
  userAvatar?: string | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<TrackAttachment | null>(
    null,
  );
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-attach track when arriving from vault "Share to Feed"
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("versair_share_track");
      if (!raw) return;
      const track = JSON.parse(raw) as TrackAttachment;
      setSelectedTrack(track);
      sessionStorage.removeItem("versair_share_track");
      setContent(`Check out my track "${track.title}"`);
      textareaRef.current?.focus();
    } catch {
      // invalid session data, ignore
    }
  }, []);

  // Fetch user's tracks for the picker
  const { data: myTracks } = useQuery<{ tracks: TrackAttachment[] }>({
    queryKey: ["my-tracks-picker"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tracks/my-tracks?limit=20");
      if (!res.ok) return { tracks: [] };
      return res.json();
    },
    enabled: showTrackPicker,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          postType: selectedTrack ? "music_post" : "discussion",
          trackId: selectedTrack?.id,
        }),
      });
      if (!res.ok) throw new Error("Post failed");
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      setSelectedTrack(null);
      setShowTrackPicker(false);
      queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
      onPosted();
    },
  });

  const canPost = content.trim().length > 0 || selectedTrack;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={userAvatar || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || "V"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community..."
            className="min-h-[72px] resize-none border-0 bg-transparent p-0 text-white placeholder:text-white/40 focus-visible:ring-0 text-[15px]"
            maxLength={500}
          />

          {/* Attached track preview */}
          {selectedTrack && (
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 p-2">
              <Music2 className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="text-sm text-purple-200 flex-1 truncate">
                {selectedTrack.title}
              </span>
              <button
                onClick={() => setSelectedTrack(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Track picker */}
          <AnimatePresence>
            {showTrackPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-xl border border-white/10 bg-black/40"
              >
                <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-white/50 mb-2">
                    Attach a track
                  </p>
                  {myTracks?.tracks?.length === 0 && (
                    <p className="text-sm text-white/40">
                      No tracks yet — upload one first.
                    </p>
                  )}
                  {myTracks?.tracks?.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedTrack(track);
                        setShowTrackPicker(false);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg p-2 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="h-8 w-8 rounded bg-purple-600/30 flex items-center justify-center shrink-0">
                        <Music2 className="h-4 w-4 text-purple-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {track.title}
                        </p>
                        {track.genre && (
                          <p className="text-xs text-white/40">{track.genre}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTrackPicker(!showTrackPicker)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Music2 className="h-3.5 w-3.5" />
                Attach track
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">
                {content.length}/500
              </span>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canPost || createMutation.isPending}
                size="sm"
                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({
  post,
  onLike,
}: {
  post: SocialPost;
  onLike: (id: number, liked: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(
        `/api/social/posts/${post.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText }),
        },
      );
      if (!res.ok) throw new Error("Comment failed");
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
    },
  });

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    onLike(post.id, newLiked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author?.avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-sm font-bold">
              {post.author?.displayName?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">
                {post.author?.displayName || "Unknown"}
              </span>
              {post.author?.verifiedBadge && (
                <Verified className="h-3.5 w-3.5 text-blue-400 fill-blue-400" />
              )}
              {post.isTrending && (
                <Badge className="h-4 px-1.5 text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                  Trending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/40">
                @{post.author?.username}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-white/40">
                {timeAgo(post.createdAt)}
              </span>
              {post.postType === "music_post" && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-0.5 text-xs text-purple-400">
                    <Music2 className="h-3 w-3" />
                    Track
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button className="text-white/30 hover:text-white/60 transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <p className="text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Images */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div
          className={cn(
            "grid gap-2 rounded-xl overflow-hidden",
            post.imageUrls.length === 1
              ? "grid-cols-1"
              : post.imageUrls.length === 2
                ? "grid-cols-2"
                : "grid-cols-2",
          )}
        >
          {post.imageUrls.slice(0, 4).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full h-48 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Attached track */}
      {post.track && <PostTrackCard track={post.track} />}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all",
            liked
              ? "text-pink-400 hover:text-pink-300"
              : "text-white/40 hover:text-pink-400 hover:bg-pink-500/10",
          )}
        >
          <Heart
            className={cn("h-4 w-4 transition-all", liked && "fill-pink-400")}
          />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount > 0 && <span>{post.commentCount}</span>}
        </button>

        <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors">
          <Share2 className="h-4 w-4" />
          {post.shareCount > 0 && <span>{post.shareCount}</span>}
        </button>

        <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/40 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors">
          <Bookmark className="h-4 w-4" />
        </button>
      </div>

      {/* Inline comment input */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pt-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs">
                  {user?.name?.[0]?.toUpperCase() || "V"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim()) {
                      commentMutation.mutate();
                    }
                  }}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/15 transition-colors"
                />
                <button
                  onClick={() => commentMutation.mutate()}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="text-purple-400 hover:text-purple-300 disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type FeedTab = "for_you" | "following" | "music";

export default function MusicSocialPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FeedTab>("for_you");
  const [page, setPage] = useState(1);

  const endpoint =
    activeTab === "following"
      ? "/api/social/posts/following"
      : activeTab === "music"
        ? "/api/social/posts/music"
        : "/api/social/posts";

  const {
    data: feedData,
    isLoading,
    isError,
    refetch,
  } = useQuery<{ data: SocialPost[] }>({
    queryKey: ["socialFeed", activeTab, page],
    queryFn: async () => {
      const res = await fetch(`${endpoint}?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Feed failed");
      return res.json();
    },
    staleTime: 30000,
  });

  const likeMutation = useMutation({
    mutationFn: async ({
      postId,
      liked,
    }: {
      postId: number;
      liked: boolean;
    }) => {
      const method = liked ? "POST" : "DELETE";
      await authenticatedFetch(`/api/social/posts/${postId}/like`, { method });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
    },
  });

  const posts = feedData?.data || [];

  const tabs: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
    { id: "for_you", label: "For You", icon: <Globe className="h-4 w-4" /> },
    {
      id: "following",
      label: "Following",
      icon: <Users className="h-4 w-4" />,
    },
    { id: "music", label: "Music", icon: <Music2 className="h-4 w-4" /> },
  ];

  return (
    <MusicLayout>
      <div className="max-w-2xl mx-auto space-y-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Community</h1>
            <p className="text-sm text-white/50">
              Share your sound with the world
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/10",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compose */}
        {user && <ComposeBox onPosted={() => refetch()} />}

        {/* Feed */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/50">Could not load the feed.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="mt-3 text-purple-400 hover:text-purple-300"
            >
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center mx-auto">
              <Compass className="h-8 w-8 text-purple-400" />
            </div>
            <p className="text-white font-medium">
              {activeTab === "following"
                ? "No posts from people you follow yet"
                : activeTab === "music"
                  ? "No music posts yet — be the first!"
                  : "Nothing here yet"}
            </p>
            <p className="text-sm text-white/40">
              {activeTab === "following"
                ? "Follow some artists to see their posts here."
                : "Be the first to share something."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={(id, liked) => likeMutation.mutate({ postId: id, liked })}
            />
          ))}
        </div>

        {/* Load more */}
        {posts.length >= 20 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="ghost"
              onClick={() => setPage((p) => p + 1)}
              className="text-white/50 hover:text-white"
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </MusicLayout>
  );
}

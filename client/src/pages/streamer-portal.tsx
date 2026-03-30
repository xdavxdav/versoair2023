/**
 * Streamer Portal — Twitter-like music community
 * Comment threads, emoji reactions, artist follow & dashboard view
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Heart,
  Flame,
  PartyPopper,
  HandMetal,
  Frown,
  Sparkles,
  Music,
  Users,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Send,
  Play,
  Pause,
  User,
  Star,
  Globe,
  Calendar,
  BarChart3,
  Disc3,
  X,
  ArrowLeft,
  Crown,
  Headphones,
  Radio,
  Search,
  Filter,
  Clock,
  Award,
  UserPlus,
  UserMinus,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAudio } from "@/lib/audio-context";

// ── Reaction emoji mapping ──
const REACTIONS = [
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "clap", emoji: "👏", label: "Clap" },
  { type: "mindblown", emoji: "🤯", label: "Mind Blown" },
  { type: "party", emoji: "🎉", label: "Party" },
  { type: "sad", emoji: "😢", label: "Sad" },
];

// ── Helper: time ago ──
function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(date).toLocaleDateString();
}

// ── Helper: format streams ──
function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Helper: get cover art ──
function getCover(t: any): string | null {
  if (t.cover_art) return t.cover_art;
  if (t.has_pochette) return `/api/streaming/tracks/${t.id}/pochette`;
  if (t.album_cover) return t.album_cover;
  return null;
}

// ── Helper: country flag ──
function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

// ═══════════════════════════════════════════════════════════
// TRACK THREAD CARD — Twitter-style song post with comments
// ═══════════════════════════════════════════════════════════
function TrackThreadCard({
  track,
  onOpenThread,
  onPlay,
  isPlaying,
}: {
  track: any;
  onOpenThread: (trackId: number) => void;
  onPlay: (track: any) => void;
  isPlaying: boolean;
}) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reactions for this track
  const { data: reactionsData } = useQuery({
    queryKey: ["track-reactions", track.id],
    queryFn: async () => {
      const res = await fetch(`/api/streaming/track/${track.id}/reactions`, {
        credentials: "include",
      });
      if (!res.ok) return { reactions: {}, userReactions: [] };
      return res.json();
    },
  });

  // Toggle reaction mutation
  const toggleReaction = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await fetch(`/api/streaming/track/${track.id}/react`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
      });
      if (!res.ok) throw new Error("Failed to react");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["track-reactions", track.id],
      });
    },
    onError: () => {
      toast({ title: "Sign in to react", variant: "destructive" });
    },
  });

  const reactions = reactionsData?.reactions || {};
  const userReactions = reactionsData?.userReactions || [];
  const totalReactions = Object.values(reactions).reduce(
    (sum: number, count: any) => sum + (count || 0),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 hover:border-purple-500/20 transition-all"
    >
      {/* Track Header */}
      <div className="flex gap-4">
        {/* Cover Art */}
        <div
          className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
          onClick={() => onPlay(track)}
        >
          {getCover(track) ? (
            <img
              src={getCover(track)!}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <Music className="w-8 h-8 text-white/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-white font-semibold truncate">
                {track.title}
              </h3>
              <p className="text-gray-400 text-sm truncate">
                {track.artist_name}
              </p>
            </div>
            {track.artist_verified && (
              <Badge className="bg-purple-500/20 text-purple-300 text-xs flex-shrink-0">
                <Star className="w-3 h-3 mr-1 fill-purple-400" />
                Verified
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Headphones className="w-3 h-3" />
              {formatStreams(track.streams || 0)}
            </span>
            <span>{track.genre}</span>
            {track.release_date && (
              <span>{new Date(track.release_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Reaction Bar */}
      <div className="flex items-center gap-1 mt-4 flex-wrap">
        {REACTIONS.map((r) => {
          const count = reactions[r.type] || 0;
          const hasReacted = userReactions.includes(r.type);
          return (
            <button
              key={r.type}
              onClick={() => user && toggleReaction.mutate(r.type)}
              disabled={!user}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-all ${
                hasReacted
                  ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
              } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span>{r.emoji}</span>
              {count > 0 && <span className="text-xs">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <button
          onClick={() => onOpenThread(track.id)}
          className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{track.comment_count || 0} Comments</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            {totalReactions} reactions
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// THREAD MODAL — Full comment thread view
// ═══════════════════════════════════════════════════════════
function ThreadModal({
  trackId,
  onClose,
}: {
  trackId: number;
  onClose: () => void;
}) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audio = useAudio();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Fetch thread data
  const { data: threadData, isLoading } = useQuery({
    queryKey: ["track-thread", trackId],
    queryFn: async () => {
      const res = await fetch(`/api/streaming/track/${trackId}/thread`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load thread");
      return res.json();
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({
      content,
      parentId,
    }: {
      content: string;
      parentId?: number;
    }) => {
      const res = await fetch("/api/streaming/comment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, content, parentId }),
      });
      if (!res.ok) throw new Error("Failed to comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track-thread", trackId] });
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      toast({ title: "Comment posted!" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await fetch(`/api/streaming/track/${trackId}/react`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
      });
      if (!res.ok) throw new Error("Failed to react");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track-thread", trackId] });
    },
  });

  const track = threadData?.track;
  const comments = threadData?.comments || [];
  const reactions = threadData?.reactions || {};

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sticky top-0 bg-gray-950/90 backdrop-blur-xl py-4 -mx-4 px-4 z-10 border-b border-white/5">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-white">Thread</h2>
        </div>

        {/* Track Card */}
        {track && (
          <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-6">
            <div className="flex gap-4">
              <div
                className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
                onClick={() => audio.playTrack(track)}
              >
                {getCover(track) ? (
                  <img
                    src={getCover(track)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                    <Music className="w-10 h-10 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{track.title}</h3>
                <p className="text-purple-400">{track.artist_name}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" />
                    {formatStreams(track.streams || 0)}
                  </span>
                  <span>{track.genre}</span>
                </div>
              </div>
            </div>

            {/* Reactions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {REACTIONS.map((r) => {
                const count = reactions[r.type] || 0;
                return (
                  <button
                    key={r.type}
                    onClick={() => user && toggleReaction.mutate(r.type)}
                    disabled={!user}
                    className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-all text-sm"
                  >
                    <span className="text-lg">{r.emoji}</span>
                    {count > 0 && (
                      <span className="text-gray-400">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* New Comment Input */}
        {user && (
          <div className="bg-gray-900/40 border border-white/5 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">
                  {(user.username || user.email)?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts on this track..."
                  className="bg-transparent border-none resize-none text-white placeholder-gray-500 focus:ring-0 p-0 min-h-[60px]"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={() =>
                      newComment.trim() &&
                      addComment.mutate({ content: newComment.trim() })
                    }
                    disabled={!newComment.trim() || addComment.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-gray-400 text-sm font-medium">
            {threadData?.totalComments || 0} Comments
          </h3>

          {comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment: any) => (
              <div
                key={comment.id}
                className="bg-gray-900/30 border border-white/5 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                    {comment.avatar_url ? (
                      <img
                        src={comment.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm font-medium">
                        {(comment.username || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">
                        {comment.display_name || comment.username}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    {/* Reply button */}
                    <button
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === comment.id ? null : comment.id,
                        )
                      }
                      className="text-gray-500 hover:text-purple-400 text-xs mt-2 flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Reply
                      {comment.reply_count > 0 && (
                        <span className="text-gray-600">
                          ({comment.reply_count})
                        </span>
                      )}
                    </button>

                    {/* Reply input */}
                    {replyingTo === comment.id && user && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 bg-gray-800/50 border-gray-700 text-white text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            replyContent.trim() &&
                            addComment.mutate({
                              content: replyContent.trim(),
                              parentId: comment.id,
                            })
                          }
                          disabled={!replyContent.trim()}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies?.length > 0 && (
                      <div className="mt-3 pl-4 border-l border-white/10 space-y-3">
                        {comment.replies.map((reply: any) => (
                          <div
                            key={reply.id}
                            className="flex items-start gap-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-500 text-xs">
                                {(reply.username || "U")[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300 text-xs font-medium">
                                  {reply.display_name || reply.username}
                                </span>
                                <span className="text-gray-600 text-xs">
                                  {timeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-gray-400 text-xs mt-0.5">
                                {reply.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// ARTIST DASHBOARD PANEL
// ═══════════════════════════════════════════════════════════
function ArtistDashboardPanel({
  artistId,
  onClose,
}: {
  artistId: number;
  onClose: () => void;
}) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audio = useAudio();

  // Fetch artist dashboard
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["artist-dashboard", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/streaming/artist/${artistId}/dashboard`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load artist");
      return res.json();
    },
  });

  // Toggle follow
  const toggleFollow = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/streaming/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId }),
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["artist-dashboard", artistId],
      });
      queryClient.invalidateQueries({ queryKey: ["followed-artists"] });
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-gray-950 border-l border-white/10 z-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const artist = dashboard?.artist;
  const topTracks = dashboard?.topTracks || [];
  const recentReleases = dashboard?.recentReleases || [];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-gray-950 border-l border-white/10 z-50 overflow-y-auto"
    >
      {/* Header with artist image */}
      <div className="relative h-48">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-fuchsia-900/40" />
        {artist?.image_url && (
          <img
            src={artist.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Artist info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl flex-shrink-0">
              {artist?.image_url ? (
                <img
                  src={artist.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                  <User className="w-10 h-10 text-white/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white truncate">
                  {artist?.name}
                </h2>
                {artist?.verified && (
                  <Star className="w-5 h-5 text-purple-400 fill-purple-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                <span>{getFlag(artist?.country_code)}</span>
                <span>{artist?.genre}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900/50">
        <div className="text-center">
          <div className="text-xl font-bold text-white">
            {formatStreams(artist?.total_streams || 0)}
          </div>
          <div className="text-xs text-gray-500">Total Streams</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-purple-400">
            {formatStreams(artist?.monthly_listeners || 0)}
          </div>
          <div className="text-xs text-gray-500">Monthly Listeners</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-amber-400">
            {artist?.follower_count || 0}
          </div>
          <div className="text-xs text-gray-500">Followers</div>
        </div>
      </div>

      {/* Follow button */}
      <div className="px-4 py-3 border-b border-white/5">
        <Button
          onClick={() => user && toggleFollow.mutate()}
          disabled={!user}
          className={`w-full ${
            dashboard?.isFollowing
              ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {dashboard?.isFollowing ? (
            <>
              <UserMinus className="w-4 h-4 mr-2" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Follow
            </>
          )}
        </Button>
      </div>

      {/* Bio */}
      {artist?.biography && (
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">About</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            {artist.biography}
          </p>
        </div>
      )}

      {/* Top Tracks */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Top Tracks
        </h3>
        <div className="space-y-2">
          {topTracks.slice(0, 5).map((track: any, i: number) => (
            <div
              key={track.id}
              onClick={() => audio.playTrack(track)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group"
            >
              <span className="w-5 text-center text-gray-600 text-sm">
                {i + 1}
              </span>
              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                {getCover(track) ? (
                  <img
                    src={getCover(track)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Music className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{track.title}</p>
                <p className="text-gray-500 text-xs">
                  {formatStreams(track.streams || 0)} streams
                </p>
              </div>
              <Play className="w-4 h-4 text-gray-500 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Releases */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Disc3 className="w-4 h-4" />
          Recent Releases
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {recentReleases.slice(0, 4).map((release: any) => (
            <div
              key={release.id}
              className="bg-gray-900/50 rounded-xl p-3 hover:bg-gray-900/80 transition-colors cursor-pointer"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-2">
                {release.cover_art ? (
                  <img
                    src={release.cover_art}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Disc3 className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>
              <p className="text-white text-sm font-medium truncate">
                {release.title}
              </p>
              <p className="text-gray-500 text-xs">
                {release.album_type} • {release.track_count} tracks
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN STREAMER PORTAL
// ═══════════════════════════════════════════════════════════
export default function StreamerPortal() {
  const { user } = useAuthContext();
  const audio = useAudio();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch trending tracks with comment/reaction counts
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["streamer-feed", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "30" });
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/streaming/tracks?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load feed");
      return res.json();
    },
  });

  // Fetch followed artists
  const { data: followedData } = useQuery({
    queryKey: ["followed-artists"],
    queryFn: async () => {
      const res = await fetch("/api/streaming/user/followed-artists", {
        credentials: "include",
      });
      if (!res.ok) return { artists: [] };
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch all artists for discovery
  const { data: artistsData } = useQuery({
    queryKey: ["all-artists"],
    queryFn: async () => {
      const res = await fetch("/api/streaming/artists?limit=20&sort=monthly");
      if (!res.ok) return { artists: [] };
      return res.json();
    },
  });

  const tracks = feedData?.tracks || [];
  const followedArtists = followedData?.artists || [];
  const allArtists = artistsData?.artists || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,200,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(160,60,180,0.08),transparent)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-200 text-white mb-4"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Streamer Portal</h1>
                <p className="text-xs text-gray-500">
                  Comment & react to music
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/stream">
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <Music className="w-4 h-4 mr-1" />
                  Browse
                </Button>
              </Link>
              {user && (
                <Badge className="bg-purple-500/20 text-purple-300">
                  <Crown className="w-3 h-3 mr-1" />
                  {user.username || user.email?.split("@")[0]}
                </Badge>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks, artists..."
              className="pl-10 bg-gray-900/50 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-white/5 w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger
                value="feed"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 data-[state=active]:bg-transparent px-4 py-3"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Feed
              </TabsTrigger>
              <TabsTrigger
                value="artists"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 data-[state=active]:bg-transparent px-4 py-3"
              >
                <Users className="w-4 h-4 mr-2" />
                Artists
              </TabsTrigger>
              {user && (
                <TabsTrigger
                  value="following"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Following
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {activeTab === "feed" && (
          <div className="space-y-4">
            {feedLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900/60 rounded-2xl p-4 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-800 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : tracks.length === 0 ? (
              <div className="text-center py-20">
                <Music className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500">No tracks found</p>
              </div>
            ) : (
              tracks.map((track: any) => (
                <TrackThreadCard
                  key={track.id}
                  track={track}
                  onOpenThread={setSelectedThread}
                  onPlay={audio.playTrack}
                  isPlaying={
                    audio.currentTrack?.id === track.id && audio.isPlaying
                  }
                />
              ))
            )}
          </div>
        )}

        {activeTab === "artists" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allArtists.map((artist: any) => (
              <div
                key={artist.id}
                onClick={() => setSelectedArtist(artist.id)}
                className="bg-gray-900/60 border border-white/5 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-900/80 hover:border-purple-500/20 transition-all"
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden">
                  {artist.image_url ? (
                    <img
                      src={artist.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                      <User className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                </div>
                <h3 className="text-white font-medium truncate text-sm">
                  {artist.name}
                </h3>
                <p className="text-gray-500 text-xs">
                  {formatStreams(artist.monthly_listeners || 0)} monthly
                </p>
                {artist.verified && (
                  <Badge className="mt-2 bg-purple-500/20 text-purple-300 text-xs">
                    <Star className="w-3 h-3 mr-1 fill-purple-400" />
                    Verified
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "following" && user && (
          <div>
            {followedArtists.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500 mb-4">
                  You're not following any artists yet
                </p>
                <Button
                  onClick={() => setActiveTab("artists")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Discover Artists
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {followedArtists.map((artist: any) => (
                  <div
                    key={artist.id}
                    onClick={() => setSelectedArtist(artist.id)}
                    className="bg-gray-900/60 border border-white/5 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-900/80 hover:border-purple-500/20 transition-all"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium truncate">
                          {artist.name}
                        </h3>
                        {artist.verified && (
                          <Star className="w-4 h-4 text-purple-400 fill-purple-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">
                        {artist.genre} • {artist.track_count || 0} tracks
                      </p>
                      {artist.latest_release && (
                        <p className="text-purple-400 text-xs mt-1">
                          Latest:{" "}
                          {new Date(artist.latest_release).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Thread Modal */}
      <AnimatePresence>
        {selectedThread && (
          <ThreadModal
            trackId={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        )}
      </AnimatePresence>

      {/* Artist Dashboard Panel */}
      <AnimatePresence>
        {selectedArtist && (
          <ArtistDashboardPanel
            artistId={selectedArtist}
            onClose={() => setSelectedArtist(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

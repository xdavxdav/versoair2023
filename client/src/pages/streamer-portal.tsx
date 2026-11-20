/**
 * Streamer Portal — Twitter-like music community
 * Comment threads, emoji reactions, artist follow & dashboard view
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import { TmuShell } from "@/components/music/TmuShell";
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
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { failureFromThrown } from "@/lib/submit-json";
import { useAudio } from "@/lib/audio-context";
import { usePaymentCountry } from "@/hooks/usePaymentCountry";
import { PaymentTopBanner } from "@/components/PaymentTopBanner";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payment-methods";
import { navigateBackSafely } from "@/lib/safe-navigation";
import { PaymentLogo } from "@/components/PaymentLogos";

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
// getFlag moved to @/utils/get-flag
import { getFlag } from "@/utils/get-flag";

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
      const res = await apiRequest(
        "POST",
        `/api/streaming/track/${track.id}/react`,
        { reactionType },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["track-reactions", track.id],
      });
    },
    onError: (error) => {
      const failure = failureFromThrown(error);
      toast({
        title:
          failure.status === 401
            ? "Sign in to react"
            : "Could not save your reaction",
        description: failure.status === 401 ? undefined : failure.message,
        variant: "destructive",
      });
    },
  });

  const reactions = reactionsData?.reactions || {};
  const userReactions = reactionsData?.userReactions || [];
  const totalReactions = Object.values(reactions).reduce(
    (sum: number, count: any) => sum + (count || 0),
    0,
  );
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22 }}
      className="tmu-glass tmu-interactive-card rounded-2xl p-4 sm:p-5"
    >
      {/* Track Header */}
      <div className="flex gap-4">
        {/* Cover Art */}
        <div
          className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group border border-purple-500/25"
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
              <Music className="w-8 h-8 text-white/70" />
            </div>
          )}
          <div className="absolute inset-0 bg-[#06020f]/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
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
            <div className="min-w-0">
              <h3 className="text-slate-50 font-semibold truncate">
                {track.title}
              </h3>
              <p className="text-purple-200 text-sm truncate">
                {track.artist_name}
              </p>
            </div>
            {track.artist_verified && (
              <Badge className="bg-purple-500/20 border border-purple-400/35 text-purple-200 text-xs flex-shrink-0">
                <Star className="w-3 h-3 mr-1 fill-fuchsia-400 text-fuchsia-400" />
                Verified
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 tabular-nums">
            <span className="flex items-center gap-1">
              <Headphones className="w-3 h-3 text-purple-300" />
              {formatStreams(track.streams || 0)}
            </span>
            {track.genre && <span>{track.genre}</span>}
            {track.release_date && (
              <span>{new Date(track.release_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Reaction Bar */}
      <div className="flex items-center gap-1.5 mt-4 flex-wrap">
        {REACTIONS.map((r) => {
          const count = reactions[r.type] || 0;
          const hasReacted = userReactions.includes(r.type);
          return (
            <motion.button
              key={r.type}
              whileTap={reducedMotion || !user ? undefined : { scale: 1.15 }}
              onClick={() => user && toggleReaction.mutate(r.type)}
              disabled={!user}
              className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-xs sm:text-sm transition-colors ${
                hasReacted
                  ? "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/50"
                  : "bg-[#180d34]/80 text-slate-200 hover:bg-purple-500/20 border border-purple-500/20"
              } ${!user ? "opacity-55 cursor-not-allowed" : ""}`}
            >
              <span>{r.emoji}</span>
              {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-500/15">
        <button
          onClick={() => onOpenThread(track.id)}
          className="flex items-center gap-2 text-slate-300 hover:text-fuchsia-300 transition-colors text-sm"
        >
          <MessageCircle className="w-4 h-4 text-purple-300" />
          <span className="tabular-nums">{track.comment_count || 0} Comments</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
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
  const {
    data: threadData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
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
      const res = await apiRequest("POST", "/api/streaming/comment", {
        trackId,
        content,
        parentId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track-thread", trackId] });
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      toast({ title: "Comment posted!" });
    },
    onError: (error) => {
      toast({
        title: "Failed to post comment",
        description: failureFromThrown(error).message,
        variant: "destructive",
      });
    },
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await apiRequest(
        "POST",
        `/api/streaming/track/${trackId}/react`,
        { reactionType },
      );
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
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Without this a failed load looked like "No comments yet".
  if (isError) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-white">We could not load this thread.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              onClick={() => refetch()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#06020f]/90 backdrop-blur-xl overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#0a0518]/90 backdrop-blur-xl py-4 -mx-4 px-4 z-10 border-b border-purple-500/20">
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-500/15 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-200" />
          </button>
          <h2 className="text-lg font-semibold text-white">Thread</h2>
        </div>

        {/* Track Card */}
        {track && (
          <div className="tmu-glass-elevated rounded-2xl p-5 mb-6">
            <div className="flex gap-4">
              <div
                className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group border border-purple-500/25"
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
                    <Music className="w-10 h-10 text-white/70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-[#06020f]/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-50">{track.title}</h3>
                <p className="text-fuchsia-300">{track.artist_name}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-300 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5 text-purple-300" />
                    {formatStreams(track.streams || 0)}
                  </span>
                  {track.genre && <span>{track.genre}</span>}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#180d34]/80 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-sm text-slate-200"
                  >
                    <span className="text-base">{r.emoji}</span>
                    {count > 0 && (
                      <span className="text-slate-200 tabular-nums">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* New Comment Input */}
        {user && (
          <div className="tmu-glass rounded-2xl p-4 mb-6">
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
                  className="bg-transparent border-none resize-none text-slate-100 placeholder-slate-400 focus:ring-0 p-0 min-h-[60px]"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={() =>
                      newComment.trim() &&
                      addComment.mutate({ content: newComment.trim() })
                    }
                    disabled={!newComment.trim() || addComment.isPending}
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
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
          <h3 className="text-slate-300 text-sm font-medium tabular-nums">
            {threadData?.totalComments || 0} Comments
          </h3>

          {comments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-35" />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment: any) => (
              <div
                key={comment.id}
                className="tmu-glass rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-400/25 flex items-center justify-center flex-shrink-0">
                    {comment.avatar_url ? (
                      <img
                        src={comment.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-purple-100 text-sm font-medium">
                        {(comment.username || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-50 font-medium text-sm">
                        {comment.display_name || comment.username}
                      </span>
                      <span className="text-slate-400 text-xs tabular-nums">
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm mt-1 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>

                    {/* Reply button */}
                    <button
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === comment.id ? null : comment.id,
                        )
                      }
                      className="text-slate-400 hover:text-fuchsia-300 text-xs mt-2 flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Reply
                      {comment.reply_count > 0 && (
                        <span className="text-slate-400">
                          ({comment.reply_count})
                        </span>
                      )}
                    </button>

                    {/* Reply input */}
                    {replyingTo === comment.id && user && (
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Input
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 bg-[#090418] border-purple-500/30 text-slate-100 placeholder:text-slate-500 text-sm"
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
                          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies?.length > 0 && (
                      <div className="mt-3 pl-4 border-l border-purple-500/25 space-y-3">
                        {comment.replies.map((reply: any) => (
                          <div
                            key={reply.id}
                            className="flex items-start gap-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-purple-100 text-xs">
                                {(reply.username || "U")[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-100 text-xs font-medium">
                                  {reply.display_name || reply.username}
                                </span>
                                <span className="text-slate-400 text-xs tabular-nums">
                                  {timeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-slate-300 text-xs mt-0.5 break-words whitespace-pre-wrap">
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
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = useQuery({
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
      const res = await apiRequest("POST", "/api/streaming/follow", {
        artistId,
      });
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
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#0a0518] border-l border-purple-500/25 z-[100] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-fuchsia-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Without this a failed load showed a blank profile with zero stats.
  if (isError) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#0a0518] border-l border-purple-500/25 z-[100] flex items-center justify-center p-6">
        <div className="max-w-xs text-center">
          <p className="text-white">We could not load this artist.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              onClick={() => refetch()}
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
            >
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-purple-400/30 bg-transparent text-white hover:bg-purple-500/15 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
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
      className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#0a0518] border-l border-purple-500/25 z-[100] overflow-y-auto shadow-2xl"
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0518] via-transparent to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-[#06020f]/70 hover:bg-purple-500/25 border border-purple-400/25 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Artist info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-purple-400/40 shadow-xl flex-shrink-0">
              {artist?.image_url ? (
                <img
                  src={artist.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                  <User className="w-10 h-10 text-white/70" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white truncate">
                  {artist?.name}
                </h2>
                {artist?.verified && (
                  <Star className="w-5 h-5 text-fuchsia-400 fill-fuchsia-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300 mt-1">
                <span>{getFlag(artist?.country_code)}</span>
                <span>{artist?.genre}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-[#120929]/80 border-y border-purple-500/20 tabular-nums">
        <div className="text-center">
          <div className="text-xl font-bold text-slate-50">
            {formatStreams(artist?.total_streams || 0)}
          </div>
          <div className="text-xs text-slate-400">Total Streams</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-fuchsia-300">
            {formatStreams(artist?.monthly_listeners || 0)}
          </div>
          <div className="text-xs text-slate-400">Monthly Listeners</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-cyan-300">
            {artist?.follower_count || 0}
          </div>
          <div className="text-xs text-slate-400">Followers</div>
        </div>
      </div>

      {/* Follow button */}
      <div className="px-4 py-3 border-b border-purple-500/20">
        <Button
          onClick={() => user && toggleFollow.mutate()}
          disabled={!user}
          className={`w-full ${
            dashboard?.isFollowing
              ? "border border-purple-400/35 bg-[#180d34] text-slate-200 hover:bg-purple-500/20"
              : "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
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
        <div className="p-4 border-b border-purple-500/20">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">About</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {artist.biography}
          </p>
        </div>
      )}

      {/* Top Tracks */}
      <div className="p-4 border-b border-purple-500/20">
        <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Top Tracks
        </h3>
        <div className="space-y-2">
          {topTracks.slice(0, 5).map((track: any, i: number) => (
            <div
              key={track.id}
              onClick={() => audio.playTrack(track)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-500/15 cursor-pointer group transition-colors"
            >
              <span className="w-5 text-center text-slate-400 text-sm tabular-nums">
                {i + 1}
              </span>
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-purple-500/20">
                {getCover(track) ? (
                  <img
                    src={getCover(track)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#180d34] flex items-center justify-center">
                    <Music className="w-4 h-4 text-purple-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{track.title}</p>
                <p className="text-slate-400 text-xs tabular-nums">
                  {formatStreams(track.streams || 0)} streams
                </p>
              </div>
              <Play className="w-4 h-4 text-slate-400 group-hover:text-fuchsia-300 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Releases */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
          <Disc3 className="w-4 h-4" />
          Recent Releases
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {recentReleases.slice(0, 4).map((release: any) => (
            <div
              key={release.id}
              className="tmu-glass tmu-interactive-card rounded-xl p-3 cursor-pointer"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-2">
                {release.cover_art ? (
                  <img
                    src={release.cover_art}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#180d34] flex items-center justify-center">
                    <Disc3 className="w-8 h-8 text-purple-300/60" />
                  </div>
                )}
              </div>
              <p className="text-slate-50 text-sm font-medium truncate">
                {release.title}
              </p>
              <p className="text-slate-400 text-xs">
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
  const {
    data: feedData,
    isLoading: feedLoading,
    isError: feedError,
    refetch: refetchFeed,
  } = useQuery({
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
    <TmuShell chrome="music">
      {/* Header */}
      <header className="sticky top-14 md:top-0 z-30 border-b border-purple-500/20 bg-[#0a0518]/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <TmuHubNav currentSurface="streamer-portal" className="mb-4" />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigateBackSafely(navigate, "/stream")}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#180d34]/80 hover:bg-purple-500/20 border border-purple-500/25 transition-colors text-slate-200 shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.35)] shrink-0">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="tmu-hero-title text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                  Streamer Portal
                </h1>
                <p className="text-xs text-slate-300 truncate">
                  Comment & react to music
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/stream">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 bg-[#180d34]/80 text-slate-200 hover:bg-purple-500/20 hover:text-white"
                >
                  <Music className="w-4 h-4 mr-1.5 text-fuchsia-300" />
                  Browse
                </Button>
              </Link>
              {user && (
                <Badge className="bg-purple-500/20 border border-purple-400/30 text-purple-100">
                  <Crown className="w-3 h-3 mr-1 text-amber-300" />
                  {user.username || user.email?.split("@")[0]}
                </Badge>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks, artists..."
              className="pl-10 bg-[#120929]/90 border-purple-500/25 text-slate-100 placeholder:text-slate-400 focus-visible:ring-fuchsia-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-purple-500/15 w-full justify-start rounded-none p-0 h-auto overflow-x-auto scrollbar-hide flex-nowrap">
              <TabsTrigger
                value="feed"
                className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent text-slate-300 hover:text-white data-[state=active]:border-fuchsia-400 data-[state=active]:text-white data-[state=active]:bg-transparent px-4 py-3 gap-2"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Feed</span>
              </TabsTrigger>
              <TabsTrigger
                value="artists"
                className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent text-slate-300 hover:text-white data-[state=active]:border-fuchsia-400 data-[state=active]:text-white data-[state=active]:bg-transparent px-4 py-3 gap-2"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Artists</span>
              </TabsTrigger>
              {user && (
                <TabsTrigger
                  value="following"
                  className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent text-slate-300 hover:text-white data-[state=active]:border-fuchsia-400 data-[state=active]:text-white data-[state=active]:bg-transparent px-4 py-3 gap-2"
                >
                  <Heart className="w-4 h-4 shrink-0" />
                  <span>Following</span>
                </TabsTrigger>
              )}
              {user && (
                <TabsTrigger
                  value="wallet"
                  className="shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent text-slate-300 hover:text-white data-[state=active]:border-fuchsia-400 data-[state=active]:text-white data-[state=active]:bg-transparent px-4 py-3 gap-2"
                >
                  <Crown className="w-4 h-4 shrink-0" />
                  <span>Wallet</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {activeTab === "feed" && (
          <div className="space-y-4">
            {feedLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="tmu-glass rounded-2xl p-4 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-purple-950/80 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-purple-950/80 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-purple-950/80 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : feedError ? (
              <div className="tmu-glass rounded-2xl text-center py-16 px-4">
                <Music className="w-14 h-14 mx-auto text-purple-400/40 mb-4" />
                <p className="text-slate-200">We could not load the feed.</p>
                <Button
                  onClick={() => refetchFeed()}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
                >
                  Try again
                </Button>
              </div>
            ) : tracks.length === 0 ? (
              <div className="tmu-glass rounded-2xl text-center py-16 px-4">
                <Music className="w-14 h-14 mx-auto text-purple-400/40 mb-4" />
                <p className="text-slate-300">No tracks found</p>
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
                className="tmu-glass tmu-interactive-card rounded-2xl p-4 text-center cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border border-purple-500/25">
                  {artist.image_url ? (
                    <img
                      src={artist.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                      <User className="w-8 h-8 text-white/70" />
                    </div>
                  )}
                </div>
                <h3 className="text-slate-50 font-semibold truncate text-sm">
                  {artist.name}
                </h3>
                <p className="text-slate-400 text-xs tabular-nums">
                  {formatStreams(artist.monthly_listeners || 0)} monthly
                </p>
                {artist.verified && (
                  <Badge className="mt-2 bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs">
                    <Star className="w-3 h-3 mr-1 fill-fuchsia-400 text-fuchsia-400" />
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
              <div className="tmu-glass rounded-2xl text-center py-16 px-4">
                <Users className="w-14 h-14 mx-auto text-purple-400/40 mb-4" />
                <p className="text-slate-300 mb-4">
                  You're not following any artists yet
                </p>
                <Button
                  onClick={() => setActiveTab("artists")}
                  className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
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
                    className="tmu-glass tmu-interactive-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-purple-500/25">
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-slate-50 font-semibold truncate">
                          {artist.name}
                        </h3>
                        {artist.verified && (
                          <Star className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-300 text-sm">
                        {artist.genre} • {artist.track_count || 0} tracks
                      </p>
                      {artist.latest_release && (
                        <p className="text-purple-300 text-xs mt-1 tabular-nums">
                          Latest:{" "}
                          {new Date(artist.latest_release).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-purple-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Wallet Tab Content ═══ */}
      {activeTab === "wallet" && user && <StreamerWalletSection />}

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
    </TmuShell>
  );
}

// ═══════════════════════════════════════════════════════════
// STREAMER WALLET SECTION — Payment methods + subscription
// ═══════════════════════════════════════════════════════════
function StreamerWalletSection() {
  const { format, sortedMethods, countryCode, currency, flag, currencyName } =
    usePaymentCountry();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <PaymentTopBanner compact subtitle="Your wallet & payment settings" />

      {/* Wallet Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="tmu-glass-elevated p-6 rounded-2xl bg-gradient-to-br from-purple-900/35 via-[#120929]/90 to-fuchsia-900/25"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-300" /> Streamer Wallet
          </h3>
          <span className="text-xs text-purple-200">
            {flag} {currency}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-50">—</p>
            <p className="text-xs text-slate-400">Balance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-300">—</p>
            <p className="text-xs text-slate-400">Earnings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-fuchsia-300">—</p>
            <p className="text-xs text-slate-400">Streams</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-300">—</p>
            <p className="text-xs text-slate-400">Tips</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Add Funds",
            icon: "💰",
            href: "/billing",
            color: "from-emerald-600/20 to-emerald-950/30 border-emerald-500/25",
          },
          {
            label: "My Music",
            icon: "🎵",
            href: "/music",
            color: "from-purple-600/20 to-purple-950/30 border-purple-500/25",
          },
          {
            label: "Music Vault",
            icon: "🎶",
            href: "/music/vault",
            color: "from-blue-600/20 to-blue-950/30 border-blue-500/25",
          },
          {
            label: "Reservations",
            icon: "🏠",
            href: "/reservations",
            color: "from-amber-600/20 to-amber-950/30 border-amber-500/25",
          },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`p-4 rounded-xl border bg-gradient-to-br ${action.color} text-center cursor-pointer`}
            >
              <span className="text-2xl block mb-1">{action.icon}</span>
              <p className="text-xs font-medium text-slate-100">{action.label}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-fuchsia-300" />
          Payment Methods for {countryCode}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedMethods.map((method) => (
            <div
              key={method.id}
              className={`tmu-glass p-3 rounded-xl transition-all ${
                method.available
                  ? "hover:border-purple-400/35"
                  : "opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <PaymentLogo methodId={method.id} size={22} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {method.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {method.fee} • {method.processingTime}
                  </p>
                </div>
                {method.available ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                )}
              </div>
              {method.comingSoon && (
                <p className="text-[11px] text-amber-300 mt-1 pl-8">
                  {method.estimatedLaunch}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Info */}
      <div className="tmu-glass p-4 rounded-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-50">Subscription</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Free tier • Upgrade for premium features
            </p>
          </div>
          <Link href="/pricing">
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-sm font-medium transition-colors">
              Upgrade
            </button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-[11px] text-slate-400 uppercase tracking-wider">
          See also:
        </span>
        <Link href="/account/billing">
          <span className="text-xs text-purple-300 hover:text-fuchsia-300 transition-colors cursor-pointer">
            💳 Billing
          </span>
        </Link>
        <span className="text-slate-600">·</span>
        <Link href="/music/dashboard">
          <span className="text-xs text-purple-300 hover:text-fuchsia-300 transition-colors cursor-pointer">
            🎵 Dashboard
          </span>
        </Link>
        <span className="text-slate-600">·</span>
        <Link href="/music/royalties">
          <span className="text-xs text-purple-300 hover:text-fuchsia-300 transition-colors cursor-pointer">
            💰 Royalties
          </span>
        </Link>
        <span className="text-slate-600">·</span>
        <Link href="/reservations">
          <span className="text-xs text-purple-300 hover:text-fuchsia-300 transition-colors cursor-pointer">
            🏠 Reservations
          </span>
        </Link>
      </div>
    </div>
  );
}

/**
 * Verso Air Streaming — Main Browse / Discover Page
 * Immersive dark theme with cinematic depth, glass morphism, and animated ambiance
 */
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAudio } from "@/lib/audio-context";
import { navigateBackSafely } from "@/lib/safe-navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import ThreadFeedWidget from "@/components/ThreadFeedWidget";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import { TmuShell } from "@/components/music/TmuShell";
import { FeaturedArtistCard } from "@/components/music/FeaturedArtistCard";
import {
  useStreamingTracks,
  useFeaturedTracks,
  useStreamingArtists,
  useStreamingSearch,
  useSubscriptionPlans,
  useTrackDetail,
  useAddComment,
  useTrackReactions,
  useToggleTrackReaction,
} from "@/hooks/use-streaming";
import {
  Search,
  Play,
  Pause,
  Music,
  Disc3,
  Star,
  TrendingUp,
  Clock,
  Filter,
  ChevronRight,
  Heart,
  Plus,
  Headphones,
  Sparkles,
  Globe,
  Zap,
  Crown,
  Users,
  BarChart3,
  ArrowRight,
  Mic2,
  Radio,
  Shuffle,
  ChevronDown,
  X,
  Volume2,
  Flame,
  Music2,
  Waves,
  Trophy,
  Gamepad2,
  Target,
  Gift,
  Medal,
  ChevronUp,
  MessageCircle,
  ArrowLeft,
  Hand,
  Send,
  Check,
} from "lucide-react";

// ====================================================================
// HELPERS
// ====================================================================
function formatStreams(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// getFlag moved to @/utils/get-flag
import { getFlag } from "@/utils/get-flag";

/** Resolve cover art URL — prefers cover_art URL, then pochette endpoint, then album_cover */
function getCover(t: any): string | null {
  if (t.cover_art) return t.cover_art;
  if (t.has_pochette) return `/api/streaming/tracks/${t.id}/pochette`;
  if (t.album_cover) return t.album_cover;
  return null;
}

// Genre color mapping
const GENRE_COLORS: Record<string, string> = {
  Afrobeats: "from-emerald-600 to-purple-800",
  Afropop: "from-pink-600 to-purple-800",
  Rumba: "from-blue-600 to-indigo-800",
  Soukous: "from-cyan-600 to-violet-800",
  "Coupé-Décalé": "from-orange-600 to-fuchsia-800",
  Reggae: "from-emerald-700 to-indigo-900",
  Electronic: "from-violet-600 to-fuchsia-800",
  "World Music": "from-amber-600 to-purple-800",
  "Pop/R&B": "from-fuchsia-600 to-purple-800",
  "Afro Trap": "from-rose-600 to-purple-900",
  Zouglou: "from-teal-600 to-purple-800",
  Mbalax: "from-indigo-600 to-violet-800",
  "Bongo Flava": "from-amber-600 to-fuchsia-800",
  Gospel: "from-purple-600 to-indigo-800",
  Mandingue: "from-amber-600 to-emerald-800",
  Zoblazo: "from-rose-600 to-fuchsia-800",
  "Afro-Pop": "from-sky-600 to-indigo-800",
  "Afro-Blues": "from-indigo-700 to-slate-900",
  "Afro-Manding": "from-amber-700 to-purple-900",
};

function getGenreGradient(genre: string): string {
  return GENRE_COLORS[genre] || "from-purple-700 to-fuchsia-900";
}

// ====================================================================
// SECTION DIVIDER -- Glowing accent line
// ====================================================================
function SectionGlow() {
  return (
    <div className="max-w-[95vw] mx-auto px-4 my-2">
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />
    </div>
  );
}

const TRACK_REACTIONS = [
  { key: "fire", label: "Fire" },
  { key: "heart", label: "Love" },
  { key: "clap", label: "Clap" },
  { key: "mindblown", label: "Wow" },
] as const;

function ReactionIcon({ reactionKey }: { reactionKey: string }) {
  const className = "h-3.5 w-3.5";
  if (reactionKey === "fire") return <Flame className={className} />;
  if (reactionKey === "heart") return <Heart className={className} />;
  if (reactionKey === "clap") return <Hand className={className} />;
  return <Sparkles className={className} />;
}

function TrackReactionStrip({
  track,
  compact = false,
}: {
  track: any;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const { data } = useTrackReactions(track?.id);
  const toggleReaction = useToggleTrackReaction();

  const reactions = data?.reactions || {};
  const userReactions = data?.userReactions || [];
  const totalReactions = Object.values(reactions).reduce(
    (sum: number, value: any) => sum + (Number(value) || 0),
    0,
  );

  return (
    <div className={`flex items-center gap-1 ${compact ? "mt-2" : "mt-3"}`}>
      {TRACK_REACTIONS.map((reaction) => {
        const count = Number(reactions[reaction.key] || 0);
        const active = userReactions.includes(reaction.key);

        return (
          <button
            key={reaction.key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleReaction.mutate(
                { trackId: Number(track.id), reactionType: reaction.key },
                {
                  onError: () =>
                    toast({
                      title: "Connexion requise",
                      description: "Connectez-vous pour réagir à ce titre.",
                      variant: "destructive",
                    }),
                },
              );
            }}
            aria-label={`${active ? "Remove" : "Add"} ${reaction.label} reaction${count ? `, ${count} reactions` : ""}`}
            title={`${reaction.label}${count ? ` · ${count}` : ""}`}
            className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-all ${
              active
                ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200"
                : "border-purple-500/20 bg-[#180d34]/75 text-slate-300 hover:border-purple-400/40 hover:text-white"
            }`}
          >
            <ReactionIcon reactionKey={reaction.key} />
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}

      {totalReactions > 0 && (
        <span className="ml-0.5 text-[11px] text-slate-400 tabular-nums">
          {totalReactions} réactions
        </span>
      )}
    </div>
  );
}

function timeAgo(timestamp: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000),
  );
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function NowPlayingComments({
  track,
  user,
  isPlaying,
}: {
  track: any | null;
  user: any | null;
  isPlaying: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useTrackDetail(track?.id);
  const commentMutation = useAddComment();
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setDraft("");
    setShowAll(false);
  }, [track?.id]);

  const comments = data?.comments || [];
  const visibleComments = showAll ? comments : comments.slice(0, 5);

  const handleComment = () => {
    const content = draft.trim();
    if (!track?.id || !content) return;
    if (!user) {
      window.location.href = `/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    commentMutation.mutate(
      { trackId: Number(track.id), content },
      {
        onSuccess: () => setDraft(""),
        onError: () =>
          toast({
            title: "Impossible de publier",
            description: "Connectez-vous pour participer à la discussion.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <section className="max-w-[95vw] mx-auto px-4 mb-10 relative z-10">
      <div className="tmu-glass-elevated rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3 border-b border-purple-500/15 pb-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#180d34] border border-purple-500/25">
            {track?.cover_art || track?.album_cover || track?.pochette ? (
              <img
                src={track.cover_art || track.album_cover || track.pochette}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 text-fuchsia-300">
                <Music className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <MessageCircle className="h-4 w-4 text-fuchsia-300" />
              <h2 className="text-base font-bold text-slate-50 sm:text-lg">
                {track?.artist_name || "Discussion du titre"}
              </h2>
              {track && !isPlaying && (
                <span className="rounded-full bg-purple-500/20 border border-purple-400/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
                  Dernière écoute
                </span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-slate-300">
              {track?.title || "Lancez un titre pour ouvrir sa discussion"}
            </p>
          </div>
          {track && (
            <Link
              href={`/track/${track.id}`}
              aria-label={`Open the discussion for ${track.title}`}
              className="hidden rounded-full border border-purple-400/30 bg-[#180d34]/75 px-3 py-1.5 text-xs font-semibold text-purple-200 transition-colors hover:border-fuchsia-400 hover:text-white sm:inline-flex"
            >
              Ouvrir le titre
            </Link>
          )}
        </div>

        {!track ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Les commentaires du titre en cours apparaîtront ici.
          </p>
        ) : (
          <>
            <div className="flex gap-2 border-b border-purple-500/15 py-4">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleComment();
                  }
                }}
                placeholder={
                  user
                    ? "Ajouter un commentaire..."
                    : "Connectez-vous pour commenter"
                }
                maxLength={1000}
                className="min-w-0 flex-1 rounded-xl border border-purple-500/25 bg-[#090418] px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-fuchsia-400"
              />
              <button
                type="button"
                onClick={handleComment}
                disabled={!draft.trim() || commentMutation.isPending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Publier</span>
              </button>
            </div>

            {isLoading ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Chargement des commentaires...
              </p>
            ) : visibleComments.length > 0 ? (
              <div className="divide-y divide-purple-500/15">
                {visibleComments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/25 border border-purple-400/30 text-xs font-bold text-purple-100">
                      {(comment.username || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">
                          {comment.username || "Utilisateur"}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-300">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-7 text-center text-sm text-slate-400">
                Soyez le premier à commenter ce titre.
              </p>
            )}

            {comments.length > 5 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-2 text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200"
              >
                Voir les {comments.length - 5} autres commentaires
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================
const LEVEL_NAMES = [
  "Newbie",
  "Explorer",
  "Fan",
  "Superfan",
  "Devotee",
  "Champion",
  "Legend",
  "Icon",
  "Mythic",
  "Transcendent",
];
const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000,
];

export default function StreamPage() {
  const audio = useAudio();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const fromPage =
    new URLSearchParams(window.location.search).get("from") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [sortBy, setSortBy] = useState("discover");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showMyStats, setShowMyStats] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>(
    {},
  );

  // Listener stats
  const { data: listenerStats } = useQuery({
    queryKey: ["listener-stats", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/listener/stats", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const stats = listenerStats?.data || listenerStats?.stats;
  const streamingTier = stats?.streamingTier || "guest";
  const PAID_STREAMER_TIERS = [
    "supporter",
    "champion",
    "patron",
    "premium",
    "pro",
  ];
  // GOD TIER: CEO, superadmin, admin_001 — full access, never charged
  const isGodTier =
    user?.username === "admin_001" ||
    user?.username === "superadmin" ||
    user?.username === "CEO" ||
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.role === "ceo";
  const canAccessArcade =
    isGodTier || PAID_STREAMER_TIERS.includes(streamingTier);
  const currentLevel = stats?.level || 1;
  const levelName =
    LEVEL_NAMES[Math.min(currentLevel - 1, LEVEL_NAMES.length - 1)];
  const currentPoints = stats?.totalPoints || 0;
  const nextLevelPoints =
    stats?.nextLevelPoints || LEVEL_THRESHOLDS[currentLevel] || 100;

  const { data: featuredData } = useFeaturedTracks();
  const { data: tracksData, isLoading } = useStreamingTracks({
    genre: activeGenre || undefined,
    mood: activeMood || undefined,
    search: searchQuery || undefined,
    sort: sortBy === "popular" ? undefined : sortBy,
    page,
    limit: 24,
  });
  const { data: artistsData } = useStreamingArtists({
    limit: 12,
    sort: "monthly",
  });
  const { data: searchResults } = useStreamingSearch(searchQuery);
  const { data: plansData } = useSubscriptionPlans();

  const trending = featuredData?.trending || [];
  const newReleases = featuredData?.newReleases || [];
  const tracks = tracksData?.tracks || [];
  const genres = tracksData?.genres || [];
  const moods = tracksData?.moods || [];
  const artists = artistsData?.artists || [];
  const totalTracks = tracksData?.total || 0;

  const featuredRef = useRef<HTMLDivElement>(null);

  // ── Back button handler ──
  const handleBack = () => {
    navigateBackSafely(navigate, "/music");
  };
  const reducedMotion = useReducedMotion();

  return (
      <TmuShell chrome="music">
        <div className="relative overflow-x-hidden pb-24">
          {/* ========================================= */}
          {/* FLOATING MY STATS PANEL (desktop bottom-right; on mobile triggered from hero to prevent FAB collision) */}
          {/* ========================================= */}
          {user && (
            <div className="fixed bottom-24 right-4 z-50">
              <AnimatePresence>
                {showMyStats && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="mb-3"
                  >
                    <Card className="tmu-glass-modal text-slate-50 w-72">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                              <Headphones className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-50 font-semibold truncate">
                                {user.username || user.email?.split("@")[0]}
                              </p>
                              <Badge className="bg-purple-500/25 border border-purple-400/30 text-purple-200 text-xs">
                                <Crown className="w-3 h-3 mr-1 text-amber-300" />
                                {levelName} · Lv.{currentLevel}
                              </Badge>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowMyStats(false)}
                            aria-label="Fermer"
                            className="md:hidden p-1.5 rounded-lg text-slate-300 hover:bg-purple-500/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1 tabular-nums">
                            <span className="text-slate-300">XP Progress</span>
                            <span className="text-purple-300">
                              {currentPoints} / {nextLevelPoints}
                            </span>
                          </div>
                          <div className="h-2 bg-[#090418] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (currentPoints / nextLevelPoints) * 100)}%`,
                              }}
                              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4 tabular-nums">
                          <div className="text-center p-2 bg-[#090418]/80 border border-purple-500/15 rounded-xl">
                            <div className="text-amber-300 font-bold flex items-center justify-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              {stats?.currentStreak || 0}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Streak
                            </div>
                          </div>
                          <div className="text-center p-2 bg-[#090418]/80 border border-purple-500/15 rounded-xl">
                            <div className="text-emerald-300 font-bold">
                              #{stats?.rank || "—"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Rank
                            </div>
                          </div>
                          <div className="text-center p-2 bg-[#090418]/80 border border-purple-500/15 rounded-xl">
                            <div className="text-fuchsia-300 font-bold">
                              {stats?.correctPredictions || 0}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Wins
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => navigate("/streamer-portal")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-fuchsia-500/20 border border-fuchsia-400/25 text-fuchsia-200 rounded-lg text-xs font-medium hover:bg-fuchsia-500/30 transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Community
                          </button>
                          <button
                            onClick={() => navigate("/arena?from=stream")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500/20 border border-amber-400/25 text-amber-200 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-all"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            Arena
                          </button>
                        </div>
                        <div className="flex gap-2 mb-2">
                          {canAccessArcade ? (
                            <button
                              onClick={() => navigate("/arcade?from=stream")}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-500/20 border border-purple-400/25 text-purple-200 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-all"
                            >
                              <Gamepad2 className="w-3.5 h-3.5" />
                              Arcade
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate("/arcade?from=stream")}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#180d34] border border-purple-500/20 text-slate-300 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-all"
                              title="Supporter+ requis"
                            >
                              <Gamepad2 className="w-3.5 h-3.5" />
                              <Crown className="w-3 h-3 text-purple-300" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => navigate("/artist-portal?from=stream")}
                          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            fromPage === "artist-portal"
                              ? "bg-purple-500/35 text-white border-2 border-fuchsia-400/60"
                              : "bg-purple-500/20 border border-purple-400/25 text-purple-200 hover:bg-purple-500/30"
                          }`}
                        >
                          <Mic2 className="w-3.5 h-3.5" />
                          Portail Artiste
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => setShowMyStats(!showMyStats)}
                whileHover={reducedMotion ? undefined : { scale: 1.05 }}
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                aria-label="Mes statistiques d'écoute"
                className="hidden md:flex w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 items-center justify-center shadow-lg shadow-purple-500/35 border border-purple-400/30 relative"
              >
                {showMyStats ? (
                  <ChevronDown className="w-6 h-6 text-white" />
                ) : (
                  <>
                    <Headphones className="w-6 h-6 text-white" />
                    {currentPoints > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                        {currentLevel}
                      </span>
                    )}
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* ========================================= */}
          {/* HERO SECTION */}
          {/* ========================================= */}
          <section className="relative overflow-hidden">
            <div className="relative max-w-[95vw] mx-auto px-4 pt-5 pb-8 z-10">
              <TmuHubNav currentSurface="stream" className="mb-5" />

              {/* Back Button + mobile stats trigger */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <button
                  onClick={handleBack}
                  className="px-3 py-2 rounded-xl bg-[#180d34]/80 hover:bg-purple-500/20 border border-purple-500/25 transition-all duration-200 text-slate-100 flex items-center gap-2 text-sm"
                  title="Go back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>

                {user && (
                  <button
                    onClick={() => setShowMyStats(!showMyStats)}
                    className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/25 border border-purple-400/35 text-xs font-semibold text-purple-100"
                  >
                    <Headphones className="w-3.5 h-3.5 text-fuchsia-300" />
                    <span>{levelName} · Niv.{currentLevel}</span>
                  </button>
                )}
              </div>

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/35">
                      <Radio className="w-6 h-6 text-white" />
                    </div>
                    {!reducedMotion && (
                      <motion.div
                        className="absolute -inset-1.5 rounded-2xl border border-fuchsia-400/30"
                        animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0, 0.55] }}
                        transition={{ duration: 2.8, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                      <span className="tmu-hero-title">
                        Verso Air Stream
                      </span>
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-fuchsia-300" />
                      La musique africaine, sans limites
                    </p>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-2 flex-wrap">
                  <Link href="/library">
                    <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-slate-200 hover:text-white bg-[#180d34]/75 backdrop-blur border border-purple-500/25 rounded-xl hover:border-purple-400/45 transition-all">
                      <Music2 className="w-3.5 h-3.5 text-purple-300" />
                      Bibliothèque
                    </button>
                  </Link>
                  <Link href="/analytics">
                    <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-purple-500/15 text-purple-200 border border-purple-400/25 rounded-xl hover:bg-purple-500/25 backdrop-blur transition-all">
                      <BarChart3 className="w-3.5 h-3.5 text-fuchsia-300" />
                      Analytics
                    </button>
                  </Link>
                </div>
              </div>

              {/* ═══ MY STREAMING PLAN BANNER (logged-in users) ═══ */}
              {user &&
                (() => {
                  const plans = plansData?.plans || [];
                  const currentPlan =
                    plans.find((p: any) => p.tier === streamingTier) ||
                    plans[0];
                  if (!currentPlan) return null;

                  const tierColors: Record<
                    string,
                    {
                      bg: string;
                      border: string;
                      text: string;
                      badge: string;
                      glow: string;
                    }
                  > = {
                    guest: {
                      bg: "from-gray-800/60 to-gray-900/60",
                      border: "border-gray-600/30",
                      text: "text-gray-300",
                      badge: "bg-gray-700 text-gray-300",
                      glow: "",
                    },
                    supporter: {
                      bg: "from-blue-900/40 to-indigo-900/40",
                      border: "border-blue-500/30",
                      text: "text-blue-300",
                      badge: "bg-blue-600/30 text-blue-300",
                      glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]",
                    },
                    champion: {
                      bg: "from-amber-900/40 to-orange-900/40",
                      border: "border-amber-500/30",
                      text: "text-amber-300",
                      badge: "bg-amber-600/30 text-amber-300",
                      glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
                    },
                    patron: {
                      bg: "from-purple-900/40 to-fuchsia-900/40",
                      border: "border-purple-500/30",
                      text: "text-purple-300",
                      badge: "bg-purple-600/30 text-purple-300",
                      glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
                    },
                  };
                  const tc = tierColors[streamingTier] || tierColors.guest;

                  const voteWeight =
                    currentPlan.contestVoteLabel ||
                    `${Math.round((currentPlan.contestVoteWeight || 0.1) * 100)}% of 1 vote point`;
                  const streamsLabel =
                    currentPlan.weeklyStreams === -1
                      ? "∞"
                      : currentPlan.weeklyStreams?.toLocaleString();

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`mb-8 rounded-2xl bg-gradient-to-r ${tc.bg} backdrop-blur-xl border ${tc.border} ${tc.glow} p-4 sm:p-5`}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${tc.badge}`}>
                            {streamingTier === "guest" ? (
                              <Headphones className="w-4 h-4" />
                            ) : (
                              <Crown className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${tc.text}`}>
                              {isGodTier ? "God Tier ∞" : currentPlan.name}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                              Mon abonnement
                            </p>
                          </div>
                        </div>
                        {streamingTier === "guest" && !isGodTier && (
                          <button
                            onClick={() => {
                              const el =
                                document.getElementById("subscription-plans");
                              el?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/25 to-fuchsia-500/25 text-purple-100 text-xs font-semibold border border-purple-400/35 hover:from-purple-500/35 hover:to-fuchsia-500/35 transition-all"
                          >
                            <Zap className="w-3 h-3" />
                            Upgrade
                          </button>
                        )}
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 tabular-nums">
                        {/* Weekly streams */}
                        <div className="bg-[#090418]/75 rounded-xl px-3 py-2.5 border border-purple-500/20">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Streams / sem.
                          </p>
                          <p className="text-lg font-bold text-slate-50">
                            {isGodTier ? "∞" : streamsLabel}
                          </p>
                        </div>

                        {/* Audio quality */}
                        <div className="bg-[#090418]/75 rounded-xl px-3 py-2.5 border border-purple-500/20">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Qualité audio
                          </p>
                          <p
                            className={`text-sm font-bold ${currentPlan.audioQuality === "FLAC" ? "text-amber-300" : "text-slate-50"}`}
                          >
                            {isGodTier ? "FLAC" : currentPlan.audioQuality}
                          </p>
                        </div>

                        {/* Downloads */}
                        <div className="bg-[#090418]/75 rounded-xl px-3 py-2.5 border border-purple-500/20">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Downloads / mois
                          </p>
                          <p className="text-sm font-bold text-slate-50">
                            {isGodTier
                              ? "∞"
                              : currentPlan.downloadsPerMonth === 0
                                ? "—"
                                : currentPlan.downloadsPerMonth === -1
                                  ? "∞"
                                  : currentPlan.downloadsPerMonth}
                          </p>
                        </div>

                        {/* Ads */}
                        <div className="bg-[#090418]/75 rounded-xl px-3 py-2.5 border border-purple-500/20">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Publicités
                          </p>
                          <p
                            className={`text-sm font-bold ${!currentPlan.ads || isGodTier ? "text-emerald-300" : "text-amber-300"}`}
                          >
                            {!currentPlan.ads || isGodTier ? "Aucune ✓" : "Oui"}
                          </p>
                        </div>

                        {/* Arcade */}
                        <div className="bg-[#090418]/75 rounded-xl px-3 py-2.5 border border-purple-500/20">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Arcade PvP
                          </p>
                          <p
                            className={`text-sm font-bold flex items-center gap-1 ${canAccessArcade ? "text-purple-300" : "text-slate-400"}`}
                          >
                            <Gamepad2 className="w-3.5 h-3.5" />
                            {canAccessArcade ? "Accès ✓" : "Verrouillé"}
                          </p>
                        </div>

                        {/* Vote weight */}
                        <div className="bg-[#090418]/75 rounded-xl px-3 py-2.5 border border-purple-500/20">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Vote Arena
                          </p>
                          <p
                            className={`text-sm font-bold flex items-center gap-1 ${voteWeight !== "×1" ? "text-amber-300" : "text-slate-50"}`}
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            {isGodTier ? "100%" : voteWeight}
                          </p>
                        </div>
                      </div>

                      {/* XP bar (if stats available) */}
                      {stats && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-fuchsia-300" />
                            <span className="text-[11px] font-semibold text-slate-300">
                              {levelName} · Niv.{currentLevel}
                            </span>
                          </div>
                          <div className="flex-1 h-1.5 bg-[#090418] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min((currentPoints / nextLevelPoints) * 100, 100)}%`,
                              }}
                              transition={{ delay: 0.5, duration: 0.8 }}
                              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                            />
                          </div>
                          <span className="text-[11px] text-slate-300 tabular-nums">
                            {currentPoints}/{nextLevelPoints} XP
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

              {/* Animated equalizer decoration */}
              <div className="flex items-end justify-center gap-[3px] h-8 mb-6 opacity-50">
                {Array.from({
                  length:
                    typeof window !== "undefined" && window.innerWidth < 768
                      ? 12
                      : 32,
                }).map((_, i) => (
                  <motion.div
                    key={`eq-${i}`}
                    className="w-[3px] rounded-full bg-gradient-to-t from-purple-600 via-fuchsia-400 to-cyan-300"
                    animate={
                      reducedMotion
                        ? { height: 10 + ((i * 7) % 16) }
                        : {
                            height: [
                              4 + ((i * 3) % 8),
                              12 + ((i * 5) % 20),
                              4 + ((i * 3) % 8),
                            ],
                          }
                    }
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : {
                            duration: 1.1 + (i % 5) * 0.15,
                            repeat: Infinity,
                            delay: i * 0.04,
                            ease: "easeInOut",
                          }
                    }
                  />
                ))}
              </div>

              {/* Search Bar -- Glass effect */}
              <div className="relative max-w-2xl mx-auto mb-10">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/25 via-fuchsia-500/20 to-cyan-400/20 rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-500" />
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300 group-focus-within:text-fuchsia-300 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher artistes, titres, albums..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-[#120929]/90 backdrop-blur-xl border border-purple-500/25 rounded-2xl text-slate-50 placeholder-slate-400 focus:outline-none focus:border-fuchsia-400/55 focus:bg-[#180d34] transition-all text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Results Dropdown -- Glass panel */}
                <AnimatePresence>
                  {searchQuery.length >= 2 && searchResults && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      className="tmu-glass-modal absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-[100] max-h-[70vh] overflow-y-auto"
                    >
                      {searchResults.artists?.length > 0 && (
                        <div className="p-4">
                          <p className="text-[11px] text-fuchsia-300 uppercase tracking-[0.2em] font-semibold mb-3">
                            Artistes
                          </p>
                          {searchResults.artists.map((a: any) => (
                            <Link key={a.id} href={`/artist-catalogue/${a.id}`}>
                              <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-500/15 cursor-pointer transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center overflow-hidden ring-1 ring-purple-400/25">
                                  {a.image_url ? (
                                    <img
                                      src={a.image_url}
                                      alt={a.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Mic2 className="w-4 h-4 text-white" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-slate-50 text-sm font-medium">
                                    {a.name}
                                  </p>
                                  <p className="text-slate-400 text-xs tabular-nums">
                                    {a.genre} •{" "}
                                    {formatStreams(a.monthly_listeners || 0)}{" "}
                                    auditeurs/mois
                                  </p>
                                </div>
                                {a.verified && (
                                  <Star className="w-3.5 h-3.5 text-fuchsia-400 ml-auto fill-fuchsia-400" />
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.tracks?.length > 0 && (
                        <div className="p-4 border-t border-purple-500/20">
                          <p className="text-[11px] text-fuchsia-300 uppercase tracking-[0.2em] font-semibold mb-3">
                            Titres
                          </p>
                          {searchResults.tracks.map((t: any) => (
                            <div
                              key={t.id}
                              onClick={() => {
                                audio.playTrack(t);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-500/15 cursor-pointer transition-colors"
                            >
                              <div className="w-9 h-9 rounded-lg bg-[#180d34] flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-purple-400/20">
                                {getCover(t) ? (
                                  <img
                                    src={getCover(t)!}
                                    alt={t.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Music className="w-3.5 h-3.5 text-purple-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p translate="no" className="notranslate text-slate-50 text-sm truncate">
                                  {t.title}
                                </p>
                                <p translate="no" className="notranslate text-slate-400 text-xs truncate">
                                  {t.artist_name}
                                </p>
                              </div>
                              <span className="text-slate-400 text-xs ml-auto font-mono tabular-nums">
                                {formatDuration(t.duration)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.albums?.length > 0 && (
                        <div className="p-4 border-t border-purple-500/20">
                          <p className="text-[11px] text-fuchsia-300 uppercase tracking-[0.2em] font-semibold mb-3">
                            Albums
                          </p>
                          {searchResults.albums.map((a: any) => (
                            <Link key={a.id} href={`/track/${a.id}`}>
                              <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-500/15 cursor-pointer transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-[#180d34] flex items-center justify-center ring-1 ring-purple-400/20">
                                  <Disc3 className="w-4 h-4 text-purple-300" />
                                </div>
                                <div>
                                  <p translate="no" className="notranslate text-slate-50 text-sm">
                                    {a.title}
                                  </p>
                                  <p className="text-slate-400 text-xs">
                                    <span translate="no" className="notranslate">
                                      {a.artist_name}
                                    </span>{" "}
                                    • {a.album_type}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.tracks?.length === 0 &&
                        searchResults.artists?.length === 0 && (
                          <div className="p-8 text-center">
                            <Search className="w-8 h-8 text-purple-400/40 mx-auto mb-2" />
                            <p className="text-slate-300 text-sm">
                              Aucun résultat pour «{searchQuery}»
                            </p>
                          </div>
                        )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ========================================= */}
              {/* FEATURED FACE OF TMU (NOOKA) */}
              {/* ========================================= */}
              <FeaturedArtistCard className="mb-8" />

              {/* ========================================= */}
              {/* TRENDING / FEATURED CAROUSEL */}
              {/* ========================================= */}
              {trending.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-fuchsia-300" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-50">
                      Tendances
                    </h2>
                    <div className="flex-1" />
                    <button className="text-fuchsia-300 text-sm hover:text-fuchsia-200 flex items-center gap-1 transition-colors">
                      Voir tout <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div
                    ref={featuredRef}
                    className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide"
                  >
                    {trending.slice(0, 8).map((track: any, i: number) => (
                      <motion.div
                        key={track.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reducedMotion ? { duration: 0 } : { delay: i * 0.05 }}
                        className="flex-shrink-0 w-48 group cursor-pointer"
                        onClick={() => audio.playTrack(track)}
                      >
                        <div className="relative w-48 h-48 rounded-2xl overflow-hidden mb-3 shadow-xl shadow-black/50 ring-1 ring-purple-500/20 group-hover:ring-fuchsia-400/50 transition-all duration-300">
                          {getCover(track) ? (
                            <img
                              src={getCover(track)!}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${getGenreGradient(track.genre)} flex items-center justify-center`}
                            >
                              <Music className="w-14 h-14 text-white/30" />
                            </div>
                          )}
                          {/* Dark gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#06020f]/80 via-black/15 to-transparent" />
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-[#06020f]/45 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                            <motion.div
                              whileHover={reducedMotion ? undefined : { scale: 1.08 }}
                              whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                              className="w-14 h-14 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-xl shadow-purple-500/40"
                            >
                              <Play className="w-6 h-6 text-white ml-0.5" />
                            </motion.div>
                          </div>
                          {/* Rank badge */}
                          <div className="absolute top-2.5 left-2.5">
                            <div className="px-2.5 py-1 bg-[#06020f]/75 backdrop-blur-md rounded-lg text-fuchsia-300 text-xs font-bold border border-purple-400/30 tabular-nums">
                              #{i + 1}
                            </div>
                          </div>
                          {/* Bottom info overlay */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-200 tabular-nums">
                              <Headphones className="w-3 h-3 text-purple-300" />
                              {formatStreams(track.streams || 0)} streams
                            </div>
                          </div>
                        </div>
                        <p translate="no" className="notranslate text-slate-50 text-sm font-semibold truncate px-0.5">
                          {track.title}
                        </p>
                        <p translate="no" className="notranslate text-slate-300 text-xs truncate px-0.5">
                          {track.artist_name}
                        </p>
                        <div className="px-0.5">
                          <TrackReactionStrip track={track} compact />
                        </div>
                        <Link
                          href={`/track/${track.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-[#180d34]/70 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-fuchsia-400/45 hover:text-white"
                        >
                          <MessageCircle className="w-3 h-3 text-purple-300" />
                          Discuss
                          {track.comment_count > 0 && (
                            <span className="tabular-nums">{track.comment_count}</span>
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <SectionGlow />

          <NowPlayingComments
            track={audio.currentTrack}
            user={user}
            isPlaying={audio.isPlaying}
          />

          {/* ========================================= */}
          {/* ARTISTS SPOTLIGHT */}
          {/* ========================================= */}
          {artists.length > 0 && (
            <section className="max-w-[95vw] mx-auto px-4 mb-10 py-6 relative z-10">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-fuchsia-300" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-50">
                  Artistes{" "}
                  <span translate="no" className="notranslate">
                    Verso Air
                  </span>
                </h2>
                <div className="flex-1" />
                <Link href="/artistes">
                  <button className="text-fuchsia-300 text-sm hover:text-fuchsia-200 flex items-center gap-1 transition-colors">
                    Catalogue <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
                {artists.slice(0, 10).map((artist: any, i: number) => (
                  <Link key={artist.id} href={`/artist-catalogue/${artist.id}`}>
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={reducedMotion ? { duration: 0 } : { delay: i * 0.04 }}
                      className="flex-shrink-0 w-32 text-center group cursor-pointer"
                    >
                      <div className="relative w-28 h-28 mx-auto mb-3">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-purple-500/30 via-fuchsia-500/20 to-cyan-500/15 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                        <div className="relative w-28 h-28 rounded-full overflow-hidden bg-[#180d34] ring-2 ring-purple-500/25 group-hover:ring-fuchsia-400/60 transition-all duration-300 shadow-lg shadow-black/40">
                          {artist.image_url ? (
                            <img
                              src={artist.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${getGenreGradient(artist.genre)} flex items-center justify-center`}
                            >
                              <span translate="no" className="notranslate text-2xl font-bold text-white uppercase">
                                {artist.name?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        {artist.verified && (
                          <div className="absolute -bottom-0.5 right-1 w-6 h-6 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center ring-2 ring-[#06020f] shadow-lg shadow-purple-500/35">
                            <Star className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <p translate="no" className="notranslate text-slate-50 text-xs font-semibold truncate">
                        {artist.name}
                      </p>
                      <p className="text-slate-300 text-[11px] mt-0.5 truncate">
                        {artist.genre}
                      </p>
                      <p className="text-slate-400 text-[11px] tabular-nums">
                        {getFlag(artist.country_code)}{" "}
                        {formatStreams(artist.monthly_listeners || 0)}/mo
                      </p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <SectionGlow />

          {/* ========================================= */}
          {/* NEW RELEASES */}
          {/* ========================================= */}
          {newReleases.length > 0 && (
            <section className="max-w-[95vw] mx-auto px-4 mb-10 py-6 relative z-10">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-cyan-300" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-50">Nouveautés</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {newReleases.slice(0, 10).map((track: any, i: number) => (
                  <motion.div
                    key={track.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { delay: i * 0.04 }}
                    onClick={() => audio.playTrack(track)}
                    className="tmu-glass tmu-interactive-card group cursor-pointer rounded-2xl p-3"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#180d34] mb-3 ring-1 ring-purple-500/20 shadow-lg shadow-black/40">
                      {getCover(track) ? (
                        <img
                          src={getCover(track)!}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${getGenreGradient(track.genre)} flex items-center justify-center`}
                        >
                          <Music className="w-8 h-8 text-white/35" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#06020f]/75 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-2.5">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40 ml-auto">
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p translate="no" className="notranslate text-slate-50 text-sm font-semibold truncate">
                      {track.title}
                    </p>
                    <p translate="no" className="notranslate text-slate-300 text-xs truncate mt-0.5">
                      {track.artist_name}
                    </p>
                    <TrackReactionStrip track={track} compact />
                    <Link
                      href={`/track/${track.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-[#180d34]/70 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-fuchsia-400/45 hover:text-white"
                    >
                      <MessageCircle className="w-3 h-3 text-purple-300" />
                      Discuss
                      {track.comment_count > 0 && (
                        <span className="tabular-nums">{track.comment_count}</span>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <SectionGlow />

          {/* ========================================= */}
          {/* MUSICAL UNIVERSE COMMUNITY THREADS */}
          {/* Real live thread feed (reuses the social-blog engine) sits here */}
          {/* instead of any static/mock content. */}
          {/* ========================================= */}
          <section className="max-w-[95vw] mx-auto px-4 mb-8 relative z-10">
            <ThreadFeedWidget
              postType="musical_universe"
              title="MU × Community talks"
              composerPlaceholder="Talk music, drops, collabs…"
              variant="dark"
            />
          </section>

          {/* ========================================= */}
          {/* FILTERS & GENRE PILLS */}
          {/* ========================================= */}
          <section className="max-w-[95vw] mx-auto px-4 mb-6 pt-4 relative z-10">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm border backdrop-blur transition-all ${
                  showFilters
                    ? "bg-purple-500/25 border-fuchsia-400/50 text-white"
                    : "border-purple-500/25 text-slate-200 hover:border-purple-400/45 bg-[#180d34]/70"
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-purple-300" />
                Filtres
              </button>

              {/* Genre pills -- glass effect */}
              <button
                onClick={() => {
                  setActiveGenre("");
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  !activeGenre
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-[#180d34]/75 text-slate-200 hover:bg-purple-500/20 border border-purple-500/20"
                }`}
              >
                Tous
              </button>
              {genres.slice(0, 8).map((g: string) => (
                <button
                  key={g}
                  onClick={() => {
                    setActiveGenre(g === activeGenre ? "" : g);
                    setPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeGenre === g
                      ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25"
                      : "bg-[#180d34]/75 text-slate-200 hover:bg-purple-500/20 border border-purple-500/20"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Extended filters -- Glass panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="tmu-glass rounded-2xl p-5 flex flex-wrap gap-5">
                    <div>
                      <label className="text-[11px] text-fuchsia-300 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                        Ambiance
                      </label>
                      <select
                        value={activeMood}
                        onChange={(e) => {
                          setActiveMood(e.target.value);
                          setPage(1);
                        }}
                        className="bg-[#090418] border border-purple-500/25 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:border-fuchsia-400 focus:outline-none"
                      >
                        <option value="">Toutes</option>
                        {moods.map((m: string) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-fuchsia-300 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                        Trier par
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value);
                          setPage(1);
                        }}
                        className="bg-[#090418] border border-purple-500/25 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:border-fuchsia-400 focus:outline-none"
                      >
                        <option value="discover">Découvrir</option>
                        <option value="popular">Populaire</option>
                        <option value="newest">Plus récent</option>
                        <option value="title">Titre (A-Z)</option>
                        <option value="duration">Durée</option>
                      </select>
                    </div>
                    {(activeGenre || activeMood) && (
                      <button
                        onClick={() => {
                          setActiveGenre("");
                          setActiveMood("");
                          setPage(1);
                        }}
                        className="self-end px-3.5 py-2 text-sm text-rose-300 hover:text-rose-200 flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Réinitialiser
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* ========================================= */}
          {/* ALL TRACKS GRID */}
          {/* ========================================= */}
          <section className="max-w-[95vw] mx-auto px-4 mb-14 relative z-10">
            <div className="flex items-center gap-2.5 mb-5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                <Music className="w-4 h-4 text-fuchsia-300" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-50">
                {activeGenre ? activeGenre : "Tous les titres"}
              </h2>
              <span className="text-slate-400 text-sm font-semibold font-mono tabular-nums">
                ({totalTracks})
              </span>
              <div className="flex-1" />
              <button
                onClick={() => {
                  if (tracks.length > 0) audio.playTracks(tracks);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-100 border border-purple-400/30 rounded-xl text-sm hover:bg-purple-500/30 backdrop-blur transition-all"
              >
                <Shuffle className="w-3.5 h-3.5 text-fuchsia-300" />
                Aléatoire
              </button>
            </div>

            {isLoading ? (
              /* Shimmer skeleton */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="tmu-glass flex items-center gap-3 p-3 rounded-xl"
                  >
                    <div className="w-11 h-11 rounded-lg bg-purple-950/80 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-3 bg-purple-950/80 rounded-lg w-3/4 mb-2 animate-pulse" />
                      <div className="h-2 bg-purple-950/80 rounded-lg w-1/2 animate-pulse" />
                    </div>
                    <div className="w-10 h-3 bg-purple-950/80 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : tracks.length === 0 ? (
              /* Empty state */
              <div className="tmu-glass rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/15 border border-purple-400/25 flex items-center justify-center mb-4">
                  <Music className="w-7 h-7 text-purple-300" />
                </div>
                <p className="text-slate-100 text-lg font-medium mb-1">
                  Aucun titre disponible
                </p>
                <p className="text-slate-400 text-sm max-w-sm">
                  {activeGenre
                    ? `Pas de titres trouvés en ${activeGenre}. Essayez un autre genre.`
                    : "Les artistes sont en studio… Revenez bientôt pour découvrir de nouveaux sons !"}
                </p>
                {activeGenre && (
                  <button
                    onClick={() => {
                      setActiveGenre("");
                      setPage(1);
                    }}
                    className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-100 border border-purple-400/30 rounded-xl text-sm hover:bg-purple-500/30 transition-all"
                  >
                    Voir tous les titres
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Track rows */}
                <div className="tmu-glass rounded-2xl overflow-hidden">
                  {tracks.map((track: any, i: number) => {
                    const isCurrentTrack = audio.currentTrack?.id === track.id;
                    return (
                      <motion.div
                        key={track.id}
                        initial={reducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={reducedMotion ? { duration: 0 } : { delay: i * 0.015 }}
                        onClick={() => audio.playTrack(track)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer group transition-all duration-200 ${
                          isCurrentTrack
                            ? "bg-purple-500/15 border-l-2 border-l-fuchsia-400"
                            : "border-l-2 border-l-transparent hover:bg-purple-500/[0.08]"
                        } ${i > 0 ? "border-t border-purple-500/15" : ""}`}
                      >
                        {/* Number or Playing indicator */}
                        <div className="w-7 text-center flex-shrink-0">
                          {isCurrentTrack && audio.isPlaying ? (
                            <div className="flex items-end justify-center gap-[2px] h-4">
                              {[1, 2, 3].map((b) => (
                                <span
                                  key={b}
                                  className="tmu-eq-bar w-[3px] h-full bg-fuchsia-400 rounded-full"
                                  style={{ animationDelay: `${b * 150}ms` }}
                                />
                              ))}
                            </div>
                          ) : (
                            <>
                              <span className="text-slate-400 text-xs font-mono tabular-nums group-hover:hidden">
                                {(page - 1) * 24 + i + 1}
                              </span>
                              <Play className="w-3.5 h-3.5 text-fuchsia-300 hidden group-hover:block mx-auto" />
                            </>
                          )}
                        </div>

                        {/* Cover */}
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#180d34] ring-1 ring-purple-500/20 shadow-md shadow-black/30">
                          {getCover(track) ? (
                            <img
                              src={getCover(track)!}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${getGenreGradient(track.genre)} flex items-center justify-center`}
                            >
                              <Music className="w-4 h-4 text-white/75" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium truncate ${isCurrentTrack ? "text-fuchsia-300" : "text-slate-50"}`}
                          >
                            {track.title}
                          </p>
                          <p className="text-slate-300 text-xs truncate">
                            {track.artist_name}
                            {track.album_title && (
                              <span className="text-slate-400">
                                {" • "}
                                {track.album_title}
                              </span>
                            )}
                          </p>
                          <TrackReactionStrip track={track} compact />
                        </div>

                        {/* Genre badge */}
                        {track.genre && (
                          <span className="hidden lg:inline-block px-2.5 py-1 bg-[#180d34] text-slate-300 text-[11px] rounded-lg border border-purple-500/20 font-medium">
                            {track.genre}
                          </span>
                        )}

                        {/* Streams */}
                        <span className="text-slate-400 text-xs flex-shrink-0 hidden sm:inline font-mono tabular-nums">
                          {formatStreams(track.streams || 0)}
                        </span>

                        {/* Duration */}
                        <span className="text-slate-400 text-xs flex-shrink-0 w-10 text-right font-mono tabular-nums">
                          {formatDuration(track.duration)}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/track/${track.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-[#180d34]/75 px-2 py-1 text-[11px] text-slate-200 transition-colors hover:border-fuchsia-400/50 hover:text-white"
                            title="Voir les commentaires"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-purple-300" />
                            <span className="hidden md:inline">Discuss</span>
                            {track.comment_count > 0 && (
                              <span className="tabular-nums">{track.comment_count}</span>
                            )}
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const at = audio.queue.findIndex(
                                (t) => t.id === track.id,
                              );
                              if (at >= 0) audio.removeFromQueue(at);
                              else audio.addToQueue(track);
                            }}
                            className={`transition-colors p-1 ${
                              audio.queue.some((t) => t.id === track.id)
                                ? "text-fuchsia-300"
                                : "text-slate-300 hover:text-fuchsia-300"
                            }`}
                            title={
                              audio.queue.some((t) => t.id === track.id)
                                ? "Retirer de la file"
                                : "Ajouter à la file"
                            }
                          >
                            {audio.queue.some((t) => t.id === track.id) ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalTracks > 24 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-5 py-2.5 bg-[#180d34]/80 backdrop-blur text-slate-200 rounded-xl border border-purple-500/25 disabled:opacity-30 hover:bg-purple-500/20 transition-all text-sm"
                    >
                      Précédent
                    </button>
                    <div className="flex items-center gap-1.5 tabular-nums">
                      {Array.from(
                        { length: Math.min(5, Math.ceil(totalTracks / 24)) },
                        (_, idx) => {
                          const totalPages = Math.ceil(totalTracks / 24);
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = idx + 1;
                          } else if (page <= 3) {
                            pageNum = idx + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + idx;
                          } else {
                            pageNum = page - 2 + idx;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                                page === pageNum
                                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25"
                                  : "bg-[#180d34]/80 text-slate-200 hover:bg-purple-500/20 border border-purple-500/20"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * 24 >= totalTracks}
                      className="px-5 py-2.5 bg-[#180d34]/80 backdrop-blur text-slate-200 rounded-xl border border-purple-500/25 disabled:opacity-30 hover:bg-purple-500/20 transition-all text-sm"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ========================================= */}
          {/* SUBSCRIPTION CTA */}
          {/* ========================================= */}
          {plansData?.plans && (
            <section
              id="subscription-plans"
              className="max-w-[95vw] mx-auto px-4 mb-16 relative z-10"
            >
              <div className="tmu-glass-elevated relative rounded-3xl overflow-hidden">
                <div className="relative p-6 sm:p-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-50">Abonnements Streamer</h2>
                  </div>
                  <p className="text-slate-300 text-sm mb-8 max-w-xl leading-relaxed">
                    Le streaming gratuit est disponible. Les abonnements
                    payants, leurs tarifs et leurs avantages ne sont pas
                    disponibles tant que les modalités et le parcours de
                    paiement ne sont pas confirmés.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plansData.plans.map((plan: any) => {
                      const isPopular = plan.popular === true;
                      const isFree = plan.id === "guest" || plan.id === "free";
                      const isPatron = plan.id === "patron";

                      // Color schemes per tier
                      const tierColors: Record<
                        string,
                        {
                          bg: string;
                          border: string;
                          text: string;
                          btn: string;
                          accent: string;
                        }
                      > = {
                        guest: {
                          bg: "bg-[#0f0822]/85",
                          border: "border-purple-500/15",
                          text: "text-slate-200",
                          btn: "bg-[#180d34] text-slate-200 hover:bg-purple-500/20 border border-purple-500/25",
                          accent: "text-slate-300",
                        },
                        supporter: {
                          bg: "bg-blue-950/35",
                          border: "border-blue-500/30",
                          text: "text-blue-300",
                          btn: "bg-blue-500/20 text-blue-200 border border-blue-500/35 hover:bg-blue-500/30",
                          accent: "text-blue-300",
                        },
                        champion: {
                          bg: "bg-amber-950/30",
                          border: "border-amber-500/30",
                          text: "text-amber-300",
                          btn: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20",
                          accent: "text-amber-300",
                        },
                        patron: {
                          bg: "bg-purple-950/40",
                          border: "border-fuchsia-500/35",
                          text: "text-fuchsia-300",
                          btn: "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-lg shadow-purple-500/20",
                          accent: "text-fuchsia-300",
                        },
                      };
                      const colors = tierColors[plan.id] || tierColors.guest;

                      return (
                        <div
                          key={plan.id}
                          className={`relative rounded-2xl p-5 border backdrop-blur transition-all duration-300 ${colors.bg} ${colors.border} ${isPopular ? "shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/25" : ""} ${isPatron ? "shadow-xl shadow-purple-500/15 ring-1 ring-fuchsia-400/25" : ""}`}
                        >
                          {isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-bold rounded-full uppercase tracking-wide shadow-lg shadow-amber-500/30">
                                ★ Populaire
                              </span>
                            </div>
                          )}
                          {isPatron && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide shadow-lg shadow-purple-500/30">
                                👑 VIP
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className={`font-bold text-lg ${colors.text}`}>
                              {plan.name}
                            </h3>
                          </div>
                          <div className="mb-4 tabular-nums">
                            <span className="text-3xl font-extrabold text-slate-50">
                              ${plan.price}
                            </span>
                            {plan.price > 0 && (
                              <span className="text-slate-400 text-sm ml-1">
                                /mois
                              </span>
                            )}
                          </div>
                          {/* Weekly streams indicator */}
                          <div
                            className={`mb-4 text-xs ${colors.accent} font-medium tabular-nums`}
                          >
                            {plan.weeklyStreams === -1
                              ? "∞ Streams illimités"
                              : `${plan.weeklyStreams} streams/semaine`}
                          </div>
                          <div className="mb-4 rounded-xl border border-purple-500/20 bg-[#090418]/75 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Arena vote power
                              </span>
                              <Trophy
                                className={`h-3.5 w-3.5 ${colors.accent}`}
                              />
                            </div>
                            <p
                              className={`mt-1 text-sm font-bold ${colors.text}`}
                            >
                              {plan.contestVoteLabel || "10% of 1 vote point"}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-slate-400">
                              One eligible listener vote is weighted by this
                              share. Streaming stays free; voting remains tied
                              to the contest rules.
                            </p>
                          </div>
                          <ul className="space-y-1.5 mb-5">
                            {(expandedTiers[plan.id]
                              ? plan.features
                              : plan.features.slice(0, 5)
                            ).map((f: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-slate-300 text-xs flex items-start gap-2"
                              >
                                <span
                                  className={`${colors.accent} mt-0.5 text-[10px]`}
                                >
                                  ✦
                                </span>
                                {f}
                              </li>
                            ))}
                            {plan.features.length > 5 && (
                              <li>
                                <button
                                  onClick={() =>
                                    setExpandedTiers((prev) => ({
                                      ...prev,
                                      [plan.id]: !prev[plan.id],
                                    }))
                                  }
                                  className={`text-xs font-medium ${colors.accent} hover:underline flex items-center gap-1 transition-all`}
                                >
                                  {expandedTiers[plan.id] ? (
                                    <>▲ Masquer</>
                                  ) : (
                                    <>
                                      ▼ +{plan.features.length - 5} autres
                                      avantages
                                    </>
                                  )}
                                </button>
                              </li>
                            )}
                          </ul>
                          <button
                            disabled={!isFree}
                            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${colors.btn}`}
                          >
                            {isFree ? "Plan actuel" : "Indisponible"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </TmuShell>
    );
  }

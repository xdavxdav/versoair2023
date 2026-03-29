/**
 * Verso Air Streaming — Main Browse / Discover Page
 * Immersive dark theme with cinematic depth, glass morphism, and animated ambiance
 */
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAudio } from "@/lib/audio-context";
import { useAuthContext } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  useStreamingTracks,
  useFeaturedTracks,
  useStreamingArtists,
  useStreamingSearch,
  useSubscriptionPlans,
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

function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Resolve cover art URL — prefers cover_art URL, then pochette endpoint, then album_cover */
function getCover(t: any): string | null {
  if (t.cover_art) return t.cover_art;
  if (t.has_pochette) return `/api/streaming/tracks/${t.id}/pochette`;
  if (t.album_cover) return t.album_cover;
  return null;
}

// ====================================================================
// IMMERSIVE BACKGROUND -- Nebula + Stars + Floating Orbs
// ====================================================================
function ImmersiveBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,60,20,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(80,40,120,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_20%_80%,rgba(20,80,120,0.06),transparent)]" />

      {/* Nebula blobs -- slow drifting color clouds */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #f59e0b, transparent 70%)",
          top: "-10%",
          left: "20%",
          filter: "blur(80px)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
          bottom: "10%",
          right: "10%",
          filter: "blur(100px)",
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, #06b6d4, transparent 70%)",
          top: "40%",
          left: "-5%",
          filter: "blur(90px)",
        }}
        animate={{ x: [0, 30, -10, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Star particles -- varied sizes and brightness */}
      {Array.from({ length: 60 }).map((_, i) => {
        const size = i < 10 ? 2 : i < 30 ? 1 : 0.5;
        const dur = 3 + Math.random() * 6;
        const color =
          i % 5 === 0
            ? "bg-amber-300"
            : i % 7 === 0
              ? "bg-purple-300"
              : "bg-white";
        return (
          <motion.div
            key={`star-${i}`}
            className={`absolute rounded-full ${color}`}
            style={{
              width: size,
              height: size,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0.05, 0.4 + Math.random() * 0.4, 0.05] }}
            transition={{
              duration: dur,
              repeat: Infinity,
              delay: Math.random() * dur,
            }}
          />
        );
      })}

      {/* Floating orbs -- large, very subtle, slow */}
      <motion.div
        className="absolute w-3 h-3 bg-amber-400/20 rounded-full"
        style={{ filter: "blur(2px)", top: "15%", left: "70%" }}
        animate={{
          y: [0, -60, 0],
          x: [0, 20, 0],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
        style={{ filter: "blur(1px)", top: "55%", left: "30%" }}
        animate={{
          y: [0, -40, 0],
          x: [0, -15, 0],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-2.5 h-2.5 bg-cyan-400/15 rounded-full"
        style={{ filter: "blur(2px)", top: "75%", right: "20%" }}
        animate={{
          y: [0, -50, 0],
          x: [0, 25, 0],
          opacity: [0.08, 0.2, 0.08],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Horizontal light streaks */}
      <div className="absolute top-[30%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/[0.04] to-transparent" />
      <div className="absolute top-[65%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/[0.03] to-transparent" />
    </div>
  );
}

// Genre color mapping
const GENRE_COLORS: Record<string, string> = {
  Afrobeats: "from-green-500 to-emerald-700",
  Afropop: "from-pink-500 to-rose-700",
  Rumba: "from-blue-500 to-indigo-700",
  Soukous: "from-cyan-500 to-teal-700",
  "Coupé-Décalé": "from-orange-500 to-red-700",
  Reggae: "from-green-600 to-lime-800",
  Electronic: "from-violet-500 to-purple-700",
  "World Music": "from-amber-500 to-yellow-700",
  "Pop/R&B": "from-fuchsia-500 to-pink-700",
  "Afro Trap": "from-red-500 to-orange-700",
  Zouglou: "from-teal-500 to-cyan-700",
  Mbalax: "from-indigo-500 to-blue-700",
  "Bongo Flava": "from-yellow-500 to-amber-700",
  Gospel: "from-purple-500 to-indigo-700",
  Mandingue: "from-emerald-500 to-green-700",
  Zoblazo: "from-rose-500 to-red-700",
  "Afro-Pop": "from-sky-500 to-blue-700",
  "Afro-Blues": "from-slate-500 to-gray-700",
  "Afro-Manding": "from-amber-600 to-orange-800",
};

function getGenreGradient(genre: string): string {
  return GENRE_COLORS[genre] || "from-gray-600 to-gray-700";
}

// ====================================================================
// SECTION DIVIDER -- Glowing accent line
// ====================================================================
function SectionGlow() {
  return (
    <div className="max-w-[95vw] mx-auto px-4 my-2">
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </div>
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
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showMyStats, setShowMyStats] = useState(false);

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

  const stats = listenerStats?.stats;
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

  return (
    <div className="min-h-screen bg-gray-950 text-white relative pb-32 overflow-x-hidden">
      <ImmersiveBackground />

      {/* ========================================= */}
      {/* FLOATING MY STATS PANEL */}
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
                <Card className="bg-gray-900/95 backdrop-blur-xl border-purple-500/30 shadow-2xl shadow-purple-500/10 w-72">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                        <Headphones className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{user.username || user.email?.split("@")[0]}</p>
                        <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          {levelName} · Lv.{currentLevel}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">XP Progress</span>
                        <span className="text-purple-400">{currentPoints} / {nextLevelPoints}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentPoints / nextLevelPoints) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                        <div className="text-amber-400 font-bold flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          {stats?.currentStreak || 0}
                        </div>
                        <div className="text-[10px] text-gray-500">Streak</div>
                      </div>
                      <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                        <div className="text-green-400 font-bold">#{stats?.rank || "—"}</div>
                        <div className="text-[10px] text-gray-500">Rank</div>
                      </div>
                      <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                        <div className="text-fuchsia-400 font-bold">{stats?.correctPredictions || 0}</div>
                        <div className="text-[10px] text-gray-500">Wins</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate("/arena")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-all"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        Arena
                      </button>
                      <button
                        onClick={() => navigate("/arcade")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-all"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        Arcade
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.button
            onClick={() => setShowMyStats(!showMyStats)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30 relative"
          >
            {showMyStats ? (
              <ChevronDown className="w-6 h-6 text-white" />
            ) : (
              <>
                <Headphones className="w-6 h-6 text-white" />
                {currentPoints > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
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
        {/* Hero cinematic gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.06),transparent_50%)]" />

        <div className="relative max-w-[95vw] mx-auto px-4 pt-8 pb-14 z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                {/* Pulsing beacon ring */}
                <motion.div
                  className="absolute -inset-1.5 rounded-2xl border border-amber-400/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -inset-3 rounded-2xl border border-amber-400/10"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: 0.3,
                  }}
                />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                    Verso Air
                  </span>{" "}
                  <span className="text-white/90">Stream</span>
                </h1>
                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-amber-500/60" />
                  La musique africaine, sans limites
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/arena">
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:from-amber-500/30 hover:to-orange-500/30 backdrop-blur transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  <Trophy className="w-4 h-4" />
                  Arena
                </button>
              </Link>
              <Link href="/arcade">
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]">
                  <Gamepad2 className="w-4 h-4" />
                  Arcade
                </button>
              </Link>
              <Link href="/library">
                <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/[0.03] backdrop-blur border border-white/10 rounded-xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all">
                  <Music2 className="w-3.5 h-3.5" />
                  Bibliothèque
                </button>
              </Link>
              <Link href="/analytics">
                <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 backdrop-blur transition-all">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analytics
                </button>
              </Link>
            </div>
          </div>

          {/* Animated equalizer decoration */}
          <div className="flex items-end justify-center gap-[3px] h-8 mb-6 opacity-30">
            {Array.from({ length: 32 }).map((_, i) => (
              <motion.div
                key={`eq-${i}`}
                className="w-[3px] rounded-full bg-gradient-to-t from-amber-600 to-amber-300"
                animate={{
                  height: [
                    4 + Math.random() * 8,
                    10 + Math.random() * 22,
                    4 + Math.random() * 8,
                  ],
                }}
                transition={{
                  duration: 1.2 + Math.random() * 0.8,
                  repeat: Infinity,
                  delay: i * 0.04,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Search Bar -- Glass effect */}
          <div className="relative max-w-2xl mx-auto mb-12">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-purple-500/10 to-amber-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-500" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Rechercher artistes, titres, albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.06] transition-all text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
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
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-96 overflow-y-auto"
                >
                  {searchResults.artists?.length > 0 && (
                    <div className="p-4">
                      <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
                        Artistes
                      </p>
                      {searchResults.artists.map((a: any) => (
                        <Link key={a.id} href={`/artist-catalogue/${a.id}`}>
                          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center overflow-hidden ring-1 ring-white/10">
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
                              <p className="text-white text-sm font-medium">
                                {a.name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {a.genre} •{" "}
                                {formatStreams(a.monthly_listeners || 0)}{" "}
                                auditeurs/mois
                              </p>
                            </div>
                            {a.verified && (
                              <Star className="w-3.5 h-3.5 text-amber-400 ml-auto fill-amber-400" />
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.tracks?.length > 0 && (
                    <div className="p-4 border-t border-white/5">
                      <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
                        Titres
                      </p>
                      {searchResults.tracks.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            audio.playTrack(t);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-white/5">
                            {getCover(t) ? (
                              <img
                                src={getCover(t)!}
                                alt={t.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-3 h-3 text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">
                              {t.title}
                            </p>
                            <p className="text-gray-500 text-xs truncate">
                              {t.artist_name}
                            </p>
                          </div>
                          <span className="text-gray-600 text-xs ml-auto font-mono">
                            {formatDuration(t.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.albums?.length > 0 && (
                    <div className="p-4 border-t border-white/5">
                      <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
                        Albums
                      </p>
                      {searchResults.albums.map((a: any) => (
                        <Link key={a.id} href={`/track/${a.id}`}>
                          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center ring-1 ring-white/5">
                              <Disc3 className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-white text-sm">{a.title}</p>
                              <p className="text-gray-500 text-xs">
                                {a.artist_name} • {a.album_type}
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
                        <Search className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          Aucun résultat pour «{searchQuery}»
                        </p>
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ========================================= */}
          {/* TRENDING / FEATURED CAROUSEL */}
          {/* ========================================= */}
          {trending.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Tendances</h2>
                <div className="flex-1" />
                <button className="text-amber-400/80 text-sm hover:text-amber-300 flex items-center gap-1 transition-colors">
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex-shrink-0 w-48 group cursor-pointer"
                    onClick={() => audio.playTrack(track)}
                  >
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden mb-3 shadow-xl shadow-black/40 ring-1 ring-white/5 group-hover:ring-amber-500/30 transition-all duration-300">
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
                          <Music className="w-14 h-14 text-white/20" />
                        </div>
                      )}
                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/40"
                        >
                          <Play className="w-6 h-6 text-black ml-0.5" />
                        </motion.div>
                      </div>
                      {/* Rank badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <div className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-amber-400 text-xs font-bold border border-amber-500/20">
                          #{i + 1}
                        </div>
                      </div>
                      {/* Bottom info overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                          <Headphones className="w-3 h-3" />
                          {formatStreams(track.streams || 0)} streams
                        </div>
                      </div>
                    </div>
                    <p className="text-white text-sm font-semibold truncate px-0.5">
                      {track.title}
                    </p>
                    <p className="text-gray-500 text-xs truncate px-0.5">
                      {track.artist_name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <SectionGlow />

      {/* ========================================= */}
      {/* ARTISTS SPOTLIGHT */}
      {/* ========================================= */}
      {artists.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-10 py-6 relative z-10">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Artistes Verso Air
            </h2>
            <div className="flex-1" />
            <Link href="/artistes">
              <button className="text-amber-400/80 text-sm hover:text-amber-300 flex items-center gap-1 transition-colors">
                Catalogue <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
            {artists.slice(0, 10).map((artist: any, i: number) => (
              <Link key={artist.id} href={`/artist-catalogue/${artist.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 w-32 text-center group cursor-pointer"
                >
                  <div className="relative w-28 h-28 mx-auto mb-3">
                    {/* Aurora glow behind artist circle */}
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-500/20 via-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                    <div className="relative w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 ring-2 ring-white/5 group-hover:ring-amber-500/40 transition-all duration-300 shadow-lg shadow-black/30">
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
                          <span className="text-2xl font-bold text-white/50">
                            {artist.name?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    {artist.verified && (
                      <div className="absolute -bottom-0.5 right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center ring-3 ring-gray-950 shadow-lg shadow-amber-500/30">
                        <Star className="w-3 h-3 text-black fill-black" />
                      </div>
                    )}
                  </div>
                  <p className="text-white text-xs font-semibold truncate">
                    {artist.name}
                  </p>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {artist.genre}
                  </p>
                  <p className="text-gray-600 text-[10px]">
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Nouveautés</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {newReleases.slice(0, 10).map((track: any, i: number) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => audio.playTrack(track)}
                className="group cursor-pointer bg-white/[0.02] backdrop-blur-sm rounded-xl p-3 hover:bg-white/[0.06] border border-white/[0.03] hover:border-amber-500/20 transition-all duration-300"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 mb-3 ring-1 ring-white/5 shadow-lg shadow-black/30">
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
                      <Music className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-2.5">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 ml-auto">
                      <Play className="w-4 h-4 text-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-white text-sm font-semibold truncate">
                  {track.title}
                </p>
                <p className="text-gray-500 text-xs truncate mt-0.5">
                  {track.artist_name}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <SectionGlow />

      {/* ========================================= */}
      {/* FILTERS & GENRE PILLS */}
      {/* ========================================= */}
      <section className="max-w-[95vw] mx-auto px-4 mb-6 pt-4 relative z-10">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm border backdrop-blur transition-all ${
              showFilters
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "border-white/10 text-gray-400 hover:border-white/20 bg-white/[0.02]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtres
          </button>

          {/* Genre pills -- glass effect */}
          <button
            onClick={() => {
              setActiveGenre("");
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              !activeGenre
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] border border-white/5"
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeGenre === g
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] border border-white/5"
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
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 flex flex-wrap gap-5 border border-white/5">
                <div>
                  <label className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                    Ambiance
                  </label>
                  <select
                    value={activeMood}
                    onChange={(e) => {
                      setActiveMood(e.target.value);
                      setPage(1);
                    }}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-amber-500/40 focus:outline-none backdrop-blur"
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
                  <label className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                    Trier par
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-amber-500/40 focus:outline-none backdrop-blur"
                  >
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
                    className="self-end px-3.5 py-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
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
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center">
            <Music className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {activeGenre ? activeGenre : "Tous les titres"}
          </h2>
          <span className="text-gray-600 text-sm font-mono">
            ({totalTracks})
          </span>
          <div className="flex-1" />
          <button
            onClick={() => {
              if (tracks.length > 0) audio.playTracks(tracks);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-sm hover:bg-amber-500/20 backdrop-blur transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Aléatoire
          </button>
        </div>

        {isLoading ? (
          /* Shimmer skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.02]"
              >
                <div className="w-11 h-11 rounded-lg bg-gray-800 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-800 rounded-lg w-3/4 mb-2 animate-pulse" />
                  <div className="h-2 bg-gray-800/60 rounded-lg w-1/2 animate-pulse" />
                </div>
                <div className="w-10 h-3 bg-gray-800/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-gray-700" />
            </div>
            <p className="text-gray-500 text-lg font-medium mb-1">
              Aucun titre disponible
            </p>
            <p className="text-gray-600 text-sm max-w-sm">
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
                className="mt-4 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-sm hover:bg-amber-500/20 transition-all"
              >
                Voir tous les titres
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Track rows */}
            <div className="bg-white/[0.015] backdrop-blur-sm rounded-2xl border border-white/[0.03] overflow-hidden">
              {tracks.map((track: any, i: number) => {
                const isCurrentTrack = audio.currentTrack?.id === track.id;
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    onClick={() => audio.playTrack(track)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer group transition-all duration-200 ${
                      isCurrentTrack
                        ? "bg-amber-500/[0.08] border-l-2 border-l-amber-500"
                        : "border-l-2 border-l-transparent hover:bg-white/[0.03]"
                    } ${i > 0 ? "border-t border-white/[0.02]" : ""}`}
                  >
                    {/* Number or Playing indicator */}
                    <div className="w-7 text-center flex-shrink-0">
                      {isCurrentTrack && audio.isPlaying ? (
                        <div className="flex items-end justify-center gap-[2px] h-4">
                          {[1, 2, 3].map((b) => (
                            <motion.div
                              key={b}
                              className="w-[3px] bg-amber-400 rounded-full"
                              animate={{ height: [3, 14, 3] }}
                              transition={{
                                duration: 0.7,
                                repeat: Infinity,
                                delay: b * 0.12,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-600 text-xs font-mono group-hover:hidden">
                            {(page - 1) * 24 + i + 1}
                          </span>
                          <Play className="w-3.5 h-3.5 text-white hidden group-hover:block mx-auto" />
                        </>
                      )}
                    </div>

                    {/* Cover */}
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 ring-1 ring-white/5 shadow-md shadow-black/20">
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
                          <Music className="w-4 h-4 text-white/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium truncate ${isCurrentTrack ? "text-amber-400" : "text-white"}`}
                      >
                        {track.title}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {track.artist_name}
                        {track.album_title && (
                          <span className="text-gray-600">
                            {" • "}
                            {track.album_title}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Genre badge */}
                    {track.genre && (
                      <span className="hidden lg:inline-block px-2.5 py-1 bg-white/[0.04] text-gray-500 text-[10px] rounded-lg border border-white/5 font-medium">
                        {track.genre}
                      </span>
                    )}

                    {/* Streams */}
                    <span className="text-gray-600 text-xs flex-shrink-0 hidden sm:inline font-mono">
                      {formatStreams(track.streams || 0)}
                    </span>

                    {/* Duration */}
                    <span className="text-gray-600 text-xs flex-shrink-0 w-10 text-right font-mono">
                      {formatDuration(track.duration)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.addToQueue(track);
                        }}
                        className="text-gray-500 hover:text-amber-400 transition-colors p-1"
                        title="Ajouter à la file"
                      >
                        <Plus className="w-4 h-4" />
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
                  className="px-5 py-2.5 bg-white/[0.04] backdrop-blur text-gray-400 rounded-xl border border-white/5 disabled:opacity-30 hover:bg-white/[0.08] transition-all text-sm"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1.5">
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
                              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                              : "bg-white/[0.04] text-gray-500 hover:bg-white/[0.08] border border-white/5"
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
                  className="px-5 py-2.5 bg-white/[0.04] backdrop-blur text-gray-400 rounded-xl border border-white/5 disabled:opacity-30 hover:bg-white/[0.08] transition-all text-sm"
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
        <section className="max-w-[95vw] mx-auto px-4 mb-16 relative z-10">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.06]">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-gray-900/80 to-purple-900/15" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.08),transparent_50%)]" />
            {/* Subtle grid texture */}
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Crown className="w-5 h-5 text-black" />
                </div>
                <h2 className="text-2xl font-bold">Abonnements Verso Air</h2>
              </div>
              <p className="text-gray-400 text-sm mb-8 max-w-xl leading-relaxed">
                Soutenez vos artistes préférés et débloquez une expérience
                musicale complète. Chaque stream contribue directement aux
                revenus des artistes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plansData.plans.map((plan: any) => {
                  const isPremium = plan.id === "premium";
                  const isFree = plan.id === "free";
                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl p-6 border backdrop-blur transition-all hover:scale-[1.02] hover:-translate-y-1 duration-300 ${
                        isPremium
                          ? "bg-amber-500/[0.08] border-amber-500/20 shadow-xl shadow-amber-500/10"
                          : "bg-white/[0.02] border-white/5"
                      }`}
                    >
                      {isPremium && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-bold rounded-full uppercase tracking-wide shadow-lg shadow-amber-500/30">
                            ★ Populaire
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <h3
                          className={`font-bold text-lg ${isPremium ? "text-amber-400" : "text-white"}`}
                        >
                          {plan.name}
                        </h3>
                      </div>
                      <div className="mb-5">
                        <span className="text-3xl font-extrabold text-white">
                          ${plan.price}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-gray-500 text-sm ml-1">
                            /mois
                          </span>
                        )}
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((f: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-gray-400 text-xs flex items-start gap-2"
                          >
                            <span className="text-amber-400 mt-0.5 text-xs">
                              ✦
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isPremium
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20"
                            : isFree
                              ? "bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] border border-white/10"
                              : "bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25"
                        }`}
                      >
                        {isFree ? "Commencer gratuitement" : "S'abonner"}
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
  );
}

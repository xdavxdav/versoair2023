/**
 * Verso Air Streaming — Main Browse / Discover Page
 * Dark theme with gold/amber accents and subtle astrology design
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/lib/audio-context";
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
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
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

// Astrology star field background particles
function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 bg-amber-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.1, 0.6, 0.1],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
      {/* Divine light beams */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent" />
      <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-purple-400/5 via-transparent to-transparent" />
    </div>
  );
}

// Country flag emoji from code
function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

// Genre color mapping
const GENRE_COLORS: Record<string, string> = {
  Afrobeats: "from-green-600 to-emerald-700",
  Afropop: "from-pink-600 to-rose-700",
  Rumba: "from-blue-600 to-indigo-700",
  Soukous: "from-cyan-600 to-teal-700",
  "Coupé-Décalé": "from-orange-600 to-red-700",
  Reggae: "from-green-700 to-lime-800",
  Electronic: "from-violet-600 to-purple-700",
  "World Music": "from-amber-600 to-yellow-700",
  "Pop/R&B": "from-fuchsia-600 to-pink-700",
  "Afro Trap": "from-red-600 to-orange-700",
  Zouglou: "from-teal-600 to-cyan-700",
  Mbalax: "from-indigo-600 to-blue-700",
  "Bongo Flava": "from-yellow-600 to-amber-700",
  Gospel: "from-purple-600 to-indigo-700",
  Mandingue: "from-emerald-600 to-green-700",
  Zoblazo: "from-rose-600 to-red-700",
  "Afro-Pop": "from-sky-600 to-blue-700",
  "Afro-Blues": "from-slate-600 to-gray-700",
  "Afro-Manding": "from-amber-700 to-orange-800",
};

function getGenreGradient(genre: string): string {
  return GENRE_COLORS[genre] || "from-gray-600 to-gray-700";
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function StreamPage() {
  const audio = useAudio();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

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

  // Auto-scroll featured
  const featuredRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white relative pb-24">
      <StarField />

      {/* ═══════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

        <div className="relative max-w-[95vw] mx-auto px-4 pt-8 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <motion.div
                  className="absolute -inset-1 bg-amber-500/20 rounded-xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
                  Verso Air Stream
                </h1>
                <p className="text-gray-500 text-xs">
                  La musique africaine, sans limites
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/library">
                <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-amber-500/50 transition-all">
                  Ma Bibliothèque
                </button>
              </Link>
              <Link href="/analytics">
                <button className="px-3 py-1.5 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analytics
                </button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-10">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-amber-400 transition-colors" />
              <input
                type="text"
                placeholder="Rechercher artistes, titres, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all"
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

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchQuery.length >= 2 && searchResults && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-900/98 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto"
                >
                  {searchResults.artists?.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Artistes
                      </p>
                      {searchResults.artists.map((a: any) => (
                        <Link key={a.id} href={`/artist-catalogue/${a.id}`}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center overflow-hidden">
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
                              <Star className="w-3.5 h-3.5 text-amber-400 ml-auto" />
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults.tracks?.length > 0 && (
                    <div className="p-3 border-t border-gray-800">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Titres
                      </p>
                      {searchResults.tracks.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            audio.playTrack(t);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {t.cover_art ? (
                              <img
                                src={t.cover_art}
                                alt={t.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-3 h-3 text-gray-400" />
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
                          <span className="text-gray-600 text-xs ml-auto">
                            {formatDuration(t.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.albums?.length > 0 && (
                    <div className="p-3 border-t border-gray-800">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Albums
                      </p>
                      {searchResults.albums.map((a: any) => (
                        <Link key={a.id} href={`/track/${a.id}`}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer">
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                              <Disc3 className="w-3 h-3 text-gray-400" />
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
                      <div className="p-6 text-center">
                        <p className="text-gray-500">
                          Aucun résultat pour "{searchQuery}"
                        </p>
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* TRENDING / FEATURED CAROUSEL */}
          {/* ═══════════════════════════════════════════ */}
          {trending.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold">Tendances</h2>
                <div className="flex-1" />
                <button className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                  Voir tout <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div
                ref={featuredRef}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
              >
                {trending.slice(0, 8).map((track: any, i: number) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 w-44 group cursor-pointer"
                    onClick={() => audio.playTrack(track)}
                  >
                    <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 mb-2 shadow-lg">
                      {track.cover_art || track.album_cover ? (
                        <img
                          src={track.cover_art || track.album_cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${getGenreGradient(track.genre)} flex items-center justify-center`}
                        >
                          <Music className="w-12 h-12 text-white/40" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/40"
                        >
                          <Play className="w-5 h-5 text-black ml-0.5" />
                        </motion.div>
                      </div>
                      {/* Rank badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded-full text-amber-400 text-xs font-bold">
                        #{i + 1}
                      </div>
                      {/* Stream count */}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded-full text-gray-300 text-[10px] flex items-center gap-1">
                        <Headphones className="w-2.5 h-2.5" />
                        {formatStreams(track.streams || 0)}
                      </div>
                    </div>
                    <p className="text-white text-sm font-medium truncate">
                      {track.title}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {track.artist_name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* ARTISTS SPOTLIGHT */}
      {/* ═══════════════════════════════════════════ */}
      {artists.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-12 relative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Artistes Verso Air</h2>
            <div className="flex-1" />
            <Link href="/artistes">
              <button className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                Catalogue complet <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {artists.slice(0, 10).map((artist: any, i: number) => (
              <Link key={artist.id} href={`/artist-catalogue/${artist.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 w-32 text-center group cursor-pointer"
                >
                  <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 mb-2 ring-2 ring-gray-800 group-hover:ring-amber-500/50 transition-all">
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
                        <span className="text-2xl font-bold text-white/60">
                          {artist.name?.[0]}
                        </span>
                      </div>
                    )}
                    {artist.verified && (
                      <div className="absolute bottom-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center ring-2 ring-gray-900">
                        <Star className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </div>
                  <p className="text-white text-xs font-medium truncate">
                    {artist.name}
                  </p>
                  <p className="text-gray-500 text-[10px]">{artist.genre}</p>
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

      {/* ═══════════════════════════════════════════ */}
      {/* NEW RELEASES */}
      {/* ═══════════════════════════════════════════ */}
      {newReleases.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Nouveautés</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {newReleases.slice(0, 10).map((track: any) => (
              <div
                key={track.id}
                onClick={() => audio.playTrack(track)}
                className="group cursor-pointer bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/60 transition-all"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 mb-2">
                  {track.cover_art || track.album_cover ? (
                    <img
                      src={track.cover_art || track.album_cover}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${getGenreGradient(track.genre)} flex items-center justify-center`}
                    >
                      <Music className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-end p-2">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg ml-auto">
                      <Play className="w-4 h-4 text-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-white text-sm font-medium truncate">
                  {track.title}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  {track.artist_name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* FILTERS & GENRE PILLS */}
      {/* ═══════════════════════════════════════════ */}
      <section className="max-w-[95vw] mx-auto px-4 mb-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
              showFilters
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                : "border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtres
          </button>

          {/* Genre pills */}
          <button
            onClick={() => {
              setActiveGenre("");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !activeGenre
                ? "bg-amber-500 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeGenre === g
                  ? "bg-amber-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Extended filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-gray-800/40 rounded-xl p-4 flex flex-wrap gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Ambiance
                  </label>
                  <select
                    value={activeMood}
                    onChange={(e) => {
                      setActiveMood(e.target.value);
                      setPage(1);
                    }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
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
                  <label className="text-xs text-gray-500 mb-1 block">
                    Trier par
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
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
                    className="self-end px-3 py-1.5 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* ALL TRACKS GRID */}
      {/* ═══════════════════════════════════════════ */}
      <section className="max-w-[95vw] mx-auto px-4 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold">
            {activeGenre ? `${activeGenre}` : "Tous les titres"}
          </h2>
          <span className="text-gray-600 text-sm">({totalTracks})</span>
          <div className="flex-1" />
          <button
            onClick={() => {
              if (tracks.length > 0) audio.playTracks(tracks);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-sm hover:bg-amber-500/20 transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Lecture aléatoire
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/20 animate-pulse"
              >
                <div className="w-12 h-12 rounded bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {tracks.map((track: any, i: number) => {
                const isCurrentTrack = audio.currentTrack?.id === track.id;
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => audio.playTrack(track)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer group transition-all ${
                      isCurrentTrack
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    {/* Number or Playing indicator */}
                    <div className="w-6 text-center flex-shrink-0">
                      {isCurrentTrack && audio.isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-4">
                          {[1, 2, 3].map((b) => (
                            <motion.div
                              key={b}
                              className="w-0.5 bg-amber-400 rounded-full"
                              animate={{ height: [4, 12, 4] }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: b * 0.15,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs group-hover:hidden">
                          {(page - 1) * 24 + i + 1}
                        </span>
                      )}
                      {!isCurrentTrack && (
                        <Play className="w-3.5 h-3.5 text-white hidden group-hover:block mx-auto" />
                      )}
                    </div>

                    {/* Cover */}
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                      {track.cover_art || track.album_cover ? (
                        <img
                          src={track.cover_art || track.album_cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${getGenreGradient(track.genre)} flex items-center justify-center`}
                        >
                          <Music className="w-4 h-4 text-white/40" />
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
                            {" "}
                            • {track.album_title}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Genre badge */}
                    <span className="hidden lg:inline-block px-2 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded-full">
                      {track.genre}
                    </span>

                    {/* Streams */}
                    <span className="text-gray-600 text-xs flex-shrink-0 hidden sm:inline">
                      {formatStreams(track.streams || 0)}
                    </span>

                    {/* Duration */}
                    <span className="text-gray-600 text-xs flex-shrink-0 w-10 text-right">
                      {formatDuration(track.duration)}
                    </span>

                    {/* Add to queue */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.addToQueue(track);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-amber-400 transition-all flex-shrink-0"
                      title="Ajouter à la file"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalTracks > 24 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  Précédent
                </button>
                <span className="text-gray-500 text-sm">
                  Page {page} / {Math.ceil(totalTracks / 24)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 24 >= totalTracks}
                  className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SUBSCRIPTION CTA */}
      {/* ═══════════════════════════════════════════ */}
      {plansData?.plans && (
        <section className="max-w-[95vw] mx-auto px-4 mb-16">
          <div className="bg-gradient-to-br from-amber-900/30 via-gray-900 to-purple-900/20 rounded-2xl border border-amber-500/20 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold">Abonnements Verso Air</h2>
              </div>
              <p className="text-gray-400 text-sm mb-6 max-w-xl">
                Soutenez vos artistes préférés et débloquez une expérience
                musicale complète. Chaque stream contribue directement aux
                revenus des artistes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plansData.plans.map((plan: any) => (
                  <div
                    key={plan.id}
                    className={`rounded-xl p-5 border transition-all hover:scale-[1.02] ${
                      plan.id === "premium"
                        ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20"
                        : "bg-gray-800/30 border-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3
                        className={`font-semibold ${plan.id === "premium" ? "text-amber-400" : "text-white"}`}
                      >
                        {plan.name}
                      </h3>
                      {plan.id === "premium" && (
                        <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full uppercase">
                          Populaire
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-white">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 text-sm">/mois</span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f: string, i: number) => (
                        <li
                          key={i}
                          className="text-gray-400 text-xs flex items-start gap-1.5"
                        >
                          <span className="text-amber-400 mt-0.5">✦</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        plan.id === "premium"
                          ? "bg-amber-500 hover:bg-amber-400 text-black"
                          : plan.id === "free"
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                      }`}
                    >
                      {plan.id === "free"
                        ? "Commencer gratuitement"
                        : "S'abonner"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

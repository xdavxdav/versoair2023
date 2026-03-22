import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Loader2,
  X,
  Database,
  Music,
  Mic2,
  Headphones,
  BarChart3,
  Users,
  Play,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Check,
  Disc3,
  TrendingUp,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ScrollToTop from "@/components/ScrollToTop";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScrollLock } from "@/hooks/use-scroll-lock";
// Artist directory is global — no country context needed
// import { useCountry } from "@/contexts/CountryContext";
import { getCountryMeta } from "@/utils/countryMeta";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Types
interface Artist {
  id: number;
  name: string;
  genre: string;
  label_status: string | null;
  spotify_url: string | null;
  business_id: number | null;
  user_id: number | null;
}

interface ArtistDetails extends Artist {}

// Sort options
const SORT_OPTIONS = [
  { value: "name_asc", label: "Nom (A → Z)" },
  { value: "name_desc", label: "Nom (Z → A)" },
  { value: "genre_asc", label: "Genre (A → Z)" },
  { value: "recent", label: "Plus récents" },
];

// Genre icons mapping — Ivorian music genres
const GENRE_ICONS: Record<string, string> = {
  "Coupé-Décalé": "💃",
  Zouglou: "🥁",
  Reggae: "🌴",
  Afrobeats: "🔥",
  "Afro-Trap": "🎤",
  Rap: "🎤",
  "Hip-Hop": "🎧",
  Electronic: "🎧",
  "Afro-Electronic": "⚡",
  "R&B": "🎶",
  Traditional: "🪘",
  "World Music": "🌍",
};

// Genre colors — Ivorian music genres
const GENRE_COLORS: Record<string, string> = {
  "Coupé-Décalé": "from-orange-500 to-yellow-500",
  Zouglou: "from-green-500 to-emerald-500",
  Reggae: "from-green-600 to-yellow-500",
  Afrobeats: "from-red-500 to-orange-500",
  "Afro-Trap": "from-purple-600 to-pink-500",
  Rap: "from-amber-500 to-yellow-500",
  "Hip-Hop": "from-violet-500 to-purple-600",
  Electronic: "from-cyan-400 to-blue-500",
  "Afro-Electronic": "from-fuchsia-500 to-cyan-500",
  "R&B": "from-violet-500 to-purple-600",
  Traditional: "from-amber-600 to-orange-600",
  "World Music": "from-teal-500 to-emerald-500",
};

function formatNumber(num: number | null | undefined): string {
  if (!num) return "0";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ArtistDirectory() {
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedArtistCountry, setSelectedArtistCountry] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [selectedArtist, setSelectedArtist] = useState<ArtistDetails | null>(
    null,
  );
  const [showArtistDetails, setShowArtistDetails] = useState(false);
  useScrollLock(showArtistDetails);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Database connection test
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const result = await response.json();
        setDatabaseConnected(result.success === true);
      } catch {
        setDatabaseConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Fetch genres and countries on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [genresRes, countriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/artists/genres`),
          fetch(`${API_BASE_URL}/api/countries`),
        ]);
        const genresJson = await genresRes.json();
        if (genresJson.success) setGenres(genresJson.data || []);
        const countriesJson = await countriesRes.json();
        // /api/countries returns array of {id, name, code} objects
        if (Array.isArray(countriesJson)) {
          setCountries(countriesJson.map((c: any) => c.code));
        } else if (countriesJson.success) {
          setCountries(countriesJson.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch filters:", error);
        // Fallback genres
        setGenres([
          "Afro-Electronic",
          "Afro-Trap",
          "Afrobeats",
          "Coupé-Décalé",
          "Electronic",
          "Hip-Hop",
          "R&B",
          "Rap",
          "Reggae",
          "Traditional",
          "World Music",
          "Zouglou",
        ]);
      }
    };
    fetchFilters();
  }, []);

  // Auto-search on mount to show all artists
  useEffect(() => {
    handleSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note: Artist directory is a global catalog — it does NOT filter by the header country selector

  // Debounced search - auto-fetch after user stops typing
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchQuery.trim()) {
      searchTimerRef.current = setTimeout(() => {
        handleSearch(1);
      }, 300);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Search handler
  const handleSearch = useCallback(
    async (page: number = 1, genreOverride?: string) => {
      setIsSearching(true);
      setCurrentPage(page);

      const genre = genreOverride ?? selectedGenre;

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "12",
          sort_by: sortBy,
        });

        if (searchQuery.trim()) params.set("query", searchQuery.trim());
        if (genre) params.set("genre", genre);
        // Only filter by artist-specific country selection, NOT the global header country
        if (selectedArtistCountry)
          params.set("countryCode", selectedArtistCountry);

        const response = await fetch(
          `${API_BASE_URL}/api/artists/search?${params}`,
        );
        const result = await response.json();

        if (result.success) {
          setArtists(result.data || []);
          setTotalResults(result.total || 0);
          setTotalPages(result.totalPages || 0);
        } else {
          setArtists([]);
          setTotalResults(0);
          setTotalPages(0);
        }
        setHasSearched(true);
      } catch (error) {
        console.error("Artist search failed:", error);
        setArtists([]);
        setTotalResults(0);
        setTotalPages(0);
      }
      setIsSearching(false);
    },
    [searchQuery, selectedGenre, selectedArtistCountry, sortBy],
  );

  // Fetch artist details
  const fetchArtistDetails = async (artistId: number) => {
    setLoadingDetails(true);
    setShowArtistDetails(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/artists/${artistId}/details`,
      );
      const result = await response.json();
      if (result.success) {
        setSelectedArtist(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch artist details:", error);
    }
    setLoadingDetails(false);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedGenre("");
    setSelectedArtistCountry("");
    setSortBy("name_asc");
    setArtists([]);
    setHasSearched(false);
    setTotalResults(0);
    setCurrentPage(1);
    handleSearch(1);
  };

  const getGenreGradient = (genre: string) => {
    return GENRE_COLORS[genre] || "from-gray-500 to-gray-700";
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/40 to-slate-900 text-white">
      {/* Database Connection Status */}
      <div
        className="fixed bottom-4 right-4 z-50"
        title={databaseConnected ? "Connecté" : "Déconnecté"}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${databaseConnected ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>

      {/* Hero Section */}
      <div className="relative h-[420px] flex flex-col justify-center items-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 via-fuchsia-900/80 to-violet-900/90"></div>
        {/* Animated music notes background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/5 text-6xl select-none"
              initial={{
                x: Math.random() * 100 + "%",
                y: "110%",
                rotate: Math.random() * 360,
              }}
              animate={{
                y: "-10%",
                rotate: Math.random() * 360 + 180,
              }}
              transition={{
                duration: Math.random() * 15 + 10,
                repeat: Infinity,
                delay: Math.random() * 10,
                ease: "linear",
              }}
            >
              {["♪", "♫", "♬", "🎵", "🎶"][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
              🎵 Annuaire Musicale
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Répertoire Complet des Artistes
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-xl mb-2 text-white/90"
          >
            Explorez plus de {genres.length} catégories d'artistes
            {countries.length > 0 ? ` à travers ${countries.length} pays` : ""}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-4 mt-4 text-white/60"
          >
            <div className="flex items-center gap-1">
              <Mic2 className="h-4 w-4" />
              <span className="text-sm">Artistes locaux</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Headphones className="h-4 w-4" />
              <span className="text-sm">Tous genres</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Statistiques live</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-[95vw] mx-auto px-4 -mt-8 relative z-20">
        <Card className="bg-gradient-to-br from-slate-800/90 to-purple-900/90 backdrop-blur-md border-purple-700 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Recherchez des Artistes..."
                  className="pl-12 bg-slate-800/50 border-purple-600 text-white placeholder-purple-300/60 focus:border-purple-400"
                />
              </div>

              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-purple-600 hover:bg-purple-800"
                >
                  <Filter size={16} className="mr-2" />
                  {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
                </Button>

                {(searchQuery || selectedGenre || selectedArtistCountry) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-purple-300 hover:text-white hover:bg-white/10"
                  >
                    <X size={14} className="mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>

              <div className="text-sm text-purple-300">
                {totalResults.toLocaleString()} artiste
                {totalResults !== 1 ? "s" : ""} trouvé
                {totalResults !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Genre & Country Filters */}
            <div className="mt-4 pt-4 border-t border-purple-700 flex flex-col md:flex-row gap-4">
              {/* Genre Dropdown */}
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block text-purple-300">
                  Genre ({genres.length} disponibles)
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-purple-600 bg-slate-800 hover:bg-slate-700 w-full md:w-[300px] justify-between"
                    >
                      <span className="text-sm">
                        {selectedGenre
                          ? `${GENRE_ICONS[selectedGenre] || "🎵"} ${selectedGenre}`
                          : "Tous les genres"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[300px] max-h-[400px] overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedGenre("");
                        handleSearch(1, "");
                      }}
                    >
                      {!selectedGenre && (
                        <Check className="h-4 w-4 mr-2 text-purple-400" />
                      )}
                      <span
                        className={
                          !selectedGenre
                            ? "font-semibold text-purple-300"
                            : "text-purple-200"
                        }
                      >
                        Tous les genres
                      </span>
                    </DropdownMenuItem>
                    {genres.map((genre) => (
                      <DropdownMenuItem
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          handleSearch(1, genre);
                        }}
                      >
                        {selectedGenre === genre && (
                          <Check className="h-4 w-4 mr-2 text-purple-400" />
                        )}
                        <span
                          className={
                            selectedGenre === genre
                              ? "font-semibold text-purple-300"
                              : "text-purple-200"
                          }
                        >
                          {GENRE_ICONS[genre] || "🎵"} {genre}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Country Dropdown */}
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block text-purple-300">
                  Pays ({countries.length} disponibles)
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-purple-600 bg-slate-800 hover:bg-slate-700 w-full md:w-[300px] justify-between"
                    >
                      <span className="text-sm">
                        {selectedArtistCountry
                          ? `${getCountryMeta(selectedArtistCountry).flag} ${getCountryMeta(selectedArtistCountry).name}`
                          : "Tous les pays"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[300px] max-h-[400px] overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedArtistCountry("");
                        handleSearch(1);
                      }}
                    >
                      {!selectedArtistCountry && (
                        <Check className="h-4 w-4 mr-2 text-purple-400" />
                      )}
                      <span
                        className={
                          !selectedArtistCountry
                            ? "font-semibold text-purple-300"
                            : "text-purple-200"
                        }
                      >
                        🌍 Tous les pays
                      </span>
                    </DropdownMenuItem>
                    {countries.map((code) => {
                      const meta = getCountryMeta(code);
                      return (
                        <DropdownMenuItem
                          key={code}
                          onClick={() => {
                            setSelectedArtistCountry(code);
                            handleSearch(1);
                          }}
                        >
                          {selectedArtistCountry === code && (
                            <Check className="h-4 w-4 mr-2 text-purple-400" />
                          )}
                          <span
                            className={
                              selectedArtistCountry === code
                                ? "font-semibold text-purple-300"
                                : "text-purple-200"
                            }
                          >
                            {meta.flag} {meta.name}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg border border-purple-700">
                    <div>
                      <Label className="text-sm font-medium mb-2 block text-purple-300">
                        Trier par
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-purple-600 bg-slate-800 hover:bg-slate-700 w-full justify-between"
                          >
                            <span className="text-sm">
                              {SORT_OPTIONS.find((s) => s.value === sortBy)
                                ?.label || "Popularité"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[280px]">
                          {SORT_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => {
                                setSortBy(option.value);
                                // Re-search with new sort
                                setTimeout(() => handleSearch(1), 0);
                              }}
                            >
                              {sortBy === option.value && (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              <span
                                className={
                                  sortBy === option.value
                                    ? "font-semibold text-purple-300"
                                    : "text-purple-200"
                                }
                              >
                                {option.label}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-end justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={clearAllFilters}
                        className="border-purple-600 hover:bg-purple-800"
                      >
                        Réinitialiser les filtres
                      </Button>
                      <Button
                        onClick={() => handleSearch(1)}
                        className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700"
                      >
                        Appliquer
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Artist Cards */}
      <div className="max-w-[95vw] mx-auto px-4 py-12">
        {hasSearched ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Disc3 className="h-6 w-6 text-purple-400" />
                <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {selectedGenre
                    ? `${GENRE_ICONS[selectedGenre] || "🎵"} ${selectedGenre}`
                    : "Tous les Artistes"}{" "}
                  ({artists.length} sur {totalResults.toLocaleString()})
                </span>
              </h2>
            </div>

            {artists.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence>
                    {artists.map((artist, index) => (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 120,
                        }}
                        className="relative rounded-2xl overflow-hidden cursor-pointer group"
                        onClick={() => fetchArtistDetails(artist.id)}
                      >
                        {/* Outer glow on hover */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-60 blur-sm transition-opacity duration-500 pointer-events-none" />

                        <div className="relative bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700/60 group-hover:border-purple-500/50 transition-all duration-500 group-hover:-translate-y-1 overflow-hidden">
                          {/* Genre color bar — thinner, more refined */}
                          <div
                            className={`h-1 bg-gradient-to-r ${getGenreGradient(artist.genre || "")} opacity-70 group-hover:opacity-100 transition-opacity duration-500`}
                          />

                          {/* Artist avatar header — more spacious */}
                          <div className="relative h-52 overflow-hidden">
                            {/* Background pattern */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${getGenreGradient(artist.genre || "")} opacity-20 group-hover:opacity-30 transition-opacity duration-500`}
                            />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.4),transparent)]" />

                            {/* Decorative floating elements */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                              <div className="absolute top-4 left-4 w-16 h-16 border border-white/5 rounded-full" />
                              <div className="absolute bottom-6 right-6 w-24 h-24 border border-white/5 rounded-full" />
                              <div className="absolute top-1/2 right-1/4 w-8 h-8 border border-white/5 rounded-full" />
                            </div>

                            {/* Centered initials — bigger, better shadow */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div
                                className={`w-28 h-28 rounded-full bg-gradient-to-br ${getGenreGradient(artist.genre || "")} flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4 ring-white/10 group-hover:ring-purple-400/30 group-hover:scale-105 transition-all duration-500`}
                              >
                                {(artist.name || "?")
                                  .split(/\s+/)
                                  .map((w: string) => w[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                            </div>

                            {/* Genre badge — polished glass effect */}
                            <div className="absolute top-3.5 right-3.5">
                              <Badge
                                className={`bg-gradient-to-r ${getGenreGradient(artist.genre || "")} text-white border-0 shadow-lg backdrop-blur-sm px-3 py-1 text-xs font-semibold`}
                              >
                                {GENRE_ICONS[artist.genre || ""] || "🎵"}{" "}
                                {artist.genre || "Divers"}
                              </Badge>
                            </div>
                          </div>

                          {/* Card body — improved spacing & typography */}
                          <div className="p-6">
                            <h4 className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors duration-300 mb-3 line-clamp-1 tracking-tight">
                              {artist.name || "Artiste inconnu"}
                            </h4>

                            {/* Subtle divider */}
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent mb-4" />

                            {/* Label status + Spotify — better layout */}
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium px-3 py-1 rounded-lg ${
                                  artist.label_status === "signed"
                                    ? "border-green-500/40 text-green-400 bg-green-500/5"
                                    : artist.label_status === "independent"
                                      ? "border-amber-500/40 text-amber-400 bg-amber-500/5"
                                      : "border-purple-500/40 text-purple-300 bg-purple-500/5"
                                }`}
                              >
                                {artist.label_status === "signed"
                                  ? "🏷️ Signé"
                                  : artist.label_status === "independent"
                                    ? "🎯 Indépendant"
                                    : "🆓 Non signé"}
                              </Badge>

                              <Link
                                href={`/artist-catalogue/${artist.id}`}
                                onClick={(e: any) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg"
                              >
                                <Music className="h-3.5 w-3.5" />
                                Stream
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-10">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => handleSearch(currentPage - 1)}
                      className="border-purple-600 hover:bg-purple-800"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            Math.abs(p - currentPage) <= 2,
                        )
                        .map((page, idx, arr) => (
                          <span key={page} className="flex items-center gap-2">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="text-gray-500">...</span>
                            )}
                            <Button
                              size="sm"
                              variant={
                                page === currentPage ? "default" : "outline"
                              }
                              onClick={() => handleSearch(page)}
                              className={
                                page === currentPage
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : "border-purple-600 hover:bg-purple-800"
                              }
                            >
                              {page}
                            </Button>
                          </span>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => handleSearch(currentPage + 1)}
                      className="border-purple-600 hover:bg-purple-800"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Music className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Aucun artiste trouvé
                </h3>
                <p className="text-gray-400">
                  Essayez une autre recherche ou un autre genre
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Radio className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Explorez le répertoire musical
            </h3>
            <p className="text-gray-400">
              Sélectionnez un genre ou lancez votre recherche
            </p>
          </div>
        )}
      </div>

      {/* Artist Details Modal */}
      <AnimatePresence>
        {showArtistDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowArtistDetails(false);
              setSelectedArtist(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl shadow-purple-900/30"
              onClick={(e) => e.stopPropagation()}
            >
              {loadingDetails ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <span className="ml-3 text-gray-300">Chargement...</span>
                </div>
              ) : selectedArtist ? (
                <>
                  {/* Header with gradient */}
                  <div className="relative">
                    <div
                      className={`h-48 bg-gradient-to-r ${getGenreGradient(selectedArtist.genre || "")} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold">
                          {(selectedArtist.name || "?")
                            .split(/\s+/)
                            .map((w: string) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-transparent to-transparent" />
                    </div>

                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => {
                          setShowArtistDetails(false);
                          setSelectedArtist(null);
                        }}
                        className="p-2 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full transition-colors"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge
                        className={`bg-gradient-to-r ${getGenreGradient(selectedArtist.genre || "")} text-white border-0 mb-2`}
                      >
                        {GENRE_ICONS[selectedArtist.genre || ""] || "🎵"}{" "}
                        {selectedArtist.genre || "Divers"}
                      </Badge>
                      <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                        {selectedArtist.name || "Artiste inconnu"}
                      </h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-purple-900/30 border-purple-500/20">
                        <CardContent className="p-4 text-center">
                          <Mic2 className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                          <div className="text-lg font-bold text-white">
                            {selectedArtist.genre || "—"}
                          </div>
                          <div className="text-xs text-purple-300">Genre</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-fuchsia-900/30 border-fuchsia-500/20">
                        <CardContent className="p-4 text-center">
                          <CheckCircle className="h-5 w-5 text-fuchsia-400 mx-auto mb-1" />
                          <div className="text-lg font-bold text-white">
                            {selectedArtist.label_status === "signed"
                              ? "Signé"
                              : selectedArtist.label_status === "independent"
                                ? "Indépendant"
                                : "Non signé"}
                          </div>
                          <div className="text-xs text-fuchsia-300">
                            Statut label
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Stream on Verso Air */}
                    <Link
                      href={`/artist-catalogue/${selectedArtist.id}`}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-amber-600 to-orange-500 rounded-lg text-white font-semibold hover:from-amber-700 hover:to-orange-600 transition-all"
                    >
                      <Music className="h-5 w-5" />
                      Écouter sur Verso Air
                    </Link>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}

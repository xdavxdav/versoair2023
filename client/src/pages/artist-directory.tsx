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
import { getFlag } from "@/utils/get-flag";
import { getFeaturedArtistByName } from "@shared/featured-artists";
import { FeaturedArtistCard } from "@/components/music/FeaturedArtistCard";
import { useLanguage } from "@/components/LanguageSwitcher";

const API_BASE_URL = "";

// Types
interface Artist {
  id: number;
  name: string;
  genre: string;
  label_status: string | null;
  spotify_url: string | null;
  business_id: number | null;
  user_id: number | null;
  country_code?: string | null;
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
  Zouglou: "from-green-500 to-amber-500",
  Reggae: "from-green-600 to-yellow-500",
  Afrobeats: "from-red-500 to-orange-500",
  "Afro-Trap": "from-purple-600 to-pink-500",
  Rap: "from-amber-500 to-yellow-500",
  "Hip-Hop": "from-violet-500 to-purple-600",
  Electronic: "from-cyan-400 to-blue-500",
  "Afro-Electronic": "from-fuchsia-500 to-cyan-500",
  "R&B": "from-violet-500 to-purple-600",
  Traditional: "from-amber-600 to-orange-600",
  "World Music": "from-teal-500 to-amber-500",
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
  const { currentLang } = useLanguage();
  const isFr = currentLang.toLowerCase().startsWith("fr");
  const isEs = currentLang.toLowerCase().startsWith("es");
  const bioLabel = isFr ? "Biographie" : isEs ? "Biografía" : "Biography";
  const listenLabel = isFr ? "Écouter" : isEs ? "Escuchar" : "Listen";
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
          fetch(`${API_BASE_URL}/api/artists/countries`),
        ]);
        const genresJson = await genresRes.json();
        if (genresJson.success) setGenres(genresJson.data || []);
        const countriesJson = await countriesRes.json();
        // /api/artists/countries returns only countries that currently have artist content
        if (Array.isArray(countriesJson)) {
          setCountries(countriesJson.map((c: any) => (typeof c === "string" ? c : c.code)));
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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-rose-50 via-pink-50/75 to-indigo-50 text-slate-900 dark:from-[#08071a] dark:via-[#110f33] dark:to-[#070615] dark:text-indigo-50">

      {/* Featured Artist Spotlight */}
      <div className="max-w-[95vw] w-full mx-auto px-4 pt-6 pb-10 relative z-20">
        <FeaturedArtistCard compact surface="adaptive" />
      </div>

      {/* Search Section */}
      <div className="max-w-[95vw] w-full mx-auto px-4 -mt-4 relative z-20">
        <Card className="bg-white/90 dark:bg-[#110f33]/90 backdrop-blur-md border-pink-200/90 dark:border-indigo-500/35 shadow-xl shadow-indigo-950/10 dark:shadow-indigo-950/50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-500 dark:text-indigo-300" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Recherchez des Artistes..."
                  className="pl-12 bg-rose-50/50 dark:bg-[#0b0924]/80 border-pink-300 dark:border-indigo-500/40 text-slate-900 dark:text-white placeholder:text-indigo-400 dark:placeholder:text-indigo-300/60 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>

              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-rose-500 dark:text-indigo-300" />
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-rose-50/80 text-indigo-950 border-pink-300 hover:bg-pink-100/90 hover:text-indigo-950 dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-500/40 dark:hover:bg-indigo-900/80 dark:hover:text-white"
                >
                  <Filter size={16} className="mr-2 text-rose-600 dark:text-indigo-300" />
                  {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
                </Button>

                {(searchQuery || selectedGenre || selectedArtistCountry) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 dark:text-indigo-300 dark:hover:text-white dark:hover:bg-indigo-800/50"
                  >
                    <X size={14} className="mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>

              <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                {totalResults.toLocaleString()} artiste
                {totalResults !== 1 ? "s" : ""} trouvé
                {totalResults !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Genre & Country Filters */}
            <div className="mt-4 pt-4 border-t border-pink-200/80 dark:border-indigo-500/30 flex flex-col md:flex-row gap-4">
              {/* Genre Dropdown */}
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block text-indigo-900 dark:text-indigo-200">
                  Genre{genres.length > 0 ? ` (${genres.length} disponibles)` : ""}
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-pink-300 bg-rose-50/60 text-indigo-950 hover:bg-pink-100/80 hover:text-indigo-950 dark:border-indigo-500/40 dark:bg-[#0b0924]/85 dark:text-white dark:hover:bg-indigo-900/70 dark:hover:text-white w-full md:w-[300px] justify-between"
                    >
                      <span className="text-sm">
                        {selectedGenre
                          ? `${GENRE_ICONS[selectedGenre] || "🎵"} ${selectedGenre}`
                          : "Tous les genres"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white dark:bg-[#110f33] border-pink-200 dark:border-indigo-500/40 w-[300px] max-h-[400px] overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedGenre("");
                        handleSearch(1, "");
                      }}
                    >
                      {!selectedGenre && (
                        <Check className="h-4 w-4 mr-2 text-rose-600 dark:text-indigo-300" />
                      )}
                      <span
                        className={
                          !selectedGenre
                            ? "font-semibold text-rose-700 dark:text-indigo-200"
                            : "text-indigo-950 dark:text-indigo-100"
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
                          <Check className="h-4 w-4 mr-2 text-rose-600 dark:text-indigo-300" />
                        )}
                        <span
                          className={
                            selectedGenre === genre
                              ? "font-semibold text-rose-700 dark:text-indigo-200"
                              : "text-indigo-950 dark:text-indigo-100"
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
                <Label className="text-sm font-medium mb-2 block text-indigo-900 dark:text-indigo-200">
                  Pays ({countries.length} disponibles)
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-pink-300 bg-rose-50/60 text-indigo-950 hover:bg-pink-100/80 hover:text-indigo-950 dark:border-indigo-500/40 dark:bg-[#0b0924]/85 dark:text-white dark:hover:bg-indigo-900/70 dark:hover:text-white w-full md:w-[300px] justify-between"
                    >
                      <span className="text-sm">
                        {selectedArtistCountry
                          ? `${getCountryMeta(selectedArtistCountry).flag} ${getCountryMeta(selectedArtistCountry).name}`
                          : "Tous les pays"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white dark:bg-[#110f33] border-pink-200 dark:border-indigo-500/40 w-[300px] max-h-[400px] overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedArtistCountry("");
                        handleSearch(1);
                      }}
                    >
                      {!selectedArtistCountry && (
                        <Check className="h-4 w-4 mr-2 text-rose-600 dark:text-indigo-300" />
                      )}
                      <span
                        className={
                          !selectedArtistCountry
                            ? "font-semibold text-rose-700 dark:text-indigo-200"
                            : "text-indigo-950 dark:text-indigo-100"
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
                            <Check className="h-4 w-4 mr-2 text-rose-600 dark:text-indigo-300" />
                          )}
                          <span
                            className={
                              selectedArtistCountry === code
                                ? "font-semibold text-rose-700 dark:text-indigo-200"
                                : "text-indigo-950 dark:text-indigo-100"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50/70 dark:bg-[#0b0924]/70 rounded-lg border border-pink-200/80 dark:border-indigo-500/35">
                    <div>
                      <Label className="text-sm font-medium mb-2 block text-indigo-900 dark:text-indigo-200">
                        Trier par
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-pink-300 bg-white text-indigo-950 hover:bg-pink-50 hover:text-indigo-950 dark:border-indigo-500/40 dark:bg-[#110f33] dark:text-white dark:hover:bg-indigo-900/70 dark:hover:text-white w-full justify-between"
                          >
                            <span className="text-sm">
                              {SORT_OPTIONS.find((s) => s.value === sortBy)
                                ?.label || "Popularité"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-[#110f33] border-pink-200 dark:border-indigo-500/40 w-[280px]">
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
                                <Check className="h-4 w-4 mr-2 text-rose-600 dark:text-indigo-300" />
                              )}
                              <span
                                className={
                                  sortBy === option.value
                                    ? "font-semibold text-rose-700 dark:text-indigo-200"
                                    : "text-indigo-950 dark:text-indigo-100"
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
                        className="bg-white text-indigo-950 border-pink-300 hover:bg-pink-50 hover:text-indigo-950 dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-500/40 dark:hover:bg-indigo-900/80"
                      >
                        Réinitialiser les filtres
                      </Button>
                      <Button
                        onClick={() => handleSearch(1)}
                        className="bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-700 hover:via-pink-700 hover:to-indigo-700 dark:from-indigo-600 dark:via-violet-600 dark:to-indigo-500 text-white"
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
      <div className="max-w-[95vw] w-full mx-auto px-4 py-12">
        {hasSearched ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Disc3 className="h-6 w-6 text-rose-600 dark:text-indigo-300" />
                <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-700 dark:from-indigo-300 dark:via-violet-300 dark:to-indigo-200 bg-clip-text text-transparent">
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
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 dark:from-indigo-600 dark:via-violet-500 dark:to-indigo-400 rounded-2xl opacity-0 group-hover:opacity-60 blur-sm transition-opacity duration-500 pointer-events-none" />

                        <div className="relative bg-white/95 dark:bg-gradient-to-br dark:from-[#121036]/95 dark:to-[#0a0821]/95 backdrop-blur-md rounded-2xl border border-pink-200/80 dark:border-indigo-500/30 group-hover:border-indigo-400/70 dark:group-hover:border-indigo-400/60 shadow-lg shadow-indigo-950/5 dark:shadow-indigo-950/40 transition-all duration-500 group-hover:-translate-y-1 overflow-hidden">
                          {/* Genre color bar — thinner, more refined */}
                          <div
                            className={`h-1 bg-gradient-to-r ${getGenreGradient(artist.genre || "")} opacity-80 group-hover:opacity-100 transition-opacity duration-500`}
                          />

                          {/* Artist avatar header — more spacious */}
                          <div className="relative h-52 overflow-hidden">
                            {/* Background pattern */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${getGenreGradient(artist.genre || "")} opacity-15 dark:opacity-25 group-hover:opacity-25 dark:group-hover:opacity-35 transition-opacity duration-500`}
                            />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(79,70,229,0.12),transparent)] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.45),transparent)]" />

                            {/* Decorative floating elements */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                              <div className="absolute top-4 left-4 w-16 h-16 border border-indigo-900/10 dark:border-white/5 rounded-full" />
                              <div className="absolute bottom-6 right-6 w-24 h-24 border border-rose-900/10 dark:border-white/5 rounded-full" />
                              <div className="absolute top-1/2 right-1/4 w-8 h-8 border border-indigo-900/10 dark:border-white/5 rounded-full" />
                            </div>

                            {/* Centered artist photo or initials (notranslate prevents Google Translate corruption) */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              {(() => {
                                const featuredAvatar = getFeaturedArtistByName(artist.name)?.avatarUrl;
                                return featuredAvatar ? (
                                  <img
                                    src={featuredAvatar}
                                    alt={artist.name}
                                    loading="lazy"
                                    className="w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-white/80 dark:ring-white/10 group-hover:ring-pink-300/80 dark:group-hover:ring-indigo-400/40 group-hover:scale-105 transition-all duration-500"
                                  />
                                ) : (
                                  <div
                                    translate="no"
                                    className={`notranslate w-28 h-28 rounded-full bg-gradient-to-br ${getGenreGradient(artist.genre || "")} flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4 ring-white/80 dark:ring-white/10 group-hover:ring-pink-300/80 dark:group-hover:ring-indigo-400/40 group-hover:scale-105 transition-all duration-500`}
                                  >
                                    {(artist.name || "?")
                                      .split(/\s+/)
                                      .map((w: string) => w[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Country badge — top-left when known */}
                            {artist.country_code && (
                              <div className="absolute top-3.5 left-3.5">
                                <Badge className="bg-white/90 text-indigo-950 border border-pink-200/80 dark:bg-indigo-950/85 dark:text-indigo-100 dark:border-indigo-400/30 backdrop-blur-sm px-2.5 py-1 text-xs font-medium">
                                  {getFlag(artist.country_code)}{" "}
                                  {getCountryMeta(artist.country_code)?.name || artist.country_code}
                                </Badge>
                              </div>
                            )}

                            {/* Genre badge — polished glass effect */}
                            <div className="absolute top-3.5 right-3.5">
                              <Badge
                                translate="no"
                                className={`notranslate bg-gradient-to-r ${getGenreGradient(artist.genre || "")} text-white border-0 shadow-lg backdrop-blur-sm px-3 py-1 text-xs font-semibold`}
                              >
                                {GENRE_ICONS[artist.genre || ""] || "🎵"}{" "}
                                {artist.genre || "Divers"}
                              </Badge>
                            </div>
                          </div>

                          {/* Card body — improved spacing & typography */}
                          <div className="p-6">
                            <h4
                              translate="no"
                              className="notranslate text-lg font-bold text-indigo-950 dark:text-white group-hover:text-rose-700 dark:group-hover:text-indigo-200 transition-colors duration-300 mb-3 line-clamp-1 tracking-tight"
                            >
                              {artist.name || "Artiste inconnu"}
                            </h4>

                            {/* Subtle divider */}
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-300/70 dark:via-indigo-400/30 to-transparent mb-4" />

                            {/* Label status + Bio/Stream — better layout */}
                            <div className="flex items-center justify-between gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium px-3 py-1 rounded-lg ${
                                  artist.label_status === "signed"
                                    ? "border-emerald-300 text-emerald-800 bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:bg-emerald-500/10"
                                    : artist.label_status === "independent"
                                      ? "border-rose-300 text-rose-800 bg-rose-50 dark:border-indigo-400/40 dark:text-indigo-200 dark:bg-indigo-500/15"
                                      : "border-indigo-300 text-indigo-800 bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:bg-indigo-500/10"
                                }`}
                              >
                                {artist.label_status === "signed"
                                  ? "🏷️ Signé"
                                  : artist.label_status === "independent"
                                    ? "🎯 Indépendant"
                                    : "🆓 Non signé"}
                              </Badge>

                              <div className="flex items-center gap-2">
                                {(() => {
                                  const featured = getFeaturedArtistByName(artist.name);
                                  return featured ? (
                                    <Link
                                      href={`/artistes/${featured.slug}`}
                                      onClick={(e: any) => e.stopPropagation()}
                                      translate="no"
                                      className="notranslate flex items-center gap-1 text-indigo-800 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:text-indigo-200 dark:hover:text-white dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:border-indigo-400/30 transition-colors text-xs font-semibold px-3 py-1.5 rounded-lg"
                                    >
                                      {bioLabel}
                                    </Link>
                                  ) : null;
                                })()}
                                <Link
                                  href={`/artist-catalogue/${artist.id}`}
                                  onClick={(e: any) => e.stopPropagation()}
                                  translate="no"
                                  className="notranslate flex items-center gap-1.5 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:text-indigo-200 dark:hover:text-white dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:border-indigo-400/30 transition-colors text-xs font-semibold px-3 py-1.5 rounded-lg"
                                >
                                  <Music className="h-3.5 w-3.5" />
                                  {listenLabel}
                                </Link>
                              </div>
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
                      className="bg-white text-indigo-950 border-pink-300 hover:bg-pink-50 dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-500/40 dark:hover:bg-indigo-900/80"
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
                              <span className="text-slate-500 dark:text-indigo-300">...</span>
                            )}
                            <Button
                              size="sm"
                              variant={
                                page === currentPage ? "default" : "outline"
                              }
                              onClick={() => handleSearch(page)}
                              className={
                                page === currentPage
                                  ? "bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 dark:from-indigo-600 dark:to-violet-600 text-white"
                                  : "bg-white text-indigo-950 border-pink-300 hover:bg-pink-50 dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-500/40 dark:hover:bg-indigo-900/80"
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
                      className="bg-white text-indigo-950 border-pink-300 hover:bg-pink-50 dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-500/40 dark:hover:bg-indigo-900/80"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Music className="h-16 w-16 mx-auto text-rose-400 dark:text-indigo-400 mb-4" />
                <h3 className="text-xl font-semibold text-indigo-950 dark:text-indigo-100 mb-2">
                  Aucun artiste trouvé
                </h3>
                <p className="text-slate-600 dark:text-indigo-300">
                  Essayez une autre recherche ou un autre genre
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Radio className="h-16 w-16 mx-auto text-rose-400 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-indigo-950 dark:text-indigo-100 mb-2">
              Explorez le répertoire musical
            </h3>
            <p className="text-slate-600 dark:text-indigo-300">
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
            className="fixed inset-0 bg-indigo-950/65 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowArtistDetails(false);
              setSelectedArtist(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white dark:bg-gradient-to-br dark:from-[#121036] dark:to-[#09081d] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-pink-200 dark:border-indigo-500/35 shadow-2xl shadow-indigo-950/25 dark:shadow-indigo-950/60"
              onClick={(e) => e.stopPropagation()}
            >
              {loadingDetails ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500 dark:text-indigo-300" />
                  <span className="ml-3 text-indigo-950 dark:text-indigo-100">Chargement...</span>
                </div>
              ) : selectedArtist ? (
                <>
                  {/* Header with gradient */}
                  <div className="relative">
                    <div
                      className={`h-48 bg-gradient-to-r ${getGenreGradient(selectedArtist.genre || "")} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          translate="no"
                          className="notranslate w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold"
                        >
                          {(selectedArtist.name || "?")
                            .split(/\s+/)
                            .map((w: string) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/75 via-transparent to-transparent dark:from-[#121036]" />
                    </div>

                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => {
                          setShowArtistDetails(false);
                          setSelectedArtist(null);
                        }}
                        className="p-2 bg-slate-900/35 hover:bg-slate-900/55 backdrop-blur-sm rounded-full transition-colors"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge
                        translate="no"
                        className={`notranslate bg-gradient-to-r ${getGenreGradient(selectedArtist.genre || "")} text-white border-0 mb-2`}
                      >
                        {GENRE_ICONS[selectedArtist.genre || ""] || "🎵"}{" "}
                        {selectedArtist.genre || "Divers"}
                      </Badge>
                      <h2
                        translate="no"
                        className="notranslate text-3xl font-bold text-white drop-shadow-lg"
                      >
                        {selectedArtist.name || "Artiste inconnu"}
                      </h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-pink-50/80 border-pink-200 dark:bg-indigo-950/60 dark:border-indigo-500/30">
                        <CardContent className="p-4 text-center">
                          <Mic2 className="h-5 w-5 text-rose-600 dark:text-indigo-300 mx-auto mb-1" />
                          <div className="text-lg font-bold text-indigo-950 dark:text-white">
                            {selectedArtist.genre || "—"}
                          </div>
                          <div className="text-xs text-rose-700 dark:text-indigo-300">Genre</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-indigo-50/80 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-500/30">
                        <CardContent className="p-4 text-center">
                          <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-300 mx-auto mb-1" />
                          <div className="text-lg font-bold text-indigo-950 dark:text-white">
                            {selectedArtist.label_status === "signed"
                              ? "Signé"
                              : selectedArtist.label_status === "independent"
                                ? "Indépendant"
                                : "Non signé"}
                          </div>
                          <div className="text-xs text-indigo-700 dark:text-indigo-300">
                            Statut label
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Actions: Biography (if curated) + Stream on Verso Air */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {(() => {
                        const featured = getFeaturedArtistByName(selectedArtist.name);
                        return featured ? (
                          <Link
                            href={`/artistes/${featured.slug}`}
                            onClick={() => setShowArtistDetails(false)}
                            className="flex items-center justify-center gap-2 flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500/25 dark:hover:bg-indigo-500/35 dark:border dark:border-indigo-400/40 rounded-lg text-white font-semibold transition-all"
                          >
                            <Mic2 className="h-5 w-5" />
                            Biographie
                          </Link>
                        ) : null;
                      })()}
                      <Link
                        href={`/artist-catalogue/${selectedArtist.id}`}
                        className="flex items-center justify-center gap-2 flex-1 py-3 bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-700 hover:via-pink-700 hover:to-indigo-700 dark:from-indigo-600 dark:via-violet-600 dark:to-indigo-500 rounded-lg text-white font-semibold transition-all"
                      >
                        <Music className="h-5 w-5" />
                        <span>
                          Écouter sur{" "}
                          <span translate="no" className="notranslate">
                            Verso Air
                          </span>
                        </span>
                      </Link>
                    </div>
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

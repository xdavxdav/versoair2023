import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollToTop from "@/components/ScrollToTop";
import AuthModal from "@/components/AuthModal";
import ViewOnlyGate from "@/components/ViewOnlyGate";
import {
  Search,
  Heart,
  Share2,
  MessageCircle,
  Filter,
  X,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Grid3X3,
  List,
  ChevronDown,
  Star,
  Eye,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Users,
  Palette,
  Home as HomeIcon,
  Briefcase,
  Car,
  Dumbbell,
  Smartphone,
  Music,
  Shirt,
  Sparkles,
  Sun,
  Moon,
  Globe,
  Package,
  Camera,
  SlidersHorizontal,
  BadgeCheck,
} from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";

// ─── Artisan-focused categories (community, not dating) ───
const CATEGORIES = [
  {
    id: "all",
    label: "Browse All",
    icon: Grid3X3,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "handmade",
    label: "Handmade Art",
    icon: Palette,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "fashion",
    label: "Fashion & Textiles",
    icon: Shirt,
    color: "from-rose-500 to-red-500",
  },
  {
    id: "home",
    label: "Home & Living",
    icon: HomeIcon,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "instruments",
    label: "Instruments",
    icon: Music,
    color: "from-blue-500 to-indigo-500",
  },
  {
    id: "photography",
    label: "Photography",
    icon: Camera,
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "electronics",
    label: "Electronics",
    icon: Smartphone,
    color: "from-slate-500 to-gray-500",
  },
  {
    id: "vehicles",
    label: "Vehicles",
    icon: Car,
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "services",
    label: "Services",
    icon: Briefcase,
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "sports",
    label: "Sports & Outdoors",
    icon: Dumbbell,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "community",
    label: "Community Hub",
    icon: Users,
    color: "from-sky-500 to-cyan-500",
  },
];

// ─── Listings (populated from API / user submissions) ───
const generateListings = (): any[] => [];

// ─── Community activity feed (populated from real events) ───
const COMMUNITY_ACTIVITY: {
  user: string;
  action: string;
  time: string;
  avatar: string;
}[] = [];

// ─── Condition badge colors ───
const conditionStyle = (c: string) => {
  switch (c) {
    case "New":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Like New":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Very Good":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Good":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "Service":
      return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    case "Free":
      return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

// ═══════════════════════════════════════════════════
// MARKETPLACE PAGE
// ═══════════════════════════════════════════════════
export default function MarketplacePage() {
  // ═══ AUTH STATE (Blog Community gate) ═══
  // Reads localStorage so already-connected users skip the gate
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("blog_community_auth") === "true";
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("blog_community_user") || "User";
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Auth handlers — same flow as Blog community
  const handleAuthenticate = async (
    email: string,
    password: string,
    isSignUp: boolean,
  ) => {
    setIsAuthLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const name =
        email.split("@")[0].charAt(0).toUpperCase() +
        email.split("@")[0].slice(1);
      setUserName(name);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);

      // Persist blog community session
      localStorage.setItem("blog_community_auth", "true");
      localStorage.setItem("blog_community_user", name);

      console.log(isSignUp ? "Account created!" : "Logged in to Marketplace!");
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserName("User");
    // Clear persisted blog community session
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
  };

  // ═══ MARKETPLACE STATE ═══
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<
    "recent" | "price_low" | "price_high" | "popular"
  >("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  useScrollLock(showCreateListing || showMobileSidebar);

  // Dispatch event to hide BlogNavbar when create listing modal is open
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("marketplace-modal", {
        detail: { open: showCreateListing },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("marketplace-modal", { detail: { open: false } }),
      );
    };
  }, [showCreateListing]);

  const [listings] = useState(generateListings);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Theme classes
  const t = {
    bg: darkMode ? "bg-[#18191a]" : "bg-gray-100",
    bgCard: darkMode ? "bg-[#242526]" : "bg-white",
    bgHover: darkMode ? "hover:bg-[#3a3b3c]" : "hover:bg-gray-100",
    bgSidebar: darkMode ? "bg-[#242526]" : "bg-white",
    bgInput: darkMode ? "bg-[#3a3b3c]" : "bg-gray-100",
    text: darkMode ? "text-[#e4e6eb]" : "text-gray-900",
    textSecondary: darkMode ? "text-[#b0b3b8]" : "text-gray-600",
    textMuted: darkMode ? "text-[#8a8d91]" : "text-gray-400",
    border: darkMode ? "border-[#3a3b3c]" : "border-gray-200",
    accent: "text-cyan-500",
    accentBg: "bg-cyan-500",
    accentHover: "hover:bg-cyan-600",
  };

  // Filter & sort
  const filtered = listings
    .filter((item) => {
      const matchSearch =
        item.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().startsWith(searchQuery.toLowerCase());
      const matchCat =
        activeCategory === "all" || item.category === activeCategory;
      const matchPrice =
        item.price >= priceRange[0] && item.price <= priceRange[1];
      return matchSearch && matchCat && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === "price_low") return a.price - b.price;
      if (sortBy === "price_high") return b.price - a.price;
      if (sortBy === "popular") return b.views - a.views;
      return 0;
    });

  const toggleFav = (id: number) =>
    setFavorites((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const toggleSave = (id: number) =>
    setSaved((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowMobileSidebar(false);
        setShowCreateListing(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ═══ AUTH GATE: Block unauthenticated users ═══
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

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${t.bg} font-handstyle`}
    >
      <ScrollToTop />

      {/* ═══ MAIN LAYOUT: FB-STYLE 3 COLUMNS ═══ */}
      <div className="flex max-w-[1920px] mx-auto">
        {/* ═══════════════════════════════════════
            LEFT SIDEBAR — Categories + Filters
            ═══════════════════════════════════════ */}
        <aside
          className={`hidden lg:block w-[360px] flex-shrink-0 h-screen sticky top-0 overflow-y-auto ${t.bgSidebar} border-r ${t.border}`}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h1 className={`text-2xl font-bold ${t.text}`}>Marketplace</h1>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full ${t.bgInput} ${t.textSecondary} transition-colors`}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </motion.button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}`}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Marketplace…  /"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${t.bgInput} ${t.text} rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:text-cyan-500`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Create Listing Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateListing(true)}
              className={`w-full flex items-center justify-center gap-2 ${t.accentBg} text-white font-semibold py-3 rounded-xl mb-6 shadow-lg shadow-cyan-500/20 ${t.accentHover} transition-all`}
            >
              <Plus className="w-5 h-5" />
              Create New Listing
            </motion.button>

            {/* Categories */}
            <div className="mb-6">
              <h3
                className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} mb-3 px-1`}
              >
                Categories
              </h3>
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const Icon = cat.icon;
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? `bg-gradient-to-r ${cat.color} text-white shadow-md`
                          : `${t.textSecondary} ${t.bgHover}`
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive
                            ? "bg-white/20"
                            : `bg-gradient-to-br ${cat.color}`
                        }`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {cat.label}
                      {isActive && (
                        <motion.div
                          layoutId="activeCatDot"
                          className="ml-auto w-2 h-2 bg-white rounded-full"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="mb-6">
              <h3
                className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} mb-3 px-1`}
              >
                Price Range
              </h3>
              <div className={`${t.bgInput} rounded-xl p-4`}>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className={`text-xs ${t.textMuted} mb-1 block`}>
                      Min
                    </label>
                    <div
                      className={`flex items-center gap-1 ${t.bgCard} rounded-lg px-3 py-2 border ${t.border}`}
                    >
                      <DollarSign className={`w-3.5 h-3.5 ${t.textMuted}`} />
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        className={`w-full bg-transparent ${t.text} text-sm focus:outline-none`}
                      />
                    </div>
                  </div>
                  <div className={`flex items-end pb-2 ${t.textMuted}`}>—</div>
                  <div className="flex-1">
                    <label className={`text-xs ${t.textMuted} mb-1 block`}>
                      Max
                    </label>
                    <div
                      className={`flex items-center gap-1 ${t.bgCard} rounded-lg px-3 py-2 border ${t.border}`}
                    >
                      <DollarSign className={`w-3.5 h-3.5 ${t.textMuted}`} />
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        className={`w-full bg-transparent ${t.text} text-sm focus:outline-none`}
                      />
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], Number(e.target.value)])
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div>
              <h3
                className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} mb-3 px-1`}
              >
                Quick Filters
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: "Free Items",
                    icon: Sparkles,
                    color: "text-pink-400",
                  },
                  {
                    label: "Verified Sellers",
                    icon: BadgeCheck,
                    color: "text-blue-400",
                  },
                  { label: "Nearby", icon: MapPin, color: "text-emerald-400" },
                  {
                    label: "Trending",
                    icon: TrendingUp,
                    color: "text-cyan-400",
                  },
                ].map((f) => (
                  <motion.button
                    key={f.label}
                    whileHover={{ x: 4 }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${t.textSecondary} ${t.bgHover} transition-all`}
                  >
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                    {f.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════
            CENTER — Main Feed
            ═══════════════════════════════════════ */}
        <main className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className={`sticky top-0 z-30 ${t.bgCard} border-b ${t.border}`}>
            <div className="px-4 lg:px-6 py-3">
              <div className="flex items-center gap-3">
                {/* Mobile menu toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMobileSidebar(true)}
                  className={`lg:hidden p-2 rounded-xl ${t.bgInput} ${t.textSecondary}`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </motion.button>

                {/* Mobile search */}
                <div className="lg:hidden flex-1 relative">
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}`}
                  />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full ${t.bgInput} ${t.text} rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                  />
                </div>

                {/* Results count */}
                <div
                  className={`hidden lg:flex items-center gap-2 ${t.textSecondary} text-sm`}
                >
                  <Package className="w-4 h-4" />
                  <span>
                    <strong className={t.text}>{filtered.length}</strong>{" "}
                    listings
                  </span>
                  {activeCategory !== "all" && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-500 rounded-full text-xs font-medium">
                      {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                      <button
                        onClick={() => setActiveCategory("all")}
                        className="ml-1.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex-1" />

                {/* Sort */}
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${t.bgInput} ${t.textSecondary} ${t.bgHover} transition-all`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {sortBy === "recent"
                        ? "Most Recent"
                        : sortBy === "price_low"
                          ? "Price: Low"
                          : sortBy === "price_high"
                            ? "Price: High"
                            : "Popular"}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </motion.button>
                  <AnimatePresence>
                    {showSortMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className={`absolute right-0 top-full mt-2 w-48 ${t.bgCard} rounded-xl shadow-2xl border ${t.border} overflow-hidden z-50`}
                      >
                        {(
                          [
                            { id: "recent", label: "Most Recent" },
                            { id: "popular", label: "Most Popular" },
                            { id: "price_low", label: "Price: Low to High" },
                            { id: "price_high", label: "Price: High to Low" },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSortBy(s.id);
                              setShowSortMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                              sortBy === s.id
                                ? `${t.accent} bg-cyan-500/10 font-medium`
                                : `${t.textSecondary} ${t.bgHover}`
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* View mode */}
                <div
                  className={`hidden sm:flex items-center ${t.bgInput} rounded-xl overflow-hidden`}
                >
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 transition-all ${viewMode === "grid" ? `${t.accentBg} text-white` : t.textMuted}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 transition-all ${viewMode === "list" ? `${t.accentBg} text-white` : t.textMuted}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Theme toggle (mobile) */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDarkMode(!darkMode)}
                  className={`lg:hidden p-2 rounded-xl ${t.bgInput} ${t.textSecondary}`}
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* ═══ LISTINGS GRID ═══ */}
          <div className="px-4 lg:px-6 py-6">
            {filtered.length > 0 ? (
              <motion.div
                layout
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-3"
                }
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        delay: idx * 0.04,
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      onMouseEnter={() => setHoveredCard(item.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className={
                        viewMode === "list"
                          ? `flex gap-4 ${t.bgCard} rounded-2xl p-3 border ${t.border} hover:border-cyan-500/40 ${t.bgHover} transition-all cursor-pointer`
                          : ""
                      }
                    >
                      {viewMode === "grid" ? (
                        /* ═══ GRID CARD ═══ */
                        <div
                          className={`group ${t.bgCard} rounded-2xl overflow-hidden border ${t.border} hover:border-cyan-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10`}
                        >
                          {/* Image */}
                          <div className="relative aspect-square overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            {/* Overlay on hover */}
                            <motion.div
                              initial={false}
                              animate={{
                                opacity: hoveredCard === item.id ? 1 : 0,
                              }}
                              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3"
                            >
                              <div className="flex gap-2 w-full">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="flex-1 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-xl hover:bg-cyan-700 transition-colors"
                                >
                                  View Details
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSave(item.id);
                                  }}
                                  className="p-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors"
                                >
                                  {saved.includes(item.id) ? (
                                    <BookmarkCheck className="w-5 h-5 text-cyan-400" />
                                  ) : (
                                    <Bookmark className="w-5 h-5" />
                                  )}
                                </motion.button>
                              </div>
                            </motion.div>
                            {/* Top badges */}
                            <div className="absolute top-3 left-3 flex gap-2">
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm ${conditionStyle(item.condition)}`}
                              >
                                {item.condition}
                              </span>
                            </div>
                            {/* Fav */}
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFav(item.id);
                              }}
                              className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors"
                            >
                              <Heart
                                className={`w-4 h-4 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-white"}`}
                              />
                            </motion.button>
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            {/* Price */}
                            <p className={`text-xl font-bold ${t.text} mb-1`}>
                              {item.price === 0 ? (
                                <span className="text-pink-500">Free</span>
                              ) : (
                                <>${item.price.toLocaleString()}</>
                              )}
                            </p>
                            {/* Title */}
                            <h3
                              className={`text-sm ${t.textSecondary} line-clamp-2 mb-2`}
                            >
                              {item.title}
                            </h3>
                            {/* Location & time */}
                            <div
                              className={`flex items-center gap-1.5 text-xs ${t.textMuted}`}
                            >
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{item.location}</span>
                              <span className="mx-1">·</span>
                              <Clock className="w-3 h-3" />
                              <span>{item.posted}</span>
                            </div>
                            {/* Stats */}
                            <div
                              className={`flex items-center gap-3 mt-3 pt-3 border-t ${t.border} text-xs ${t.textMuted}`}
                            >
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {item.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {item.saves}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {item.messages}
                              </span>
                              {item.seller.verified && (
                                <span className="ml-auto flex items-center gap-1 text-blue-400">
                                  <BadgeCheck className="w-3.5 h-3.5" />{" "}
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ═══ LIST VIEW ROW ═══ */
                        <>
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0 py-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-lg font-bold ${t.text}`}>
                                  {item.price === 0 ? (
                                    <span className="text-pink-500">Free</span>
                                  ) : (
                                    <>${item.price.toLocaleString()}</>
                                  )}
                                </p>
                                <h3
                                  className={`text-sm ${t.textSecondary} line-clamp-1 mb-1`}
                                >
                                  {item.title}
                                </h3>
                                <p
                                  className={`text-xs ${t.textMuted} line-clamp-2 mb-2`}
                                >
                                  {item.description}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => toggleFav(item.id)}
                                  className={`p-2 rounded-full ${t.bgInput}`}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : t.textMuted}`}
                                  />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => toggleSave(item.id)}
                                  className={`p-2 rounded-full ${t.bgInput}`}
                                >
                                  {saved.includes(item.id) ? (
                                    <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                                  ) : (
                                    <Bookmark
                                      className={`w-4 h-4 ${t.textMuted}`}
                                    />
                                  )}
                                </motion.button>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-3 text-xs ${t.textMuted}`}
                            >
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.location}
                              </span>
                              <span>·</span>
                              <span
                                className={`px-2 py-0.5 rounded-full border ${conditionStyle(item.condition)} text-xs`}
                              >
                                {item.condition}
                              </span>
                              {item.seller.verified && (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <BadgeCheck className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div
                  className={`w-20 h-20 rounded-full ${t.bgInput} flex items-center justify-center mb-4`}
                >
                  <Search className={`w-8 h-8 ${t.textMuted}`} />
                </div>
                <p className={`text-lg font-semibold ${t.text} mb-1`}>
                  {listings.length === 0
                    ? "Marketplace is ready!"
                    : "No listings found"}
                </p>
                <p className={`text-sm ${t.textMuted} mb-4`}>
                  {listings.length === 0
                    ? "Be the first to create a listing and start the community."
                    : "Try adjusting your filters or search query"}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (listings.length === 0) {
                      setShowCreateListing(true);
                    } else {
                      setActiveCategory("all");
                      setSearchQuery("");
                      setPriceRange([0, 5000]);
                    }
                  }}
                  className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-colors"
                >
                  {listings.length === 0
                    ? "Create First Listing"
                    : "Clear All Filters"}
                </motion.button>
              </motion.div>
            )}
          </div>
        </main>

        {/* ═══════════════════════════════════════
            RIGHT SIDEBAR — Community + Activity
            ═══════════════════════════════════════ */}
        <aside
          className={`hidden xl:block w-[320px] flex-shrink-0 h-screen sticky top-0 overflow-y-auto border-l ${t.border}`}
        >
          <div className="p-4 space-y-4">
            {/* Community Connections */}
            <div className={`${t.bgCard} rounded-2xl p-4 border ${t.border}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className={`font-bold ${t.text}`}>Community Hub</h3>
              </div>
              <p className={`text-xs ${t.textMuted} mb-3`}>
                Connect with fellow artisans and creators in your area
              </p>
              <div className="space-y-3">
                {COMMUNITY_ACTIVITY.map((act, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center gap-3 p-2 rounded-xl ${t.bgHover} transition-colors cursor-pointer`}
                  >
                    <img
                      src={act.avatar}
                      alt={act.user}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-500/20"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.text}`}>
                        <strong>{act.user}</strong>{" "}
                        <span className={t.textMuted}>{act.action}</span>
                      </p>
                      <p className={`text-xs ${t.textMuted}`}>{act.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                className={`w-full mt-3 py-2.5 rounded-xl text-sm font-medium ${t.bgInput} ${t.textSecondary} ${t.bgHover} transition-all`}
              >
                View All Activity
              </motion.button>
            </div>

            {/* Artisan Spotlight */}
            <div className={`${t.bgCard} rounded-2xl p-4 border ${t.border}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className={`font-bold ${t.text}`}>Artisan Spotlight</h3>
              </div>
              <div className="space-y-3">
                {listings.length > 0 ? (
                  listings.slice(0, 3).map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ x: 4 }}
                      className={`flex items-center gap-3 p-2 rounded-xl ${t.bgHover} cursor-pointer transition-all`}
                    >
                      <img
                        src={item.seller.avatar}
                        alt={item.seller.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${t.text} flex items-center gap-1`}
                        >
                          {item.seller.name}
                          {item.seller.verified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </p>
                        <p className={`text-xs ${t.textMuted}`}>
                          Member since {item.seller.memberSince}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                        <span
                          className={`text-xs font-medium ${t.textSecondary}`}
                        >
                          {item.seller.rating}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className={`text-xs ${t.textMuted} text-center py-4`}>
                    Artisan spotlight will appear as sellers join the
                    marketplace.
                  </p>
                )}
              </div>
            </div>

            {/* Verso Air Info Card */}
            <div className="bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-2xl p-4 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-cyan-500" />
                <h3 className={`font-bold ${t.text}`}>Verso Air Marketplace</h3>
              </div>
              <p className={`text-xs ${t.textMuted} mb-3`}>
                A trusted space for artisans to share their craft, connect with
                their community, and grow together.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  {
                    label: "Artisans",
                    value:
                      listings.filter((l) => l.seller?.verified).length || "—",
                  },
                  { label: "Listings", value: listings.length || "—" },
                  { label: "Categories", value: CATEGORIES.length - 1 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`${t.bgCard} rounded-xl py-2`}
                  >
                    <p className={`text-sm font-bold ${t.accent}`}>
                      {stat.value}
                    </p>
                    <p className={`text-[10px] ${t.textMuted}`}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ MOBILE SIDEBAR OVERLAY ═══ */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`fixed left-0 top-0 bottom-0 w-[320px] ${t.bgSidebar} z-50 overflow-y-auto shadow-2xl`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold ${t.text}`}>Filters</h2>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowMobileSidebar(false)}
                    className={`p-2 rounded-full ${t.bgInput}`}
                  >
                    <X className={`w-5 h-5 ${t.textSecondary}`} />
                  </motion.button>
                </div>

                {/* Categories */}
                <div className="space-y-1 mb-6">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setShowMobileSidebar(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? `bg-gradient-to-r ${cat.color} text-white`
                            : `${t.textSecondary} ${t.bgHover}`
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-white/20" : `bg-gradient-to-br ${cat.color}`}`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <h3
                    className={`text-xs font-bold uppercase ${t.textMuted} mb-3`}
                  >
                    Price Range
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([Number(e.target.value), priceRange[1]])
                      }
                      placeholder="Min"
                      className={`flex-1 ${t.bgInput} ${t.text} rounded-lg px-3 py-2 text-sm focus:outline-none`}
                    />
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value)])
                      }
                      placeholder="Max"
                      className={`flex-1 ${t.bgInput} ${t.text} rounded-lg px-3 py-2 text-sm focus:outline-none`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ CREATE LISTING MODAL ═══ */}
      <AnimatePresence>
        {showCreateListing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateListing(false)}
              className="fixed inset-0 bg-black/60 z-[70] backdrop-blur-md"
            />
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.05}
              initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              style={{ top: "50%", left: "50%" }}
              className={`fixed z-[70] w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] md:w-[440px] max-h-[calc(100vh-2rem)] ${t.bgCard} rounded-2xl shadow-2xl border ${t.border} flex flex-col`}
            >
              {/* Header — drag handle */}
              <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 shrink-0 cursor-grab active:cursor-grabbing select-none">
                <div>
                  <h2 className={`text-base font-bold ${t.text}`}>
                    New Listing
                  </h2>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>
                    Share with the community · drag to move
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowCreateListing(false)}
                  className={`p-1.5 rounded-full ${t.bgInput} hover:opacity-80 transition-opacity`}
                >
                  <X className={`w-4 h-4 ${t.textSecondary}`} />
                </motion.button>
              </div>

              <div className={`mx-4 sm:mx-5 border-t ${t.border}`} />

              {/* Scrollable form */}
              <div className="px-4 sm:px-5 py-4 space-y-3.5 overflow-y-auto overscroll-contain flex-1 min-h-0">
                <div>
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted} block mb-1.5`}
                  >
                    Title
                  </label>
                  <input
                    className={`w-full ${t.bgInput} ${t.text} rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-shadow`}
                    placeholder="What are you selling?"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <label
                      className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted} block mb-1.5`}
                    >
                      Price
                    </label>
                    <div
                      className={`flex items-center gap-2 ${t.bgInput} rounded-lg px-3.5 py-2`}
                    >
                      <DollarSign
                        className={`w-3.5 h-3.5 shrink-0 ${t.textMuted}`}
                      />
                      <input
                        className={`flex-1 bg-transparent ${t.text} text-sm focus:outline-none w-0`}
                        placeholder="0.00"
                        type="number"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label
                      className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted} block mb-1.5`}
                    >
                      Category
                    </label>
                    <select
                      className={`w-full ${t.bgInput} ${t.text} rounded-lg px-3.5 py-2 text-sm focus:outline-none cursor-pointer`}
                    >
                      {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted} block mb-1.5`}
                  >
                    Description
                  </label>
                  <textarea
                    rows={2}
                    className={`w-full ${t.bgInput} ${t.text} rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none transition-shadow`}
                    placeholder="Describe your item…"
                  />
                </div>

                <div>
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted} block mb-1.5`}
                  >
                    Photos
                  </label>
                  <div
                    className={`border border-dashed ${t.border} rounded-lg p-4 text-center cursor-pointer ${t.bgHover} transition-colors group`}
                  >
                    <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                      <Camera className="w-4 h-4 text-cyan-500" />
                    </div>
                    <p className={`text-xs font-medium ${t.textSecondary}`}>
                      Tap to add photos
                    </p>
                    <p className={`text-[10px] ${t.textMuted} mt-0.5`}>
                      Up to 10 · JPG, PNG
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer — always visible */}
              <div
                className={`px-4 sm:px-5 py-3 border-t ${t.border} shrink-0`}
              >
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold py-2.5 rounded-xl hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/15"
                >
                  Publish Listing
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE FAB ═══ */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowCreateListing(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-cyan-600 text-white rounded-full shadow-xl shadow-cyan-500/30 flex items-center justify-center hover:bg-cyan-700 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

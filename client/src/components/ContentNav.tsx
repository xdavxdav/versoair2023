/**
 * ContentNav — Island nav for content/hub pages.
 * - Cyan glow on active & hover
 * - Hide on scroll-down, reveal on scroll-up
 * - Marketplace-focused route groups
 * - Smart search (People · Merch · Posts · Videos)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import QuickSignIn from "@/components/QuickSignIn";
import {
  Home,
  BookOpen,
  ShoppingBag,
  Store,
  Package,
  Search,
  X,
  LogOut,
  ChevronDown,
  Users,
  Briefcase,
  Palette,
  LifeBuoy,
  UserCircle2,
  FileText,
  Play,
  Tag,
  Loader2,
} from "lucide-react";

// ─── Route matching ────────────────────────────────────────────────────────

const PREFIXES = [
  "/blog",
  "/marketplace",
  "/services",
  "/marketing",
  "/artisans",
  "/artisan-workshops",
  "/programs",
  "/communities",
  "/community",
  "/contracts",
  "/tickets",
];

export function isContentNavPath(path: string): boolean {
  return PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

// ─── Shared style tokens ───────────────────────────────────────────────────

const BASE =
  "flex items-center gap-1.5 px-3 py-1.5 md:max-lg:gap-1 md:max-lg:px-1 md:max-lg:text-[10px] rounded-full text-[11px] font-medium border border-transparent whitespace-nowrap transition-all duration-200 flex-shrink-0 text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/[0.07] hover:border-cyan-500/20 hover:shadow-[0_0_10px_rgba(34,211,238,0.08)]";

const ACTIVE =
  "flex items-center gap-1.5 px-3 py-1.5 md:max-lg:gap-1 md:max-lg:px-1 md:max-lg:text-[10px] rounded-full text-[11px] font-medium border whitespace-nowrap transition-all duration-200 flex-shrink-0 bg-cyan-500/10 text-cyan-300 border-cyan-500/25 shadow-[0_0_12px_rgba(34,211,238,0.12)]";

// ─── Desktop pill items ────────────────────────────────────────────────────

const PILLS = [
  { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  {
    href: "/blog",
    label: "Blog",
    Icon: BookOpen,
    match: (p: string) => p === "/blog" || p.startsWith("/blog/"),
  },
  {
    href: "/marketplace",
    label: "Shop",
    Icon: ShoppingBag,
    match: (p: string) => p === "/marketplace" || p.startsWith("/marketplace/"),
  },
  {
    href: "/sell",
    label: "Sell",
    Icon: Store,
    match: (p: string) => p.startsWith("/sell"),
  },
];

// ─── Dropdown groups (marketplace-focused) ────────────────────────────────

const GROUPS = [
  {
    key: "discover",
    label: "Discover",
    Icon: Users,
    match: (p: string) =>
      p.startsWith("/artistes") ||
      p.startsWith("/artisans") ||
      p.startsWith("/businesses") ||
      p.startsWith("/artist-catalogue"),
    items: [
      { href: "/artistes", label: "Artist Profiles" },
      { href: "/artisans", label: "Artisans" },
      { href: "/businesses-directory", label: "Business Directory" },
      { href: "/artist-catalogue", label: "Artist Catalogues" },
      { href: "/communities", label: "Communities" },
    ],
  },
  {
    key: "play",
    label: "Play",
    Icon: Play,
    match: (p: string) =>
      p.startsWith("/stream") ||
      p.startsWith("/arcade") ||
      p.startsWith("/arena") ||
      p.startsWith("/library"),
    items: [
      { href: "/stream", label: "🎵 Stream Music" },
      { href: "/arcade", label: "🎮 Arcade (PvP)" },
      { href: "/arena", label: "🏆 Arena Contests" },
      { href: "/library", label: "📚 My Library" },
    ],
  },
  {
    key: "create",
    label: "Create",
    Icon: Palette,
    match: (p: string) =>
      p.startsWith("/contracts") ||
      p.startsWith("/artisan-workshops") ||
      p.startsWith("/marketing") ||
      p.startsWith("/programs"),
    items: [
      { href: "/contracts", label: "Contracts" },
      { href: "/artisan-workshops", label: "Workshops" },
      { href: "/programs", label: "Programs" },
      { href: "/marketing", label: "Marketing Hub" },
      { href: "/marketing/print", label: "Print Services" },
    ],
  },
  {
    key: "services",
    label: "Services",
    Icon: Briefcase,
    match: (p: string) =>
      p.startsWith("/services") ||
      p.startsWith("/reservations") ||
      p.startsWith("/tickets"),
    items: [
      { href: "/services/careers", label: "Careers" },
      { href: "/services/contractors", label: "Contractors" },
      { href: "/reservations", label: "Reservations" },
      { href: "/tickets", label: "Tickets" },
      { href: "/services/news", label: "News" },
    ],
  },
  {
    key: "help",
    label: "Help",
    Icon: LifeBuoy,
    match: (p: string) => p.startsWith("/sav") || p.startsWith("/versoai"),
    items: [
      { href: "/sav", label: "SAV 24/7" },
      { href: "/versoai", label: "VersoAI" },
      { href: "/help", label: "Help Center" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

// ─── Mobile dock tabs ──────────────────────────────────────────────────────

const DOCK = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/blog", label: "Blog", Icon: BookOpen },
  { href: "/marketplace", label: "Shop", Icon: ShoppingBag },
  { href: "/sell", label: "Sell", Icon: Store, action: "sell" },
  { href: "/orders", label: "Orders", Icon: Package },
];

// ─── Smart Search ──────────────────────────────────────────────────────────

type SearchTab = "people" | "merch" | "posts" | "videos";

const SEARCH_TABS: {
  key: SearchTab;
  label: string;
  Icon: typeof UserCircle2;
}[] = [
  { key: "people", label: "People", Icon: UserCircle2 },
  { key: "merch", label: "Merch", Icon: Tag },
  { key: "posts", label: "Posts", Icon: FileText },
  { key: "videos", label: "Videos", Icon: Play },
];

interface SearchResult {
  id: string | number;
  title: string;
  subtitle?: string;
  href: string;
}

function SmartSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("people");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoints: Record<SearchTab, string> = {
          // artistsRouter exposes /search (param: `query`) — there is no
          // GET /api/artists collection route, so the bare path 404s.
          people: `/api/artists/search?query=${encodeURIComponent(query)}&limit=6`,
          merch: `/api/businesses?search=${encodeURIComponent(query)}&limit=6`,
          posts: `/api/social/posts?search=${encodeURIComponent(query)}&limit=6`,
          videos: `/api/tracks?search=${encodeURIComponent(query)}&limit=6`,
        };
        const res = await fetch(endpoints[tab]);
        const data = await res.json();
        const raw: any[] =
          data.data ??
          data.artists ??
          data.tracks ??
          data.businesses ??
          data.posts ??
          [];
        setResults(
          raw.map((item) => ({
            id: item.id,
            title: item.name ?? item.title ?? item.stage_name ?? "—",
            subtitle:
              item.genre ??
              item.category ??
              (item.description ?? "").slice(0, 60),
            href:
              tab === "people"
                ? `/artist-catalogue/${item.id}`
                : tab === "merch"
                  ? `/business/${item.id}`
                  : tab === "videos"
                    ? `/track/${item.id}`
                    : "/blog",
          })),
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query, tab]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center pt-16 px-4"
      style={{ background: "rgba(4,2,10,0.92)", backdropFilter: "blur(24px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: -24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-lg"
      >
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/60" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, merch, posts, videos..."
            className="w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm text-white placeholder:text-slate-500 outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(34,211,238,0.2)",
              boxShadow: "0 0 20px rgba(34,211,238,0.06)",
            }}
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex gap-1 mb-3 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {SEARCH_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
                tab === key
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            results.map((r) => (
              <Link key={r.id} href={r.href}>
                <a
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    {tab === "people" && (
                      <UserCircle2 className="h-4 w-4 text-cyan-400" />
                    )}
                    {tab === "merch" && (
                      <Tag className="h-4 w-4 text-cyan-400" />
                    )}
                    {tab === "posts" && (
                      <FileText className="h-4 w-4 text-cyan-400" />
                    )}
                    {tab === "videos" && (
                      <Play className="h-4 w-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {r.subtitle}
                      </p>
                    )}
                  </div>
                </a>
              </Link>
            ))
          ) : query.trim() ? (
            <p className="text-center text-slate-600 text-sm py-10">
              No results found
            </p>
          ) : (
            <p className="text-center text-slate-600 text-sm py-10">
              Start typing to search...
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function ContentNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuthContext();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [audioPlayerVisible, setAudioPlayerVisible] = useState(false);
  const [showQuickSignIn, setShowQuickSignIn] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);
  const holdCompletedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdCountdown, setHoldCountdown] = useState(3); // 3 second countdown
  const [showTip, setShowTip] = useState(
    () => !localStorage.getItem("contentnav_tip_seen"),
  );

  // Home button gestures:
  // - Single tap → /marketplace (unified timeline like Twitter)
  // - Double tap → /blog
  // - Hold 3s → / (home.tsx) with full-screen darkening countdown
  const handleHomeTap = useCallback(() => {
    if (holdCompletedRef.current) {
      holdCompletedRef.current = false;
      return;
    }
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      const count = tapCountRef.current;
      tapCountRef.current = 0;
      if (count >= 2) {
        // Double tap → /blog
        setLocation("/blog");
      } else {
        // Single tap → /marketplace (or scroll to top if already there)
        if (location === "/marketplace") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          window.dispatchEvent(new CustomEvent("marketplace:refresh"));
        } else {
          setLocation("/marketplace");
        }
      }
    }, 300);
  }, [location, setLocation]);

  const handleSellTap = useCallback(() => {
    if (location !== "/marketplace") {
      setLocation("/marketplace");
      // slight delay so page mounts before the event fires
      setTimeout(
        () => window.dispatchEvent(new CustomEvent("marketplace:sell")),
        120,
      );
    } else {
      window.dispatchEvent(new CustomEvent("marketplace:sell"));
    }
  }, [location, setLocation]);

  useEffect(() => {
    if (!showTip) return;
    const t = setTimeout(() => {
      setShowTip(false);
      localStorage.setItem("contentnav_tip_seen", "1");
    }, 4000);
    return () => clearTimeout(t);
  }, [showTip]);

  // Listen for audio player visibility to shift dock up
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAudioPlayerVisible(!!detail?.visible);
    };
    window.addEventListener("audio-player-state", handler);
    return () => window.removeEventListener("audio-player-state", handler);
  }, []);

  const isAuth =
    !!user || localStorage.getItem("blog_community_auth") === "true";
  const userName =
    user?.email?.split("@")[0] ??
    localStorage.getItem("blog_community_user") ??
    "User";

  // Check if we're on an auth page (hide sign in button)
  const isOnAuthPage =
    location.startsWith("/auth") ||
    location.startsWith("/artist-portal-signin") ||
    location.startsWith("/admin/login");

  const handleLogout = () => {
    logout();
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
    toast({
      title: "Successfully logged out",
      description: "You've been disconnected.",
    });
    // Stay on the current portal page
    setLocation("/marketplace");
  };

  // Hold 3 seconds → navigate to home with full-screen darkening effect
  const handlePressStart = useCallback(() => {
    holdCompletedRef.current = false;
    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);
    setHoldCountdown(3);
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / 3000) * 100, 100); // 3 seconds
      setHoldProgress(progress);
      setHoldCountdown(Math.max(0, Math.ceil(3 - elapsed / 1000)));
    }, 50);
    holdTimerRef.current = setTimeout(() => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setIsHolding(false);
      setHoldProgress(0);
      holdCompletedRef.current = true;
      // Auth-aware: sign out if logged in, redirect to login if not
      if (isAuth) {
        handleLogout();
      } else {
        setLocation("/auth/signin");
      }
    }, 3000);
  }, [setLocation, isAuth, handleLogout]);

  const handlePressEnd = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < 60) {
        setVisible(true);
      } else if (y > lastScrollY.current + 8) {
        setVisible(false);
        setOpenGroup(null);
      } else if (y < lastScrollY.current - 8) {
        setVisible(true);
      }
      lastScrollY.current = y;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const dockY = visible ? 0 : 120;

  return (
    <>
      {/* ═══ Full-screen darkening overlay during hold countdown ═══ */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: (holdProgress / 100) * 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(0, 0, 0, 0.95)" }}
          >
            {/* Countdown circle */}
            <div className="relative flex flex-col items-center gap-4">
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Background ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                {/* Progress ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#holdGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - holdProgress / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
                <defs>
                  <linearGradient
                    id="holdGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Countdown number */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <span className="text-5xl font-bold text-white tabular-nums">
                  {holdCountdown}
                </span>
              </motion.div>
              {/* Label */}
              <p className="text-white/60 text-sm font-medium tracking-wide">
                Retour à l'accueil...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ DESKTOP ════════════════════════════════════════════════════ */}
      <div
        className={`hidden md:block fixed left-0 right-0 z-50 pointer-events-none transition-all duration-300 ${audioPlayerVisible ? "bottom-[68px]" : "bottom-0"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <motion.div
          animate={{ y: dockY, opacity: visible ? 1 : 0 }}
          initial={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="content-nav-dock pointer-events-auto mx-auto mb-4 flex max-w-[96vw] items-center justify-start gap-0.5 overflow-x-auto px-2 py-2 scrollbar-hide"
          style={{
            background: "rgba(6, 3, 14, 0.97)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "999px",
            boxShadow:
              "0 24px 64px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 0 30px rgba(34,211,238,0.04)",
          }}
        >
          {/* ── Home pill with tap/hold (replaces logo) ── */}
          <div className="relative flex-shrink-0">
            {isHolding && (
              <svg
                className="absolute pointer-events-none z-10"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: "40px",
                  height: "40px",
                }}
                viewBox="0 0 40 40"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="rgba(34,211,238,0.15)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 17}`}
                  strokeDashoffset={`${2 * Math.PI * 17 * (1 - holdProgress / 100)}`}
                  transform="rotate(-90 20 20)"
                />
              </svg>
            )}
            <motion.button
              onClick={handleHomeTap}
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onContextMenu={(e) => e.preventDefault()}
              className={location === "/" ? ACTIVE : BASE}
              title="Tap=Marketplace · Double-tap=Blog · Hold 3s=Home"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </motion.button>
          </div>

          <div className="h-4 w-px bg-white/[0.07] mx-0.5 flex-shrink-0" />

          {/* ── Direct pills (Blog, Shop, Sell) ── */}
          {PILLS.filter((p) => p.href !== "/").map(
            ({ href, label, Icon, match }) => (
              <Link key={href} href={href}>
                <a className={match(location) ? ACTIVE : BASE}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </a>
              </Link>
            ),
          )}

          <div className="h-4 w-px bg-white/[0.07] mx-0.5 flex-shrink-0" />

          {/* ── Dropdown groups (Discover, Create, Services) ── */}
          {GROUPS.filter((g) => g.key !== "help").map((group) => {
            const active = group.match(location);
            const isOpen = openGroup === group.key;
            return (
              <div
                key={group.key}
                className="relative flex-shrink-0"
                onMouseEnter={() => setOpenGroup(group.key)}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <button className={active || isOpen ? ACTIVE : BASE}>
                  <group.Icon className="h-3.5 w-3.5" />
                  {group.label}
                  <ChevronDown
                    className={`content-nav-chevron h-3 w-3 opacity-50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-48"
                      style={{
                        background: "rgba(8,5,18,0.98)",
                        backdropFilter: "blur(28px)",
                        border: "1px solid rgba(34,211,238,0.1)",
                        borderRadius: "16px",
                        boxShadow:
                          "0 -8px 40px rgba(0,0,0,0.7), 0 0 20px rgba(34,211,238,0.05)",
                        padding: "6px",
                        zIndex: 60,
                      }}
                    >
                      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-1" />
                      {group.items.map(({ href, label }) => (
                        <Link key={href} href={href}>
                          <a className="flex items-center px-3 py-2 text-[11px] text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/[0.07] rounded-xl transition-all duration-150">
                            {label}
                          </a>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="h-4 w-px bg-white/[0.07] mx-0.5 flex-shrink-0" />

          <button onClick={() => setSearchOpen(true)} className={BASE}>
            <Search className="h-3.5 w-3.5" />
            Search
          </button>

          <div className="h-4 w-px bg-white/[0.07] mx-0.5 flex-shrink-0" />

          {/* ── Help dropdown (always visible at corner) ── */}
          {(() => {
            const helpGroup = GROUPS.find((g) => g.key === "help")!;
            const helpActive = helpGroup.match(location);
            const helpOpen = openGroup === "help";
            return (
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => setOpenGroup("help")}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <button className={helpActive || helpOpen ? ACTIVE : BASE}>
                  <LifeBuoy className="h-3.5 w-3.5" />
                  Help
                  <ChevronDown
                    className={`content-nav-chevron h-3 w-3 opacity-50 transition-transform duration-200 ${helpOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {helpOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="absolute bottom-full right-0 mb-2.5 w-44"
                      style={{
                        background: "rgba(8,5,18,0.98)",
                        backdropFilter: "blur(28px)",
                        border: "1px solid rgba(34,211,238,0.1)",
                        borderRadius: "16px",
                        boxShadow:
                          "0 -8px 40px rgba(0,0,0,0.7), 0 0 20px rgba(34,211,238,0.05)",
                        padding: "6px",
                        zIndex: 60,
                      }}
                    >
                      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-1" />
                      {helpGroup.items.map(({ href, label }) => (
                        <Link key={href} href={href}>
                          <a className="flex items-center px-3 py-2 text-[11px] text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/[0.07] rounded-xl transition-all duration-150">
                            {label}
                          </a>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          <div className="h-4 w-px bg-white/[0.07] mx-0.5 flex-shrink-0" />

          {isAuth ? (
            <>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 md:max-lg:gap-1 md:max-lg:px-1 md:max-lg:text-[10px] rounded-full text-[11px] text-slate-400 flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="max-w-[72px] truncate md:max-lg:hidden">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 md:max-lg:p-1 rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : !isOnAuthPage ? (
            <button
              onClick={() => setShowQuickSignIn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(34,211,238,0.12))",
                border: "1px solid rgba(99,179,237,0.35)",
                color: "#7dd3fc",
                boxShadow:
                  "0 0 12px rgba(59,130,246,0.25), 0 0 20px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                textShadow: "0 0 8px rgba(125,211,252,0.5)",
              }}
            >
              <UserCircle2
                className="h-3.5 w-3.5"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(125,211,252,0.6))",
                }}
              />
              Sign In
            </button>
          ) : null}
        </motion.div>
      </div>

      {/* ══ MOBILE ═════════════════════════════════════════════════════ */}
      <div
        className={`md:hidden fixed left-0 right-0 z-50 pointer-events-none transition-all duration-300 ${audioPlayerVisible ? "bottom-[68px]" : "bottom-0"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <motion.div
          animate={{ y: dockY, opacity: visible ? 1 : 0 }}
          initial={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="pointer-events-auto mx-4 mb-3 rounded-[22px] overflow-visible"
          style={{
            background: "rgba(6, 3, 14, 0.97)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 0 20px rgba(34,211,238,0.04)",
          }}
        >
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(34,211,238,0.15), transparent)",
            }}
          />

          <div className="flex items-center justify-around px-1 py-1.5">
            {DOCK.map((item) => {
              const isHome = item.href === "/";
              const isSell = (item as any).action === "sell";
              const active = isHome
                ? location === "/"
                : isSell
                  ? false
                  : location === item.href ||
                    location.startsWith(item.href + "/");

              const iconContent = (
                <>
                  {active && (
                    <motion.div
                      layoutId="dock-bg"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "rgba(34,211,238,0.10)" }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 38,
                      }}
                    />
                  )}
                  <motion.div
                    animate={
                      active ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }
                    }
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 22,
                    }}
                    className="relative"
                    style={{ color: active ? "#22d3ee" : "#475569" }}
                  >
                    {active && (
                      <div className="absolute inset-0 scale-[2.5] blur-lg opacity-25 bg-cyan-400" />
                    )}
                    <item.Icon className="h-[20px] w-[20px] relative" />
                  </motion.div>
                  <motion.span
                    animate={{ opacity: active ? 1 : 0.4 }}
                    className="text-[9px] font-semibold tracking-wide relative"
                    style={{ color: active ? "#22d3ee" : "#64748b" }}
                  >
                    {item.label}
                  </motion.span>
                  {active && (
                    <motion.div
                      layoutId="dock-dot"
                      className="h-[3px] w-3 rounded-full bg-cyan-400"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 38,
                      }}
                    />
                  )}
                </>
              );

              if (isHome) {
                return (
                  <div key="/" className="relative">
                    {isHolding && (
                      <svg
                        className="absolute pointer-events-none z-10"
                        style={{
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                          width: "54px",
                          height: "54px",
                        }}
                        viewBox="0 0 54 54"
                      >
                        <circle
                          cx="27"
                          cy="27"
                          r="23"
                          fill="none"
                          stroke="rgba(239,68,68,0.13)"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="27"
                          cy="27"
                          r="23"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 23}`}
                          strokeDashoffset={`${2 * Math.PI * 23 * (1 - holdProgress / 100)}`}
                          transform="rotate(-90 27 27)"
                        />
                      </svg>
                    )}
                    <motion.button
                      onClick={handleHomeTap}
                      onPointerDown={handlePressStart}
                      onPointerUp={handlePressEnd}
                      onPointerLeave={handlePressEnd}
                      onPointerCancel={handlePressEnd}
                      onContextMenu={(e) => e.preventDefault()}
                      whileTap={{ scale: 0.8 }}
                      transition={{
                        type: "spring",
                        stiffness: 600,
                        damping: 25,
                      }}
                      className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl select-none cursor-pointer"
                    >
                      {iconContent}
                    </motion.button>
                    <AnimatePresence>
                      {showTip && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-44 text-center pointer-events-auto"
                          style={{
                            background: "rgba(8,5,18,0.97)",
                            border: "1px solid rgba(34,211,238,0.2)",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            boxShadow:
                              "0 -4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(34,211,238,0.06)",
                            zIndex: 100,
                          }}
                          onClick={() => {
                            setShowTip(false);
                            localStorage.setItem("contentnav_tip_seen", "1");
                          }}
                        >
                          <p className="text-[10px] text-cyan-300 font-semibold leading-relaxed">
                            1× tap → Marketplace
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            2× tap → Home page
                          </p>
                          {isAuth && (
                            <p className="text-[10px] text-red-400/70 leading-relaxed">
                              Hold → Sign out
                            </p>
                          )}
                          <div
                            className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45"
                            style={{
                              background: "rgba(8,5,18,0.97)",
                              borderRight: "1px solid rgba(34,211,238,0.2)",
                              borderBottom: "1px solid rgba(34,211,238,0.2)",
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              if (isSell) {
                return (
                  <motion.button
                    key="sell"
                    onClick={handleSellTap}
                    whileTap={{ scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 600, damping: 25 }}
                    className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl select-none cursor-pointer"
                  >
                    {iconContent}
                  </motion.button>
                );
              }

              return (
                <Link key={item.href} href={item.href}>
                  <motion.a
                    whileTap={{ scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 600, damping: 25 }}
                    className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl select-none cursor-pointer"
                  >
                    {iconContent}
                  </motion.a>
                </Link>
              );
            })}

            <motion.button
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              onClick={() => setSearchOpen(true)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl select-none cursor-pointer"
            >
              <Search
                className="h-[20px] w-[20px]"
                style={{ color: "#475569" }}
              />
              <span className="text-[9px] font-semibold tracking-wide text-slate-600">
                Search
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ══ SEARCH OVERLAY ═════════════════════════════════════════════ */}
      <AnimatePresence>
        {searchOpen && <SmartSearch onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* ══ QUICK SIGN IN MODAL ═══════════════════════════════════════ */}
      <QuickSignIn
        open={showQuickSignIn}
        onClose={() => setShowQuickSignIn(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}

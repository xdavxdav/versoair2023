import { useState, useRef, useCallback, useEffect } from "react";
import {
  LogOut,
  Store,
  Headphones,
  ShoppingBag,
  ChevronDown,
  Home,
  LayoutDashboard,
  UserRound,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getDashboardDestination } from "@/lib/dashboard-routes";
import { HeaderMessagesButton } from "@/components/TwitterMessenger";

interface BlogNavbarProps {
  isAuthenticated?: boolean;
  userName?: string;
  onLogout?: () => void;
  onLogin?: () => void;
}

const navLinks = [
  { href: "/", label: "Home", icon: ShoppingBag },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/businesses-directory", label: "Annuaire", icon: Store },
  { href: "/sav", label: "SAV 24/7", icon: Headphones },
];

/* ── mobile quick-nav pills ── */
const MOBILE_PILLS = [
  {
    href: "/blog",
    label: "Blog",
    hover: "hover:text-cyan-300 hover:bg-cyan-500/10",
  },
  {
    href: "/stream",
    label: "🎵",
    hover: "hover:text-cyan-300 hover:bg-cyan-500/10",
  },
  {
    href: "/arcade",
    label: "🎮",
    hover: "hover:text-fuchsia-300 hover:bg-fuchsia-500/10",
  },
  {
    href: "/versoai",
    label: "AI",
    hover: "hover:text-cyan-300 hover:bg-cyan-500/10",
  },
];

const MOBILE_MENU_GROUPS = [
  {
    key: "ent",
    label: "Companies",
    items: [
      ["Health", "/sante"],
      ["Finance", "/finances"],
      ["Building", "/batiment"],
      ["Hospitality", "/hotellerie"],
      ["Automobile", "/automobile"],
      ["Trade", "/commerce"],
      ["Accommodation", "/logement"],
      ["Entertainment", "/divertissement"],
      ["Business Directory", "/businesses-directory"],
    ],
  },
  {
    key: "discover",
    label: "Discover",
    items: [
      ["Community Hub", "/hub"],
      ["Business Directory", "/businesses-directory"],
      ["Artisans", "/artisans"],
      ["Communities", "/communities"],
      ["Partners", "/partners"],
    ],
  },
  {
    key: "play",
    label: "Play",
    items: [
      ["Music Stream", "/stream"],
      ["Podcasts", "/podcast"],
      ["Library", "/music"],
      ["Arcade", "/arcade"],
    ],
  },
  {
    key: "svc",
    label: "Services",
    items: [
      ["All Services", "/services"],
      ["News & Updates", "/services/news"],
      ["Careers", "/services/careers"],
      ["Contractors", "/services/contractors"],
    ],
  },
  {
    key: "mkt",
    label: "Marketing",
    items: [
      ["Marketing Hub", "/marketing"],
      ["Free Ad Journal", "/marketing/journal"],
      ["Marketing Packs", "/marketing/packs"],
      ["Print Services", "/marketing/print"],
      ["Newsletter", "/marketing/newsletters"],
    ],
  },
  {
    key: "help",
    label: "Support",
    items: [
      ["24/7 Customer Service", "/sav"],
      ["VersoAI", "/versoai"],
    ],
  },
] as const;

/* ── shared dropdown style tokens ───────────────────────────── */
/* Responsive button with fluid scaling */
const BTN =
  "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap font-medium flex-shrink-0";
const PANEL =
  "absolute bottom-full bg-slate-950 overflow-hidden shadow-2xl shadow-black/60 rounded-xl pt-2 pb-2.5 opacity-0 invisible transition-all duration-200 z-[9999] border border-cyan-500/20";
const PANEL_OPEN = "opacity-100 !visible";
const ITEM =
  "block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors whitespace-nowrap";
const ITEM_HEAD =
  "block px-4 py-2 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg mx-1 font-semibold transition-colors whitespace-nowrap";

export default function BlogNavbar({
  isAuthenticated: isAuthProp,
  userName: userNameProp,
  onLogout: onLogoutProp,
  onLogin,
}: BlogNavbarProps) {
  const { user, logout } = useAuthContext();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > 24 && currentScrollY > lastScrollY) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // ─── Home button gesture state ───────────────────────────────────────
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);
  const holdCompletedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const marketplaceAuth =
    localStorage.getItem("blog_community_auth") === "true";
  const marketplaceUser = localStorage.getItem("blog_community_user") || "User";

  const isAuthenticated = isAuthProp ?? (!!user || marketplaceAuth);
  const userName =
    userNameProp ??
    user?.email?.split("@")[0] ??
    (marketplaceAuth ? marketplaceUser : "User");
  const dashboard = getDashboardDestination(user);
  const handleLogout = () => {
    if (onLogoutProp) {
      onLogoutProp();
    } else if (user) {
      logout();
    }
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
    toast({
      title: "Successfully logged out",
      description: "You've been disconnected from the marketplace.",
    });
    // Stay on the marketplace portal
    setLocation("/marketplace");
  };
  const [currentPath] = useLocation();

  const open = (key: string) => setOpenMenu(key);
  const close = () => setOpenMenu(null);
  const toggleMenu = (key: string) =>
    setOpenMenu((current) => (current === key ? null : key));

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (openMenu !== "mobile") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openMenu]);

  // A normal tap returns to the public home page; a long press still logs out.
  const handleHomeTap = useCallback(() => {
    if (holdCompletedRef.current) {
      holdCompletedRef.current = false;
      return;
    }
    setLocation("/");
  }, [setLocation]);

  const handlePressStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary) return;
      if (!isAuthenticated) return;
      holdCompletedRef.current = false;
      holdStartRef.current = Date.now();
      setIsHolding(true);
      setHoldProgress(0);
      holdIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - holdStartRef.current;
        setHoldProgress(Math.min((elapsed / 2000) * 100, 100));
      }, 16);
      holdTimerRef.current = setTimeout(() => {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setIsHolding(false);
        setHoldProgress(0);
        holdCompletedRef.current = true;
        // Hold 2s = logout
        logout();
        localStorage.removeItem("blog_community_auth");
        localStorage.removeItem("blog_community_user");
        toast({
          title: "Successfully logged out",
          description: "You've been disconnected from the marketplace.",
        });
        setLocation("/marketplace");
      }, 2000);
    },
    [isAuthenticated, logout],
  );

  const handlePressEnd = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary) return;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setIsHolding(false);
      setHoldProgress(0);
    },
    [],
  );

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed bottom-3 left-2 right-2 md:bottom-4 md:left-4 md:right-4 md:max-w-[calc(100%-2rem)] md:mx-auto bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_16px_45px_rgba(0,0,0,0.45)] z-[100] transition-transform duration-300 ease-out ${
          isVisible
            ? "translate-y-0 pointer-events-auto"
            : "translate-y-[120%] pointer-events-none"
        }`}
        style={{ overflowX: "visible", overflowY: "visible" }}
      >
        <div className="w-full px-2 sm:px-3 md:px-4 lg:px-5 overflow-visible">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 min-w-0 md:min-w-0">
            {/* Home button: tap=home, hold 2s=logout */}
            <div className="relative flex-shrink-0">
              {isHolding && (
                <svg
                  className="absolute pointer-events-none z-10"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: "48px",
                    height: "48px",
                  }}
                  viewBox="0 0 48 48"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="21"
                    fill="none"
                    stroke="rgba(239,68,68,0.15)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="21"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 21}`}
                    strokeDashoffset={`${2 * Math.PI * 21 * (1 - holdProgress / 100)}`}
                    transform="rotate(-90 24 24)"
                  />
                </svg>
              )}
              <button
                onClick={handleHomeTap}
                onPointerDown={handlePressStart}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                onPointerCancel={handlePressEnd}
                onContextMenu={(e) => e.preventDefault()}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap font-medium select-none"
                title={isAuthenticated ? "Home · Hold 2s=Logout" : "Home"}
              >
                <Home className="w-3 sm:w-4 h-3 sm:h-4" />
                <span className="hidden sm:inline">Accueil</span>
              </button>
            </div>

            {/* ── Mobile navigation: all sections stay available behind Menu ── */}
            <div className="flex md:hidden items-center gap-1 flex-1 min-w-0 justify-end px-1">
              <Link href="/blog">
                <a className="px-2 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all">
                  Blog
                </a>
              </Link>
              <button
                type="button"
                onClick={() => toggleMenu("mobile")}
                className={`${BTN} px-2 py-2 ${openMenu === "mobile" ? "bg-cyan-400/10 text-cyan-100" : ""}`}
                aria-expanded={openMenu === "mobile"}
                aria-controls="mobile-navigation-menu"
              >
                <span>Menu</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${openMenu === "mobile" ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* ── Desktop nav (scales with screen) — scrollable when content overflows ── */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 justify-start min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide px-1">
              {/* Entreprises */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("ent")}
                onMouseLeave={close}
              >
                <button
                  type="button"
                  className={BTN}
                  onClick={() => toggleMenu("ent")}
                  onMouseEnter={() => open("ent")}
                  onMouseLeave={close}
                >
                  <Store className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                  <span className="hidden lg:inline">Entreprises</span>
                  <span className="lg:hidden">Ent</span>
                  <ChevronDown
                    className={`w-2.5 h-2.5 opacity-50 transition-transform duration-200 ${openMenu === "ent" ? "rotate-180" : ""}`}
                  />
                </button>
                {/* invisible hover bridge */}
                <div className="absolute bottom-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-48 sm:w-56 lg:w-64 ${openMenu === "ent" ? PANEL_OPEN : ""}`}
                  style={{ marginBottom: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <div className="grid grid-cols-2 gap-0.5 px-0.5">
                    <Link href="/sante">
                      <a className={ITEM}>Santé</a>
                    </Link>
                    <Link href="/finances">
                      <a className={ITEM}>Finance</a>
                    </Link>
                    <Link href="/batiment">
                      <a className={ITEM}>Bâtiment</a>
                    </Link>
                    <Link href="/hotellerie">
                      <a className={ITEM}>Hôtellerie</a>
                    </Link>
                    <Link href="/automobile">
                      <a className={ITEM}>Automobile</a>
                    </Link>
                    <Link href="/commerce">
                      <a className={ITEM}>Commerce</a>
                    </Link>
                    <Link href="/logement">
                      <a className={ITEM}>Logement</a>
                    </Link>
                    <Link href="/divertissement">
                      <a className={ITEM}>Divertissement</a>
                    </Link>
                  </div>
                  <div className="border-t border-cyan-500/10 mt-1.5 pt-1 px-0.5">
                    <Link href="/businesses-directory">
                      <a className={ITEM_HEAD + " text-center"}>Annuaire</a>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Discover */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("discover")}
                onMouseLeave={close}
              >
                <button
                  type="button"
                  className={BTN}
                  onClick={() => toggleMenu("discover")}
                  onMouseEnter={() => open("discover")}
                  onMouseLeave={close}
                >
                  <span className="hidden lg:inline">Discover</span>
                  <span className="lg:hidden">Disc</span>
                  <ChevronDown
                    className={`w-2.5 h-2.5 opacity-50 transition-transform duration-200 ${openMenu === "discover" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute bottom-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-52 sm:w-56 lg:w-60 ${openMenu === "discover" ? PANEL_OPEN : ""}`}
                  style={{ marginBottom: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/hub">
                    <a className={ITEM_HEAD}>Community Hub</a>
                  </Link>
                  <Link href="/businesses-directory">
                    <a className={ITEM}>Business Directory</a>
                  </Link>
                  <Link href="/artisans">
                    <a className={ITEM}>Artisans</a>
                  </Link>
                  <Link href="/communities">
                    <a className={ITEM}>Communities</a>
                  </Link>
                  <Link href="/partners">
                    <a className={ITEM}>Partners</a>
                  </Link>
                </div>
              </div>

              {/* Play */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("play")}
                onMouseLeave={close}
              >
                <button
                  type="button"
                  className={BTN}
                  onClick={() => toggleMenu("play")}
                  onMouseEnter={() => open("play")}
                  onMouseLeave={close}
                >
                  <span className="hidden lg:inline">Play</span>
                  <span className="lg:hidden">Play</span>
                  <ChevronDown
                    className={`w-2.5 h-2.5 opacity-50 transition-transform duration-200 ${openMenu === "play" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute bottom-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-48 sm:w-52 lg:w-56 ${openMenu === "play" ? PANEL_OPEN : ""}`}
                  style={{ marginBottom: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/stream">
                    <a className={ITEM_HEAD}>Music Stream</a>
                  </Link>
                  <Link href="/podcast">
                    <a className={ITEM}>Podcasts</a>
                  </Link>
                  <Link href="/music">
                    <a className={ITEM}>Library</a>
                  </Link>
                  <Link href="/arcade">
                    <a className={ITEM}>Arcade</a>
                  </Link>
                </div>
              </div>

              {/* Services */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("svc")}
                onMouseLeave={close}
              >
                <button
                  type="button"
                  className={BTN}
                  onClick={() => toggleMenu("svc")}
                  onMouseEnter={() => open("svc")}
                  onMouseLeave={close}
                >
                  <span className="hidden lg:inline">Services</span>
                  <span className="lg:hidden">Svc</span>
                  <ChevronDown
                    className={`w-2.5 h-2.5 opacity-50 transition-transform duration-200 ${openMenu === "svc" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute bottom-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-44 sm:w-48 lg:w-52 ${openMenu === "svc" ? PANEL_OPEN : ""}`}
                  style={{ marginBottom: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/services">
                    <a className={ITEM_HEAD}>All Services</a>
                  </Link>
                  <Link href="/services/news">
                    <a className={ITEM}>News & Updates</a>
                  </Link>
                  <Link href="/services/careers">
                    <a className={ITEM}>Careers</a>
                  </Link>
                  <Link href="/services/contractors">
                    <a className={ITEM}>Contractors</a>
                  </Link>
                </div>
              </div>

              {/* Marketing */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("mkt")}
                onMouseLeave={close}
              >
                <button
                  type="button"
                  className={BTN}
                  onClick={() => toggleMenu("mkt")}
                  onMouseEnter={() => open("mkt")}
                  onMouseLeave={close}
                >
                  <span className="hidden lg:inline">Marketing</span>
                  <span className="lg:hidden">Mkt</span>
                  <ChevronDown
                    className={`w-2.5 h-2.5 opacity-50 transition-transform duration-200 ${openMenu === "mkt" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute bottom-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-48 sm:w-52 lg:w-56 ${openMenu === "mkt" ? PANEL_OPEN : ""}`}
                  style={{ marginBottom: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/marketing">
                    <a className={ITEM_HEAD}>Marketing Hub</a>
                  </Link>
                  <div className="border-t border-cyan-500/10 my-1 mx-3" />
                  <Link href="/marketing/journal">
                    <a className={ITEM}>Free Ad Journal</a>
                  </Link>
                  <Link href="/marketing/packs">
                    <a className={ITEM}>Marketing Packs</a>
                  </Link>
                  <Link href="/marketing/print">
                    <a className={ITEM}>Print Services</a>
                  </Link>
                  <Link href="/marketing/newsletters">
                    <a className={ITEM}>Newsletter</a>
                  </Link>
                </div>
              </div>

              {/* Marketplace (direct link) */}
              {currentPath !== "/marketplace" && (
                <Link href="/marketplace">
                  <a className={BTN}>
                    <ShoppingBag className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                    <span className="hidden lg:inline">Marketplace</span>
                    <span className="lg:hidden">Shop</span>
                  </a>
                </Link>
              )}

              {/* Support */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("help")}
                onMouseLeave={close}
              >
                <button
                  type="button"
                  className={BTN}
                  onClick={() => toggleMenu("help")}
                  onMouseEnter={() => open("help")}
                  onMouseLeave={close}
                >
                  <Headphones className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                  <span className="hidden lg:inline">Support</span>
                  <span className="lg:hidden">Help</span>
                  <ChevronDown
                    className={`w-2.5 h-2.5 opacity-50 transition-transform duration-200 ${openMenu === "help" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute bottom-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} right-0 w-44 sm:w-48 ${openMenu === "help" ? PANEL_OPEN : ""}`}
                  style={{ marginBottom: "8px" }}
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent mb-1 mx-3" />
                  <Link href="/sav">
                    <a className={ITEM}>SAV 24/7</a>
                  </Link>
                  <Link href="/versoai">
                    <a className={ITEM}>VersoAI</a>
                  </Link>
                </div>
              </div>
            </div>

            {/* Auth section - responsive */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 flex-shrink-0">
              {isAuthenticated && (
                <>
                  <HeaderMessagesButton />
                  <Link href={dashboard.path}>
                    <a
                      className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[9px] sm:text-xs lg:text-sm flex-shrink-0"
                      title={dashboard.label}
                    >
                      <LayoutDashboard className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                      <span className="hidden lg:inline">Dashboard</span>
                    </a>
                  </Link>
                  <Link href="/profile">
                    <a
                      className="hidden md:flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[9px] sm:text-xs lg:text-sm flex-shrink-0"
                      title="Account settings"
                    >
                      <UserRound className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                      <span className="hidden lg:inline">Account</span>
                    </a>
                  </Link>
                  <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 rounded-lg text-[9px] sm:text-xs lg:text-sm flex-shrink-0">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-slate-300 truncate max-w-[60px] sm:max-w-[80px] lg:max-w-[100px]">
                      {userName}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[9px] sm:text-xs lg:text-sm flex-shrink-0"
                  >
                    <LogOut className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {openMenu === "mobile" && (
          <div
            id="mobile-navigation-menu"
            className="md:hidden absolute bottom-full left-0 right-0 mb-2 max-h-[min(70vh,30rem)] overflow-y-auto overscroll-contain touch-pan-y rounded-2xl border border-cyan-500/20 bg-slate-950 p-2 shadow-2xl shadow-black/60"
            style={{
              WebkitOverflowScrolling: "touch",
              backgroundColor: "#020617",
              isolation: "isolate",
            }}
          >
            <div className="grid grid-cols-2 gap-1 border-b border-white/10 pb-2 mb-2">
              {MOBILE_PILLS.map((pill) => (
                <Link key={pill.href} href={pill.href}>
                  <a className="rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200">
                    {pill.label === "🎵"
                      ? "Music Stream"
                      : pill.label === "🎮"
                        ? "Arcade"
                        : pill.label}
                  </a>
                </Link>
              ))}
              <Link href="/marketplace">
                <a className="rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200">
                  Marketplace
                </a>
              </Link>
            </div>
            {MOBILE_MENU_GROUPS.map((group) => (
              <div
                key={group.key}
                className="border-b border-white/10 last:border-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    setMobileOpenGroup((current) =>
                      current === group.key ? null : group.key,
                    )
                  }
                  className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-semibold text-cyan-300"
                  aria-expanded={mobileOpenGroup === group.key}
                >
                  {group.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${mobileOpenGroup === group.key ? "rotate-180" : ""}`}
                  />
                </button>
                {mobileOpenGroup === group.key && (
                  <div className="grid grid-cols-2 gap-1 px-1 pb-2">
                    {group.items.map(([label, href]) => (
                      <Link key={href} href={href}>
                        <a className="rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-100">
                          {label}
                        </a>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";
import {
  LogOut,
  Store,
  Headphones,
  ShoppingBag,
  ChevronDown,
  Home,
  LayoutDashboard,
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

/* ── mobile quick-nav pills (Marketplace is reached by tapping Home) ── */
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

/* ── shared dropdown style tokens ───────────────────────────── */
/* Responsive button with fluid scaling */
const BTN =
  "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-full transition-all whitespace-nowrap font-medium flex-shrink-0 bg-slate-900/60 border border-cyan-500/15 shadow-[0_8px_20px_rgba(14,116,144,0.12)]";
const PANEL =
  "absolute bottom-full bg-slate-950/95 overflow-hidden shadow-[0_18px_42px_rgba(0,0,0,0.55)] rounded-2xl pt-2 pb-2.5 opacity-0 invisible transition-all duration-200 z-[9999] border border-cyan-500/20";
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
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
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
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  // ─── Home button gestures: tap=marketplace, double-tap=home, hold 2s=logout ───
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
        // Double-tap → full reload onto the public site root
        window.location.assign("/");
      } else {
        // Single tap → marketplace or scroll to top
        if (currentPath === "/marketplace") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          window.dispatchEvent(new CustomEvent("marketplace:refresh"));
        } else {
          setLocation("/marketplace");
        }
      }
    }, 300);
  }, [currentPath, setLocation]);

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
        className={`fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 z-[100] transition-transform duration-300 ease-out ${
          isVisible
            ? "translate-y-0 pointer-events-auto"
            : "translate-y-[120%] pointer-events-none"
        }`}
        style={{ overflowX: "visible", overflowY: "visible" }}
      >
        <div className="w-full px-2 sm:px-3 md:px-4 lg:px-5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 min-w-max sm:min-w-max md:min-w-0">
            {/* Home button with gestures: tap=marketplace, double-tap=home, hold 2s=logout */}
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
                title={
                  isAuthenticated
                    ? "Tap=Marketplace · Double-tap=Home · Hold 2s=Logout"
                    : "Tap=Marketplace · Double-tap=Home"
                }
              >
                <Home className="w-3 sm:w-4 h-3 sm:h-4" />
                <span className="hidden sm:inline">Accueil</span>
              </button>
            </div>

            {/* ── Mobile quick nav pills (Home button already covers Marketplace) ── */}
            <div className="flex md:hidden items-center gap-0.5 flex-1 min-w-0 justify-end overflow-x-auto scrollbar-hide px-1">
              {MOBILE_PILLS.filter((pill) => pill.href !== currentPath).map(
                (pill) => (
                  <Link
                    key={pill.href}
                    href={pill.href}
                    className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium transition-all whitespace-nowrap text-slate-400 ${pill.hover}`}
                  >
                    {pill.label}
                  </Link>
                ),
              )}
            </div>

            {/* ── Desktop nav (scales with screen) — scrollable when content overflows ── */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 justify-start min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide px-1">
              {/* Entreprises */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("ent")}
                onMouseLeave={close}
              >
                <button className={BTN}>
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
                    <Link href="/sante" className={ITEM}>Santé</Link>
                    <Link href="/finances" className={ITEM}>Finance</Link>
                    <Link href="/batiment" className={ITEM}>Bâtiment</Link>
                    <Link href="/hotellerie" className={ITEM}>Hôtellerie</Link>
                    <Link href="/automobile" className={ITEM}>Automobile</Link>
                    <Link href="/commerce" className={ITEM}>Commerce</Link>
                    <Link href="/logement" className={ITEM}>Logement</Link>
                    <Link href="/divertissement" className={ITEM}>Divertissement</Link>
                  </div>
                  <div className="border-t border-cyan-500/10 mt-1.5 pt-1 px-0.5">
                    <Link
                      href="/businesses-directory"
                      className={ITEM_HEAD + " text-center"}
                    >
                      Annuaire
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
                <button className={BTN}>
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
                  <Link href="/hub" className={ITEM_HEAD}>Community Hub</Link>
                  <Link href="/businesses-directory" className={ITEM}>Business Directory</Link>
                  <Link href="/artisans" className={ITEM}>Artisans</Link>
                  <Link href="/communities" className={ITEM}>Communities</Link>
                  <Link href="/partners" className={ITEM}>Partners</Link>
                </div>
              </div>

              {/* Play */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("play")}
                onMouseLeave={close}
              >
                <button className={BTN}>
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
                  <Link href="/stream" className={ITEM_HEAD}>Music Stream</Link>
                  <Link href="/podcast" className={ITEM}>Podcasts</Link>
                  <Link href="/music" className={ITEM}>Library</Link>
                  <Link href="/arcade" className={ITEM}>Arcade</Link>
                </div>
              </div>

              {/* Services */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("svc")}
                onMouseLeave={close}
              >
                <button className={BTN}>
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
                  <Link href="/services" className={ITEM_HEAD}>All Services</Link>
                  <Link href="/services/news" className={ITEM}>News & Updates</Link>
                  <Link href="/services/careers" className={ITEM}>Careers</Link>
                  <Link href="/services/contractors" className={ITEM}>Contractors</Link>
                </div>
              </div>

              {/* Marketing */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("mkt")}
                onMouseLeave={close}
              >
                <button className={BTN}>
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
                  <Link href="/marketing" className={ITEM_HEAD}>Marketing Hub</Link>
                  <div className="border-t border-cyan-500/10 my-1 mx-3" />
                  <Link href="/marketing/journal" className={ITEM}>Free Ad Journal</Link>
                  <Link href="/marketing/packs" className={ITEM}>Marketing Packs</Link>
                  <Link href="/marketing/print" className={ITEM}>Print Services</Link>
                  <Link href="/marketing/newsletters" className={ITEM}>Newsletter</Link>
                </div>
              </div>

              {/* Marketplace (direct link) */}
              {currentPath !== "/marketplace" && (
                <Link href="/marketplace" className={BTN}>
                  <ShoppingBag className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                  <span className="hidden lg:inline">Marketplace</span>
                  <span className="lg:hidden">Shop</span>
                </Link>
              )}

              {/* Support */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => open("help")}
                onMouseLeave={close}
              >
                <button className={BTN}>
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
                  <Link href="/sav" className={ITEM}>SAV 24/7</Link>
                  <Link href="/versoai" className={ITEM}>VersoAI</Link>
                </div>
              </div>
            </div>

            {/* Auth section - responsive */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 flex-shrink-0">
              {isAuthenticated && (
                <>
                  <HeaderMessagesButton />
                  <Link
                    href={dashboard.path}
                    className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[9px] sm:text-xs lg:text-sm flex-shrink-0"
                    title={dashboard.label}
                  >
                    <LayoutDashboard className="w-3 sm:w-3.5 lg:w-4 h-3 sm:h-3.5 lg:h-4" />
                    <span className="hidden lg:inline">Dashboard</span>
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
      </nav>
    </>
  );
}

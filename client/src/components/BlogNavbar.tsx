import { useState, useRef, useCallback, useEffect } from "react";
import {
  LogOut,
  Store,
  Headphones,
  ShoppingBag,
  ChevronDown,
  Home,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

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
const BTN =
  "flex items-center gap-1.5 px-3 py-2 text-[13px] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap font-medium";
const PANEL =
  "absolute top-full bg-slate-950 overflow-hidden shadow-2xl shadow-black/60 rounded-xl pt-2 pb-2.5 opacity-0 invisible transition-all duration-200 z-[9999] border border-cyan-500/20";
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
  const [, setLocation] = useLocation();

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
        className="fixed top-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 z-[100] overflow-x-hidden"
        style={{ overflowX: "hidden", overflowY: "visible" }}
      >
        <div className="max-w-full mx-auto px-3 md:px-5">
          <div className="flex items-center justify-between h-14 md:h-16 gap-2 md:gap-3">
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
                className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap font-medium select-none"
                title={
                  isAuthenticated
                    ? "Tap=Marketplace · Double-tap=Home · Hold 2s=Logout"
                    : "Tap=Marketplace · Double-tap=Home"
                }
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Accueil</span>
              </button>
            </div>

            {/* ── Mobile quick nav pills (Home button already covers Marketplace) ── */}
            <div className="flex md:hidden items-center gap-1 flex-1 min-w-0 justify-end overflow-x-auto scrollbar-hide px-1">
              {MOBILE_PILLS.filter((pill) => pill.href !== currentPath).map(
                (pill) => (
                  <Link key={pill.href} href={pill.href}>
                    <a
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap text-slate-400 ${pill.hover}`}
                    >
                      {pill.label}
                    </a>
                  </Link>
                ),
              )}
            </div>

            {/* ── Centered nav (desktop only) — scrollable when content overflows ── */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide px-2">
              {/* Entreprises */}
              <div
                className="relative"
                onMouseEnter={() => open("ent")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  <Store className="w-4 h-4" />
                  Entreprises
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "ent" ? "rotate-180" : ""}`}
                  />
                </button>
                {/* invisible hover bridge */}
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-64 ${openMenu === "ent" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
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

              {/* Services */}
              <div
                className="relative"
                onMouseEnter={() => open("svc")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  Services
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "svc" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-52 ${openMenu === "svc" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
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
                className="relative"
                onMouseEnter={() => open("mkt")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  Marketing
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "mkt" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} left-1/2 -translate-x-1/2 w-56 ${openMenu === "mkt" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
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
                    <ShoppingBag className="w-4 h-4" />
                    Marketplace
                  </a>
                </Link>
              )}

              {/* Support */}
              <div
                className="relative"
                onMouseEnter={() => open("help")}
                onMouseLeave={close}
              >
                <button className={BTN}>
                  <Headphones className="w-4 h-4" />
                  Support
                  <ChevronDown
                    className={`w-3 h-3 opacity-50 transition-transform duration-200 ${openMenu === "help" ? "rotate-180" : ""}`}
                  />
                </button>
                <div className="absolute top-full left-0 right-0 h-2" />
                <div
                  className={`${PANEL} right-0 w-48 ${openMenu === "help" ? PANEL_OPEN : ""}`}
                  style={{ marginTop: "8px" }}
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

            {/* Auth section */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthenticated && (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-[13px]">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-slate-300 truncate max-w-[80px]">
                      {userName}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[13px]"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
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

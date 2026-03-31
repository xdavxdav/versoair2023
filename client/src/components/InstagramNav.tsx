/**
 * Instagram-style navigation:
 * • Mobile  → bottom tab bar (5 icons)
 * • Desktop → slim left side-rail with icon tooltips
 *
 * Replaces the old Navbar + MobileMenuBubble + BlogNavbar.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Search,
  LayoutGrid,
  Bell,
  User,
  LogIn,
  LogOut,
  Store,
  Hotel,
  HardHat,
  Car,
  Landmark,
  Gamepad2,
  Stethoscope,
  ShoppingCart,
  Wrench,
  Calendar,
  Megaphone,
  Globe,
  Info,
  Headphones,
  Sparkles,
  Building2,
  Heart,
  Newspaper,
  Package,
  Printer,
  Mail,
  ChevronRight,
  X,
  ShoppingBag,
  Music,
  MapPin,
  Settings,
  CreditCard,
  Wallet,
  Shield,
  KeyRound,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import QuickSignIn from "@/components/QuickSignIn";
import { useSubscription } from "@/hooks/use-subscription";
import SearchModal from "@/components/SearchModal";
import { motion, AnimatePresence } from "framer-motion";

// ─── Navigation data ────────────────────────────────────────

type NavGroup = {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
};

const sectorGroup: NavGroup = {
  label: "Sectors",
  items: [
    { href: "/commerce", label: "Commerce", icon: ShoppingCart },
    { href: "/hotellerie", label: "Hôtellerie", icon: Hotel },
    { href: "/batiment", label: "Bâtiment", icon: HardHat },
    { href: "/automobile", label: "Automobile", icon: Car },
    { href: "/finances", label: "Finances", icon: Landmark },
    { href: "/divertissement", label: "Divertissement", icon: Gamepad2 },
    { href: "/sante", label: "Santé", icon: Stethoscope },
    { href: "/logement", label: "Logement", icon: Home },
  ],
};

const serviceGroup: NavGroup = {
  label: "Services",
  items: [
    { href: "/services", label: "Services", icon: Wrench },
    { href: "/services/careers", label: "Careers", icon: Building2 },
    { href: "/services/contractors", label: "Contractors", icon: HardHat },
    { href: "/reservations", label: "Réservations", icon: Calendar },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  ],
};

const marketingGroup: NavGroup = {
  label: "Marketing",
  items: [
    { href: "/marketing", label: "Marketing Hub", icon: Megaphone },
    { href: "/marketing/journal", label: "Free Ad Journal", icon: Newspaper },
    { href: "/marketing/packs", label: "Marketing Packs", icon: Package },
    { href: "/marketing/print", label: "Print Services", icon: Printer },
    { href: "/marketing/newsletters", label: "Newsletter", icon: Mail },
  ],
};

const moreGroup: NavGroup = {
  label: "More",
  items: [
    { href: "/about", label: "About Us", icon: Info },
    { href: "/businesses-directory", label: "Annuaire", icon: Store },
    { href: "/geo-admin", label: "Geo Admin", icon: Globe },
    { href: "/sav", label: "SAV 24/7", icon: Headphones },
    { href: "/versoai", label: "VersoAI", icon: Sparkles },
    { href: "/blog", label: "Blog", icon: Newspaper },
    { href: "/artistes", label: "Artists", icon: Music },
    { href: "/artist-portal", label: "Artist Portal", icon: Music },
  ],
};

const allGroups = [sectorGroup, serviceGroup, marketingGroup, moreGroup];

// ─── Helper: is a path active? ────────────────────────────

function isActive(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/" || currentPath === "";
  return currentPath.startsWith(href);
}

function isSectorActive(currentPath: string) {
  return sectorGroup.items.some((s) => isActive(currentPath, s.href));
}

// ─── Drawer (shared between mobile & desktop) ─────────────

function NavDrawer({
  open,
  onClose,
  origin,
  onSignInClick,
}: {
  open: boolean;
  onClose: () => void;
  origin: "bottom" | "left";
  onSignInClick: () => void;
}) {
  const [currentPath, navigate] = useLocation();
  const { user, logout } = useAuthContext();
  const { isAuthenticated, tier } = useSubscription();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const slideVariants =
    origin === "bottom"
      ? { hidden: { y: "100%" }, visible: { y: 0 }, exit: { y: "100%" } }
      : { hidden: { x: "-100%" }, visible: { x: 0 }, exit: { x: "-100%" } };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            className={`fixed z-[101] bg-gray-950/95 backdrop-blur-xl border-gray-800 overflow-y-auto overscroll-contain ${
              origin === "bottom"
                ? "inset-x-0 bottom-0 rounded-t-2xl border-t max-h-[85vh]"
                : "top-0 left-0 bottom-0 w-80 border-r"
            }`}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-lg px-5 py-4 flex items-center justify-between border-b border-gray-800/60">
              <span className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent notranslate">
                Verso Air
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drag handle (mobile only) */}
            {origin === "bottom" && (
              <div className="flex justify-center -mt-8 mb-2 pt-2">
                <div className="w-10 h-1 rounded-full bg-gray-600" />
              </div>
            )}

            {/* Auth section */}
            {user ? (
              <div className="px-5 py-3 border-b border-gray-800/40">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {user.role || "member"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Navigation groups */}
            <div className="px-3 py-3 space-y-4">
              {allGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(currentPath, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                            active
                              ? "bg-amber-500/15 text-amber-400 font-medium"
                              : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                          }`}
                        >
                          <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {active && (
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Account actions */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-1.5">
                  Account
                </p>
                <div className="space-y-0.5">
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                          isActive(currentPath, "/profile")
                            ? "bg-amber-500/15 text-amber-400 font-medium"
                            : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                        }`}
                      >
                        <Settings className="h-[18px] w-[18px]" />
                        <span>Account Settings</span>
                      </Link>
                      <Link
                        href="/account/billing"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white"
                      >
                        <Wallet className="h-[18px] w-[18px]" />
                        <span>Billing</span>
                      </Link>
                      {(user.role === "admin" || user.role === "superuser") && (
                        <Link
                          href="/dashboard"
                          onClick={onClose}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white"
                        >
                          <Shield className="h-[18px] w-[18px]" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          onClose();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 w-full"
                      >
                        <LogOut className="h-[18px] w-[18px]" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        onClose();
                        onSignInClick();
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-amber-400 hover:bg-amber-500/15 w-full"
                    >
                      <LogIn className="h-[18px] w-[18px]" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom safe-area spacer (mobile) */}
            {origin === "bottom" && <div className="h-8" />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Tooltip (desktop side-rail only) ─────────────────────

function IconButton({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  className,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  className?: string;
}) {
  const content = (
    <div className="group/tip relative">
      <div
        className={`relative flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-200 ${
          active
            ? "bg-amber-500/15 text-amber-400"
            : "text-gray-400 hover:text-white hover:bg-gray-800/60"
        } ${className || ""}`}
      >
        <Icon className="h-[22px] w-[22px]" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center px-1 font-bold">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {/* Tooltip */}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 border border-gray-700/60 shadow-lg z-50">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="outline-none">
        {content}
      </button>
    );
  }

  return <Link href={href || "/"}>{content}</Link>;
}

// ─── MAIN EXPORT ──────────────────────────────────────────

interface InstagramNavProps {
  onMusicPortalToggle: () => void;
  onLocationPanelToggle: () => void;
}

export default function InstagramNav({
  onMusicPortalToggle,
  onLocationPanelToggle,
}: InstagramNavProps) {
  const [currentPath, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showQuickSignIn, setShowQuickSignIn] = useState(false);
  const { user } = useAuthContext();

  // ─── Home button tap/hold gesture state ───
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);
  const holdCompletedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdCountdown, setHoldCountdown] = useState(5);

  const toggleDrawer = useCallback(() => setDrawerOpen((p) => !p), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Home button gestures:
  // - Single tap → /marketplace
  // - Double tap → /blog
  // - Hold 5s → / (home) with countdown
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
        if (currentPath === "/marketplace") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setLocation("/marketplace");
        }
      }
    }, 300);
  }, [currentPath, setLocation]);

  const handleHomePressStart = useCallback(() => {
    holdCompletedRef.current = false;
    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);
    setHoldCountdown(5);
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / 5000) * 100, 100);
      setHoldProgress(progress);
      setHoldCountdown(Math.max(0, Math.ceil(5 - elapsed / 1000)));
    }, 16);
    holdTimerRef.current = setTimeout(() => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setIsHolding(false);
      setHoldProgress(0);
      holdCompletedRef.current = true;
      setLocation("/");
    }, 5000);
  }, [setLocation]);

  const handleHomePressEnd = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPath]);

  const isHome = currentPath === "/" || currentPath === "";
  const profileActive =
    isActive(currentPath, "/profile") || isActive(currentPath, "/auth");
  const sectorsActive = isSectorActive(currentPath);

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
            <div className="relative flex flex-col items-center gap-4">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#holdGradientNav)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - holdProgress / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
                <defs>
                  <linearGradient
                    id="holdGradientNav"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <span className="text-5xl font-bold text-white tabular-nums">
                  {holdCountdown}
                </span>
              </motion.div>
              <p className="text-white/60 text-sm font-medium tracking-wide">
                Retour à l'accueil...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP: Slim left side-rail (hidden on mobile)
          ═══════════════════════════════════════════════════════ */}
      <nav
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-[72px] bg-gray-950/90 backdrop-blur-xl border-r border-gray-800/60 flex-col items-center py-4 z-[70] transition-all"
        aria-label="Side navigation"
      >
        {/* Logo with tap/hold gestures */}
        <div className="relative mb-6">
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
                stroke="rgba(245,158,11,0.2)"
                strokeWidth="2"
              />
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="none"
                stroke="#f59e0b"
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
            onPointerDown={handleHomePressStart}
            onPointerUp={handleHomePressEnd}
            onPointerLeave={handleHomePressEnd}
            onPointerCancel={handleHomePressEnd}
            onContextMenu={(e) => e.preventDefault()}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-amber-500/20 select-none"
            title="Tap=Marketplace · Double-tap=Blog · Hold 5s=Home"
          >
            V
          </button>
        </div>

        {/* Primary nav icons */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <IconButton href="/" icon={Home} label="Home" active={isHome} />
          <IconButton
            icon={Search}
            label="Search"
            onClick={() => setIsSearchOpen(true)}
          />
          <IconButton
            icon={LayoutGrid}
            label="Menu"
            active={drawerOpen || sectorsActive}
            onClick={toggleDrawer}
          />
          <IconButton
            href="/marketplace"
            icon={ShoppingBag}
            label="Marketplace"
            active={isActive(currentPath, "/marketplace")}
          />
          <IconButton
            href="/reservations"
            icon={Calendar}
            label="Reservations"
            active={isActive(currentPath, "/reservations")}
          />

          {/* Divider */}
          <div className="w-8 h-px bg-gray-700/50 my-2" />

          <IconButton
            icon={Music}
            label="Verso Air Stream"
            onClick={onMusicPortalToggle}
          />
          <IconButton
            icon={MapPin}
            label="GPS Services"
            onClick={onLocationPanelToggle}
          />
        </div>

        {/* Bottom: profile / auth */}
        <div className="flex flex-col items-center gap-1 mt-auto pt-4 border-t border-gray-800/40">
          {user ? (
            <Link href="/profile">
              <div className="group/tip relative">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ring-2 ${
                    profileActive
                      ? "ring-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                      : "ring-transparent hover:ring-gray-600 bg-gray-800 text-gray-300"
                  }`}
                >
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 border border-gray-700/60 shadow-lg z-50">
                  Profile
                </div>
              </div>
            </Link>
          ) : (
            <IconButton
              onClick={() => setShowQuickSignIn(true)}
              icon={LogIn}
              label="Sign In"
            />
          )}
        </div>
      </nav>

      {/* Desktop content push — offset the main content by the side-rail width */}
      {/* This is handled in App.tsx via a left margin */}

      {/* ═══════════════════════════════════════════════════════
          MOBILE: Bottom tab bar (hidden on desktop)
          ═══════════════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[70] bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around h-14 px-1">
          {/* Home with tap/double-tap/hold gestures */}
          <div className="relative">
            {isHolding && (
              <svg
                className="absolute pointer-events-none z-10"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: "36px",
                  height: "36px",
                }}
                viewBox="0 0 36 36"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="rgba(245,158,11,0.2)"
                  strokeWidth="2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - holdProgress / 100)}`}
                  transform="rotate(-90 18 18)"
                />
              </svg>
            )}
            <button
              onClick={handleHomeTap}
              onPointerDown={handleHomePressStart}
              onPointerUp={handleHomePressEnd}
              onPointerLeave={handleHomePressEnd}
              onPointerCancel={handleHomePressEnd}
              onContextMenu={(e) => e.preventDefault()}
              className="flex flex-col items-center gap-0.5 px-3 py-1 select-none"
            >
              <Home
                className={`h-6 w-6 transition-colors ${isHome ? "text-amber-400" : "text-gray-400"}`}
              />
              <span
                className={`text-[10px] ${isHome ? "text-amber-400 font-semibold" : "text-gray-500"}`}
              >
                Home
              </span>
            </button>
          </div>

          {/* Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <Search className="h-6 w-6 text-gray-400" />
            <span className="text-[10px] text-gray-500">Search</span>
          </button>

          {/* Menu (sectors/services/more) */}
          <button
            onClick={toggleDrawer}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <LayoutGrid
              className={`h-6 w-6 transition-colors ${
                drawerOpen || sectorsActive ? "text-amber-400" : "text-gray-400"
              }`}
            />
            <span
              className={`text-[10px] ${
                drawerOpen || sectorsActive
                  ? "text-amber-400 font-semibold"
                  : "text-gray-500"
              }`}
            >
              Menu
            </span>
          </button>

          {/* Marketplace */}
          <Link href="/marketplace">
            <div className="flex flex-col items-center gap-0.5 px-3 py-1">
              <ShoppingBag
                className={`h-6 w-6 transition-colors ${
                  isActive(currentPath, "/marketplace")
                    ? "text-amber-400"
                    : "text-gray-400"
                }`}
              />
              <span
                className={`text-[10px] ${
                  isActive(currentPath, "/marketplace")
                    ? "text-amber-400 font-semibold"
                    : "text-gray-500"
                }`}
              >
                Shop
              </span>
            </div>
          </Link>

          {/* Profile */}
          {user ? (
            <Link href="/profile">
              <div className="flex flex-col items-center gap-0.5 px-3 py-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ${
                    profileActive
                      ? "ring-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                      : "ring-transparent bg-gray-700 text-gray-300"
                  }`}
                >
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <span
                  className={`text-[10px] ${
                    profileActive
                      ? "text-amber-400 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  Profile
                </span>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => setShowQuickSignIn(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <User
                className={`h-6 w-6 transition-colors ${
                  profileActive ? "text-amber-400" : "text-gray-400"
                }`}
              />
              <span className="text-[10px] text-gray-500">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          DRAWER — Full navigation drawer (both breakpoints)
          ═══════════════════════════════════════════════════════ */}
      {/* Mobile: slides up from bottom */}
      <div className="md:hidden">
        <NavDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          origin="bottom"
          onSignInClick={() => setShowQuickSignIn(true)}
        />
      </div>
      {/* Desktop: slides out from left */}
      <div className="hidden md:block">
        <NavDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          origin="left"
          onSignInClick={() => setShowQuickSignIn(true)}
        />
      </div>

      {/* Search modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Quick Sign In modal */}
      <QuickSignIn
        open={showQuickSignIn}
        onClose={() => setShowQuickSignIn(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}

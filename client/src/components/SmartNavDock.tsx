/**
 * VERSO AIR — SMART NAV DOCK
 * Never hides nav items. Uses a responsive strategy:
 *   • Desktop (>1024px): all items in one row
 *   • Tablet (768–1024px): primary items + More dropdown
 *   • Mobile (<768px): primary items + More bottom sheet (shows ALL items)
 * Drop-in replacement for your current content-nav-dock.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  House,
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  Store,
  Users,
  Play,
  Palette,
  Briefcase,
  Search,
  LifeBuoy,
  LogOut,
  User,
  ChevronDown,
  MoreHorizontal,
  X,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/* -------------------------------------------------------------------------- */
/* CONFIG — map your routes & icons here */
/* -------------------------------------------------------------------------- */

interface NavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ElementType;
  badge?: number;
  isActive?: boolean;
}

const ALL_ITEMS: NavItem[] = [
  { id: "home", label: "Home", href: "/", icon: House, isActive: false },
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  { id: "blog", label: "Blog", href: "/blog", icon: BookOpen, isActive: false },
  { id: "shop", label: "Shop", href: "/marketplace", icon: ShoppingBag },
  { id: "sell", label: "Sell", href: "/sell", icon: Store },
  { id: "discover", label: "Discover", href: "/hub", icon: Users },
  { id: "play", label: "Play", href: "/stream", icon: Play },
  { id: "create", label: "Create", href: "/artist-portal", icon: Palette },
  { id: "services", label: "Services", href: "/services", icon: Briefcase },
  {
    id: "search",
    label: "Search",
    onClick: () => window.dispatchEvent(new Event("search:open")),
    icon: Search,
  },
  { id: "help", label: "Help", href: "/help", icon: LifeBuoy },
  {
    id: "messages",
    label: "Messages",
    onClick: () => window.dispatchEvent(new Event("messenger:open")),
    icon: MessageCircle,
  },
];

/* -------------------------------------------------------------------------- */
/* SMART NAV DOCK COMPONENT */
/* -------------------------------------------------------------------------- */

interface SmartNavDockProps {
  userName?: string;
  userStatus?: "online" | "away" | "offline";
  onSignOut?: () => void;
}

export function SmartNavDock({
  userName = "User",
  userStatus = "online",
  onSignOut,
}: SmartNavDockProps) {
  const [currentPath, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ALL_ITEMS.length);
  const dockRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // ── Home gestures: Single tap = /marketplace, Double tap = /blog, Hold 3s = / (public home)
  const homeTapCountRef = useRef(0);
  const homeTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const homeHoldStartRef = useRef(0);
  const homeHoldCompletedRef = useRef(false);
  const [homeHoldProgress, setHomeHoldProgress] = useState(0);
  const [isHomeHolding, setIsHomeHolding] = useState(false);
  const [homeHoldCountdown, setHomeHoldCountdown] = useState(3);

  const handleHomeTap = useCallback(() => {
    if (homeHoldCompletedRef.current) {
      homeHoldCompletedRef.current = false;
      return;
    }
    homeTapCountRef.current += 1;
    if (homeTapTimerRef.current) clearTimeout(homeTapTimerRef.current);
    homeTapTimerRef.current = setTimeout(() => {
      const count = homeTapCountRef.current;
      homeTapCountRef.current = 0;
      if (count >= 2) {
        setLocation("/blog");
      } else {
        if (currentPath === "/marketplace") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setLocation("/marketplace");
        }
      }
    }, 300);
  }, [currentPath, setLocation]);

  const handleHomePressStart = useCallback(() => {
    homeHoldCompletedRef.current = false;
    homeHoldStartRef.current = Date.now();
    setIsHomeHolding(true);
    setHomeHoldProgress(0);
    setHomeHoldCountdown(3);
    homeHoldIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - homeHoldStartRef.current;
      const progress = Math.min((elapsed / 3000) * 100, 100);
      setHomeHoldProgress(progress);
      setHomeHoldCountdown(Math.max(0, Math.ceil(3 - elapsed / 1000)));
    }, 50);
    homeHoldTimerRef.current = setTimeout(() => {
      if (homeHoldIntervalRef.current)
        clearInterval(homeHoldIntervalRef.current);
      setIsHomeHolding(false);
      setHomeHoldProgress(0);
      homeHoldCompletedRef.current = true;
      setLocation("/");
    }, 3000);
  }, [setLocation]);

  const handleHomePressEnd = useCallback(() => {
    if (homeHoldTimerRef.current) clearTimeout(homeHoldTimerRef.current);
    if (homeHoldIntervalRef.current) clearInterval(homeHoldIntervalRef.current);
    setIsHomeHolding(false);
    setHomeHoldProgress(0);
  }, []);

  // ── Musical Universe (MU / Play) gestures: Single tap = /stream, Double tap = /music/dashboard, Hold 3s = /stream
  const muTapCountRef = useRef(0);
  const muTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const muHoldStartRef = useRef(0);
  const muHoldCompletedRef = useRef(false);
  const [muHoldProgress, setMuHoldProgress] = useState(0);
  const [isMuHolding, setIsMuHolding] = useState(false);
  const [muHoldCountdown, setMuHoldCountdown] = useState(3);

  const handleMuTap = useCallback(() => {
    if (muHoldCompletedRef.current) {
      muHoldCompletedRef.current = false;
      return;
    }
    muTapCountRef.current += 1;
    if (muTapTimerRef.current) clearTimeout(muTapTimerRef.current);
    muTapTimerRef.current = setTimeout(() => {
      const count = muTapCountRef.current;
      muTapCountRef.current = 0;
      if (count >= 2) {
        setLocation("/music/dashboard");
      } else {
        setLocation("/stream");
      }
    }, 300);
  }, [setLocation]);

  const handleMuPressStart = useCallback(() => {
    muHoldCompletedRef.current = false;
    muHoldStartRef.current = Date.now();
    setIsMuHolding(true);
    setMuHoldProgress(0);
    setMuHoldCountdown(3);
    muHoldIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - muHoldStartRef.current;
      const progress = Math.min((elapsed / 3000) * 100, 100);
      setMuHoldProgress(progress);
      setMuHoldCountdown(Math.max(0, Math.ceil(3 - elapsed / 1000)));
    }, 50);
    muHoldTimerRef.current = setTimeout(() => {
      if (muHoldIntervalRef.current) clearInterval(muHoldIntervalRef.current);
      setIsMuHolding(false);
      setMuHoldProgress(0);
      muHoldCompletedRef.current = true;
      setLocation("/stream");
    }, 3000);
  }, [setLocation]);

  const handleMuPressEnd = useCallback(() => {
    if (muHoldTimerRef.current) clearTimeout(muHoldTimerRef.current);
    if (muHoldIntervalRef.current) clearInterval(muHoldIntervalRef.current);
    setIsMuHolding(false);
    setMuHoldProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (homeTapTimerRef.current) clearTimeout(homeTapTimerRef.current);
      if (homeHoldTimerRef.current) clearTimeout(homeHoldTimerRef.current);
      if (homeHoldIntervalRef.current)
        clearInterval(homeHoldIntervalRef.current);
      if (muTapTimerRef.current) clearTimeout(muTapTimerRef.current);
      if (muHoldTimerRef.current) clearTimeout(muHoldTimerRef.current);
      if (muHoldIntervalRef.current) clearInterval(muHoldIntervalRef.current);
    };
  }, []);

  /* ── Measure available width and decide how many items fit ── */
  useEffect(() => {
    const measure = () => {
      if (!dockRef.current) return;

      const width = dockRef.current.clientWidth;
      /* Approximate item widths (icon + gap + text + padding + margin) */
      const itemWidth = 110; /* average nav item width in px */
      const userBlockWidth = 160; /* user name + signout + dividers */
      const moreBtnWidth = 80;
      const available = width - userBlockWidth - moreBtnWidth;
      const fit = Math.floor(available / itemWidth);

      setVisibleCount(Math.max(4, Math.min(fit, ALL_ITEMS.length)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const primaryItems = ALL_ITEMS.slice(0, visibleCount);
  const overflowItems = ALL_ITEMS.slice(visibleCount);
  const hasOverflow = overflowItems.length > 0;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const isTablet =
    typeof window !== "undefined" &&
    window.innerWidth >= 768 &&
    window.innerWidth < 1024;

  useScrollLock(sheetOpen);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    if (!moreOpen) return;

    const handler = (e: MouseEvent) => {
      if (moreBtnRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [moreOpen]);

  const handleMoreClick = () => {
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setMoreOpen((p) => !p);
    }
  };

  const statusColor = {
    online: "bg-emerald-400",
    away: "bg-amber-400",
    offline: "bg-slate-500",
  }[userStatus];

  return (
    <>
      {/* ── Home hold darkening overlay ── */}
      <AnimatePresence>
        {isHomeHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: (homeHoldProgress / 100) * 0.85 }}
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
                  stroke="#22d3ee"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - homeHoldProgress / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <span className="text-5xl font-bold text-white tabular-nums">
                  {homeHoldCountdown}
                </span>
              </motion.div>
              <p className="text-white/60 text-sm font-medium tracking-wide">
                Retour à l'accueil...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Musical Universe (MU / Play) hold darkening overlay ── */}
      <AnimatePresence>
        {isMuHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: (muHoldProgress / 100) * 0.85 }}
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
                  stroke="#a855f7"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - muHoldProgress / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <span className="text-5xl font-bold text-white tabular-nums">
                  {muHoldCountdown}
                </span>
              </motion.div>
              <p className="text-purple-300/80 text-sm font-medium tracking-wide">
                Lancement Musical Universe...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN DOCK ── */}
      <div
        ref={dockRef}
        className="pointer-events-auto mx-auto mb-4 flex w-[calc(100vw-24px)] max-w-[1400px] items-center gap-1 overflow-x-auto px-3 py-3 scrollbar-hide md:mb-6 md:gap-1.5 md:px-4 md:py-4 lg:gap-2 lg:px-5 lg:py-4"
        style={{
          background: "rgba(6, 3, 14, 0.97)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          backdropFilter: "blur(28px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          borderRadius: 999,
          boxShadow:
            "rgba(0, 0, 0, 0.8) 0px 24px 64px, rgba(255, 255, 255, 0.04) 0px 0px 0px 0.5px inset, rgba(34, 211, 238, 0.04) 0px 0px 30px",
        }}
      >
        {/* Primary items */}
        {primaryItems.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            onHomeTap={handleHomeTap}
            onHomePressStart={handleHomePressStart}
            onHomePressEnd={handleHomePressEnd}
            isHomeHolding={isHomeHolding}
            homeHoldProgress={homeHoldProgress}
            onMuTap={handleMuTap}
            onMuPressStart={handleMuPressStart}
            onMuPressEnd={handleMuPressEnd}
            isMuHolding={isMuHolding}
            muHoldProgress={muHoldProgress}
          />
        ))}

        {/* Overflow trigger */}
        {hasOverflow && (
          <>
            <div className="mx-1 h-5 w-px flex-shrink-0 bg-white/[0.07] md:mx-1.5 lg:h-7" />
            <button
              ref={moreBtnRef}
              onClick={handleMoreClick}
              className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 md:px-3.5 md:py-2.5 lg:px-4 lg:py-3 lg:text-base ${
                moreOpen || sheetOpen
                  ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                  : "border-transparent text-slate-500 hover:border-cyan-500/20 hover:bg-cyan-500/[0.07] hover:text-cyan-300 hover:shadow-[0_0_10px_rgba(34,211,238,0.08)]"
              }`}
            >
              <MoreHorizontal className="h-4 w-4 md:h-4.5 lg:h-5" />
              <span className="hidden sm:inline">More</span>
              <ChevronDown
                className={`h-3.5 w-3.5 opacity-50 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
          </>
        )}

        {/* Right side: user + signout */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2 md:gap-2.5 lg:gap-3">
          <div className="h-5 w-px flex-shrink-0 bg-white/[0.07] md:mx-1 lg:h-7" />
          <div
            className="flex flex-shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm text-slate-400 md:px-3.5 md:py-2.5 lg:px-4 lg:py-3 lg:text-base"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <span
              className={`h-2.5 w-2.5 flex-shrink-0 rounded-full md:h-3 md:w-3 lg:h-3 lg:w-3 ${statusColor}`}
            />
            <span className="hidden max-w-[80px] truncate md:block md:max-w-[100px]">
              {userName}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-transparent p-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 md:p-3 lg:p-3.5"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 md:h-4.5 lg:h-5" />
          </button>
        </div>
      </div>

      {/* ── TABLET DROPDOWN (overflow items) ── */}
      <AnimatePresence>
        {isTablet && moreOpen && hasOverflow && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[90] w-56 rounded-xl border border-white/10 bg-[#0f0f17] p-2 shadow-2xl"
            style={{
              top:
                (moreBtnRef.current?.getBoundingClientRect().bottom || 0) + 8,
              left: moreBtnRef.current?.getBoundingClientRect().left || 0,
            }}
          >
            {overflowItems.map((item) => (
              <OverflowRow
                key={item.id}
                item={item}
                onClick={() => setMoreOpen(false)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM SHEET (ALL items) ── */}
      <AnimatePresence>
        {isMobile && sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] touch-none bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-[#0b0b12] p-6 pb-10 touch-pan-y"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-white/20" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {ALL_ITEMS.map((item) => (
                  <SheetItem
                    key={item.id}
                    item={item}
                    onClick={() => setSheetOpen(false)}
                  />
                ))}
              </div>
              <div className="mt-6 border-t border-white/5 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                    <User className="h-5 w-5 text-white/60" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{userName}</p>
                    <p className="text-xs text-white/40 capitalize">
                      {userStatus}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      onSignOut?.();
                    }}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS */
/* -------------------------------------------------------------------------- */

function NavItemButton({
  item,
  onHomeTap,
  onHomePressStart,
  onHomePressEnd,
  isHomeHolding,
  homeHoldProgress,
  onMuTap,
  onMuPressStart,
  onMuPressEnd,
  isMuHolding,
  muHoldProgress,
}: {
  item: NavItem;
  onHomeTap?: () => void;
  onHomePressStart?: () => void;
  onHomePressEnd?: () => void;
  isHomeHolding?: boolean;
  homeHoldProgress?: number;
  onMuTap?: () => void;
  onMuPressStart?: () => void;
  onMuPressEnd?: () => void;
  isMuHolding?: boolean;
  muHoldProgress?: number;
}) {
  const Icon = item.icon;
  const isHome = item.id === "home";
  const isPlay = item.id === "play";

  const baseClass = `relative flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 md:px-3.5 md:py-2.5 lg:px-4 lg:py-3 lg:text-base ${
    item.isActive
      ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
      : isPlay
        ? "border-transparent text-slate-500 hover:border-purple-500/30 hover:bg-purple-500/[0.08] hover:text-purple-300 hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]"
        : "border-transparent text-slate-500 hover:border-cyan-500/20 hover:bg-cyan-500/[0.07] hover:text-cyan-300 hover:shadow-[0_0_10px_rgba(34,211,238,0.08)]"
  }`;

  if (isHome) {
    return (
      <button
        onClick={onHomeTap}
        onPointerDown={onHomePressStart}
        onPointerUp={onHomePressEnd}
        onPointerLeave={onHomePressEnd}
        onPointerCancel={onHomePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={baseClass}
        title="Tap=Marketplace · Double-tap=Blog · Hold 3s=Home"
      >
        <Icon className="h-4 w-4 md:h-4.5 lg:h-5" />
        <span className="hidden sm:inline">{item.label}</span>
      </button>
    );
  }

  if (isPlay) {
    return (
      <button
        onClick={onMuTap}
        onPointerDown={onMuPressStart}
        onPointerUp={onMuPressEnd}
        onPointerLeave={onMuPressEnd}
        onPointerCancel={onMuPressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={baseClass}
        title="Tap=Stream Music · Double-tap=Artist Dashboard · Hold 3s=Musical Universe"
      >
        <Icon className="h-4 w-4 md:h-4.5 lg:h-5 text-purple-400" />
        <span className="hidden sm:inline">{item.label}</span>
      </button>
    );
  }

  if (item.href) {
    return (
      <a href={item.href} className={baseClass} title={item.label}>
        <Icon className="h-4 w-4 md:h-4.5 lg:h-5" />
        <span className="hidden sm:inline">{item.label}</span>
      </a>
    );
  }

  return (
    <button onClick={item.onClick} className={baseClass} title={item.label}>
      <Icon className="h-4 w-4 md:h-4.5 lg:h-5" />
      <span className="hidden sm:inline">{item.label}</span>
    </button>
  );
}

function OverflowRow({
  item,
  onClick,
}: {
  item: NavItem;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const isLink = !!item.href;

  const content = (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white">
      <Icon className="h-4 w-4 text-white/40" />
      <span>{item.label}</span>
      {item.isActive && (
        <span className="ml-auto h-2 w-2 rounded-full bg-cyan-400" />
      )}
    </div>
  );

  if (isLink) {
    return (
      <a href={item.href} onClick={onClick} className="block">
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={() => {
        item.onClick?.();
        onClick();
      }}
      className="w-full text-left"
    >
      {content}
    </button>
  );
}

function SheetItem({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const Icon = item.icon;
  const isLink = !!item.href;

  const content = (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
        item.isActive
          ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
          : "border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium">{item.label}</span>
    </div>
  );

  if (isLink) {
    return (
      <a href={item.href} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={() => {
        item.onClick?.();
        onClick();
      }}
      className="w-full"
    >
      {content}
    </button>
  );
}

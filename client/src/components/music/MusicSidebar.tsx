/**
 * MusicSidebar — Left sidebar navigation for Musical Universe
 * Purple/pink theme — two nav sections (Core + Manage)
 * ARTISTS see full creative tools; STREAMERS see listen-only features
 * Bottom actions: + New Project (artists only), Notifications, Account, user profile
 */
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import {
  Home,
  Disc3,
  Library,
  BarChart3,
  DollarSign,
  Flame,
  FolderKanban,
  GitBranch,
  CalendarDays,
  Users,
  Music,
  Plus,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Sparkles,
  Music2,
  Headphones,
  Radio,
  Heart,
  Trophy,
  MessageCircle,
  Compass,
  LayoutDashboard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthContext } from "@/contexts/AuthContext";
import { MUSIC_SIDEBAR_ITEMS } from "@/lib/music-routes";
import { useMemo } from "react";
import { useMusicAccess } from "@/hooks/useMusicAccess";

const sidebarIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Home,
  Disc3,
  Library,
  BarChart3,
  DollarSign,
  Flame,
  FolderKanban,
  GitBranch,
  CalendarDays,
  Users,
  Music,
  Headphones,
  Radio,
  Heart,
  Trophy,
  MessageCircle,
  Compass,
  LayoutDashboard,
};

/* ─── Logo with single/double/hold-to-home gesture ─── */
function LogoWithHoldToHome({
  navigate,
  isArtist = false,
}: {
  navigate: (to: string) => void;
  isArtist?: boolean;
}) {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fadeProgress, setFadeProgress] = useState(0);
  const [holdCountdown, setHoldCountdown] = useState(3);
  const didHold = useRef(false);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (fadeInterval.current) {
      clearInterval(fadeInterval.current);
      fadeInterval.current = null;
    }
    if (!didHold.current) setFadeProgress(0);
  }, []);

  const startHold = useCallback(() => {
    didHold.current = false;
    const start = Date.now();
    setHoldCountdown(3);
    fadeInterval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 3000, 1);
      setFadeProgress(progress);
      setHoldCountdown(Math.max(0, Math.ceil(3 - elapsed / 1000)));
    }, 30);
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      if (fadeInterval.current) {
        clearInterval(fadeInterval.current);
        fadeInterval.current = null;
      }
      setFadeProgress(1);
      setTimeout(() => {
        navigate("/");
        setTimeout(() => setFadeProgress(0), 300);
      }, 300);
    }, 3000);
  }, [navigate]);

  const handleTap = useCallback(() => {
    if (didHold.current) {
      didHold.current = false;
      return;
    }
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      const count = tapCountRef.current;
      tapCountRef.current = 0;
      if (count >= 2) {
        // Double tap → Public site home
        navigate("/");
      } else {
        // Single tap → Music home (dashboard or stream)
        navigate(isArtist ? "/music/dashboard" : "/stream");
      }
    }, 300);
  }, [navigate, isArtist]);

  return (
    <>
      {/* Full-screen darkening overlay during 3s hold */}
      {fadeProgress > 0 && (
        <div
          className="fixed inset-0 bg-black/95 z-[9998] flex items-center justify-center pointer-events-none transition-opacity duration-100"
          style={{ opacity: fadeProgress * 0.95 }}
        >
          <div className="flex flex-col items-center gap-3">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(168,85,247,0.2)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(168,85,247,0.9)"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - fadeProgress)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: "stroke-dashoffset 0.05s linear" }}
              />
              <text
                x="40"
                y="46"
                textAnchor="middle"
                fill="white"
                fontSize="20"
                fontWeight="bold"
              >
                {holdCountdown}
              </text>
            </svg>
            <span className="text-white/70 text-sm">Retour à l'accueil…</span>
          </div>
        </div>
      )}
      <div
        className="h-14 flex-shrink-0 flex items-center justify-center cursor-pointer group relative overflow-hidden select-none bg-[#0a0512] z-[2]"
        onMouseDown={startHold}
        onMouseUp={() => {
          clearHold();
          handleTap();
        }}
        onMouseLeave={clearHold}
        onTouchStart={(e) => {
          e.preventDefault();
          startHold();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          clearHold();
          handleTap();
        }}
        onTouchCancel={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        title={
          isArtist
            ? "Tap=Artist Dashboard · Double-tap=Public home · Hold 3s=Public home"
            : "Tap=Music Universe · Double-tap=Public home · Hold 3s=Public home"
        }
      >
        {/* Ambient glow behind logo on hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 via-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* Logo container with purple glow */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-[-4px] rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-40 group-hover:opacity-70 blur-lg transition-opacity" />
          <img
            src="https://i.ibb.co/8DL5vH7M/v-logo-extracted.png"
            alt="VersoAir"
            className="relative w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-200"
            style={{
              filter:
                "brightness(1.3) saturate(1.2) drop-shadow(0 0 10px rgba(168,85,247,0.8))",
            }}
          />
        </div>
      </div>
    </>
  );
}

export function MusicSidebar() {
  const [pathname, navigate] = useLocation();
  const { user, logout } = useAuthContext();
  const { isArtist, isLoading: accessLoading } = useMusicAccess();

  // Always collapsed for fixed 64px sidebar
  const collapsed = true;

  const handleLogout = () => {
    logout();
    navigate("/artist-portal");
  };

  // Artist-only items (creative tools)
  const ARTIST_ONLY_IDS = [
    "studio",
    "vault",
    "insights",
    "royalties",
    "projects",
    "release-pipeline",
    "release-planner",
    "artists",
    "ar-dashboard",
  ];

  // Streamer-only items (listening features) - shown when NOT an artist
  const STREAMER_CORE_ITEMS = [
    {
      id: "home",
      label: "Home",
      href: "/stream",
      icon: "Home",
      section: "CORE",
    },
    {
      id: "discover",
      label: "Discover",
      href: "/stream",
      icon: "Radio",
      section: "CORE",
    },
    {
      id: "library",
      label: "My Library",
      href: "/music/library",
      icon: "Library",
      section: "CORE",
    },
    {
      id: "favorites",
      label: "Favorites",
      href: "/music/favorites",
      icon: "Heart",
      section: "CORE",
    },
    {
      id: "arena",
      label: "Arena",
      href: "/arena?from=stream",
      icon: "Trophy",
      section: "COMMUNITY",
    },
    {
      id: "community",
      label: "Community",
      href: "/streamer-portal?from=stream",
      icon: "MessageCircle",
      section: "COMMUNITY",
    },
  ];

  // Filter items based on user role
  const coreItems = useMemo(() => {
    if (!isArtist) {
      return [
        {
          id: "home",
          label: "Home",
          href: "/stream",
          icon: "Home",
          section: "CORE",
        },
        {
          id: "discover",
          label: "Discover",
          href: "/stream",
          icon: "Compass",
          section: "CORE",
        },
        {
          id: "library",
          label: "Library",
          href: "/music/library",
          icon: "Library",
          section: "CORE",
        },
        {
          id: "favorites",
          label: "Favorites",
          href: "/music/favorites",
          icon: "Heart",
          section: "CORE",
        },
        {
          id: "arena",
          label: "Arena",
          href: "/arena?from=stream",
          icon: "Trophy",
          section: "COMMUNITY",
        },
        {
          id: "community",
          label: "Community",
          href: "/streamer-portal?from=stream",
          icon: "MessageCircle",
          section: "COMMUNITY",
        },
      ];
    }
    return MUSIC_SIDEBAR_ITEMS.filter((i) => i.section === "CORE");
  }, [isArtist]);

  const manageItems = useMemo(() => {
    if (!isArtist) {
      // Streamers don't see management tools
      return [];
    }
    // Artists see all management tools
    return MUSIC_SIDEBAR_ITEMS.filter((i) => i.section === "MANAGE");
  }, [isArtist]);

  return (
    <aside className="hidden md:flex flex-col h-screen fixed top-0 left-0 z-[90] w-16 shadow-[0_0_30px_rgba(168,85,247,0.18)]">
      <div className="absolute inset-0 bg-[#0a0512]/90 backdrop-blur-xl border-r border-white/[0.08]" />
      <div className="absolute top-14 bottom-0 right-0 w-px bg-gradient-to-b from-purple-500/50 via-fuchsia-500/20 to-transparent" />
      <div className="absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-purple-500/30 via-purple-500/50 to-purple-500/60" />
      <div className="absolute top-14 right-0 w-2 h-2 bg-purple-500/30 rounded-bl-full" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Purple Eagle Logo — tap=dashboard, double-tap=home, hold 3s=darken then home */}
        <LogoWithHoldToHome navigate={navigate} isArtist={isArtist} />

        {/* ─── Core section ─── */}
        <nav className="px-2 space-y-1 pt-3 flex-shrink-0">
          {coreItems.map((item) => {
            const Icon = sidebarIconMap[item.icon];
            const isActive =
              pathname === item.href ||
              (item.id === "home" && pathname === "/music/dashboard") ||
              (item.id === "arena" && pathname.startsWith("/arena")) ||
              (item.id === "community" &&
                pathname.startsWith("/streamer-portal"));

            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  className={`relative flex items-center justify-center p-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
                    isActive
                      ? "text-white bg-purple-500/15"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
                  whileTap={{ scale: 0.95 }}
                  title={item.label}
                >
                  {Icon && (
                    <Icon
                      className={`w-5 h-5 ${
                        isActive
                          ? "text-purple-400"
                          : "text-white/50 group-hover:text-white/80"
                      }`}
                    />
                  )}
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActive"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-purple-400 to-fuchsia-500"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* ─── Manage section (Artists only) ─── */}
        {isArtist && manageItems.length > 0 ? (
          <>
            <div className="pt-3 border-t border-white/[0.04] mx-3 mt-2 flex-shrink-0" />

            <nav className="px-2 space-y-1 pt-2 flex-1 overflow-y-auto">
              {manageItems.map((item) => {
                const Icon = sidebarIconMap[item.icon];
                const isActive = pathname === item.href;

                return (
                  <Link key={item.id} href={item.href}>
                    <motion.div
                      className={`relative flex items-center justify-center p-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
                        isActive
                          ? "text-white bg-purple-500/15"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                      }`}
                      whileTap={{ scale: 0.95 }}
                      title={item.label}
                    >
                      {Icon && (
                        <Icon
                          className={`w-5 h-5 ${
                            isActive
                              ? "text-purple-400"
                              : "text-white/50 group-hover:text-white/80"
                          }`}
                        />
                      )}
                      {!collapsed && (
                        <span className="text-[13px] font-medium truncate">
                          {item.label}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="sidebarActiveManage"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-purple-400 to-fuchsia-500"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </>
        ) : (
          /* Streamers: flex spacer so bottom actions push down without squashing logo/nav */
          <div className="flex-1" />
        )}

        {/* ─── Bottom actions (icons only) ─── */}
        <div className="px-2 pb-3 space-y-1 border-t border-white/[0.04] pt-3 mt-auto flex-shrink-0">
          {/* New Project button - Artists only */}
          {isArtist && (
            <Link href="/music/studio">
              <motion.div
                className="flex items-center justify-center p-2.5 rounded-lg cursor-pointer bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 transition-colors"
                whileTap={{ scale: 0.95 }}
                title="New Project"
              >
                <Plus className="w-5 h-5" />
              </motion.div>
            </Link>
          )}

          {/* Notifications */}
          <div
            className="flex items-center justify-center p-2.5 rounded-lg cursor-pointer text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
            title="Notifications"
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
            </div>
          </div>

          {/* Account - track referrer for proper back navigation */}
          <Link
            href="/profile"
            onClick={() => sessionStorage.setItem("music_referrer", pathname)}
          >
            <div
              className="flex items-center justify-center p-2.5 rounded-lg cursor-pointer text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
              title="Account"
            >
              <Settings className="w-5 h-5" />
            </div>
          </Link>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2.5 rounded-lg cursor-pointer text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* User avatar */}
          <div className="flex items-center justify-center pt-2 border-t border-white/[0.04]">
            <Avatar className="w-9 h-9 border border-purple-500/20 cursor-pointer hover:border-purple-400/40 transition-colors">
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white text-xs">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default MusicSidebar;

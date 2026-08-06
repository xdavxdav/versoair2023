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
};

/* ─── Logo with hold-to-go-home gesture ─── */
function LogoWithHoldToHome({ navigate }: { navigate: (to: string) => void }) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fadeProgress, setFadeProgress] = useState(0); // 0=none, 1=fading, 2=black
  const fadeInterval = useRef<ReturnType<typeof setInterval> | null>(null);
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
    // Start fade animation over 3s
    const start = Date.now();
    fadeInterval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 3000, 1);
      setFadeProgress(progress);
    }, 30);
    // After 3s, go home
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      if (fadeInterval.current) {
        clearInterval(fadeInterval.current);
        fadeInterval.current = null;
      }
      setFadeProgress(1);
      // Brief pause at full black then navigate
      setTimeout(() => {
        navigate("/");
        // Reset fade after navigation
        setTimeout(() => setFadeProgress(0), 300);
      }, 400);
    }, 3000);
  }, [navigate]);

  const handleTap = useCallback(() => {
    if (didHold.current) return; // Was a hold, ignore
    navigate("/music/dashboard");
  }, [navigate]);

  return (
    <>
      {/* Full-screen black fade overlay */}
      {fadeProgress > 0 && (
        <div
          className="fixed inset-0 bg-black z-[9998] pointer-events-none transition-none"
          style={{ opacity: fadeProgress }}
        />
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
        title="Tap=Dashboard · Hold 3s=Home"
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
      href: "/music/dashboard",
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
  ];

  // Filter items based on user role
  const coreItems = useMemo(() => {
    if (!isArtist) {
      // Streamers see listen-only features
      return STREAMER_CORE_ITEMS;
    }
    // Artists see full creative suite
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
    <aside className="hidden md:flex flex-col h-screen fixed top-0 left-0 z-[95] w-16">
      {/* Glass background */}
      <div className="absolute inset-0 bg-[#0a0512] backdrop-blur-xl border-r border-white/[0.06]" />
      {/* Purple glow edge - vertical */}
      <div className="absolute top-14 bottom-0 right-0 w-px bg-gradient-to-b from-purple-500/50 via-fuchsia-500/20 to-transparent" />
      {/* Horizontal glow where sidebar header meets navbar - creates merge effect */}
      <div className="absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-purple-500/30 via-purple-500/50 to-purple-500/60" />
      {/* Corner accent - visual merge point */}
      <div className="absolute top-14 right-0 w-2 h-2 bg-purple-500/30 rounded-bl-full" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Purple Eagle Logo — tap=dashboard, hold 3s=fade-to-black then home */}
        <LogoWithHoldToHome navigate={navigate} />

        {/* ─── Core section ─── */}
        <nav className="px-2 space-y-1 pt-3 flex-shrink-0">
          {coreItems.map((item) => {
            const Icon = sidebarIconMap[item.icon];
            const isActive =
              pathname === item.href ||
              (item.id === "home" && pathname === "/music/dashboard");

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

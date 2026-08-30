/**
 * MusicNavbar — Premium frosted glass navigation for Musical Universe
 * Desktop: Sticky top bar with shimmer hover effects
 * Mobile: Dropdown menu for nav items
 * Active item: Purple glow pill
 */
import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Disc3,
  Library,
  BarChart3,
  Flame,
  Settings,
  Bell,
  User,
  ChevronDown,
  Music2,
  Sparkles,
  Menu,
  Home,
  MessageCircle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/contexts/AuthContext";
import { MUSIC_NAV_ITEMS, getActiveNavItem } from "@/lib/music-routes";
import { getDashboardDestination } from "@/lib/dashboard-routes";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Disc3,
  Library,
  BarChart3,
  Flame,
  Users,
};

export function MusicNavbar() {
  const [pathname, navigate] = useLocation();
  const { user, logout } = useAuthContext();
  const dashboard = getDashboardDestination(user);
  const activeItem = getActiveNavItem(pathname);
  const activeLabel =
    MUSIC_NAV_ITEMS.find((i) => i.id === activeItem)?.label || "Menu";

  // ── Home button: single-tap = /music/dashboard, double-tap = /, 3s hold = / with darken ──
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);
  const holdCompletedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdCountdown, setHoldCountdown] = useState(3);

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
        navigate("/"); // Double-tap → site home
      } else {
        navigate("/music/dashboard"); // Single-tap → music dashboard
      }
    }, 300);
  }, [navigate]);

  const handleHomePressStart = useCallback(() => {
    holdCompletedRef.current = false;
    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);
    setHoldCountdown(3);
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / 3000) * 100, 100);
      setHoldProgress(progress);
      setHoldCountdown(Math.max(0, Math.ceil(3 - elapsed / 1000)));
    }, 16);
    holdTimerRef.current = setTimeout(() => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setIsHolding(false);
      setHoldProgress(0);
      holdCompletedRef.current = true;
      navigate("/");
    }, 3000);
  }, [navigate]);

  const handleHomePressEnd = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  return (
    <>
      {/* Full-screen darkening overlay during 3s hold */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: (holdProgress / 100) * 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(0,0,0,0.95)" }}
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
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - holdProgress / 100)}`}
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
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full">
        {/* Frosted glass background */}
        <div className="absolute inset-0 bg-[#0a0512]/80 backdrop-blur-xl border-b border-white/[0.06]" />

        {/* Purple glow edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        <nav className="relative max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo — single tap = dashboard, double tap = site home, hold 3s = site home + darken */}
            <motion.div
              className="flex items-center gap-1.5 sm:gap-3 cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              onClick={handleHomeTap}
              onPointerDown={handleHomePressStart}
              onPointerUp={handleHomePressEnd}
              onPointerLeave={handleHomePressEnd}
              onPointerCancel={handleHomePressEnd}
              onContextMenu={(e) => e.preventDefault()}
              title="Tap=Dashboard · Double-tap=Verso Air home · Hold 3s=Home"
            >
              <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                {/* Purple glow behind - always visible */}
                <div className="absolute inset-[-4px] rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-40 group-hover:opacity-70 blur-lg transition-opacity" />
                {/* Eagle logo image with fallback */}
                <img
                  src="https://i.ibb.co/8DL5vH7M/v-logo-extracted.png"
                  alt="VersoAir"
                  className="relative w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-110 transition-transform duration-200"
                  style={{
                    filter:
                      "brightness(1.3) saturate(1.2) drop-shadow(0 0 10px rgba(168,85,247,0.8))",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden",
                    );
                  }}
                />
                {/* Fallback icon if image fails */}
                <div className="hidden absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600">
                  <Music2 className="w-5 h-5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="hidden xs:block sm:block">
                <span className="text-xs sm:text-base lg:text-lg font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent leading-tight">
                  Musical Universe
                </span>
                <p className="text-[7px] sm:text-[9px] lg:text-[10px] text-white/40 -mt-0.5 tracking-wide">
                  by VersoAir
                </p>
              </div>
            </motion.div>

            {/* Mobile Navigation Dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 h-auto text-white/80 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg"
                  >
                    <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium max-w-[5rem] truncate">
                      {activeLabel}
                    </span>
                    <ChevronDown className="w-3 h-3 text-white/40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="w-48 bg-[#0f0818]/95 backdrop-blur-xl border-white/10 text-white"
                >
                  {MUSIC_NAV_ITEMS.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive = activeItem === item.id;
                    const isDisabled =
                      item.id === "dashboard" && (!user || !user.id);
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        disabled={isDisabled}
                        className={`cursor-pointer ${
                          isDisabled
                            ? "opacity-40 cursor-not-allowed"
                            : isActive
                              ? "bg-purple-500/20 text-purple-300"
                              : "hover:bg-white/5"
                        }`}
                        onClick={() => !isDisabled && navigate(item.href)}
                      >
                        {Icon && <Icon className="w-4 h-4 mr-2" />}
                        {item.label}
                        {isDisabled && (
                          <span className="ml-auto text-[10px] text-white/30">
                            Login
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                  {user && user.id ? (
                    <>
                      <DropdownMenuItem
                        className="hover:bg-white/5 cursor-pointer"
                        onClick={() => navigate(dashboard.path)}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Main Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      {/* User info */}
                      <div className="px-2 py-2 flex items-center gap-2">
                        <Avatar className="w-8 h-8 border border-white/10">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                            {user?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white/90">
                            {user?.name || user?.username}
                          </p>
                          <p className="text-[10px] text-purple-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Artist
                          </p>
                        </div>
                      </div>
                      <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                        <Bell className="w-4 h-4 mr-2" />
                        Notifications
                        <span className="ml-auto w-2 h-2 bg-pink-500 rounded-full" />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-white/5 cursor-pointer"
                        onClick={() =>
                          window.dispatchEvent(new Event("messenger:open"))
                        }
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        className="hover:bg-white/5 cursor-pointer text-pink-400"
                        onClick={() => {
                          logout();
                          toast({
                            title: "Successfully logged out",
                            description:
                              "You've been disconnected from the music portal.",
                          });
                          navigate("/artist-portal");
                        }}
                      >
                        Sign out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        className="hover:bg-white/5 cursor-pointer text-purple-400"
                        onClick={() => navigate("/artist-portal/welcome")}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Sign in
                      </DropdownMenuItem>
                    </>
                  )}
                  {/* Portal link */}
                  <DropdownMenuSeparator className="bg-white/10" />
                  {(() => {
                    const portalDisabled =
                      pathname.startsWith("/artist-portal") ||
                      pathname === "/apply";
                    const portalHref =
                      user && user.id
                        ? "/artist-portal"
                        : "/artist-portal/welcome";
                    return (
                      <DropdownMenuItem
                        disabled={portalDisabled}
                        className={`cursor-pointer ${
                          portalDisabled
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-white/5 text-white/70"
                        }`}
                        onClick={() => !portalDisabled && navigate(portalHref)}
                      >
                        <Music2
                          className={`w-4 h-4 mr-2 ${portalDisabled ? "text-purple-400/50" : "text-purple-400"}`}
                        />
                        Portal
                      </DropdownMenuItem>
                    );
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Navigation Items */}
            <div className="hidden md:flex items-center gap-1">
              {MUSIC_NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = activeItem === item.id;
                const isDisabled =
                  item.id === "dashboard" && (!user || !user.id);

                const navContent = (
                  <motion.div
                    className={`relative px-3 lg:px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                      isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : isActive
                          ? "text-white cursor-pointer"
                          : "text-white/60 hover:text-white/90 cursor-pointer"
                    }`}
                    whileHover={isDisabled ? {} : { scale: 1.02 }}
                    whileTap={isDisabled ? {} : { scale: 0.98 }}
                    title={isDisabled ? "Login required" : item.label}
                  >
                    {/* Active background */}
                    {isActive && !isDisabled && (
                      <motion.div
                        layoutId="activeNavPill"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-purple-500/20 border border-purple-500/30"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}

                    {/* Hover shimmer */}
                    {!isActive && !isDisabled && (
                      <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white/[0.03]" />
                    )}

                    <Icon
                      className={`w-4 h-4 relative z-10 ${
                        isActive && !isDisabled ? "text-purple-400" : ""
                      }`}
                    />
                    <span className="hidden lg:inline text-sm font-medium relative z-10">
                      {item.label}
                    </span>

                    {/* Active glow */}
                    {isActive && !isDisabled && (
                      <motion.div
                        className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                );

                return isDisabled ? (
                  <div key={item.id}>{navContent}</div>
                ) : (
                  <Link key={item.id} href={item.href}>
                    {navContent}
                  </Link>
                );
              })}
            </div>

            {/* Right side actions - hidden on mobile, in dropdown instead */}
            <div className="hidden md:flex items-center gap-2">
              {user && user.id && (
                <Button
                  variant="ghost"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5"
                  onClick={() => navigate(dashboard.path)}
                  title={dashboard.label}
                >
                  <Home className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Main Dashboard</span>
                </Button>
              )}
              {/* Portal button */}
              {(() => {
                const portalDisabled =
                  pathname.startsWith("/artist-portal") ||
                  pathname === "/apply";
                const portalHref =
                  user && user.id ? "/artist-portal" : "/artist-portal/welcome";
                return (
                  <Button
                    variant="ghost"
                    disabled={portalDisabled}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${
                      portalDisabled
                        ? "opacity-40 cursor-not-allowed text-white/40"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => !portalDisabled && navigate(portalHref)}
                  >
                    <Music2
                      className={`w-4 h-4 ${portalDisabled ? "text-purple-400/50" : "text-purple-400"}`}
                    />
                    <span className="text-sm">Portal</span>
                  </Button>
                );
              })()}

              {user && user.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/60 hover:text-white hover:bg-white/5 w-10 h-10"
                    onClick={() =>
                      window.dispatchEvent(new Event("messenger:open"))
                    }
                    title="Messages"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>

                  {/* Notifications */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-white/60 hover:text-white hover:bg-white/5 w-10 h-10"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
                  </Button>

                  {/* User menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-white/5"
                      >
                        <Avatar className="w-8 h-8 border border-white/10">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                            {user?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="hidden lg:block text-left">
                          <p className="text-sm font-medium text-white/90">
                            {user?.name || user?.username}
                          </p>
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span className="text-[10px] text-purple-400">
                              Artist
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-white/40 hidden lg:block" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-[#0f0818]/95 backdrop-blur-xl border-white/10 text-white"
                    >
                      <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-sm font-medium">{user?.username}</p>
                        <p className="text-xs text-white/50">{user?.email}</p>
                      </div>
                      <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem
                        className="hover:bg-white/5 cursor-pointer text-pink-400"
                        onClick={() => {
                          logout();
                          toast({
                            title: "Successfully logged out",
                            description:
                              "You've been disconnected from the music portal.",
                          });
                          navigate("/artist-portal");
                        }}
                      >
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:text-purple-300 hover:bg-white/5 border border-purple-500/30 rounded-lg"
                  onClick={() => navigate("/artist-portal/welcome")}
                >
                  <User className="w-4 h-4" />
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

export default MusicNavbar;

/**
 * MusicNavbar — Premium frosted glass navigation for Musical Universe
 * Desktop: Sticky top bar with shimmer hover effects
 * Active item: Purple glow pill
 */
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Disc3,
  Library,
  BarChart3,
  Flame,
};

export function MusicNavbar() {
  const [pathname] = useLocation();
  const { user, logout } = useAuthContext();
  const activeItem = getActiveNavItem(pathname);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-[#0a0512]/80 backdrop-blur-xl border-b border-white/[0.06]" />

      {/* Purple glow edge */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/music/dashboard">
            <motion.div
              className="flex items-center gap-3 cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                  <Music2 className="w-5 h-5 text-white" />
                </div>
                <motion.div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-50 blur-md transition-opacity" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                  Musical Universe
                </span>
                <p className="text-[10px] text-white/40 -mt-0.5">by VersoAir</p>
              </div>
            </motion.div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-1">
            {MUSIC_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = activeItem === item.id;

              return (
                <Link key={item.id} href={item.href}>
                  <motion.div
                    className={`relative px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-white/60 hover:text-white/90"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active background */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavPill"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-purple-500/20 border border-purple-500/30"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}

                    {/* Hover shimmer */}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white/[0.03]" />
                    )}

                    <Icon
                      className={`w-4 h-4 relative z-10 ${isActive ? "text-purple-400" : ""}`}
                    />
                    <span className="text-sm font-medium relative z-10">
                      {item.label}
                    </span>

                    {/* Active glow */}
                    {isActive && (
                      <motion.div
                        className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/60 hover:text-white hover:bg-white/5"
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
                      {user?.username || "Creator"}
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
                  onClick={() => logout()}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default MusicNavbar;

/**
 * MusicSidebar — Left sidebar navigation for Musical Universe
 * Purple/pink theme — two nav sections (Core + Manage)
 * Bottom actions: + New Project, Notifications, Account, user profile
 */
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthContext } from "@/contexts/AuthContext";
import { MUSIC_SIDEBAR_ITEMS } from "@/lib/music-routes";
import { useState } from "react";

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
};

export function MusicSidebar() {
  const [pathname, navigate] = useLocation();
  const { user, logout } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/artist-portal");
  };

  const coreItems = MUSIC_SIDEBAR_ITEMS.filter((i) => i.section === "CORE");
  const manageItems = MUSIC_SIDEBAR_ITEMS.filter((i) => i.section === "MANAGE");

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 z-40 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[#0a0512]/95 backdrop-blur-xl border-r border-white/[0.06]" />
      {/* Purple glow edge */}
      <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-purple-500/20 via-fuchsia-500/10 to-transparent" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Logo + collapse toggle */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <span className="text-sm font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent truncate block">
                Musical Universe
              </span>
              <p className="text-[9px] text-white/30 -mt-0.5">by VersoAir</p>
            </motion.div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          >
            {collapsed ? (
              <Menu className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ─── Core section ─── */}
        {!collapsed && (
          <div className="px-5 pt-3 pb-1.5">
            <span className="text-[10px] font-semibold tracking-widest text-purple-400/50 uppercase">
              Core
            </span>
          </div>
        )}

        <nav className="px-3 space-y-0.5">
          {coreItems.map((item) => {
            const Icon = sidebarIconMap[item.icon];
            const isActive =
              pathname === item.href ||
              (item.id === "home" && pathname === "/music/dashboard");

            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
                    isActive
                      ? "text-white bg-purple-500/15"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {Icon && (
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 ${
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
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActive"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-purple-400 to-fuchsia-500"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  {/* Live badge for Royale */}
                  {item.id === "live" && !collapsed && (
                    <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      LIVE
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* ─── Manage section ─── */}
        {!collapsed && (
          <div className="px-5 pt-5 pb-1.5">
            <span className="text-[10px] font-semibold tracking-widest text-purple-400/50 uppercase">
              Manage
            </span>
          </div>
        )}
        {collapsed && (
          <div className="pt-3 border-t border-white/[0.04] mx-3" />
        )}

        <nav className="px-3 space-y-0.5 flex-1 overflow-y-auto">
          {manageItems.map((item) => {
            const Icon = sidebarIconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
                    isActive
                      ? "text-white bg-purple-500/15"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {Icon && (
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 ${
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

        {/* ─── Bottom actions ─── */}
        <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.04] pt-3 mt-auto">
          {/* New Project button */}
          <Link href="/music/studio">
            <motion.div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 transition-colors ${
                collapsed ? "justify-center" : ""
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium">New Project</span>
              )}
            </motion.div>
          </Link>

          {/* Notifications */}
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="relative flex-shrink-0">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
            </div>
            {!collapsed && (
              <span className="text-[13px] font-medium">Notifications</span>
            )}
          </div>

          {/* Account */}
          <Link href="/music/settings">
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <Settings className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium">Account</span>
              )}
            </div>
          </Link>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && (
              <span className="text-[13px] font-medium">Sign out</span>
            )}
          </button>

          {/* User profile footer */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-3 mt-1 border-t border-white/[0.04]">
              <Avatar className="w-8 h-8 border border-purple-500/20">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white text-[10px]">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">
                  {user?.username || "Creator"}
                </p>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  <span className="text-[10px] text-purple-400/80">Artist</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default MusicSidebar;

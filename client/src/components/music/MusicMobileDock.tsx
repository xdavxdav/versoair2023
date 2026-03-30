/**
 * MusicMobileDock — Bottom navigation dock for Musical Universe (mobile)
 * 5 icon tabs with center FAB, mini header for branding
 */
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Disc3,
  Library,
  Flame,
  User,
  Plus,
  Music2,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/contexts/AuthContext";
import { MUSIC_MOBILE_NAV_ITEMS, getActiveNavItem } from "@/lib/music-routes";
import { useState } from "react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Disc3,
  Library,
  Flame,
  User,
};

interface MusicMobileDockProps {
  onFabClick?: () => void;
}

export function MusicMobileDock({ onFabClick }: MusicMobileDockProps) {
  const [pathname] = useLocation();
  const { user } = useAuthContext();
  const activeItem = getActiveNavItem(pathname);
  const [fabExpanded, setFabExpanded] = useState(false);

  return (
    <>
      {/* Mini top header */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-[#0a0512]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Logo */}
            <Link href="/music/dashboard">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white text-sm">
                  Musical Universe
                </span>
              </div>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 h-9 w-9"
              >
                <Search className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white/60 h-9 w-9"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom dock */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0a0512]/95 backdrop-blur-xl border-t border-white/[0.06]" />

        {/* Safe area padding for notched phones */}
        <div className="relative pb-safe">
          <div className="flex items-center justify-around px-2 h-16">
            {MUSIC_MOBILE_NAV_ITEMS.slice(0, 2).map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeItem === item.id}
              />
            ))}

            {/* Center FAB */}
            <div className="relative -mt-6">
              <motion.button
                onClick={() => {
                  setFabExpanded(!fabExpanded);
                  onFabClick?.();
                }}
                className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: fabExpanded ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="w-6 h-6 text-white" />
                </motion.div>

                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-40 blur-md -z-10" />
              </motion.button>

              {/* FAB expanded menu */}
              <AnimatePresence>
                {fabExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col gap-2"
                  >
                    <FabOption
                      icon={<Disc3 className="w-4 h-4" />}
                      label="New Request"
                      href="/music/studio"
                      onClick={() => setFabExpanded(false)}
                    />
                    <FabOption
                      icon={<Music2 className="w-4 h-4" />}
                      label="Upload Track"
                      href="/music/vault"
                      onClick={() => setFabExpanded(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {MUSIC_MOBILE_NAV_ITEMS.slice(2, 4).map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeItem === item.id}
              />
            ))}

            {/* Profile with avatar */}
            <Link href="/music/settings">
              <motion.div
                className="flex flex-col items-center gap-0.5 px-3 py-1"
                whileTap={{ scale: 0.95 }}
              >
                <Avatar className="w-6 h-6 border border-white/10">
                  <AvatarImage src={(user as any)?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px]">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`text-[10px] ${activeItem === "profile" ? "text-purple-400" : "text-white/50"}`}
                >
                  Profile
                </span>
              </motion.div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Overlay when FAB expanded */}
      <AnimatePresence>
        {fabExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setFabExpanded(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function NavItem({
  item,
  isActive,
}: {
  item: (typeof MUSIC_MOBILE_NAV_ITEMS)[number];
  isActive: boolean;
}) {
  const Icon = iconMap[item.icon];

  return (
    <Link href={item.href}>
      <motion.div
        className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
        whileTap={{ scale: 0.95 }}
      >
        {isActive && (
          <motion.div
            layoutId="activeMobileTab"
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            transition={{ duration: 0.2 }}
          />
        )}
        <Icon
          className={`w-5 h-5 ${isActive ? "text-purple-400" : "text-white/50"}`}
        />
        <span
          className={`text-[10px] ${isActive ? "text-purple-400" : "text-white/50"}`}
        >
          {item.label}
        </span>
      </motion.div>
    </Link>
  );
}

function FabOption({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <motion.div
        className="flex items-center gap-2 px-4 py-2 bg-[#1a0f2e]/90 backdrop-blur-md rounded-full border border-purple-500/30 whitespace-nowrap"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="text-purple-400">{icon}</div>
        <span className="text-sm text-white">{label}</span>
      </motion.div>
    </Link>
  );
}

export default MusicMobileDock;

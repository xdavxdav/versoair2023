/**
 * MusicEmptyState — Beautiful empty states with illustration
 */
import { motion } from "framer-motion";
import {
  Music2,
  Disc3,
  Library,
  BarChart3,
  Flame,
  Plus,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type EmptyStateType =
  | "tracks"
  | "requests"
  | "analytics"
  | "contests"
  | "generic";

interface MusicEmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const presets: Record<
  EmptyStateType,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: { label: string; href: string };
  }
> = {
  tracks: {
    icon: Music2,
    title: "No tracks yet",
    description: "Upload your first track to start building your library",
    action: { label: "Upload Track", href: "/music/vault?action=upload" },
  },
  requests: {
    icon: Disc3,
    title: "No production requests",
    description: "Start a new request to work with our talented beatmakers",
    action: { label: "New Request", href: "/music/studio" },
  },
  analytics: {
    icon: BarChart3,
    title: "No analytics data",
    description: "Release some music to start tracking your performance",
    action: { label: "Go to Vault", href: "/music/vault" },
  },
  contests: {
    icon: Flame,
    title: "No active contests",
    description: "Check back soon for new competition opportunities",
    action: { label: "View Arena", href: "/music/live" },
  },
  generic: {
    icon: Library,
    title: "Nothing here yet",
    description: "This section is waiting for some content",
  },
};

export function MusicEmptyState({
  type = "generic",
  title,
  description,
  icon,
  action,
}: MusicEmptyStateProps) {
  const preset = presets[type];
  const Icon = icon || preset.icon;
  const finalTitle = title || preset.title;
  const finalDescription = description || preset.description;
  const finalAction = action || preset.action;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Animated icon */}
      <motion.div
        className="mb-6 relative"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
          <Icon className="w-10 h-10 text-purple-400/60" />
        </div>

        {/* Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-xl -z-10" />
      </motion.div>

      <h3 className="text-xl font-semibold text-white mb-2">{finalTitle}</h3>
      <p className="text-white/50 max-w-sm mb-6">{finalDescription}</p>

      {finalAction &&
        (finalAction.href ? (
          <Link href={finalAction.href}>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              {finalAction.label}
            </Button>
          </Link>
        ) : (
          <Button
            onClick={finalAction.onClick}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {finalAction.label}
          </Button>
        ))}
    </motion.div>
  );
}

export default MusicEmptyState;

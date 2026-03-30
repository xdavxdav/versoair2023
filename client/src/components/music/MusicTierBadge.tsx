/**
 * MusicTierBadge — Spark/Flame/Blaze/Inferno tier display
 */
import { motion } from "framer-motion";
import { Sparkles, Flame, Zap, Crown } from "lucide-react";

type TierLevel =
  | "spark"
  | "flame"
  | "blaze"
  | "inferno"
  | "free"
  | "supporter"
  | "champion"
  | "patron";

interface MusicTierBadgeProps {
  tier: TierLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

const tierConfig: Record<
  TierLevel,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    glow: string;
    textColor: string;
  }
> = {
  free: {
    name: "Free",
    icon: Sparkles,
    gradient: "from-gray-500 to-gray-600",
    glow: "shadow-gray-500/20",
    textColor: "text-gray-400",
  },
  spark: {
    name: "Spark",
    icon: Sparkles,
    gradient: "from-blue-400 to-cyan-500",
    glow: "shadow-blue-500/30",
    textColor: "text-blue-400",
  },
  supporter: {
    name: "Supporter",
    icon: Sparkles,
    gradient: "from-blue-400 to-cyan-500",
    glow: "shadow-blue-500/30",
    textColor: "text-blue-400",
  },
  flame: {
    name: "Flame",
    icon: Flame,
    gradient: "from-orange-400 to-red-500",
    glow: "shadow-orange-500/30",
    textColor: "text-orange-400",
  },
  champion: {
    name: "Champion",
    icon: Flame,
    gradient: "from-purple-400 to-fuchsia-500",
    glow: "shadow-purple-500/30",
    textColor: "text-purple-400",
  },
  blaze: {
    name: "Blaze",
    icon: Zap,
    gradient: "from-purple-400 to-pink-500",
    glow: "shadow-purple-500/30",
    textColor: "text-purple-400",
  },
  inferno: {
    name: "Inferno",
    icon: Crown,
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glow: "shadow-amber-500/40",
    textColor: "text-amber-400",
  },
  patron: {
    name: "Patron",
    icon: Crown,
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glow: "shadow-amber-500/40",
    textColor: "text-amber-400",
  },
};

const sizes = {
  sm: { badge: "h-6 px-2", icon: "w-3 h-3", text: "text-xs" },
  md: { badge: "h-8 px-3", icon: "w-4 h-4", text: "text-sm" },
  lg: { badge: "h-10 px-4", icon: "w-5 h-5", text: "text-base" },
};

export function MusicTierBadge({
  tier,
  size = "md",
  showLabel = true,
  animate = true,
}: MusicTierBadgeProps) {
  const config = tierConfig[tier] || tierConfig.free;
  const sizeConfig = sizes[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={`inline-flex items-center gap-1.5 ${sizeConfig.badge} rounded-full bg-gradient-to-r ${config.gradient} ${config.glow} shadow-lg`}
    >
      <Icon className={`${sizeConfig.icon} text-white`} />
      {showLabel && (
        <span className={`${sizeConfig.text} font-semibold text-white`}>
          {config.name}
        </span>
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
}

export default MusicTierBadge;

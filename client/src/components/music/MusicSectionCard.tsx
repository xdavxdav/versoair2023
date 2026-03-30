/**
 * MusicSectionCard — Glass card for dashboard sections
 */
import { motion } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface MusicSectionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  href: string;
  stats?: { label: string; value: string | number }[];
  gradient?: "purple" | "pink" | "blue" | "amber";
  badge?: string;
  disabled?: boolean;
}

const gradients = {
  purple:
    "from-purple-500/20 to-purple-600/10 hover:from-purple-500/30 hover:to-purple-600/20",
  pink: "from-pink-500/20 to-fuchsia-600/10 hover:from-pink-500/30 hover:to-fuchsia-600/20",
  blue: "from-blue-500/20 to-cyan-600/10 hover:from-blue-500/30 hover:to-cyan-600/20",
  amber:
    "from-amber-500/20 to-orange-600/10 hover:from-amber-500/30 hover:to-orange-600/20",
};

const iconBg = {
  purple: "from-purple-500 to-purple-600",
  pink: "from-pink-500 to-fuchsia-600",
  blue: "from-blue-500 to-cyan-600",
  amber: "from-amber-500 to-orange-600",
};

export function MusicSectionCard({
  title,
  description,
  icon: Icon,
  href,
  stats,
  gradient = "purple",
  badge,
  disabled = false,
}: MusicSectionCardProps) {
  const content = (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${gradients[gradient]} backdrop-blur-md p-5 transition-all duration-300 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {/* Hover glow */}
      {!disabled && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div
            className={`absolute -inset-1 bg-gradient-to-r ${iconBg[gradient]} opacity-10 blur-xl`}
          />
        </div>
      )}

      {/* Badge */}
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          {badge}
        </span>
      )}

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconBg[gradient]} flex items-center justify-center mb-4 shadow-lg`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Title + description */}
      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-white/90 transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-white/50 mb-3">{description}</p>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div className="flex gap-4 pt-3 border-t border-white/5">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Arrow */}
      {!disabled && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
          <ArrowRight className="w-5 h-5 text-white/60" />
        </div>
      )}
    </motion.div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default MusicSectionCard;

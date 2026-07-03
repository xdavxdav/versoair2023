/**
 * MusicSectionCard — Glass card for dashboard sections
 * Can be used as a link card (with href) or container card (with children)
 */
import { motion } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { ReactNode } from "react";

interface MusicSectionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  stats?: { label: string; value: string | number }[];
  gradient?: "purple" | "pink" | "blue" | "amber";
  badge?: string;
  disabled?: boolean;
  children?: ReactNode;
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
  children,
}: MusicSectionCardProps) {
  // Container mode: when children are provided, render as a section container
  if (children) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-md p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg[gradient]} flex items-center justify-center shadow-lg`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-white/50 mb-4">{description}</p>
        )}
        {/* Content */}
        {children}
      </motion.div>
    );
  }

  // Link card mode: original behavior
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

  return href ? <Link href={href}>{content}</Link> : content;
}

export default MusicSectionCard;

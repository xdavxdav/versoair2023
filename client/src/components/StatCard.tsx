import React from "react";
import { Lock, TrendingUp, TrendingDown } from "lucide-react";
import { StatMetric } from "@/lib/industry-kpis";
import AnimatedKeyboardText from "./AnimatedKeyboardText";

interface StatCardProps {
  stat: StatMetric;
  tier: string;
  isLocked?: boolean;
}

/**
 * StatCard with tier-based visibility
 * - Free tier: Show community stats, blur premium stats
 * - Pro/Pro Verified: Show personal/comparison stats
 * - Pro Max/Enterprise: Show all stats with predictive insights
 */
export const StatCard: React.FC<StatCardProps> = ({
  stat,
  tier,
  isLocked = false,
}) => {
  const Icon = stat.icon;
  const showLock = stat.premium && (tier === "free" || isLocked);

  const tiers = {
    free: "bg-slate-50 border-slate-200",
    pro_essential: "bg-blue-50 border-blue-200",
    pro_verified: "bg-indigo-50 border-indigo-200",
    pro_max: "bg-purple-50 border-purple-200",
    enterprise: "bg-violet-50 border-violet-200",
  };

  const bgColor = tiers[tier as keyof typeof tiers] || tiers.free;
  const opacity = showLock ? "opacity-60" : "opacity-100";

  return (
    <div
      className={`
        p-6 rounded-2xl border-2 transition-all duration-300
        ${bgColor} ${opacity}
        ${showLock ? "cursor-not-allowed" : "hover:shadow-md"}
      `}
    >
      {/* Header with Icon and Lock */}
      <div className="flex justify-between items-start mb-4">
        <Icon
          className={`h-5 w-5 ${
            showLock
              ? "text-slate-400"
              : tier === "enterprise"
                ? "text-violet-600"
                : tier === "pro_max"
                  ? "text-purple-600"
                  : tier === "pro_verified"
                    ? "text-indigo-600"
                    : "text-blue-600"
          }`}
        />
        {showLock && (
          <div className="flex items-center gap-1 bg-slate-200 rounded-full px-2 py-1">
            <Lock className="h-3 w-3 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Upgrade</span>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-sm text-slate-600 font-medium mb-2">
        <AnimatedKeyboardText text={stat.label} variant="slow" delay={80} />
      </p>

      {/* Value or Locked State */}
      {showLock ? (
        <div className="space-y-2">
          <div className="h-8 w-32 bg-slate-300 animate-pulse rounded" />
          <p className="text-xs text-slate-500">
            Upgrade to {tier === "free" ? "Pro Essential" : "next tier"} to
            unlock
          </p>
        </div>
      ) : (
        <>
          <h4
            className={`text-2xl font-bold mb-1 ${
              tier === "enterprise"
                ? "text-violet-900"
                : tier === "pro_max"
                  ? "text-purple-900"
                  : tier === "pro_verified"
                    ? "text-indigo-900"
                    : "text-blue-900"
            }`}
          >
            {stat.value}
            {stat.suffix && (
              <span className="text-sm text-slate-600 ml-1">{stat.suffix}</span>
            )}
          </h4>

          {/* Trend Indicator */}
          {stat.trend && stat.trendValue && (
            <div className="flex items-center gap-1 text-xs font-medium">
              {stat.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : stat.trend === "down" ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-slate-400" />
              )}
              <span
                className={
                  stat.trend === "up"
                    ? "text-green-600"
                    : stat.trend === "down"
                      ? "text-red-600"
                      : "text-slate-600"
                }
              >
                {stat.trendValue}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * StatGrid: Display multiple stat cards with responsive layout
 */
interface StatGridProps {
  stats: StatMetric[];
  tier: string;
  maxCols?: number;
}

export const StatGrid: React.FC<StatGridProps> = ({
  stats,
  tier,
  maxCols = 4,
}) => {
  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(maxCols, 4)}`}
    >
      {stats.map((stat, idx) => (
        <StatCard key={idx} stat={stat} tier={tier} />
      ))}
    </div>
  );
};

export default StatCard;

/**
 * MusicHero — Greeting + status + main CTA card for dashboard
 */
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, TrendingUp, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";

interface MusicHeroProps {
  stats?: {
    streams?: number;
    tracks?: number;
    followers?: number;
    earnings?: number;
  };
  primaryCta?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
}

export function MusicHero({
  stats = {},
  primaryCta = { label: "Open Studio", href: "/music/studio" },
}: MusicHeroProps) {
  const { user } = useAuthContext();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-purple-900/40 via-fuchsia-900/30 to-pink-900/40 p-6 md:p-8"
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left side - Greeting */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300/80">
                Musical Universe
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                {user?.name || user?.username || "there"}
              </span>
            </h1>

            <p className="text-white/50 max-w-md">
              Ready to create something amazing? Your studio awaits.
            </p>
          </div>

          {/* Right side - CTA */}
          <div className="flex-shrink-0">
            <Link href={primaryCta.href}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all group"
              >
                {primaryCta.icon || <Music2 className="w-5 h-5 mr-2" />}
                {primaryCta.label}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        {Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
            {stats.streams !== undefined && (
              <StatItem
                label="Total Streams"
                value={formatNumber(stats.streams)}
                trend="+12%"
              />
            )}
            {stats.tracks !== undefined && (
              <StatItem label="Tracks" value={stats.tracks.toString()} />
            )}
            {stats.followers !== undefined && (
              <StatItem
                label="Followers"
                value={formatNumber(stats.followers)}
                trend="+8%"
              />
            )}
            {stats.earnings !== undefined && (
              <StatItem
                label="Earnings"
                value={`$${formatNumber(stats.earnings)}`}
                trend="+15%"
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatItem({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-white/50">{label}</p>
        {trend && (
          <span className="flex items-center text-xs text-emerald-400">
            <TrendingUp className="w-3 h-3 mr-0.5" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default MusicHero;

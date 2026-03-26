/**
 * Revenue Pulse Dashboard — Artist Royalty Visualization
 *
 * Weekly pool status • Impact Score • Leaderboard • Badge progression
 * Dark portal theme: bg-[#06020f], purple/fuchsia gradients, glass cards
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Music,
  Users,
  Award,
  Crown,
  Zap,
  BarChart3,
  Target,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Shield,
  ChevronRight,
  RefreshCw,
  Wallet,
  PieChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/animations";

const API = "/api/revenue-pulse";

// ── Types ──
interface PoolStatus {
  weekNumber: number;
  yearNumber: number;
  totalPool: string;
  guaranteedPool: string;
  performancePool: string;
  platformPool: string;
  totalStreams: number;
  totalArtists: number;
  status: string;
}

interface ImpactScore {
  artistProfileId: number;
  stageName: string;
  impactScore: number;
  streamCount: number;
  uniqueListeners: number;
  avgDuration: number;
  completionRate: number;
  badgeTier: number;
  badgeName: string;
  revenueBoost: number;
  estimatedPayout: string;
}

interface LeaderboardEntry {
  rank: number;
  artistProfileId: number;
  stageName: string;
  profileImageUrl: string | null;
  impactScore: number;
  streams: number;
  badgeTier: number;
  division: string;
}

// Badge tiers with colors + icons
const BADGE_TIERS = [
  {
    name: "Initiate",
    color: "bg-gray-500/20 text-gray-300",
    icon: Shield,
    streams: "0",
    boost: "0%",
  },
  {
    name: "Bronze",
    color: "bg-amber-700/20 text-amber-400",
    icon: Shield,
    streams: "10K",
    boost: "+2%",
  },
  {
    name: "Silver",
    color: "bg-slate-400/20 text-slate-300",
    icon: Star,
    streams: "50K",
    boost: "+5%",
  },
  {
    name: "Gold",
    color: "bg-yellow-500/20 text-yellow-300",
    icon: Crown,
    streams: "200K",
    boost: "+10%",
  },
  {
    name: "Platinum",
    color: "bg-purple-500/20 text-purple-300",
    icon: Award,
    streams: "1M",
    boost: "+15%",
  },
  {
    name: "Diamond",
    color: "bg-cyan-400/20 text-cyan-300",
    icon: Zap,
    streams: "5M",
    boost: "+20%",
  },
  {
    name: "Legendary Titan",
    color: "bg-red-500/20 text-red-300",
    icon: Flame,
    streams: "25M",
    boost: "+30%",
  },
];

// ═══════════════════════════════════════════════════════════
// Pool Overview Card
// ═══════════════════════════════════════════════════════════
function PoolOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-pulse", "pool"],
    queryFn: async () => {
      const res = await fetch(`${API}/pool-status`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const pool: PoolStatus | null = data?.pool || null;

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-white/5 animate-pulse" />;
  }

  if (!pool) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-8 text-center">
          <PieChart className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">No active pool data yet</p>
          <p className="text-sm text-gray-500">
            Pool data populates after the weekly cycle runs
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = parseFloat(pool.totalPool || "0");
  const guaranteed = parseFloat(pool.guaranteedPool || "0");
  const performance = parseFloat(pool.performancePool || "0");
  const platform = parseFloat(pool.platformPool || "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-r from-emerald-900/30 via-purple-900/20 to-fuchsia-900/30 border-emerald-500/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0">
              Week {pool.weekNumber}/{pool.yearNumber}
            </Badge>
            <Badge
              variant="outline"
              className={
                pool.status === "active"
                  ? "border-green-500/40 text-green-400"
                  : "border-gray-500/40 text-gray-400"
              }
            >
              {pool.status === "active" ? "● Active" : pool.status}
            </Badge>
          </div>
          <CardTitle className="text-white text-2xl mt-2 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            Weekly Revenue Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent">
              ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-400 mt-1">Total pool this week</p>
          </div>

          {/* Pool breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Guaranteed (20%)</p>
              <p className="text-lg font-bold text-emerald-300">
                ${guaranteed.toFixed(0)}
              </p>
              <Progress value={20} className="h-1 mt-2" />
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Performance (70%)</p>
              <p className="text-lg font-bold text-purple-300">
                ${performance.toFixed(0)}
              </p>
              <Progress value={70} className="h-1 mt-2" />
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Platform (10%)</p>
              <p className="text-lg font-bold text-fuchsia-300">
                ${platform.toFixed(0)}
              </p>
              <Progress value={10} className="h-1 mt-2" />
            </div>
          </div>

          <Separator className="bg-white/10 my-4" />

          <div className="flex justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-1">
              <Music className="w-4 h-4" />{" "}
              {(pool.totalStreams || 0).toLocaleString()} streams
            </span>
            <span className="text-gray-400 flex items-center gap-1">
              <Users className="w-4 h-4" /> {pool.totalArtists || 0} artists
              earning
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Impact Score — Personal Artist Performance
// ═══════════════════════════════════════════════════════════
function MyImpactScore() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-pulse", "impact"],
    queryFn: async () => {
      const res = await fetch(`${API}/my-impact`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
  });

  const impact: ImpactScore | null = data?.impact || null;

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-white/5 animate-pulse" />;
  }

  if (!impact) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-8 text-center">
          <Target className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">
            Sign in as an artist to see your Impact Score
          </p>
        </CardContent>
      </Card>
    );
  }

  const badge =
    BADGE_TIERS[Math.min((impact.badgeTier || 1) - 1, BADGE_TIERS.length - 1)];
  const BadgeIcon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border-purple-500/20 overflow-hidden relative">
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px]" />
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Your Impact Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="text-5xl font-bold text-white">
              {impact.impactScore.toFixed(1)}
            </p>
            <Badge className={`mt-2 ${badge.color}`}>
              <BadgeIcon className="w-3 h-3 mr-1" />
              {badge.name} • {badge.boost} boost
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500">Streams this week</p>
              <p className="text-lg font-bold text-fuchsia-300">
                {impact.streamCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500">Unique listeners</p>
              <p className="text-lg font-bold text-purple-300">
                {impact.uniqueListeners.toLocaleString()}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg duration</p>
              <p className="text-lg font-bold text-indigo-300">
                {impact.avgDuration}s
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-gray-500">Completion rate</p>
              <p className="text-lg font-bold text-emerald-300">
                {(impact.completionRate * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {impact.estimatedPayout && parseFloat(impact.estimatedPayout) > 0 && (
            <>
              <Separator className="bg-white/10 my-4" />
              <div className="text-center">
                <p className="text-sm text-gray-400">Estimated weekly payout</p>
                <p className="text-2xl font-bold text-emerald-300">
                  ${parseFloat(impact.estimatedPayout).toFixed(2)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Leaderboard
// ═══════════════════════════════════════════════════════════
function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-pulse", "leaderboard"],
    queryFn: async () => {
      const res = await fetch(`${API}/leaderboard?limit=15`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const entries: LeaderboardEntry[] = data?.leaderboard || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">
            Leaderboard populates after streams are tracked
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-2"
    >
      {entries.map((entry, idx) => {
        const badge =
          BADGE_TIERS[
            Math.min((entry.badgeTier || 1) - 1, BADGE_TIERS.length - 1)
          ];
        const isTop3 = idx < 3;

        return (
          <motion.div key={entry.artistProfileId} variants={staggerItem}>
            <Card
              className={`transition-colors ${
                isTop3
                  ? "bg-gradient-to-r from-fuchsia-900/20 to-purple-900/20 border-fuchsia-500/20"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <CardContent className="py-3 flex items-center gap-3">
                {/* Rank */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0
                      ? "bg-yellow-500/30 text-yellow-300"
                      : idx === 1
                        ? "bg-gray-400/30 text-gray-300"
                        : idx === 2
                          ? "bg-amber-700/30 text-amber-400"
                          : "bg-white/5 text-gray-400"
                  }`}
                >
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                  {entry.profileImageUrl ? (
                    <img
                      src={entry.profileImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    entry.stageName?.[0]?.toUpperCase() || "?"
                  )}
                </div>

                {/* Name + badge */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {entry.stageName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] py-0 ${badge.color}`}>
                      {badge.name}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {entry.division}
                    </span>
                  </div>
                </div>

                {/* Score + streams */}
                <div className="text-right flex-shrink-0">
                  <p className="text-fuchsia-300 font-bold text-sm">
                    {entry.impactScore.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {entry.streams.toLocaleString()} streams
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Badge Progression — Visual badge tier ladder
// ═══════════════════════════════════════════════════════════
function BadgeProgression() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          Badge Tiers
        </CardTitle>
        <CardDescription className="text-gray-400">
          Stream more to level up — higher badges earn higher revenue boost
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {BADGE_TIERS.map((tier, idx) => {
            const Icon = tier.icon;
            return (
              <div key={tier.name} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${tier.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{tier.name}</p>
                  <p className="text-xs text-gray-500">
                    {tier.streams} lifetime streams
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-300 text-xs"
                >
                  {tier.boost}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page Export
// ═══════════════════════════════════════════════════════════
export default function RevenuePulsePage() {
  return (
    <div className="min-h-screen bg-[#06020f] relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-40 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300 font-medium">
              Revenue Pulse
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Your Royalty Dashboard
          </h1>
          <p className="text-gray-400 mt-2 max-w-lg mx-auto">
            Real-time pool status • Impact Score • Leaderboard • Badge
            progression
          </p>
        </motion.div>

        {/* Main content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-gray-400"
            >
              <PieChart className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-300 text-gray-400"
            >
              <BarChart3 className="w-4 h-4 mr-2" /> Leaderboard
            </TabsTrigger>
            <TabsTrigger
              value="badges"
              className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300 text-gray-400"
            >
              <Award className="w-4 h-4 mr-2" /> Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PoolOverview />
              <MyImpactScore />
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <BadgeProgression />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

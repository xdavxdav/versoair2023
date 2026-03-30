/**
 * Music Royalties — Earnings dashboard with detailed breakdown
 * Shows revenue, payout history, tier benefits, and earnings analytics
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Clock,
  ChevronRight,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Play,
  Music2,
  Users,
  Headphones,
  Star,
  Crown,
  Sparkles,
  Flame,
  Zap,
  Award,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicTierBadge, MusicUpgradeGate } from "@/components/music";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMusicAccess } from "@/hooks/useMusicAccess";
import { useMusicEarnings, useMyArtist } from "@/hooks/use-music";
import { usePayoutHistory, useRequestPayout } from "@/hooks/use-streamroyale";

/* ─── Tier configuration with royalty rates ─── */
const TIER_CONFIG = {
  free: {
    name: "Free",
    icon: Sparkles,
    gradient: "from-gray-500 to-gray-600",
    royaltyRate: 0.5,
    perStream: "$0.002",
    perDownload: "50%",
    minPayout: "$50",
    features: ["Basic analytics", "Standard support"],
  },
  spark: {
    name: "Spark",
    icon: Sparkles,
    gradient: "from-blue-400 to-cyan-500",
    royaltyRate: 0.6,
    perStream: "$0.003",
    perDownload: "60%",
    minPayout: "$25",
    features: ["Enhanced analytics", "Priority support", "Early payouts"],
  },
  supporter: {
    name: "Supporter",
    icon: Sparkles,
    gradient: "from-blue-400 to-cyan-500",
    royaltyRate: 0.6,
    perStream: "$0.003",
    perDownload: "60%",
    minPayout: "$25",
    features: ["Enhanced analytics", "Priority support", "Early payouts"],
  },
  flame: {
    name: "Flame",
    icon: Flame,
    gradient: "from-orange-400 to-red-500",
    royaltyRate: 0.7,
    perStream: "$0.004",
    perDownload: "70%",
    minPayout: "$15",
    features: [
      "Pro analytics",
      "Dedicated support",
      "Weekly payouts",
      "Revenue boost",
    ],
  },
  champion: {
    name: "Champion",
    icon: Flame,
    gradient: "from-purple-400 to-fuchsia-500",
    royaltyRate: 0.7,
    perStream: "$0.004",
    perDownload: "70%",
    minPayout: "$15",
    features: [
      "Pro analytics",
      "Dedicated support",
      "Weekly payouts",
      "Revenue boost",
    ],
  },
  blaze: {
    name: "Blaze",
    icon: Zap,
    gradient: "from-purple-400 to-pink-500",
    royaltyRate: 0.8,
    perStream: "$0.005",
    perDownload: "80%",
    minPayout: "$10",
    features: [
      "Full analytics suite",
      "VIP support",
      "Daily payouts",
      "15% bonus",
    ],
  },
  inferno: {
    name: "Inferno",
    icon: Crown,
    gradient: "from-amber-400 via-orange-500 to-red-500",
    royaltyRate: 0.85,
    perStream: "$0.006",
    perDownload: "85%",
    minPayout: "$5",
    features: [
      "Elite analytics",
      "Personal manager",
      "Instant payouts",
      "25% bonus",
      "Exclusive events",
    ],
  },
  patron: {
    name: "Patron",
    icon: Crown,
    gradient: "from-amber-400 via-orange-500 to-red-500",
    royaltyRate: 0.85,
    perStream: "$0.006",
    perDownload: "85%",
    minPayout: "$5",
    features: [
      "Elite analytics",
      "Personal manager",
      "Instant payouts",
      "25% bonus",
      "Exclusive events",
    ],
  },
};

/* ─── Stat Card ─── */
function RoyaltyStatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue?: string;
  trend?: { value: string; positive: boolean };
  color: "purple" | "pink" | "amber" | "emerald" | "violet";
}) {
  const colors = {
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-fuchsia-600",
    amber: "from-amber-500 to-orange-600",
    emerald: "from-emerald-500 to-green-600",
    violet: "from-violet-500 to-purple-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend.positive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend.positive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
      {subValue && <p className="text-xs text-white/30 mt-1">{subValue}</p>}
    </motion.div>
  );
}

/* ─── Transaction Row ─── */
function TransactionRow({
  type,
  description,
  amount,
  date,
  status,
}: {
  type: "stream" | "download" | "payout" | "bonus";
  description: string;
  amount: string;
  date: string;
  status: "completed" | "pending" | "processing";
}) {
  const icons = {
    stream: Play,
    download: Download,
    payout: Wallet,
    bonus: Star,
  };
  const Icon = icons[type];

  const statusColors = {
    completed: "text-emerald-400 bg-emerald-400/10",
    pending: "text-amber-400 bg-amber-400/10",
    processing: "text-blue-400 bg-blue-400/10",
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <p className="font-medium text-white">{description}</p>
          <p className="text-sm text-white/40">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-semibold ${type === "payout" ? "text-red-400" : "text-emerald-400"}`}
        >
          {type === "payout" ? "-" : "+"}
          {amount}
        </p>
        <Badge className={`text-xs ${statusColors[status]}`}>{status}</Badge>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Royalties Page
   ═══════════════════════════════════════════════════════════ */
export default function MusicRoyalties() {
  const { user } = useAuthContext();
  const {
    userTier,
    isArtist,
    isPremium,
    isLoading: accessLoading,
  } = useMusicAccess();
  const { data: myArtist } = useMyArtist();
  const { data: earningsData, isLoading: earningsLoading } = useMusicEarnings();
  const { data: payoutHistory, isLoading: payoutLoading } = usePayoutHistory();
  const requestPayout = useRequestPayout();

  const [timeRange, setTimeRange] = useState("30d");
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  // Get tier config
  const tierKey = (userTier?.toLowerCase() ||
    "free") as keyof typeof TIER_CONFIG;
  const currentTier = TIER_CONFIG[tierKey] || TIER_CONFIG.free;
  const TierIcon = currentTier.icon;

  // Earnings summary
  const summary = earningsData?.summary || {
    total_tracks: 0,
    total_downloads: 0,
    total_streams: 0,
    total_revenue: "0.00",
    revenue_this_month: "0.00",
    revenue_today: "0.00",
  };

  const totalRevenue = parseFloat(summary.total_revenue || "0");
  const monthlyRevenue = parseFloat(summary.revenue_this_month || "0");
  const dailyRevenue = parseFloat(summary.revenue_today || "0");
  const pendingPayout = totalRevenue * 0.3; // Example: 30% pending
  const minPayout = parseFloat(currentTier.minPayout.replace("$", ""));
  const canRequestPayout = pendingPayout >= minPayout;

  // Handle payout request
  const handleRequestPayout = async () => {
    if (!canRequestPayout) return;
    setIsRequestingPayout(true);
    try {
      await requestPayout.mutateAsync({ amount: pendingPayout });
    } catch (error) {
      console.error("Payout request failed:", error);
    } finally {
      setIsRequestingPayout(false);
    }
  };

  // Loading state
  if (accessLoading || earningsLoading) {
    return (
      <MusicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      </MusicLayout>
    );
  }

  return (
    <MusicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              Royalties
            </h1>
            <p className="text-white/50 mt-1">
              Track your earnings and manage payouts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">This year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <MusicTierBadge tier={userTier as any} size="md" />
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <RoyaltyStatCard
            icon={DollarSign}
            label="Total Earnings"
            value={`$${totalRevenue.toFixed(2)}`}
            subValue={`${summary.total_streams.toLocaleString()} streams`}
            trend={{ value: "+12.5%", positive: true }}
            color="emerald"
          />
          <RoyaltyStatCard
            icon={Calendar}
            label="This Month"
            value={`$${monthlyRevenue.toFixed(2)}`}
            subValue="vs last month"
            trend={{ value: "+8.2%", positive: true }}
            color="purple"
          />
          <RoyaltyStatCard
            icon={Clock}
            label="Today"
            value={`$${dailyRevenue.toFixed(2)}`}
            subValue={`${Math.floor(dailyRevenue / 0.003)} streams`}
            color="pink"
          />
          <RoyaltyStatCard
            icon={Wallet}
            label="Available Payout"
            value={`$${pendingPayout.toFixed(2)}`}
            subValue={`Min: ${currentTier.minPayout}`}
            color="amber"
          />
        </div>

        {/* Tier Benefits + Payout Request */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Tier Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-purple-900/20 to-fuchsia-900/10 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTier.gradient} flex items-center justify-center shadow-lg`}
                >
                  <TierIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {currentTier.name} Tier Benefits
                  </h3>
                  <p className="text-sm text-white/50">
                    Your current royalty rates
                  </p>
                </div>
              </div>
              <Link href="/music/upgrade">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  Upgrade
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {currentTier.perStream}
                </p>
                <p className="text-sm text-white/50">per stream</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {currentTier.perDownload}
                </p>
                <p className="text-sm text-white/50">per download</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {currentTier.minPayout}
                </p>
                <p className="text-sm text-white/50">min payout</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {Math.round(currentTier.royaltyRate * 100)}%
                </p>
                <p className="text-sm text-white/50">royalty rate</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-white/50 mb-3">Included Features:</p>
              <div className="flex flex-wrap gap-2">
                {currentTier.features.map((feature, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-purple-500/20 text-purple-300 bg-purple-500/5"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Payout Request */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Request Payout</h3>
            </div>

            <div className="text-center py-6">
              <p className="text-4xl font-bold text-white mb-1">
                ${pendingPayout.toFixed(2)}
              </p>
              <p className="text-sm text-white/50">Available for withdrawal</p>

              {!canRequestPayout && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-400 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Minimum: {currentTier.minPayout}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-white/40 mb-2">
                  <span>Progress to minimum</span>
                  <span>
                    {Math.min(
                      100,
                      Math.round((pendingPayout / minPayout) * 100),
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (pendingPayout / minPayout) * 100)}
                  className="h-2"
                />
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              disabled={!canRequestPayout || isRequestingPayout}
              onClick={handleRequestPayout}
            >
              {isRequestingPayout ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Request Payout
                </>
              )}
            </Button>

            <p className="text-xs text-white/30 text-center mt-3">
              Payouts processed within 3-5 business days
            </p>
          </motion.div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Source */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Revenue by Source</h3>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Streaming",
                  value: totalRevenue * 0.6,
                  percent: 60,
                  color: "from-purple-500 to-fuchsia-500",
                },
                {
                  label: "Downloads",
                  value: totalRevenue * 0.25,
                  percent: 25,
                  color: "from-pink-500 to-rose-500",
                },
                {
                  label: "StreamRoyale",
                  value: totalRevenue * 0.1,
                  percent: 10,
                  color: "from-amber-500 to-orange-500",
                },
                {
                  label: "Tips",
                  value: totalRevenue * 0.05,
                  percent: 5,
                  color: "from-emerald-500 to-green-500",
                },
              ].map((source) => (
                <div key={source.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70">{source.label}</span>
                    <div className="text-right">
                      <span className="text-white font-medium">
                        ${source.value.toFixed(2)}
                      </span>
                      <span className="text-white/40 text-sm ml-2">
                        {source.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${source.color} rounded-full`}
                      style={{ width: `${source.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Earning Tracks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-pink-400" />
                <h3 className="font-semibold text-white">Top Earning Tracks</h3>
              </div>
              <Link href="/music/vault">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white"
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {earningsData?.tracks && earningsData.tracks.length > 0 ? (
              <div className="space-y-3">
                {earningsData.tracks
                  .slice(0, 5)
                  .map((track: any, i: number) => (
                    <div
                      key={track.id || i}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white/30 w-4">{i + 1}</span>
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Music2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-sm text-white/40">
                          {(track.streams || 0).toLocaleString()} streams
                        </p>
                      </div>
                      <span className="text-emerald-400 font-semibold">
                        ${parseFloat(track.revenue || "0").toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music2 className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40">No tracks yet</p>
                <Link href="/music/vault">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-purple-400 hover:text-purple-300"
                  >
                    Upload Your First Track
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-white/50" />
              <h3 className="font-semibold text-white">Recent Transactions</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white"
            >
              Export
              <Download className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="space-y-3">
            <TransactionRow
              type="stream"
              description="Stream revenue - Daily batch"
              amount="$2.45"
              date="Today, 3:00 PM"
              status="completed"
            />
            <TransactionRow
              type="download"
              description='Download - "Track Name"'
              amount="$0.99"
              date="Yesterday, 11:30 AM"
              status="completed"
            />
            <TransactionRow
              type="bonus"
              description="StreamRoyale weekly bonus"
              amount="$5.00"
              date="Mar 25, 2026"
              status="completed"
            />
            <TransactionRow
              type="payout"
              description="Payout to PayPal"
              amount="$25.00"
              date="Mar 20, 2026"
              status="completed"
            />
            <TransactionRow
              type="stream"
              description="Stream revenue - Daily batch"
              amount="$1.87"
              date="Mar 19, 2026"
              status="completed"
            />
          </div>
        </motion.div>

        {/* Upgrade CTA */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 via-fuchsia-900/20 to-pink-900/30 p-8"
          >
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    Upgrade to Earn More
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Increase Your Royalty Rate
                </h3>
                <p className="text-white/60 max-w-md">
                  Higher tiers unlock better rates, lower minimum payouts, and
                  exclusive features.
                </p>
              </div>
              <Link href="/music/upgrade">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25">
                  <Crown className="w-4 h-4 mr-2" />
                  View Upgrade Options
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </MusicLayout>
  );
}

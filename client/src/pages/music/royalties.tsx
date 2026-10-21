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
  Download,
  Calendar,
  Clock,
  ChevronRight,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  AlertCircle,
  Info,
  RefreshCw,
  Play,
  Music2,
  Star,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicTierBadge } from "@/components/music";
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
import { useMusicEarnings } from "@/hooks/use-music";
import { useArtistStats } from "@/hooks/use-streamroyale";
import { usePayoutHistory, useRequestPayout } from "@/hooks/use-streamroyale";
import { STREAMROYALE_ROYALTY_RULES } from "@shared/streamroyale-policy";

/* ─── Stat Card ─── */
function RoyaltyStatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue?: string;
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
  status: "completed" | "pending" | "processing" | "rejected";
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
    rejected: "text-red-400 bg-red-400/10",
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
    isLoading: accessLoading,
  } = useMusicAccess();
  const { data: artistStats, isLoading: artistStatsLoading } = useArtistStats();
  const { data: earningsData, isLoading: earningsLoading } = useMusicEarnings();
  const { data: payoutHistory, isLoading: payoutLoading } = usePayoutHistory();
  const requestPayout = useRequestPayout();

  const [timeRange, setTimeRange] = useState("30d");
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

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
  const pendingPayout = Number(artistStats?.profile?.walletBalance) || 0;
  const royaltyCarryForward =
    Number(artistStats?.profile?.royaltyCarryForward) || 0;
  const payoutsEnabled = artistStats?.profile?.payoutsEnabled === true;
  const minPayout = STREAMROYALE_ROYALTY_RULES.minimumPayoutRequestDollars;
  const canRequestPayout = payoutsEnabled && pendingPayout >= minPayout;
  const latestRoyalty = artistStats?.earningsHistory?.[0];
  const transactions = [
    ...(artistStats?.earningsHistory ?? []).map((earning: any) => ({
      key: `royalty-${earning.yearNumber}-${earning.weekNumber}`,
      type: "bonus" as const,
      description: `StreamRoyale earnings · Week ${earning.weekNumber}, ${earning.yearNumber}`,
      amount: `$${Number(earning.totalEarnings || 0).toFixed(2)}`,
      date: `Week ${earning.weekNumber}, ${earning.yearNumber}`,
      status: "completed" as const,
      sortDate:
        Date.UTC(earning.yearNumber, 0, 4) -
        ((new Date(Date.UTC(earning.yearNumber, 0, 4)).getUTCDay() + 6) % 7) *
          86_400_000 +
        (earning.weekNumber - 1) * 604_800_000,
    })),
    ...(payoutHistory?.payouts ?? []).map((payout: any) => {
      const createdAt = new Date(payout.createdAt);
      const status = ["completed", "processing", "rejected"].includes(
        payout.status,
      )
        ? payout.status
        : "pending";
      return {
        key: `payout-${payout.id}`,
        type: "payout" as const,
        description: `Payout request · ${payout.method}`,
        amount: `$${Number(payout.amount || 0).toFixed(2)}`,
        date: Number.isNaN(createdAt.getTime())
          ? "Date unavailable"
          : createdAt.toLocaleDateString(),
        status: status as "completed" | "pending" | "processing" | "rejected",
        sortDate: createdAt.getTime() || 0,
      };
    }),
  ]
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, 8);

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
  if (
    accessLoading ||
    earningsLoading ||
    artistStatsLoading ||
    payoutLoading
  ) {
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
            color="emerald"
          />
          <RoyaltyStatCard
            icon={Calendar}
            label="This Month"
            value={`$${monthlyRevenue.toFixed(2)}`}
            color="purple"
          />
          <RoyaltyStatCard
            icon={Clock}
            label="Today"
            value={`$${dailyRevenue.toFixed(2)}`}
            color="pink"
          />
          <RoyaltyStatCard
            icon={Wallet}
            label="Available Balance"
            value={`$${pendingPayout.toFixed(2)}`}
            subValue={`Minimum payout: $${minPayout.toFixed(2)}`}
            color="amber"
          />
        </div>

        {/* Royalty policy + payout request */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly royalty policy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-purple-900/20 to-fuchsia-900/10 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg"
                >
                  <Info className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Weekly royalty policy
                  </h3>
                  <p className="text-sm text-white/50">
                    Pool-based distribution; no fixed per-stream rate
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {STREAMROYALE_ROYALTY_RULES.guaranteedPoolPercent}%
                </p>
                <p className="text-sm text-white/50">guaranteed pool</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {STREAMROYALE_ROYALTY_RULES.performancePoolPercent}%
                </p>
                <p className="text-sm text-white/50">performance pool</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {STREAMROYALE_ROYALTY_RULES.minimumValidStreams}
                </p>
                <p className="text-sm text-white/50">valid streams per week</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                  {STREAMROYALE_ROYALTY_RULES.minimumPayingListeners}
                </p>
                <p className="text-sm text-white/50">distinct paying listeners</p>
              </div>
            </div>

            <p className="text-sm text-white/60">
              Valid streams must reach 30 seconds, and self-streams do not count.
              The remaining {STREAMROYALE_ROYALTY_RULES.platformCutPercent}% is
              the platform share. The performance pool is weighted by eligible
              activity from paying listeners, with badge boosts applied. Artist
              agreements govern individual entitlements. Accrued royalties below $
              {(STREAMROYALE_ROYALTY_RULES.minimumWalletCreditCents / 100).toFixed(2)}
              {" "}carry forward until the credit threshold is reached. Payout
              requests require a ${minPayout.toFixed(2)} balance and enabled
              external payouts.
            </p>
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
              <p className="text-sm text-white/50">
                {payoutsEnabled
                  ? "Available for withdrawal"
                  : "External payouts are currently disabled"}
              </p>
              {royaltyCarryForward > 0 && (
                <p className="text-xs text-white/40 mt-2">
                  Royalty carry-forward: ${royaltyCarryForward.toFixed(2)}.
                  Credited to your wallet when it reaches $1.00.
                </p>
              )}

              {!canRequestPayout && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-400 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {payoutsEnabled
                      ? `Minimum payout: $${minPayout.toFixed(2)}`
                      : "Payout requests are unavailable"}
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
              {payoutsEnabled
                ? "Payout timing is confirmed after your request is reviewed."
                : "Payout requests will be available after online payments are enabled."}
            </p>
          </motion.div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest weekly StreamRoyale distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">
                  Latest Weekly Royalty
                </h3>
              </div>
            </div>

            {latestRoyalty ? (
              <div className="space-y-4">
                {[
                  ["Guaranteed", latestRoyalty.guaranteedAmount],
                  ["Performance", latestRoyalty.performanceAmount],
                  ["Badge bonus", latestRoyalty.badgeBonus],
                  ["Tips", latestRoyalty.tipIncome],
                ].map(([label, amount]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-white/70">{label}</span>
                    <span className="font-medium text-white">
                      ${Number(amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <p className="border-t border-white/10 pt-3 text-sm text-white/50">
                  Week {latestRoyalty.weekNumber}, {latestRoyalty.yearNumber}
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-white/40">
                No royalty distributions yet.
              </p>
            )}
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
          </div>

          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TransactionRow key={transaction.key} {...transaction} />
              ))
            ) : (
              <p className="py-6 text-center text-sm text-white/40">
                No royalty or payout activity yet.
              </p>
            )}
          </div>
        </motion.div>

      </div>
    </MusicLayout>
  );
}

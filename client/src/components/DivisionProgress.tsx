/**
 * DivisionProgress — Visual division ranking + progress bar for the Artist Portal.
 *
 * Shows:
 *  - Current division badge with icon
 *  - Progress bar toward next tier (stream-based)
 *  - Key metrics row (streams, releases, listeners, active days)
 *  - Contract access level
 *  - Next review date
 *  - Evaluation status badge
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  Music2,
  Users,
  Calendar,
  Shield,
  Lock,
  Unlock,
  Clock,
  FileText,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── API hook ────────────────────────────────────────────────────────────────

function useDivisionStatus() {
  return useQuery({
    queryKey: ["artist", "division-status"],
    queryFn: async () => {
      const token = localStorage.getItem("artist_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/artist/division-status", {
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to load division status");
      }
      return res.json();
    },
    retry: false,
    staleTime: 60_000,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function divisionColor(key: string): string {
  const map: Record<string, string> = {
    discovery: "from-gray-500 to-gray-600",
    indie: "from-blue-500 to-cyan-500",
    pro: "from-purple-500 to-violet-500",
    elite: "from-amber-500 to-orange-500",
    signed: "from-red-500 to-pink-500",
    legend: "from-yellow-400 to-amber-300",
  };
  return map[key] || map.discovery;
}

function divisionBorder(key: string): string {
  const map: Record<string, string> = {
    discovery: "border-gray-500/40",
    indie: "border-blue-500/40",
    pro: "border-purple-500/40",
    elite: "border-amber-500/40",
    signed: "border-red-500/40",
    legend: "border-yellow-400/40",
  };
  return map[key] || map.discovery;
}

function contractLabel(access: string): { label: string; icon: typeof Lock } {
  const map: Record<string, { label: string; icon: typeof Lock }> = {
    none: { label: "No contract access", icon: Lock },
    view: { label: "View contracts", icon: FileText },
    standard: { label: "Standard contracts", icon: FileText },
    priority: { label: "Priority contracts", icon: Unlock },
    full: { label: "Full contract suite", icon: Shield },
  };
  return map[access] || map.none;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DivisionProgress() {
  const { data, isLoading, error } = useDivisionStatus();

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-md border-white/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin mr-3" />
          <span className="text-purple-200 text-sm">
            Loading division status…
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="bg-white/5 backdrop-blur-md border-white/20">
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="h-5 w-5 text-amber-400 mr-2" />
          <span className="text-purple-200 text-sm">
            Division data unavailable — submit your first demo to get started
          </span>
        </CardContent>
      </Card>
    );
  }

  const {
    division,
    next,
    thresholds,
    progress,
    metrics,
    profile,
    latestEvaluation,
  } = data;
  const currentDiv = division.current;
  const contract = contractLabel(profile.contractAccess || "none");
  const ContractIcon = contract.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* ── Main Division Card ─────────────────────────────── */}
      <Card
        className={`bg-white/5 backdrop-blur-md ${divisionBorder(currentDiv.key)} border`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-400" />
              Division Ranking
            </CardTitle>
            {profile.artistCode && (
              <Badge
                variant="outline"
                className="text-purple-300 border-purple-500/40 text-xs font-mono"
              >
                {profile.artistCode}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Division badge row */}
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${divisionColor(currentDiv.key)} flex items-center justify-center text-2xl shadow-lg`}
            >
              {currentDiv.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  {currentDiv.label}
                </span>
                <Badge
                  className={`bg-gradient-to-r ${divisionColor(currentDiv.key)} text-white text-[10px] px-2 py-0`}
                >
                  Tier {division.currentIndex + 1}/{division.total}
                </Badge>
              </div>
              <p className="text-purple-300 text-sm mt-0.5">
                {profile.evaluationStatus === "approved"
                  ? "Active — eligible for promotion review"
                  : profile.evaluationStatus === "pending"
                    ? "Evaluation pending — submit your demo"
                    : profile.evaluationStatus === "rejected"
                      ? "Re-submit after cooldown period"
                      : "Welcome to the division system"}
              </p>
            </div>
          </div>

          {/* Division pipeline (mini badges) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {division.all.map((d: any, i: number) => (
              <TooltipProvider key={d.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          i === division.currentIndex
                            ? `bg-gradient-to-r ${divisionColor(d.key)} text-white shadow-md`
                            : i < division.currentIndex
                              ? "bg-white/10 text-white/70 line-through"
                              : "bg-white/5 text-white/30"
                        }`}
                      >
                        <span>{d.icon}</span>
                        <span className="hidden sm:inline">{d.label}</span>
                      </div>
                      {i < division.all.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-white/20 mx-0.5 flex-shrink-0" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {d.label} — {d.contractAccess} contract access
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {/* Progress to next tier */}
          {next ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-200">
                  Progress to{" "}
                  <span className="font-semibold text-white">{next.label}</span>
                </span>
                <span className="text-white font-bold">{progress}%</span>
              </div>
              <div className="relative">
                <Progress
                  value={progress}
                  className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500"
                />
                {progress >= 100 && (
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                  </div>
                )}
              </div>
              {thresholds && (
                <p className="text-purple-300/60 text-xs">
                  Need {formatNumber(thresholds.min_streams)} streams ·{" "}
                  {thresholds.min_releases} releases ·{" "}
                  {thresholds.min_active_days}+ days active
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <Star className="h-4 w-4" />
              <span className="font-medium">
                Maximum division reached — you are Signed
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Metrics Row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
          label="Lifetime Streams"
          value={formatNumber(metrics.lifetimeStreams)}
        />
        <MetricCard
          icon={<Music2 className="h-4 w-4 text-pink-400" />}
          label="Releases"
          value={String(metrics.totalReleases)}
        />
        <MetricCard
          icon={<Users className="h-4 w-4 text-blue-400" />}
          label="Monthly Listeners"
          value={formatNumber(metrics.monthlyListeners)}
        />
        <MetricCard
          icon={<Calendar className="h-4 w-4 text-green-400" />}
          label="Active Days"
          value={String(metrics.activeDays)}
        />
      </div>

      {/* ── Contract Access + Evaluation ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Contract access */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <ContractIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-purple-300">Contract Access</p>
              <p className="text-sm font-semibold text-white">
                {contract.label}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next review / evaluation status */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-purple-300">
                {profile.promotionEligibleAt ? "Next Review" : "Evaluation"}
              </p>
              <p className="text-sm font-semibold text-white">
                {profile.promotionEligibleAt
                  ? new Date(profile.promotionEligibleAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )
                  : profile.evaluationStatus === "pending"
                    ? "Awaiting demo submission"
                    : profile.evaluationStatus === "approved"
                      ? "Approved ✓"
                      : profile.evaluationStatus === "rejected"
                        ? `Re-submit after ${
                            latestEvaluation?.resubmit_after
                              ? new Date(
                                  latestEvaluation.resubmit_after,
                                ).toLocaleDateString()
                              : "cooldown"
                          }`
                        : "Not evaluated yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ─── Small metric card ───────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-[11px] text-purple-300 truncate">{label}</span>
        </div>
        <p className="text-lg font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

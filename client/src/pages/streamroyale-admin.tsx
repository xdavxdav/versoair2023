/**
 * 🎵 StreamRoyale Admin Dashboard
 *
 * Admin-only page for managing the StreamRoyale competition platform.
 * Includes: pool overview, payout processing, manual distribution trigger.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Users,
  Music,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useStreamRoyaleAdmin,
  useAdminPayouts,
  useProcessPayout,
  useManualDistribution,
  useAddToPool,
} from "@/hooks/use-streamroyale";

export default function StreamRoyaleAdmin() {
  const { data: overview, isLoading } = useStreamRoyaleAdmin();
  const [payoutFilter, setPayoutFilter] = useState("pending");
  const { data: payoutsData } = useAdminPayouts(payoutFilter);
  const processPayout = useProcessPayout();
  const distribute = useManualDistribution();
  const addToPool = useAddToPool();
  const [addAmount, setAddAmount] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06020f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  const stats = overview;

  return (
    <div className="min-h-screen bg-[#06020f] text-white p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/geo-admin/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/40 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              🎵 StreamRoyale Admin
            </h1>
            <p className="text-white/40 text-sm">
              Week {stats?.currentWeek?.week || "—"} /{" "}
              {stats?.currentWeek?.year || "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => distribute.mutate({})}
            disabled={distribute.isPending}
          >
            {distribute.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Manual Distribution
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Weekly Pool</p>
                <p className="text-xl font-bold text-white">
                  ${stats?.pool?.total?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Total Streams</p>
                <p className="text-xl font-bold text-white">
                  {stats?.counts?.totalStreams?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Artists / Listeners</p>
                <p className="text-xl font-bold text-white">
                  {stats?.counts?.artists || 0} /{" "}
                  {stats?.counts?.listeners || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Pending Payouts</p>
                <p className="text-xl font-bold text-white">
                  {stats?.payouts?.pendingCount || 0} ($
                  {stats?.payouts?.pendingTotal?.toFixed(2) || "0.00"})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown & Add to Pool */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Plan Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.planBreakdown?.map((plan: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-white">{plan.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-white/60 text-sm">
                    {plan.subscribers} subs
                  </span>
                  <span className="text-white/40 text-sm">
                    ${plan.monthlyFee}/mo
                  </span>
                  <span className="text-green-400 text-sm">
                    {plan.poolContribution}% → pool
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Add Funds to Pool
            </CardTitle>
            <CardDescription className="text-white/40">
              Manually inject funds into the current week's pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Amount ($)"
                className="bg-white/5 border-white/20 text-white"
              />
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={
                  !addAmount ||
                  parseFloat(addAmount) <= 0 ||
                  addToPool.isPending
                }
                onClick={() => {
                  addToPool.mutate({ amount: parseFloat(addAmount) });
                  setAddAmount("");
                }}
              >
                {addToPool.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Badges */}
      {stats?.recentBadges?.length > 0 && (
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              🏆 Recent Badge Unlocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.recentBadges.map((b: any, i: number) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2"
                >
                  <span className="font-medium text-white text-sm">
                    {b.stageName}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-purple-400 text-purple-400"
                  >
                    {b.badgeName}
                  </Badge>
                  <span className="text-white/20 text-xs">
                    {new Date(b.unlockedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Requests */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">
              Payout Requests
            </CardTitle>
            <div className="flex gap-1">
              {["pending", "completed", "rejected", "all"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={payoutFilter === s ? "default" : "ghost"}
                  className={
                    payoutFilter === s ? "bg-purple-600" : "text-white/40"
                  }
                  onClick={() => setPayoutFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!payoutsData?.payouts?.length ? (
            <div className="text-center py-8 text-white/30">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No {payoutFilter} payout requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/40">Artist</TableHead>
                  <TableHead className="text-white/40">Amount</TableHead>
                  <TableHead className="text-white/40">Method</TableHead>
                  <TableHead className="text-white/40">Date</TableHead>
                  <TableHead className="text-white/40">Status</TableHead>
                  <TableHead className="text-white/40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutsData.payouts.map((p: any) => (
                  <TableRow key={p.id} className="border-white/5">
                    <TableCell className="text-white">{p.stageName}</TableCell>
                    <TableCell className="text-white font-medium">
                      ${p.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-white/60">{p.method}</TableCell>
                    <TableCell className="text-white/40 text-sm">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : p.status === "rejected"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-yellow-500/20 text-yellow-400"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="bg-green-600/80 hover:bg-green-600 h-7 text-xs"
                            onClick={() =>
                              processPayout.mutate({
                                payoutId: p.id,
                                status: "completed",
                              })
                            }
                            disabled={processPayout.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 h-7 text-xs hover:bg-red-500/10"
                            onClick={() =>
                              processPayout.mutate({
                                payoutId: p.id,
                                status: "rejected",
                                notes: "Rejected by admin",
                              })
                            }
                            disabled={processPayout.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pool History */}
      {stats?.poolHistory?.length > 0 && (
        <Card className="bg-white/5 border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white text-lg">Pool History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/40">Week</TableHead>
                  <TableHead className="text-white/40">Pool</TableHead>
                  <TableHead className="text-white/40">Streams</TableHead>
                  <TableHead className="text-white/40">Status</TableHead>
                  <TableHead className="text-white/40">Distributed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.poolHistory.map((p: any, i: number) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell className="text-white">
                      W{p.weekNumber}/{p.yearNumber}
                    </TableCell>
                    <TableCell className="text-green-400">
                      ${p.totalPool.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-white">
                      {p.totalStreams.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "distributed"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/40 text-sm">
                      {p.distributedAt
                        ? new Date(p.distributedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

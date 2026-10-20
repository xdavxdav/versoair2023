import { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Clock3,
  DollarSign,
  Eye,
  Music2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useStreamRoyaleReview } from "@/hooks/use-streamroyale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function money(value: unknown) {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

function localDate(value: string | number | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

export default function StreamRoyaleReview() {
  const [location] = useLocation();
  const [period, setPeriod] = useState<
    { weekNumber: number; yearNumber: number } | undefined
  >();
  const [weekInput, setWeekInput] = useState("");
  const [yearInput, setYearInput] = useState("");
  const review = useStreamRoyaleReview(period);
  const data = review.data;
  const pool = data?.pool;
  const isPreview =
    data?.preview?.dryRun === true &&
    Array.isArray(data.preview.distributions);
  const hasActual = data?.artists?.some((artist: any) => artist.actual);
  const earningsLabel = isPreview ? "Dry-run estimate" : "Recorded earnings";
  const adminHref = location.startsWith("/streamroyale-admin")
    ? "/streamroyale-admin"
    : "/admin/streamroyale";

  function loadPeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weekNumber = Number(weekInput || data?.period?.weekNumber);
    const yearNumber = Number(yearInput || data?.period?.yearNumber);
    if (
      Number.isInteger(weekNumber) &&
      weekNumber >= 1 &&
      weekNumber <= 53 &&
      Number.isInteger(yearNumber) &&
      yearNumber >= 2000 &&
      yearNumber <= new Date().getFullYear() + 1
    ) {
      setPeriod({ weekNumber, yearNumber });
    }
  }

  return (
    <main className="min-h-screen bg-[#06020f] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={adminHref}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Streaming activity review</h1>
              <p className="text-sm text-white/50">
                Read-only activity, qualification, and royalty review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="hidden text-xs text-white/40 sm:inline">
                Updated {new Date(review.dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => void review.refetch()}
              disabled={review.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${review.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </header>

        <Card className="border-white/10 bg-white/[0.04]">
          <CardContent className="flex flex-wrap items-end justify-between gap-4 p-5">
            <div>
              <h2 className="font-semibold">Review period</h2>
              <p className="mt-1 text-sm text-white/50">
                Select a StreamRoyale week. The current week loads by default.
              </p>
            </div>
            <form onSubmit={loadPeriod} className="flex flex-wrap items-end gap-2">
              <label className="space-y-1 text-xs text-white/50">
                Week (1–53)
                <Input
                  type="number"
                  min={1}
                  max={53}
                  value={weekInput}
                  placeholder={String(data?.period?.weekNumber ?? "")}
                  onChange={(event) => setWeekInput(event.target.value)}
                  className="w-28 border-white/15 bg-black/20 text-white"
                />
              </label>
              <label className="space-y-1 text-xs text-white/50">
                Year
                <Input
                  type="number"
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  value={yearInput}
                  placeholder={String(data?.period?.yearNumber ?? "")}
                  onChange={(event) => setYearInput(event.target.value)}
                  className="w-28 border-white/15 bg-black/20 text-white"
                />
              </label>
              <Button type="submit" className="bg-purple-700 hover:bg-purple-600">
                Load week
              </Button>
            </form>
          </CardContent>
        </Card>

        {review.isLoading ? (
          <div className="py-20 text-center text-white/50">Loading review…</div>
        ) : review.isError ? (
          <Card className="border-red-400/20 bg-red-400/5">
            <CardContent className="flex items-center gap-3 p-5 text-red-200">
              <AlertCircle className="h-5 w-5" />
              Could not load the streaming review. {review.error.message}
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="flex items-center gap-3 p-5">
                  <Activity className="h-8 w-8 text-purple-300" />
                  <div>
                    <p className="text-xs text-white/50">Recent activity loaded</p>
                    <p className="text-xl font-bold">
                      {data.activityCount.toLocaleString()} of up to 50 records
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="flex items-center gap-3 p-5">
                  <DollarSign className="h-8 w-8 text-emerald-300" />
                  <div>
                    <p className="text-xs text-white/50">Weekly pool</p>
                    <p className="text-xl font-bold">{money(pool?.total)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="flex items-center gap-3 p-5">
                  <BadgeCheck className="h-8 w-8 text-blue-300" />
                  <div>
                    <p className="text-xs text-white/50">Pool status</p>
                    <p className="text-xl font-bold capitalize">
                      {pool?.status ?? "No pool"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="flex items-center gap-3 p-5">
                  <Users className="h-8 w-8 text-amber-300" />
                  <div>
                    <p className="text-xs text-white/50">Artists with activity</p>
                    <p className="text-xl font-bold">{data.artists.length}</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card className="border-blue-300/15 bg-blue-300/[0.04]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-blue-300" />
                  Active royalty rules
                </CardTitle>
                <CardDescription className="text-white/50">
                  Qualification and allocation rules used by the weekly StreamRoyale engine.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-3">
                <p>
                  Eligibility: at least{" "}
                  <strong>{data.rules.minimumValidStreams} valid streams</strong>{" "}
                  and{" "}
                  <strong>{data.rules.minimumPayingListeners} distinct paying listeners</strong>.
                </p>
                <p>
                  Pool split: {data.rules.guaranteedPoolPercent}% guaranteed,{" "}
                  {data.rules.performancePoolPercent}% performance,{" "}
                  {data.rules.platformCutPercent}% platform cut.
                </p>
                <p>
                  Free-plan streams count toward stream qualification, but add{" "}
                  <strong>{data.rules.freePlanPerformanceWeight}% performance weight</strong>.
                </p>
                <p>
                  Badge revenue boost changes an eligible artist&apos;s performance weight
                  inside the performance pool.
                </p>
                <p>
                  Earnings below {money(data.rules.minimumWalletCredit)} roll forward
                  until the wallet-credit threshold is reached.
                </p>
                <p className="text-blue-200">
                  This page is read-only. Estimates use the dry-run calculation and never
                  execute a distribution or payout.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04]">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-purple-300" />
                  Artist qualification and remuneration
                </CardTitle>
                <CardDescription className="text-white/50">
                  {isPreview
                    ? "Projected values from a non-writing dry run."
                    : hasActual
                      ? "Recorded values from the completed royalty distribution."
                      : data.preview?.reason ??
                        "No open pool is available for a dry-run estimate."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.artists.length === 0 ? (
                  <p className="py-8 text-center text-white/45">
                    No valid non-self streams were recorded for this week.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/50">Artist</TableHead>
                          <TableHead className="text-white/50">Qualification</TableHead>
                          <TableHead className="text-right text-white/50">Valid streams</TableHead>
                          <TableHead className="text-right text-white/50">Paying listeners</TableHead>
                          <TableHead className="text-right text-white/50">Weighted streams</TableHead>
                          <TableHead className="text-right text-white/50">{earningsLabel}</TableHead>
                          <TableHead className="text-right text-white/50">
                            {isPreview ? "Projected carry-forward" : "Current carry-forward"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.artists.map((artist: any) => {
                          const earnings = isPreview
                            ? artist.projected
                            : artist.actual;
                          return (
                            <TableRow
                              key={artist.artistProfileId}
                              className="border-white/5"
                            >
                              <TableCell>
                                <div className="font-medium">
                                  {artist.stageName || "Unnamed artist"}
                                </div>
                                <div className="text-xs text-white/40">
                                  {artist.badgeTier || "No badge"} ·{" "}
                                  {artist.badgeBoostPercent}% boost
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    artist.qualifies
                                      ? "bg-emerald-400/15 text-emerald-200"
                                      : "bg-amber-400/15 text-amber-200"
                                  }
                                >
                                  {artist.qualificationReason}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {artist.validStreams}
                              </TableCell>
                              <TableCell className="text-right">
                                {artist.payingListeners}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(artist.weightedStreams).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-200">
                                {earnings ? (
                                  <div>
                                    <div>{money(earnings.totalEarnings)}</div>
                                    <div className="whitespace-nowrap text-[10px] font-normal text-white/45">
                                      G {money(earnings.guaranteedAmount)} · P{" "}
                                      {money(earnings.performanceAmount)} · B{" "}
                                      {money(earnings.badgeBonus)}
                                      {"tipIncome" in earnings &&
                                        Number(earnings.tipIncome) > 0 &&
                                        ` · Tips incl. ${money(earnings.tipIncome)}`}
                                    </div>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {earnings
                                  ? money(
                                      earnings.carryForward ??
                                        artist.carryForward,
                                    )
                                  : money(artist.carryForward)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music2 className="h-5 w-5 text-purple-300" />
                  Recent stream activity
                </CardTitle>
                <CardDescription className="text-white/50">
                  Latest 50 stream records for this week. Listener identifiers, IP addresses,
                  and user-agent strings are intentionally not shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-white/45">
                    No stream activity recorded for this week.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/50">Time</TableHead>
                          <TableHead className="text-white/50">Track</TableHead>
                          <TableHead className="text-white/50">Artist</TableHead>
                          <TableHead className="text-right text-white/50">Duration</TableHead>
                          <TableHead className="text-white/50">Review flags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentActivity.map((event: any) => (
                          <TableRow key={event.id} className="border-white/5">
                            <TableCell className="whitespace-nowrap text-xs text-white/60">
                              <Clock3 className="mr-1 inline h-3 w-3" />
                              {localDate(event.createdAt)}
                            </TableCell>
                            <TableCell>{event.trackTitle}</TableCell>
                            <TableCell>{event.artistName}</TableCell>
                            <TableCell className="text-right">
                              {event.durationSeconds}s
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  className={
                                    event.isValid
                                      ? "bg-emerald-400/15 text-emerald-200"
                                      : "bg-amber-400/15 text-amber-200"
                                  }
                                >
                                  {event.isValid ? "Valid" : "Invalid"}
                                </Badge>
                                {event.isSelfStream && (
                                  <Badge className="bg-red-400/15 text-red-200">
                                    Self stream
                                  </Badge>
                                )}
                                <Badge
                                  className={
                                    event.payingListener
                                      ? "bg-blue-400/15 text-blue-200"
                                      : "bg-white/10 text-white/55"
                                  }
                                >
                                  {event.payingListener ? "Paid plan" : "No paid plan"}
                                </Badge>
                                {event.boosted && (
                                  <Badge className="bg-purple-400/15 text-purple-200">
                                    {event.superStream ? "Super boost" : "Boost"}{" "}
                                    {event.boostMultiplier}×
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-white/35">
              <Eye className="h-4 w-4" />
              Review only — no distribution, approval, rejection, or payout operation is
              available on this page.
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

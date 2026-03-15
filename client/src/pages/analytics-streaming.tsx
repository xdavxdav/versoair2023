/**
 * Streaming Analytics Dashboard — /analytics
 * Platform-wide stats, top tracks, revenue, charts
 */
import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useStreamingAnalytics,
  useStreamingArtists,
  useSubscriptionPlans,
} from "@/hooks/use-streaming";
import {
  BarChart3,
  TrendingUp,
  Users,
  Headphones,
  Music,
  ChevronLeft,
  DollarSign,
  Globe,
  Star,
  Award,
  ArrowUp,
  ArrowDown,
  Clock,
  Disc3,
  Mic2,
  Crown,
  Zap,
  Play,
} from "lucide-react";

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n?.toLocaleString() || "0";
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useStreamingAnalytics();
  const { data: artistsData } = useStreamingArtists({
    limit: 10,
    sort: "streams",
  });
  const { data: plansData } = useSubscriptionPlans();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const overview = analytics || {};
  const topArtists = artistsData?.artists || [];
  const benefitChart = plansData?.benefitChart;

  const stats = [
    {
      label: "Total Streams",
      value: formatNumber(overview.totalStreams || 0),
      icon: Headphones,
      color: "amber",
      trend: "+12.5%",
      up: true,
    },
    {
      label: "Artistes actifs",
      value: overview.totalArtists || 0,
      icon: Mic2,
      color: "purple",
      trend: "+2",
      up: true,
    },
    {
      label: "Titres en catalogue",
      value: overview.totalTracks || 0,
      icon: Music,
      color: "blue",
      trend: "+15",
      up: true,
    },
    {
      label: "Revenus estimés",
      value: formatCurrency((overview.totalStreams || 0) * 0.004),
      icon: DollarSign,
      color: "green",
      trend: "+8.3%",
      up: true,
    },
    {
      label: "Pays représentés",
      value: overview.totalCountries || 10,
      icon: Globe,
      color: "cyan",
    },
    {
      label: "Albums",
      value: overview.totalAlbums || 0,
      icon: Disc3,
      color: "orange",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> =
    {
      amber: {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
      },
      purple: {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
      },
      blue: {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/20",
      },
      green: {
        bg: "bg-green-500/10",
        text: "text-green-400",
        border: "border-green-500/20",
      },
      cyan: {
        bg: "bg-cyan-500/10",
        text: "text-cyan-400",
        border: "border-cyan-500/20",
      },
      orange: {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/20",
      },
    };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-28">
      {/* Header */}
      <div className="max-w-[95vw] mx-auto px-4 pt-6">
        <Link href="/stream">
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" />
            Stream
          </button>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-400" />
              Analytics
            </h1>
            <p className="text-gray-500 text-sm">
              Statistiques de la plateforme Verso Air Stream
            </p>
          </div>

          {/* Period selector */}
          <div className="flex gap-1 bg-gray-800/30 rounded-lg p-1">
            {[
              { key: "7d" as const, label: "7j" },
              { key: "30d" as const, label: "30j" },
              { key: "90d" as const, label: "90j" },
              { key: "all" as const, label: "Tout" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  period === p.key
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* KPI CARDS */}
      {/* ═══════════════════════════════════════════ */}
      <section className="max-w-[95vw] mx-auto px-4 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, i) => {
            const c = colorMap[stat.color];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`${c.bg} border ${c.border} rounded-xl p-4`}
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-4 h-4 ${c.text}`} />
                  {stat.trend && (
                    <span
                      className={`text-[10px] flex items-center gap-0.5 ${stat.up ? "text-green-400" : "text-red-400"}`}
                    >
                      {stat.up ? (
                        <ArrowUp className="w-2.5 h-2.5" />
                      ) : (
                        <ArrowDown className="w-2.5 h-2.5" />
                      )}
                      {stat.trend}
                    </span>
                  )}
                </div>
                <p className="text-white font-bold text-lg">{stat.value}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* STREAM TREND CHART */}
      {/* ═══════════════════════════════════════════ */}
      {overview.dailyStreams && overview.dailyStreams.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-10">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-6">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Tendance des écoutes
            </h3>
            <div className="h-40 flex items-end gap-1">
              {overview.dailyStreams.map((d: any, i: number) => {
                const maxVal = Math.max(
                  ...overview.dailyStreams.map((s: any) => s.count || 1),
                );
                const height = ((d.count || 0) / maxVal) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t hover:opacity-100 opacity-70 transition-opacity cursor-default min-h-[2px]"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${d.date}: ${d.count} streams`}
                    />
                    {i % 5 === 0 && (
                      <span className="text-gray-600 text-[8px]">
                        {d.date?.split("-").slice(1).join("/")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-[95vw] mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* ═══════════════════════════════════════════ */}
        {/* TOP ARTISTS */}
        {/* ═══════════════════════════════════════════ */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-6">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
            <Star className="w-4 h-4 text-amber-400" />
            Top Artistes
          </h3>
          <div className="space-y-2">
            {topArtists.slice(0, 8).map((artist: any, i: number) => (
              <Link key={artist.id} href={`/artist-catalogue/${artist.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <span
                    className={`w-6 text-center text-sm font-bold ${
                      i < 3 ? "text-amber-400" : "text-gray-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    {artist.image_url ? (
                      <img
                        src={artist.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center">
                        <span className="text-xs font-bold text-white/50">
                          {artist.name?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {artist.name}
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      {getFlag(artist.country_code)} {artist.genre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">
                      {formatNumber(artist.total_streams || 0)}
                    </p>
                    <p className="text-gray-600 text-[10px]">streams</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* TOP TRACKS */}
        {/* ═══════════════════════════════════════════ */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-6">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
            <Music className="w-4 h-4 text-amber-400" />
            Top Titres
          </h3>
          {overview.topTracks && overview.topTracks.length > 0 ? (
            <div className="space-y-2">
              {overview.topTracks.slice(0, 8).map((track: any, i: number) => (
                <Link key={track.id} href={`/track/${track.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors">
                    <span
                      className={`w-6 text-center text-sm font-bold ${
                        i < 3 ? "text-amber-400" : "text-gray-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                      <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                        <Music className="w-3 h-3 text-white/40" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {track.title}
                      </p>
                      <p className="text-gray-500 text-[10px]">
                        {track.artist_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">
                        {formatNumber(track.streams || track.stream_count || 0)}
                      </p>
                      <p className="text-gray-600 text-[10px]">streams</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                Les données de tendance apparaîtront ici
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* GENRE BREAKDOWN */}
      {/* ═══════════════════════════════════════════ */}
      {overview.genreBreakdown && overview.genreBreakdown.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-10">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-6">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
              <Disc3 className="w-4 h-4 text-amber-400" />
              Répartition par genre
            </h3>
            <div className="space-y-3">
              {overview.genreBreakdown.map((g: any, i: number) => {
                const total = overview.genreBreakdown.reduce(
                  (s: number, x: any) => s + (x.count || 0),
                  0,
                );
                const pct =
                  total > 0 ? ((g.count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 text-sm">{g.genre}</span>
                      <span className="text-gray-500 text-xs">
                        {g.count} titres ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* REVENUE / BENEFIT CHART */}
      {/* ═══════════════════════════════════════════ */}
      {benefitChart && (
        <section className="max-w-[95vw] mx-auto px-4 mb-10">
          <div className="bg-gradient-to-br from-amber-900/20 via-gray-900 to-purple-900/10 border border-amber-500/20 rounded-xl p-6">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <Crown className="w-4 h-4 text-amber-400" />
              Tableau de bénéfices — Créateur de plateforme
            </h3>
            <p className="text-gray-500 text-xs mb-4">
              Projection de revenus basée sur les uploads payants et les streams
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-2 text-gray-400 font-medium text-xs">
                      Source
                    </th>
                    <th className="text-right py-2 text-gray-400 font-medium text-xs">
                      Revenus / mois
                    </th>
                    <th className="text-right py-2 text-gray-400 font-medium text-xs">
                      Marge
                    </th>
                    <th className="text-right py-2 text-gray-400 font-medium text-xs">
                      Projection annuelle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {benefitChart.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="py-2.5 text-white">{row.source}</td>
                      <td className="py-2.5 text-right text-green-400">
                        {formatCurrency(row.monthlyRevenue || 0)}
                      </td>
                      <td className="py-2.5 text-right text-amber-400">
                        {row.margin || "—"}
                      </td>
                      <td className="py-2.5 text-right text-white font-medium">
                        {formatCurrency((row.monthlyRevenue || 0) * 12)}
                      </td>
                    </tr>
                  ))}
                  {!benefitChart.rows && (
                    <>
                      <tr className="border-b border-gray-800/50">
                        <td className="py-2.5 text-white flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-400" /> Artist Pro
                          Subscriptions
                        </td>
                        <td className="py-2.5 text-right text-green-400">
                          {formatCurrency(benefitChart.artistProSubs * 9.99)}
                        </td>
                        <td className="py-2.5 text-right text-amber-400">
                          85%
                        </td>
                        <td className="py-2.5 text-right text-white font-medium">
                          {formatCurrency(
                            benefitChart.artistProSubs * 9.99 * 12,
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800/50">
                        <td className="py-2.5 text-white flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-purple-400" /> Premium
                          Subscriptions
                        </td>
                        <td className="py-2.5 text-right text-green-400">
                          {formatCurrency(benefitChart.premiumSubs * 4.99)}
                        </td>
                        <td className="py-2.5 text-right text-amber-400">
                          70%
                        </td>
                        <td className="py-2.5 text-right text-white font-medium">
                          {formatCurrency(benefitChart.premiumSubs * 4.99 * 12)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800/50">
                        <td className="py-2.5 text-white flex items-center gap-1.5">
                          <Play className="w-3 h-3 text-blue-400" /> Stream
                          Revenue ($0.004/play)
                        </td>
                        <td className="py-2.5 text-right text-green-400">
                          {formatCurrency(
                            ((overview.totalStreams || 0) * 0.004) / 12,
                          )}
                        </td>
                        <td className="py-2.5 text-right text-amber-400">
                          30%
                        </td>
                        <td className="py-2.5 text-right text-white font-medium">
                          {formatCurrency((overview.totalStreams || 0) * 0.004)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800/50">
                        <td className="py-2.5 text-white flex items-center gap-1.5">
                          <Music className="w-3 h-3 text-green-400" /> Paid
                          Uploads (per track fee)
                        </td>
                        <td className="py-2.5 text-right text-green-400">
                          {formatCurrency(benefitChart.paidUploads * 2.99)}
                        </td>
                        <td className="py-2.5 text-right text-amber-400">
                          95%
                        </td>
                        <td className="py-2.5 text-right text-white font-medium">
                          {formatCurrency(benefitChart.paidUploads * 2.99 * 12)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-500/30">
                    <td className="py-3 text-amber-400 font-bold">
                      Total estimé
                    </td>
                    <td className="py-3 text-right text-green-400 font-bold">
                      {formatCurrency(
                        (benefitChart.artistProSubs || 0) * 9.99 +
                          (benefitChart.premiumSubs || 0) * 4.99 +
                          ((overview.totalStreams || 0) * 0.004) / 12 +
                          (benefitChart.paidUploads || 0) * 2.99,
                      )}
                    </td>
                    <td className="py-3 text-right text-amber-400 font-bold">
                      ~65%
                    </td>
                    <td className="py-3 text-right text-white font-bold">
                      {formatCurrency(
                        ((benefitChart.artistProSubs || 0) * 9.99 +
                          (benefitChart.premiumSubs || 0) * 4.99 +
                          ((overview.totalStreams || 0) * 0.004) / 12 +
                          (benefitChart.paidUploads || 0) * 2.99) *
                          12,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <p className="text-gray-400 text-xs">
                💡 <strong className="text-amber-400">Note:</strong> Ces
                projections sont basées sur les abonnements actifs et le volume
                de streams actuel. Les revenus des uploads payants incluent les
                frais par piste des artistes utilisant l'Artist Pro tier. La
                marge de plateforme varie selon la source de revenus.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Revenue per stream info */}
      <section className="max-w-[95vw] mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-5 text-center">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">$0.004</p>
            <p className="text-gray-500 text-xs">Revenu par stream</p>
          </div>
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-5 text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">70/30</p>
            <p className="text-gray-500 text-xs">Split Artiste/Plateforme</p>
          </div>
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-5 text-center">
            <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">30s</p>
            <p className="text-gray-500 text-xs">
              Minimum pour compter un stream
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

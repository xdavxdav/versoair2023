/**
 * Music Dashboard — Zentrr-style layout + original features restored
 * Sidebar (via MusicLayout) + main content:
 *  - MusicHero greeting + CTA
 *  - Tier badge row
 *  - 4 Zentrr stat cards (purple/pink palette)
 *  - Core tools row (Studio, Vault, Royale)
 *  - Analytics + Royalties preview (2-col)
 *  - Recent Activity sidebar
 *  - Beatmaker Studio teaser
 *  - Announcements
 */
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Disc3,
  Library,
  BarChart3,
  Flame,
  Clock,
  TrendingUp,
  Play,
  Users,
  Headphones,
  Sparkles,
  ArrowRight,
  Music2,
  Bell,
  DollarSign,
  CalendarDays,
  FileText,
  Plus,
  Star,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import {
  MusicHero,
  MusicSectionCard,
  MusicEmptyState,
  MusicUpgradeGate,
  MusicTierBadge,
} from "@/components/music";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMusicAccess } from "@/hooks/useMusicAccess";

/* ─── Colored icon badge (Zentrr style, purple/pink palette) ─── */
function IconBadge({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "purple" | "fuchsia" | "pink" | "violet";
}) {
  const colors = {
    purple: "from-purple-500 to-purple-600",
    fuchsia: "from-fuchsia-500 to-fuchsia-600",
    pink: "from-pink-500 to-pink-600",
    violet: "from-violet-500 to-violet-600",
  };
  return (
    <div
      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg shadow-purple-500/15`}
    >
      <Icon className="w-4 h-4 text-white" />
    </div>
  );
}

/* ─── Zentrr-style stat card ─── */
function DashStatCard({
  icon,
  color,
  value,
  label,
  subLeft,
  subRight,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "purple" | "fuchsia" | "pink" | "violet";
  value: number | string;
  label: string;
  subLeft: string;
  subRight: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-5 hover:bg-purple-500/[0.06] transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <IconBadge icon={icon} color={color} />
          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-purple-400/60 transition-colors" />
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/50 mb-2">{label}</p>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span>{subLeft}</span>
          <span>{subRight}</span>
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Mini stat chip (inside analytics card) ─── */
function StatChip({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: string;
}) {
  const isPositive = trend?.startsWith("+");
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-purple-400" />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Announcement item ─── */
function AnnouncementItem({
  title,
  description,
  time,
  type,
}: {
  title: string;
  description: string;
  time: string;
  type: "event" | "update" | "alert";
}) {
  const colors = {
    event: "from-purple-500 to-pink-500",
    update: "from-fuchsia-500 to-purple-500",
    alert: "from-pink-500 to-rose-500",
  };
  return (
    <div className="flex gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
      <div
        className={`w-2 h-2 mt-2 rounded-full bg-gradient-to-r ${colors[type]} flex-shrink-0`}
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
        <p className="text-xs text-white/30 mt-1">{time}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════ */
export default function MusicDashboard() {
  const { user } = useAuthContext();
  const { isArtist, userTier, isPremium, canAccessVault, canAccessAnalytics } =
    useMusicAccess();

  // Dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ["music-dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/streaming/dashboard-stats", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  // Recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["music-recent-activity"],
    queryFn: async () => {
      const res = await fetch("/api/streaming/recent-plays?limit=5", {
        credentials: "include",
      });
      if (!res.ok) return { plays: [] };
      return res.json();
    },
    enabled: !!user,
  });

  const stats = statsData || {
    streams: 0,
    tracks: 0,
    followers: 0,
    earnings: 0,
    pendingRequests: 0,
  };

  return (
    <MusicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        {/* ━━━ Hero Section ━━━ */}
        <MusicHero
          stats={isArtist ? stats : undefined}
          primaryCta={{
            label: isArtist ? "Open Studio" : "Explore Music",
            href: isArtist ? "/music/studio" : "/music/live",
          }}
        />

        {/* ━━━ Tier badge row ━━━ */}
        <div className="flex items-center gap-3">
          <MusicTierBadge tier={userTier as any} size="md" />
          {isArtist && (
            <Badge
              variant="outline"
              className="border-purple-500/30 text-purple-400 bg-purple-500/10"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Artist
            </Badge>
          )}
        </div>

        {/* ━━━ 4 Zentrr Stat Cards ━━━ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashStatCard
            icon={Music2}
            color="purple"
            value={stats.tracks || 0}
            label="Active Projects"
            subLeft={`${stats.pendingRequests || 0} Completed`}
            subRight="0 Ideas"
            href="/music/projects"
          />
          <DashStatCard
            icon={CalendarDays}
            color="fuchsia"
            value={0}
            label="Upcoming Releases"
            subLeft="— Next"
            subRight=""
            href="/music/releases"
          />
          <DashStatCard
            icon={Users}
            color="pink"
            value={stats.followers || 0}
            label="Signed Artists"
            subLeft={`${stats.streams || 0} Listeners`}
            subRight={`${stats.streams || 0} Streams`}
            href="/music/artists"
          />
          <DashStatCard
            icon={DollarSign}
            color="violet"
            value={`$${stats.earnings || 0}`}
            label="Royalties"
            subLeft="0 Pending"
            subRight="0 Paid"
            href="/music/royalties"
          />
        </div>

        {/* ━━━ Core Tools Row (Studio / Vault / Royale) ━━━ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MusicSectionCard
              title="Studio"
              description="Request production & sessions"
              icon={Disc3}
              href="/music/studio"
              gradient="purple"
              stats={[{ label: "Requests", value: stats.pendingRequests || 0 }]}
            />
            <MusicSectionCard
              title="Vault"
              description="Your music library"
              icon={Library}
              href="/music/vault"
              gradient="pink"
              stats={[{ label: "Tracks", value: stats.tracks }]}
              disabled={!canAccessVault}
            />
            <MusicSectionCard
              title="Royale"
              description="Competitions & streaming"
              icon={Flame}
              href="/music/live"
              gradient="amber"
              badge="LIVE"
            />
          </div>
        </section>

        {/* ━━━ Analytics + Royalties / Recent Activity ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analytics + Royalties (2-col span) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Analytics */}
            {canAccessAnalytics ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-purple-900/20 to-fuchsia-900/10 backdrop-blur-md p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Insights</h3>
                      <p className="text-sm text-white/50">Last 7 days</p>
                    </div>
                  </div>
                  <Link href="/music/insights">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatChip
                    icon={Play}
                    label="Plays"
                    value={stats.streams}
                    trend="+12%"
                  />
                  <StatChip
                    icon={Users}
                    label="Listeners"
                    value={stats.followers}
                    trend="+8%"
                  />
                  <StatChip
                    icon={Headphones}
                    label="Avg. Listen"
                    value="2:34"
                  />
                  <StatChip
                    icon={TrendingUp}
                    label="Ranking"
                    value="#42"
                    trend="+5"
                  />
                </div>
              </motion.div>
            ) : (
              <MusicUpgradeGate
                title="Unlock Analytics"
                description="Track your performance with detailed insights"
                benefits={[
                  "Stream counts",
                  "Listener demographics",
                  "Revenue tracking",
                ]}
                requiredTier="supporter"
                variant="card"
              />
            )}

            {/* Royalties preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-900/20 to-purple-900/10 backdrop-blur-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Royalties</h3>
                    <p className="text-sm text-white/50">Earnings overview</p>
                  </div>
                </div>
                <Link href="/music/royalties">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    Details
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatChip
                  icon={DollarSign}
                  label="Total Earned"
                  value={`$${stats.earnings || 0}`}
                  trend="+15%"
                />
                <StatChip icon={TrendingUp} label="This Month" value="$0" />
                <StatChip icon={Star} label="Pending" value="$0" />
              </div>
            </motion.div>
          </div>

          {/* Recent Activity (right column) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-400/60" />
              <h3 className="font-semibold text-white">Recent Activity</h3>
            </div>

            {recentActivity?.plays?.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.plays
                  .slice(0, 5)
                  .map((play: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Music2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {play.track_title || "Unknown Track"}
                        </p>
                        <p className="text-xs text-white/40">
                          {formatTimeAgo(play.played_at)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music2 className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/40">No recent activity</p>
                <Link href="/music/live">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    Start Listening
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* ━━━ Beatmaker Studio Teaser ━━━ */}
        {!isPremium && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 via-fuchsia-900/20 to-pink-900/30 p-6 md:p-8"
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
                    <Disc3 className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">
                      Beatmaker Studio
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Work with Pro Producers
                  </h3>
                  <p className="text-white/60 max-w-md">
                    Request custom beats, production sessions, and collaborate
                    with talented beatmakers.
                  </p>
                </div>
                <Link href="/music/studio">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Explore Studio
                  </Button>
                </Link>
              </div>
            </motion.div>
          </section>
        )}

        {/* ━━━ Upcoming Releases ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Upcoming Releases
              </h3>
            </div>
            <Link href="/music/planner">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/5 gap-2"
              >
                View Calendar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="px-6 pb-6">
            <div className="text-center py-10">
              <CalendarDays className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">
                No upcoming releases scheduled
              </p>
              <Link href="/music/planner">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Schedule Release
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ━━━ Top Artists ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Top Artists</h3>
            </div>
            <Link href="/music/artists">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/5 gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="px-6 pb-6">
            {stats.followers > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-purple-500/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        Artist {i}
                      </p>
                      <p className="text-xs text-white/40">0 streams</p>
                    </div>
                    <Star className="w-4 h-4 text-purple-400/30" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">No signed artists yet</p>
                <Link href="/music/a-and-r">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Discover Artists
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* ━━━ Announcements ━━━ */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400/60" />
                <h3 className="font-semibold text-white">Announcements</h3>
              </div>
              <Badge
                variant="outline"
                className="border-purple-500/30 text-purple-400"
              >
                2 New
              </Badge>
            </div>
            <div className="space-y-3">
              <AnnouncementItem
                title="StreamRoyale Season 3 Starting Soon"
                description="New divisions, bigger prizes. Get ready to compete!"
                time="2 hours ago"
                type="event"
              />
              <AnnouncementItem
                title="New Beatmaker Features Released"
                description="Creative sliders, reference tracks, and more."
                time="Yesterday"
                type="update"
              />
            </div>
          </motion.div>
        </section>
      </div>
    </MusicLayout>
  );
}

/* ─── Helpers ─── */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

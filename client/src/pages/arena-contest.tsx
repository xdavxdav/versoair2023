/**
 * StreamRoyale Arena — Battle Royale Contest Page
 *
 * Bracket visualization • Live voting • Stream counters • Lock status
 * Dark portal theme: bg-[#06020f], purple/fuchsia gradients, glass cards
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  Trophy,
  Shield,
  Crown,
  Music,
  Users,
  Timer,
  ChevronRight,
  Lock,
  Unlock,
  Zap,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Star,
  Flame,
  Award,
  Target,
  Radio,
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
import { useToast } from "@/hooks/use-toast";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  cardHover,
} from "@/lib/animations";

const API = "/api/arena";

// ── Types ──
interface ArenaContest {
  id: number;
  genre: string;
  week_number: number;
  year_number: number;
  week_start: string;
  week_end: string;
  current_round: number;
  status: string;
  winner_id: number | null;
  bonus_pool_percent: number;
  total_votes: number;
  created_at: string;
  entered_artists?: number;
  total_streams?: number;
}

interface BracketEntry {
  id: number;
  contest_id: number;
  round: number;
  artist_profile_id: number;
  streams: number;
  vote_count: number;
  eliminated: boolean;
  eliminated_at: string | null;
  seed_position: number;
  stage_name: string;
  profile_image_url: string | null;
  current_badge_tier: number;
  lifetime_streams: number;
  division: string;
}

interface MyVote {
  id: number;
  contest_id: number;
  artist_profile_id: number;
  stream_count: number;
  vote_status: string;
  locked_at: string | null;
  stage_name: string;
  profile_image_url: string | null;
  canChange: boolean;
  streamsUntilLock: number;
}

const ROUND_NAMES = [
  "Round of 16",
  "Quarter-Finals",
  "Semi-Finals",
  "Grand Final",
];
const BADGE_NAMES = [
  "Initiate",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Legendary Titan",
];
const BADGE_COLORS = [
  "gray",
  "amber",
  "slate",
  "yellow",
  "purple",
  "cyan",
  "red",
];

function getBadgeColor(tier: number): string {
  const colors = [
    "bg-gray-500/20 text-gray-300",
    "bg-amber-700/20 text-amber-400",
    "bg-slate-400/20 text-slate-300",
    "bg-yellow-500/20 text-yellow-300",
    "bg-purple-500/20 text-purple-300",
    "bg-cyan-400/20 text-cyan-300",
    "bg-red-500/20 text-red-300",
  ];
  return colors[Math.min(tier - 1, colors.length - 1)] || colors[0];
}

// ═══════════════════════════════════════════════════════════
// Arena List — shows active + history
// ═══════════════════════════════════════════════════════════
function ArenaList() {
  const [, navigate] = useLocation();

  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: ["arena", "active"],
    queryFn: async () => {
      const res = await fetch(`${API}/active`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["arena", "history"],
    queryFn: async () => {
      const res = await fetch(`${API}/history?limit=5`);
      return res.json();
    },
  });

  const activeArenas: ArenaContest[] = activeData?.arenas || [];
  const pastContests: ArenaContest[] = historyData?.contests || [];

  return (
    <div className="space-y-8">
      {/* Active Contests */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Swords className="w-6 h-6 text-fuchsia-400" />
          <h2 className="text-2xl font-bold text-white">Active Arenas</h2>
          <Badge
            variant="outline"
            className="border-fuchsia-500/40 text-fuchsia-300"
          >
            {activeArenas.length} live
          </Badge>
        </div>

        {loadingActive ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : activeArenas.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No active arenas right now</p>
              <p className="text-sm text-gray-500 mt-1">
                Check back soon — new weekly contests launch every Monday
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeArenas.map((arena) => (
              <motion.div key={arena.id} variants={staggerItem}>
                <Card
                  className="bg-gradient-to-br from-fuchsia-900/30 to-purple-900/30 border-fuchsia-500/20 hover:border-fuchsia-400/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/arena/${arena.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border-0">
                        {arena.genre}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          arena.status === "in_progress"
                            ? "border-green-500/40 text-green-400"
                            : "border-yellow-500/40 text-yellow-400"
                        }
                      >
                        {arena.status === "in_progress"
                          ? "⚔ In Battle"
                          : "📝 Registration Open"}
                      </Badge>
                    </div>
                    <CardTitle className="text-white mt-2 flex items-center gap-2 group-hover:text-fuchsia-300 transition-colors">
                      <Swords className="w-5 h-5" />
                      Week {arena.week_number}/{arena.year_number} Arena
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {new Date(arena.week_start).toLocaleDateString()} —{" "}
                      {new Date(arena.week_end).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {arena.entered_artists || 0}
                        </p>
                        <p className="text-xs text-gray-400">Artists</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-fuchsia-300">
                          {ROUND_NAMES[(arena.current_round || 1) - 1]
                            ?.split(" ")
                            .pop()}
                        </p>
                        <p className="text-xs text-gray-400">Round</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-300">
                          {arena.total_streams || 0}
                        </p>
                        <p className="text-xs text-gray-400">Streams</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end text-sm text-fuchsia-400 group-hover:translate-x-1 transition-transform">
                      Enter Arena <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Past Contests */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Past Champions</h2>
        </div>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : pastContests.length === 0 ? (
          <p className="text-gray-500 text-sm">No past contests yet</p>
        ) : (
          <div className="space-y-3">
            {pastContests.map((c: any) => (
              <Card
                key={c.id}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/arena/${c.id}`)}
              >
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-white font-medium">
                        {c.genre} — Week {c.week_number}/{c.year_number}
                      </p>
                      <p className="text-sm text-gray-400">
                        🏆 {c.winner_name || "Unknown"} • {c.total_votes || 0}{" "}
                        votes
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Arena Detail — Bracket + Voting
// ═══════════════════════════════════════════════════════════
function ArenaDetail({ contestId }: { contestId: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["arena", contestId],
    queryFn: async () => {
      const res = await fetch(`${API}/${contestId}`);
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: myVotesData, refetch: refetchVotes } = useQuery({
    queryKey: ["arena", contestId, "my-votes"],
    queryFn: async () => {
      const res = await fetch(`${API}/${contestId}/my-votes`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 15000,
  });

  const voteMutation = useMutation({
    mutationFn: async (artistProfileId: number) => {
      const res = await fetch(`${API}/${contestId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ artistProfileId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: data.isNewlyLocked ? "🔒 Vote Locked!" : "✓ Vote Recorded",
          description: data.message,
        });
        refetch();
        refetchVotes();
      } else {
        toast({
          title: "Vote Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  const contest: ArenaContest | null = data?.contest || null;
  const rounds: Record<number, BracketEntry[]> = data?.rounds || {};
  const myVotes: MyVote[] = myVotesData?.votes || [];
  const votesRemaining: number = myVotesData?.remaining ?? 100;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Contest not found</p>
          <Button
            variant="ghost"
            className="mt-4 text-fuchsia-400"
            onClick={() => navigate("/arena")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Arenas
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentRound = contest.current_round || 1;
  const isActive = contest.status === "in_progress";
  const isCompleted = contest.status === "completed";

  // Build vote lookup: artistProfileId → MyVote
  const voteMap = new Map<number, MyVote>();
  myVotes.forEach((v) => voteMap.set(v.artist_profile_id, v));

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-white"
        onClick={() => navigate("/arena")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> All Arenas
      </Button>

      {/* Contest Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-fuchsia-900/40 via-purple-900/30 to-indigo-900/40 border-fuchsia-500/20 overflow-hidden relative">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px]" />
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border-0 text-sm">
                {contest.genre}
              </Badge>
              <Badge
                variant="outline"
                className={
                  isCompleted
                    ? "border-yellow-500/40 text-yellow-400"
                    : isActive
                      ? "border-green-500/40 text-green-400 animate-pulse"
                      : "border-blue-500/40 text-blue-400"
                }
              >
                {isCompleted
                  ? "🏆 Completed"
                  : isActive
                    ? "⚔ Live Battle"
                    : "📝 Registration"}
              </Badge>
            </div>
            <CardTitle className="text-white text-2xl md:text-3xl mt-2">
              Week {contest.week_number}/{contest.year_number} — {contest.genre}{" "}
              Arena
            </CardTitle>
            <CardDescription className="text-gray-400">
              {new Date(contest.week_start).toLocaleDateString()} –{" "}
              {new Date(contest.week_end).toLocaleDateString()}
              {isActive && ` • Round: ${ROUND_NAMES[currentRound - 1]}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white/5 rounded-lg p-3">
                <Users className="w-5 h-5 text-fuchsia-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">
                  {(rounds[1] || []).length}
                </p>
                <p className="text-xs text-gray-400">Entrants</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <Swords className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">
                  {ROUND_NAMES[currentRound - 1]?.split(" ").pop()}
                </p>
                <p className="text-xs text-gray-400">Current Round</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <Music className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">
                  {contest.total_votes || 0}
                </p>
                <p className="text-xs text-gray-400">Total Votes</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{votesRemaining}</p>
                <p className="text-xs text-gray-400">Your Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bracket Rounds */}
      <Tabs defaultValue={String(currentRound)} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 w-full justify-start overflow-x-auto">
          {[1, 2, 3, 4].map((r) => (
            <TabsTrigger
              key={r}
              value={String(r)}
              disabled={!rounds[r] || rounds[r].length === 0}
              className="data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-300 text-gray-400"
            >
              {ROUND_NAMES[r - 1]}
              {r === currentRound && isActive && (
                <span className="ml-2 w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {[1, 2, 3, 4].map((r) => (
          <TabsContent key={r} value={String(r)} className="mt-4">
            {!rounds[r] || rounds[r].length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Round not started yet
              </p>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {rounds[r]
                  .sort(
                    (a: BracketEntry, b: BracketEntry) =>
                      b.vote_count - a.vote_count,
                  )
                  .map((entry: BracketEntry, idx: number) => {
                    const myVote = voteMap.get(entry.artist_profile_id);
                    const isEliminated = entry.eliminated;

                    return (
                      <motion.div key={entry.id} variants={staggerItem}>
                        <Card
                          className={`relative overflow-hidden transition-all ${
                            isEliminated
                              ? "bg-red-900/10 border-red-500/20 opacity-60"
                              : idx === 0 && r === currentRound
                                ? "bg-gradient-to-br from-yellow-900/20 to-fuchsia-900/20 border-yellow-500/30"
                                : "bg-white/5 border-white/10 hover:border-fuchsia-500/30"
                          }`}
                        >
                          {/* Rank badge */}
                          {!isEliminated && idx < 3 && (
                            <div
                              className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0
                                  ? "bg-yellow-500/30 text-yellow-300"
                                  : idx === 1
                                    ? "bg-gray-400/30 text-gray-300"
                                    : "bg-amber-700/30 text-amber-400"
                              }`}
                            >
                              #{idx + 1}
                            </div>
                          )}

                          {isEliminated && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="destructive" className="text-xs">
                                Eliminated
                              </Badge>
                            </div>
                          )}

                          <CardContent className="pt-5 pb-4">
                            {/* Artist */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                {entry.profile_image_url ? (
                                  <img
                                    src={entry.profile_image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  entry.stage_name?.[0]?.toUpperCase() || "?"
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">
                                  {entry.stage_name}
                                </p>
                                <Badge
                                  className={`text-[10px] ${getBadgeColor(entry.current_badge_tier || 1)}`}
                                >
                                  {
                                    BADGE_NAMES[
                                      (entry.current_badge_tier || 1) - 1
                                    ]
                                  }
                                </Badge>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 text-center mb-3">
                              <div className="bg-black/20 rounded px-2 py-1">
                                <p className="text-lg font-bold text-fuchsia-300">
                                  {entry.vote_count}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  Votes
                                </p>
                              </div>
                              <div className="bg-black/20 rounded px-2 py-1">
                                <p className="text-lg font-bold text-purple-300">
                                  {entry.streams}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  Streams
                                </p>
                              </div>
                            </div>

                            {/* Vote button + lock status */}
                            {isActive &&
                              r === currentRound &&
                              !isEliminated && (
                                <div>
                                  {myVote && (
                                    <div
                                      className={`flex items-center gap-1 text-xs mb-2 ${
                                        myVote.vote_status === "locked"
                                          ? "text-red-400"
                                          : "text-green-400"
                                      }`}
                                    >
                                      {myVote.vote_status === "locked" ? (
                                        <>
                                          <Lock className="w-3 h-3" /> Locked (
                                          {myVote.stream_count} streams)
                                        </>
                                      ) : (
                                        <>
                                          <Unlock className="w-3 h-3" /> Soft (
                                          {myVote.streamsUntilLock} until lock)
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
                                    disabled={
                                      voteMutation.isPending ||
                                      votesRemaining <= 0
                                    }
                                    onClick={() =>
                                      voteMutation.mutate(
                                        entry.artist_profile_id,
                                      )
                                    }
                                  >
                                    <Radio className="w-3 h-3 mr-1" />
                                    {myVote ? "Stream Again" : "Vote"}
                                  </Button>
                                </div>
                              )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
              </motion.div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* My Votes Summary */}
      {myVotes.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-fuchsia-400" />
              Your Vote Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myVotes.map((v: MyVote) => (
                <div
                  key={v.artist_profile_id}
                  className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/30 flex items-center justify-center text-white text-xs">
                      {v.stage_name?.[0]}
                    </div>
                    <span className="text-white text-sm">{v.stage_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-fuchsia-300 text-sm font-mono">
                      {v.stream_count} streams
                    </span>
                    {v.vote_status === "locked" ? (
                      <Badge
                        variant="outline"
                        className="border-red-500/40 text-red-400 text-xs"
                      >
                        <Lock className="w-3 h-3 mr-1" /> Locked
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-500/40 text-green-400 text-xs"
                      >
                        <Unlock className="w-3 h-3 mr-1" /> Soft
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-3 bg-white/10" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Remaining votes</span>
              <span className="text-fuchsia-300 font-bold">
                {votesRemaining} / 100
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page Export
// ═══════════════════════════════════════════════════════════
export default function ArenaContestPage() {
  const params = useParams<{ id?: string }>();
  const contestId = params.id ? parseInt(params.id) : null;

  return (
    <div className="min-h-screen bg-[#06020f] relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full px-4 py-1.5 mb-4">
            <Swords className="w-4 h-4 text-fuchsia-400" />
            <span className="text-sm text-fuchsia-300 font-medium">
              StreamRoyale Arena
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Battle Royale
          </h1>
          <p className="text-gray-400 mt-2 max-w-lg mx-auto">
            16 artists enter • 4 rounds of elimination • 1 champion crowned
          </p>
        </motion.div>

        {/* Content */}
        {contestId ? <ArenaDetail contestId={contestId} /> : <ArenaList />}
      </div>
    </div>
  );
}

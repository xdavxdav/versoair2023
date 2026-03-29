/**
 * Listener Portal — Dashboard for streamers to track activity, contest participation, and rewards
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Headphones,
  Trophy,
  Star,
  Gift,
  Music,
  Heart,
  Clock,
  Zap,
  Crown,
  Target,
  CheckCircle,
  Award,
  Flame,
  Users,
  Play,
  Volume2,
  ChevronRight,
  Sparkles,
  Medal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";

interface ListenerStats {
  totalListenTime: number;
  tracksPlayed: number;
  artistsDiscovered: number;
  contestsParticipated: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  rank: number;
  badges: BadgeItem[];
  recentActivity: Activity[];
  pendingBonuses: Bonus[];
  contestHistory: ContestEntry[];
}

interface BadgeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface Activity {
  id: number;
  type: "listen" | "vote" | "prediction" | "bonus" | "achievement";
  description: string;
  points: number;
  timestamp: string;
}

interface Bonus {
  id: number;
  type: string;
  amount: number;
  description: string;
  expiresAt?: string;
  claimed: boolean;
}

interface ContestEntry {
  id: number;
  contestName: string;
  artistVoted: string;
  artistImage?: string;
  result: "pending" | "won" | "lost";
  pointsEarned: number;
  date: string;
}

const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000,
];
const LEVEL_NAMES = [
  "Rookie",
  "Fan",
  "Enthusiast",
  "Devotee",
  "Connoisseur",
  "Expert",
  "Master",
  "Legend",
  "Icon",
  "Immortal",
  "Divine",
  "Transcendent",
];

const BADGE_COLORS: Record<string, string> = {
  common: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  rare: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  epic: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  legendary: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

async function authFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, { credentials: "include", ...opts });
}

export default function ListenerPortal() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, refetch } = useQuery<ListenerStats>({
    queryKey: ["/api/listener/stats"],
    queryFn: async () => {
      const res = await authFetch("/api/listener/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const json = await res.json();
      return json.data;
    },
    enabled: !!user,
  });

  const claimBonus = useMutation({
    mutationFn: async (bonusId: number) => {
      const res = await authFetch(`/api/listener/bonuses/${bonusId}/claim`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to claim bonus");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/listener/stats"] });
    },
  });

  // Auth gate
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-black/60 border-purple-500/30 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Headphones className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Listener Portal
            </h2>
            <p className="text-gray-400 mb-6">
              Connectez-vous pour suivre votre activité, participer aux concours
              et gagner des récompenses!
            </p>
            <div className="space-y-3">
              <Button
                className="bg-purple-600 hover:bg-purple-700 w-full"
                onClick={() => navigate("/apply")}
              >
                Créer un compte
              </Button>
              <Button
                variant="outline"
                className="w-full border-purple-500/50 text-purple-300"
                onClick={() => navigate("/auth/signin")}
              >
                J'ai déjà un compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentLevel = stats?.level || 1;
  const levelName =
    LEVEL_NAMES[Math.min(currentLevel - 1, LEVEL_NAMES.length - 1)];
  const currentPoints = stats?.totalPoints || 0;
  const nextLevelPoints =
    stats?.nextLevelPoints || LEVEL_THRESHOLDS[currentLevel] || 100;
  const prevLevelPoints = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const levelProgress = Math.min(
    100,
    ((currentPoints - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) *
      100,
  );

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-center gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center ring-4 ring-purple-500/30">
                <Headphones className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user.username || user.email?.split("@")[0]}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 text-purple-200 border-purple-500/40">
                    <Crown className="w-3 h-3 mr-1" />
                    {levelName}
                  </Badge>
                  <span className="text-gray-400 text-sm">
                    Level {currentLevel}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 md:max-w-md">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">
                  Progress to Level {currentLevel + 1}
                </span>
                <span className="text-purple-400">
                  {currentPoints} / {nextLevelPoints} XP
                </span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-600"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400 flex items-center gap-1">
                  <Flame className="w-5 h-5" />
                  {stats?.currentStreak || 0}
                </div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  #{stats?.rank || "—"}
                </div>
                <div className="text-xs text-gray-400">Global Rank</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800/50 border border-gray-700 mb-6 w-full justify-start overflow-x-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-purple-600"
            >
              <Zap className="w-4 h-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="contests"
              className="data-[state=active]:bg-purple-600"
            >
              <Trophy className="w-4 h-4 mr-1.5" />
              Contests
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="data-[state=active]:bg-purple-600"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              Rewards
            </TabsTrigger>
            <TabsTrigger
              value="badges"
              className="data-[state=active]:bg-purple-600"
            >
              <Medal className="w-4 h-4 mr-1.5" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    icon: Clock,
                    label: "Listen Time",
                    value: formatTime(stats?.totalListenTime || 0),
                    color: "text-purple-400",
                  },
                  {
                    icon: Play,
                    label: "Tracks Played",
                    value: stats?.tracksPlayed || 0,
                    color: "text-green-400",
                  },
                  {
                    icon: Users,
                    label: "Artists Discovered",
                    value: stats?.artistsDiscovered || 0,
                    color: "text-amber-400",
                  },
                  {
                    icon: Target,
                    label: "Correct Predictions",
                    value: stats?.correctPredictions || 0,
                    color: "text-fuchsia-400",
                  },
                ].map((stat, i) => (
                  <motion.div key={i} variants={staggerItem}>
                    <Card className="bg-black/40 border-purple-500/20 hover:border-purple-500/40 transition-colors">
                      <CardContent className="p-4 text-center">
                        <stat.icon
                          className={`w-8 h-8 ${stat.color} mx-auto mb-2`}
                        />
                        <div className="text-2xl font-bold text-white">
                          {stat.value}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stat.label}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Arena Contest Quick Access */}
              <motion.div variants={staggerItem}>
                <Card
                  className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/40 hover:border-amber-400/60 cursor-pointer transition-all group"
                  onClick={() => navigate("/arena")}
                >
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                        <Trophy className="h-7 w-7 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">
                          Arena Contests
                        </h3>
                        <p className="text-amber-200/80 text-sm">
                          Vote for artists, earn XP & win prediction bonuses
                        </p>
                      </div>
                    </div>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                      Enter Arena <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {(stats?.pendingBonuses?.filter((b) => !b.claimed).length || 0) >
                0 && (
                <motion.div variants={staggerItem}>
                  <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-amber-400 flex items-center gap-2">
                        <Gift className="w-5 h-5" />
                        Unclaimed Bonuses (
                        {
                          stats?.pendingBonuses?.filter((b) => !b.claimed)
                            .length
                        }
                        )
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats?.pendingBonuses
                          ?.filter((b) => !b.claimed)
                          .map((bonus) => (
                            <div
                              key={bonus.id}
                              className="flex items-center justify-between bg-black/30 rounded-lg p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  {bonus.type === "prediction_win" ? (
                                    <Target className="w-5 h-5 text-amber-400" />
                                  ) : bonus.type === "streak" ? (
                                    <Flame className="w-5 h-5 text-orange-400" />
                                  ) : bonus.type === "milestone" ? (
                                    <Award className="w-5 h-5 text-purple-400" />
                                  ) : (
                                    <Gift className="w-5 h-5 text-amber-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {bonus.description}
                                  </p>
                                  <p className="text-amber-400 text-sm">
                                    +{bonus.amount} XP
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => claimBonus.mutate(bonus.id)}
                                disabled={claimBonus.isPending}
                              >
                                {claimBonus.isPending ? "..." : "Claim"}
                              </Button>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div variants={staggerItem}>
                <Card className="bg-black/40 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(stats?.recentActivity || [])
                        .slice(0, 10)
                        .map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  activity.type === "listen"
                                    ? "bg-green-500/20"
                                    : activity.type === "vote"
                                      ? "bg-purple-500/20"
                                      : activity.type === "prediction"
                                        ? "bg-amber-500/20"
                                        : activity.type === "bonus"
                                          ? "bg-fuchsia-500/20"
                                          : "bg-blue-500/20"
                                }`}
                              >
                                {activity.type === "listen" && (
                                  <Volume2 className="w-4 h-4 text-green-400" />
                                )}
                                {activity.type === "vote" && (
                                  <Heart className="w-4 h-4 text-purple-400" />
                                )}
                                {activity.type === "prediction" && (
                                  <Target className="w-4 h-4 text-amber-400" />
                                )}
                                {activity.type === "bonus" && (
                                  <Gift className="w-4 h-4 text-fuchsia-400" />
                                )}
                                {activity.type === "achievement" && (
                                  <Award className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-white text-sm">
                                  {activity.description}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {new Date(
                                    activity.timestamp,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {activity.points > 0 && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                                +{activity.points} XP
                              </Badge>
                            )}
                          </div>
                        ))}
                      {(!stats?.recentActivity ||
                        stats.recentActivity.length === 0) && (
                        <div className="text-center py-8">
                          <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400">No recent activity</p>
                          <p className="text-gray-500 text-sm">
                            Start listening to earn XP!
                          </p>
                          <Button
                            variant="outline"
                            className="mt-4 border-purple-500/50"
                            onClick={() => navigate("/stream")}
                          >
                            Go to Stream{" "}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          <TabsContent value="contests">
            <Card className="bg-black/40 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Contest History
                  </span>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate("/arena")}
                  >
                    Join Contest <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(stats?.contestHistory || []).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center overflow-hidden">
                          {entry.artistImage ? (
                            <img
                              src={entry.artistImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {entry.contestName}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Voted: {entry.artistVoted}
                          </p>
                          <p className="text-gray-500 text-xs">{entry.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            entry.result === "won"
                              ? "bg-green-500/20 text-green-400"
                              : entry.result === "lost"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {entry.result === "won" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {entry.result.charAt(0).toUpperCase() +
                            entry.result.slice(1)}
                        </Badge>
                        {entry.pointsEarned > 0 && (
                          <p className="text-green-400 text-sm mt-1">
                            +{entry.pointsEarned} XP
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!stats?.contestHistory ||
                    stats.contestHistory.length === 0) && (
                    <div className="text-center py-12">
                      <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">
                        No contest participation yet
                      </p>
                      <Button
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                        onClick={() => navigate("/arena")}
                      >
                        Join a Contest
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-black/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    How to Earn XP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { action: "Listen to a full track", xp: 5, icon: Play },
                    { action: "Discover a new artist", xp: 10, icon: Users },
                    { action: "Vote in arena contest", xp: 25, icon: Heart },
                    { action: "Correct prediction", xp: 100, icon: Target },
                    { action: "7-day listening streak", xp: 50, icon: Flame },
                    { action: "30-day listening streak", xp: 200, icon: Crown },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-purple-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <item.icon className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-gray-300">{item.action}</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        +{item.xp} XP
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-black/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    Level Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {LEVEL_NAMES.slice(0, 6).map((name, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg ${currentLevel > i + 1 ? "bg-green-500/10" : currentLevel === i + 1 ? "bg-purple-500/20 ring-1 ring-purple-500" : "bg-gray-800/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${currentLevel > i + 1 ? "bg-green-500/30" : currentLevel === i + 1 ? "bg-purple-500/30" : "bg-gray-700"}`}
                        >
                          {currentLevel > i + 1 ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <span className="text-gray-400 text-sm font-bold">
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <p
                            className={
                              currentLevel >= i + 1
                                ? "text-white font-medium"
                                : "text-gray-500"
                            }
                          >
                            {name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {LEVEL_THRESHOLDS[i + 1]} XP required
                          </p>
                        </div>
                      </div>
                      {currentLevel === i + 1 && (
                        <Badge className="bg-purple-500/20 text-purple-400">
                          Current
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(stats?.badges || []).map((badge) => (
                <Card
                  key={badge.id}
                  className={`bg-black/40 border-2 ${badge.rarity === "legendary" ? "border-amber-500/50" : badge.rarity === "epic" ? "border-purple-500/50" : badge.rarity === "rare" ? "border-blue-500/50" : "border-gray-500/30"}`}
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${badge.rarity === "legendary" ? "bg-gradient-to-br from-amber-500/30 to-orange-500/30" : badge.rarity === "epic" ? "bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30" : badge.rarity === "rare" ? "bg-gradient-to-br from-blue-500/30 to-cyan-500/30" : "bg-gray-700/50"}`}
                    >
                      <span className="text-3xl">{badge.icon}</span>
                    </div>
                    <h3 className="text-white font-medium mb-1">
                      {badge.name}
                    </h3>
                    <p className="text-gray-500 text-xs mb-2">
                      {badge.description}
                    </p>
                    <Badge className={BADGE_COLORS[badge.rarity]}>
                      {badge.rarity.charAt(0).toUpperCase() +
                        badge.rarity.slice(1)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {(!stats?.badges || stats.badges.length === 0) && (
                <div className="col-span-full text-center py-12">
                  <Medal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No badges earned yet</p>
                  <p className="text-gray-500 text-sm">
                    Keep listening and participating to earn badges!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Subscription Tiers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Upgrade Your Experience</h2>
            <p className="text-gray-400">Unlock premium features and earn more XP</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="bg-black/40 border-gray-500/30 hover:border-gray-400/50 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent" />
                <CardHeader className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center mb-3">
                    <Headphones className="w-6 h-6 text-gray-400" />
                  </div>
                  <CardTitle className="text-white text-xl">Free</CardTitle>
                  <p className="text-gray-400 text-sm">Basic streaming access</p>
                  <div className="text-2xl font-bold text-white mt-2">$0<span className="text-sm text-gray-500">/month</span></div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {["Stream music", "Earn XP from listening", "Join contests (vote)", "Basic badges"].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-500" />
                      {feature}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4 border-gray-500/50 text-gray-400" disabled>
                    Current Plan
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Tier */}
            <motion.div
              whileHover={{ scale: 1.04, y: -6 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="bg-black/40 border-purple-500/50 hover:border-purple-400/70 transition-all relative overflow-hidden ring-2 ring-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5" />
                <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-bl-lg">POPULAR</div>
                <CardHeader className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <Crown className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white text-xl">Pro</CardTitle>
                  <p className="text-purple-300 text-sm">Enhanced streaming perks</p>
                  <div className="text-2xl font-bold text-white mt-2">$4.99<span className="text-sm text-gray-500">/month</span></div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {["All Free features", "2x XP earnings", "Exclusive badges", "Priority arena access", "Ad-free listening"].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-200 text-sm">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      {feature}
                    </div>
                  ))}
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    onClick={() => navigate("/subscribe?tier=pro")}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Legend Tier */}
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="bg-black/40 border-amber-500/50 hover:border-amber-400/70 transition-all relative overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.1)]">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
                <CardHeader className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <CardTitle className="text-white text-xl">Legend</CardTitle>
                  <p className="text-amber-300 text-sm">Ultimate listener experience</p>
                  <div className="text-2xl font-bold text-white mt-2">$9.99<span className="text-sm text-gray-500">/month</span></div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  {["All Pro features", "5x XP earnings", "Legendary badges", "Kingmaker bonus (150 XP)", "Early contest access", "Exclusive NFT drops"].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-200 text-sm">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      {feature}
                    </div>
                  ))}
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                    onClick={() => navigate("/subscribe?tier=legend")}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Go Legend
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

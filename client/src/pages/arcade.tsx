/**
 * Arcade — PvP Skill-Based Games & Credits Wallet
 *
 * Music Trivia Duel • Wallet balance • Leaderboard • Match history
 * Dark portal theme matching StreamRoyale aesthetic
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Trophy,
  Wallet,
  Swords,
  Music,
  Users,
  Timer,
  ChevronRight,
  Zap,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Star,
  Crown,
  Target,
  ShieldCheck,
  Calendar,
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
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
import { useAuthContext } from "@/contexts/AuthContext";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  cardHover,
} from "@/lib/animations";

// ── Helper: authenticated fetch ──
async function authFetch(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { credentials: "include", ...opts });
  return res;
}
async function authJson(url: string, body?: any) {
  const res = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

// ── Types ──
interface WalletBalance {
  balance: string;
  frozen_balance: string;
  currency: string;
  withdrawal_locked: boolean;
}
interface GameMatch {
  id: number;
  game_type: string;
  player1_id: number;
  player2_id: number | null;
  wager_amount: string;
  platform_cut: string;
  status: string;
  winner_id: number | null;
  round_count: number;
  current_round: number;
  player1_score: number;
  player2_score: number;
  game_state: any;
  created_at: string;
  player1_name?: string;
  player2_name?: string;
}
interface LeaderboardEntry {
  user_id: number;
  username: string;
  total_winnings: string;
  wins: number;
  total_matches: number;
}
interface TriviaQuestion {
  round: number;
  question: string;
  options: string[];
  time_limit: number;
}

// ── Arcade Page ──
export default function ArcadePage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("play");
  const [wagerAmount, setWagerAmount] = useState("50");
  const [activeMatch, setActiveMatch] = useState<GameMatch | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [dob, setDob] = useState("");

  // ── Data fetching ──
  const { data: wallet, refetch: refetchWallet } = useQuery<WalletBalance>({
    queryKey: ["/api/wallet/balance"],
    queryFn: async () => {
      const res = await authFetch("/api/wallet/balance");
      if (!res.ok) return { balance: "0", frozen_balance: "0", currency: "credits", withdrawal_locked: true };
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  const { data: openMatches = [], refetch: refetchOpen } = useQuery<GameMatch[]>({
    queryKey: ["/api/games/open"],
    queryFn: async () => {
      const res = await authFetch("/api/games/open");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 8_000,
  });

  const { data: myMatches = [], refetch: refetchMy } = useQuery<GameMatch[]>({
    queryKey: ["/api/games/my"],
    queryFn: async () => {
      const res = await authFetch("/api/games/my");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 10_000,
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/games/leaderboard"],
    queryFn: async () => {
      const res = await authFetch("/api/games/leaderboard");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });

  // ── Countdown timer ──
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }
  }, [countdown]);

  // ── Load current question when match is active ──
  useEffect(() => {
    if (activeMatch?.status === "active" && activeMatch.game_state?.questions) {
      const q = activeMatch.game_state.questions.find(
        (q: TriviaQuestion) => q.round === activeMatch.current_round
      );
      if (q) {
        setCurrentQuestion(q);
        setCountdown(q.time_limit);
        setSelectedAnswer(null);
        setAnswerResult(null);
      }
    }
  }, [activeMatch?.current_round, activeMatch?.status]);

  // ── Create challenge ──
  const createChallenge = useCallback(async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour jouer.", variant: "destructive" });
      return;
    }
    const wager = parseInt(wagerAmount);
    if (isNaN(wager) || wager < 10) {
      toast({ title: "Mise minimum: 10 crédits", variant: "destructive" });
      return;
    }
    const balance = parseFloat(wallet?.balance || "0");
    if (wager > balance) {
      toast({ title: "Solde insuffisant", description: `Vous avez ${balance} crédits.`, variant: "destructive" });
      return;
    }

    const res = await authJson("/api/games/challenge", {
      game_type: "music_trivia",
      wager_amount: wager,
      round_count: 5,
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.needsAge) {
        setShowAgeModal(true);
        return;
      }
      toast({ title: "Erreur", description: data.error || "Échec de création", variant: "destructive" });
      return;
    }
    toast({ title: "Duel créé!", description: `Match #${data.match.id} — en attente d'adversaire...` });
    setActiveMatch(data.match);
    refetchWallet();
    refetchOpen();
    refetchMy();
  }, [user, wagerAmount, wallet, toast, refetchWallet, refetchOpen, refetchMy]);

  // ── Join match ──
  const joinMatch = useCallback(async (matchId: number) => {
    const res = await authJson(`/api/games/${matchId}/join`);
    const data = await res.json();
    if (!res.ok) {
      if (data.needsAge) {
        setShowAgeModal(true);
        return;
      }
      toast({ title: "Erreur", description: data.error || "Impossible de rejoindre", variant: "destructive" });
      return;
    }
    toast({ title: "Rejoint!", description: "Le duel commence!" });
    setActiveMatch(data.match);
    refetchWallet();
    refetchOpen();
    refetchMy();
  }, [toast, refetchWallet, refetchOpen, refetchMy]);

  // ── Submit answer ──
  const submitAnswer = useCallback(async (answerIndex: number) => {
    if (!activeMatch || selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const res = await authJson(`/api/games/${activeMatch.id}/answer`, {
      round: activeMatch.current_round,
      answer_index: answerIndex,
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Erreur", description: data.error || "Échec", variant: "destructive" });
      return;
    }

    setAnswerResult(data);

    // Auto-advance to next round after 2.5s
    setTimeout(() => {
      if (data.match_status === "completed") {
        setActiveMatch(null);
        setCurrentQuestion(null);
        toast({
          title: data.winner_id === user?.id ? "🏆 Victoire!" : "Match terminé",
          description: data.winner_id === user?.id
            ? `Vous remportez ${data.payout || "le pot"}!`
            : "Bien joué! Retentez votre chance.",
        });
        refetchWallet();
        refetchMy();
      } else if (data.match) {
        setActiveMatch(data.match);
      }
    }, 2500);
  }, [activeMatch, selectedAnswer, user, toast, refetchWallet, refetchMy]);

  // ── Age verification ──
  const verifyAge = useCallback(async () => {
    if (!dob) return;
    const res = await authJson("/api/games/verify-age", { date_of_birth: dob });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Erreur", description: data.error || "Vérification échouée", variant: "destructive" });
      return;
    }
    toast({ title: "Vérifié ✓", description: "Vous pouvez maintenant jouer!" });
    setShowAgeModal(false);
  }, [dob, toast]);

  // ── Stats ──
  const totalWins = myMatches.filter((m) => m.winner_id === user?.id).length;
  const totalPlayed = myMatches.filter((m) => m.status === "completed").length;
  const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
  const balance = parseFloat(wallet?.balance || "0");
  const frozenBalance = parseFloat(wallet?.frozen_balance || "0");

  // ── No auth state ──
  if (!user) {
    return (
      <div className="min-h-screen bg-[#06020f] flex items-center justify-center p-4">
        <Card className="bg-black/40 border-purple-500/30 max-w-md w-full text-center p-8">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Arcade</h2>
          <p className="text-gray-400 mb-6">Connectez-vous pour accéder aux duels PvP et aux mini-jeux.</p>
          <Button onClick={() => navigate("/signin")} className="bg-purple-600 hover:bg-purple-700">
            Se connecter
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06020f] text-white">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-fuchsia-900/20 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/stream")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
                Arcade
              </h1>
              <p className="text-gray-400 mt-1">Duels musicaux PvP • Misez vos crédits • Grimpez le classement</p>
            </div>

            {/* Wallet strip */}
            <div className="flex items-center gap-4 bg-black/50 border border-purple-500/30 rounded-xl px-5 py-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Solde</p>
                <p className="text-xl font-bold text-amber-400">{balance.toLocaleString()}</p>
              </div>
              <Separator orientation="vertical" className="h-8 bg-purple-500/30" />
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">En jeu</p>
                <p className="text-lg font-semibold text-fuchsia-400">{frozenBalance.toLocaleString()}</p>
              </div>
              <Separator orientation="vertical" className="h-8 bg-purple-500/30" />
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Win%</p>
                <p className="text-lg font-semibold text-green-400">{winRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/40 border border-purple-500/20 p-1">
            <TabsTrigger value="play" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white">
              <Swords className="w-4 h-4 mr-2" /> Jouer
            </TabsTrigger>
            <TabsTrigger value="lobby" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" /> Lobby
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" /> Historique
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white">
              <Trophy className="w-4 h-4 mr-2" /> Classement
            </TabsTrigger>
          </TabsList>

          {/* ═══════════ PLAY TAB ═══════════ */}
          <TabsContent value="play" className="space-y-6">
            <AnimatePresence mode="wait">
              {activeMatch && activeMatch.status === "active" && currentQuestion ? (
                /* ── Active Game: Answer Questions ── */
                <motion.div key="game" {...fadeInUp}>
                  <Card className="bg-black/50 border-purple-500/30">
                    <CardHeader className="text-center">
                      <Badge className="mx-auto mb-2 bg-fuchsia-600/30 text-fuchsia-300 border-fuchsia-500/40">
                        Round {activeMatch.current_round} / {activeMatch.round_count}
                      </Badge>
                      <CardTitle className="text-xl text-white">
                        {currentQuestion.question}
                      </CardTitle>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Timer className="w-4 h-4 text-amber-400" />
                        <span className={`text-lg font-bold ${countdown <= 5 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
                          {countdown}s
                        </span>
                      </div>
                      <Progress
                        value={(countdown / (currentQuestion.time_limit || 20)) * 100}
                        className="mt-2 h-2"
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 pb-6">
                      {currentQuestion.options.map((opt, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const isCorrect = answerResult?.correct_index === idx;
                        const showResult = answerResult !== null;
                        let btnClass = "w-full justify-start text-left py-4 px-5 text-base border ";
                        if (showResult && isCorrect) {
                          btnClass += "bg-green-600/30 border-green-500 text-green-200";
                        } else if (showResult && isSelected && !isCorrect) {
                          btnClass += "bg-red-600/30 border-red-500 text-red-200";
                        } else if (isSelected) {
                          btnClass += "bg-purple-600/40 border-purple-500 text-white";
                        } else {
                          btnClass += "bg-black/30 border-gray-700 text-gray-200 hover:border-purple-500/50 hover:bg-purple-900/20";
                        }

                        return (
                          <Button
                            key={idx}
                            variant="outline"
                            className={btnClass}
                            disabled={selectedAnswer !== null}
                            onClick={() => submitAnswer(idx)}
                          >
                            <span className="w-8 h-8 rounded-full bg-purple-600/40 flex items-center justify-center mr-3 text-sm font-bold">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                            {showResult && isCorrect && <CheckCircle2 className="ml-auto w-5 h-5 text-green-400" />}
                            {showResult && isSelected && !isCorrect && <XCircle className="ml-auto w-5 h-5 text-red-400" />}
                          </Button>
                        );
                      })}

                      {answerResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 text-center"
                        >
                          <p className={answerResult.is_correct ? "text-green-400 font-semibold" : "text-red-400"}>
                            {answerResult.is_correct ? "✅ Correct!" : "❌ Incorrect"}
                            {answerResult.points_earned > 0 && ` — +${answerResult.points_earned} pts`}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Score: {answerResult.your_score} vs {answerResult.opponent_score}
                          </p>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : activeMatch && activeMatch.status === "waiting" ? (
                /* ── Waiting for opponent ── */
                <motion.div key="waiting" {...fadeInUp}>
                  <Card className="bg-black/50 border-purple-500/30 text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto text-purple-400 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">En attente d'un adversaire...</h3>
                    <p className="text-gray-400 mb-1">Match #{activeMatch.id} • Mise: {activeMatch.wager_amount} crédits</p>
                    <p className="text-gray-500 text-sm">Partagez le lien pour défier un ami!</p>
                    <Button
                      variant="outline"
                      className="mt-6 border-red-500/40 text-red-400 hover:bg-red-900/20"
                      onClick={() => { setActiveMatch(null); refetchOpen(); }}
                    >
                      Annuler
                    </Button>
                  </Card>
                </motion.div>
              ) : (
                /* ── Create Challenge ── */
                <motion.div key="create" {...fadeInUp}>
                  <Card className="bg-black/50 border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Swords className="w-5 h-5 text-purple-400" />
                        Lancer un Duel Musical
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        5 questions de culture musicale. Le plus rapide et le plus précis gagne la mise!
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Game type card */}
                      <div className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/20 border border-purple-500/20 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <Music className="w-6 h-6 text-fuchsia-400" />
                          <div>
                            <h4 className="font-semibold text-white">Music Trivia Duel</h4>
                            <p className="text-sm text-gray-400">5 rounds • 20s par question • Bonus vitesse</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-gray-500">Format</p>
                            <p className="text-white font-medium">1v1</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-gray-500">Commission</p>
                            <p className="text-white font-medium">10%</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2">
                            <p className="text-gray-500">Mise min</p>
                            <p className="text-white font-medium">10 cr</p>
                          </div>
                        </div>
                      </div>

                      {/* Wager selector */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Montant de la mise</label>
                        <div className="flex gap-2 flex-wrap">
                          {["10", "25", "50", "100", "250"].map((amt) => (
                            <Button
                              key={amt}
                              variant="outline"
                              size="sm"
                              className={`border-purple-500/30 ${
                                wagerAmount === amt
                                  ? "bg-purple-600/40 text-white border-purple-500"
                                  : "text-gray-400 hover:text-white hover:border-purple-500/50"
                              }`}
                              onClick={() => setWagerAmount(amt)}
                            >
                              {amt} cr
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={createChallenge}
                        className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white py-3 text-lg"
                      >
                        <Swords className="w-5 h-5 mr-2" />
                        Lancer le Duel — {wagerAmount} crédits
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    <Card className="bg-black/40 border-purple-500/20 p-4 text-center">
                      <Swords className="w-5 h-5 mx-auto text-purple-400 mb-1" />
                      <p className="text-2xl font-bold text-white">{totalPlayed}</p>
                      <p className="text-xs text-gray-500">Matchs joués</p>
                    </Card>
                    <Card className="bg-black/40 border-purple-500/20 p-4 text-center">
                      <Trophy className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                      <p className="text-2xl font-bold text-white">{totalWins}</p>
                      <p className="text-xs text-gray-500">Victoires</p>
                    </Card>
                    <Card className="bg-black/40 border-purple-500/20 p-4 text-center">
                      <Target className="w-5 h-5 mx-auto text-green-400 mb-1" />
                      <p className="text-2xl font-bold text-white">{winRate}%</p>
                      <p className="text-xs text-gray-500">Win Rate</p>
                    </Card>
                    <Card className="bg-black/40 border-purple-500/20 p-4 text-center">
                      <CircleDollarSign className="w-5 h-5 mx-auto text-fuchsia-400 mb-1" />
                      <p className="text-2xl font-bold text-white">{balance.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Crédits</p>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════ LOBBY TAB ═══════════ */}
          <TabsContent value="lobby" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Duels ouverts
              </h3>
              <Button variant="ghost" size="sm" onClick={() => refetchOpen()} className="text-gray-400 hover:text-white">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>

            {openMatches.length === 0 ? (
              <Card className="bg-black/40 border-purple-500/20 py-12 text-center">
                <Gamepad2 className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Aucun duel en attente</p>
                <p className="text-gray-500 text-sm mt-1">Lancez le premier!</p>
                <Button
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setActiveTab("play")}
                >
                  Créer un duel
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {openMatches.map((match) => (
                  <motion.div key={match.id} {...staggerItem}>
                    <Card className="bg-black/40 border-purple-500/20 hover:border-purple-500/40 transition-colors">
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {match.player1_name || `Joueur #${match.player1_id}`}
                            </p>
                            <p className="text-gray-500 text-sm">
                              Music Trivia • {match.round_count} rounds
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-amber-600/30 text-amber-300 border-amber-500/40">
                            {match.wager_amount} cr
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-fuchsia-600 hover:bg-fuchsia-700"
                            onClick={() => joinMatch(match.id)}
                          >
                            Rejoindre <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════════ HISTORY TAB ═══════════ */}
          <TabsContent value="history" className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Mes Matchs
            </h3>
            {myMatches.length === 0 ? (
              <Card className="bg-black/40 border-purple-500/20 py-12 text-center">
                <Swords className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Aucun match encore</p>
                <p className="text-gray-500 text-sm mt-1">Lancez votre premier duel!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {myMatches.slice(0, 20).map((match) => {
                  const won = match.winner_id === user?.id;
                  const isP1 = match.player1_id === user?.id;
                  const myScore = isP1 ? match.player1_score : match.player2_score;
                  const oppScore = isP1 ? match.player2_score : match.player1_score;

                  return (
                    <Card key={match.id} className="bg-black/40 border-purple-500/20">
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          {match.status === "completed" ? (
                            won ? (
                              <div className="w-10 h-10 rounded-full bg-green-600/30 border border-green-500/40 flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-green-400" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-red-600/30 border border-red-500/40 flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-red-400" />
                              </div>
                            )
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600/30 border border-gray-500/40 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">
                              Match #{match.id}
                              {match.status === "completed" && (
                                <span className={`ml-2 text-sm ${won ? "text-green-400" : "text-red-400"}`}>
                                  {won ? "Victoire" : "Défaite"}
                                </span>
                              )}
                            </p>
                            <p className="text-gray-500 text-sm">
                              Score: {myScore} - {oppScore} •{" "}
                              {new Date(match.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={
                              match.status === "completed"
                                ? won
                                  ? "bg-green-600/30 text-green-300 border-green-500/40"
                                  : "bg-red-600/30 text-red-300 border-red-500/40"
                                : "bg-gray-600/30 text-gray-300 border-gray-500/40"
                            }
                          >
                            {match.wager_amount} cr
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1 capitalize">{match.status}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══════════ LEADERBOARD TAB ═══════════ */}
          <TabsContent value="leaderboard" className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Top Joueurs
            </h3>
            {leaderboard.length === 0 ? (
              <Card className="bg-black/40 border-purple-500/20 py-12 text-center">
                <Crown className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Le classement est vide</p>
                <p className="text-gray-500 text-sm mt-1">Soyez le premier à jouer!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, idx) => (
                  <Card key={entry.user_id} className="bg-black/40 border-purple-500/20">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            idx === 0
                              ? "bg-gradient-to-br from-amber-500 to-yellow-600 text-white"
                              : idx === 1
                                ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800"
                                : idx === 2
                                  ? "bg-gradient-to-br from-amber-700 to-amber-800 text-white"
                                  : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium">{entry.username}</p>
                          <p className="text-gray-500 text-sm">
                            {entry.wins}W / {entry.total_matches}G — {
                              entry.total_matches > 0
                                ? Math.round((entry.wins / entry.total_matches) * 100)
                                : 0
                            }% WR
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-bold text-lg">
                          {parseFloat(entry.total_winnings).toLocaleString()} cr
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Age Verification Modal ── */}
      <AnimatePresence>
        {showAgeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowAgeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0520] border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <ShieldCheck className="w-12 h-12 mx-auto text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white text-center mb-2">Vérification d'âge</h3>
              <p className="text-gray-400 text-sm text-center mb-6">
                Vous devez avoir 18 ans ou plus pour jouer avec des crédits.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Date de naissance</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <Button
                  onClick={verifyAge}
                  disabled={!dob}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Vérifier
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowAgeModal(false)}
                  className="w-full text-gray-500"
                >
                  Annuler
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  CASUAL_ARCADE_GAME_IDS,
  type CasualArcadeGameId,
} from "@shared/arcade-games";

export interface CasualLeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  score: number;
  level: number;
  createdAt: string;
}

export function useCasualArcadeData(
  leaderboardGame: CasualArcadeGameId,
  period: "all" | "7d" | "30d" = "all",
) {
  const { user } = useAuthContext();

  const leaderboardQuery = useQuery<{
    game: CasualArcadeGameId;
    period: string;
    entries: CasualLeaderboardEntry[];
  }>({
    queryKey: ["arcade-casual-leaderboard", leaderboardGame, period],
    queryFn: async () => {
      const res = await fetch(
        `/api/arcade/leaderboard?game=${encodeURIComponent(leaderboardGame)}&period=${encodeURIComponent(period)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Impossible de charger le classement");
      return res.json();
    },
    staleTime: 15_000,
  });

  const myBestQuery = useQuery<{
    bestByGame: Record<CasualArcadeGameId, { score: number; level: number }>;
  }>({
    queryKey: ["arcade-my-best", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/arcade/my-best", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de charger vos records");
      return res.json();
    },
    enabled: Boolean(user),
    staleTime: 15_000,
  });

  const emptyBest = Object.fromEntries(
    CASUAL_ARCADE_GAME_IDS.map((id) => [id, { score: 0, level: 1 }]),
  ) as Record<CasualArcadeGameId, { score: number; level: number }>;

  return {
    leaderboard: leaderboardQuery.data?.entries ?? [],
    leaderboardLoading: leaderboardQuery.isLoading,
    myBest: myBestQuery.data?.bestByGame ?? emptyBest,
    refetchLeaderboard: leaderboardQuery.refetch,
  };
}

export function useArcadeRun(game: CasualArcadeGameId) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const runTokenRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{
    saved: boolean;
    isPersonalBest: boolean;
    bestScore: number;
    error?: string;
  } | null>(null);

  const startRun = useCallback(async () => {
    submittedRef.current = false;
    runTokenRef.current = null;
    setSavedInfo(null);
    if (!user) return;
    try {
      const res = await fetch("/api/arcade/runs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game }),
      });
      if (res.ok) {
        const data = await res.json();
        runTokenRef.current = data.runToken ?? null;
      }
    } catch {
      // Guest/offline fallback: game remains playable
    }
  }, [game, user]);

  const submitScore = useCallback(
    async (score: number, level = 1) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      if (!user) {
        setSavedInfo({
          saved: false,
          isPersonalBest: false,
          bestScore: score,
        });
        return;
      }
      if (!runTokenRef.current) {
        setSavedInfo({
          saved: false,
          isPersonalBest: false,
          bestScore: score,
          error: "Jeton de partie indisponible",
        });
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/arcade/scores", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game,
            score: Math.max(0, Math.floor(score)),
            level,
            runToken: runTokenRef.current,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setSavedInfo({
            saved: true,
            isPersonalBest: Boolean(data.isPersonalBest),
            bestScore: Number(data.bestScore ?? score),
          });
          queryClient.invalidateQueries({
            queryKey: ["arcade-casual-leaderboard"],
          });
          queryClient.invalidateQueries({ queryKey: ["arcade-my-best"] });
        } else {
          setSavedInfo({
            saved: false,
            isPersonalBest: false,
            bestScore: score,
            error: data.error || "Score non enregistré",
          });
        }
      } catch {
        setSavedInfo({
          saved: false,
          isPersonalBest: false,
          bestScore: score,
          error: "Erreur réseau",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [game, queryClient, user],
  );

  return {
    isAuthenticated: Boolean(user),
    startRun,
    submitScore,
    submitting,
    savedInfo,
  };
}

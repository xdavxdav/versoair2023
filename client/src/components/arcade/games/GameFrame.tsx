import { useEffect, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameFrameProps {
  title: string;
  score: number;
  bestScore: number;
  metricLabel: string;
  metricValue: string;
  paused: boolean;
  gameOver: boolean;
  isAuthenticated: boolean;
  submittingScore: boolean;
  savedInfo: {
    saved: boolean;
    isPersonalBest: boolean;
    bestScore: number;
    error?: string;
  } | null;
  onTogglePause: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onRequireSignIn: () => void;
  children: ReactNode;
  controls: ReactNode;
}

export function GameFrame({
  title,
  score,
  bestScore,
  metricLabel,
  metricValue,
  paused,
  gameOver,
  isAuthenticated,
  submittingScore,
  savedInfo,
  onTogglePause,
  onRestart,
  onQuit,
  onRequireSignIn,
  children,
  controls,
}: GameFrameProps) {
  // Pause automatically when the browser tab goes into background
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !paused && !gameOver) {
        onTogglePause();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [paused, gameOver, onTogglePause]);

  // Prevent body scroll while full-viewport game stage is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const displayedBest = Math.max(bestScore, savedInfo?.bestScore ?? 0, score);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[130] h-[100dvh] w-screen bg-[#06020f]/98 md:bg-[#06020f]/90 md:backdrop-blur-md flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      <div className="w-full h-full md:h-auto md:max-h-[94dvh] md:max-w-[460px] md:rounded-3xl md:border md:border-purple-500/30 bg-[#06020f] md:shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col justify-between pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* 1. Safe Top HUD Bar */}
        <header className="h-12 shrink-0 px-3 flex items-center justify-between gap-2 border-b border-purple-500/20 bg-[#0d0620]/90 md:rounded-t-3xl">
          <button
            type="button"
            onClick={onQuit}
            aria-label="Quitter le jeu"
            className="h-10 min-w-[44px] px-2.5 rounded-xl bg-[#180d34] border border-purple-500/25 text-slate-200 hover:text-white hover:border-purple-400/50 flex items-center justify-center gap-1 text-xs font-semibold"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Quitter</span>
          </button>

          <div className="flex items-center gap-4 text-center tabular-nums">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Score
              </p>
              <p className="text-sm font-extrabold text-cyan-300 leading-tight">
                {score.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Record
              </p>
              <p className="text-sm font-bold text-fuchsia-300 leading-tight">
                {displayedBest.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {metricLabel}
              </p>
              <p className="text-sm font-bold text-slate-100 leading-tight">
                {metricValue}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onTogglePause}
            disabled={gameOver}
            aria-label={paused ? "Reprendre" : "Pause"}
            className="h-10 min-w-[44px] px-2.5 rounded-xl bg-[#180d34] border border-purple-500/25 text-slate-200 hover:text-white hover:border-purple-400/50 disabled:opacity-40 flex items-center justify-center"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </header>

        {/* 2. HiDPI Canvas Stage */}
        <div className="relative flex-1 min-h-0 px-3 py-2 flex items-center justify-center">
          <div className="relative w-full h-full max-w-[380px] max-h-[500px] rounded-2xl border border-purple-500/30 bg-[#090418] shadow-[0_0_28px_rgba(139,92,246,0.16)] overflow-hidden flex items-center justify-center">
            {children}

            {/* Pause Overlay */}
            {paused && !gameOver && (
              <div className="absolute inset-0 bg-[#06020f]/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-5 text-center z-20 flex">
                <div className="m-auto flex flex-col items-center justify-center">
                  <p className="text-lg sm:text-xl font-extrabold text-white mb-1">
                    {title} — Pause
                  </p>
                  <p className="text-xs text-slate-300 mb-4 sm:mb-5">
                    Appuyez sur Reprendre pour continuer
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={onTogglePause}
                      className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white"
                    >
                      <Play className="w-4 h-4 mr-1.5" /> Reprendre
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onRestart}
                      className="border-purple-500/35 bg-[#180d34] text-slate-100"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" /> Rejouer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-[#06020f]/90 backdrop-blur-md overflow-y-auto p-3 sm:p-5 text-center z-20 flex">
                <div className="m-auto flex flex-col items-center justify-center w-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center mb-2 sm:mb-3 shadow-lg shadow-purple-500/35 shrink-0">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                    Partie terminée
                  </h3>
                  <p className="text-2xl sm:text-3xl font-black text-cyan-300 tabular-nums mt-0.5 sm:mt-1 leading-tight">
                    {score.toLocaleString()} pts
                  </p>

                  {savedInfo?.isPersonalBest && (
                    <span className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-amber-200">
                      Nouveau record personnel !
                    </span>
                  )}

                  <div className="mt-2 sm:mt-3 text-xs text-slate-300">
                    {submittingScore ? (
                      "Enregistrement du score…"
                    ) : !isAuthenticated ? (
                      <div className="space-y-1.5 sm:space-y-2">
                        <p className="text-slate-300 leading-snug">
                          Connectez-vous pour enregistrer votre score au classement.
                        </p>
                        <Button
                          size="sm"
                          onClick={onRequireSignIn}
                          className="h-8 bg-purple-600 hover:bg-purple-500 text-white"
                        >
                          Se connecter
                        </Button>
                      </div>
                    ) : savedInfo?.saved ? (
                      <span className="text-emerald-300">
                        Score enregistré au classement
                      </span>
                    ) : savedInfo?.error ? (
                      <span className="text-amber-300">{savedInfo.error}</span>
                    ) : null}
                  </div>

                  <div className="mt-3 sm:mt-5 flex gap-2.5 sm:gap-3 w-full max-w-[260px]">
                    <Button
                      size="sm"
                      onClick={onRestart}
                      className="flex-1 h-9 sm:h-10 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" /> Rejouer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onQuit}
                      className="h-9 sm:h-10 border-purple-500/35 bg-[#180d34] text-slate-100 hover:bg-purple-500/20"
                    >
                      Quitter
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Dedicated Below-Canvas Thumb Deck */}
        <div
          className="shrink-0 px-3 pb-2 pt-1 bg-[#0b051b]/95 border-t border-purple-500/20 md:rounded-b-3xl"
          style={{ touchAction: "none" }}
        >
          {controls}
        </div>
      </div>
    </div>
  );
}

export function DpadControls({
  onDirection,
  hint,
}: {
  onDirection: (dir: "up" | "down" | "left" | "right") => void;
  hint?: string;
}) {
  const btnCls =
    "h-12 w-14 min-h-[48px] min-w-[54px] sm:h-13 sm:min-h-[52px] sm:min-w-[56px] rounded-xl bg-[#180d34] border border-purple-500/30 text-slate-100 active:bg-fuchsia-500/35 active:border-fuchsia-400 flex items-center justify-center shadow-inner transition-colors";

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-1.5 py-0.5 sm:py-1">
      <button
        type="button"
        aria-label="Haut"
        onPointerDown={(e) => {
          e.preventDefault();
          onDirection("up");
        }}
        className={btnCls}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Gauche"
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection("left");
          }}
          className={btnCls}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Bas"
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection("down");
          }}
          className={btnCls}
        >
          <ArrowDown className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Droite"
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection("right");
          }}
          className={btnCls}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

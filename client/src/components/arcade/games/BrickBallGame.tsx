import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import {
  createBrickBallState,
  launchBrickBall,
  moveBrickPaddleBy,
  setBrickPaddleNormalized,
  stepBrickBall,
  type BrickBallState,
} from "@/lib/arcade/brick-ball";
import { useArcadeRun } from "@/hooks/use-arcade-run";
import { GameFrame } from "./GameFrame";

export function BrickBallGame({
  bestScore,
  onQuit,
  onRequireSignIn,
}: {
  bestScore: number;
  onQuit: () => void;
  onRequireSignIn: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<BrickBallState>(createBrickBallState());
  const keysRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const draggingRef = useRef(false);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  pausedRef.current = paused;
  const [hud, setHud] = useState({
    score: 0,
    lives: 3,
    level: 1,
    docked: true,
    over: false,
  });

  const { isAuthenticated, startRun, submitScore, submitting, savedInfo } =
    useArcadeRun("brick_ball");

  const restart = useCallback(() => {
    stateRef.current = createBrickBallState();
    setPaused(false);
    setHud({ score: 0, lives: 3, level: 1, docked: true, over: false });
    void startRun();
  }, [startRun]);

  useEffect(() => {
    void startRun();
  }, [startRun]);

  const doLaunch = useCallback(() => {
    if (pausedRef.current || stateRef.current.over) return;
    stateRef.current = launchBrickBall(stateRef.current);
    setHud((h) => ({ ...h, docked: stateRef.current.docked }));
  }, []);

  const updatePaddleFromClientX = useCallback((clientX: number, rect: DOMRect) => {
    if (pausedRef.current || stateRef.current.over) return;
    // 1.15x gain so edge-to-edge thumb sweep fits effortlessly on 375px
    const raw = (clientX - rect.left) / Math.max(1, rect.width);
    const norm = Math.max(0, Math.min(1, 0.5 + (raw - 0.5) * 1.15));
    stateRef.current = setBrickPaddleNormalized(stateRef.current, norm);
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keysRef.current.left = true;
      else if (k === "arrowright" || k === "d") keysRef.current.right = true;
      else if (k === " ") {
        e.preventDefault();
        if (stateRef.current.docked) doLaunch();
        else if (!stateRef.current.over) setPaused((p) => !p);
      } else if (k === "p") {
        if (!stateRef.current.over) setPaused((p) => !p);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keysRef.current.left = false;
      else if (k === "arrowright" || k === "d") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [doLaunch]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (!canvas || !parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const st = stateRef.current;
      const scale = Math.min(
        parent.clientWidth / st.width,
        parent.clientHeight / st.height,
      );
      const w = Math.floor(st.width * scale);
      const h = Math.floor(st.height * scale);
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

      ctx.fillStyle = "#080316";
      ctx.fillRect(0, 0, st.width, st.height);

      // Bricks
      for (const b of st.bricks) {
        if (b.hp >= 3) ctx.fillStyle = "#fbbf24";
        else if (b.hp === 2) ctx.fillStyle = "#d946ef";
        else ctx.fillStyle = "#8b5cf6";

        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();

        if (b.hp >= 2) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
        }
      }

      // Paddle
      const grad = ctx.createLinearGradient(
        st.paddleX,
        st.paddleY,
        st.paddleX + st.paddleW,
        st.paddleY,
      );
      grad.addColorStop(0, "#a855f7");
      grad.addColorStop(0.5, "#22d3ee");
      grad.addColorStop(1, "#ec4899");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(st.paddleX, st.paddleY, st.paddleW, st.paddleH, 6);
      ctx.fill();

      // Ball
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(st.ballX, st.ballY, st.ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.004, (now - last) / 1000));
      last = now;

      if (!pausedRef.current && !stateRef.current.over) {
        if (keysRef.current.left) {
          stateRef.current = moveBrickPaddleBy(stateRef.current, -360 * dt);
        }
        if (keysRef.current.right) {
          stateRef.current = moveBrickPaddleBy(stateRef.current, 360 * dt);
        }
        const prev = stateRef.current;
        const next = stepBrickBall(prev, dt);
        stateRef.current = next;
        if (
          next.score !== prev.score ||
          next.lives !== prev.lives ||
          next.level !== prev.level ||
          next.docked !== prev.docked ||
          next.over
        ) {
          setHud({
            score: next.score,
            lives: next.lives,
            level: next.level,
            docked: next.docked,
            over: next.over,
          });
        }
        if (next.over) {
          void submitScore(next.score, next.level);
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [submitScore]);

  return (
    <GameFrame
      title="Brick Ball"
      score={hud.score}
      bestScore={bestScore}
      metricLabel="Vies"
      metricValue={`${"♥".repeat(Math.max(0, hud.lives))} · N${hud.level}`}
      paused={paused}
      gameOver={hud.over}
      isAuthenticated={isAuthenticated}
      submittingScore={submitting}
      savedInfo={savedInfo}
      onTogglePause={() => setPaused((p) => !p)}
      onRestart={restart}
      onQuit={onQuit}
      onRequireSignIn={onRequireSignIn}
      controls={
        <div className="space-y-2 py-1">
          {hud.docked && !hud.over && (
            <button
              type="button"
              onClick={doLaunch}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
            >
              <Play className="w-4 h-4" /> LANCER LA BALLE
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Déplacer à gauche"
              onPointerDown={(e) => {
                e.preventDefault();
                keysRef.current.left = true;
              }}
              onPointerUp={() => {
                keysRef.current.left = false;
              }}
              onPointerLeave={() => {
                keysRef.current.left = false;
              }}
              className="h-14 w-14 shrink-0 rounded-xl bg-[#180d34] border border-purple-500/30 text-white active:bg-purple-500/35 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              ref={trackRef}
              onPointerDown={(e) => {
                draggingRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                updatePaddleFromClientX(
                  e.clientX,
                  e.currentTarget.getBoundingClientRect(),
                );
                if (stateRef.current.docked) doLaunch();
              }}
              onPointerMove={(e) => {
                if (!draggingRef.current) return;
                updatePaddleFromClientX(
                  e.clientX,
                  e.currentTarget.getBoundingClientRect(),
                );
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              className="flex-1 h-14 rounded-2xl bg-[#140a2c] border border-purple-500/35 flex items-center justify-center text-xs font-medium text-purple-200 cursor-ew-resize touch-none"
            >
              Glissez pour déplacer la raquette
            </div>
            <button
              type="button"
              aria-label="Déplacer à droite"
              onPointerDown={(e) => {
                e.preventDefault();
                keysRef.current.right = true;
              }}
              onPointerUp={() => {
                keysRef.current.right = false;
              }}
              onPointerLeave={() => {
                keysRef.current.right = false;
              }}
              className="h-14 w-14 shrink-0 rounded-xl bg-[#180d34] border border-purple-500/30 text-white active:bg-purple-500/35 flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      }
    >
      <canvas
        ref={canvasRef}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === "mouse") {
            updatePaddleFromClientX(
              e.clientX,
              e.currentTarget.getBoundingClientRect(),
            );
          }
        }}
        onClick={() => {
          if (stateRef.current.docked) doLaunch();
        }}
        className="block touch-none"
      />
    </GameFrame>
  );
}

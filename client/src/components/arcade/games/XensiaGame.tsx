import { useCallback, useEffect, useRef, useState } from "react";
import {
  createXensiaState,
  setXensiaDirection,
  stepXensia,
  type XensiaDir,
  type XensiaState,
} from "@/lib/arcade/xensia";
import { useArcadeRun } from "@/hooks/use-arcade-run";
import { DpadControls, GameFrame } from "./GameFrame";

export function XensiaGame({
  bestScore,
  onQuit,
  onRequireSignIn,
}: {
  bestScore: number;
  onQuit: () => void;
  onRequireSignIn: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<XensiaState>(createXensiaState());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  pausedRef.current = paused;
  const [hud, setHud] = useState({
    score: 0,
    claimedPct: 0,
    targetPct: 75,
    lives: 3,
    level: 1,
    over: false,
  });

  const { isAuthenticated, startRun, submitScore, submitting, savedInfo } =
    useArcadeRun("xensia");

  const restart = useCallback(() => {
    stateRef.current = createXensiaState();
    setPaused(false);
    setHud({
      score: 0,
      claimedPct: 0,
      targetPct: 75,
      lives: 3,
      level: 1,
      over: false,
    });
    void startRun();
  }, [startRun]);

  useEffect(() => {
    void startRun();
  }, [startRun]);

  const sendDir = useCallback((dir: Exclude<XensiaDir, null>) => {
    if (pausedRef.current || stateRef.current.over) return;
    stateRef.current = setXensiaDirection(stateRef.current, dir);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") {
        e.preventDefault();
        sendDir("up");
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        sendDir("down");
      } else if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        sendDir("left");
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        sendDir("right");
      } else if (k === "p" || k === " ") {
        e.preventDefault();
        if (!stateRef.current.over) setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendDir]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (!canvas || !parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const st = stateRef.current;
      const cell = Math.max(
        5,
        Math.floor(Math.min(parent.clientWidth / st.cols, parent.clientHeight / st.rows)),
      );
      const w = cell * st.cols;
      const h = cell * st.rows;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Unclaimed void
      ctx.fillStyle = "#06020f";
      ctx.fillRect(0, 0, w, h);

      // Cells: 1 = claimed territory, 2 = active cyan trail
      for (let y = 0; y < st.rows; y++) {
        for (let x = 0; x < st.cols; x++) {
          const val = st.grid[y][x];
          if (val === 1) {
            ctx.fillStyle = "#1d0f3d";
            ctx.fillRect(x * cell, y * cell, cell, cell);
          } else if (val === 2) {
            ctx.fillStyle = "#22d3ee";
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }

      // Neon perimeter edges along claimed/void transitions
      ctx.fillStyle = "#a855f7";
      for (let y = 1; y < st.rows - 1; y++) {
        for (let x = 1; x < st.cols - 1; x++) {
          if (st.grid[y][x] === 1) {
            if (
              st.grid[y - 1][x] === 0 ||
              st.grid[y + 1][x] === 0 ||
              st.grid[y][x - 1] === 0 ||
              st.grid[y][x + 1] === 0
            ) {
              ctx.fillRect(x * cell, y * cell, cell, cell);
            }
          }
        }
      }

      // Void hazard orbs
      for (const orb of st.voidOrbs) {
        const ox = orb.x * cell + cell / 2;
        const oy = orb.y * cell + cell / 2;
        ctx.save();
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(4, cell * 0.65), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Player marker
      const px = st.playerX * cell + cell / 2;
      const py = st.playerY * cell + cell / 2;
      ctx.save();
      ctx.shadowColor = "#f0abfc";
      ctx.shadowBlur = 10;
      ctx.fillStyle = st.drawing ? "#22d3ee" : "#f0abfc";
      ctx.beginPath();
      ctx.arc(px, py, Math.max(4.5, cell * 0.72), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      if (!pausedRef.current && !stateRef.current.over) {
        acc += dt;
        const stepMs = Math.max(46, 82 - (stateRef.current.level - 1) * 5);
        while (acc >= stepMs) {
          acc -= stepMs;
          const prev = stateRef.current;
          const next = stepXensia(prev);
          stateRef.current = next;
          if (
            next.score !== prev.score ||
            next.claimedPct !== prev.claimedPct ||
            next.lives !== prev.lives ||
            next.level !== prev.level ||
            next.over
          ) {
            setHud({
              score: next.score,
              claimedPct: next.claimedPct,
              targetPct: next.targetPct,
              lives: next.lives,
              level: next.level,
              over: next.over,
            });
          }
          if (next.over) {
            void submitScore(next.score, next.level);
            break;
          }
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
      title="Xensia"
      score={hud.score}
      bestScore={bestScore}
      metricLabel={`${hud.claimedPct}%/${hud.targetPct}%`}
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
        <DpadControls
          onDirection={sendDir}
          hint="Capturez 75% de la zone sans toucher les orbes"
        />
      }
    >
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          swipeStartRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const start = swipeStartRef.current;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (Math.hypot(dx, dy) < 16) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            sendDir(dx > 0 ? "right" : "left");
          } else {
            sendDir(dy > 0 ? "down" : "up");
          }
          swipeStartRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          swipeStartRef.current = null;
        }}
        className="block touch-none"
      />
    </GameFrame>
  );
}

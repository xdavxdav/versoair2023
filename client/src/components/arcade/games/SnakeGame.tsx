import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSnakeState,
  queueSnakeTurn,
  snakeTickMs,
  stepSnake,
  type SnakeDirection,
  type SnakeState,
} from "@/lib/arcade/snake";
import { useArcadeRun } from "@/hooks/use-arcade-run";
import { DpadControls, GameFrame } from "./GameFrame";

export function SnakeGame({
  bestScore,
  onQuit,
  onRequireSignIn,
}: {
  bestScore: number;
  onQuit: () => void;
  onRequireSignIn: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SnakeState>(createSnakeState());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [hud, setHud] = useState({
    score: 0,
    level: 1,
    over: false,
  });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const { isAuthenticated, startRun, submitScore, submitting, savedInfo } =
    useArcadeRun("snake");

  const restart = useCallback(() => {
    stateRef.current = createSnakeState();
    setPaused(false);
    setHud({ score: 0, level: 1, over: false });
    void startRun();
  }, [startRun]);

  useEffect(() => {
    void startRun();
  }, [startRun]);

  const sendDir = useCallback((dir: SnakeDirection) => {
    if (pausedRef.current || stateRef.current.over) return;
    stateRef.current = queueSnakeTurn(stateRef.current, dir);
  }, []);

  // Keyboard bindings
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

  // Game loop + HiDPI render
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      const cell = Math.max(
        10,
        Math.floor(Math.min(pw / stateRef.current.cols, ph / stateRef.current.rows)),
      );
      const w = cell * stateRef.current.cols;
      const h = cell * stateRef.current.rows;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const st = stateRef.current;
      ctx.fillStyle = "#090418";
      ctx.fillRect(0, 0, w, h);

      // Subtle checkerboard grid
      for (let y = 0; y < st.rows; y++) {
        for (let x = 0; x < st.cols; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = "rgba(168, 85, 247, 0.055)";
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }

      // Food orb
      const fx = st.food.x * cell + cell / 2;
      const fy = st.food.y * cell + cell / 2;
      ctx.save();
      ctx.shadowColor = "#d946ef";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#f0abfc";
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Snake segments
      for (let i = st.snake.length - 1; i >= 0; i--) {
        const seg = st.snake[i];
        const t = i / Math.max(1, st.snake.length - 1);
        ctx.fillStyle = i === 0 ? "#22d3ee" : t < 0.5 ? "#8b5cf6" : "#6d28d9";
        const pad = i === 0 ? 1 : 1.5;
        ctx.beginPath();
        ctx.roundRect(
          seg.x * cell + pad,
          seg.y * cell + pad,
          cell - pad * 2,
          cell - pad * 2,
          4,
        );
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;

      if (!pausedRef.current && !stateRef.current.over) {
        acc += dt;
        const stepMs = snakeTickMs(stateRef.current.level);
        while (acc >= stepMs) {
          acc -= stepMs;
          const prev = stateRef.current;
          const next = stepSnake(prev);
          stateRef.current = next;
          if (next.score !== prev.score || next.level !== prev.level || next.over) {
            setHud({ score: next.score, level: next.level, over: next.over });
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
      title="Snake"
      score={hud.score}
      bestScore={bestScore}
      metricLabel="Niv."
      metricValue={String(hud.level)}
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
          hint="Flèches / WASD ou glisser sur le terrain"
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
          if (Math.hypot(dx, dy) < 18) return;
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

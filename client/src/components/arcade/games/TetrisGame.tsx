import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowDownToLine,
  RotateCw,
  Repeat2,
} from "lucide-react";
import {
  createTetrisState,
  getTetrisGhostY,
  hardDropTetris,
  holdTetrisPiece,
  moveTetrisHorizontal,
  rotateTetris,
  stepTetrisDown,
  tetrisGravityMs,
  type TetrominoKey,
  type TetrisState,
} from "@/lib/arcade/tetris";
import { useArcadeRun } from "@/hooks/use-arcade-run";
import { GameFrame } from "./GameFrame";

const PIECE_COLORS: Record<TetrominoKey, string> = {
  I: "#22d3ee",
  O: "#fbbf24",
  T: "#a855f7",
  S: "#34d399",
  Z: "#fb7185",
  J: "#60a5fa",
  L: "#fb923c",
};

const MINI_SHAPES: Record<TetrominoKey, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

function drawMiniPiece(
  ctx: CanvasRenderingContext2D,
  key: TetrominoKey | null,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  if (!key) return;
  const shape = MINI_SHAPES[key];
  const cell = 11;
  const pw = shape[0].length * cell;
  const ph = shape.length * cell;
  const ox = boxX + Math.floor((boxW - pw) / 2);
  const oy = boxY + Math.floor((boxH - ph) / 2);
  ctx.fillStyle = PIECE_COLORS[key];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      ctx.beginPath();
      ctx.roundRect(ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2, 2);
      ctx.fill();
    }
  }
}

export function TetrisGame({
  bestScore,
  onQuit,
  onRequireSignIn,
}: {
  bestScore: number;
  onQuit: () => void;
  onRequireSignIn: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<TetrisState>(createTetrisState());
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  pausedRef.current = paused;
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, over: false });
  const softDropRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isAuthenticated, startRun, submitScore, submitting, savedInfo } =
    useArcadeRun("tetris");

  const syncHud = useCallback((st: TetrisState) => {
    setHud({ score: st.score, lines: st.lines, level: st.level, over: st.over });
    if (st.over) void submitScore(st.score, st.level);
  }, [submitScore]);

  const restart = useCallback(() => {
    stateRef.current = createTetrisState();
    setPaused(false);
    setHud({ score: 0, lines: 0, level: 1, over: false });
    void startRun();
  }, [startRun]);

  useEffect(() => {
    void startRun();
    return () => {
      if (softDropRepeatRef.current) clearInterval(softDropRepeatRef.current);
    };
  }, [startRun]);

  const doMove = useCallback((dx: -1 | 1) => {
    if (pausedRef.current || stateRef.current.over) return;
    stateRef.current = moveTetrisHorizontal(stateRef.current, dx);
  }, []);

  const doRotate = useCallback((dir: "cw" | "ccw" = "cw") => {
    if (pausedRef.current || stateRef.current.over) return;
    stateRef.current = rotateTetris(stateRef.current, dir);
  }, []);

  const doSoftDrop = useCallback(() => {
    if (pausedRef.current || stateRef.current.over) return;
    const next = stepTetrisDown(stateRef.current, true);
    stateRef.current = next;
    syncHud(next);
  }, [syncHud]);

  const doHardDrop = useCallback(() => {
    if (pausedRef.current || stateRef.current.over) return;
    const next = hardDropTetris(stateRef.current);
    stateRef.current = next;
    syncHud(next);
  }, [syncHud]);

  const doHold = useCallback(() => {
    if (pausedRef.current || stateRef.current.over) return;
    stateRef.current = holdTetrisPiece(stateRef.current);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        doMove(-1);
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        doMove(1);
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        doSoftDrop();
      } else if (k === "arrowup" || k === "w" || k === "x") {
        e.preventDefault();
        doRotate("cw");
      } else if (k === "z") {
        e.preventDefault();
        doRotate("ccw");
      } else if (k === " ") {
        e.preventDefault();
        doHardDrop();
      } else if (k === "c" || k === "shift") {
        e.preventDefault();
        doHold();
      } else if (k === "p") {
        e.preventDefault();
        if (!stateRef.current.over) setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, doSoftDrop, doRotate, doHardDrop, doHold]);

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
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      const sideRatio = 0.42;
      const cell = Math.max(
        12,
        Math.floor(Math.min(pw / (st.cols + st.cols * sideRatio + 1), ph / st.rows)),
      );
      const boardW = cell * st.cols;
      const boardH = cell * st.rows;
      const sideW = Math.max(84, Math.floor(cell * 4.4));
      const totalW = boardW + 10 + sideW;
      const totalH = boardH;

      if (canvas.width !== totalW * dpr || canvas.height !== totalH * dpr) {
        canvas.width = totalW * dpr;
        canvas.height = totalH * dpr;
        canvas.style.width = `${totalW}px`;
        canvas.style.height = `${totalH}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Board background
      ctx.fillStyle = "#080314";
      ctx.fillRect(0, 0, totalW, totalH);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.strokeRect(0.5, 0.5, boardW - 1, boardH - 1);

      // Subtle grid lines
      ctx.strokeStyle = "rgba(168, 85, 247, 0.06)";
      for (let x = 1; x < st.cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cell, 0);
        ctx.lineTo(x * cell, boardH);
        ctx.stroke();
      }
      for (let y = 1; y < st.rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cell);
        ctx.lineTo(boardW, y * cell);
        ctx.stroke();
      }

      // Locked cells
      for (let r = 0; r < st.rows; r++) {
        for (let c = 0; c < st.cols; c++) {
          const key = st.board[r][c];
          if (!key) continue;
          ctx.fillStyle = PIECE_COLORS[key];
          ctx.beginPath();
          ctx.roundRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2, 3);
          ctx.fill();
        }
      }

      // Ghost piece
      const ghostY = getTetrisGhostY(st);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.2;
      for (let r = 0; r < st.active.matrix.length; r++) {
        for (let c = 0; c < st.active.matrix[r].length; c++) {
          if (!st.active.matrix[r][c]) continue;
          const gx = st.active.x + c;
          const gy = ghostY + r;
          if (gy >= 0) {
            ctx.strokeRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
          }
        }
      }

      // Active piece
      ctx.fillStyle = PIECE_COLORS[st.active.key];
      for (let r = 0; r < st.active.matrix.length; r++) {
        for (let c = 0; c < st.active.matrix[r].length; c++) {
          if (!st.active.matrix[r][c]) continue;
          const ax = st.active.x + c;
          const ay = st.active.y + r;
          if (ay >= 0) {
            ctx.beginPath();
            ctx.roundRect(ax * cell + 1, ay * cell + 1, cell - 2, cell - 2, 3);
            ctx.fill();
          }
        }
      }

      // Right sidebar HUD: SUIVANT & RÉSERVE
      const sx = boardW + 10;
      const drawPanel = (y: number, label: string, key: TetrominoKey | null) => {
        ctx.fillStyle = "rgba(24, 13, 52, 0.85)";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.28)";
        ctx.beginPath();
        ctx.roundRect(sx, y, sideW - 2, 66, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#c4b5fd";
        ctx.font = "bold 9px system-ui, sans-serif";
        ctx.fillText(label, sx + 8, y + 14);
        drawMiniPiece(ctx, key, sx, y + 18, sideW - 2, 44);
      };

      drawPanel(4, "SUIVANT", st.next);
      drawPanel(78, "RÉSERVE", st.hold);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.fillText("LIGNES", sx + 4, 170);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(String(st.lines), sx + 4, 190);
    };

    const tick = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      if (!pausedRef.current && !stateRef.current.over) {
        acc += dt;
        const gMs = tetrisGravityMs(stateRef.current.level);
        if (acc >= gMs) {
          acc = 0;
          const next = stepTetrisDown(stateRef.current, false);
          stateRef.current = next;
          syncHud(next);
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [syncHud]);

  const stopSoftRepeat = () => {
    if (softDropRepeatRef.current) {
      clearInterval(softDropRepeatRef.current);
      softDropRepeatRef.current = null;
    }
  };

  return (
    <GameFrame
      title="Tetris"
      score={hud.score}
      bestScore={bestScore}
      metricLabel="Lignes"
      metricValue={`${hud.lines} · N${hud.level}`}
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
        <div className="flex items-center justify-between gap-2 py-1">
          {/* Left Thumb Cluster: Move & Soft Drop */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Gauche"
              onPointerDown={(e) => {
                e.preventDefault();
                doMove(-1);
              }}
              className="h-14 w-13 min-w-[52px] rounded-xl bg-[#180d34] border border-purple-500/30 text-white active:bg-purple-500/35 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Descente douce"
              onPointerDown={(e) => {
                e.preventDefault();
                doSoftDrop();
                stopSoftRepeat();
                softDropRepeatRef.current = setInterval(doSoftDrop, 65);
              }}
              onPointerUp={stopSoftRepeat}
              onPointerLeave={stopSoftRepeat}
              onPointerCancel={stopSoftRepeat}
              className="h-14 w-13 min-w-[50px] rounded-xl bg-[#180d34] border border-purple-500/30 text-white active:bg-purple-500/35 flex items-center justify-center"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Droite"
              onPointerDown={(e) => {
                e.preventDefault();
                doMove(1);
              }}
              className="h-14 w-13 min-w-[52px] rounded-xl bg-[#180d34] border border-purple-500/30 text-white active:bg-purple-500/35 flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Thumb Cluster: Hold, Hard Drop, Rotate */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Réserve"
              onPointerDown={(e) => {
                e.preventDefault();
                doHold();
              }}
              className="h-12 w-11 rounded-xl bg-[#180d34] border border-purple-500/30 text-purple-200 active:bg-purple-500/35 flex items-center justify-center"
              title="Réserve (C)"
            >
              <Repeat2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Chute directe"
              onPointerDown={(e) => {
                e.preventDefault();
                doHardDrop();
              }}
              className="h-14 w-14 rounded-xl bg-fuchsia-600/30 border border-fuchsia-400/50 text-fuchsia-100 active:bg-fuchsia-500/60 flex items-center justify-center"
              title="Chute directe (Espace)"
            >
              <ArrowDownToLine className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Rotation"
              onPointerDown={(e) => {
                e.preventDefault();
                doRotate("cw");
              }}
              className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 border border-purple-300/40 text-white active:scale-95 flex items-center justify-center shadow-lg shadow-purple-500/30"
              title="Rotation (↑)"
            >
              <RotateCw className="w-6 h-6" />
            </button>
          </div>
        </div>
      }
    >
      <canvas ref={canvasRef} className="block touch-none" />
    </GameFrame>
  );
}

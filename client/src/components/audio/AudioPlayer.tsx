/**
 * Verso Air Streaming — Persistent Bottom Audio Player
 * Full-featured player with waveform, queue, controls
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAudio, type RepeatMode } from "@/lib/audio-context";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Heart,
  ChevronUp,
  ChevronDown,
  X,
  Gauge,
  Music,
  Disc3,
  GripVertical,
  Trash2,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";

/** Resolve cover art URL — prefers cover_art URL, then pochette endpoint, then album_cover */
function getCover(t: any): string | null {
  if (t?.cover_art) return t.cover_art;
  if (t?.has_pochette) return `/api/streaming/tracks/${t.id}/pochette`;
  if (t?.album_cover) return t.album_cover;
  return null;
}

// ═══════════════════════════════════════════════════════════
// WAVEFORM VISUALIZER
// ═══════════════════════════════════════════════════════════
function WaveformVisualizer({
  analyser,
  isPlaying,
}: {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const bars = 32;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyser && isPlaying) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);

        const barWidth = w / bars - 1;
        const step = Math.floor(data.length / bars);

        for (let i = 0; i < bars; i++) {
          const val = data[i * step] / 255;
          const barH = val * h * 0.9;
          const x = i * (barWidth + 1);

          // Gold gradient bars
          const gradient = ctx.createLinearGradient(x, h, x, h - barH);
          gradient.addColorStop(0, "rgba(245, 158, 11, 0.6)");
          gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.9)");
          gradient.addColorStop(1, "rgba(217, 119, 6, 1)");

          ctx.fillStyle = gradient;
          ctx.fillRect(x, h - barH, barWidth, barH);

          // Reflection
          ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
          ctx.fillRect(x, h, barWidth, barH * 0.3);
        }
      } else {
        // Idle animation
        for (let i = 0; i < bars; i++) {
          const barWidth = w / bars - 1;
          const x = i * (barWidth + 1);
          const idleH = 2 + Math.sin(Date.now() / 1000 + i * 0.3) * 3;
          ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
          ctx.fillRect(x, h / 2 - idleH / 2, barWidth, idleH);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyser, isPlaying]);

  return (
    <canvas ref={canvasRef} width={192} height={40} className="opacity-80" />
  );
}

// ═══════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════
// MAIN PLAYER
// ═══════════════════════════════════════════════════════════
export default function AudioPlayer() {
  const audio = useAudio();
  const [showQueue, setShowQueue] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [tiroirMode, setTiroirMode] = useState(false);
  const [tiroirOpen, setTiroirOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const expandedBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const activeBarRef = useRef<HTMLDivElement | null>(null);
  const speedBtnRef = useRef<HTMLButtonElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // ── Drag-to-seek: compute percent from pointer position relative to a bar ──
  const getPercentFromEvent = useCallback(
    (clientX: number, bar: HTMLDivElement | null) => {
      if (!bar) return null;
      const rect = bar.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [],
  );

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const pct = getPercentFromEvent(clientX, activeBarRef.current);
      if (pct !== null) audio.seekPercent(pct);
    },
    [audio, getPercentFromEvent],
  );

  // Mouse handlers
  const handleBarMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      barRef: React.RefObject<HTMLDivElement | null>,
    ) => {
      e.preventDefault();
      activeBarRef.current = barRef.current;
      draggingRef.current = true;
      setIsDragging(true);
      // Seek immediately on mousedown
      const pct = getPercentFromEvent(e.clientX, barRef.current);
      if (pct !== null) audio.seekPercent(pct);
    },
    [audio, getPercentFromEvent],
  );

  // Touch handlers
  const handleBarTouchStart = useCallback(
    (
      e: React.TouchEvent<HTMLDivElement>,
      barRef: React.RefObject<HTMLDivElement | null>,
    ) => {
      activeBarRef.current = barRef.current;
      draggingRef.current = true;
      setIsDragging(true);
      const touch = e.touches[0];
      const pct = getPercentFromEvent(touch.clientX, barRef.current);
      if (pct !== null) audio.seekPercent(pct);
    },
    [audio, getPercentFromEvent],
  );

  // Global mousemove/mouseup/touchmove/touchend listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const pct = getPercentFromEvent(e.clientX, activeBarRef.current);
      if (pct !== null) audio.seekPercent(pct);
    };
    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        setIsDragging(false);
        activeBarRef.current = null;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = e.touches[0];
      const pct = getPercentFromEvent(touch.clientX, activeBarRef.current);
      if (pct !== null) audio.seekPercent(pct);
    };
    const handleTouchEnd = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        setIsDragging(false);
        activeBarRef.current = null;
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [audio, getPercentFromEvent]);

  // Close speed menu on click outside
  useEffect(() => {
    if (!showSpeed) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        speedMenuRef.current &&
        !speedMenuRef.current.contains(e.target as Node) &&
        speedBtnRef.current &&
        !speedBtnRef.current.contains(e.target as Node)
      ) {
        setShowSpeed(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSpeed]);

  // Detect if we're on a page with ContentNav (blog, marketplace, etc.)
  // so we can switch to tiroir (drawer) mode
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      const contentNavPaths = [
        "/blog",
        "/marketplace",
        "/services",
        "/marketing",
        "/artisans",
        "/artisan-workshops",
        "/programs",
        "/communities",
        "/community",
        "/contracts",
        "/tickets",
      ];
      const isContentPage = contentNavPaths.some(
        (p) => path === p || path.startsWith(p + "/"),
      );
      setTiroirMode(isContentPage);
    };
    checkPath();
    // Listen for popstate (back/forward) and pushstate
    window.addEventListener("popstate", checkPath);
    // Re-check on any navigation via a MutationObserver on <title> changes
    const observer = new MutationObserver(checkPath);
    const title = document.querySelector("title");
    if (title) observer.observe(title, { childList: true });
    return () => {
      window.removeEventListener("popstate", checkPath);
      observer.disconnect();
    };
  }, []);

  // Dispatch a custom event so ContentNav can shift up when player is visible
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("audio-player-state", {
        detail: { visible: !!audio.currentTrack },
      }),
    );
  }, [audio.currentTrack]);

  // Reserve space at the bottom of the document while the docked bar is shown.
  // The bar is `position: fixed`, so without this it overlaps the last rows of
  // page content (footers, list items, action buttons become unclickable).
  // Height = 12px progress scrubber + 64px control row.
  useEffect(() => {
    const docked = !!audio.currentTrack && !tiroirMode;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = docked
      ? "var(--audio-player-height, 76px)"
      : "";
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [audio.currentTrack, tiroirMode]);

  // Fallback click handler (drag handlers are primary for the bottom/expanded bars)
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Skip if this was the end of a drag
      if (isDragging) return;
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.seekPercent(Math.max(0, Math.min(1, percent)));
    },
    [audio, isDragging],
  );

  // Don't render if no track
  if (!audio.currentTrack) return null;

  const track = audio.currentTrack;

  const repeatIcon = () => {
    if (audio.repeat === "one") return <Repeat1 className="w-4 h-4" />;
    return <Repeat className="w-4 h-4" />;
  };

  const volumeIcon = () => {
    if (audio.isMuted || audio.volume === 0)
      return <VolumeX className="w-4 h-4" />;
    if (audio.volume < 0.5) return <Volume1 className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <>
      {/* Queue Sheet */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-20 w-80 bg-gray-900/98 backdrop-blur-xl border-l border-amber-500/20 z-[90] overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-amber-400" />
                File d'attente
              </h3>
              <button
                onClick={() => setShowQueue(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Now Playing */}
            <div className="p-3 bg-amber-500/10 border-b border-gray-800">
              <p className="text-xs text-amber-400 uppercase tracking-wider mb-2">
                En cours
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                  {getCover(track) ? (
                    <img
                      src={getCover(track)!}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full rounded object-cover"
                    />
                  ) : (
                    <Disc3
                      className="w-5 h-5 text-white animate-spin"
                      style={{ animationDuration: "3s" }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {track.title}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {track.artist_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Queue items */}
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Suivant ({audio.queue.length})
                </p>
                {audio.queue.length > 0 && (
                  <button
                    onClick={audio.clearQueue}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
              {audio.queue.length === 0 ? (
                <p className="text-gray-500 text-sm p-4 text-center">
                  La file d'attente est vide
                </p>
              ) : (
                audio.queue.map((q, i) => (
                  <div
                    key={`${q.id}-${i}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 group"
                  >
                    <GripVertical className="w-3 h-3 text-gray-600 cursor-grab" />
                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {getCover(q) ? (
                        <img
                          src={getCover(q)!}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs truncate">{q.title}</p>
                      <p className="text-gray-500 text-[10px] truncate">
                        {q.artist_name}
                      </p>
                    </div>
                    <button
                      onClick={() => audio.removeFromQueue(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed Menu — anchored above the speed button */}
      <AnimatePresence>
        {showSpeed && (
          <motion.div
            ref={speedMenuRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bg-gray-800 rounded-xl border border-gray-700/80 shadow-2xl z-[101] overflow-hidden py-1 min-w-[100px]"
            style={{
              bottom: speedBtnRef.current
                ? window.innerHeight -
                  speedBtnRef.current.getBoundingClientRect().top +
                  8
                : 96,
              right: speedBtnRef.current
                ? window.innerWidth -
                  speedBtnRef.current.getBoundingClientRect().right
                : 144,
            }}
          >
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-medium">
              Vitesse
            </div>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => {
                  audio.setPlaybackRate(s);
                  setShowSpeed(false);
                }}
                className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-700/60 transition-colors ${
                  audio.playbackRate === s
                    ? "text-amber-400 bg-amber-400/10 font-semibold"
                    : "text-gray-300"
                }`}
              >
                {s === 1 ? "1x (Normal)" : `${s}x`}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════ */}
      {/* EXPANDED FULL-SCREEN PLAYER */}
      {/* ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-gradient-to-b from-gray-900 via-gray-950 to-black flex flex-col items-center justify-center"
          >
            {/* Collapse button */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white"
            >
              <Minimize2 className="w-6 h-6" />
            </button>

            {/* Album art */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/20 mb-8"
            >
              {getCover(track) ? (
                <img
                  src={getCover(track)!}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-600 via-orange-700 to-red-800 flex items-center justify-center">
                  <Disc3
                    className={`w-24 h-24 text-white/60 ${audio.isPlaying ? "animate-spin" : ""}`}
                    style={{ animationDuration: "3s" }}
                  />
                </div>
              )}
            </motion.div>

            {/* Track info */}
            <div className="text-center mb-6 px-8 max-w-md">
              <h2 className="text-white text-2xl font-bold truncate">
                {track.title}
              </h2>
              <Link href={`/artist-catalogue/${track.artist_id}`}>
                <p className="text-amber-400 text-lg hover:underline cursor-pointer">
                  {track.artist_name}
                </p>
              </Link>
              {track.album_title && (
                <p className="text-gray-500 text-sm mt-1">
                  {track.album_title}
                </p>
              )}
            </div>

            {/* Waveform */}
            <div className="mb-6">
              <WaveformVisualizer
                analyser={audio.analyserNode}
                isPlaying={audio.isPlaying}
              />
            </div>

            {/* Progress bar — draggable */}
            <div className="w-full max-w-md px-8 mb-4">
              <div
                ref={expandedBarRef}
                className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                onMouseDown={(e) => handleBarMouseDown(e, expandedBarRef)}
                onTouchStart={(e) => handleBarTouchStart(e, expandedBarRef)}
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  style={{
                    width: `${audio.progress * 100}%`,
                    transition: isDragging ? "none" : "width 150ms",
                  }}
                />
                {/* Draggable thumb — always visible in expanded mode */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg shadow-black/30 ring-2 ring-amber-400/50 cursor-grab active:cursor-grabbing active:scale-110 transition-transform"
                  style={{ left: `${audio.progress * 100}%`, marginLeft: -10 }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{formatTime(audio.currentTime)}</span>
                <span>{formatTime(audio.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={audio.toggleShuffle}
                className={`transition-colors ${audio.shuffle ? "text-amber-400" : "text-gray-400 hover:text-white"}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button
                onClick={audio.previous}
                className="text-white hover:text-amber-400 transition-colors"
              >
                <SkipBack className="w-7 h-7" />
              </button>
              <button
                onClick={audio.togglePlay}
                className="w-16 h-16 bg-amber-500 hover:bg-amber-400 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-amber-500/30"
              >
                {audio.isPlaying ? (
                  <Pause className="w-7 h-7 text-black" />
                ) : (
                  <Play className="w-7 h-7 text-black ml-1" />
                )}
              </button>
              <button
                onClick={audio.next}
                className="text-white hover:text-amber-400 transition-colors"
              >
                <SkipForward className="w-7 h-7" />
              </button>
              <button
                onClick={audio.cycleRepeat}
                className={`transition-colors ${audio.repeat !== "none" ? "text-amber-400" : "text-gray-400 hover:text-white"}`}
              >
                {repeatIcon()}
              </button>
            </div>

            {/* Speed selector row in expanded view */}
            <div className="flex items-center gap-2 mt-4">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => audio.setPlaybackRate(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    audio.playbackRate === s
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {s === 1 ? "1×" : `${s}×`}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BOTTOM BAR PLAYER — or side tiroir on content pages */}
      {/* ═════════════════════════════════════════════════ */}

      {/* Tiroir (side drawer) mode for blog/marketplace pages */}
      {tiroirMode ? (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: tiroirOpen ? 0 : "calc(100% - 48px)" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed bottom-20 right-0 z-[80] w-72 bg-gray-950/98 backdrop-blur-xl border border-amber-500/20 rounded-l-xl shadow-2xl"
        >
          {/* Toggle tab */}
          <button
            onClick={() => setTiroirOpen(!tiroirOpen)}
            className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-12 bg-gray-950/98 backdrop-blur-xl border border-r-0 border-amber-500/20 rounded-l-lg flex items-center justify-center text-amber-400 hover:text-amber-300 transition-colors"
          >
            {tiroirOpen ? (
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            ) : (
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
            )}
          </button>

          {/* Thin progress bar — draggable */}
          <div
            className="w-full h-3 bg-gray-800 cursor-pointer rounded-tl-xl relative flex items-center group"
            onMouseDown={(e) => handleBarMouseDown(e, progressBarRef)}
            onTouchStart={(e) => handleBarTouchStart(e, progressBarRef)}
            onClick={handleProgressClick}
            ref={!expanded ? progressBarRef : undefined}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{
                  width: `${audio.progress * 100}%`,
                  transition: isDragging ? "none" : "width 150ms",
                }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-400 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${audio.progress * 100}%`,
                marginLeft: -5,
                ...(isDragging ? { opacity: 1 } : {}),
              }}
            />
          </div>

          <div className="flex items-center gap-2 p-2">
            {/* Mini cover */}
            <button
              onClick={() => setExpanded(true)}
              className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center"
            >
              {getCover(track) ? (
                <img
                  src={getCover(track)!}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc3
                  className={`w-5 h-5 text-white/70 ${audio.isPlaying ? "animate-spin" : ""}`}
                  style={{ animationDuration: "3s" }}
                />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">
                {track.title}
              </p>
              <p className="text-gray-400 text-[10px] truncate">
                {track.artist_name}
              </p>
            </div>
            <button
              onClick={audio.togglePlay}
              className="w-8 h-8 bg-white hover:bg-amber-100 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            >
              {audio.isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-black" />
              ) : (
                <Play className="w-3.5 h-3.5 text-black ml-0.5" />
              )}
            </button>
            {/* Close button */}
            <button
              onClick={audio.closePlayer}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-[80] bg-gray-950/98 backdrop-blur-xl border-t border-amber-500/20">
          {/* Progress bar (draggable scrubber) */}
          <div
            className="w-full h-3 bg-transparent cursor-pointer group relative flex items-center"
            onMouseDown={(e) => handleBarMouseDown(e, progressBarRef)}
            onTouchStart={(e) => handleBarTouchStart(e, progressBarRef)}
            onClick={handleProgressClick}
            ref={!expanded ? progressBarRef : undefined}
          >
            {/* Track rail */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{
                  width: `${audio.progress * 100}%`,
                  transition: isDragging ? "none" : "width 150ms",
                }}
              />
            </div>
            {/* Draggable thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-400 rounded-full shadow-lg shadow-black/40 transition-all cursor-grab active:cursor-grabbing ${
                isDragging
                  ? "opacity-100 scale-125"
                  : "opacity-0 group-hover:opacity-100 scale-100"
              }`}
              style={{ left: `${audio.progress * 100}%`, marginLeft: -7 }}
            />
          </div>

          <div className="flex items-center h-16 px-3 sm:px-4 gap-3">
            {/* Track Info (left) */}
            <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xs">
              <button
                onClick={() => setExpanded(true)}
                className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center group relative"
              >
                {getCover(track) ? (
                  <img
                    src={getCover(track)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc3
                    className={`w-6 h-6 text-white/70 ${audio.isPlaying ? "animate-spin" : ""}`}
                    style={{ animationDuration: "3s" }}
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </button>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {track.title}
                </p>
                <Link href={`/artist-catalogue/${track.artist_id}`}>
                  <p className="text-gray-400 text-xs truncate hover:text-amber-400 cursor-pointer transition-colors">
                    {track.artist_name}
                  </p>
                </Link>
              </div>
              <Heart className="w-4 h-4 text-gray-500 hover:text-red-400 cursor-pointer transition-colors flex-shrink-0 hidden sm:block" />
            </div>

            {/* Center Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={audio.toggleShuffle}
                className={`hidden sm:block transition-colors ${audio.shuffle ? "text-amber-400" : "text-gray-500 hover:text-white"}`}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={audio.previous}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={audio.togglePlay}
                className="w-9 h-9 bg-white hover:bg-amber-100 rounded-full flex items-center justify-center transition-colors"
              >
                {audio.isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
                ) : audio.isPlaying ? (
                  <Pause className="w-4 h-4 text-black" />
                ) : (
                  <Play className="w-4 h-4 text-black ml-0.5" />
                )}
              </button>
              <button
                onClick={audio.next}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={audio.cycleRepeat}
                className={`hidden sm:block transition-colors ${audio.repeat !== "none" ? "text-amber-400" : "text-gray-500 hover:text-white"}`}
              >
                {repeatIcon()}
              </button>
            </div>

            {/* Waveform (center-right) */}
            <div className="hidden lg:block flex-shrink-0">
              <WaveformVisualizer
                analyser={audio.analyserNode}
                isPlaying={audio.isPlaying}
              />
            </div>

            {/* Time display */}
            <div className="hidden md:flex items-center text-xs text-gray-500 gap-1 flex-shrink-0">
              <span>{formatTime(audio.currentTime)}</span>
              <span>/</span>
              <span>{formatTime(audio.duration)}</span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Speed */}
              <button
                ref={speedBtnRef}
                onClick={() => setShowSpeed(!showSpeed)}
                className={`hidden sm:flex items-center text-xs transition-colors ${
                  showSpeed || audio.playbackRate !== 1
                    ? "text-amber-400"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Vitesse de lecture"
              >
                <Gauge className="w-3.5 h-3.5 mr-0.5" />
                {audio.playbackRate !== 1 && (
                  <span className="font-semibold">{audio.playbackRate}x</span>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group">
                <button
                  onClick={audio.toggleMute}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {volumeIcon()}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={audio.isMuted ? 0 : audio.volume}
                  onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:appearance-none"
                />
              </div>

              {/* Queue */}
              <button
                onClick={() => setShowQueue(!showQueue)}
                className={`transition-colors ${showQueue ? "text-amber-400" : "text-gray-400 hover:text-white"}`}
                title="File d'attente"
              >
                <ListMusic className="w-4 h-4" />
                {audio.queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-[8px] text-black rounded-full flex items-center justify-center font-bold">
                    {audio.queue.length}
                  </span>
                )}
              </button>

              {/* Expand */}
              <button
                onClick={() => setExpanded(true)}
                className="text-gray-400 hover:text-white transition-colors hidden sm:block"
                title="Plein écran"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {/* Close player */}
              <button
                onClick={audio.closePlayer}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Fermer le lecteur"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

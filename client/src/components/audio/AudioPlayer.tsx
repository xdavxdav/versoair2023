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
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.seekPercent(Math.max(0, Math.min(1, percent)));
    },
    [audio],
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
                  {track.cover_art ? (
                    <img
                      src={track.cover_art}
                      alt=""
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
                      {q.cover_art ? (
                        <img
                          src={q.cover_art}
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

      {/* Speed Menu */}
      <AnimatePresence>
        {showSpeed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 right-36 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-[91] overflow-hidden"
          >
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => {
                  audio.setPlaybackRate(s);
                  setShowSpeed(false);
                }}
                className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                  audio.playbackRate === s
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-gray-300"
                }`}
              >
                {s}x
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
              {track.cover_art || track.album_cover ? (
                <img
                  src={track.cover_art || track.album_cover || ""}
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

            {/* Progress bar */}
            <div className="w-full max-w-md px-8 mb-4">
              <div
                ref={progressBarRef}
                className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full relative"
                  style={{ width: `${audio.progress * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BOTTOM BAR PLAYER */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-[80] bg-gray-950/98 backdrop-blur-xl border-t border-amber-500/20">
        {/* Progress bar (thin, clickable) */}
        <div
          className="w-full h-1 bg-gray-800 cursor-pointer group relative"
          onClick={handleProgressClick}
          ref={!expanded ? progressBarRef : undefined}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150"
            style={{ width: `${audio.progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${audio.progress * 100}%`, marginLeft: -6 }}
          />
        </div>

        <div className="flex items-center h-16 px-3 sm:px-4 gap-3">
          {/* Track Info (left) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xs">
            <button
              onClick={() => setExpanded(true)}
              className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center group relative"
            >
              {track.cover_art || track.album_cover ? (
                <img
                  src={track.cover_art || track.album_cover || ""}
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
              onClick={() => setShowSpeed(!showSpeed)}
              className="hidden sm:flex items-center text-xs text-gray-400 hover:text-white transition-colors"
              title="Vitesse de lecture"
            >
              <Gauge className="w-3.5 h-3.5 mr-0.5" />
              {audio.playbackRate !== 1 && <span>{audio.playbackRate}x</span>}
            </button>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-1 group">
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
          </div>
        </div>
      </div>
    </>
  );
}

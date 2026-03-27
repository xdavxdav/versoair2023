/**
 * Verso Air Streaming — Audio Provider Context
 * Global audio state management with Web Audio API for waveform visualization
 */
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
export interface AudioTrack {
  id: number;
  title: string;
  duration: number;
  streams?: number;
  cover_art?: string | null;
  genre?: string | null;
  mood?: string | null;
  artist_name?: string;
  artist_image?: string | null;
  artist_id?: number;
  album_title?: string | null;
  album_cover?: string | null;
  album_id?: number | null;
  file_path?: string | null;
  audio_url?: string | null;
  like_count?: number;
  isLiked?: boolean;
}

export type RepeatMode = "none" | "all" | "one";

interface AudioContextType {
  // State
  currentTrack: AudioTrack | null;
  queue: AudioTrack[];
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number; // 0-1
  currentTime: number; // seconds
  duration: number;
  isLoading: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;

  // Waveform
  analyserNode: AnalyserNode | null;

  // Actions
  playTrack: (track: AudioTrack) => void;
  playTracks: (tracks: AudioTrack[], startIndex?: number) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  seekPercent: (percent: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackRate: (rate: number) => void;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

// ═══════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════
export function AudioProvider({ children }: { children: React.ReactNode }) {
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<globalThis.AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<number>(0);

  // State
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem("verso_volume");
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [playbackRate, setPlaybackRateState] = useState(1);

  // History for previous track
  const historyRef = useRef<AudioTrack[]>([]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const prog = audio.currentTime / audio.duration;
        setProgress(prog);
        setCurrentTime(audio.currentTime);
        progressRef.current = prog;
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      handleTrackEnd();
    };

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsLoading(false);
      console.warn("[Audio] Playback error, trying next track");
      // Auto-skip on error
      setTimeout(() => handleTrackEnd(), 1000);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Setup Web Audio API for waveform
  const setupAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      console.warn("[Audio] Web Audio API setup failed:", e);
    }
  }, []);

  // Handle track end
  const handleTrackEnd = useCallback(() => {
    if (repeat === "one") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }

    setQueue((prev) => {
      if (prev.length > 0) {
        const nextIdx = shuffle ? Math.floor(Math.random() * prev.length) : 0;
        const nextTrack = prev[nextIdx];
        const newQueue = [...prev];
        newQueue.splice(nextIdx, 1);

        // Play next track
        setTimeout(() => loadAndPlay(nextTrack), 50);
        return newQueue;
      } else if (repeat === "all" && historyRef.current.length > 0) {
        // Replay all from history
        const allTracks = [...historyRef.current];
        historyRef.current = [];
        const first = allTracks[0];
        setTimeout(() => loadAndPlay(first), 50);
        return allTracks.slice(1);
      } else {
        // ── Fix: stop audio cleanly — no lingering last-note ──
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        // Suspend Web Audio processing thread so AnalyserNode stops reading stale buffer
        if (audioContextRef.current?.state === "running") {
          audioContextRef.current.suspend().catch(() => {});
        }
        // Clear stream recording timer
        if (streamTimerRef.current) {
          clearTimeout(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        setIsPlaying(false);
        return prev;
      }
    });
  }, [repeat, shuffle]);

  // Load and play a track
  const loadAndPlay = useCallback(
    (track: AudioTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      setIsLoading(true);
      setCurrentTrack(track);
      historyRef.current.push(track);

      // Determine audio URL
      let url: string;
      if (track.file_path) {
        url = `/api/music/tracks/${track.id}/stream`;
      } else if (track.audio_url) {
        url = track.audio_url;
      } else {
        // No audio available — skip this track
        console.warn(`Track "${track.title}" has no audio file`);
        setIsLoading(false);
        return;
      }

      audio.src = url;
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = playbackRate;

      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setupAudioContext();
            // Record stream after 30 seconds
            recordStreamAfterDelay(track.id);
          })
          .catch((err) => {
            console.warn("[Audio] Play failed:", err.message);
            setIsLoading(false);
          });
      }

      // Update media session
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist_name || "Verso Air",
          album: track.album_title || "Verso Air Music",
          artwork:
            track.cover_art || track.album_cover
              ? [
                  {
                    src: track.cover_art || track.album_cover || "",
                    sizes: "512x512",
                    type: "image/jpeg",
                  },
                ]
              : [],
        });
      }
    },
    [volume, isMuted, playbackRate, setupAudioContext],
  );

  // Record stream after 30 seconds
  const recordStreamAfterDelay = useCallback((trackId: number) => {
    if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    streamTimerRef.current = setTimeout(async () => {
      try {
        const sessionId =
          localStorage.getItem("verso_session") || `s_${Date.now()}`;
        localStorage.setItem("verso_session", sessionId);
        await fetch("/api/streaming/record-play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId, duration: 30, sessionId }),
        });
      } catch (e) {
        // Silent fail
      }
    }, 30000);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  const playTrack = useCallback(
    (track: AudioTrack) => {
      loadAndPlay(track);
    },
    [loadAndPlay],
  );

  const playTracks = useCallback(
    (tracks: AudioTrack[], startIndex = 0) => {
      if (tracks.length === 0) return;
      const toPlay = tracks[startIndex];
      const remaining = [
        ...tracks.slice(0, startIndex),
        ...tracks.slice(startIndex + 1),
      ];
      setQueue(remaining);
      loadAndPlay(toPlay);
    },
    [loadAndPlay],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    // Fix: cancel the 30s stream recording timer on pause
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const next = useCallback(() => {
    handleTrackEnd();
  }, [handleTrackEnd]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If more than 3 seconds in, restart track
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    // Go to previous track from history
    if (historyRef.current.length > 1) {
      historyRef.current.pop(); // Remove current
      const prev = historyRef.current.pop()!; // Get previous
      if (currentTrack) {
        setQueue((q) => [currentTrack, ...q]);
      }
      loadAndPlay(prev);
    }
  }, [currentTrack, loadAndPlay]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
    }
  }, []);

  const seekPercent = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = percent * audio.duration;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol));
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
    localStorage.setItem("verso_volume", String(v));
    if (v > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : volume;
      }
      return newMuted;
    });
  }, [volume]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const addToQueue = useCallback((track: AudioTrack) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      const [item] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, item);
      return newQueue;
    });
  }, []);

  // Persist queue to localStorage
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem("verso_queue", JSON.stringify(queue.slice(0, 50)));
    }
  }, [queue]);

  // Media Session controls (complete set for mobile lock-screen)
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => resume());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        previous(),
      );
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const audio = audioRef.current;
        if (audio)
          audio.currentTime = Math.max(
            0,
            audio.currentTime - (details.seekOffset || 10),
          );
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const audio = audioRef.current;
        if (audio)
          audio.currentTime = Math.min(
            audio.duration || 0,
            audio.currentTime + (details.seekOffset || 10),
          );
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        const audio = audioRef.current;
        if (audio && details.seekTime != null)
          audio.currentTime = details.seekTime;
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        setIsPlaying(false);
      });
    }
  }, [resume, pause, previous, next]);

  // Fix #2: Resume AudioContext + re-assert playbackRate on mobile visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Resume suspended AudioContext (prevents pitch glitch)
        if (audioContextRef.current?.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }
        // Re-assert playbackRate in case browser reset it
        const audio = audioRef.current;
        if (audio && audio.playbackRate !== playbackRate) {
          audio.playbackRate = playbackRate;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [playbackRate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const value: AudioContextType = {
    currentTrack,
    queue,
    isPlaying,
    volume,
    isMuted,
    progress,
    currentTime,
    duration,
    isLoading,
    shuffle,
    repeat,
    playbackRate,
    analyserNode: analyserRef.current,
    playTrack,
    playTracks,
    togglePlay,
    pause,
    resume,
    next,
    previous,
    seek,
    seekPercent,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setPlaybackRate,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within <AudioProvider>");
  return ctx;
}

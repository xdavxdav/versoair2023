import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import {
  Music,
  Mic2,
  Headphones,
  Radio,
  Disc,
  Sparkles,
  Zap,
  ArrowRight,
  Play,
  Globe,
  Users,
  TrendingUp,
  Award,
  Shield,
  Crown,
  Heart,
  Square,
  Pause,
  Download,
  Upload,
  X,
  Trash2,
  MicOff,
  Minus,
  ChevronUp,
  RotateCcw,
  Volume2,
  SlidersHorizontal,
  ChevronDown,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  User,
  Check,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { validateRegistrationForm } from "@/lib/auth-validation";

// ─── Types ───────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: "note" | "star" | "dot" | "ring";
}

// ─── Particle Field Background ──────────────────────
function ParticleField() {
  // Reduce particles on mobile to prevent Safari crashes
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const count = prefersReduced ? 0 : isMobile ? 6 : 20;

  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 30 + 20,
      delay: Math.random() * 8,
      type: (["note", "star", "dot", "ring"] as const)[
        Math.floor(Math.random() * 4)
      ],
    })),
  );

  if (count === 0) return null;

  const renderParticle = (p: Particle) => {
    const symbols: Record<string, string> = {
      note: "♪",
      star: "✦",
      dot: "●",
      ring: "◎",
    };
    return (
      <motion.div
        key={p.id}
        className="absolute text-white/5 pointer-events-none select-none"
        style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          fontSize: `${p.size * 4}px`,
        }}
        animate={{
          y: [0, -15, 5, -10, 0],
          opacity: [0.03, 0.08, 0.04, 0.06, 0.03],
        }}
        transition={{
          duration: p.duration,
          delay: p.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {symbols[p.type]}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(renderParticle)}
    </div>
  );
}

// ─── Audio Visualizer Bars (driven by external analyser) ─
function AudioVisualizer({
  className = "",
  analyser,
  isLive,
}: {
  className?: string;
  analyser: AnalyserNode | null;
  isLive: boolean;
}) {
  const BAR_COUNT = 32;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const fallbackBars = useRef(
    Array.from({ length: BAR_COUNT }, (_, i) => ({
      height: Math.random() * 60 + 20,
      delay: i * 0.05,
    })),
  );

  // Allocate data array when analyser changes
  useEffect(() => {
    if (analyser) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      dataArrayRef.current = null;
    }
  }, [analyser]);

  // Track visibility — pause rAF loop when off-screen to save mobile GPU/battery
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsCanvasVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!isCanvasVisible) return; // ← skip entirely when off-screen
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    let fallbackPhase = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / BAR_COUNT - 1.5;
      const gap = 1.5;

      for (let i = 0; i < BAR_COUNT; i++) {
        let barHeight: number;

        if (isLive && analyser && dataArrayRef.current) {
          analyser.getByteFrequencyData(dataArrayRef.current);
          const value = dataArrayRef.current[i] || 0;
          barHeight = (value / 255) * h * 0.95;
          barHeight = Math.max(barHeight, 3);
        } else {
          const fb = fallbackBars.current[i];
          const speed = 1.5 + fb.delay * 2;
          const offset = i * 0.35;
          const sin1 = Math.sin(fallbackPhase * speed + offset) * 0.5 + 0.5;
          const sin2 =
            Math.sin(fallbackPhase * speed * 0.7 + offset * 1.3) * 0.5 + 0.5;
          const blend = sin1 * 0.6 + sin2 * 0.4;
          barHeight = blend * h * 0.75 + h * 0.08;
        }

        const x = i * (barWidth + gap);
        const y = h - barHeight;

        const gradient = ctx.createLinearGradient(x, h, x, y);
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.6)");
        gradient.addColorStop(0.5, "rgba(217, 70, 239, 0.4)");
        gradient.addColorStop(1, "rgba(34, 211, 238, 0.2)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      fallbackPhase += 0.02;
      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLive, analyser, isCanvasVisible]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}

// ─── Format seconds to MM:SS ────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── VersaBeat Studio Controller ─────────────────────────
function MiniStudio({
  heroVisible,
  analyserRef,
  setAnalyserLive,
}: {
  heroVisible: boolean;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  setAnalyserLive: (live: boolean) => void;
}) {
  // Audio engine refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const instrumentalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const instrumentalBufferRef = useRef<AudioBuffer | null>(null);
  const instStartTimeRef = useRef<number>(0);
  const instOffsetRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const gainMicRef = useRef<GainNode | null>(null);
  const gainInstRef = useRef<GainNode | null>(null);
  const gainMonitorRef = useRef<GainNode | null>(null);
  const gainInstOutRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FX chain refs
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const eqLowRef = useRef<BiquadFilterNode | null>(null);
  const eqMidRef = useRef<BiquadFilterNode | null>(null);
  const eqHighRef = useRef<BiquadFilterNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const deEsserRef = useRef<BiquadFilterNode | null>(null);
  const noiseGateRef = useRef<GainNode | null>(null);

  // State
  const [micReady, setMicReady] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Volume levels (0-100)
  const [micVol, setMicVol] = useState(80);
  const [instVol, setInstVol] = useState(70);
  const [monitorVol, setMonitorVol] = useState(60);

  // 3-Band EQ (-12 to +12 dB)
  const [eqLow, setEqLow] = useState(0);
  const [eqMidVal, setEqMidVal] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);

  // Effects toggles
  const [compressorOn, setCompressorOn] = useState(true);
  const [reverbOn, setReverbOn] = useState(false);
  const [reverbAmt, setReverbAmt] = useState(25);
  const [deEsserOn, setDeEsserOn] = useState(false);
  const [noiseGateOn, setNoiseGateOn] = useState(false);
  // NEW PRO EFFECTS
  const [limiterOn, setLimiterOn] = useState(false);
  const [delayOn, setDelayOn] = useState(false);
  const [delayTime, setDelayTime] = useState(250); // ms
  const [delayFeedbackAmt, setDelayFeedbackAmt] = useState(30); // %
  const [chorusOn, setChorusOn] = useState(false);
  const [chorusDepth, setChorusDepth] = useState(40); // %
  const [warmthOn, setWarmthOn] = useState(false); // Saturation/Warmth
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [instrumentalName, setInstrumentalName] = useState<string | null>(null);
  const [instrumentalPlaying, setInstrumentalPlaying] = useState(false);
  const [instrumentalPaused, setInstrumentalPaused] = useState(false);
  const [recState, setRecState] = useState<"idle" | "recording" | "paused">(
    "idle",
  );
  const [recTime, setRecTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("verso-recording.webm");
  const [collapsed, setCollapsed] = useState(true); // Start collapsed
  const [isVanishing, setIsVanishing] = useState(false); // Scroll vanish effect
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);

  // ── Allow scrolling even when expanded - user needs to see full content ──
  // No body scroll lock anymore

  // ── Auto-vanish on scroll when content comes into view ──
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollingDown = scrollY > lastScrollY.current;
      lastScrollY.current = scrollY;

      // If scrolling down past 400px and not recording, trigger vanish
      // This gives user time to see full VersaBeat content before it vanishes
      if (
        scrollingDown &&
        scrollY > 400 &&
        recState === "idle" &&
        heroVisible
      ) {
        if (!isVanishing && !collapsed) {
          setIsVanishing(true);
          setTimeout(() => {
            setCollapsed(true);
            setIsVanishing(false);
          }, 300);
        } else if (!isVanishing && collapsed) {
          setIsVanishing(true);
          setTimeout(() => setIsVanishing(false), 400);
        }
      } else if (scrollY < 100) {
        // Reset vanish state when scrolled back to top
        setIsVanishing(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [collapsed, isVanishing, recState, heroVisible]);

  // ── Init / teardown audio context ──
  const ensureAudioCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      let ctx: AudioContext;
      try {
        ctx = new AudioContext();
      } catch {
        // Browser can't create AudioContext (limit reached, unsupported, etc.)
        return null;
      }
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      // Recording destination
      recDestRef.current = ctx.createMediaStreamDestination();
      const dest = ctx.destination;

      // ── Vocal FX chain: source → compressor → eqLow → eqMid → eqHigh → deEsser → noiseGate → dryGain → gainMic
      //                                                                                        └→ reverbGain → gainMic

      // Compressor (vocal dynamics control)
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      compressorRef.current = comp;

      // 3-Band EQ
      const low = ctx.createBiquadFilter();
      low.type = "lowshelf";
      low.frequency.value = 250;
      low.gain.value = 0;
      eqLowRef.current = low;

      const mid = ctx.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 2500;
      mid.Q.value = 1.0;
      mid.gain.value = 0;
      eqMidRef.current = mid;

      const high = ctx.createBiquadFilter();
      high.type = "highshelf";
      high.frequency.value = 6000;
      high.gain.value = 0;
      eqHighRef.current = high;

      // De-esser (tame sibilance ~5-8kHz)
      const deEss = ctx.createBiquadFilter();
      deEss.type = "peaking";
      deEss.frequency.value = 6500;
      deEss.Q.value = 2.0;
      deEss.gain.value = 0; // will be set to -6 when enabled
      deEsserRef.current = deEss;

      // Noise gate (simple gain node, controlled externally)
      const nGate = ctx.createGain();
      nGate.gain.value = 1.0;
      noiseGateRef.current = nGate;

      // Chain: comp → low → mid → high → deEss → nGate
      comp.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(deEss);
      deEss.connect(nGate);

      // Dry path
      const dry = ctx.createGain();
      dry.gain.value = 1.0;
      dryGainRef.current = dry;
      nGate.connect(dry);

      // Reverb path (impulse created from noise)
      const convolver = ctx.createConvolver();
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2; // 2 second reverb tail
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
      }
      convolver.buffer = impulse;
      reverbNodeRef.current = convolver;

      const revGain = ctx.createGain();
      revGain.gain.value = 0; // off by default
      reverbGainRef.current = revGain;
      nGate.connect(convolver);
      convolver.connect(revGain);

      // Mic output gain (both dry + wet merge here)
      gainMicRef.current = ctx.createGain();
      gainMicRef.current.gain.value = 0.8;
      dry.connect(gainMicRef.current);
      revGain.connect(gainMicRef.current);

      gainMicRef.current.connect(analyser);
      gainMicRef.current.connect(recDestRef.current);

      // Mic monitor → speakers (off by default)
      gainMonitorRef.current = ctx.createGain();
      gainMonitorRef.current.gain.value = 0;
      gainMicRef.current.connect(gainMonitorRef.current);
      gainMonitorRef.current.connect(dest);

      // Instrumental gain → analyser + recording
      gainInstRef.current = ctx.createGain();
      gainInstRef.current.gain.value = 0.7;
      gainInstRef.current.connect(analyser);
      gainInstRef.current.connect(recDestRef.current);

      // Instrumental → speakers (always audible)
      gainInstOutRef.current = ctx.createGain();
      gainInstOutRef.current.gain.value = 0.8;
      gainInstRef.current.connect(gainInstOutRef.current);
      gainInstOutRef.current.connect(dest);
    }
    return audioCtxRef.current;
  }, [analyserRef]) as () => AudioContext | null;

  // ── Tear down mic when hero leaves viewport ──
  useEffect(() => {
    if (!heroVisible) {
      try {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        micSourceRef.current?.disconnect();
      } catch {
        /* already disconnected */
      }
      micStreamRef.current = null;
      micSourceRef.current = null;
      setMicReady(false);
      setAnalyserLive(false);
    }
  }, [heroVisible, setAnalyserLive]);

  // ── User-initiated mic request (no auto-prompt) ──
  const requestMic = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicDenied(true);
        return;
      }
      const ctx = ensureAudioCtx();
      if (!ctx) {
        setMicDenied(true);
        return;
      }
      if (ctx.state === "suspended") await ctx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!heroVisible) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      micStreamRef.current = stream;
      const src = ctx.createMediaStreamSource(stream);
      if (compressorRef.current) {
        src.connect(compressorRef.current);
      }
      micSourceRef.current = src;
      setMicReady(true);
      setAnalyserLive(true);
    } catch {
      setMicDenied(true);
    }
  }, [heroVisible, ensureAudioCtx, setAnalyserLive]);

  // ── Toggle mic on/off ──
  const toggleMic = useCallback(() => {
    if (!micReady || !gainMicRef.current) return;
    const next = !micMuted;
    setMicMuted(next);
    // Ramp the gain to avoid clicks
    const now = audioCtxRef.current?.currentTime ?? 0;
    gainMicRef.current.gain.cancelScheduledValues(now);
    gainMicRef.current.gain.setValueAtTime(gainMicRef.current.gain.value, now);
    gainMicRef.current.gain.linearRampToValueAtTime(next ? 0 : 1.0, now + 0.05);
  }, [micReady, micMuted]);

  // ── Toggle voice monitoring (hear yourself) ──
  const toggleMonitoring = useCallback(() => {
    if (!gainMonitorRef.current || !audioCtxRef.current) return;
    const next = !monitoring;
    setMonitoring(next);
    const now = audioCtxRef.current.currentTime;
    gainMonitorRef.current.gain.cancelScheduledValues(now);
    gainMonitorRef.current.gain.setValueAtTime(
      gainMonitorRef.current.gain.value,
      now,
    );
    gainMonitorRef.current.gain.linearRampToValueAtTime(
      next ? 0.8 : 0,
      now + 0.05,
    );
  }, [monitoring]);

  // ── Volume controls ──
  const setMicVolume = useCallback((v: number) => {
    setMicVol(v);
    if (gainMicRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      gainMicRef.current.gain.setValueAtTime(
        gainMicRef.current.gain.value,
        now,
      );
      gainMicRef.current.gain.linearRampToValueAtTime(v / 100, now + 0.03);
    }
  }, []);

  const setInstVolume = useCallback((v: number) => {
    setInstVol(v);
    if (gainInstRef.current && gainInstOutRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      const val = v / 100;
      gainInstRef.current.gain.setValueAtTime(
        gainInstRef.current.gain.value,
        now,
      );
      gainInstRef.current.gain.linearRampToValueAtTime(val, now + 0.03);
      gainInstOutRef.current.gain.setValueAtTime(
        gainInstOutRef.current.gain.value,
        now,
      );
      gainInstOutRef.current.gain.linearRampToValueAtTime(val, now + 0.03);
    }
  }, []);

  const setMonitorVolume = useCallback(
    (v: number) => {
      setMonitorVol(v);
      if (gainMonitorRef.current && audioCtxRef.current && monitoring) {
        const now = audioCtxRef.current.currentTime;
        gainMonitorRef.current.gain.setValueAtTime(
          gainMonitorRef.current.gain.value,
          now,
        );
        gainMonitorRef.current.gain.linearRampToValueAtTime(
          v / 100,
          now + 0.03,
        );
      }
    },
    [monitoring],
  );

  // ── EQ controls ──
  const updateEq = useCallback((band: "low" | "mid" | "high", val: number) => {
    if (band === "low") {
      setEqLow(val);
      if (eqLowRef.current) eqLowRef.current.gain.value = val;
    }
    if (band === "mid") {
      setEqMidVal(val);
      if (eqMidRef.current) eqMidRef.current.gain.value = val;
    }
    if (band === "high") {
      setEqHigh(val);
      if (eqHighRef.current) eqHighRef.current.gain.value = val;
    }
  }, []);

  // ── Effect toggles ──
  const toggleCompressor = useCallback(() => {
    if (!compressorRef.current || !audioCtxRef.current) return;
    const next = !compressorOn;
    setCompressorOn(next);
    // Bypass by setting ratio to 1 (pass-through)
    compressorRef.current.ratio.value = next ? 4 : 1;
    compressorRef.current.threshold.value = next ? -24 : 0;
  }, [compressorOn]);

  const toggleReverb = useCallback(() => {
    const next = !reverbOn;
    setReverbOn(next);
    if (reverbGainRef.current && dryGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      const wet = next ? reverbAmt / 100 : 0;
      reverbGainRef.current.gain.setValueAtTime(
        reverbGainRef.current.gain.value,
        now,
      );
      reverbGainRef.current.gain.linearRampToValueAtTime(wet, now + 0.05);
    }
  }, [reverbOn, reverbAmt]);

  const setReverbAmount = useCallback(
    (v: number) => {
      setReverbAmt(v);
      if (reverbGainRef.current && reverbOn && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        reverbGainRef.current.gain.setValueAtTime(
          reverbGainRef.current.gain.value,
          now,
        );
        reverbGainRef.current.gain.linearRampToValueAtTime(v / 100, now + 0.03);
      }
    },
    [reverbOn],
  );

  const toggleDeEsser = useCallback(() => {
    const next = !deEsserOn;
    setDeEsserOn(next);
    if (deEsserRef.current) {
      deEsserRef.current.gain.value = next ? -8 : 0;
    }
  }, [deEsserOn]);

  const toggleNoiseGate = useCallback(() => {
    const next = !noiseGateOn;
    setNoiseGateOn(next);
    // Simple approach: when enabled, use a very low threshold via gain
    // In practice we'd need an analyser-based gate, but for UX we lower gain on silence
    if (noiseGateRef.current) {
      noiseGateRef.current.gain.value = next ? 0.92 : 1.0;
    }
  }, [noiseGateOn]);

  // NEW PRO EFFECT TOGGLES
  const toggleLimiter = useCallback(() => {
    setLimiterOn((prev) => !prev);
    setActivePreset(null);
  }, []);

  const toggleDelay = useCallback(() => {
    setDelayOn((prev) => !prev);
    setActivePreset(null);
  }, []);

  const toggleChorus = useCallback(() => {
    setChorusOn((prev) => !prev);
    setActivePreset(null);
  }, []);

  const toggleWarmth = useCallback(() => {
    setWarmthOn((prev) => !prev);
    setActivePreset(null);
  }, []);

  // PRESET SYSTEM
  const applyPreset = useCallback((preset: string) => {
    setActivePreset(preset);
    switch (preset) {
      case "vocal-clean":
        setCompressorOn(true);
        setDeEsserOn(true);
        setNoiseGateOn(true);
        setReverbOn(false);
        setLimiterOn(true);
        setDelayOn(false);
        setChorusOn(false);
        setWarmthOn(false);
        setEqLow(-2);
        setEqMidVal(3);
        setEqHigh(2);
        break;
      case "vocal-warm":
        setCompressorOn(true);
        setDeEsserOn(true);
        setNoiseGateOn(false);
        setReverbOn(true);
        setReverbAmt(20);
        setLimiterOn(true);
        setDelayOn(false);
        setChorusOn(false);
        setWarmthOn(true);
        setEqLow(3);
        setEqMidVal(1);
        setEqHigh(-1);
        break;
      case "vocal-bright":
        setCompressorOn(true);
        setDeEsserOn(false);
        setNoiseGateOn(true);
        setReverbOn(true);
        setReverbAmt(15);
        setLimiterOn(true);
        setDelayOn(false);
        setChorusOn(false);
        setWarmthOn(false);
        setEqLow(-1);
        setEqMidVal(2);
        setEqHigh(5);
        break;
      case "fx-creative":
        setCompressorOn(true);
        setDeEsserOn(false);
        setNoiseGateOn(false);
        setReverbOn(true);
        setReverbAmt(45);
        setLimiterOn(false);
        setDelayOn(true);
        setDelayTime(350);
        setDelayFeedbackAmt(40);
        setChorusOn(true);
        setChorusDepth(60);
        setWarmthOn(true);
        break;
      default:
        break;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      instrumentalSourceRef.current?.stop();
      audioCtxRef.current?.close().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load instrumental file ──
  const handleInstrumentalUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ctx = ensureAudioCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      instrumentalBufferRef.current = audioBuffer;
      setInstrumentalName(file.name);
      setInstrumentalPlaying(false);
    },
    [ensureAudioCtx],
  );

  const playInstrumental = useCallback(
    (fromOffset?: number) => {
      if (!instrumentalBufferRef.current || !audioCtxRef.current) return;
      // Stop previous source node if any
      try {
        instrumentalSourceRef.current?.stop();
      } catch {
        /* already stopped */
      }

      const ctx = audioCtxRef.current;
      const source = ctx.createBufferSource();
      source.buffer = instrumentalBufferRef.current;
      source.connect(gainInstRef.current!);

      const offset = fromOffset ?? instOffsetRef.current;
      source.onended = () => {
        // Only mark as stopped if it wasn't paused (natural end)
        if (instrumentalSourceRef.current === source) {
          setInstrumentalPlaying(false);
          setInstrumentalPaused(false);
          instOffsetRef.current = 0;
        }
      };
      source.start(0, offset);
      instStartTimeRef.current = ctx.currentTime - offset;
      instrumentalSourceRef.current = source;
      setInstrumentalPlaying(true);
      setInstrumentalPaused(false);
      setAnalyserLive(true);
    },
    [setAnalyserLive],
  );

  const pauseInstrumental = useCallback(() => {
    if (!instrumentalSourceRef.current || !audioCtxRef.current) return;
    // Save current playback position
    const elapsed = audioCtxRef.current.currentTime - instStartTimeRef.current;
    const duration = instrumentalBufferRef.current?.duration ?? Infinity;
    instOffsetRef.current = elapsed % duration;
    try {
      instrumentalSourceRef.current.stop();
    } catch {
      /* ok */
    }
    instrumentalSourceRef.current = null;
    setInstrumentalPlaying(false);
    setInstrumentalPaused(true);
  }, []);

  const resumeInstrumental = useCallback(() => {
    playInstrumental(instOffsetRef.current);
  }, [playInstrumental]);

  const stopInstrumental = useCallback(() => {
    try {
      instrumentalSourceRef.current?.stop();
    } catch {
      /* ok */
    }
    instrumentalSourceRef.current = null;
    instOffsetRef.current = 0;
    setInstrumentalPlaying(false);
    setInstrumentalPaused(false);
  }, []);

  const removeInstrumental = useCallback(() => {
    stopInstrumental();
    instrumentalBufferRef.current = null;
    setInstrumentalName(null);
  }, [stopInstrumental]);

  // ── Pick a supported recording mimeType ──
  const getRecordingMime = useCallback((): {
    mimeType: string;
    ext: string;
  } => {
    const candidates = [
      { mimeType: "audio/webm;codecs=opus", ext: "webm" },
      { mimeType: "audio/webm", ext: "webm" },
      { mimeType: "audio/ogg;codecs=opus", ext: "ogg" },
      { mimeType: "audio/mp4", ext: "m4a" },
      { mimeType: "", ext: "webm" }, // browser default fallback
    ];
    for (const c of candidates) {
      if (!c.mimeType || MediaRecorder.isTypeSupported(c.mimeType)) return c;
    }
    return candidates[candidates.length - 1];
  }, []);

  // ── Recording controls ──
  const startRecording = useCallback(() => {
    if (!recDestRef.current) {
      const ctx = ensureAudioCtx();
      if (!ctx) return;
    }
    if (!recDestRef.current) return;

    // Revoke previous download
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    // Start countdown: 3... 2... 1...
    setCountdown(3);
    let count = 3;
    countdownTimerRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        // Countdown finished - start recording!
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setCountdown(null);

        // Auto-start instrumental if loaded and not playing
        if (instrumentalBufferRef.current && !instrumentalPlaying) {
          playInstrumental(0);
        }

        const { mimeType, ext } = getRecordingMime();
        recordedChunksRef.current = [];

        const options: MediaRecorderOptions = {};
        if (mimeType) options.mimeType = mimeType;

        const mr = new MediaRecorder(recDestRef.current!.stream, options);
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        mr.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: mimeType || "audio/webm",
          });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setDownloadName(
            `verso-recording-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")}.${ext}`,
          );
          // Auto-expand panel so user sees the result
          setCollapsed(false);
        };
        mr.start(250); // collect in 250ms chunks
        mediaRecorderRef.current = mr;
        setRecState("recording");
        setRecTime(0);

        timerRef.current = setInterval(() => {
          setRecTime((t) => t + 1);
        }, 1000);
      }
    }, 1000);
  }, [
    ensureAudioCtx,
    downloadUrl,
    getRecordingMime,
    instrumentalBufferRef,
    instrumentalPlaying,
    playInstrumental,
  ]);

  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setRecState("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setRecState("recording");
      timerRef.current = setInterval(() => {
        setRecTime((t) => t + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Clear countdown if active
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      setCountdown(null);
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setRecState("idle");
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop instrumental when recording stops
    if (instrumentalPlaying) {
      stopInstrumental();
    }
  }, [instrumentalPlaying, stopInstrumental]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!heroVisible) return; // Only active when VersaBeat studio is visible

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space bar: Start/Pause recording
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (recState === "idle" && (micReady || instrumentalName)) {
          startRecording();
        } else if (recState === "recording") {
          pauseRecording();
        } else if (recState === "paused") {
          resumeRecording();
        }
      }

      // Escape: Stop recording
      if (e.code === "Escape" && recState !== "idle") {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    heroVisible,
    recState,
    micReady,
    instrumentalName,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  ]);

  // Don't render if hero not visible
  if (!heroVisible) return null;

  const isRecording = recState === "recording";
  const isPaused = recState === "paused";

  return (
    <>
      {/* Greyout overlay when MiniStudio is expanded */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="fixed inset-0 z-[49] bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`fixed top-28 z-[60] transition-all duration-300 ${
          collapsed ? "right-4 left-auto" : "left-4 right-4"
        } ${isVanishing ? "pointer-events-none" : ""}`}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{
          opacity: isVanishing ? 0 : 1,
          y: isVanishing ? -30 : 0,
          scale: isVanishing ? 0.9 : 1,
        }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          duration: isVanishing ? 0.35 : 0.4,
          delay: isVanishing ? 0 : 1.6,
          ease: "easeOut",
        }}
      >
        <div
          className={`bg-[#0a0514]/95 backdrop-blur-xl border border-white/[0.08] transition-all duration-300 ${
            collapsed
              ? "py-1 px-2 sm:px-3 rounded-xl inline-flex"
              : "px-3 sm:px-4 py-3 sm:py-4 rounded-xl max-h-[80vh] overflow-y-auto"
          }`}
        >
          <div className="max-w-7xl mx-auto">
            {/* Header — always visible, full width horizontal layout */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-violet-600/60 to-fuchsia-600/60 flex items-center justify-center ring-1 ring-purple-400/20 shadow-lg shadow-purple-500/20">
                  <Mic2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-100" />
                </div>
                <div className="hidden xs:flex flex-col items-start">
                  <span className="text-[10px] sm:text-xs font-black tracking-wide bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                    VersaBeat
                  </span>
                  <span className="text-fuchsia-400/50 text-[7px] sm:text-[8px] tracking-widest uppercase">
                    Pro Studio
                  </span>
                </div>
              </button>

              {/* Status + controls row */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
                {/* Compact status indicators */}
                {isRecording && (
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
                {isPaused && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
                {micReady && recState === "idle" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
                {instrumentalPlaying && (
                  <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                )}

                {/* Mic on/off toggle — first click requests permission */}
                <button
                  onClick={
                    micReady ? toggleMic : micDenied ? undefined : requestMic
                  }
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-colors border ${
                    micDenied
                      ? "border-red-500/20 opacity-40 cursor-not-allowed"
                      : !micReady
                        ? "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer"
                        : micMuted
                          ? "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                          : "border-emerald-500/25 bg-emerald-500/15 hover:bg-emerald-500/25"
                  }`}
                  title={
                    micDenied
                      ? "Micro indisponible"
                      : !micReady
                        ? "Cliquez pour activer le micro"
                        : micMuted
                          ? "Activer le micro"
                          : "Désactiver le micro"
                  }
                >
                  {micReady && !micMuted ? (
                    <Mic2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  ) : (
                    <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/40" />
                  )}
                </button>

                {/* Voice monitoring toggle */}
                <button
                  onClick={
                    micReady
                      ? toggleMonitoring
                      : micDenied
                        ? undefined
                        : requestMic
                  }
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-colors border ${
                    !micReady
                      ? "border-white/[0.06] opacity-30 cursor-default"
                      : monitoring
                        ? "border-cyan-500/25 bg-cyan-500/15 hover:bg-cyan-500/25"
                        : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                  title={
                    !micReady
                      ? "Retour audio indisponible"
                      : monitoring
                        ? "Désactiver le retour voix"
                        : "Écouter votre voix"
                  }
                >
                  <Headphones
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                      micReady && monitoring ? "text-cyan-400" : "text-white/30"
                    }`}
                  />
                </button>

                {/* Settings toggle */}
                <button
                  onClick={() => {
                    setShowSettings((s) => !s);
                    if (collapsed) setCollapsed(false);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors border ${
                    showSettings
                      ? "border-purple-500/25 bg-purple-500/15 hover:bg-purple-500/25"
                      : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                  title="Mixeur & Effets"
                >
                  <SlidersHorizontal
                    className={`w-3.5 h-3.5 ${
                      showSettings ? "text-purple-400" : "text-white/30"
                    }`}
                  />
                </button>

                {/* Collapse / expand toggle */}
                <button
                  onClick={() => setCollapsed((c) => !c)}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/[0.06] transition-colors"
                >
                  {collapsed ? (
                    <ChevronUp className="w-3 h-3 text-white/30" />
                  ) : (
                    <Minus className="w-3 h-3 text-white/30" />
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible body */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {/* PRESET BAR */}
                  <div className="pt-3 pb-2 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium mr-1">
                        Presets
                      </span>
                      {[
                        { id: "vocal-clean", label: "Clean", icon: "🎙️" },
                        { id: "vocal-warm", label: "Warm", icon: "🔥" },
                        { id: "vocal-bright", label: "Bright", icon: "✨" },
                        { id: "fx-creative", label: "Creative FX", icon: "🎨" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            activePreset === preset.id
                              ? "bg-purple-500/25 text-purple-300 ring-1 ring-purple-500/30"
                              : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60"
                          }`}
                        >
                          <span className="mr-1">{preset.icon}</span>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* ── Column 1: Instrumental & Recording ── */}
                    <div className="space-y-3">
                      {/* Instrumental Upload */}
                      <div className="space-y-1.5">
                        {instrumentalName ? (
                          <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg p-2 border border-white/[0.05]">
                            <Music className="w-3.5 h-3.5 text-fuchsia-400/60 flex-shrink-0" />
                            <span className="text-white/40 text-[10px] truncate flex-1">
                              {instrumentalName}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Play / Pause */}
                              {instrumentalPlaying ? (
                                <button
                                  onClick={pauseInstrumental}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                                  title="Pause"
                                >
                                  <Pause className="w-2.5 h-2.5 text-white/50" />
                                </button>
                              ) : (
                                <button
                                  onClick={
                                    instrumentalPaused
                                      ? resumeInstrumental
                                      : () => playInstrumental(0)
                                  }
                                  className="w-5 h-5 rounded flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                                  title={
                                    instrumentalPaused ? "Reprendre" : "Lire"
                                  }
                                >
                                  <Play
                                    className="w-2.5 h-2.5 text-white/50"
                                    fill="currentColor"
                                  />
                                </button>
                              )}
                              {/* Stop (reset to beginning) */}
                              {(instrumentalPlaying || instrumentalPaused) && (
                                <button
                                  onClick={stopInstrumental}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                                  title="Arrêter"
                                >
                                  <Square className="w-2.5 h-2.5 text-white/50" />
                                </button>
                              )}
                              {/* Remove */}
                              <button
                                onClick={removeInstrumental}
                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                              >
                                <X className="w-2.5 h-2.5 text-white/30 hover:text-red-400" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer bg-white/[0.03] hover:bg-white/[0.05] rounded-lg p-2 border border-dashed border-white/[0.08] transition-colors">
                            <Upload className="w-3.5 h-3.5 text-white/20" />
                            <span className="text-white/25 text-[10px]">
                              Déposer un instrumental (.mp3, .wav)
                            </span>
                            <input
                              type="file"
                              accept=".mp3,.wav,.flac,.aiff,.ogg,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/aiff,audio/x-aiff,audio/ogg,audio/mp4,audio/x-m4a"
                              className="hidden"
                              onChange={handleInstrumentalUpload}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* ── Column 2: Settings Panel (Mixer, EQ & Effects) ── */}
                    <div className="space-y-3">
                      <div className="space-y-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5">
                        {/* Volume Sliders */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">
                            Mixeur
                          </span>

                          {/* Mic Volume */}
                          <div className="flex items-center gap-2">
                            <Mic2 className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={micVol}
                              onChange={(e) =>
                                setMicVolume(Number(e.target.value))
                              }
                              className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-emerald-500 cursor-pointer [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:appearance-none"
                            />
                            <span className="text-[9px] text-white/25 w-6 text-right font-mono">
                              {micVol}
                            </span>
                          </div>

                          {/* Instrumental Volume */}
                          <div className="flex items-center gap-2">
                            <Music className="w-3 h-3 text-fuchsia-400/60 flex-shrink-0" />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={instVol}
                              onChange={(e) =>
                                setInstVolume(Number(e.target.value))
                              }
                              className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-fuchsia-500 cursor-pointer [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fuchsia-400 [&::-webkit-slider-thumb]:appearance-none"
                            />
                            <span className="text-[9px] text-white/25 w-6 text-right font-mono">
                              {instVol}
                            </span>
                          </div>

                          {/* Monitor Volume */}
                          <div className="flex items-center gap-2">
                            <Headphones className="w-3 h-3 text-cyan-400/60 flex-shrink-0" />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={monitorVol}
                              onChange={(e) =>
                                setMonitorVolume(Number(e.target.value))
                              }
                              className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-cyan-500 cursor-pointer [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:appearance-none"
                              disabled={!monitoring}
                            />
                            <span
                              className={`text-[9px] w-6 text-right font-mono ${monitoring ? "text-white/25" : "text-white/10"}`}
                            >
                              {monitorVol}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.05]" />

                        {/* 3-Band EQ */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">
                            EQ
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Low */}
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="range"
                                min={-12}
                                max={12}
                                value={eqLow}
                                step={1}
                                onChange={(e) =>
                                  updateEq("low", Number(e.target.value))
                                }
                                className="w-full h-1 rounded-full appearance-none bg-white/10 accent-amber-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:appearance-none"
                              />
                              <div className="text-center">
                                <span className="text-[8px] text-white/20 block">
                                  Bas
                                </span>
                                <span className="text-[9px] text-white/30 font-mono">
                                  {eqLow > 0 ? "+" : ""}
                                  {eqLow}
                                </span>
                              </div>
                            </div>
                            {/* Mid */}
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="range"
                                min={-12}
                                max={12}
                                value={eqMidVal}
                                step={1}
                                onChange={(e) =>
                                  updateEq("mid", Number(e.target.value))
                                }
                                className="w-full h-1 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:appearance-none"
                              />
                              <div className="text-center">
                                <span className="text-[8px] text-white/20 block">
                                  Médium
                                </span>
                                <span className="text-[9px] text-white/30 font-mono">
                                  {eqMidVal > 0 ? "+" : ""}
                                  {eqMidVal}
                                </span>
                              </div>
                            </div>
                            {/* High */}
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="range"
                                min={-12}
                                max={12}
                                value={eqHigh}
                                step={1}
                                onChange={(e) =>
                                  updateEq("high", Number(e.target.value))
                                }
                                className="w-full h-1 rounded-full appearance-none bg-white/10 accent-cyan-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:appearance-none"
                              />
                              <div className="text-center">
                                <span className="text-[8px] text-white/20 block">
                                  Haut
                                </span>
                                <span className="text-[9px] text-white/30 font-mono">
                                  {eqHigh > 0 ? "+" : ""}
                                  {eqHigh}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.05]" />

                        {/* Vocal Effects */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">
                            Effets Vocaux
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {/* Compressor */}
                            <button
                              onClick={toggleCompressor}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                compressorOn
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${compressorOn ? "bg-emerald-400" : "bg-white/15"}`}
                              />
                              Compresseur
                            </button>

                            {/* De-esser */}
                            <button
                              onClick={toggleDeEsser}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                deEsserOn
                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${deEsserOn ? "bg-amber-400" : "bg-white/15"}`}
                              />
                              Dé-esseur
                            </button>

                            {/* Noise Gate */}
                            <button
                              onClick={toggleNoiseGate}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                noiseGateOn
                                  ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${noiseGateOn ? "bg-cyan-400" : "bg-white/15"}`}
                              />
                              Gate
                            </button>

                            {/* Reverb toggle */}
                            <button
                              onClick={toggleReverb}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                reverbOn
                                  ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${reverbOn ? "bg-purple-400" : "bg-white/15"}`}
                              />
                              Réverb
                            </button>
                          </div>

                          {/* Reverb amount slider (when on) */}
                          {reverbOn && (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[8px] text-purple-400/40 uppercase">
                                Wet
                              </span>
                              <input
                                type="range"
                                min={5}
                                max={80}
                                value={reverbAmt}
                                onChange={(e) =>
                                  setReverbAmount(Number(e.target.value))
                                }
                                className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:appearance-none"
                              />
                              <span className="text-[9px] text-white/20 w-6 text-right font-mono">
                                {reverbAmt}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.05]" />

                        {/* PRO EFFECTS SECTION */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium flex items-center gap-1.5">
                            <span className="px-1 py-0.5 text-[7px] font-bold tracking-wider rounded bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300">
                              PRO
                            </span>
                            Effets Studio
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {/* Limiter */}
                            <button
                              onClick={toggleLimiter}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                limiterOn
                                  ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${limiterOn ? "bg-rose-400" : "bg-white/15"}`}
                              />
                              Limiteur
                            </button>

                            {/* Warmth / Saturation */}
                            <button
                              onClick={toggleWarmth}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                warmthOn
                                  ? "border-orange-500/20 bg-orange-500/10 text-orange-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${warmthOn ? "bg-orange-400" : "bg-white/15"}`}
                              />
                              Warmth
                            </button>

                            {/* Delay */}
                            <button
                              onClick={toggleDelay}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                delayOn
                                  ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${delayOn ? "bg-blue-400" : "bg-white/15"}`}
                              />
                              Delay
                            </button>

                            {/* Chorus */}
                            <button
                              onClick={toggleChorus}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                                chorusOn
                                  ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${chorusOn ? "bg-indigo-400" : "bg-white/15"}`}
                              />
                              Chorus
                            </button>
                          </div>

                          {/* Delay controls */}
                          {delayOn && (
                            <div className="space-y-1.5 pl-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-blue-400/40 uppercase w-10">
                                  Time
                                </span>
                                <input
                                  type="range"
                                  min={50}
                                  max={800}
                                  value={delayTime}
                                  onChange={(e) =>
                                    setDelayTime(Number(e.target.value))
                                  }
                                  className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-blue-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:appearance-none"
                                />
                                <span className="text-[9px] text-white/20 w-10 text-right font-mono">
                                  {delayTime}ms
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-blue-400/40 uppercase w-10">
                                  Feed
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={80}
                                  value={delayFeedbackAmt}
                                  onChange={(e) =>
                                    setDelayFeedbackAmt(Number(e.target.value))
                                  }
                                  className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-blue-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:appearance-none"
                                />
                                <span className="text-[9px] text-white/20 w-10 text-right font-mono">
                                  {delayFeedbackAmt}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Chorus depth */}
                          {chorusOn && (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[8px] text-indigo-400/40 uppercase w-10">
                                Depth
                              </span>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                value={chorusDepth}
                                onChange={(e) =>
                                  setChorusDepth(Number(e.target.value))
                                }
                                className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-indigo-500 cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:appearance-none"
                              />
                              <span className="text-[9px] text-white/20 w-10 text-right font-mono">
                                {chorusDepth}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Column 3: Recording & Playback ── */}
                    <div className="space-y-3">
                      {/* Recording Controls */}
                      <div className="flex items-center gap-2">
                        {countdown !== null ? (
                          <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/20 border border-amber-500/20">
                            <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center animate-pulse">
                              <span className="text-amber-300 text-lg font-bold">
                                {countdown}
                              </span>
                            </div>
                            <span className="text-amber-300 text-[11px] font-medium">
                              Préparez-vous...
                            </span>
                          </div>
                        ) : recState === "idle" ? (
                          <button
                            onClick={startRecording}
                            disabled={!micReady && !instrumentalName}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Enregistrer{" "}
                            <span className="text-red-300/50 text-[9px]">
                              (Espace)
                            </span>
                          </button>
                        ) : (
                          <>
                            {/* Pause / Resume */}
                            {isRecording ? (
                              <button
                                onClick={pauseRecording}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/15 text-amber-400 text-[11px] font-medium transition-colors"
                              >
                                <Pause className="w-3 h-3" />
                                Pause{" "}
                                <span className="text-amber-300/40 text-[9px]">
                                  (Espace)
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={resumeRecording}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/15 text-emerald-400 text-[11px] font-medium transition-colors"
                              >
                                <Play className="w-3 h-3" fill="currentColor" />
                                Reprendre{" "}
                                <span className="text-emerald-300/40 text-[9px]">
                                  (Espace)
                                </span>
                              </button>
                            )}
                            {/* Stop */}
                            <button
                              onClick={stopRecording}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] text-white/50 text-[11px] font-medium transition-colors"
                            >
                              <Square className="w-3 h-3" />
                              Arrêter{" "}
                              <span className="text-white/30 text-[9px]">
                                (Échap)
                              </span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Timer (when recording/paused) */}
                      {recState !== "idle" && (
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-amber-400"}`}
                          />
                          <span className="text-white/40 text-xs font-mono tracking-wider">
                            {formatTime(recTime)}
                          </span>
                          {isPaused && (
                            <span className="text-amber-400/50 text-[9px] uppercase">
                              En pause
                            </span>
                          )}
                        </div>
                      )}

                      {/* Post-recording: playback + download + new */}
                      <AnimatePresence>
                        {downloadUrl && recState === "idle" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 rounded-xl bg-purple-500/[0.07] border border-purple-500/15 p-2.5">
                              {/* Playback label */}
                              <div className="flex items-center gap-1.5 px-0.5">
                                <Volume2 className="w-3 h-3 text-purple-400/60" />
                                <span className="text-[9px] text-purple-300/50 uppercase tracking-wider font-medium">
                                  Enregistrement — {formatTime(recTime)}
                                </span>
                              </div>

                              {/* Audio player */}
                              <audio
                                src={downloadUrl}
                                controls
                                controlsList="noplaybackrate"
                                className="w-full h-8 rounded-md [&::-webkit-media-controls-panel]:bg-white/[0.06] [&::-webkit-media-controls-panel]:rounded-md"
                                style={{
                                  filter: "invert(0.85) hue-rotate(180deg)",
                                }}
                              />

                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={downloadUrl}
                                  download={downloadName}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 text-[11px] font-medium transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  Sauvegarder
                                </a>
                                <button
                                  onClick={() => {
                                    URL.revokeObjectURL(downloadUrl);
                                    setDownloadUrl(null);
                                    setRecTime(0);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-white/40 text-[11px] font-medium transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Nouveau
                                </button>
                                <button
                                  onClick={() => {
                                    URL.revokeObjectURL(downloadUrl);
                                    setDownloadUrl(null);
                                    setRecTime(0);
                                  }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors"
                                  title="Supprimer l'enregistrement"
                                >
                                  <Trash2 className="w-3 h-3 text-white/20 hover:text-red-400" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Versabit Pro Upsell - Sticky at bottom */}
                  <div className="pt-3 mt-3 border-t border-white/[0.06] bg-[#0a0514]/95 sticky bottom-0">
                    <div className="flex items-center justify-between gap-4">
                      {/* Active Effects Counter */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 uppercase">
                          Actifs:
                        </span>
                        <div className="flex items-center gap-1">
                          {[
                            { on: compressorOn, color: "emerald" },
                            { on: deEsserOn, color: "amber" },
                            { on: noiseGateOn, color: "cyan" },
                            { on: reverbOn, color: "purple" },
                            { on: limiterOn, color: "rose" },
                            { on: warmthOn, color: "orange" },
                            { on: delayOn, color: "blue" },
                            { on: chorusOn, color: "indigo" },
                          ]
                            .filter((e) => e.on)
                            .map((effect, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full bg-${effect.color}-400`}
                              />
                            ))}
                          {![
                            compressorOn,
                            deEsserOn,
                            noiseGateOn,
                            reverbOn,
                            limiterOn,
                            warmthOn,
                            delayOn,
                            chorusOn,
                          ].some(Boolean) && (
                            <span className="text-[9px] text-white/20">
                              Aucun
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Studio Pro Link - More prominent */}
                      <a
                        href="/music/studio"
                        className="group flex items-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border border-violet-500/30 hover:border-fuchsia-400/50 hover:from-violet-600/40 hover:to-fuchsia-600/40 transition-all duration-300 shadow-lg shadow-purple-500/10"
                      >
                        <span className="text-xs font-semibold text-violet-200 group-hover:text-fuchsia-100">
                          VersaBeat Full Studio
                        </span>
                        <span className="px-2 py-0.5 text-[8px] font-black tracking-wider rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white uppercase">
                          PRO
                        </span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Portal Gateway ────────────────────────────
function PortalGateway({
  isOpen,
  onEnter,
}: {
  isOpen: boolean;
  onEnter: () => void;
}) {
  return (
    <motion.div
      className="relative flex items-center justify-center cursor-pointer"
      onClick={onEnter}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Subtle outer ring */}
      <motion.div
        className="absolute w-48 h-48 md:w-60 md:h-60 rounded-full border border-purple-500/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute w-40 h-40 md:w-52 md:h-52 rounded-full border border-white/[0.04]" />

      {/* Core */}
      <div
        className="relative w-32 h-32 md:w-44 md:h-44 rounded-full flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(139,92,246,0.05) 60%, transparent 80%)",
          boxShadow: "0 0 40px rgba(168,85,247,0.12)",
        }}
      >
        <motion.div
          className="text-center z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <Play
            className="w-9 h-9 md:w-12 md:h-12 text-white/70 mx-auto mb-1"
            fill="currentColor"
          />
          <span className="text-white/40 text-xs font-light tracking-widest uppercase">
            Entrer
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Floating Icon ──────────────────────────────────
function FloatingIcon({
  icon: Icon,
  x,
  y,
  delay,
  size = 24,
}: {
  icon: any;
  x: string;
  y: string;
  delay: number;
  size?: number;
}) {
  return (
    <motion.div
      className="absolute text-white/5 pointer-events-none"
      style={{ left: x, top: y }}
      animate={{
        y: [0, -10, 0],
        opacity: [0.03, 0.07, 0.03],
      }}
      transition={{
        duration: 10 + Math.random() * 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Icon size={size} />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Welcome Page Component
// ═══════════════════════════════════════════════════════
export default function ArtistPortalWelcome() {
  const [phase, setPhase] = useState<"intro" | "reveal" | "ready">("intro");
  const containerRef = useRef<HTMLDivElement>(null);

  const [, navigate] = useLocation();

  // ── Auth context: call login() after sign-in/register so React state updates ──
  const { login, user } = useAuthContext();

  // ── Auto-redirect: if already has artist portal access, go straight to dashboard ──
  const { canAccessArtist, isLoading: portalLoading } = usePortalAccess();

  useEffect(() => {
    if (portalLoading) return; // Wait for portal access check to finish

    if (canAccessArtist) {
      navigate("/music/dashboard");
    }
  }, [canAccessArtist, portalLoading, navigate]);

  // Shared audio state — connects MiniStudio engine → AudioVisualizer display
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const [analyserLive, setAnalyserLive] = useState(false);

  // Intersection-based hero visibility for mic lifecycle
  const heroSectionRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const el = heroSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-advance intro phases
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 1800);
    const t2 = setTimeout(() => setPhase("ready"), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // ── Auth form state (inline sign-in / apply) ──
  type AuthTab = "signin" | "apply";
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [applyStep, setApplyStep] = useState(1);

  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Detect if user is entering an artist code (starts with VA_ or VA-)
  const isArtistCodeInput = /^VA[_-]/i.test(signInForm.email.trim());

  const [applyForm, setApplyForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    stageName: "",
    legalName: "",
    genre: "",
    artistRole: "",
    country: "",
    bio: "",
    spotifyUrl: "",
    instagramHandle: "",
    motivation: "",
    monthlyListeners: "",
    yearsActive: "",
    sampleTrackUrl: "",
    websiteUrl: "",
    agreeTerms: false,
  });

  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionArtist, setTransitionArtist] = useState("");

  const genres = [
    "Afrobeats",
    "R&B",
    "Hip-Hop",
    "Pop",
    "Jazz",
    "Soul",
    "Reggae",
    "Dancehall",
    "Electronic",
    "Rock",
    "Classical",
    "Gospel",
    "Country",
    "Latin",
    "Indie",
    "Other",
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const isCodeLogin = /^VA[_-]/i.test(signInForm.email.trim());
      const res = await fetch("/auth/artist/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          isCodeLogin
            ? { artistCode: signInForm.email.trim() }
            : { email: signInForm.email, password: signInForm.password },
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(
          data.message || "Échec de connexion. Vérifiez vos identifiants.",
        );
        setIsAuthLoading(false);
        return;
      }
      // Store artist data for portal usage
      localStorage.setItem("artist_token", data.token);
      localStorage.setItem("artist_profile", JSON.stringify(data.user));
      // Also store in main auth keys so all portals recognize the session
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      // Set in-memory auth token so dashboard's checkAuth() finds it
      if (data.token) {
        const { setAuthToken } = await import("@/lib/auth");
        setAuthToken(data.token);
      }
      // Update AuthContext React state so useRequirePortal sees the user
      if (data.token && data.user) {
        login(data.token, data.user);
      }
      setIsAuthLoading(false);
      // Trigger cinematic transition instead of abrupt navigate
      setTransitionArtist(
        data.user?.stageName ||
          data.user?.name ||
          signInForm.email.split("@")[0],
      );
      setTransitioning(true);
      setTimeout(() => navigate("/music/dashboard"), 400);
    } catch (err: any) {
      setAuthError(err.message || "Erreur réseau. Veuillez réessayer.");
      setIsAuthLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (applyStep < 3) {
      setApplyStep(applyStep + 1);
      return;
    }
    // Validate passwords match
    if (applyForm.password !== applyForm.confirmPassword) {
      setApplyError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!applyForm.agreeTerms) {
      setApplyError("Vous devez accepter les conditions.");
      return;
    }
    // Full validation (email format, password strength)
    const validationResult = validateRegistrationForm({
      email: applyForm.email,
      password: applyForm.password,
      confirmPassword: applyForm.confirmPassword,
    });
    if (!validationResult.valid) {
      setApplyError(validationResult.error);
      return;
    }
    setIsAuthLoading(true);
    setApplyError(null);

    try {
      // Step 1: Register the artist account
      const regRes = await fetch("/auth/artist/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: applyForm.email,
          password: applyForm.password,
          stageName: applyForm.stageName,
          legalName: applyForm.legalName,
          genre: applyForm.genre ? [applyForm.genre] : ["Other"],
          country: applyForm.country || "United States",
          bio: applyForm.bio,
          spotifyUrl: applyForm.spotifyUrl,
          instagramHandle: applyForm.instagramHandle,
          artistRole: applyForm.artistRole || undefined,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok || !regData.success) {
        setApplyError(
          regData.message || "Échec de l'inscription. Veuillez réessayer.",
        );
        setIsAuthLoading(false);
        return;
      }
      // Store artist data
      localStorage.setItem("artist_token", regData.token);
      localStorage.setItem("artist_profile", JSON.stringify(regData.user));
      // Also store in main auth keys so all portals recognize the session
      localStorage.setItem("authToken", regData.token);
      localStorage.setItem("auth_token", regData.token);
      localStorage.setItem("token", regData.token);
      localStorage.setItem("auth_user", JSON.stringify(regData.user));
      // Set in-memory auth token so dashboard's checkAuth() finds it
      if (regData.token) {
        const { setAuthToken } = await import("@/lib/auth");
        setAuthToken(regData.token);
      }
      // Update AuthContext React state so useRequirePortal sees the user
      if (regData.token && regData.user) {
        login(regData.token, regData.user);
      }

      // Step 2: Also submit contract application
      try {
        await fetch("/api/contracts/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: applyForm.email,
            stageName: applyForm.stageName,
            legalName: applyForm.legalName,
            genre: applyForm.genre,
            country: applyForm.country,
            biography: applyForm.bio,
            spotifyUrl: applyForm.spotifyUrl || undefined,
            instagramUrl: applyForm.instagramHandle
              ? `https://instagram.com/${applyForm.instagramHandle.replace("@", "")}`
              : undefined,
            motivation: applyForm.motivation || undefined,
            monthlyListeners: applyForm.monthlyListeners
              ? parseInt(applyForm.monthlyListeners)
              : 0,
            yearsActive: applyForm.yearsActive
              ? parseInt(applyForm.yearsActive)
              : 0,
            sampleTrackUrl: applyForm.sampleTrackUrl || undefined,
            websiteUrl: applyForm.websiteUrl || undefined,
            agreedToTerms: applyForm.agreeTerms,
          }),
        });
      } catch {
        // Contract application is optional — don't block the flow
      }

      setApplySuccess(true);
      setIsAuthLoading(false);
      // Trigger cinematic transition instead of abrupt navigate
      setTransitionArtist(
        applyForm.stageName ||
          applyForm.legalName ||
          applyForm.email.split("@")[0],
      );
      setTimeout(() => {
        setTransitioning(true);
        setTimeout(() => navigate("/music/dashboard"), 400);
      }, 200);
    } catch (err: any) {
      setApplyError(err.message || "Erreur réseau. Veuillez réessayer.");
      setIsAuthLoading(false);
    }
  };

  const handlePortalEnter = useCallback(() => {
    // Scroll to the next section
    const el = document.getElementById("artist-world");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Feature cards for the "What Awaits" section
  const features = [
    {
      icon: Music,
      title: "Distribuez votre musique",
      desc: "Téléversez, gérez et distribuez vos titres sur toutes les grandes plateformes depuis un seul tableau de bord.",
      gradient: "from-purple-500 to-fuchsia-500",
    },
    {
      icon: TrendingUp,
      title: "Analytique en temps réel",
      desc: "Suivez les écoutes, revenus, démographies d'audience et portée géographique en temps réel.",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      icon: Users,
      title: "Collaborations",
      desc: "Connectez-vous avec des producteurs, ingénieurs et artistes. Construisez votre réseau créatif.",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: Shield,
      title: "Protection des droits d'auteur",
      desc: "Suivi transparent des royalties avec des pistes de paiement vérifiées par blockchain.",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Crown,
      title: "Niveaux de vérification",
      desc: "Obtenez les badges Bronze, Argent, Or et Platine à mesure que votre présence grandit.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Globe,
      title: "Portée mondiale",
      desc: "Votre musique, partout. Localisation automatique et analytique régionale.",
      gradient: "from-violet-500 to-indigo-500",
    },
  ];

  // Artist ID preview tiers
  const tiers = [
    {
      name: "Bronze",
      color: "from-amber-700 to-amber-900",
      streams: "0 – 10K",
    },
    {
      name: "Argent",
      color: "from-gray-300 to-gray-500",
      streams: "10K – 100K",
    },
    {
      name: "Or",
      color: "from-yellow-400 to-amber-500",
      streams: "100K – 1M",
    },
    { name: "Platine", color: "from-slate-200 to-slate-400", streams: "1M+" },
  ];

  return (
    <div
      ref={containerRef}
      className="relative bg-[#06020f] text-white overflow-x-hidden pt-14"
      style={{ minHeight: "100vh" }}
    >
      {/* ─── Ambient Background ─── */}
      <div className="fixed inset-0 z-0">
        {/* Deep space gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(88,28,135,0.15) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 80% 20%, rgba(15,23,42,0.3) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 50% 80%, rgba(168,85,247,0.08) 0%, transparent 60%)",
          }}
        />
        <ParticleField />

        {/* Floating music icons — sparse */}
        <FloatingIcon icon={Music} x="8%" y="20%" delay={0} size={16} />
        <FloatingIcon icon={Headphones} x="88%" y="30%" delay={2} size={18} />
        <FloatingIcon icon={Disc} x="12%" y="75%" delay={1} size={16} />
        <FloatingIcon icon={Radio} x="82%" y="70%" delay={3} size={14} />
      </div>

      {/* ═══════════════════════════════════════════════
          SECTION 1: Cinematic Intro & Portal
          ═══════════════════════════════════════════════ */}
      <section
        ref={heroSectionRef}
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-14"
      >
        {/* VersaBeat Studio — floats top-right when hero is visible.
            Deferred on mobile: mount only after ready phase + 2s to avoid
            Safari memory pressure during initial render. */}
        <AnimatePresence>
          {phase === "ready" && (
            <MiniStudio
              heroVisible={heroVisible}
              analyserRef={analyserNodeRef}
              setAnalyserLive={setAnalyserLive}
            />
          )}
        </AnimatePresence>
        {/* Phase 1: Logo Mark Intro */}
        <AnimatePresence>
          {phase === "intro" && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center"
                style={{ boxShadow: "0 0 30px rgba(168,85,247,0.25)" }}
              >
                <Music className="w-8 h-8 text-white" />
              </motion.div>
              <motion.p
                className="mt-5 text-white/30 text-sm tracking-[0.3em] uppercase font-light"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Initialisation
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2+3: Main Hero Content */}
        <AnimatePresence>
          {(phase === "reveal" || phase === "ready") && (
            <motion.div
              className="flex flex-col items-center text-center max-w-4xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              {/* Verso Artist Universe wordmark */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="mb-2"
              >
                <span className="text-xs md:text-sm tracking-[0.5em] uppercase text-purple-400/60 font-light">
                  Bienvenue dans l'univers VERSO des artistes de la musique
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl sm:text-6xl md:text-8xl font-bold leading-none tracking-tight"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.4,
                  duration: 1,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent notranslate">
                  Verso
                </span>
                <br />
                <span className="bg-gradient-to-r from-white via-purple-100 to-white/80 bg-clip-text text-transparent notranslate">
                  Artist Studio
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 md:mt-8 text-base md:text-xl text-white/40 max-w-2xl leading-relaxed font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
              >
                Votre musique. Votre identité. Votre scène.
                <br className="hidden md:block" />
                Publiez, monétisez et rayonnez depuis un seul espace.
              </motion.p>

              {/* Audio Visualizer */}
              <motion.div
                className="mt-8 md:mt-12 h-16 w-64 md:w-80"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <AudioVisualizer
                  className="h-full"
                  analyser={analyserNodeRef.current}
                  isLive={analyserLive}
                />
              </motion.div>

              {/* Portal Gateway */}
              <motion.div
                className="mt-8 md:mt-14"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 1.3,
                  duration: 1,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <PortalGateway
                  isOpen={phase === "ready"}
                  onEnter={handlePortalEnter}
                />
                {/* Listener Passerelle Link */}
                <motion.div
                  className="mt-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2, duration: 0.8 }}
                >
                  <p className="text-white/20 text-xs mb-2">
                    Vous n'êtes pas artiste ?
                  </p>
                  <a
                    href="/stream"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white/70 transition-all text-sm"
                  >
                    <Headphones className="h-4 w-4" />
                    <span>Je suis un auditeur — écouter de la musique</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2: The Artist World — What Awaits You
          ═══════════════════════════════════════════════ */}
      <section id="artist-world" className="relative z-10 py-24 md:py-40 px-4">
        {/* Section divider — fading line */}
        <div className="w-full max-w-lg mx-auto mb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </div>

        <motion.div
          className="max-w-[95vw] mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.12, delayChildren: 0.2 },
            },
          }}
        >
          <motion.span
            className="text-purple-400/60 text-xs tracking-[0.5em] uppercase font-light"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            Ce qui vous attend
          </motion.span>
          <motion.h2
            className="mt-4 text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-white/70 bg-clip-text text-transparent"
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            Votre Centre de Commande Créatif
          </motion.h2>
          <motion.p
            className="mt-4 text-white/30 max-w-2xl mx-auto text-base md:text-lg font-light"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          >
            Tout ce dont vous avez besoin pour créer, distribuer, analyser et
            grandir — unifié dans un seul univers.
          </motion.p>

          {/* Feature Grid */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group relative p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] transition-all duration-500"
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
              >
                {/* Glow on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`}
                />
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white/90 mb-2 text-left">
                  {f.title}
                </h3>
                <p className="text-sm text-white/30 leading-relaxed text-left">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3: Artist Identity System Preview
          ═══════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 md:py-32 px-4">
        <div className="w-full max-w-lg mx-auto mb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
        </div>

        <motion.div
          className="max-w-[95vw] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.15, delayChildren: 0.1 },
            },
          }}
        >
          <div className="text-center mb-16">
            <motion.span
              className="text-fuchsia-400/60 text-xs tracking-[0.5em] uppercase font-light"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              Votre identité
            </motion.span>
            <motion.h2
              className="mt-4 text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-fuchsia-200 to-white/70 bg-clip-text text-transparent"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              La Carte Artiste Verso
            </motion.h2>
            <motion.p
              className="mt-4 text-white/30 max-w-xl mx-auto font-light"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            >
              Une identité numérique unique qui grandit avec vous. Votre Code
              Artiste Verso (VAC) est votre passeport à travers tout
              l'écosystème.
            </motion.p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Sample Artist Card — Premium Holographic Design */}
            <motion.div
              className="flex-shrink-0"
              variants={{
                hidden: { opacity: 0, x: -40 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <div className="relative w-80 md:w-[22rem] group/card">
                {/* Animated holographic glow */}
                <motion.div
                  className="absolute -inset-6 rounded-[2rem] blur-2xl opacity-60"
                  style={{
                    background:
                      "conic-gradient(from 180deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2), rgba(34,211,238,0.2), rgba(168,85,247,0.3))",
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* The card */}
                <div
                  className="relative rounded-[1.25rem] overflow-hidden border border-white/[0.12] p-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #120826 0%, #1a0a35 35%, #0f0a1e 70%, #0a0612 100%)",
                  }}
                >
                  {/* Holographic shimmer stripe */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, #a855f7, #ec4899, #22d3ee, #a855f7, transparent)",
                    }}
                  />

                  {/* Card inner padding */}
                  <div className="p-6 pb-5">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                          <Music className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <span className="text-white/70 text-[10px] tracking-[0.25em] uppercase font-semibold block leading-none">
                            Verso Artist
                          </span>
                          <span className="text-white/25 text-[9px] tracking-wider uppercase">
                            Carte d'identité
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/15 to-fuchsia-500/15 border border-purple-400/25">
                        <Crown className="w-3 h-3 text-purple-400" />
                        <span className="text-purple-400 text-[10px] font-bold tracking-wide">
                          TIER
                        </span>
                      </div>
                    </div>

                    {/* Artist identity — large avatar + name */}
                    <div className="flex items-center gap-5 mb-5">
                      <div className="relative">
                        <div className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 flex items-center justify-center text-3xl shadow-xl shadow-purple-600/25 ring-2 ring-white/[0.08]">
                          🎤
                        </div>
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#120826]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-xl tracking-tight leading-tight">
                          Nooka
                        </h3>
                        <p className="text-white/35 text-sm font-medium mt-0.5">
                          Genre • Style
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-emerald-400/80 text-[10px] font-medium">
                            Actif maintenant
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* VAC Code — monospaced highlight */}
                    <div className="bg-white/[0.03] rounded-xl p-3.5 mb-4 border border-white/[0.06] backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/25 text-[9px] tracking-[0.2em] uppercase font-semibold">
                          Code Artiste Verso
                        </span>
                        <div className="flex items-center gap-1 text-purple-400/50">
                          <Shield className="w-2.5 h-2.5" />
                          <span className="text-[8px] font-medium">
                            Vérifié
                          </span>
                        </div>
                      </div>
                      <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 font-mono text-lg font-bold tracking-wider">
                        VA_XX-X_XXX-XXX-XXX-225.x
                      </p>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-white font-bold text-base leading-none">
                          1.2M
                        </p>
                        <p className="text-white/20 text-[9px] mt-1 uppercase tracking-wider font-medium">
                          Écoutes
                        </p>
                      </div>
                      <div className="text-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-white font-bold text-base leading-none">
                          38
                        </p>
                        <p className="text-white/20 text-[9px] mt-1 uppercase tracking-wider font-medium">
                          Titres
                        </p>
                      </div>
                      <div className="text-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-white font-bold text-base leading-none">
                          28.7K
                        </p>
                        <p className="text-white/20 text-[9px] mt-1 uppercase tracking-wider font-medium">
                          Auditeurs
                        </p>
                      </div>
                    </div>

                    {/* Division + earnings bar */}
                    <div className="flex items-center gap-3 mb-4 px-1">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/30 text-[9px] uppercase tracking-wider font-semibold">
                            Division Or
                          </span>
                          <span className="text-amber-400 text-[10px] font-bold">
                            78%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                            initial={{ width: 0 }}
                            whileInView={{ width: "78%" }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 1.2,
                              delay: 0.5,
                              ease: "easeOut",
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold text-sm leading-none">
                          $4.2K
                        </p>
                        <p className="text-white/15 text-[8px] mt-0.5">
                          revenus
                        </p>
                      </div>
                    </div>

                    {/* Footer: QR + member since */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center border border-white/[0.04] p-0.5">
                        <QRCodeSVG
                          value="https://versoair.app/artist/nooka"
                          size={38}
                          bgColor="#ffffff"
                          fgColor="#1a0533"
                          level="M"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-white/15 text-[9px] uppercase tracking-wider">
                          Membre depuis
                        </p>
                        <p className="text-white/40 text-xs font-medium">
                          XX XXX XXXX
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tier Legend */}
            <motion.div
              className="flex-1 space-y-4"
              variants={{
                hidden: { opacity: 0, x: 40 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <h3 className="text-xl font-semibold text-white/80 mb-6">
                Niveaux de vérification
              </h3>
              {tiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                >
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center`}
                  >
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-white/80 font-medium">
                      {tier.name}
                    </span>
                    <p className="text-white/30 text-sm">
                      {tier.streams} écoutes mensuelles
                    </p>
                  </div>
                  <Sparkles
                    className={`w-4 h-4 ${i === 3 ? "text-slate-300" : i === 2 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-amber-700"}`}
                  />
                </motion.div>
              ))}

              <p className="text-white/20 text-sm mt-6 pl-1">
                Votre niveau est automatiquement calculé en fonction de votre
                activité de streaming, collaborations et engagement sur la
                plateforme.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4: Sign In / Apply — Inline Portal
          ═══════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 md:py-40 px-4">
        <div className="w-full max-w-lg mx-auto mb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>

        <motion.div
          className="max-w-md mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
          }}
        >
          {/* Heading */}
          <motion.div
            className="text-center mb-8"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <motion.div
              className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-500 items-center justify-center mb-4"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(168,85,247,0.3)",
                  "0 0 40px rgba(168,85,247,0.5)",
                  "0 0 20px rgba(168,85,247,0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Music className="w-7 h-7 text-white" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Prêt à commencer ?
            </h2>
            <p className="text-white/30 text-sm mt-2">
              {activeTab === "signin"
                ? "Bon retour, créateur"
                : "Rejoignez l'univers"}
            </p>
          </motion.div>

          {/* Tab Switcher */}
          <motion.div
            className="flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 mb-8"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <button
              onClick={() => {
                setActiveTab("signin");
                setApplyStep(1);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "signin"
                  ? "bg-gradient-to-r from-purple-600/80 to-fuchsia-600/80 text-white shadow-lg shadow-purple-500/20"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setActiveTab("apply")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "apply"
                  ? "bg-gradient-to-r from-purple-600/80 to-fuchsia-600/80 text-white shadow-lg shadow-purple-500/20"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Candidater
            </button>
          </motion.div>

          {/* Auth Messages */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center"
            >
              {authError}
            </motion.div>
          )}
          {authSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm text-center"
            >
              {authSuccess}
            </motion.div>
          )}

          {/* ── SIGN IN FORM ── */}
          <AnimatePresence mode="wait">
            {activeTab === "signin" && (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignIn}
                className="space-y-5"
              >
                {/* Email */}
                <div>
                  <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                    Email ou Code Artiste
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      value={signInForm.email}
                      onChange={(e) =>
                        setSignInForm({
                          ...signInForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="you@email.com ou VA_XX-X_XXX-XXX-XXX-000.x"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div
                  className={
                    isArtistCodeInput ? "opacity-40 pointer-events-none" : ""
                  }
                >
                  <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                    {isArtistCodeInput
                      ? "Mot de passe (non requis avec code artiste)"
                      : "Mot de passe"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signInForm.password}
                      onChange={(e) =>
                        setSignInForm({
                          ...signInForm,
                          password: e.target.value,
                        })
                      }
                      placeholder="Entrez votre mot de passe"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signInForm.rememberMe}
                      onChange={(e) =>
                        setSignInForm({
                          ...signInForm,
                          rememberMe: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] text-purple-500 focus:ring-purple-500/20"
                    />
                    <span className="text-white/30 text-xs">
                      Se souvenir de moi
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-purple-400/60 hover:text-purple-400 text-xs transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Sign In Button */}
                <motion.button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm relative overflow-hidden disabled:opacity-50"
                  whileHover={{
                    scale: 1.01,
                    boxShadow: "0 0 30px rgba(168,85,247,0.3)",
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isAuthLoading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Entrer dans
                        l'Univers
                      </>
                    )}
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ["-200%", "200%"] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-white/15 text-xs">
                    ou continuer avec
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Music Platform OAuth */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.button
                    type="button"
                    className="py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm font-medium hover:border-[#1DB954]/40 hover:bg-[#1DB954]/10 hover:text-[#1DB954] transition-all flex flex-col items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      (window.location.href =
                        "/auth/oauth/spotify?redirect=/music/dashboard")
                    }
                  >
                    <span className="text-lg">♪</span>
                    <span className="text-[10px] opacity-60">Spotify</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    className="py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm font-medium hover:border-[#FC3C44]/40 hover:bg-[#FC3C44]/10 hover:text-[#FC3C44] transition-all flex flex-col items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      (window.location.href =
                        "/auth/oauth/apple-music?redirect=/music/dashboard")
                    }
                  >
                    <span className="text-lg"></span>
                    <span className="text-[10px] opacity-60">Apple Music</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    className="py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm font-medium hover:border-[#FFA200]/40 hover:bg-[#FFA200]/10 hover:text-[#FFA200] transition-all flex flex-col items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      (window.location.href =
                        "/auth/oauth/audiomack?redirect=/music/dashboard")
                    }
                  >
                    <span className="text-lg">🎵</span>
                    <span className="text-[10px] opacity-60">Audiomack</span>
                  </motion.button>
                </div>

                {/* Contracts & Apply links */}
                <div className="mt-2 pt-4 border-t border-white/[0.06]">
                  <p className="text-white/20 text-xs text-center mb-3">
                    Pas encore artiste certifié ?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      className="py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/40 text-xs font-medium hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open("/contracts", "_blank")}
                    >
                      📄 Voir les contrats
                    </motion.button>
                    <motion.button
                      type="button"
                      className="py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/40 text-xs font-medium hover:border-fuchsia-500/30 hover:text-fuchsia-300 hover:bg-fuchsia-500/5 transition-all flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setActiveTab("apply");
                      }}
                    >
                      ✨ Candidater maintenant
                    </motion.button>
                  </div>
                </div>
              </motion.form>
            )}

            {/* ── APPLY FORM (Multi-Step) ── */}
            {activeTab === "apply" && (
              <motion.form
                key="apply"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleApply}
                className="space-y-5"
              >
                {/* Progress Steps */}
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex-1 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          s < applyStep
                            ? "bg-purple-500 text-white"
                            : s === applyStep
                              ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30"
                              : "bg-white/[0.06] text-white/20"
                        }`}
                      >
                        {s < applyStep ? <Check className="w-3.5 h-3.5" /> : s}
                      </div>
                      {s < 3 && (
                        <div
                          className={`flex-1 h-px ${s < applyStep ? "bg-purple-500/50" : "bg-white/[0.06]"}`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {/* Step 1: Account */}
                  {applyStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-white/60 text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" /> Détails
                        du compte
                      </h3>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input
                            type="email"
                            value={applyForm.email}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="your@email.com"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input
                            type="password"
                            value={applyForm.password}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                password: e.target.value,
                              })
                            }
                            placeholder="Créez un mot de passe sécurisé"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Confirmer le mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input
                            type="password"
                            value={applyForm.confirmPassword}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                confirmPassword: e.target.value,
                              })
                            }
                            placeholder="Confirmez votre mot de passe"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Artist Identity */}
                  {applyStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-white/60 text-sm font-medium flex items-center gap-2">
                        <Mic2 className="w-4 h-4 text-fuchsia-400" /> Identité
                        Artiste
                      </h3>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Nom de scène
                        </label>
                        <div className="relative">
                          <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input
                            type="text"
                            value={applyForm.stageName}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                stageName: e.target.value,
                              })
                            }
                            placeholder="Votre nom d'artiste / de scène"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Nom légal
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input
                            type="text"
                            value={applyForm.legalName}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                legalName: e.target.value,
                              })
                            }
                            placeholder="Votre nom complet légal"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Genre principal
                        </label>
                        <div className="relative">
                          <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 z-10" />
                          <select
                            value={applyForm.genre}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                genre: e.target.value,
                              })
                            }
                            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm appearance-none cursor-pointer"
                            required
                          >
                            <option value="" className="bg-[#1a0a2e]">
                              Sélectionnez votre genre
                            </option>
                            {genres.map((g) => (
                              <option
                                key={g}
                                value={g}
                                className="bg-[#1a0a2e]"
                              >
                                {g}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Rôle créatif
                        </label>
                        <div className="relative">
                          <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 z-10" />
                          <select
                            value={applyForm.artistRole}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                artistRole: e.target.value,
                              })
                            }
                            className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-[#1a0a2e]">
                              Choisissez votre spécialité
                            </option>
                            <option value="rapper" className="bg-[#1a0a2e]">
                              🎤 Rapper
                            </option>
                            <option value="composer" className="bg-[#1a0a2e]">
                              🎼 Composer
                            </option>
                            <option value="dj" className="bg-[#1a0a2e]">
                              🎧 DJ / Disk Jockey
                            </option>
                            <option value="producer" className="bg-[#1a0a2e]">
                              🎹 Producer / Beatmaker
                            </option>
                            <option value="singer" className="bg-[#1a0a2e]">
                              🎙️ Singer / Vocalist
                            </option>
                            <option
                              value="sound_engineer"
                              className="bg-[#1a0a2e]"
                            >
                              🎚️ Sound Engineer
                            </option>
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Pays
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input
                            type="text"
                            value={applyForm.country}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                country: e.target.value,
                              })
                            }
                            placeholder="Où êtes-vous basé ?"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Profile & Links */}
                  {applyStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-white/60 text-sm font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" /> Profil &
                        Liens
                      </h3>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Bio
                        </label>
                        <textarea
                          value={applyForm.bio}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              bio: e.target.value,
                            })
                          }
                          placeholder="Parlez-nous de votre parcours musical..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Pourquoi souhaitez-vous rejoindre Verso Air ?
                        </label>
                        <textarea
                          value={applyForm.motivation}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              motivation: e.target.value,
                            })
                          }
                          placeholder="Qu'est-ce qui vous motive à rejoindre notre plateforme..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                            Auditeurs mensuels
                          </label>
                          <input
                            type="number"
                            value={applyForm.monthlyListeners}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                monthlyListeners: e.target.value,
                              })
                            }
                            placeholder="e.g. 5000"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                            Années d'activité
                          </label>
                          <input
                            type="number"
                            value={applyForm.yearsActive}
                            onChange={(e) =>
                              setApplyForm({
                                ...applyForm,
                                yearsActive: e.target.value,
                              })
                            }
                            placeholder="e.g. 3"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          URL Profil Spotify{" "}
                          <span className="text-white/15">(optionnel)</span>
                        </label>
                        <input
                          type="url"
                          value={applyForm.spotifyUrl}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              spotifyUrl: e.target.value,
                            })
                          }
                          placeholder="https://open.spotify.com/artist/..."
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Identifiant Instagram{" "}
                          <span className="text-white/15">(optionnel)</span>
                        </label>
                        <input
                          type="text"
                          value={applyForm.instagramHandle}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              instagramHandle: e.target.value,
                            })
                          }
                          placeholder="@yourusername"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Lien vers un titre{" "}
                          <span className="text-white/15">(optionnel)</span>
                        </label>
                        <input
                          type="url"
                          value={applyForm.sampleTrackUrl}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              sampleTrackUrl: e.target.value,
                            })
                          }
                          placeholder="Lien vers votre meilleur titre (SoundCloud, YouTube, etc.)"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Site web{" "}
                          <span className="text-white/15">(optionnel)</span>
                        </label>
                        <input
                          type="url"
                          value={applyForm.websiteUrl}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              websiteUrl: e.target.value,
                            })
                          }
                          placeholder="https://yoursite.com"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                        />
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer mt-4">
                        <input
                          type="checkbox"
                          checked={applyForm.agreeTerms}
                          onChange={(e) =>
                            setApplyForm({
                              ...applyForm,
                              agreeTerms: e.target.checked,
                            })
                          }
                          className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/[0.04] text-purple-500 focus:ring-purple-500/20"
                          required
                        />
                        <span className="text-white/30 text-xs leading-relaxed">
                          J'accepte les{" "}
                          <span className="text-purple-400/60 hover:text-purple-400 cursor-pointer">
                            Conditions d'utilisation
                          </span>{" "}
                          et le{" "}
                          <span className="text-purple-400/60 hover:text-purple-400 cursor-pointer">
                            Contrat Artiste
                          </span>{" "}
                          du Verso Artist Studio. Je comprends que les artistes
                          approuvés reçoivent une part de revenus basée sur leur
                          grade attribué (S/A/B/C). Je confirme que toutes les
                          informations fournies sont exactes.
                        </span>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-2">
                  {applyStep > 1 && !applySuccess && (
                    <motion.button
                      type="button"
                      onClick={() => setApplyStep(applyStep - 1)}
                      className="px-5 py-3.5 rounded-xl border border-white/[0.08] text-white/50 text-sm hover:bg-white/[0.04] transition-all"
                      whileTap={{ scale: 0.98 }}
                    >
                      Retour
                    </motion.button>
                  )}
                  {!applySuccess && (
                    <motion.button
                      type="submit"
                      disabled={isAuthLoading}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm relative overflow-hidden disabled:opacity-50"
                      whileHover={{
                        scale: 1.01,
                        boxShadow: "0 0 30px rgba(168,85,247,0.3)",
                      }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isAuthLoading ? (
                          <motion.div
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        ) : applyStep < 3 ? (
                          <>
                            Continuer <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Soumettre la
                            candidature
                          </>
                        )}
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ x: ["-200%", "200%"] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </motion.button>
                  )}
                </div>

                {/* Error message */}
                {applyError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
                  >
                    {applyError}
                  </motion.div>
                )}

                {/* Success state */}
                {applySuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-emerald-400 font-bold text-lg">
                      Candidature Envoyée!
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Votre candidature a été soumise avec succès. Notre équipe
                      l'examinera sous{" "}
                      <span className="text-white/60 font-medium">
                        5 à 7 jours ouvrables
                      </span>
                      . Vous recevrez une notification par email avec votre
                      grade attribué (S, A, B, ou C).
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("signin");
                          setApplyStep(1);
                          setApplySuccess(false);
                        }}
                        className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                      >
                        ← Retour à la connexion
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          {/* Bottom toggle note */}
          <div className="mt-8 text-center">
            <p className="text-white/15 text-xs">
              {activeTab === "signin" ? (
                <>
                  Vous n'avez pas de compte artiste ?{" "}
                  <button
                    onClick={() => setActiveTab("apply")}
                    className="text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    Candidater
                  </button>
                </>
              ) : (
                <>
                  Vous avez déjà un compte ?{" "}
                  <button
                    onClick={() => {
                      setActiveTab("signin");
                      setApplyStep(1);
                    }}
                    className="text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    Connexion
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Trust indicators */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-8 text-white/15 text-sm"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Authentification sécurisée</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Configuration instantanée</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>Inscription gratuite</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER — Minimal universe footer
          ═══════════════════════════════════════════════ */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/[0.04]">
        <div className="max-w-[95vw] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
              <Music className="w-3 h-3 text-white" />
            </div>
            <span className="text-white/30 text-sm notranslate">
              Verso Artist Studio
            </span>
          </div>
          <div className="flex items-center gap-6 text-white/20 text-xs">
            <Link href="/divertissement">
              <span className="hover:text-white/40 transition-colors cursor-pointer">
                ← Retour au Divertissement
              </span>
            </Link>
            <Link href="/">
              <span className="hover:text-white/40 transition-colors cursor-pointer">
                Plateforme principale
              </span>
            </Link>
            <Link href="/help">
              <span className="hover:text-white/40 transition-colors cursor-pointer">
                Aide
              </span>
            </Link>
          </div>
          <p className="text-white/10 text-xs">
            © 2026 Verso Air. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════
          CINEMATIC TRANSITION OVERLAY — Auth → Dashboard
          ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {/* Background layers */}
            <motion.div
              className="absolute inset-0 bg-[#06020f]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(147,51,234,0.3) 0%, rgba(88,28,135,0.15) 30%, transparent 70%)",
              }}
            />

            {/* Sweep light effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: "200%", opacity: [0, 0.6, 0] }}
              transition={{ duration: 1.5, delay: 0.4, ease: "easeInOut" }}
            >
              <div
                className="h-full w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(168,85,247,0.2), rgba(255,255,255,0.1), transparent)",
                }}
              />
            </motion.div>

            {/* Central content */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Logo pulse */}
              <motion.div
                className="relative mb-8"
                initial={{ scale: 0.3, opacity: 0, rotate: -180 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40">
                  <Music className="w-12 h-12 text-white" />
                </div>
                {/* Ring pulse */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-400/50"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-fuchsia-400/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 3.5, opacity: 0 }}
                  transition={{ duration: 1.5, delay: 0.7, ease: "easeOut" }}
                />
              </motion.div>

              {/* Welcome text */}
              <motion.p
                className="text-purple-300/80 text-sm font-medium tracking-[0.3em] uppercase mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Bienvenue au Studio
              </motion.p>

              {/* Artist name */}
              <motion.h2
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-fuchsia-200 bg-clip-text text-transparent mb-6"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.9,
                  type: "spring",
                  stiffness: 100,
                }}
              >
                {transitionArtist}
              </motion.h2>

              {/* Loading bar */}
              <motion.div
                className="w-48 h-1 rounded-full overflow-hidden bg-white/10"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.4, delay: 1.2 }}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: 1.0,
                    delay: 1.3,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>

              <motion.p
                className="text-white/30 text-xs mt-4 tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.5 }}
              >
                Préparation de votre tableau de bord…
              </motion.p>
            </div>

            {/* Floating particles during transition */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 3 + Math.random() * 4,
                  height: 3 + Math.random() * 4,
                  background: `rgba(${168 + Math.random() * 87}, ${85 + Math.random() * 100}, ${247}, ${0.3 + Math.random() * 0.4})`,
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -60 - Math.random() * 80],
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  delay: 0.3 + Math.random() * 1.2,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

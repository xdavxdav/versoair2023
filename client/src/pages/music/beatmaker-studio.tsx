/**
 * Beatmaker Studio — Sur-Mesure Beats by Verso Air™
 * Connect with talented beatmakers for custom music
 * Brief → Genre → Instruments → Mood & Feel → Track Length →
 * Musical Theory → Vocals → Song Structure → Tempo → Submit
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ─── Genre data ───
const GENRES = [
  { id: "pop", label: "Pop", icon: "🎵" },
  { id: "edm", label: "EDM", icon: "🎛️" },
  { id: "hiphop", label: "Hip Hop", icon: "🎤" },
  { id: "rock", label: "Rock", icon: "🎸" },
  { id: "classical", label: "Classical", icon: "🎻" },
  { id: "lofi", label: "Lo-Fi", icon: "📻" },
  { id: "ambient", label: "Ambient", icon: "☁️" },
  { id: "cinematic", label: "Cinematic", icon: "🎬" },
  { id: "jazz", label: "Jazz", icon: "🎷" },
  { id: "rnb", label: "R&B", icon: "💜" },
  { id: "folk", label: "Folk", icon: "🏔️" },
  { id: "metal", label: "Metal", icon: "🤘" },
];

// ─── Instruments ───
const INSTRUMENTS = [
  { id: "piano", label: "Piano", icon: "🎹" },
  { id: "guitar", label: "Guitar", icon: "🎸" },
  { id: "bass", label: "Bass", icon: "🔊" },
  { id: "drums", label: "Drums", icon: "🥁" },
  { id: "synth", label: "Synth", icon: "🎛️" },
  { id: "strings", label: "Strings", icon: "🎻" },
  { id: "brass", label: "Brass", icon: "🎺" },
  { id: "vocals", label: "Vocals", icon: "🎤" },
];

// ─── Vocal types ───
const VOCAL_TYPES = [
  { id: "none", label: "No Vocals", icon: "🔇" },
  { id: "male", label: "Male", icon: "👨" },
  { id: "female", label: "Female", icon: "👩" },
  { id: "choir", label: "Choir", icon: "👥" },
  { id: "rap", label: "Rap", icon: "🎤" },
  { id: "whisper", label: "Whisper", icon: "🤫" },
  { id: "robotic", label: "Robotic", icon: "🤖" },
];

// ─── Song structure parts ───
const STRUCTURE_PARTS = [
  { id: "intro", label: "Intro", color: "from-emerald-500 to-emerald-600" },
  { id: "verse", label: "Verse", color: "from-blue-500 to-blue-600" },
  { id: "chorus", label: "Chorus", color: "from-purple-500 to-purple-600" },
  { id: "bridge", label: "Bridge", color: "from-amber-500 to-amber-600" },
  { id: "drop", label: "Drop", color: "from-pink-500 to-pink-600" },
  { id: "outro", label: "Outro", color: "from-cyan-500 to-cyan-600" },
  { id: "loop", label: "Loop", color: "from-violet-500 to-violet-600" },
];

// ─── Track lengths ───
const TRACK_LENGTHS = [
  { id: "15", label: "15s" },
  { id: "30", label: "30s" },
  { id: "60", label: "60s" },
  { id: "120", label: "120s" },
  { id: "180", label: "180s" },
];

// ─── Mode options ───
const MODES = ["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian"];

// ─── Brief examples ───
const BRIEF_EXAMPLES = [
  "I need an epic cinematic orchestral piece with soaring strings for a film trailer",
  "Looking for chill lo-fi hip hop vibes, perfect for studying on a rainy day",
  "Dark trap beat with heavy 808s and an eerie melody for my upcoming single",
];

// ─── Slider Component ───
function MelodSlider({
  label,
  icon,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  icon: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <span className="text-sm font-bold text-purple-400">{value}</span>
      </div>
      <div className="relative py-2">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-transparent relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/25 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:cursor-grab"
        />
        {/* Track background */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(to right, rgb(168,85,247) 0%, rgb(168,85,247) ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-white/30">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
export default function BeatmakerStudio() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  // ─── Form state ───
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [energy, setEnergy] = useState(50);
  const [complexity, setComplexity] = useState(50);
  const [tone, setTone] = useState(30);
  const [trackLength, setTrackLength] = useState("60");
  const [seamlessLoop, setSeamlessLoop] = useState(false);
  const [mode, setMode] = useState("Major");
  const [melodicComplexity, setMelodicComplexity] = useState(50);
  const [harmonicRichness, setHarmonicRichness] = useState(50);
  const [showMoreTheory, setShowMoreTheory] = useState(false);
  const [vocalType, setVocalType] = useState("none");
  const [structure, setStructure] = useState<string[]>([
    "intro",
    "verse",
    "chorus",
    "verse",
    "chorus",
    "outro",
  ]);
  const [tempo, setTempo] = useState(120);
  const [isGenerating, setIsGenerating] = useState(false);

  // Toggle instrument
  const toggleInstrument = useCallback((id: string) => {
    setInstruments((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  // Add structure part
  const addStructurePart = useCallback((partId: string) => {
    setStructure((prev) => [...prev, partId]);
  }, []);

  // Remove structure part at index
  const removeStructurePart = useCallback((index: number) => {
    setStructure((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!prompt && !genre) {
      toast({
        title: "Share your vision",
        description: "Add a brief or select a genre to get started",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    // Submit to beatmaker queue (future: connect to actual endpoint)
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "🎵 Request Submitted!",
        description:
          "A beatmaker will review your brief and start working on your track.",
      });
    }, 2000);
  }, [prompt, genre, toast]);

  return (
    <MusicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Beatmaker Studio
          </h1>
          <p className="mt-3 text-white/40 text-base sm:text-lg">
            Share your vision with our talented beatmakers
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[10px] font-bold tracking-widest text-purple-400/60 uppercase">
              Sur-Mesure Beats by Verso Air™
            </span>
            <span className="px-1.5 py-0.5 text-[8px] font-black tracking-wider rounded bg-gradient-to-r from-amber-500 to-amber-600 text-black uppercase">
              GODS
            </span>
          </div>
        </motion.div>

        {/* ─── Prompt Input ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your project... What's the vibe? How will you use this track?"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-white/25 text-base resize-none focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />

          {/* Submit button — right aligned */}
          <div className="flex justify-end mt-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isGenerating}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-purple-400" />
              )}
              <span className="font-medium text-sm">
                {isGenerating ? "Sending..." : "Quick Submit"}
              </span>
            </motion.button>
          </div>

          {/* Brief examples */}
          <div className="flex items-start gap-2 mt-4">
            <Lightbulb className="w-4 h-4 text-purple-400/50 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-2">
              {BRIEF_EXAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs hover:text-white/60 hover:bg-white/[0.07] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─── Genre ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>🎵</span> Genre
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(genre === g.id ? "" : g.id)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                  genre === g.id
                    ? "bg-purple-500/15 border-purple-500/40 text-white shadow-lg shadow-purple-500/10"
                    : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                <span className="text-[11px] font-medium">{g.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Instruments ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>🎹</span> Instruments
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {INSTRUMENTS.map((inst) => {
              const isActive = instruments.includes(inst.id);
              return (
                <button
                  key={inst.id}
                  onClick={() => toggleInstrument(inst.id)}
                  className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border transition-all ${
                    isActive
                      ? "bg-purple-500/15 border-purple-500/40 text-white shadow-lg shadow-purple-500/10"
                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                  }`}
                >
                  <span className="text-xl">{inst.icon}</span>
                  <span className="text-[11px] font-medium">{inst.label}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* ─── Mood & Feel ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-5">
            <span>🎚️</span> Mood & Feel
          </h2>
          <div className="space-y-6">
            <MelodSlider
              label="Energy"
              icon="⚡"
              value={energy}
              onChange={setEnergy}
              leftLabel="Calm"
              rightLabel="Intense"
            />
            <MelodSlider
              label="Complexity"
              icon="🧩"
              value={complexity}
              onChange={setComplexity}
              leftLabel="Simple"
              rightLabel="Complex"
            />
            <MelodSlider
              label="Tone"
              icon="🌙"
              value={tone}
              onChange={setTone}
              leftLabel="Bright"
              rightLabel="Dark"
            />
          </div>
        </motion.section>

        {/* ─── Track Length ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <span>⏱️</span> Track Length
            </h2>
            <span className="text-sm font-bold text-purple-400">
              {trackLength}s
            </span>
          </div>
          <div className="flex gap-2">
            {TRACK_LENGTHS.map((tl) => (
              <button
                key={tl.id}
                onClick={() => setTrackLength(tl.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  trackLength === tl.id
                    ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                {tl.label}
              </button>
            ))}
          </div>

          {/* Seamless Loop toggle */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔁</span>
              <span className="text-sm font-medium text-white/60">
                Seamless Loop
              </span>
            </div>
            <button
              onClick={() => setSeamlessLoop(!seamlessLoop)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                seamlessLoop ? "bg-purple-500" : "bg-white/10"
              }`}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ left: seamlessLoop ? 22 : 2 }}
                transition={{ duration: 0.2 }}
              />
            </button>
          </div>
        </motion.section>

        {/* ─── Musical Theory ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-5">
            <span>🎼</span> Musical Theory
          </h2>

          {/* Mode */}
          <div className="mb-6">
            <span className="text-sm font-medium text-white/60 mb-2 block">
              Mode
            </span>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === m
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Melodic Complexity */}
          <MelodSlider
            label="Melodic Complexity"
            icon="🎶"
            value={melodicComplexity}
            onChange={setMelodicComplexity}
            leftLabel="Simple"
            rightLabel="Intricate"
          />

          {/* Harmonic Richness */}
          <div className="mt-6">
            <MelodSlider
              label="Harmonic Richness"
              icon="🎼"
              value={harmonicRichness}
              onChange={setHarmonicRichness}
              leftLabel="Basic"
              rightLabel="Complex"
            />
          </div>

          {/* More Options toggle */}
          <button
            onClick={() => setShowMoreTheory(!showMoreTheory)}
            className="flex items-center gap-2 mx-auto mt-5 text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{showMoreTheory ? "Less" : "More"} Options</span>
            {showMoreTheory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {showMoreTheory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <p className="text-xs text-white/30 text-center">
                    Advanced theory options coming soon — key signature, time
                    signature, chord progressions
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ─── Vocals ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>🎤</span> Vocals
          </h2>
          <div className="flex flex-wrap gap-2">
            {VOCAL_TYPES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVocalType(v.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  vocalType === v.id
                    ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Song Structure ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>🧱</span> Song Structure
          </h2>

          {/* Current structure */}
          <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] min-h-[52px] mb-3">
            {structure.length === 0 && (
              <span className="text-white/20 text-sm">
                Click parts below to build your song structure
              </span>
            )}
            {structure.map((partId, idx) => {
              const part = STRUCTURE_PARTS.find((p) => p.id === partId);
              if (!part) return null;
              return (
                <motion.button
                  key={`${partId}-${idx}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => removeStructurePart(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${part.color} text-white text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity`}
                >
                  {part.label}
                  <X className="w-3 h-3" />
                </motion.button>
              );
            })}
          </div>

          {/* Add structure parts */}
          <div className="flex flex-wrap gap-2">
            {STRUCTURE_PARTS.map((part) => (
              <button
                key={part.id}
                onClick={() => addStructurePart(part.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-medium hover:text-white/60 hover:bg-white/[0.07] transition-all"
              >
                <Plus className="w-3 h-3" />
                {part.label}
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Tempo (BPM) ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Tempo (BPM)</h2>
            <span className="text-lg font-bold text-purple-400">{tempo}</span>
          </div>
          <div className="relative py-2">
            <input
              type="range"
              min={40}
              max={220}
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-transparent relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/25 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:cursor-grab"
            />
            {/* Track background */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full pointer-events-none"
              style={{
                background: `linear-gradient(to right, rgb(168,85,247) 0%, rgb(168,85,247) ${((tempo - 40) / 180) * 100}%, rgba(255,255,255,0.1) ${((tempo - 40) / 180) * 100}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-white/30 mt-1">
            <span>40</span>
            <span>130</span>
            <span>220</span>
          </div>
        </motion.section>

        {/* ─── Submit Button (large) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="pb-8"
        >
          <motion.button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20 hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending your brief to our beatmakers...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Start Creation
              </>
            )}
          </motion.button>
          <p className="text-center text-[11px] text-white/20 mt-3">
            Sur-Mesure Beats • Crafted by Real Beatmakers • Gods Tier Exclusive
          </p>
        </motion.div>
      </div>
    </MusicLayout>
  );
}

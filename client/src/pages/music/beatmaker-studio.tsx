/**
 * Beatmaker Studio — Sur-Mesure Beats by Verso Air™
 * Role-based creative service marketplace
 * Roles: Rapper, Composer, DJ, Producer, Singer, Sound Engineer
 * Auth-gated Quick Submit with wildcard popup for unauthenticated users
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
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
  Lock,
  Mic2,
  Music,
  Headphones,
  Radio,
  Disc3,
  Volume2,
  Search,
  Sparkles,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ═══════════════════════════════════════════════════
// ROLE CONFIGURATION — each role has its own universe
// ═══════════════════════════════════════════════════
type RoleId =
  | "rapper"
  | "composer"
  | "dj"
  | "producer"
  | "singer"
  | "sound_engineer";

interface RoleConfig {
  id: RoleId;
  label: string;
  icon: string;
  color: string;
  accent: string;
  description: string;
  briefPlaceholder: string;
  briefExamples: string[];
  requestCategories: { id: string; label: string; icon: string }[];
  genres: { id: string; label: string; icon: string }[];
}

const ROLE_CONFIG: Record<RoleId, RoleConfig> = {
  rapper: {
    id: "rapper",
    label: "Rapper",
    icon: "🎤",
    color: "from-red-500 to-orange-500",
    accent: "text-red-400",
    description: "Verses, features, ghostwriting & publicity",
    briefPlaceholder:
      "Describe your project… Need a 16-bar verse? A hook? A full feature? What vibe?",
    briefExamples: [
      "I need a hard-hitting 16-bar verse for a drill beat with aggressive flow",
      "Looking for a catchy melodic hook for my R&B-trap crossover track",
      "Ghostwrite lyrics for a brand campaign — luxury lifestyle theme",
    ],
    requestCategories: [
      { id: "verse", label: "Custom Verse (16/32 bars)", icon: "📝" },
      { id: "feature", label: "Full Feature (verse + hook)", icon: "🎙️" },
      { id: "ghostwrite", label: "Ghostwriting", icon: "✍️" },
      { id: "hook", label: "Hook / Chorus Only", icon: "🎵" },
      { id: "freestyle", label: "Freestyle / Cypher", icon: "🔥" },
      { id: "publicity", label: "Brand Publicity / Jingle Rap", icon: "📢" },
      { id: "voiceover", label: "Rap Voiceover / Narration", icon: "🗣️" },
    ],
    genres: [
      { id: "trap", label: "Trap", icon: "🔊" },
      { id: "drill", label: "Drill", icon: "⚡" },
      { id: "hiphop", label: "Hip Hop", icon: "🎤" },
      { id: "boom-bap", label: "Boom Bap", icon: "💥" },
      { id: "melodic-rap", label: "Melodic Rap", icon: "🎶" },
      { id: "conscious", label: "Conscious", icon: "🧠" },
      { id: "grime", label: "Grime", icon: "🇬🇧" },
      { id: "afro-rap", label: "Afro Rap", icon: "🌍" },
    ],
  },
  composer: {
    id: "composer",
    label: "Composer",
    icon: "🎼",
    color: "from-blue-500 to-cyan-500",
    accent: "text-blue-400",
    description: "Scores, arrangements, jingles & film music",
    briefPlaceholder:
      "Describe the composition… Film score? Orchestral arrangement? Commercial jingle?",
    briefExamples: [
      "Epic orchestral score for a 2-minute film trailer — rising tension to triumphant climax",
      "Gentle piano arrangement for a wedding ceremony, modern classical feel",
      "15-second jingle for a tech startup brand, uplifting and innovative",
    ],
    requestCategories: [
      { id: "film-score", label: "Film / TV Score", icon: "🎬" },
      { id: "arrangement", label: "Full Arrangement", icon: "🎼" },
      { id: "jingle", label: "Commercial Jingle", icon: "📺" },
      { id: "orchestration", label: "Orchestration", icon: "🎻" },
      { id: "theme", label: "Theme Song / Intro", icon: "🎵" },
      { id: "game-music", label: "Video Game Music", icon: "🎮" },
      { id: "podcast-intro", label: "Podcast / Show Intro", icon: "🎙️" },
    ],
    genres: [
      { id: "classical", label: "Classical", icon: "🎻" },
      { id: "cinematic", label: "Cinematic", icon: "🎬" },
      { id: "contemporary", label: "Contemporary", icon: "✨" },
      { id: "jazz", label: "Jazz", icon: "🎷" },
      { id: "minimalist", label: "Minimalist", icon: "◾" },
      { id: "neo-classical", label: "Neo-Classical", icon: "🎹" },
      { id: "ambient", label: "Ambient", icon: "☁️" },
      { id: "world", label: "World Fusion", icon: "🌏" },
    ],
  },
  dj: {
    id: "dj",
    label: "DJ / Disk Jockey",
    icon: "🎧",
    color: "from-fuchsia-500 to-pink-500",
    accent: "text-fuchsia-400",
    description: "Custom mixes, personalized tracks, event sets & remixes",
    briefPlaceholder:
      "What kind of mix or set? Wedding DJ set? Club remix? Custom transition pack?",
    briefExamples: [
      "4-hour wedding reception DJ set — start chill, build to party, mix of decades",
      "Club-ready remix of my original track — add drops, builds, and DJ-friendly transitions",
      "Custom transition pack between 10 songs for my live show setlist",
    ],
    requestCategories: [
      { id: "custom-mix", label: "Custom DJ Mix", icon: "🎧" },
      { id: "remix", label: "Track Remix", icon: "🔁" },
      { id: "event-set", label: "Event / Party Set", icon: "🎉" },
      { id: "mashup", label: "Mashup", icon: "🔀" },
      { id: "transition-pack", label: "Transition Pack", icon: "⏭️" },
      { id: "live-set", label: "Live Set Planning", icon: "🎛️" },
      { id: "personalized-track", label: "Personalized Track", icon: "💎" },
    ],
    genres: [
      { id: "edm", label: "EDM", icon: "🎛️" },
      { id: "house", label: "House", icon: "🏠" },
      { id: "techno", label: "Techno", icon: "⚡" },
      { id: "afrobeats", label: "Afrobeats", icon: "🌍" },
      { id: "dancehall", label: "Dancehall", icon: "🇯🇲" },
      { id: "hiphop", label: "Hip Hop", icon: "🎤" },
      { id: "latin", label: "Latin / Reggaeton", icon: "💃" },
      { id: "multi-genre", label: "Multi-Genre", icon: "🌈" },
    ],
  },
  producer: {
    id: "producer",
    label: "Producer / Beatmaker",
    icon: "🎹",
    color: "from-purple-500 to-violet-500",
    accent: "text-purple-400",
    description: "Custom beats, instrumentals, sound design & loops",
    briefPlaceholder:
      "Describe the beat or instrumental… Trap beat? Lo-fi loop? Full production?",
    briefExamples: [
      "Dark trap beat with heavy 808s, eerie melody, and a hard-hitting drop for my single",
      "Chill lo-fi hip hop instrumental, dusty vinyl feel, perfect for studying",
      "Full production for a pop-R&B track — drums, bass, keys, guitar layers",
    ],
    requestCategories: [
      { id: "beat", label: "Custom Beat / Instrumental", icon: "🎹" },
      { id: "full-production", label: "Full Track Production", icon: "🎚️" },
      { id: "sound-design", label: "Sound Design", icon: "🔊" },
      { id: "loop-pack", label: "Loop Pack", icon: "🔄" },
      { id: "sample-pack", label: "Sample Pack", icon: "📦" },
      { id: "type-beat", label: "Type Beat", icon: "🏷️" },
      { id: "stem-production", label: "Stem Production", icon: "📊" },
    ],
    genres: [
      { id: "trap", label: "Trap", icon: "🔊" },
      { id: "hiphop", label: "Hip Hop", icon: "🎤" },
      { id: "pop", label: "Pop", icon: "🎵" },
      { id: "rnb", label: "R&B", icon: "💜" },
      { id: "lofi", label: "Lo-Fi", icon: "📻" },
      { id: "edm", label: "EDM", icon: "🎛️" },
      { id: "afrobeats", label: "Afrobeats", icon: "🌍" },
      { id: "cinematic", label: "Cinematic", icon: "🎬" },
    ],
  },
  singer: {
    id: "singer",
    label: "Singer / Vocalist",
    icon: "🎙️",
    color: "from-pink-500 to-rose-500",
    accent: "text-pink-400",
    description: "Covers, hooks, session vocals & harmonies",
    briefPlaceholder:
      "What vocal work do you need? Hook recording? Full cover? Background harmonies?",
    briefExamples: [
      "Record a powerful R&B hook for my upcoming single — female voice, soulful feel",
      "Full cover of a classic Motown hit for my YouTube channel",
      "Background harmonies and ad-libs for 3 tracks on my album",
    ],
    requestCategories: [
      { id: "hook", label: "Hook / Chorus Recording", icon: "🎵" },
      { id: "cover", label: "Full Cover Song", icon: "🎶" },
      { id: "session-vocal", label: "Session Vocals", icon: "🎙️" },
      { id: "harmonies", label: "Background Harmonies", icon: "👥" },
      { id: "topline", label: "Topline Writing + Recording", icon: "✍️" },
      { id: "demo", label: "Demo Recording", icon: "💿" },
      { id: "adlibs", label: "Ad-libs & Vocal Textures", icon: "✨" },
    ],
    genres: [
      { id: "rnb", label: "R&B", icon: "💜" },
      { id: "pop", label: "Pop", icon: "🎵" },
      { id: "soul", label: "Soul", icon: "❤️" },
      { id: "jazz", label: "Jazz", icon: "🎷" },
      { id: "gospel", label: "Gospel", icon: "🙏" },
      { id: "afrobeats", label: "Afrobeats", icon: "🌍" },
      { id: "folk", label: "Folk / Acoustic", icon: "🏔️" },
      { id: "classical", label: "Classical / Opera", icon: "🎻" },
    ],
  },
  sound_engineer: {
    id: "sound_engineer",
    label: "Sound Engineer",
    icon: "🎚️",
    color: "from-emerald-500 to-teal-500",
    accent: "text-emerald-400",
    description: "Mixing, mastering, post-production & audio restoration",
    briefPlaceholder:
      "What audio service do you need? Mix & master? Podcast cleanup? Noise removal?",
    briefExamples: [
      "Mix and master 12 tracks for my debut album — warm analog sound",
      "Clean up and restore old vinyl recordings for a reissue project",
      "Professional podcast audio cleanup — remove background noise, normalize levels",
    ],
    requestCategories: [
      { id: "mixing", label: "Mixing", icon: "🎚️" },
      { id: "mastering", label: "Mastering", icon: "💎" },
      { id: "mix-master", label: "Mix + Master Bundle", icon: "📦" },
      { id: "restoration", label: "Audio Restoration", icon: "🔧" },
      { id: "podcast-edit", label: "Podcast Editing", icon: "🎙️" },
      { id: "stem-mixing", label: "Stem Mixing", icon: "📊" },
      { id: "dolby-atmos", label: "Dolby Atmos / Spatial", icon: "🌐" },
    ],
    genres: [
      { id: "any", label: "Any Genre", icon: "🎵" },
      { id: "hiphop", label: "Hip Hop / Rap", icon: "🎤" },
      { id: "pop", label: "Pop", icon: "✨" },
      { id: "rock", label: "Rock / Metal", icon: "🎸" },
      { id: "electronic", label: "Electronic", icon: "🎛️" },
      { id: "podcast", label: "Podcast / Voice", icon: "🎙️" },
      { id: "classical", label: "Classical", icon: "🎻" },
      { id: "live", label: "Live Recording", icon: "🏟️" },
    ],
  },
};

const ROLE_LIST: RoleId[] = [
  "rapper",
  "composer",
  "dj",
  "producer",
  "singer",
  "sound_engineer",
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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isAuthed = !!(user && user.id);

  // ─── Role & Form state ───
  const [selectedRole, setSelectedRole] = useState<RoleId>("producer");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [requestCategory, setRequestCategory] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [energy, setEnergy] = useState(50);
  const [complexity, setComplexity] = useState(50);
  const [tone, setTone] = useState(30);
  const [tempo, setTempo] = useState(120);
  const [isGenerating, setIsGenerating] = useState(false);

  const role = ROLE_CONFIG[selectedRole];

  const toggleInstrument = useCallback((id: string) => {
    setInstruments((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  // Reset form fields when role changes
  const handleRoleChange = useCallback((newRole: RoleId) => {
    setSelectedRole(newRole);
    setGenre("");
    setRequestCategory("");
    setPrompt("");
  }, []);

  // Auth-gated submit
  const handleSubmit = useCallback(async () => {
    if (!isAuthed) {
      setShowAuthGate(true);
      return;
    }
    if (!prompt && !genre) {
      toast({
        title: "Share your vision",
        description: "Add a brief or select a genre to get started",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "🎵 Request Submitted!",
        description: `Your ${role.label} request has been sent. A verified artist will review your brief shortly.`,
      });
    }, 2000);
  }, [isAuthed, prompt, genre, toast, role.label]);

  return (
    <MusicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* ─── Auth Gate Wildcard Popup ─── */}
        <Dialog open={showAuthGate} onOpenChange={setShowAuthGate}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0512] border border-purple-500/20 rounded-2xl">
            <div className="relative p-8 text-center">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-transparent to-fuchsia-600/5" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  🎵 Artist Access Required
                </h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">
                  Sign in or register as an artist to submit your creative
                  requests and connect with verified professionals.
                </p>
                <motion.button
                  onClick={() => {
                    setShowAuthGate(false);
                    navigate("/artist-portal/welcome");
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Get Authenticated
                </motion.button>
                <p className="text-white/25 text-xs mt-4">
                  Free to register · Verified artists get priority placement
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Creative Studio
          </h1>
          <p className="mt-3 text-white/40 text-base sm:text-lg">
            Connect with verified artists for sur-mesure creative work
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[10px] font-bold tracking-widest text-purple-400/60 uppercase">
              Sur-Mesure by Verso Air™
            </span>
            <span className="px-1.5 py-0.5 text-[8px] font-black tracking-wider rounded bg-gradient-to-r from-amber-500 to-amber-600 text-black uppercase">
              GODS
            </span>
          </div>
        </motion.div>

        {/* ─── Role Selector Dropdown ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <label className="block text-white/40 text-xs tracking-wider uppercase mb-3">
            Select Creative Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLE_LIST.map((rid) => {
              const r = ROLE_CONFIG[rid];
              const isActive = selectedRole === rid;
              return (
                <motion.button
                  key={rid}
                  onClick={() => handleRoleChange(rid)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${r.color} border-transparent text-white shadow-lg`
                      : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-lg">{r.icon}</span>
                  <div className="text-left">
                    <span className="text-sm font-semibold block leading-tight">
                      {r.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] opacity-80 block mt-0.5">
                        {r.description}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ─── Request Category ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>{role.icon}</span> What do you need?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {role.requestCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setRequestCategory(requestCategory === cat.id ? "" : cat.id)
                }
                className={`flex items-center gap-2 py-3 px-3 rounded-xl border transition-all text-left ${
                  requestCategory === cat.id
                    ? `bg-gradient-to-r ${role.color} bg-opacity-15 border-transparent text-white shadow-md`
                    : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="text-[11px] font-medium leading-tight">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Brief / Prompt ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>📝</span> Your Brief
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={role.briefPlaceholder}
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-white/25 text-base resize-none focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />
          {/* Quick Submit — auth gated */}
          <div className="flex justify-end mt-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isGenerating}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl border transition-all ${
                isAuthed
                  ? "bg-white/[0.06] border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15]"
                  : "bg-white/[0.02] border-white/[0.05] text-white/25 cursor-not-allowed"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              whileHover={isAuthed ? { scale: 1.02 } : {}}
              whileTap={isAuthed ? { scale: 0.98 } : {}}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isAuthed ? (
                <Send className="w-4 h-4 text-purple-400" />
              ) : (
                <Lock className="w-4 h-4 text-white/20" />
              )}
              <span className="font-medium text-sm">
                {isGenerating
                  ? "Sending..."
                  : isAuthed
                    ? "Quick Submit"
                    : "Sign in to Submit"}
              </span>
            </motion.button>
          </div>
          {/* Brief examples */}
          <div className="flex items-start gap-2 mt-4">
            <Lightbulb className="w-4 h-4 text-purple-400/50 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-2">
              {role.briefExamples.map((s) => (
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

        {/* ─── Genre (role-specific) ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>🎵</span> Genre / Style
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {role.genres.map((g) => (
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

        {/* ─── Instruments (shown for producer/composer/dj) ─── */}
        {["producer", "composer", "dj"].includes(selectedRole) && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-10"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
              <span>🎹</span> Instruments
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => toggleInstrument(inst.id)}
                  className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border transition-all ${
                    instruments.includes(inst.id)
                      ? "bg-purple-500/15 border-purple-500/40 text-white shadow-lg shadow-purple-500/10"
                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                  }`}
                >
                  <span className="text-xl">{inst.icon}</span>
                  <span className="text-[10px] font-medium">{inst.label}</span>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* ─── Mood & Feel ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 space-y-6"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span>🎨</span> Mood & Feel
          </h2>
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
            leftLabel="Minimal"
            rightLabel="Complex"
          />
          <MelodSlider
            label="Tone"
            icon="🌗"
            value={tone}
            onChange={setTone}
            leftLabel="Dark"
            rightLabel="Bright"
          />
        </motion.section>

        {/* ─── Tempo ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
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

        {/* ─── Targeted Search Info ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
        >
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Artist Search</p>
              <p className="text-xs text-white/40 mt-1">
                <strong className="text-white/60">General Inquiry</strong> —
                Submit to our open pool of verified artists. Free for all users.
              </p>
              <p className="text-xs text-white/30 mt-1">
                <strong className="text-amber-400/80">
                  🔒 Targeted Search
                </strong>{" "}
                — Browse and contact specific verified artists directly.
                Requires an active subscription.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Main Submit Button (auth gated) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="pb-8"
        >
          <motion.button
            onClick={handleSubmit}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isAuthed
                ? `bg-gradient-to-r ${role.color} text-white shadow-purple-500/20 hover:shadow-purple-500/30`
                : "bg-white/[0.04] border border-white/[0.08] text-white/30 cursor-not-allowed"
            }`}
            whileHover={isAuthed ? { scale: 1.01 } : {}}
            whileTap={isAuthed ? { scale: 0.99 } : {}}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending your brief…
              </>
            ) : isAuthed ? (
              <>
                <Send className="w-5 h-5" />
                Start Creation
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Sign in to Start Creation
              </>
            )}
          </motion.button>
          <p className="text-center text-[11px] text-white/20 mt-3">
            Sur-Mesure • Crafted by Verified {role.label}s • Gods Tier Exclusive
          </p>
        </motion.div>
      </div>
    </MusicLayout>
  );
}

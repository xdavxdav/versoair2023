/**
 * VersaVids Studio — Video Production by Verso Air™
 * Role-based creative video service marketplace
 * Roles: Director, Editor, Animator, Colorist, VFX Artist, Sound Designer
 * Auth-gated Quick Submit with wildcard popup for unauthenticated users
 */
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ChevronDown,
  X,
  Loader2,
  Lightbulb,
  Lock,
  Search,
  Sparkles,
  Film,
  Clapperboard,
  Camera,
  Palette,
  Wand2,
  Volume2,
  Clock,
  DollarSign,
  FileVideo,
  Eye,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ═══════════════════════════════════════════════════
// ROLE CONFIGURATION — each role has its own universe
// ═══════════════════════════════════════════════════
type RoleId =
  | "director"
  | "editor"
  | "animator"
  | "colorist"
  | "vfx_artist"
  | "sound_designer";

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
  director: {
    id: "director",
    label: "Director",
    icon: "🎬",
    color: "from-amber-500 to-orange-600",
    accent: "text-amber-400",
    description: "Music videos, short films, commercials & creative direction",
    briefPlaceholder:
      "Describe your vision… Music video concept? Brand film? Short film? What mood and story?",
    briefExamples: [
      "Cinematic music video for an R&B single — moody lighting, urban rooftop, narrative arc about heartbreak",
      "30-second luxury brand commercial with slow-motion product shots and golden hour cinematography",
      "Concept-driven short film (5 min) exploring identity through surreal visual metaphors",
    ],
    requestCategories: [
      { id: "music-video", label: "Music Video", icon: "🎵" },
      { id: "commercial", label: "Commercial / Ad", icon: "📺" },
      { id: "short-film", label: "Short Film", icon: "🎬" },
      { id: "brand-film", label: "Brand Film", icon: "🏢" },
      { id: "lyric-video", label: "Lyric / Visualizer", icon: "✨" },
      { id: "documentary", label: "Mini Documentary", icon: "📹" },
      { id: "social-content", label: "Social Media Content", icon: "📱" },
    ],
    genres: [
      { id: "cinematic", label: "Cinematic", icon: "🎬" },
      { id: "narrative", label: "Narrative", icon: "📖" },
      { id: "abstract", label: "Abstract / Art", icon: "🎨" },
      { id: "performance", label: "Performance", icon: "🎤" },
      { id: "documentary", label: "Documentary", icon: "📹" },
      { id: "fashion", label: "Fashion / Editorial", icon: "👗" },
      { id: "comedy", label: "Comedy / Sketch", icon: "😂" },
      { id: "dark-moody", label: "Dark / Moody", icon: "🌑" },
    ],
  },
  editor: {
    id: "editor",
    label: "Video Editor",
    icon: "✂️",
    color: "from-cyan-500 to-blue-600",
    accent: "text-cyan-400",
    description:
      "Montage, cuts, transitions, pacing & storytelling through editing",
    briefPlaceholder:
      "What needs editing? Raw footage assembly? Highlight reel? Fast-paced montage?",
    briefExamples: [
      "Edit 2 hours of wedding footage into a 10-minute emotional highlight film with smooth transitions",
      "Fast-paced montage edit for a sports brand — high energy, sync cuts to beat drops",
      "YouTube video edit: talking head + B-roll integration, captions, and engaging pacing",
    ],
    requestCategories: [
      { id: "full-edit", label: "Full Video Edit", icon: "🎞️" },
      { id: "highlight-reel", label: "Highlight Reel", icon: "⭐" },
      { id: "montage", label: "Montage / Compilation", icon: "🔀" },
      { id: "youtube-edit", label: "YouTube Edit", icon: "▶️" },
      { id: "trailer", label: "Trailer / Teaser", icon: "🎥" },
      { id: "social-cut", label: "Social Media Cut", icon: "📱" },
      { id: "recut", label: "Re-edit / Re-cut", icon: "🔄" },
    ],
    genres: [
      { id: "fast-paced", label: "Fast-Paced", icon: "⚡" },
      { id: "cinematic", label: "Cinematic", icon: "🎬" },
      { id: "smooth", label: "Smooth / Flowing", icon: "🌊" },
      { id: "retro", label: "Retro / VHS", icon: "📼" },
      { id: "glitch", label: "Glitch / Experimental", icon: "⚙️" },
      { id: "minimal", label: "Minimal / Clean", icon: "◽" },
      { id: "dynamic", label: "Dynamic / Energetic", icon: "💥" },
      { id: "documentary", label: "Documentary Style", icon: "📖" },
    ],
  },
  animator: {
    id: "animator",
    label: "Animator",
    icon: "🎭",
    color: "from-violet-500 to-purple-600",
    accent: "text-violet-400",
    description:
      "2D/3D animation, motion graphics, character design & visual effects",
    briefPlaceholder:
      "What type of animation? Explainer video? Logo animation? Music video with 3D visuals?",
    briefExamples: [
      "2D character animation for a 60-second explainer video — flat design, colorful palette, playful energy",
      "3D logo reveal animation with metallic textures and cinematic lighting for a tech brand",
      "Animated lyric video with kinetic typography and particle effects synced to the beat",
    ],
    requestCategories: [
      { id: "2d-animation", label: "2D Animation", icon: "🖌️" },
      { id: "3d-animation", label: "3D Animation", icon: "🎲" },
      { id: "motion-graphics", label: "Motion Graphics", icon: "📐" },
      { id: "logo-animation", label: "Logo Animation", icon: "✨" },
      { id: "explainer", label: "Explainer Video", icon: "💡" },
      { id: "character-design", label: "Character Design", icon: "🧑‍🎨" },
      { id: "lyric-animation", label: "Lyric / Typography", icon: "🔤" },
    ],
    genres: [
      { id: "flat-design", label: "Flat / 2D", icon: "🖌️" },
      { id: "3d-realistic", label: "3D Realistic", icon: "🔮" },
      { id: "isometric", label: "Isometric", icon: "📐" },
      { id: "cartoon", label: "Cartoon / Fun", icon: "🎪" },
      { id: "abstract", label: "Abstract", icon: "🎨" },
      { id: "futuristic", label: "Futuristic / Sci-Fi", icon: "🚀" },
      { id: "organic", label: "Organic / Natural", icon: "🌿" },
      { id: "retro", label: "Retro / Pixel", icon: "👾" },
    ],
  },
  colorist: {
    id: "colorist",
    label: "Colorist",
    icon: "🎨",
    color: "from-rose-500 to-pink-600",
    accent: "text-rose-400",
    description: "Color grading, LUTs, film emulation & visual tone-setting",
    briefPlaceholder:
      "Describe the look you want… Warm film grain? Teal & orange? Desaturated noir?",
    briefExamples: [
      "Warm vintage film look with subtle grain and lifted blacks — inspired by 70s cinema",
      "Teal & orange grade for a city-at-night music video — high contrast, neon accents",
      "Desaturated nordic look for a fashion editorial — cool tones, muted greens, soft highlights",
    ],
    requestCategories: [
      { id: "full-grade", label: "Full Color Grade", icon: "🎨" },
      { id: "lut-pack", label: "Custom LUT Pack", icon: "📦" },
      { id: "match-grade", label: "Color Matching", icon: "🔗" },
      { id: "film-emulation", label: "Film Emulation", icon: "🎞️" },
      { id: "hdr-grade", label: "HDR Grading", icon: "🌈" },
      { id: "skin-tone", label: "Skin Tone Correction", icon: "👤" },
      { id: "look-dev", label: "Look Development", icon: "🔍" },
    ],
    genres: [
      { id: "cinematic", label: "Cinematic", icon: "🎬" },
      { id: "vintage", label: "Vintage / Film", icon: "📽️" },
      { id: "modern", label: "Modern / Clean", icon: "✨" },
      { id: "moody", label: "Moody / Dark", icon: "🌑" },
      { id: "pastel", label: "Pastel / Soft", icon: "🌸" },
      { id: "high-contrast", label: "High Contrast", icon: "⚫" },
      { id: "neon", label: "Neon / Cyberpunk", icon: "💜" },
      { id: "natural", label: "Natural / Docu", icon: "🌿" },
    ],
  },
  vfx_artist: {
    id: "vfx_artist",
    label: "VFX Artist",
    icon: "🌟",
    color: "from-emerald-500 to-teal-600",
    accent: "text-emerald-400",
    description: "Visual effects, compositing, CGI & green screen keying",
    briefPlaceholder:
      "What VFX do you need? Green screen removal? CGI elements? Particle effects?",
    briefExamples: [
      "Remove green screen background and composite artist onto a rotating 3D stage with volumetric lighting",
      "Add realistic rain, lightning, and atmospheric fog to outdoor footage for a dramatic music video",
      "CGI gold chains and floating objects integrated into performance footage — high-end rap video aesthetic",
    ],
    requestCategories: [
      { id: "compositing", label: "Compositing / Green Screen", icon: "🟩" },
      { id: "cgi-elements", label: "CGI Elements", icon: "🎲" },
      { id: "particles", label: "Particle Effects", icon: "✨" },
      { id: "environment", label: "Environment / BG Extension", icon: "🏔️" },
      { id: "tracking", label: "Motion Tracking", icon: "🎯" },
      { id: "cleanup", label: "Wire / Object Removal", icon: "🧹" },
      { id: "simulation", label: "Simulation (Fluid, Fire)", icon: "🔥" },
    ],
    genres: [
      { id: "realistic", label: "Photorealistic", icon: "📷" },
      { id: "stylized", label: "Stylized", icon: "🎨" },
      { id: "sci-fi", label: "Sci-Fi / Fantasy", icon: "🚀" },
      { id: "horror", label: "Horror / Dark", icon: "💀" },
      { id: "nature", label: "Nature / Weather", icon: "🌊" },
      { id: "urban", label: "Urban / City", icon: "🏙️" },
      { id: "abstract", label: "Abstract / Surreal", icon: "🌀" },
      { id: "minimal", label: "Subtle / Invisible", icon: "👁️" },
    ],
  },
  sound_designer: {
    id: "sound_designer",
    label: "Sound Designer",
    icon: "🔊",
    color: "from-indigo-500 to-blue-600",
    accent: "text-indigo-400",
    description:
      "Sound design, foley, ambience & audio post-production for video",
    briefPlaceholder:
      "What sound work do you need? Foley for a short film? Sound design for a commercial? Audio cleanup?",
    briefExamples: [
      "Full sound design for a 3-minute music video — ambient city sounds, footsteps, glass breaks, reverb tails",
      "Create immersive soundscape for a product launch video — futuristic whooshes, deep impacts, crystal chimes",
      "Foley and ambient audio for a short film — forest scene: birds, wind, leaves, distant water",
    ],
    requestCategories: [
      { id: "sound-design", label: "Sound Design", icon: "🔊" },
      { id: "foley", label: "Foley Recording", icon: "👣" },
      { id: "ambience", label: "Ambience / Atmosphere", icon: "🌫️" },
      { id: "sfx-pack", label: "SFX Pack", icon: "📦" },
      { id: "audio-post", label: "Audio Post-Production", icon: "🎚️" },
      { id: "voiceover", label: "VO Direction / Cleanup", icon: "🎙️" },
      { id: "spatial-audio", label: "Spatial / Atmos Audio", icon: "🌐" },
    ],
    genres: [
      { id: "cinematic", label: "Cinematic", icon: "🎬" },
      { id: "futuristic", label: "Futuristic / Sci-Fi", icon: "🚀" },
      { id: "organic", label: "Organic / Natural", icon: "🌿" },
      { id: "industrial", label: "Industrial / Gritty", icon: "⚙️" },
      { id: "ambient", label: "Ambient / Dreamy", icon: "☁️" },
      { id: "horror", label: "Horror / Tension", icon: "😱" },
      { id: "minimal", label: "Minimal / Subtle", icon: "🤫" },
      { id: "retro", label: "Retro / Analog", icon: "📻" },
    ],
  },
};

const ROLE_LIST: RoleId[] = [
  "director",
  "editor",
  "animator",
  "colorist",
  "vfx_artist",
  "sound_designer",
];

// ─── Deliverable Formats ───
const DELIVERABLE_FORMATS = [
  { id: "mp4", label: "MP4", icon: "📹" },
  { id: "mov", label: "MOV / ProRes", icon: "🎞️" },
  { id: "webm", label: "WebM", icon: "🌐" },
  { id: "gif", label: "GIF", icon: "🔄" },
  { id: "png-seq", label: "PNG Sequence", icon: "🖼️" },
  { id: "raw", label: "RAW Project Files", icon: "📂" },
];

// ─── Resolution Options ───
const RESOLUTIONS = [
  { id: "720p", label: "720p HD" },
  { id: "1080p", label: "1080p Full HD" },
  { id: "2k", label: "2K" },
  { id: "4k", label: "4K UHD" },
  { id: "6k", label: "6K+" },
];

// ─── Aspect Ratio Options ───
const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9 (Landscape)", icon: "🖥️" },
  { id: "9:16", label: "9:16 (Vertical)", icon: "📱" },
  { id: "1:1", label: "1:1 (Square)", icon: "⬜" },
  { id: "21:9", label: "21:9 (Ultra-wide)", icon: "🎬" },
  { id: "4:3", label: "4:3 (Classic)", icon: "📺" },
];

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
export default function VersaVidsStudio() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isAuthed = !!(user && user.id);

  // ─── Role & Form state ───
  const [selectedRole, setSelectedRole] = useState<RoleId>("director");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [requestCategory, setRequestCategory] = useState("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["mp4"]);
  const [resolution, setResolution] = useState("4k");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">(
    "normal",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const role = ROLE_CONFIG[selectedRole];

  const toggleFormat = useCallback((id: string) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
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
    if (!prompt && !requestCategory) {
      toast({
        title: "Share your vision",
        description: "Add a brief or select a project type to get started",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = csrfMeta?.getAttribute("content") || "";

      const res = await fetch("/api/versavids/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          title: `${role.label} — ${requestCategory || "Custom Project"}`,
          description: prompt,
          project_type: requestCategory || "custom",
          genre: genre || null,
          budget: budget ? parseFloat(budget) : null,
          deadline: deadline || null,
          priority,
          tags: selectedFormats,
          reference_urls: [],
          mood: genre || null,
          target_audience: null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      toast({
        title: "🎬 Project Submitted!",
        description: `Your ${role.label} project has been posted. A verified videaste will review your brief shortly.`,
      });

      // Reset form
      setPrompt("");
      setRequestCategory("");
      setGenre("");
      setBudget("");
      setDeadline("");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to submit project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthed,
    prompt,
    requestCategory,
    genre,
    budget,
    deadline,
    priority,
    selectedFormats,
    toast,
    role.label,
  ]);

  return (
    <MusicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* ─── Auth Gate Wildcard Popup ─── */}
        <Dialog open={showAuthGate} onOpenChange={setShowAuthGate}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0512] border border-amber-500/20 rounded-2xl">
            <div className="relative p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-600/10 via-transparent to-orange-600/5" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  🎬 Creator Access Required
                </h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">
                  Sign in or register to submit video projects and connect with
                  verified videastes on VersaVids.
                </p>
                <motion.button
                  onClick={() => {
                    setShowAuthGate(false);
                    navigate("/artist-portal/welcome");
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Get Authenticated
                </motion.button>
                <p className="text-white/25 text-xs mt-4">
                  Free to register · Verified videastes get priority placement
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
            VersaVids Studio
          </h1>
          <p className="mt-3 text-white/40 text-base sm:text-lg">
            Connect with verified videastes for sur-mesure video production
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[10px] font-bold tracking-widest text-amber-400/60 uppercase">
              Video Production by Verso Air™
            </span>
            <span className="px-1.5 py-0.5 text-[8px] font-black tracking-wider rounded bg-gradient-to-r from-amber-500 to-amber-600 text-black uppercase">
              GODS
            </span>
          </div>
        </motion.div>

        {/* ─── Role Selector ─── */}
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
            <span>📝</span> Your Creative Brief
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={role.briefPlaceholder}
            rows={4}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-white/25 text-base resize-none focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          {/* Quick Submit — auth gated */}
          <div className="flex justify-end mt-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl border transition-all ${
                isAuthed
                  ? "bg-white/[0.06] border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15]"
                  : "bg-white/[0.02] border-white/[0.05] text-white/25 cursor-not-allowed"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              whileHover={isAuthed ? { scale: 1.02 } : {}}
              whileTap={isAuthed ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isAuthed ? (
                <Send className="w-4 h-4 text-amber-400" />
              ) : (
                <Lock className="w-4 h-4 text-white/20" />
              )}
              <span className="font-medium text-sm">
                {isSubmitting
                  ? "Sending..."
                  : isAuthed
                    ? "Quick Submit"
                    : "Sign in to Submit"}
              </span>
            </motion.button>
          </div>
          {/* Brief examples */}
          <div className="flex items-start gap-2 mt-4">
            <Lightbulb className="w-4 h-4 text-amber-400/50 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-2">
              {role.briefExamples.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs hover:text-white/60 hover:bg-white/[0.07] transition-all"
                >
                  {s.length > 60 ? s.slice(0, 60) + "…" : s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─── Genre / Visual Style ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>🎨</span> Visual Style
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {role.genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(genre === g.id ? "" : g.id)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                  genre === g.id
                    ? "bg-amber-500/15 border-amber-500/40 text-white shadow-lg shadow-amber-500/10"
                    : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                <span className="text-[11px] font-medium">{g.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Aspect Ratio ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>📐</span> Aspect Ratio
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                onClick={() => setAspectRatio(ar.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
                  aspectRatio === ar.id
                    ? "bg-amber-500/15 border-amber-500/40 text-white"
                    : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05]"
                }`}
              >
                <span className="text-lg">{ar.icon}</span>
                <span className="text-[10px] font-medium">{ar.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Resolution & Deliverable Formats ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <span>📹</span> Output Specs
          </h2>
          {/* Resolution */}
          <div className="mb-4">
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">
              Resolution
            </p>
            <div className="flex flex-wrap gap-2">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setResolution(r.id)}
                  className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
                    resolution === r.id
                      ? "bg-amber-500/20 border-amber-500/40 text-white"
                      : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {/* Formats */}
          <div>
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">
              Deliverable Formats
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DELIVERABLE_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFormat(f.id)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
                    selectedFormats.includes(f.id)
                      ? "bg-amber-500/15 border-amber-500/40 text-white"
                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-base">{f.icon}</span>
                  <span className="text-[10px] font-medium">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ─── Advanced: Budget, Deadline, Priority ─── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-10"
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-base font-bold text-white mb-4 hover:text-amber-300 transition-colors"
          >
            <span>⚙️</span> Advanced Options
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Budget */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1 block">
                    Budget (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-amber-500/40"
                    />
                  </div>
                </div>
                {/* Deadline */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1 block">
                    Deadline
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/40 [color-scheme:dark]"
                    />
                  </div>
                </div>
                {/* Priority */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-1 block">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {(["normal", "high", "urgent"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`px-4 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                          priority === p
                            ? p === "urgent"
                              ? "bg-red-500/20 border-red-500/40 text-red-300"
                              : p === "high"
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                : "bg-white/10 border-white/20 text-white"
                            : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60"
                        }`}
                      >
                        {p === "urgent" ? "🔥 " : p === "high" ? "⚡ " : ""}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ─── Targeted Search Info ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
        >
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Videaste Search</p>
              <p className="text-xs text-white/40 mt-1">
                <strong className="text-white/60">General Inquiry</strong> —
                Submit to our open pool of verified videastes. Free for all
                users.
              </p>
              <p className="text-xs text-white/30 mt-1">
                <strong className="text-amber-400/80">
                  🔒 Targeted Search
                </strong>{" "}
                — Browse and contact specific verified videastes directly.
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
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isAuthed
                ? `bg-gradient-to-r ${role.color} text-white shadow-amber-500/20 hover:shadow-amber-500/30`
                : "bg-white/[0.04] border border-white/[0.08] text-white/30 cursor-not-allowed"
            }`}
            whileHover={isAuthed ? { scale: 1.01 } : {}}
            whileTap={isAuthed ? { scale: 0.99 } : {}}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending your brief…
              </>
            ) : isAuthed ? (
              <>
                <Send className="w-5 h-5" />
                Submit Video Project
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Sign in to Submit
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

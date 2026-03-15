import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Search,
  Copy,
  Eye,
  EyeOff,
  LogIn,
  X,
  Shield,
  ShieldCheck,
  Fingerprint,
  Terminal,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Zap,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  Database,
  Server,
  Key,
  Hash,
  Globe,
  Users,
  Crown,
  Wrench,
  ShoppingCart,
  User,
  Activity,
  RefreshCw,
  ArrowUpRight,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Code2,
  FileCode,
  Layers,
  Route,
  Plug,
  Mail,
  CreditCard,
  Bot,
  Bell,
  FileText,
  Table2,
  Settings,
  Radio,
  Gauge,
  Package,
  GitBranch,
  MonitorSmartphone,
  Palette,
  MapPin,
  BookOpen,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  Blocks,
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
  UserCog,
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  ShieldAlert,
  Banknote,
  Wallet,
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  PieChart,
  LineChart,
  CircleDollarSign,
  Timer,
  Percent,
  Ban,
  RotateCcw,
  Send,
  Eye as EyeIcon2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  CREDENTIALS,
  Credential,
  searchCredentials,
  getCredentialsByRole,
} from "@/pages/passwd";

// ═══════════════════════════════════════════════════════════
// 🎨 CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════

const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";

const ROLE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    label: string;
    gradient: string;
    glow: string;
    ring: string;
  }
> = {
  superuser: {
    icon: <Crown className="h-4 w-4" />,
    label: "SUPERUSER",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    glow: "shadow-red-500/20",
    ring: "ring-red-500/30",
  },
  admin: {
    icon: <Shield className="h-4 w-4" />,
    label: "ADMIN",
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
    glow: "shadow-blue-500/20",
    ring: "ring-blue-500/30",
  },
  moderator: {
    icon: <Wrench className="h-4 w-4" />,
    label: "MODERATOR",
    gradient: "from-teal-500 via-emerald-500 to-green-500",
    glow: "shadow-teal-500/20",
    ring: "ring-teal-500/30",
  },
  "business-owner": {
    icon: <ShoppingCart className="h-4 w-4" />,
    label: "BIZ OWNER",
    gradient: "from-amber-500 via-orange-500 to-yellow-500",
    glow: "shadow-amber-500/20",
    ring: "ring-amber-500/30",
  },
  user: {
    icon: <User className="h-4 w-4" />,
    label: "USER",
    gradient: "from-slate-400 via-gray-400 to-zinc-400",
    glow: "shadow-slate-400/20",
    ring: "ring-slate-400/30",
  },
};

const SECTOR_EMOJIS: Record<string, string> = {
  commerce: "🛍️",
  hotellerie: "🏨",
  batiment: "🏗️",
  automobile: "🚗",
  sante: "🏥",
  alimentation: "🍽️",
  administration: "🏛️",
};

// ═══════════════════════════════════════════════════════════
// 🌧️ MATRIX RAIN BACKGROUND
// ═══════════════════════════════════════════════════════════

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const columns = Math.floor(canvas.width / 16);
    const drops: number[] = Array(columns)
      .fill(1)
      .map(() => Math.random() * -100);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f03";
      ctx.font = "14px monospace";

      for (let i = 0; i < drops.length; i++) {
        const char =
          MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillStyle = `rgba(0, ${150 + Math.random() * 105}, 0, ${0.15 + Math.random() * 0.1})`;
        ctx.fillText(char, i * 16, drops[i] * 16);

        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-40"
    />
  );
}

// ═══════════════════════════════════════════════════════════
// 🔒 ACCESS DENIED SCREEN
// ═══════════════════════════════════════════════════════════

function AccessDenied() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
      <MatrixRain />
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 100 }}
        className="relative z-10 text-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px rgba(239,68,68,0.3)",
              "0 0 60px rgba(239,68,68,0.6)",
              "0 0 20px rgba(239,68,68,0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center mx-auto mb-8"
        >
          <Lock className="w-16 h-16 text-red-500" />
        </motion.div>

        <motion.h1
          className={`text-5xl font-black text-red-500 mb-4 font-mono tracking-wider ${glitch ? "translate-x-1 skew-x-2" : ""}`}
          style={{
            textShadow: glitch
              ? "3px 0 cyan, -3px 0 red"
              : "0 0 30px rgba(239,68,68,0.5)",
          }}
        >
          ACCESS DENIED
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-red-400/60 font-mono text-sm mb-2"
        >
          CLEARANCE LEVEL: INSUFFICIENT
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-red-400/40 font-mono text-xs"
        >
          SUPERUSER AUTHORIZATION REQUIRED
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-12"
        >
          <a href="/">
            <Button
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-950/50 font-mono"
            >
              ← RETURN TO SAFETY
            </Button>
          </a>
        </motion.div>

        {/* Scan lines */}
        <div
          className="fixed inset-0 pointer-events-none z-20 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
          }}
        />
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔓 BIOMETRIC GATE ANIMATION
// ═══════════════════════════════════════════════════════════

function BiometricGate({ onComplete }: { onComplete: () => void }) {
  // ── Auto-unlock via URL param: ?key=PASSPHRASE ──
  const VAULT_PASSPHRASE = "verso2026$root";

  const [phase, setPhase] = useState<
    "password" | "scanning" | "verifying" | "granted" | "denied"
  >("password");
  const [scanProgress, setScanProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [passwordInput, setPasswordInput] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check URL param on mount — auto-unlock if ?key= matches
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get("key");
    if (urlKey === VAULT_PASSPHRASE) {
      // Clean the URL so the password doesn't stay visible
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      startUnlockSequence();
    } else {
      // Focus password input
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, []);

  const logs = [
    "$ sudo vault --authenticate",
    "→ Passphrase accepted...",
    "→ Fingerprint hash: 9f3a...c7e2",
    "→ Retinal pattern: MATCH",
    "→ Neural signature: VERIFIED",
    "→ Clearance level: SUPERUSER ██████████ ✓",
    "→ Decrypting credential store...",
    "→ AES-256-GCM cipher unlocked",
    "→ Loading 1 credential record...",
    "✓ ACCESS GRANTED — Welcome back, Commander",
  ];

  function startUnlockSequence() {
    setPhase("scanning");
    let lineIdx = 0;
    const addLine = () => {
      if (lineIdx >= logs.length) {
        setPhase("granted");
        setScanProgress(100);
        setTimeout(() => onComplete(), 800);
        return;
      }
      const currentLine = logs[lineIdx];
      if (currentLine) {
        setLogLines((prev) => [...prev, currentLine]);
      }
      lineIdx++;
      if (lineIdx === 4) setPhase("verifying");
      setScanProgress((lineIdx / logs.length) * 100);
      setTimeout(addLine, 150 + Math.random() * 200);
    };
    setTimeout(addLine, 400);
  }

  function handlePasswordSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (passwordInput === VAULT_PASSPHRASE) {
      startUnlockSequence();
    } else {
      setAttempts((a) => a + 1);
      setShake(true);
      setPhase("denied");
      setTimeout(() => {
        setShake(false);
        setPhase("password");
        setPasswordInput("");
        inputRef.current?.focus();
      }, 1500);
    }
  }

  // Password entry screen
  if (phase === "password" || phase === "denied") {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
        <MatrixRain />
        <div className="relative z-10 w-full max-w-md px-6">
          {/* Lock icon */}
          <motion.div className="flex justify-center mb-8">
            <motion.div
              animate={{
                boxShadow:
                  phase === "denied"
                    ? "0 0 60px rgba(239,68,68,0.5)"
                    : [
                        "0 0 20px rgba(34,197,94,0.2)",
                        "0 0 50px rgba(34,197,94,0.4)",
                        "0 0 20px rgba(34,197,94,0.2)",
                      ],
              }}
              transition={
                phase === "denied"
                  ? { duration: 0.3 }
                  : { duration: 1.5, repeat: Infinity }
              }
              className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
                phase === "denied"
                  ? "border-red-400 bg-red-500/10"
                  : "border-green-600 bg-green-500/5"
              }`}
            >
              <Lock
                className={`w-12 h-12 ${phase === "denied" ? "text-red-400" : "text-green-500"}`}
              />
            </motion.div>
          </motion.div>

          {/* Terminal window */}
          <motion.div
            animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.5 }}
            className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-xs"
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-500 ml-2">vault-auth — zsh</span>
            </div>

            <div className="text-gray-400 mb-1">
              $ sudo vault --authenticate
            </div>
            <div className="text-cyan-400 mb-3">
              → Vault requires passphrase to proceed
            </div>

            {phase === "denied" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 mb-3"
              >
                ✗ ACCESS DENIED — Invalid passphrase{" "}
                {attempts > 2 ? `(${attempts} failed attempts)` : ""}
              </motion.div>
            )}

            <form onSubmit={handlePasswordSubmit} className="flex gap-2">
              <div className="flex-1 flex items-center bg-black/50 border border-gray-700 rounded px-3 py-2 focus-within:border-green-600/60 transition-colors">
                <span className="text-green-500 mr-2">❯</span>
                <input
                  ref={inputRef}
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter vault passphrase..."
                  className="bg-transparent text-green-400 placeholder-gray-600 outline-none flex-1 text-sm font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                type="submit"
                disabled={!passwordInput}
                className="px-4 py-2 bg-green-600/20 border border-green-700/50 text-green-400 rounded hover:bg-green-600/30 hover:border-green-500/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-mono font-bold"
              >
                UNLOCK
              </button>
            </form>

            <div className="mt-3 text-gray-600 text-[10px]">
              <span className="text-gray-700">TIP:</span> Bookmark with{" "}
              <span className="text-gray-500">?key=passphrase</span> for instant
              access
            </div>
          </motion.div>
        </div>

        {/* Scan lines overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-20 opacity-[0.02]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)",
          }}
        />
      </div>
    );
  }

  // Unlock animation (scanning → verifying → granted)
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      <MatrixRain />
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Fingerprint scanner */}
        <motion.div className="flex justify-center mb-8">
          <motion.div
            animate={{
              boxShadow:
                phase === "granted"
                  ? "0 0 80px rgba(34,197,94,0.5)"
                  : phase === "verifying"
                    ? "0 0 40px rgba(234,179,8,0.4)"
                    : [
                        "0 0 20px rgba(34,197,94,0.2)",
                        "0 0 50px rgba(34,197,94,0.4)",
                        "0 0 20px rgba(34,197,94,0.2)",
                      ],
            }}
            transition={
              phase === "scanning"
                ? { duration: 1.5, repeat: Infinity }
                : { duration: 0.5 }
            }
            className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
              phase === "granted"
                ? "border-green-400 bg-green-500/10"
                : phase === "verifying"
                  ? "border-yellow-400 bg-yellow-500/10"
                  : "border-green-600 bg-green-500/5"
            }`}
          >
            {phase === "granted" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                <ShieldCheck className="w-12 h-12 text-green-400" />
              </motion.div>
            ) : (
              <Fingerprint
                className={`w-12 h-12 ${phase === "verifying" ? "text-yellow-400" : "text-green-500"}`}
              />
            )}
          </motion.div>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                phase === "granted"
                  ? "bg-green-500"
                  : phase === "verifying"
                    ? "bg-yellow-500"
                    : "bg-green-600"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-xs font-mono mt-2 text-gray-500">
            {phase === "granted"
              ? "ACCESS GRANTED"
              : phase === "verifying"
                ? "VERIFYING IDENTITY..."
                : "SCANNING..."}
          </p>
        </div>

        {/* Terminal log */}
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-xs max-h-64 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-500 ml-2">vault-auth — zsh</span>
          </div>
          {logLines.filter(Boolean).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-1 ${
                line.startsWith("✓")
                  ? "text-green-400"
                  : line.startsWith("$")
                    ? "text-cyan-400"
                    : "text-gray-400"
              }`}
            >
              {line}
            </motion.div>
          ))}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.7, repeat: Infinity }}
            className="text-green-400"
          >
            █
          </motion.span>
        </div>
      </div>

      {/* Scan lines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-20 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🃏 CREDENTIAL CARD
// ═══════════════════════════════════════════════════════════

function CredentialCard({
  credential,
  index,
  copiedId,
  showPasswords,
  onCopy,
  onTogglePassword,
  onQuickLogin,
}: {
  credential: Credential;
  index: number;
  copiedId: string | null;
  showPasswords: Record<string, boolean>;
  onCopy: (text: string, id: string) => void;
  onTogglePassword: (id: string) => void;
  onQuickLogin: (cred: Credential) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const roleConfig = ROLE_CONFIG[credential.role] || ROLE_CONFIG.user;
  const sectorEmoji = credential.sector
    ? SECTOR_EMOJIS[credential.sector] || "📦"
    : null;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-4, 4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ delay: index * 0.04, type: "spring", damping: 20 }}
      style={{ rotateX, rotateY, perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group"
    >
      <div
        className={`relative rounded-xl overflow-hidden transition-shadow duration-300 ${
          isHovered ? `shadow-2xl ${roleConfig.glow}` : "shadow-lg"
        }`}
      >
        {/* Gradient border effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${roleConfig.gradient} opacity-[0.15] group-hover:opacity-25 transition-opacity`}
        />

        <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
          {/* Card header */}
          <div className="p-5 pb-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <motion.span
                  className="text-2xl"
                  animate={
                    isHovered
                      ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                >
                  {credential.icon}
                </motion.span>
                <div>
                  <h3 className="text-white font-bold text-sm leading-tight">
                    {credential.firstName} {credential.lastName}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[160px]">
                    {credential.businessName}
                  </p>
                </div>
              </div>

              {/* Role badge */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${roleConfig.gradient} bg-opacity-10`}
              >
                <span className="text-white/80">{roleConfig.icon}</span>
                <span className="text-[10px] font-bold text-white/90 tracking-wider">
                  {roleConfig.label}
                </span>
              </div>
            </div>

            {/* Sector tag */}
            {sectorEmoji && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs">{sectorEmoji}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {credential.sector}
                </span>
              </div>
            )}

            <p className="text-gray-500 text-[11px] leading-relaxed">
              {credential.description}
            </p>
          </div>

          {/* Divider */}
          <div
            className={`h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mx-4`}
          />

          {/* Credential fields */}
          <div className="p-5 pt-3 space-y-2.5">
            {/* Username */}
            <CredentialField
              label="USERNAME"
              value={credential.username}
              copyId={`user-${credential.id}`}
              copiedId={copiedId}
              onCopy={onCopy}
            />

            {/* Email */}
            <CredentialField
              label="EMAIL"
              value={credential.email}
              copyId={`email-${credential.id}`}
              copiedId={copiedId}
              onCopy={onCopy}
            />

            {/* Password */}
            <div>
              <label className="text-gray-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <Key className="h-2.5 w-2.5" /> PASSWORD
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                <code
                  className={`flex-1 bg-black/50 border border-gray-800 px-2.5 py-1.5 rounded-md text-xs font-mono truncate transition-colors ${
                    showPasswords[credential.id]
                      ? "text-green-400"
                      : "text-gray-600"
                  }`}
                >
                  {showPasswords[credential.id]
                    ? credential.password
                    : "•".repeat(credential.password.length)}
                </code>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onTogglePassword(credential.id)}
                  className="p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPasswords[credential.id] ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </motion.button>
                <CopyButton
                  onClick={() =>
                    onCopy(credential.password, `pass-${credential.id}`)
                  }
                  isCopied={copiedId === `pass-${credential.id}`}
                />
              </div>
            </div>
          </div>

          {/* Action footer */}
          <div className="px-5 pb-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onQuickLogin(credential)}
              className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${roleConfig.gradient} text-white font-semibold text-xs flex items-center justify-center gap-2 opacity-80 hover:opacity-100 transition-opacity`}
            >
              <Zap className="h-3.5 w-3.5" />
              QUICK LOGIN
              <ArrowUpRight className="h-3 w-3" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CredentialField({
  label,
  value,
  copyId,
  copiedId,
  onCopy,
}: {
  label: string;
  value: string;
  copyId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div>
      <label className="text-gray-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
        {label === "USERNAME" ? (
          <User className="h-2.5 w-2.5" />
        ) : (
          <Hash className="h-2.5 w-2.5" />
        )}
        {label}
      </label>
      <div className="flex items-center gap-1.5 mt-1">
        <code className="flex-1 bg-black/50 border border-gray-800 text-green-400/80 px-2.5 py-1.5 rounded-md text-xs font-mono truncate">
          {value}
        </code>
        <CopyButton
          onClick={() => onCopy(value, copyId)}
          isCopied={copiedId === copyId}
        />
      </div>
    </div>
  );
}

function CopyButton({
  onClick,
  isCopied,
}: {
  onClick: () => void;
  isCopied: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-all duration-200 ${
        isCopied
          ? "bg-green-500/20 text-green-400"
          : "hover:bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className="h-3.5 w-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 STATS HEADER
// ═══════════════════════════════════════════════════════════

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
      <Clock className="h-3.5 w-3.5 text-green-500" />
      <span>{time.toLocaleTimeString("en-US", { hour12: false })}</span>
      <span className="text-gray-700">|</span>
      <span className="text-gray-500">
        {time.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    </div>
  );
}

function AnimatedCounter({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      current = Math.min(current + step, value);
      setCount(current);
      if (current >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex items-center gap-3 bg-gray-900/50 border border-gray-800/50 rounded-lg px-4 py-2.5">
      <div className="text-green-500/70">{icon}</div>
      <div>
        <div className="text-white font-bold text-lg font-mono tabular-nums">
          {count}
        </div>
        <div className="text-gray-500 text-[10px] uppercase tracking-wider">
          {label}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// �️ COMMAND CENTER — Full platform technical reference
// ═══════════════════════════════════════════════════════════

type TabId =
  | "overview"
  | "routes"
  | "api"
  | "database"
  | "auth"
  | "services"
  | "env"
  | "stack"
  | "users"
  | "finance";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "SYSTEM", icon: <Gauge className="h-3.5 w-3.5" /> },
  { id: "users", label: "USERS", icon: <Users className="h-3.5 w-3.5" /> },
  {
    id: "finance",
    label: "FINANCE",
    icon: <DollarSign className="h-3.5 w-3.5" />,
  },
  { id: "routes", label: "ROUTES", icon: <Route className="h-3.5 w-3.5" /> },
  { id: "api", label: "API", icon: <Plug className="h-3.5 w-3.5" /> },
  {
    id: "database",
    label: "DATABASE",
    icon: <Database className="h-3.5 w-3.5" />,
  },
  { id: "auth", label: "AUTH", icon: <Shield className="h-3.5 w-3.5" /> },
  {
    id: "services",
    label: "SERVICES",
    icon: <Blocks className="h-3.5 w-3.5" />,
  },
  { id: "env", label: "ENV", icon: <Settings className="h-3.5 w-3.5" /> },
  { id: "stack", label: "STACK", icon: <Package className="h-3.5 w-3.5" /> },
];

function SectionBlock({
  title,
  icon,
  children,
  color = "green",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color?: string;
}) {
  const [open, setOpen] = useState(true);
  const borderColor =
    {
      green: "border-green-900/50",
      blue: "border-blue-900/50",
      amber: "border-amber-900/50",
      red: "border-red-900/50",
      purple: "border-purple-900/50",
      cyan: "border-cyan-900/50",
    }[color] || "border-green-900/50";
  const headGrad =
    {
      green: "from-green-500 to-emerald-600",
      blue: "from-blue-500 to-cyan-600",
      amber: "from-amber-500 to-orange-600",
      red: "from-red-500 to-rose-600",
      purple: "from-purple-500 to-violet-600",
      cyan: "from-cyan-500 to-teal-600",
    }[color] || "from-green-500 to-emerald-600";

  return (
    <div
      className={`border ${borderColor} rounded-xl overflow-hidden bg-gray-950/50`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${headGrad} flex items-center justify-center`}
          >
            {icon}
          </div>
          <span className="font-mono font-bold text-sm text-white">
            {title}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4 text-gray-600" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyable,
  mono = true,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/30 last:border-0 gap-4">
      <span className="text-gray-500 text-[11px] font-mono flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`text-green-400/80 text-[11px] truncate ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={doCopy}
            className="flex-shrink-0 text-gray-600 hover:text-green-400 transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function RouteLink({
  path,
  label,
  emoji,
}: {
  path: string;
  label: string;
  emoji: string;
}) {
  return (
    <a
      href={path}
      className="group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-gray-800/50 transition-colors"
    >
      <span className="text-sm flex-shrink-0">{emoji}</span>
      <code className="text-[11px] text-green-500/70 font-mono flex-1 truncate group-hover:text-green-400 transition-colors">
        {path}
      </code>
      <span className="text-[10px] text-gray-600 hidden sm:block">{label}</span>
      <ExternalLink className="h-2.5 w-2.5 text-gray-700 group-hover:text-green-500 flex-shrink-0 transition-colors" />
    </a>
  );
}

function ApiEndpoint({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "text-emerald-400 bg-emerald-500/10",
    POST: "text-blue-400 bg-blue-500/10",
    PUT: "text-amber-400 bg-amber-500/10",
    DELETE: "text-red-400 bg-red-500/10",
    PATCH: "text-purple-400 bg-purple-500/10",
  };
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-800/20 last:border-0">
      <span
        className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${methodColors[method] || "text-gray-400 bg-gray-500/10"} flex-shrink-0 mt-0.5`}
      >
        {method}
      </span>
      <code className="text-[11px] text-green-400/70 font-mono flex-shrink-0">
        {path}
      </code>
      <span className="text-[10px] text-gray-600 ml-auto text-right">
        {desc}
      </span>
    </div>
  );
}

function DbTable({ name, columns }: { name: string; columns: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-800/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/30 transition-colors text-left"
      >
        <Table2 className="h-3 w-3 text-cyan-500 flex-shrink-0" />
        <code className="text-[11px] text-cyan-400 font-mono font-bold">
          {name}
        </code>
        <ChevronRight
          className={`h-3 w-3 text-gray-600 ml-auto transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-2 text-[10px] text-gray-500 font-mono leading-relaxed border-t border-gray-800/30 pt-2">
          {columns}
        </div>
      )}
    </div>
  );
}

function LiveHealthPanel() {
  const [health, setHealth] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [h, d] = await Promise.all([
          fetch("/api/health")
            .then((r) => r.json())
            .catch(() => null),
          fetch("/api/database/stats")
            .then((r) => r.json())
            .catch(() => null),
        ]);
        setHealth(h);
        setDbStats(d);
      } catch {
        /* ignore */
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-green-500" />
          <span className="text-[10px] text-gray-500 font-mono">SERVER</span>
        </div>
        <div className="text-lg font-bold text-green-400 font-mono">
          {health?.status === "ok" || health?.status === "healthy"
            ? "ONLINE"
            : "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Port 5003</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-3.5 w-3.5 text-cyan-500" />
          <span className="text-[10px] text-gray-500 font-mono">DATABASE</span>
        </div>
        <div className="text-lg font-bold text-cyan-400 font-mono">
          {dbStats?.businessCount ?? "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Businesses</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-[10px] text-gray-500 font-mono">USERS</span>
        </div>
        <div className="text-lg font-bold text-purple-400 font-mono">
          {dbStats?.userCount ?? "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Registered</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] text-gray-500 font-mono">
            CATEGORIES
          </span>
        </div>
        <div className="text-lg font-bold text-amber-400 font-mono">
          {dbStats?.categoryCount ?? "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Active</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 👥 USERS CONTROL PANEL — Full user/subscriber management
// ═══════════════════════════════════════════════════════════

interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialTier: string | null;
  trialExpiresAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  premiumExpiresAt: string | null;
}

function UserRow({
  u,
  onAction,
}: {
  u: ManagedUser;
  onAction: (action: string, id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleBadge: Record<string, string> = {
    superuser: "bg-red-500/20 text-red-400 border-red-800/50",
    admin: "bg-amber-500/20 text-amber-400 border-amber-800/50",
    moderator: "bg-blue-500/20 text-blue-400 border-blue-800/50",
    business_owner: "bg-purple-500/20 text-purple-400 border-purple-800/50",
    user: "bg-gray-500/20 text-gray-400 border-gray-800/50",
  };
  const tierBadge: Record<string, string> = {
    free: "text-gray-500",
    essential: "text-blue-400",
    verified: "text-green-400",
    max: "text-amber-400",
    enterprise: "text-red-400",
  };
  const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
  const isTrialing =
    u.trialTier && u.trialExpiresAt && new Date(u.trialExpiresAt) > new Date();

  return (
    <div className="border border-gray-800/40 rounded-lg overflow-hidden bg-gray-950/30 hover:bg-gray-900/40 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isLocked ? "bg-red-500/20 text-red-400" : u.isVerified ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-500"}`}
        >
          {isLocked ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            u.username.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-mono font-bold truncate">
              {u.username}
            </span>
            <span
              className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${roleBadge[u.role] || roleBadge.user}`}
            >
              {u.role.toUpperCase()}
            </span>
            {u.isVerified && (
              <BadgeCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
            )}
            {isLocked && (
              <ShieldAlert className="h-3 w-3 text-red-400 flex-shrink-0" />
            )}
          </div>
          <div className="text-[10px] text-gray-600 font-mono truncate">
            {u.email}
          </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <div
            className={`text-[10px] font-mono font-bold ${tierBadge[u.subscriptionTier] || "text-gray-500"}`}
          >
            {u.subscriptionTier.toUpperCase()}
            {isTrialing ? ` (TRIAL: ${u.trialTier})` : ""}
          </div>
          <div className="text-[9px] text-gray-700 font-mono">
            {u.subscriptionStatus}
          </div>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 text-gray-600 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          className="border-t border-gray-800/30 px-4 py-3 space-y-3"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-gray-600">ID:</span>{" "}
              <span className="text-gray-400">{u.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Role:</span>{" "}
              <span className="text-gray-400">{u.role}</span>
            </div>
            <div>
              <span className="text-gray-600">Verified:</span>{" "}
              <span
                className={u.isVerified ? "text-green-400" : "text-red-400"}
              >
                {u.isVerified ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Tier:</span>{" "}
              <span
                className={tierBadge[u.subscriptionTier] || "text-gray-400"}
              >
                {u.subscriptionTier}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>{" "}
              <span className="text-gray-400">{u.subscriptionStatus}</span>
            </div>
            <div>
              <span className="text-gray-600">Failed:</span>{" "}
              <span
                className={
                  u.failedLoginAttempts > 0 ? "text-amber-400" : "text-gray-400"
                }
              >
                {u.failedLoginAttempts}
              </span>
            </div>
            {isLocked && (
              <div className="col-span-2">
                <span className="text-gray-600">Locked Until:</span>{" "}
                <span className="text-red-400">
                  {new Date(u.lockedUntil!).toLocaleString()}
                </span>
              </div>
            )}
            {u.premiumExpiresAt && (
              <div className="col-span-2">
                <span className="text-gray-600">Premium Expires:</span>{" "}
                <span className="text-amber-400">
                  {new Date(u.premiumExpiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {isTrialing && (
              <div className="col-span-2">
                <span className="text-gray-600">Trial:</span>{" "}
                <span className="text-cyan-400">
                  {u.trialTier} until{" "}
                  {new Date(u.trialExpiresAt!).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="col-span-2 sm:col-span-3">
              <span className="text-gray-600">Joined:</span>{" "}
              <span className="text-gray-400">
                {new Date(u.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800/30">
            {isLocked && (
              <button
                onClick={() => onAction("unlock", u.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-mono font-bold hover:bg-green-500/20 transition-colors border border-green-800/30"
              >
                <Unlock className="h-3 w-3" />
                UNLOCK
              </button>
            )}
            <button
              onClick={() => onAction("set-password", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-mono font-bold hover:bg-green-500/20 transition-colors border border-green-800/30"
            >
              <Key className="h-3 w-3" />
              SET PASSWORD
            </button>
            {!u.isVerified && (
              <button
                onClick={() => onAction("verify", u.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold hover:bg-emerald-500/20 transition-colors border border-emerald-800/30"
              >
                <BadgeCheck className="h-3 w-3" />
                VERIFY
              </button>
            )}
            <button
              onClick={() => onAction("force-reset", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold hover:bg-amber-500/20 transition-colors border border-amber-800/30"
            >
              <RotateCcw className="h-3 w-3" />
              FORCE RESET
            </button>
            <button
              onClick={() => onAction("role-change", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold hover:bg-blue-500/20 transition-colors border border-blue-800/30"
            >
              <UserCog className="h-3 w-3" />
              CHANGE ROLE
            </button>
            <button
              onClick={() => onAction("tier-change", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold hover:bg-purple-500/20 transition-colors border border-purple-800/30"
            >
              <Crown className="h-3 w-3" />
              SET TIER
            </button>
            <button
              onClick={() => onAction("send-email", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-mono font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-800/30"
            >
              <Send className="h-3 w-3" />
              EMAIL
            </button>
            <button
              onClick={() => onAction("delete", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-mono font-bold hover:bg-red-500/20 transition-colors border border-red-800/30"
            >
              <UserX className="h-3 w-3" />
              DELETE
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function UsersControlPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchUsers = async () => {
    try {
      // Try primary endpoint first
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (searchQ) params.set("search", searchQ);
      if (roleFilter !== "all") params.set("role", roleFilter);
      let res = await fetch(`/api/v1/admin/users?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      } else {
        // Fallback to superuser auth endpoint
        const fallback = await fetch("/auth/admin/users", {
          credentials: "include",
        });
        if (fallback.ok) {
          const data = await fallback.json();
          setUsers(data.users || []);
        }
      }
    } catch {
      // Last resort: try the auth admin endpoint
      try {
        const fallback = await fetch("/auth/admin/users", {
          credentials: "include",
        });
        if (fallback.ok) {
          const data = await fallback.json();
          setUsers(data.users || []);
        }
      } catch {
        /* offline */
      }
    }
    setLoading(false);
  };

  const fetchSecurity = async () => {
    try {
      const res = await fetch("/api/v1/admin/security/stats", {
        credentials: "include",
      });
      if (res.ok) setSecurityStats(await res.json());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSecurity();
  }, [page, searchQ, roleFilter]);

  const handleAction = async (action: string, userId: number) => {
    const user = users.find((u) => u.id === userId);
    const logMsg = (msg: string) =>
      setActionLog((prev) =>
        [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50),
      );

    // Helper: try primary endpoint, fallback to /auth/admin/* endpoints
    const tryAction = async (
      primaryUrl: string,
      primaryOpts: RequestInit,
      fallbackUrl: string,
      fallbackOpts: RequestInit,
    ): Promise<boolean> => {
      try {
        const res = await fetch(primaryUrl, {
          credentials: "include",
          ...primaryOpts,
        });
        if (res.ok) return true;
      } catch {
        /* primary failed */
      }
      try {
        const res = await fetch(fallbackUrl, {
          credentials: "include",
          ...fallbackOpts,
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    try {
      if (action === "unlock") {
        const ok = await tryAction(
          `/api/v1/admin/security/users/${userId}/unlock`,
          { method: "POST" },
          "/auth/admin/unlock-user",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          },
        );
        logMsg(
          ok
            ? `✓ Unlocked ${user?.username}`
            : `✗ Failed to unlock ${user?.username}`,
        );
      } else if (action === "set-password") {
        const newPassword = prompt(
          `Set new password for ${user?.username} (${user?.email})\n\nMin 8 characters:`,
        );
        if (!newPassword) return;
        if (newPassword.length < 8) {
          logMsg("✗ Password must be at least 8 characters");
          return;
        }
        const res = await fetch("/auth/admin/change-password", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, newPassword }),
        });
        logMsg(
          res.ok
            ? `✓ Password changed for ${user?.username} → new pwd set`
            : `✗ Failed to change password for ${user?.username}`,
        );
      } else if (action === "force-reset") {
        if (
          !confirm(
            `Force password reset for ${user?.username}? Their current password will be invalidated.`,
          )
        )
          return;
        const res = await fetch(
          `/api/v1/admin/security/users/${userId}/force-reset`,
          { method: "POST", credentials: "include" },
        );
        logMsg(
          res.ok
            ? `✓ Force-reset password for ${user?.username}`
            : `✗ Failed to reset ${user?.username}`,
        );
      } else if (action === "role-change") {
        const newRole = prompt(
          `Set role for ${user?.username}\n\nOptions: superuser, admin, moderator, business_owner, user`,
          user?.role,
        );
        if (!newRole) return;
        const ok = await tryAction(
          `/api/v1/admin/security/users/${userId}/role`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          },
          "/auth/admin/change-role",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, newRole }),
          },
        );
        logMsg(
          ok
            ? `✓ Changed ${user?.username} role → ${newRole}`
            : `✗ Failed to change role for ${user?.username}`,
        );
      } else if (action === "verify") {
        const res = await fetch("/auth/admin/verify-user", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        logMsg(
          res.ok
            ? `✓ Verified ${user?.username}`
            : `✗ Failed to verify ${user?.username}`,
        );
      } else if (action === "tier-change") {
        const newTier = prompt(
          `Set subscription tier for ${user?.username}\n\nOptions: free, essential, verified, max, enterprise`,
          user?.subscriptionTier,
        );
        if (!newTier) return;
        const res = await fetch(`/api/v1/admin/users/${userId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionTier: newTier }),
        });
        logMsg(
          res.ok
            ? `✓ Changed ${user?.username} tier → ${newTier}`
            : `✗ Failed to change tier for ${user?.username}`,
        );
      } else if (action === "send-email") {
        const subject = prompt(`Email subject for ${user?.email}:`);
        if (!subject) return;
        logMsg(
          `→ Email feature coming soon — would send to ${user?.email}: "${subject}"`,
        );
      } else if (action === "delete") {
        if (
          !confirm(
            `⚠️ PERMANENTLY delete user "${user?.username}" (${user?.email})?\n\nThis cannot be undone.`,
          )
        )
          return;
        const res = await fetch(`/api/v1/admin/users/${userId}`, {
          method: "DELETE",
          credentials: "include",
        });
        logMsg(
          res.ok
            ? `✓ Deleted user ${user?.username}`
            : `✗ Failed to delete ${user?.username}`,
        );
      }
      // Refresh data
      setTimeout(() => {
        fetchUsers();
        fetchSecurity();
      }, 500);
    } catch (err) {
      logMsg(`✗ Error: ${err}`);
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    if (tierFilter !== "all")
      list = list.filter((u) => u.subscriptionTier === tierFilter);
    return list;
  }, [users, tierFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      verified: users.filter((u) => u.isVerified).length,
      locked: users.filter(
        (u) => u.lockedUntil && new Date(u.lockedUntil) > new Date(),
      ).length,
      premium: users.filter((u) => u.subscriptionTier !== "free").length,
      trials: users.filter(
        (u) =>
          u.trialTier &&
          u.trialExpiresAt &&
          new Date(u.trialExpiresAt) > new Date(),
      ).length,
      roles: {
        superuser: users.filter((u) => u.role === "superuser").length,
        admin: users.filter((u) => u.role === "admin").length,
        moderator: users.filter((u) => u.role === "moderator").length,
        business_owner: users.filter((u) => u.role === "business_owner").length,
        user: users.filter((u) => u.role === "user").length,
      },
      tiers: {
        free: users.filter((u) => u.subscriptionTier === "free").length,
        essential: users.filter((u) => u.subscriptionTier === "essential")
          .length,
        verified: users.filter((u) => u.subscriptionTier === "verified").length,
        max: users.filter((u) => u.subscriptionTier === "max").length,
        enterprise: users.filter((u) => u.subscriptionTier === "enterprise")
          .length,
      },
    }),
    [users],
  );

  return (
    <>
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {[
          {
            label: "TOTAL",
            value: stats.total,
            icon: <Users className="h-3.5 w-3.5" />,
            color: "text-white",
          },
          {
            label: "VERIFIED",
            value: stats.verified,
            icon: <BadgeCheck className="h-3.5 w-3.5" />,
            color: "text-green-400",
          },
          {
            label: "PREMIUM",
            value: stats.premium,
            icon: <Crown className="h-3.5 w-3.5" />,
            color: "text-amber-400",
          },
          {
            label: "TRIALS",
            value: stats.trials,
            icon: <Timer className="h-3.5 w-3.5" />,
            color: "text-cyan-400",
          },
          {
            label: "LOCKED",
            value: stats.locked,
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
            color: "text-red-400",
          },
          {
            label: "SEC.ISSUES",
            value: securityStats?.lockedAccounts ?? 0,
            icon: <AlertTriangle className="h-3.5 w-3.5" />,
            color: "text-orange-400",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-2.5 text-center"
          >
            <div
              className={`flex items-center justify-center gap-1.5 ${s.color} mb-1`}
            >
              {s.icon}
              <span className="text-lg font-bold font-mono">{s.value}</span>
            </div>
            <div className="text-[9px] text-gray-600 font-mono">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role & Tier Breakdown */}
      <SectionBlock
        title="ROLE & TIER DISTRIBUTION"
        icon={<PieChart className="w-3.5 h-3.5 text-white" />}
        color="purple"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-500 font-mono mb-2 font-bold">
              ROLES
            </div>
            {Object.entries(stats.roles).map(([role, count]) => (
              <div
                key={role}
                className="flex items-center justify-between py-1 border-b border-gray-800/20 last:border-0"
              >
                <span className="text-[11px] text-gray-400 font-mono">
                  {role}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{
                        width: `${stats.total ? (count / stats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-green-400 font-mono font-bold w-6 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-mono mb-2 font-bold">
              SUBSCRIPTION TIERS
            </div>
            {Object.entries(stats.tiers).map(([tier, count]) => {
              const c =
                {
                  free: "from-gray-500 to-gray-600",
                  essential: "from-blue-500 to-cyan-600",
                  verified: "from-green-500 to-emerald-600",
                  max: "from-amber-500 to-orange-600",
                  enterprise: "from-red-500 to-rose-600",
                }[tier] || "from-gray-500 to-gray-600";
              return (
                <div
                  key={tier}
                  className="flex items-center justify-between py-1 border-b border-gray-800/20 last:border-0"
                >
                  <span className="text-[11px] text-gray-400 font-mono">
                    {tier}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${c} rounded-full`}
                        style={{
                          width: `${stats.total ? (count / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-green-400 font-mono font-bold w-6 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionBlock>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setPage(1);
            }}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-800/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-400 focus:outline-none focus:border-green-800/50"
        >
          <option value="all">All Roles</option>
          <option value="superuser">Superuser</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="business_owner">Business Owner</option>
          <option value="user">User</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-400 focus:outline-none focus:border-green-800/50"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="essential">Essential</option>
          <option value="verified">Verified</option>
          <option value="max">Max</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <button
          onClick={() => {
            fetchUsers();
            fetchSecurity();
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-[11px] font-mono font-bold hover:bg-green-500/20 transition-colors border border-green-800/30"
        >
          <RefreshCw className="h-3 w-3" />
          REFRESH
        </button>
      </div>

      {/* User List */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="text-center py-12 text-gray-600 font-mono text-sm">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-600 font-mono text-sm">
            No users found
          </div>
        ) : (
          filteredUsers.map((u) => (
            <UserRow key={u.id} u={u} onAction={handleAction} />
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-400 text-[11px] font-mono disabled:opacity-30 hover:bg-gray-800 transition-colors"
          >
            ← PREV
          </button>
          <span className="text-[11px] text-gray-500 font-mono">
            Page {page} • {filteredUsers.length} users shown
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={filteredUsers.length < pageSize}
            className="px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-400 text-[11px] font-mono disabled:opacity-30 hover:bg-gray-800 transition-colors"
          >
            NEXT →
          </button>
        </div>
      )}

      {/* Admin API Endpoints Reference */}
      <SectionBlock
        title="USER MANAGEMENT ENDPOINTS"
        icon={<UserCog className="w-3.5 h-3.5 text-white" />}
        color="blue"
      >
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/users"
          desc="List all users (paginated, search, role filter)"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/users"
          desc="Create user (admin-provisioned)"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/users/:id"
          desc="User detail + subscription + lock status"
        />
        <ApiEndpoint
          method="PUT"
          path="/api/v1/admin/users/:id"
          desc="Update user (role, tier, email, password)"
        />
        <ApiEndpoint
          method="DELETE"
          path="/api/v1/admin/users/:id"
          desc="Delete user (blocks admin/su deletion)"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/security/users"
          desc="All users with security status"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/security/users/:id/unlock"
          desc="Unlock locked account"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/security/users/:id/force-reset"
          desc="Invalidate password"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/security/users/:id/role"
          desc="Change user role"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/security/stats"
          desc="Security summary stats"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/roles"
          desc="All roles + permissions + user counts"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/roles"
          desc="Create custom role"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/roles/:id/assign"
          desc="Assign role to user"
        />
      </SectionBlock>

      {/* Subscription Control Reference */}
      <SectionBlock
        title="SUBSCRIPTION SYSTEM"
        icon={<Crown className="w-3.5 h-3.5 text-white" />}
        color="amber"
      >
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0 mb-3">
          <InfoRow
            label="Tiers"
            value="free → essential → verified → max → enterprise"
          />
          <InfoRow label="Trial Duration" value="7 days (one per account)" />
          <InfoRow label="Expiry Check" value="Daily cron (node-cron)" />
          <InfoRow
            label="Tier Middleware"
            value="requireSubscription(feature)"
          />
        </div>
        <div className="text-[10px] font-mono text-gray-500 mb-2 font-bold">
          TIER PRICING
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
          <InfoRow label="Essential" value="$29/mo · $290/yr" />
          <InfoRow label="Verified" value="$79/mo · $790/yr" />
          <InfoRow label="Max" value="$149/mo · $1,490/yr" />
          <InfoRow label="Enterprise" value="$499/mo · $4,990/yr" />
        </div>
        <div className="text-[10px] font-mono text-gray-500 mt-3 mb-2 font-bold">
          FEATURE GATES
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
          <InfoRow label="enhanced_listing" value="essential+" />
          <InfoRow label="analytics" value="verified+" />
          <InfoRow label="priority_support" value="verified+" />
          <InfoRow label="api_access" value="verified+" />
          <InfoRow label="custom_branding" value="max+" />
          <InfoRow label="advanced_analytics" value="max+" />
          <InfoRow label="bulk_operations" value="max+" />
          <InfoRow label="white_label" value="max+" />
          <InfoRow label="dedicated_support" value="max+" />
        </div>
      </SectionBlock>

      {/* Action Log */}
      {actionLog.length > 0 && (
        <SectionBlock
          title="ACTION LOG"
          icon={<Terminal className="w-3.5 h-3.5 text-white" />}
          color="green"
        >
          <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[10px] space-y-0.5">
            {actionLog.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes("✓")
                    ? "text-green-400"
                    : log.includes("✗")
                      ? "text-red-400"
                      : "text-gray-500"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 💰 FINANCE CONTROL PANEL — Payments, revenue, billing
// ═══════════════════════════════════════════════════════════

interface Transaction {
  id: string;
  userId: number | null;
  businessId: number | null;
  amount: string;
  type: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

function FinanceControlPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<
    "checking" | "active" | "inactive"
  >("checking");

  // ─── NGO POS STATE ──────────────────────────────────────────────
  const [posStats, setPosStats] = useState<any>(null);
  const [posCustomers, setPosCustomers] = useState<any[]>([]);
  const [posCharges, setPosCharges] = useState<any[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [chargeForm, setChargeForm] = useState({
    cardId: "",
    amount: "",
    description: "",
    category: "activity_fee",
    currency: "USD",
  });
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeResult, setChargeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [posView, setPosView] = useState<
    "dashboard" | "customers" | "terminal" | "history"
  >("dashboard");

  useEffect(() => {
    const load = async () => {
      try {
        const [txRes, statsRes] = await Promise.all([
          fetch("/api/v1/payments/billing-history?limit=50", {
            credentials: "include",
          }).catch(() => null),
          fetch("/api/database/stats", { credentials: "include" }).catch(
            () => null,
          ),
        ]);
        if (txRes?.ok) {
          const data = await txRes.json();
          setTransactions(Array.isArray(data) ? data : data.transactions || []);
        }
        if (statsRes?.ok) setDbStats(await statsRes.json());

        // Check Stripe
        try {
          const sRes = await fetch("/api/v1/payments/create-checkout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: "test", period: "test" }),
          });
          setStripeStatus(sRes.status === 503 ? "inactive" : "active");
        } catch {
          setStripeStatus("inactive");
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    load();
  }, []);

  // ─── POS DATA LOADER ────────────────────────────────────────────
  const loadPosData = async () => {
    setPosLoading(true);
    try {
      const [statsRes, custRes, chargesRes] = await Promise.all([
        fetch("/api/v1/payments/pos-stats", { credentials: "include" }).catch(
          () => null,
        ),
        fetch(
          `/api/v1/payments/customers?search=${encodeURIComponent(posSearch)}&limit=50`,
          { credentials: "include" },
        ).catch(() => null),
        fetch("/api/v1/payments/ngo-charges?limit=100", {
          credentials: "include",
        }).catch(() => null),
      ]);
      if (statsRes?.ok) setPosStats((await statsRes.json()).data);
      if (custRes?.ok) setPosCustomers((await custRes.json()).data || []);
      if (chargesRes?.ok) setPosCharges((await chargesRes.json()).data || []);
    } catch {
      /* silent */
    }
    setPosLoading(false);
  };

  useEffect(() => {
    loadPosData();
  }, [posSearch]);

  // ─── POS CHARGE HANDLER ──────────────────────────────────────────
  const handlePosCharge = async () => {
    if (!chargeForm.cardId || !chargeForm.amount) return;
    setChargeLoading(true);
    setChargeResult(null);
    try {
      const res = await fetch("/api/v1/payments/charge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: parseInt(chargeForm.cardId),
          amount: parseFloat(chargeForm.amount),
          currency: chargeForm.currency,
          description: chargeForm.description || "NGO Activity Charge",
          category: chargeForm.category,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChargeResult({
          success: true,
          message: `✅ Charged ${chargeForm.currency} ${parseFloat(chargeForm.amount).toFixed(2)} successfully! Intent: ${data.data?.paymentIntent?.id}`,
        });
        setChargeForm((prev) => ({ ...prev, amount: "", description: "" }));
        loadPosData(); // Refresh stats
      } else {
        setChargeResult({
          success: false,
          message: `❌ ${data.error || "Charge failed"}`,
        });
      }
    } catch (err: any) {
      setChargeResult({
        success: false,
        message: `❌ Network error: ${err.message}`,
      });
    }
    setChargeLoading(false);
  };

  // ─── POS REFUND HANDLER ──────────────────────────────────────────
  const handleRefund = async (chargeId: string) => {
    if (!confirm("Process refund for this charge?")) return;
    try {
      const res = await fetch("/api/v1/payments/refund", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      const data = await res.json();
      if (data.success) {
        loadPosData();
      } else {
        alert(data.error || "Refund failed");
      }
    } catch {
      alert("Network error");
    }
  };

  const totalRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + parseFloat(t.amount || "0"), 0),
    [transactions],
  );
  const pendingRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "pending")
        .reduce((s, t) => s + parseFloat(t.amount || "0"), 0),
    [transactions],
  );
  const failedCount = useMemo(
    () => transactions.filter((t) => t.status === "failed").length,
    [transactions],
  );
  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    transactions.forEach((t) => {
      if (!map[t.type]) map[t.type] = { count: 0, total: 0 };
      map[t.type].count++;
      map[t.type].total += parseFloat(t.amount || "0");
    });
    return map;
  }, [transactions]);

  return (
    <>
      {/* Revenue KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign className="h-4 w-4 text-green-500" />
            <span className="text-[10px] text-gray-500 font-mono">
              TOTAL REVENUE
            </span>
          </div>
          <div className="text-2xl font-black text-green-400 font-mono">
            $
            {totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {transactions.filter((t) => t.status === "completed").length}{" "}
            completed
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] text-gray-500 font-mono">PENDING</span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            $
            {pendingRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {transactions.filter((t) => t.status === "pending").length} pending
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-[10px] text-gray-500 font-mono">FAILED</span>
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {failedCount}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            payment failures
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard
              className={`h-4 w-4 ${stripeStatus === "active" ? "text-purple-500" : "text-gray-600"}`}
            />
            <span className="text-[10px] text-gray-500 font-mono">STRIPE</span>
          </div>
          <div
            className={`text-2xl font-black font-mono ${stripeStatus === "active" ? "text-purple-400" : stripeStatus === "inactive" ? "text-gray-600" : "text-gray-700"}`}
          >
            {stripeStatus === "active"
              ? "LIVE"
              : stripeStatus === "inactive"
                ? "OFF"
                : "..."}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {stripeStatus === "active"
              ? "Payments accepting"
              : "Set STRIPE_SECRET_KEY"}
          </div>
        </div>
      </div>

      {/* Stripe Integration */}
      <SectionBlock
        title="STRIPE PAYMENT GATEWAY"
        icon={<CreditCard className="w-3.5 h-3.5 text-white" />}
        color="purple"
      >
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
          <InfoRow label="SDK Version" value="Stripe 20.x" />
          <InfoRow label="API Version" value="2025-02-24.acacia" />
          <InfoRow
            label="Mode"
            value={
              stripeStatus === "active"
                ? "LIVE — accepting payments"
                : "DISABLED — no API key"
            }
          />
          <InfoRow
            label="Init Strategy"
            value="Lazy (only if STRIPE_SECRET_KEY set)"
          />
          <InfoRow label="Checkout Mode" value="payment (one-time)" />
          <InfoRow
            label="Webhook Events"
            value="checkout.session.completed, payment_intent.payment_failed"
          />
          <InfoRow
            label="Customer Portal"
            value="/api/v1/payments/create-portal → Stripe-hosted"
          />
          <InfoRow
            label="Webhook Body"
            value="Raw body via express.raw({ type: application/json })"
          />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-800/30">
          <div className="text-[10px] font-mono text-gray-500 mb-2 font-bold">
            ENVIRONMENT VARIABLES
          </div>
          <InfoRow
            label="STRIPE_SECRET_KEY"
            value={
              stripeStatus === "active"
                ? "sk_live_****** (configured)"
                : "NOT SET — payments disabled"
            }
          />
          <InfoRow
            label="STRIPE_WEBHOOK_SECRET"
            value="whsec_****** (optional, skips verify in dev)"
          />
          <InfoRow
            label="VITE_STRIPE_PUBLISHABLE_KEY"
            value="pk_****** (client-side)"
          />
        </div>
      </SectionBlock>

      {/* Pricing & Tier Revenue Model */}
      <SectionBlock
        title="SUBSCRIPTION PRICING MODEL"
        icon={<Banknote className="w-3.5 h-3.5 text-white" />}
        color="green"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800/50">
                <th className="text-left py-2 px-2">TIER</th>
                <th className="text-right py-2 px-2">MONTHLY</th>
                <th className="text-right py-2 px-2">ANNUAL</th>
                <th className="text-right py-2 px-2">SAVE</th>
                <th className="text-center py-2 px-2">RANKING</th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
              {[
                {
                  tier: "Free",
                  mo: "$0",
                  yr: "$0",
                  save: "—",
                  rank: "1×",
                  color: "text-gray-500",
                },
                {
                  tier: "Essential",
                  mo: "$29",
                  yr: "$290",
                  save: "17%",
                  rank: "2×",
                  color: "text-blue-400",
                },
                {
                  tier: "Verified",
                  mo: "$79",
                  yr: "$790",
                  save: "17%",
                  rank: "4×",
                  color: "text-green-400",
                },
                {
                  tier: "Max",
                  mo: "$149",
                  yr: "$1,490",
                  save: "17%",
                  rank: "6×",
                  color: "text-amber-400",
                },
                {
                  tier: "Enterprise",
                  mo: "$499",
                  yr: "$4,990",
                  save: "17%",
                  rank: "10×",
                  color: "text-red-400",
                },
              ].map((row) => (
                <tr
                  key={row.tier}
                  className="border-b border-gray-800/20 hover:bg-gray-800/20"
                >
                  <td className={`py-2 px-2 font-bold ${row.color}`}>
                    {row.tier}
                  </td>
                  <td className="py-2 px-2 text-right">{row.mo}</td>
                  <td className="py-2 px-2 text-right">{row.yr}</td>
                  <td className="py-2 px-2 text-right text-green-500">
                    {row.save}
                  </td>
                  <td className="py-2 px-2 text-center text-purple-400">
                    {row.rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBlock>

      {/* Transaction Type Breakdown */}
      <SectionBlock
        title="REVENUE BY TYPE"
        icon={<BarChart3 className="w-3.5 h-3.5 text-white" />}
        color="blue"
      >
        {Object.keys(typeBreakdown).length === 0 ? (
          <div className="text-center py-4 text-gray-600 font-mono text-[11px]">
            No transactions recorded yet
          </div>
        ) : (
          Object.entries(typeBreakdown).map(([type, data]) => (
            <div
              key={type}
              className="flex items-center justify-between py-2 border-b border-gray-800/20 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-400 font-mono">
                  {type}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-gray-600 font-mono">
                  {data.count} txns
                </span>
                <span className="text-[11px] text-green-400 font-mono font-bold">
                  $
                  {data.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </SectionBlock>

      {/* Transaction History */}
      <SectionBlock
        title="TRANSACTION HISTORY"
        icon={<Receipt className="w-3.5 h-3.5 text-white" />}
        color="cyan"
      >
        {loading ? (
          <div className="text-center py-8 text-gray-600 font-mono text-[11px]">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <div className="text-gray-600 font-mono text-[11px]">
              No transactions yet
            </div>
            <div className="text-gray-700 font-mono text-[10px] mt-1">
              Transactions appear when users make payments via Stripe
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.slice(0, 30).map((tx) => {
              const statusColor =
                {
                  completed: "text-green-400 bg-green-500/10",
                  pending: "text-amber-400 bg-amber-500/10",
                  failed: "text-red-400 bg-red-500/10",
                }[tx.status] || "text-gray-400 bg-gray-500/10";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-800/20 border-b border-gray-800/10"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${tx.status === "completed" ? "bg-green-500/10" : tx.status === "failed" ? "bg-red-500/10" : "bg-amber-500/10"}`}
                  >
                    {tx.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    ) : tx.status === "failed" ? (
                      <X className="h-3 w-3 text-red-400" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white font-mono font-bold">
                        $
                        {parseFloat(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor}`}
                      >
                        {tx.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        {tx.type}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-700 font-mono truncate">
                      {tx.reference ? `ref: ${tx.reference}` : `id: ${tx.id}`}
                      {tx.userId ? ` • user:${tx.userId}` : ""}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-600 font-mono text-right flex-shrink-0">
                    {new Date(tx.createdAt).toLocaleDateString()}
                    <br />
                    {new Date(tx.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionBlock>

      {/* Payment Endpoints */}
      <SectionBlock
        title="PAYMENT API ENDPOINTS"
        icon={<Plug className="w-3.5 h-3.5 text-white" />}
        color="amber"
      >
        <ApiEndpoint
          method="POST"
          path="/api/v1/payments/create-checkout"
          desc="Create Stripe Checkout (tier + period)"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/payments/webhook"
          desc="Stripe webhook (session.completed / failed)"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/payments/billing-history"
          desc="User's paginated transaction history"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/payments/create-portal"
          desc="Stripe Customer Portal session"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/subscription/status"
          desc="Current tier + effective tier + trial info"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/subscription/upgrade"
          desc="Upgrade tier or start 7-day trial"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/subscription/downgrade"
          desc="Downgrade to lower tier"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/subscription/feature-check"
          desc="Check feature access for tier"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/subscription/tiers"
          desc="All tier definitions + pricing"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/subscription/cancel-trial"
          desc="Cancel active trial"
        />
      </SectionBlock>

      {/* Webhook Processing */}
      <SectionBlock
        title="WEBHOOK & PAYMENT FLOW"
        icon={<ArrowRightLeft className="w-3.5 h-3.5 text-white" />}
        color="red"
      >
        <div className="font-mono text-[11px] text-gray-400 bg-black/40 rounded-lg p-4 leading-relaxed space-y-2">
          <div className="text-green-400 font-bold">▸ CHECKOUT FLOW:</div>
          <div className="ml-4">
            1. Client →{" "}
            <span className="text-cyan-400">
              POST /api/v1/payments/create-checkout
            </span>{" "}
            {`{ tier, period }`}
          </div>
          <div className="ml-4">
            2. Server → Creates{" "}
            <span className="text-purple-400">Stripe Checkout Session</span>{" "}
            (one-time payment mode)
          </div>
          <div className="ml-4">
            3. Client → Redirected to{" "}
            <span className="text-purple-400">Stripe-hosted checkout page</span>
          </div>
          <div className="ml-4">
            4. On success → Stripe fires{" "}
            <span className="text-amber-400">checkout.session.completed</span>{" "}
            webhook
          </div>
          <div className="ml-4">
            5. Server → Records{" "}
            <span className="text-green-400">transaction</span> + upgrades
            user's <span className="text-green-400">subscriptionTier</span>
          </div>
          <div className="text-red-400 font-bold mt-3">▸ FAILURE FLOW:</div>
          <div className="ml-4">
            1. Stripe fires{" "}
            <span className="text-red-400">payment_intent.payment_failed</span>
          </div>
          <div className="ml-4">2. Server → Records failed transaction</div>
          <div className="ml-4">
            3. User tier unchanged, notified of failure
          </div>
          <div className="text-amber-400 font-bold mt-3">▸ EXPIRY FLOW:</div>
          <div className="ml-4">
            1. Daily cron (
            <span className="text-cyan-400">subscription-scheduler.ts</span>)
            checks <span className="text-gray-500">premiumExpiresAt</span>
          </div>
          <div className="ml-4">
            2. Expired paid → tier reverts to{" "}
            <span className="text-gray-500">free</span>, status →{" "}
            <span className="text-gray-500">expired</span>
          </div>
          <div className="ml-4">
            3. Expired trial →{" "}
            <span className="text-gray-500">trialTier = null</span>, tier
            restored
          </div>
        </div>
      </SectionBlock>

      {/* DB Schema */}
      <SectionBlock
        title="FINANCIAL DATABASE SCHEMA"
        icon={<Table2 className="w-3.5 h-3.5 text-white" />}
        color="cyan"
      >
        <DbTable
          name="transactions"
          columns="id (uuid PK), business_id (FK → businesses), user_id (FK → users), amount (decimal 12,2), type (varchar: ad_topup | subscription_fee), status (varchar: pending | completed | failed), reference (varchar unique — Stripe session ID), created_at"
        />
        <DbTable
          name="users (financial fields)"
          columns="subscription_tier (free|essential|verified|max|enterprise), subscription_status (active|cancelled|past_due|trialing|expired), premium_expires_at (timestamp), trial_tier (varchar), trial_started_at (timestamp), trial_expires_at (timestamp)"
        />
        <DbTable
          name="adCampaigns"
          columns="id, name, budget (decimal), status, start_date, end_date, target_audience, impressions, clicks, created_at"
        />
        <DbTable
          name="paymentCardTypes"
          columns="id, name, code (unique), description, created_at"
        />
        <DbTable
          name="savedPaymentMethods"
          columns="id, user_id (FK), stripe_payment_method_id, stripe_customer_id, card_brand, card_last4, card_exp_month, card_exp_year, cardholder_name, is_default, label, preauthorized, max_charge_amount, currency, status, created_at"
        />
        <DbTable
          name="ngoCharges"
          columns="id (uuid), payment_method_id (FK), user_id (FK), amount (decimal 12,2), currency, description, category, stripe_payment_intent_id, status, receipt_url, processed_by (FK), refunded_at, refund_reason, metadata, created_at"
        />
      </SectionBlock>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ░░░ NGO POS TERMINAL ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <div className="mt-6 mb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-black font-mono bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              NGO POS TERMINAL
            </h3>
            <p className="text-[9px] text-gray-600 font-mono">
              PRE-AUTHORIZED CARD MANAGEMENT • DIRECT CHARGE PROCESSING • SECURE
              TOKENIZED
            </p>
          </div>
        </div>

        {/* POS Navigation */}
        <div className="flex gap-1 mb-4 bg-gray-950/50 border border-gray-800/50 rounded-lg p-1">
          {(
            [
              {
                key: "dashboard" as const,
                label: "DASHBOARD",
                icon: "📊",
              },
              {
                key: "customers" as const,
                label: "CARD VAULT",
                icon: "🏦",
              },
              {
                key: "terminal" as const,
                label: "CHARGE",
                icon: "💳",
              },
              {
                key: "history" as const,
                label: "RECEIPTS",
                icon: "🧾",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPosView(tab.key)}
              className={`flex-1 py-2 px-2 rounded-md text-[10px] font-mono font-bold transition-all ${
                posView === tab.key
                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/30"
                  : "text-gray-600 hover:text-gray-400 hover:bg-gray-800/30"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── POS DASHBOARD ───────────────────────────────────────────── */}
      {posView === "dashboard" && (
        <SectionBlock
          title="POS OPERATIONS DASHBOARD"
          icon={<BarChart3 className="w-3.5 h-3.5 text-white" />}
          color="amber"
        >
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
            {[
              {
                label: "CUSTOMERS",
                value: posStats?.total_customers || "0",
                color: "text-blue-400",
                icon: "👥",
              },
              {
                label: "CARDS STORED",
                value: posStats?.total_cards || "0",
                color: "text-purple-400",
                icon: "💳",
              },
              {
                label: "PRE-AUTH",
                value: posStats?.preauthorized_cards || "0",
                color: "text-green-400",
                icon: "✅",
              },
              {
                label: "CHARGED",
                value: posStats?.successful_charges || "0",
                color: "text-cyan-400",
                icon: "💰",
              },
              {
                label: "REFUNDED",
                value: posStats?.refunded_charges || "0",
                color: "text-red-400",
                icon: "↩️",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-black/40 rounded-lg p-3 border border-gray-800/30"
              >
                <div className="text-[9px] text-gray-600 font-mono">
                  {stat.icon} {stat.label}
                </div>
                <div
                  className={`text-xl font-black font-mono ${stat.color} mt-1`}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <div className="text-[9px] text-green-600 font-mono font-bold mb-1">
                TOTAL REVENUE
              </div>
              <div className="text-2xl font-black text-green-400 font-mono">
                $
                {parseFloat(posStats?.total_revenue || "0").toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
              <div className="text-[9px] text-cyan-600 font-mono font-bold mb-1">
                THIS MONTH
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                $
                {parseFloat(posStats?.revenue_this_month || "0").toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <div className="text-[9px] text-amber-600 font-mono font-bold mb-1">
                TODAY
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                $
                {parseFloat(posStats?.revenue_today || "0").toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/30">
            <div className="text-[10px] font-mono text-gray-500 mb-2 font-bold">
              NGO POS API ENDPOINTS
            </div>
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/setup-intent"
              desc="Create SetupIntent for card pre-authorization"
            />
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/save-card"
              desc="Save tokenized card to user (after SetupIntent)"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/cards/:userId"
              desc="List saved cards for a user"
            />
            <ApiEndpoint
              method="DELETE"
              path="/api/v1/payments/cards/:cardId"
              desc="Remove/revoke saved card"
            />
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/charge"
              desc="POS charge against pre-authorized card"
            />
            <ApiEndpoint
              method="POST"
              path="/api/v1/payments/refund"
              desc="Refund an NGO charge"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/customers"
              desc="List all customers with saved cards"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/ngo-charges"
              desc="NGO charge history with filters"
            />
            <ApiEndpoint
              method="GET"
              path="/api/v1/payments/pos-stats"
              desc="POS terminal dashboard statistics"
            />
          </div>
        </SectionBlock>
      )}

      {/* ── CARD VAULT (Customer List) ──────────────────────────────── */}
      {posView === "customers" && (
        <SectionBlock
          title="CUSTOMER CARD VAULT"
          icon={<Shield className="w-3.5 h-3.5 text-white" />}
          color="purple"
        >
          <div className="mb-3">
            <input
              type="text"
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              placeholder="Search customers by name or email..."
              className="w-full bg-black/40 border border-gray-800/50 rounded-lg px-3 py-2 text-[11px] text-gray-300 font-mono placeholder:text-gray-700 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          {posLoading ? (
            <div className="text-center py-8 text-gray-600 font-mono text-[11px]">
              Loading card vault...
            </div>
          ) : posCustomers.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <div className="text-gray-600 font-mono text-[11px]">
                No customers with saved cards
              </div>
              <div className="text-gray-700 font-mono text-[10px] mt-1">
                Cards appear when users pre-authorize via SetupIntent
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {posCustomers.map((customer) => (
                <div
                  key={customer.user_id}
                  className={`border rounded-lg transition-all cursor-pointer ${
                    selectedCustomer?.user_id === customer.user_id
                      ? "border-purple-500/50 bg-purple-500/5"
                      : "border-gray-800/30 bg-black/20 hover:border-gray-700/50"
                  }`}
                  onClick={() =>
                    setSelectedCustomer(
                      selectedCustomer?.user_id === customer.user_id
                        ? null
                        : customer,
                    )
                  }
                >
                  {/* Customer Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {(customer.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[11px] text-white font-mono font-bold">
                          {customer.username}
                        </div>
                        <div className="text-[9px] text-gray-600 font-mono">
                          {customer.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        {customer.subscription_tier?.toUpperCase() || "FREE"}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        {customer.card_count} card
                        {parseInt(customer.card_count) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Expanded — Card Details */}
                  {selectedCustomer?.user_id === customer.user_id &&
                    customer.cards && (
                      <div className="px-3 pb-3 border-t border-gray-800/20 pt-2">
                        <div className="space-y-1.5">
                          {customer.cards.map((card: any) => (
                            <div
                              key={card.id}
                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/60 border border-gray-800/30"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-lg">
                                  {card.brand === "visa"
                                    ? "💳"
                                    : card.brand === "mastercard"
                                      ? "🔶"
                                      : card.brand === "amex"
                                        ? "💎"
                                        : "💳"}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white font-mono font-bold">
                                      {(card.brand || "CARD").toUpperCase()}{" "}
                                      •••• {card.last4}
                                    </span>
                                    {card.card_funding && (
                                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-slate-500/10 text-slate-400 uppercase">
                                        {card.card_funding}
                                      </span>
                                    )}
                                    {card.cvc_check && (
                                      <span
                                        className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                                          card.cvc_check === "pass"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : card.cvc_check === "fail"
                                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                              : "bg-gray-500/10 text-gray-400"
                                        }`}
                                      >
                                        CVC{" "}
                                        {card.cvc_check === "pass"
                                          ? "✓"
                                          : card.cvc_check === "fail"
                                            ? "✗"
                                            : "?"}
                                      </span>
                                    )}
                                    {card.preauthorized && (
                                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                        PRE-AUTH
                                      </span>
                                    )}
                                    {card.is_default && (
                                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                        DEFAULT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-gray-600 font-mono">
                                    Exp {card.exp_month}/{card.exp_year}
                                    {card.card_country
                                      ? ` • 🌍 ${card.card_country}`
                                      : ""}
                                    {card.label ? ` • ${card.label}` : ""}
                                  </div>
                                  {card.cardholder && (
                                    <div className="text-[9px] text-cyan-400 font-mono mt-0.5">
                                      👤 {card.cardholder}
                                    </div>
                                  )}
                                  {card.card_issuer && (
                                    <div className="text-[9px] text-violet-400 font-mono">
                                      🏦 {card.card_issuer}
                                    </div>
                                  )}
                                  {(card.billing_address_line1 ||
                                    card.billing_city ||
                                    card.billing_email ||
                                    card.billing_phone) && (
                                    <div className="text-[9px] text-gray-500 font-mono mt-0.5 space-y-px">
                                      {card.billing_address_line1 && (
                                        <div>
                                          📍 {card.billing_address_line1}
                                          {card.billing_address_line2
                                            ? `, ${card.billing_address_line2}`
                                            : ""}
                                        </div>
                                      )}
                                      {(card.billing_city ||
                                        card.billing_state ||
                                        card.billing_postal_code) && (
                                        <div className="pl-5">
                                          {[
                                            card.billing_city,
                                            card.billing_state,
                                            card.billing_postal_code,
                                            card.billing_country,
                                          ]
                                            .filter(Boolean)
                                            .join(", ")}
                                        </div>
                                      )}
                                      {card.billing_email && (
                                        <div>✉️ {card.billing_email}</div>
                                      )}
                                      {card.billing_phone && (
                                        <div>📞 {card.billing_phone}</div>
                                      )}
                                    </div>
                                  )}
                                  {card.max_charge && (
                                    <div className="text-[9px] text-amber-500 font-mono mt-0.5">
                                      Max charge: {card.currency || "USD"} $
                                      {card.max_charge}
                                    </div>
                                  )}
                                  {card.card_fingerprint && (
                                    <div className="text-[8px] text-gray-700 font-mono mt-0.5">
                                      🔑{" "}
                                      {card.card_fingerprint.substring(0, 12)}…
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChargeForm((prev) => ({
                                      ...prev,
                                      cardId: String(card.id),
                                    }));
                                    setPosView("terminal");
                                  }}
                                  className="px-2 py-1 text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
                                  title="Charge this card"
                                >
                                  ⚡ CHARGE
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[9px] text-gray-700 font-mono">
                          Stripe Customer:{" "}
                          {customer.stripe_customer_id || "Not linked"}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </SectionBlock>
      )}

      {/* ── POS CHARGE TERMINAL ─────────────────────────────────────── */}
      {posView === "terminal" && (
        <SectionBlock
          title="CHARGE TERMINAL"
          icon={<Zap className="w-3.5 h-3.5 text-white" />}
          color="green"
        >
          <div className="max-w-lg mx-auto">
            {/* Terminal Display */}
            <div className="bg-black border-2 border-green-500/30 rounded-xl p-6 mb-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-center mb-6">
                  <div className="text-[9px] text-green-600 font-mono tracking-[0.3em] mb-1">
                    VERSO AIR NGO • PAYMENT TERMINAL
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
                </div>

                {/* Card Selection */}
                <div className="mb-4">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    SELECT CARD
                  </label>
                  <select
                    value={chargeForm.cardId}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        cardId: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none appearance-none"
                  >
                    <option value="">-- Select pre-authorized card --</option>
                    {posCustomers.flatMap((c) =>
                      (c.cards || [])
                        .filter(
                          (card: any) =>
                            card.preauthorized && card.status === "active",
                        )
                        .map((card: any) => (
                          <option key={card.id} value={String(card.id)}>
                            {c.username} —{" "}
                            {(card.brand || "card").toUpperCase()} ••••{" "}
                            {card.last4} ({card.exp_month}/{card.exp_year})
                          </option>
                        )),
                    )}
                  </select>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    AMOUNT
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={chargeForm.currency}
                      onChange={(e) =>
                        setChargeForm((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      className="bg-gray-950 border border-green-500/20 rounded-lg px-2 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none w-20"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="XOF">XOF</option>
                      <option value="XAF">XAF</option>
                      <option value="NGN">NGN</option>
                      <option value="KES">KES</option>
                      <option value="ZAR">ZAR</option>
                      <option value="GHS">GHS</option>
                      <option value="MAD">MAD</option>
                    </select>
                    <input
                      type="number"
                      value={chargeForm.amount}
                      onChange={(e) =>
                        setChargeForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      step="0.01"
                      min="0.50"
                      className="flex-1 bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-2xl text-green-300 font-mono font-black text-right focus:border-green-500/50 focus:outline-none placeholder:text-green-900"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={chargeForm.category}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none"
                  >
                    <option value="activity_fee">Activity Fee</option>
                    <option value="donation">Donation</option>
                    <option value="membership">Membership</option>
                    <option value="event">Event</option>
                    <option value="supplies">Supplies</option>
                    <option value="service_fee">Service Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <label className="text-[9px] text-green-500/70 font-mono block mb-1">
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={chargeForm.description}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="e.g. Monthly membership fee"
                    className="w-full bg-gray-950 border border-green-500/20 rounded-lg px-3 py-2.5 text-[11px] text-green-300 font-mono focus:border-green-500/50 focus:outline-none placeholder:text-green-900"
                  />
                </div>

                {/* Charge Button */}
                <button
                  onClick={handlePosCharge}
                  disabled={
                    chargeLoading || !chargeForm.cardId || !chargeForm.amount
                  }
                  className={`w-full py-3 rounded-lg font-mono font-black text-sm transition-all ${
                    chargeLoading || !chargeForm.cardId || !chargeForm.amount
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 text-black hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
                  }`}
                >
                  {chargeLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> PROCESSING...
                    </span>
                  ) : (
                    <span>
                      ⚡ CHARGE{" "}
                      {chargeForm.amount
                        ? `${chargeForm.currency} ${parseFloat(chargeForm.amount).toFixed(2)}`
                        : ""}
                    </span>
                  )}
                </button>

                {/* Charge Result */}
                {chargeResult && (
                  <div
                    className={`mt-4 p-3 rounded-lg border text-[11px] font-mono ${
                      chargeResult.success
                        ? "bg-green-500/10 border-green-500/30 text-green-300"
                        : "bg-red-500/10 border-red-500/30 text-red-300"
                    }`}
                  >
                    {chargeResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[5, 10, 20, 25, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() =>
                    setChargeForm((prev) => ({
                      ...prev,
                      amount: String(amt),
                    }))
                  }
                  className="px-3 py-1.5 text-[10px] font-mono bg-gray-900/60 border border-gray-800/30 rounded-lg text-gray-400 hover:text-green-400 hover:border-green-500/30 transition-colors"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        </SectionBlock>
      )}

      {/* ── CHARGE RECEIPTS / HISTORY ───────────────────────────────── */}
      {posView === "history" && (
        <SectionBlock
          title="NGO CHARGE RECEIPTS"
          icon={<Receipt className="w-3.5 h-3.5 text-white" />}
          color="cyan"
        >
          {posCharges.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <div className="text-gray-600 font-mono text-[11px]">
                No charges processed yet
              </div>
              <div className="text-gray-700 font-mono text-[10px] mt-1">
                Use the CHARGE terminal to process payments
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {posCharges.map((charge) => {
                const statusColors: Record<string, string> = {
                  succeeded: "text-green-400 bg-green-500/10",
                  pending: "text-amber-400 bg-amber-500/10",
                  failed: "text-red-400 bg-red-500/10",
                  refunded: "text-purple-400 bg-purple-500/10",
                };
                const statusColor =
                  statusColors[charge.status] || "text-gray-400 bg-gray-500/10";
                return (
                  <div
                    key={charge.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-800/20 border-b border-gray-800/10"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        charge.status === "succeeded"
                          ? "bg-green-500/10"
                          : charge.status === "refunded"
                            ? "bg-purple-500/10"
                            : charge.status === "failed"
                              ? "bg-red-500/10"
                              : "bg-amber-500/10"
                      }`}
                    >
                      {charge.status === "succeeded" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : charge.status === "refunded" ? (
                        <ArrowRightLeft className="h-3.5 w-3.5 text-purple-400" />
                      ) : charge.status === "failed" ? (
                        <X className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] text-white font-mono font-black">
                          {charge.currency || "USD"} $
                          {parseFloat(charge.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor}`}
                        >
                          {charge.status?.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono px-1 py-0.5 bg-gray-800/30 rounded">
                          {charge.category}
                        </span>
                        {charge.card_brand && (
                          <span className="text-[9px] text-gray-500 font-mono">
                            {charge.card_brand?.toUpperCase()} ****
                            {charge.card_last4}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {charge.description || "NGO Charge"}
                        {charge.username ? ` • ${charge.username}` : ""}
                        {charge.processed_by_name
                          ? ` • by ${charge.processed_by_name}`
                          : ""}
                      </div>
                      {charge.refund_reason && (
                        <div className="text-[9px] text-purple-400 font-mono mt-0.5">
                          Refund reason: {charge.refund_reason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {charge.status === "succeeded" && (
                        <button
                          onClick={() => handleRefund(charge.id)}
                          className="px-2 py-1 text-[8px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                          title="Refund this charge"
                        >
                          REFUND
                        </button>
                      )}
                      <div className="text-[9px] text-gray-600 font-mono text-right">
                        {charge.created_at
                          ? new Date(charge.created_at).toLocaleDateString()
                          : ""}
                        <br />
                        {charge.created_at
                          ? new Date(charge.created_at).toLocaleTimeString()
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionBlock>
      )}

      {/* ═══ VERSO AIR CARD — STRIPE ISSUING + POINTS ═══ */}
      <VersoAirCardPanel />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 💳 VERSO AIR CARD — STRIPE ISSUING + POINTS REWARDS
// ═══════════════════════════════════════════════════════════

const TIER_MULTIPLIERS_FALLBACK: Record<string, number> = {
  free: 1.0,
  essential: 1.5,
  verified: 2.0,
  max: 3.0,
  enterprise: 5.0,
};

function VersoAirCardPanel() {
  const { user } = useAuthContext();
  const userId = user?.id;
  const [cards, setCards] = useState<any[]>([]);
  const [pointsBalance, setPointsBalance] = useState<any>(null);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [cardConfig, setCardConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [revealedCard, setRevealedCard] = useState<any>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);
  const [redeemLoading, setRedeemLoading] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState<any>(null);
  const [cardholderForm, setCardholderForm] = useState({
    name: user?.name || user?.username || "",
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  // Load all data
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [cardsRes, balanceRes, histRes, configRes, rewardsRes] =
        await Promise.all([
          fetch(`/api/v1/cards/my-cards?userId=${userId}`, {
            credentials: "include",
          }).catch(() => null),
          fetch(`/api/v1/cards/points/balance?userId=${userId}`, {
            credentials: "include",
          }).catch(() => null),
          fetch(
            `/api/v1/cards/points/history?userId=${userId}&limit=10&page=${historyPage}`,
            { credentials: "include" },
          ).catch(() => null),
          fetch(`/api/v1/cards/config`, { credentials: "include" }).catch(
            () => null,
          ),
          fetch(`/api/v1/cards/points/rewards`, {
            credentials: "include",
          }).catch(() => null),
        ]);
      if (cardsRes?.ok) {
        const d = await cardsRes.json();
        setCards(d.data || []);
      }
      if (balanceRes?.ok) {
        const d = await balanceRes.json();
        setPointsBalance(d.data);
      }
      if (histRes?.ok) {
        const d = await histRes.json();
        setPointsHistory(d.data || []);
        setHistoryPagination(d.pagination);
      }
      if (configRes?.ok) {
        const d = await configRes.json();
        setCardConfig(d.data);
      }
      if (rewardsRes?.ok) {
        const d = await rewardsRes.json();
        setRewards(d.data || []);
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [userId, historyPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIssueCard = async () => {
    if (!userId) return;
    setIssuing(true);
    try {
      const chRes = await fetch("/api/v1/cards/cardholder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...cardholderForm }),
      });
      const chData = await chRes.json();
      if (!chData.success) throw new Error(chData.error);

      const cardRes = await fetch("/api/v1/cards/issue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cardholderId: chData.data.cardholderId,
        }),
      });
      const cardData = await cardRes.json();
      if (!cardData.success) throw new Error(cardData.error);
      await loadData();
    } catch (err: any) {
      console.error("Issue card error:", err);
    }
    setIssuing(false);
  };

  const handleRevealCard = async (cardId: number) => {
    setRevealLoading(true);
    try {
      const res = await fetch(
        `/api/v1/cards/${cardId}/details?userId=${userId}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (data.success) setRevealedCard(data.data);
    } catch {
      /* silent */
    }
    setRevealLoading(false);
  };

  const handleFreeze = async (cardId: number, freeze: boolean) => {
    try {
      await fetch(`/api/v1/cards/${cardId}/freeze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, freeze }),
      });
      await loadData();
    } catch {
      /* silent */
    }
  };

  const handleCancel = async (cardId: number) => {
    if (!confirm("Permanently cancel this card? This cannot be undone."))
      return;
    try {
      await fetch(`/api/v1/cards/${cardId}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setRevealedCard(null);
      await loadData();
    } catch {
      /* silent */
    }
  };

  const handleRedeem = async (rewardId: number) => {
    setRedeemLoading(String(rewardId));
    try {
      const res = await fetch("/api/v1/cards/points/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rewardId }),
      });
      const data = await res.json();
      if (data.success) await loadData();
    } catch {
      /* silent */
    }
    setRedeemLoading(null);
  };

  const tier = user?.subscriptionTier || user?.subscription_tier || "free";
  const multiplier =
    cardConfig?.tierMultipliers?.[tier] ||
    TIER_MULTIPLIERS_FALLBACK[tier] ||
    1.0;
  const activeCards = cards.filter((c: any) => c.card_status === "active");

  return (
    <>
      {/* VERSO AIR CARD HEADER + POINTS SUMMARY */}
      <SectionBlock
        title="VERSO AIR CARD™ — VIRTUAL CARD + POINTS"
        icon={<CreditCard className="w-3.5 h-3.5 text-white" />}
        color="cyan"
      >
        {/* Points summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg p-3 border border-cyan-500/20">
            <div className="text-[9px] text-cyan-500/70 font-mono font-bold mb-1">
              BALANCE
            </div>
            <div className="text-xl font-black text-cyan-400 font-mono">
              {loading ? "..." : (pointsBalance?.balance || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              points
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="text-[9px] text-green-500/70 font-mono font-bold mb-1">
              MULTIPLIER
            </div>
            <div className="text-xl font-black text-green-400 font-mono">
              {multiplier}x
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              {tier} tier
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="text-[9px] text-purple-500/70 font-mono font-bold mb-1">
              EARNED
            </div>
            <div className="text-xl font-black text-purple-400 font-mono">
              {loading
                ? "..."
                : (pointsBalance?.totalEarned || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              lifetime
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-3 border border-amber-500/20">
            <div className="text-[9px] text-amber-500/70 font-mono font-bold mb-1">
              THIS MONTH
            </div>
            <div className="text-xl font-black text-amber-400 font-mono">
              {loading
                ? "..."
                : (pointsBalance?.monthEarned || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              pts earned
            </div>
          </div>
        </div>

        {/* Earning rate info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-gray-500">
            <Zap className="inline w-3 h-3 text-cyan-400 mr-1" />
            Earn{" "}
            <span className="text-cyan-400 font-bold">
              {cardConfig?.basePointsPerDollar || 10} pts
            </span>{" "}
            per $1 ×{" "}
            <span className="text-green-400 font-bold">{multiplier}x</span> ={" "}
            <span className="text-white font-bold">
              {Math.round((cardConfig?.basePointsPerDollar || 10) * multiplier)}{" "}
              pts/$1
            </span>
          </span>
          {pointsBalance?.expiringSoon > 0 && (
            <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
              ⚠ {pointsBalance.expiringSoon.toLocaleString()} pts expiring in 30
              days
            </span>
          )}
          {pointsBalance?.nextTierMultiplier && (
            <span className="text-[9px] font-mono px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
              ↑ Upgrade to {pointsBalance.nextTierMultiplier.tier}:{" "}
              {pointsBalance.nextTierMultiplier.multiplier}x
            </span>
          )}
        </div>
      </SectionBlock>

      {/* ISSUED CARDS */}
      <SectionBlock
        title={`MY VERSO AIR CARDS (${activeCards.length} active)`}
        icon={<Wallet className="w-3.5 h-3.5 text-white" />}
        color="blue"
      >
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-cyan-500 mx-auto mb-2" />
            <div className="text-[10px] text-gray-500 font-mono">
              Loading cards...
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-xl border border-cyan-500/10">
              <CreditCard className="h-10 w-10 text-cyan-500/50 mx-auto mb-3" />
              <div className="text-[13px] text-white font-mono font-bold mb-1">
                Get Your Verso Air Card
              </div>
              <div className="text-[10px] text-gray-500 font-mono max-w-sm mx-auto">
                Virtual debit card powered by Stripe Issuing. Earn{" "}
                {Math.round(
                  (cardConfig?.basePointsPerDollar || 10) * multiplier,
                )}{" "}
                points per dollar spent.
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-gray-500 font-mono font-bold mb-1 block">
                  CARDHOLDER NAME
                </label>
                <input
                  className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.name}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Full legal name"
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 font-mono font-bold mb-1 block">
                  BILLING ADDRESS
                </label>
                <input
                  className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.line1}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, line1: e.target.value }))
                  }
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <input
                  className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.city}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="City"
                />
                <input
                  className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.state}
                  onChange={(e) =>
                    setCardholderForm((f) => ({ ...f, state: e.target.value }))
                  }
                  placeholder="State"
                />
                <input
                  className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-[11px] font-mono text-white"
                  value={cardholderForm.postal_code}
                  onChange={(e) =>
                    setCardholderForm((f) => ({
                      ...f,
                      postal_code: e.target.value,
                    }))
                  }
                  placeholder="ZIP"
                />
              </div>
            </div>
            <button
              onClick={handleIssueCard}
              disabled={issuing || !cardholderForm.name}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-mono font-bold text-[12px] hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {issuing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> ISSUING CARD...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> ISSUE VERSO AIR CARD
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card: any) => {
              const isActive = card.card_status === "active";
              const isFrozen = card.card_status === "inactive";
              const isCanceled = card.card_status === "canceled";
              const isRevealed = revealedCard?.id === card.id;

              return (
                <div
                  key={card.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 border-cyan-500/20"
                      : isFrozen
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : "bg-gray-800/30 border-gray-700/30 opacity-60"
                  }`}
                >
                  {/* Card visual */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-8 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                          isActive
                            ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                            : isFrozen
                              ? "bg-gradient-to-br from-yellow-500/50 to-amber-600/50 text-yellow-200"
                              : "bg-gray-700 text-gray-500"
                        }`}
                      >
                        {card.card_brand?.toUpperCase() || "VISA"}
                      </div>
                      <div>
                        <div className="text-[12px] font-mono font-black text-white tracking-[3px]">
                          •••• •••• •••• {card.card_last4}
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          {card.cardholder_name} •{" "}
                          {card.card_exp_month?.toString().padStart(2, "0")}/
                          {card.card_exp_year?.toString().slice(-2)} •{" "}
                          {card.currency}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                          isActive
                            ? "bg-green-500/10 text-green-400"
                            : isFrozen
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {card.card_status?.toUpperCase()}
                      </span>
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                        {card.points_multiplier}x PTS
                      </span>
                    </div>
                  </div>

                  {/* Revealed full card details (PAN + CVV) */}
                  {isRevealed && revealedCard && (
                    <div className="mb-3 p-3 bg-black/40 rounded-lg border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-cyan-500 font-mono font-bold">
                          🔐 SECURE CARD DETAILS
                        </span>
                        <button
                          onClick={() => setRevealedCard(null)}
                          className="text-[9px] text-gray-500 hover:text-gray-400 font-mono"
                        >
                          HIDE
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-[8px] text-gray-600 font-mono mb-0.5">
                            CARD NUMBER
                          </div>
                          <div className="text-[13px] font-mono font-black text-white tracking-[2px]">
                            {revealedCard.number
                              ?.replace(/(.{4})/g, "$1 ")
                              .trim() || "••••"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-gray-600 font-mono mb-0.5">
                            EXPIRY
                          </div>
                          <div className="text-[13px] font-mono font-black text-white">
                            {revealedCard.expMonth?.toString().padStart(2, "0")}
                            /{revealedCard.expYear?.toString().slice(-2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-gray-600 font-mono mb-0.5">
                            CVV
                          </div>
                          <div className="text-[13px] font-mono font-black text-cyan-400">
                            {revealedCard.cvc || "•••"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[8px] text-gray-600 font-mono flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Secured via Stripe
                        Issuing — never stored locally
                      </div>
                    </div>
                  )}

                  {/* Card info bar */}
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 font-mono mb-3">
                    <span>
                      Limit: ${card.spending_limit_amount?.toLocaleString()}/
                      {card.spending_limit_interval}
                    </span>
                    <span>•</span>
                    <span>Tier: {card.tier_at_issuance}</span>
                    <span>•</span>
                    <span>
                      Issued:{" "}
                      {card.created_at
                        ? new Date(card.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>

                  {/* Card actions */}
                  {!isCanceled && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isRevealed ? (
                        <button
                          onClick={() => handleRevealCard(card.id)}
                          disabled={revealLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-[10px] font-mono font-bold transition-colors disabled:opacity-50"
                        >
                          {revealLoading ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}{" "}
                          SHOW DETAILS
                        </button>
                      ) : (
                        <button
                          onClick={() => setRevealedCard(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 text-[10px] font-mono font-bold transition-colors"
                        >
                          <EyeOff className="h-3 w-3" /> HIDE
                        </button>
                      )}
                      <button
                        onClick={() => handleFreeze(card.id, !isFrozen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] font-mono font-bold transition-colors ${
                          isFrozen
                            ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"
                        }`}
                      >
                        {isFrozen ? (
                          <>
                            <Unlock className="h-3 w-3" /> UNFREEZE
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> FREEZE
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCancel(card.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[10px] font-mono font-bold transition-colors"
                      >
                        <Ban className="h-3 w-3" /> CANCEL
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleIssueCard}
              disabled={issuing}
              className="w-full py-2.5 rounded-lg border border-dashed border-cyan-500/30 text-cyan-500 font-mono font-bold text-[10px] hover:bg-cyan-500/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {issuing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CreditCard className="h-3 w-3" />
              )}{" "}
              ISSUE ANOTHER CARD
            </button>
          </div>
        )}
      </SectionBlock>

      {/* POINTS HISTORY */}
      {pointsHistory.length > 0 && (
        <SectionBlock
          title="POINTS ACTIVITY LOG"
          icon={<Activity className="w-3.5 h-3.5 text-white" />}
          color="purple"
        >
          <div className="space-y-1">
            {pointsHistory.map((entry: any) => {
              const isEarn = entry.type === "earn" || entry.type === "bonus";
              const icon =
                entry.type === "earn"
                  ? "💳"
                  : entry.type === "bonus"
                    ? "🎉"
                    : entry.type === "redeem"
                      ? "🎁"
                      : "⏰";
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/20 border-b border-gray-800/10"
                >
                  <span className="text-base">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-white">
                      {entry.description}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono">
                      {entry.card_brand &&
                        `${entry.card_brand} ****${entry.card_last4} • `}
                      {entry.merchant_name && `${entry.merchant_name} • `}
                      {entry.transaction_amount
                        ? `$${entry.transaction_amount} • `
                        : ""}
                      {entry.multiplier ? `${entry.multiplier}x` : ""}
                      {entry.category_bonus
                        ? ` + ${entry.category_bonus}x cat bonus`
                        : ""}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-[12px] font-mono font-black ${isEarn ? "text-green-400" : "text-red-400"}`}
                    >
                      {isEarn ? "+" : ""}
                      {entry.points?.toLocaleString()} pts
                    </div>
                    <div className="text-[8px] text-gray-600 font-mono">
                      bal: {entry.balance?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-600 font-mono text-right flex-shrink-0">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString()
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
          {historyPagination && historyPagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-800/30">
              <button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="px-3 py-1 text-[9px] font-mono bg-gray-800/30 rounded hover:bg-gray-800/50 disabled:opacity-30 text-gray-400"
              >
                ← PREV
              </button>
              <span className="text-[9px] font-mono text-gray-500">
                Page {historyPage}/{historyPagination.pages}
              </span>
              <button
                onClick={() =>
                  setHistoryPage((p) =>
                    Math.min(historyPagination.pages, p + 1),
                  )
                }
                disabled={historyPage >= historyPagination.pages}
                className="px-3 py-1 text-[9px] font-mono bg-gray-800/30 rounded hover:bg-gray-800/50 disabled:opacity-30 text-gray-400"
              >
                NEXT →
              </button>
            </div>
          )}
        </SectionBlock>
      )}

      {/* REWARDS STORE */}
      {rewards.length > 0 && (
        <SectionBlock
          title="REDEEM POINTS — REWARDS STORE"
          icon={<Crown className="w-3.5 h-3.5 text-white" />}
          color="amber"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {rewards.map((reward: any) => {
              const canAfford =
                (pointsBalance?.balance || 0) >= reward.points_cost;
              return (
                <div
                  key={reward.id}
                  className={`rounded-lg border p-3 ${canAfford ? "border-amber-500/20 bg-amber-500/5" : "border-gray-700/30 bg-gray-800/20 opacity-60"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-white">
                        {reward.name}
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono">
                        {reward.description}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                      {reward.reward_type?.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono font-black text-amber-400">
                      {reward.points_cost?.toLocaleString()} pts
                    </span>
                    <button
                      onClick={() => handleRedeem(reward.id)}
                      disabled={
                        !canAfford || redeemLoading === String(reward.id)
                      }
                      className="px-3 py-1 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {redeemLoading === String(reward.id)
                        ? "REDEEMING..."
                        : "REDEEM"}
                    </button>
                  </div>
                  {reward.min_tier && reward.min_tier !== "free" && (
                    <div className="text-[8px] text-gray-600 font-mono mt-1">
                      Min tier: {reward.min_tier}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionBlock>
      )}

      {/* TIER MULTIPLIER TABLE */}
      <SectionBlock
        title="POINTS EARNING RATES BY TIER"
        icon={<TrendingUp className="w-3.5 h-3.5 text-white" />}
        color="green"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="text-left py-2 text-gray-500 font-bold">TIER</th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  MULTIPLIER
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  PTS / $1
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  SPEND LIMIT
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  MAX CARDS
                </th>
                <th className="text-center py-2 text-gray-500 font-bold">
                  WELCOME BONUS
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                cardConfig?.tierMultipliers || TIER_MULTIPLIERS_FALLBACK,
              ).map(([t, m]) => {
                const isCurrent = t === tier;
                const limits = cardConfig?.spendingLimits?.[t] || {
                  amount: "—",
                  interval: "monthly",
                };
                const maxC =
                  cardConfig?.cardLimits?.[t] ||
                  (["verified", "max", "enterprise"].includes(t) ? 3 : 1);
                const bonus = cardConfig?.welcomeBonuses?.[t] || "—";
                return (
                  <tr
                    key={t}
                    className={`border-b border-gray-800/20 ${isCurrent ? "bg-green-500/5" : ""}`}
                  >
                    <td className="py-2">
                      <span
                        className={`font-bold ${isCurrent ? "text-green-400" : "text-gray-400"}`}
                      >
                        {t.toUpperCase()} {isCurrent && "★"}
                      </span>
                    </td>
                    <td className="py-2 text-center text-cyan-400 font-bold">
                      {String(m)}x
                    </td>
                    <td className="py-2 text-center text-white font-bold">
                      {Math.round(
                        (cardConfig?.basePointsPerDollar || 10) * Number(m),
                      )}
                    </td>
                    <td className="py-2 text-center text-gray-400">
                      ${(limits as any).amount?.toLocaleString()}/
                      {(limits as any).interval}
                    </td>
                    <td className="py-2 text-center text-gray-400">
                      {String(maxC)}
                    </td>
                    <td className="py-2 text-center text-amber-400">
                      {typeof bonus === "number"
                        ? bonus.toLocaleString()
                        : bonus}{" "}
                      pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cardConfig?.categoryBonuses &&
          Object.keys(cardConfig.categoryBonuses).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-800/30">
              <div className="text-[9px] text-gray-500 font-mono font-bold mb-2">
                CATEGORY BONUSES (stacked with tier multiplier)
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(cardConfig.categoryBonuses).map(
                  ([cat, info]: [string, any]) => (
                    <span
                      key={cat}
                      className="text-[9px] font-mono px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20"
                    >
                      {info.label}: +{info.bonus}x
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
      </SectionBlock>
    </>
  );
}

function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <section className="max-w-[95vw] mx-auto px-6 py-12 border-t border-gray-800/50">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 10px rgba(34,197,94,0.2)",
                "0 0 30px rgba(34,197,94,0.4)",
                "0 0 10px rgba(34,197,94,0.2)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
          >
            <LayoutDashboard className="w-5 h-5 text-black" />
          </motion.div>
          <div>
            <h2 className="text-xl font-black font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              COMMAND CENTER
            </h2>
            <p className="text-gray-600 text-[11px] font-mono">
              FULL PLATFORM CONTROL • USER MANAGEMENT • FINANCE • 78 ROUTES •
              100+ ENDPOINTS
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-gray-950/50 border border-gray-800/50 rounded-xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide transition-all ${activeTab === tab.id ? "bg-green-500/15 text-green-400 border border-green-800/50" : "text-gray-500 hover:text-gray-400 hover:bg-gray-800/30 border border-transparent"}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {/* ═══ SYSTEM OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <>
              <LiveHealthPanel />

              <SectionBlock
                title="QUICK ACCESS — Admin Portals"
                icon={<Server className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/geo-admin"
                    label="Geo Admin Login Gate"
                    emoji="🌍"
                  />
                  <RouteLink
                    path="/geo-admin/dashboard"
                    label="Full CRUD + SQL + Backups"
                    emoji="🛡️"
                  />
                  <RouteLink
                    path="/admin/database"
                    label="Database Management"
                    emoji="🗄️"
                  />
                  <RouteLink
                    path="/admin/verification"
                    label="Verification Queue"
                    emoji="✅"
                  />
                  <RouteLink
                    path="/admin/tickets"
                    label="Ticket Management"
                    emoji="🎫"
                  />
                  <RouteLink
                    path="/auth/signin"
                    label="Main Sign In"
                    emoji="🔑"
                  />
                  <RouteLink
                    path="/auth/login"
                    label="Quick Login"
                    emoji="⚡"
                  />
                  <RouteLink
                    path="/api-test"
                    label="API Test Console"
                    emoji="🧪"
                  />
                  <RouteLink path="/api" label="API Documentation" emoji="📖" />
                  <RouteLink path="/docs" label="Platform Docs" emoji="📚" />
                  <RouteLink
                    path="/status"
                    label="System Status Page"
                    emoji="📊"
                  />
                  <RouteLink path="/versoai" label="VersoAI Chat" emoji="🤖" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="ARCHITECTURE OVERVIEW"
                icon={<Code2 className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow
                    label="Frontend"
                    value="React 18 + TypeScript + Vite 6"
                  />
                  <InfoRow
                    label="Backend"
                    value="Node.js + Express 4 + TypeScript"
                  />
                  <InfoRow
                    label="Database"
                    value="PostgreSQL + Drizzle ORM 0.39"
                  />
                  <InfoRow
                    label="Real-time"
                    value="Socket.io v4 (ws + polling)"
                  />
                  <InfoRow label="State" value="TanStack React Query v5" />
                  <InfoRow
                    label="Routing"
                    value="Wouter v3 (client) + Express Router"
                  />
                  <InfoRow
                    label="UI System"
                    value="shadcn/ui + Tailwind CSS 3 + Radix"
                  />
                  <InfoRow
                    label="Animations"
                    value="Framer Motion 11 + GSAP 3"
                  />
                  <InfoRow label="Charts" value="Chart.js 4 + Recharts 2" />
                  <InfoRow
                    label="Auth"
                    value="JWT (7d) + bcrypt(12) + HttpOnly cookies"
                  />
                  <InfoRow label="Validation" value="Zod 3 + drizzle-zod" />
                  <InfoRow label="Email" value="Nodemailer 8 (SMTP/Gmail)" />
                  <InfoRow label="Payments" value="Stripe 20 (optional)" />
                  <InfoRow
                    label="AI"
                    value="Ollama (llama3.2) + smart fallback"
                  />
                  <InfoRow
                    label="PDF"
                    value="PDFKit 0.17 (business registration)"
                  />
                  <InfoRow
                    label="Scheduling"
                    value="node-cron 4 (daily integrity + trials)"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SERVER CONFIGURATION"
                icon={<Settings className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="Port" value="5003 (0.0.0.0)" />
                  <InfoRow label="Body Limit" value="2MB JSON" />
                  <InfoRow
                    label="CORS Dev"
                    value="localhost:5003,3000,8080,5173"
                  />
                  <InfoRow label="JWT Expiry" value="7 days" />
                  <InfoRow
                    label="Auth Cookie"
                    value="auth_token (HttpOnly, SameSite=Lax, 7d)"
                  />
                  <InfoRow
                    label="CSRF Cookie"
                    value="csrf_token (non-HttpOnly, 24h TTL)"
                  />
                  <InfoRow label="Bcrypt" value="12 salt rounds" />
                  <InfoRow
                    label="Account Lock"
                    value="5 fails → 15 min lockout"
                  />
                  <InfoRow label="Reset Token" value="1 hour expiry" />
                  <InfoRow
                    label="HSTS"
                    value="31536000s + includeSubDomains + preload"
                  />
                  <InfoRow
                    label="Helmet CSP"
                    value="Full CSP (disabled in dev)"
                  />
                  <InfoRow label="WebSocket" value="ws + polling transports" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="RATE LIMITING"
                icon={<Gauge className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="Login" value="5 req / 15 min" />
                  <InfoRow label="Register" value="10 req / hour" />
                  <InfoRow label="Forgot Password" value="5 req / hour" />
                  <InfoRow label="API General" value="100 req / 15 min" />
                  <InfoRow label="Connections" value="5 req / hour" />
                  <InfoRow label="Profile" value="10 req / hour" />
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ ROUTES ═══ */}
          {activeTab === "routes" && (
            <>
              <SectionBlock
                title="PUBLIC PAGES (22)"
                icon={<Globe className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/" label="Home" emoji="🏠" />
                  <RouteLink path="/hub" label="Hub" emoji="🎯" />
                  <RouteLink path="/about" label="About" emoji="ℹ️" />
                  <RouteLink path="/contact" label="Contact" emoji="📧" />
                  <RouteLink path="/demo" label="Demo" emoji="🎬" />
                  <RouteLink path="/industries" label="Industries" emoji="🏭" />
                  <RouteLink path="/pricing" label="Pricing" emoji="💳" />
                  <RouteLink path="/blog" label="Blog / Community" emoji="📝" />
                  <RouteLink path="/faq" label="FAQ Forum" emoji="❓" />
                  <RouteLink path="/profile" label="User Profile" emoji="👤" />
                  <RouteLink
                    path="/marketplace"
                    label="Marketplace"
                    emoji="🛒"
                  />
                  <RouteLink path="/partners" label="Partners" emoji="🤝" />
                  <RouteLink path="/status" label="System Status" emoji="📊" />
                  <RouteLink
                    path="/get-involved"
                    label="Get Involved"
                    emoji="🙌"
                  />
                  <RouteLink
                    path="/ong-culturelle"
                    label="ONG Culturelle"
                    emoji="🎭"
                  />
                  <RouteLink
                    path="/artihuman-foundation"
                    label="ArtiHuman Foundation"
                    emoji="🌍"
                  />
                  <RouteLink path="/impact" label="Impact" emoji="💡" />
                  <RouteLink path="/tickets" label="Tickets" emoji="🎫" />
                  <RouteLink
                    path="/account/billing"
                    label="Billing"
                    emoji="💳"
                  />
                  <RouteLink
                    path="/ad-campaigns"
                    label="Ad Campaigns"
                    emoji="📢"
                  />
                  <RouteLink
                    path="/sponsorship"
                    label="Sponsorship"
                    emoji="⭐"
                  />
                  <RouteLink
                    path="/sponsor"
                    label="Sponsors Directory"
                    emoji="🏆"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SECTOR PAGES (14)"
                icon={<Layers className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/commerce"
                    label="E-Commerce Analytics"
                    emoji="🛍️"
                  />
                  <RouteLink
                    path="/hotellerie"
                    label="Hospitality Analytics"
                    emoji="🏨"
                  />
                  <RouteLink
                    path="/batiment"
                    label="Construction Analytics"
                    emoji="🏗️"
                  />
                  <RouteLink
                    path="/automobile"
                    label="Automotive Analytics"
                    emoji="🚗"
                  />
                  <RouteLink
                    path="/finances"
                    label="Finance Analytics"
                    emoji="💰"
                  />
                  <RouteLink
                    path="/divertissement"
                    label="Entertainment"
                    emoji="🎭"
                  />
                  <RouteLink path="/sante" label="Healthcare" emoji="🏥" />
                  <RouteLink path="/logement" label="Housing" emoji="🏠" />
                  <RouteLink
                    path="/reservations"
                    label="Reservations"
                    emoji="📅"
                  />
                  <RouteLink
                    path="/businesses-directory"
                    label="Business Directory"
                    emoji="📋"
                  />
                  <RouteLink
                    path="/business/:id"
                    label="Business Detail"
                    emoji="🔍"
                  />
                  <RouteLink
                    path="/category/:slug"
                    label="Category Detail"
                    emoji="🏷️"
                  />
                  <RouteLink
                    path="/annuaire-tv"
                    label="Annuaire TV"
                    emoji="📺"
                  />
                  <RouteLink
                    path="/database-results"
                    label="Database Results"
                    emoji="🗃️"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SERVICES & CAREERS (5)"
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/services" label="Services Hub" emoji="📋" />
                  <RouteLink path="/services/news" label="News" emoji="📰" />
                  <RouteLink
                    path="/services/careers"
                    label="Careers Portal"
                    emoji="💼"
                  />
                  <RouteLink
                    path="/services/contractors"
                    label="Contractors"
                    emoji="👷"
                  />
                  <RouteLink path="/contracts" label="Contracts" emoji="📄" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="CULTURAL & ARTISAN (9)"
                icon={<Palette className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/artisans"
                    label="Artisans Directory"
                    emoji="🎨"
                  />
                  <RouteLink
                    path="/artistes"
                    label="Artist Directory"
                    emoji="🎵"
                  />
                  <RouteLink
                    path="/artist-portal"
                    label="Artist Portal Welcome"
                    emoji="🎤"
                  />
                  <RouteLink
                    path="/artist-portal/dashboard"
                    label="Artist Dashboard"
                    emoji="📊"
                  />
                  <RouteLink
                    path="/programs"
                    label="Cultural Programs"
                    emoji="🎭"
                  />
                  <RouteLink
                    path="/communities"
                    label="Communities"
                    emoji="👥"
                  />
                  <RouteLink
                    path="/community"
                    label="Community Detail"
                    emoji="🏘️"
                  />
                  <RouteLink
                    path="/artisan-workshops"
                    label="Artisan Workshops"
                    emoji="🔨"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="AUTH & ADMIN (13)"
                icon={<Shield className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/auth/signin"
                    label="Sign In (Full)"
                    emoji="🔐"
                  />
                  <RouteLink
                    path="/auth/login"
                    label="Quick Login"
                    emoji="⚡"
                  />
                  <RouteLink
                    path="/auth/password"
                    label="Credentials (DEV)"
                    emoji="🗝️"
                  />
                  <RouteLink
                    path="/geo-admin"
                    label="Geo Admin Gate"
                    emoji="🌍"
                  />
                  <RouteLink
                    path="/geo-admin/dashboard"
                    label="Admin Dashboard"
                    emoji="🛡️"
                  />
                  <RouteLink
                    path="/geo-admin/business-verification"
                    label="Business Verification"
                    emoji="✅"
                  />
                  <RouteLink
                    path="/geo-admin/immobilier"
                    label="Immobilier Portal"
                    emoji="🏢"
                  />
                  <RouteLink
                    path="/dashboard"
                    label="User Dashboard"
                    emoji="📈"
                  />
                  <RouteLink
                    path="/admin/database"
                    label="DB Management Center"
                    emoji="🗄️"
                  />
                  <RouteLink
                    path="/admin/verification"
                    label="Verification Admin"
                    emoji="✔️"
                  />
                  <RouteLink
                    path="/admin/tickets"
                    label="Ticket Management"
                    emoji="🎫"
                  />
                  <RouteLink
                    path="/sys/0x7f3a9c"
                    label="Credentials Vault (SU)"
                    emoji="🔐"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="HELP & SUPPORT (9)"
                icon={<BookOpen className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/sav" label="SAV (After-Sales)" emoji="🛠️" />
                  <RouteLink
                    path="/versoai"
                    label="VersoAI Assistant"
                    emoji="🤖"
                  />
                  <RouteLink path="/help" label="Help Center" emoji="❓" />
                  <RouteLink
                    path="/help/account"
                    label="Account Help"
                    emoji="👤"
                  />
                  <RouteLink
                    path="/help/payments"
                    label="Payments Help"
                    emoji="💳"
                  />
                  <RouteLink
                    path="/help/delivery"
                    label="Delivery Help"
                    emoji="📦"
                  />
                  <RouteLink
                    path="/help/product"
                    label="Product Help"
                    emoji="📱"
                  />
                  <RouteLink
                    path="/help/returns"
                    label="Returns Help"
                    emoji="↩️"
                  />
                  <RouteLink
                    path="/help/guarantee"
                    label="Guarantee Help"
                    emoji="🛡️"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="DEVELOPER & DOCS (3)"
                icon={<Code2 className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/api" label="API Documentation" emoji="📖" />
                  <RouteLink
                    path="/api-test"
                    label="API Test Console"
                    emoji="🧪"
                  />
                  <RouteLink
                    path="/docs"
                    label="Platform Documentation"
                    emoji="📚"
                  />
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ API ENDPOINTS ═══ */}
          {activeTab === "api" && (
            <>
              <SectionBlock
                title="AUTH ENDPOINTS (/auth)"
                icon={<Shield className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <ApiEndpoint
                  method="POST"
                  path="/auth/register"
                  desc="Create account (rate-limited)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/login"
                  desc="Email+password login (JWT)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/logout"
                  desc="Clear auth cookie"
                />
                <ApiEndpoint
                  method="GET"
                  path="/auth/verify-email"
                  desc="Email verification via token"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/resend-verification"
                  desc="Resend verification email"
                />
                <ApiEndpoint
                  method="GET"
                  path="/auth/verify"
                  desc="Verify JWT validity"
                />
                <ApiEndpoint
                  method="GET"
                  path="/auth/session"
                  desc="Current user session info"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/forgot-password"
                  desc="Send reset email"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/reset-password"
                  desc="Reset via token"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/admin-gate"
                  desc="6-digit admin gate code"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/geo-admin"
                  desc="Geo-admin login (dev/ops)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/start-trial"
                  desc="Start 7-day free trial"
                />
              </SectionBlock>

              <SectionBlock
                title="BUSINESSES (/api/businesses)"
                icon={<Globe className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses"
                  desc="List (paginated, filtered, tier-sorted)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/:id"
                  desc="Detail + services + reviews"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/businesses"
                  desc="Create business"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/businesses/:id"
                  desc="Update (audit trail)"
                />
                <ApiEndpoint
                  method="DELETE"
                  path="/api/businesses/:id"
                  desc="Delete business"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/stats/summary"
                  desc="Aggregate stats"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/by-category/:id"
                  desc="Filter by category"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/businesses/bulk-update"
                  desc="Transactional bulk update"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/table-counts"
                  desc="PostgreSQL row counts"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/businesses/submit"
                  desc="Submit for approval (PDF)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/pending"
                  desc="Pending approval queue"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/businesses/:id/approve"
                  desc="Approve pending"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/businesses/:id/reject"
                  desc="Reject pending"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/:id/pdf"
                  desc="Download registration PDF"
                />
              </SectionBlock>

              <SectionBlock
                title="SEARCH (/api/search)"
                icon={<Search className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/search/businesses"
                  desc="Geo-aware Haversine search"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/search/health"
                  desc="DB connection test"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/search/test-business"
                  desc="Create test business (dev)"
                />
              </SectionBlock>

              <SectionBlock
                title="PROPERTIES (/api/properties)"
                icon={<MapPin className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/properties"
                  desc="List (paginated, filtered)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/properties/:id"
                  desc="Property detail"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/properties"
                  desc="Create listing"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/properties/city/:city"
                  desc="By city"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/properties/filters"
                  desc="Distinct cities/types/cats"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/admin/verification/pending"
                  desc="Unverified properties"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/admin/verification/:id/verify"
                  desc="Verify property"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/admin/verification/:id/reject"
                  desc="Reject property"
                />
              </SectionBlock>

              <SectionBlock
                title="TICKETS (/api/tickets)"
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/tickets"
                  desc="List all tickets"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/tickets"
                  desc="Create (with SLA)"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/tickets/:id"
                  desc="Update ticket"
                />
                <ApiEndpoint
                  method="DELETE"
                  path="/api/tickets/:id"
                  desc="Delete ticket"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/tickets/:id/assign"
                  desc="Assign ticket"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/tickets/:id/escalate"
                  desc="Escalate to critical"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/tickets/stats/summary"
                  desc="Stats + SLA compliance"
                />
              </SectionBlock>

              <SectionBlock
                title="JOBS (/api/jobs)"
                icon={<FileCode className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/jobs"
                  desc="List (filtered)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/jobs/search"
                  desc="Search + pagination"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs"
                  desc="Create job listing"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs/generate"
                  desc="Generate random (dev)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs/:id/apply"
                  desc="Apply for job"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs/:id/save"
                  desc="Save job"
                />
              </SectionBlock>

              <SectionBlock
                title="MUSIC (/api/music)"
                icon={<Radio className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/music/artists"
                  desc="List artists"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/music/tracks"
                  desc="List tracks"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/music/analytics"
                  desc="Music analytics"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/music/artists/:id"
                  desc="Artist + tracks"
                />
              </SectionBlock>

              <SectionBlock
                title="SOCIAL / BLOG (/api/social)"
                icon={<Users className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/social/feed"
                  desc="Community feed"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/posts"
                  desc="Create post"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/posts/:id/like"
                  desc="Like post"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/posts/:id/comment"
                  desc="Comment"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/follow/:id"
                  desc="Follow user"
                />
              </SectionBlock>

              <SectionBlock
                title="DATABASE MANAGEMENT (/api/database)"
                icon={<Database className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/categories"
                  desc="List all categories"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/countries"
                  desc="List countries"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/regions"
                  desc="List regions"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/cities"
                  desc="List cities"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/artists"
                  desc="List artists (CRUD)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/contractors"
                  desc="List contractors (CRUD)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/database/stats"
                  desc="DB stats + health"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/database/tables"
                  desc="All PG table metadata"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/database/export"
                  desc="Export (JSON/CSV)"
                />
              </SectionBlock>

              <SectionBlock
                title="ADMIN V1 (/api/v1/admin)"
                icon={<Crown className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/businesses"
                  desc="Admin business CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/categories"
                  desc="Admin category CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/users"
                  desc="Admin user management"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/roles"
                  desc="Role management"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/campaigns"
                  desc="Ad campaign CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/jobs"
                  desc="Admin job CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/artists"
                  desc="Admin artist CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/security"
                  desc="Security controls"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/verification"
                  desc="Verification mgmt"
                />
              </SectionBlock>

              <SectionBlock
                title="UTILITY ENDPOINTS"
                icon={<Plug className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/csrf-token"
                  desc="Get CSRF token"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/health"
                  desc="Health check"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/status"
                  desc="Server status"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/ping"
                  desc="Connectivity test"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/countries"
                  desc="Country list"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/detect-country"
                  desc="IP geolocation"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/home/stats"
                  desc="Home page stats"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/ai/chat"
                  desc="VersoAI chat"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/ai/status"
                  desc="Ollama status"
                />
              </SectionBlock>
            </>
          )}

          {/* ═══ DATABASE ═══ */}
          {activeTab === "database" && (
            <>
              <SectionBlock
                title="DATABASE CONFIG"
                icon={<Settings className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <InfoRow label="Engine" value="PostgreSQL" />
                <InfoRow
                  label="ORM"
                  value="Drizzle ORM 0.39 + drizzle-kit 0.31"
                />
                <InfoRow
                  label="Database"
                  value="versoair_business_intelligence"
                  copyable
                />
                <InfoRow
                  label="Schema File"
                  value="shared/schema.ts (single source of truth)"
                />
                <InfoRow
                  label="Migrations"
                  value="./migrations (drizzle-kit)"
                />
                <InfoRow
                  label="Push Command"
                  value="npm run db:push"
                  copyable
                />
                <InfoRow label="Studio" value="npm run db:studio" copyable />
                <InfoRow
                  label="Validation"
                  value="Auto Zod schemas via drizzle-zod"
                />
              </SectionBlock>

              <SectionBlock
                title="TABLES (28)"
                icon={<Table2 className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <div className="space-y-1.5">
                  <DbTable
                    name="users"
                    columns="id, username, email, password, role, is_verified, failed_login_attempts, locked_until, subscription_tier, subscription_status, trial_tier, trial_started_at, trial_expires_at, reset_token, reset_token_expires, avatar_url, bio, created_at"
                  />
                  <DbTable
                    name="businesses"
                    columns="id, name, description, category_id, country_id, region_id, city_id, address, latitude, longitude, phone, email, website, image_url, rating, revenue, status, subscription_tier, business_type, specialization, approval_status, submitted_by, approved_by, approval_notes, pdf_path, created_at, updated_at"
                  />
                  <DbTable
                    name="businessCategories"
                    columns="id, name, slug, icon, sector, description, created_at"
                  />
                  <DbTable
                    name="countries"
                    columns="id, name, code, flag_emoji"
                  />
                  <DbTable
                    name="regions"
                    columns="id, name, country_id, code"
                  />
                  <DbTable
                    name="cities"
                    columns="id, name, country_id, region_id, population, is_capital"
                  />
                  <DbTable
                    name="properties"
                    columns="id, title, description, property_type, transaction_type, price, currency, surface_area, rooms, bedrooms, bathrooms, address, city, country, latitude, longitude, images, is_verified, created_at"
                  />
                  <DbTable
                    name="jobs"
                    columns="id, title, company, description, location, salary_min, salary_max, currency, job_type, experience_level, category, skills, remote, application_url, created_at"
                  />
                  <DbTable
                    name="artists"
                    columns="id, name, specialty, bio, portfolio_url, image_url, location, rating, created_at"
                  />
                  <DbTable
                    name="contractors"
                    columns="id, name, specialty, company, license_number, email, phone, rating, created_at"
                  />
                  <DbTable
                    name="tickets"
                    columns="id, title, description, status, priority, category, sla_level, sla_deadline, assigned_to, reporter_email, reporter_name, resolution, created_at, updated_at"
                  />
                  <DbTable
                    name="ticketAssignments"
                    columns="id, ticket_id, assigned_to, assigned_at"
                  />
                  <DbTable
                    name="connections"
                    columns="id, requester_id, target_id, status, created_at (unique pair)"
                  />
                  <DbTable
                    name="transactions"
                    columns="id, user_id, amount, type, description, created_at"
                  />
                  <DbTable
                    name="businessReviews"
                    columns="id, business_id, rating, comment, reviewer, created_at"
                  />
                  <DbTable
                    name="auditLogs"
                    columns="id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at"
                  />
                  <DbTable
                    name="adCampaigns"
                    columns="id, name, budget, status, start_date, end_date, target_audience, created_at"
                  />
                  <DbTable
                    name="reservations"
                    columns="id, business_id, customer_name, date, time, party_size, status, created_at"
                  />
                  <DbTable
                    name="analytics"
                    columns="id, entity_id, entity_type, metric_type, value, date, metadata (unique entity+type+date)"
                  />
                  <DbTable
                    name="musicArtists"
                    columns="id, name, genre, bio, image_url, created_at"
                  />
                  <DbTable
                    name="musicTracks"
                    columns="id, title, artist_id, genre, duration, plays, url, created_at"
                  />
                  <DbTable
                    name="musicAnalytics"
                    columns="id, track_id, plays, date"
                  />
                  <DbTable
                    name="notifications"
                    columns="id, user_id, type, title, message, data, read, link, actor_id, created_at"
                  />
                  <DbTable
                    name="verifications"
                    columns="id, user_id, verification_type, status, document_url, notes, submitted_at, reviewed_at, reviewer_id, digital_passport, business_id, property_id"
                  />
                  <DbTable
                    name="verificationTokens"
                    columns="id, user_id, token, type, expires_at, created_at"
                  />
                  <DbTable
                    name="userSettings"
                    columns="id, user_id, sector, setting_key, setting_value, is_active, updated_at (unique userId+sector+key)"
                  />
                  <DbTable
                    name="settingsTemplates"
                    columns="id, sector, default_settings, updated_at"
                  />
                  <DbTable
                    name="emailSubscriptions"
                    columns="id, user_id, type, email, frequency, is_active, sectors, categories, created_at, updated_at (unique userId+type)"
                  />
                  <DbTable
                    name="emailQueue"
                    columns="id, subscription_id, user_id, subject, html_content, text_content, status, scheduled_for, sent_at, error, created_at"
                  />
                  <DbTable
                    name="paymentCardTypes"
                    columns="id, name, brand, icon, created_at"
                  />
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ AUTH SYSTEM ═══ */}
          {activeTab === "auth" && (
            <>
              <SectionBlock
                title="AUTH FLOW"
                icon={<Key className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <InfoRow
                  label="Strategy"
                  value="JWT + HttpOnly cookie + Bearer header"
                />
                <InfoRow
                  label="Token Expiry"
                  value="7 days (configurable via JWT_EXPIRES_IN)"
                />
                <InfoRow label="Cookie Name" value="auth_token" copyable />
                <InfoRow
                  label="Cookie Flags"
                  value="HttpOnly, SameSite=Lax, Secure (prod), path=/"
                />
                <InfoRow
                  label="Bearer Format"
                  value="Authorization: Bearer <token>"
                />
                <InfoRow
                  label="Hash Algorithm"
                  value="bcrypt, 12 salt rounds"
                />
                <InfoRow
                  label="Token Payload"
                  value="{ userId, email, role, subscriptionTier }"
                />
              </SectionBlock>

              <SectionBlock
                title="CSRF PROTECTION"
                icon={<Shield className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <InfoRow
                  label="Strategy"
                  value="Hybrid: double-submit cookie + synchronizer token"
                />
                <InfoRow
                  label="Cookie"
                  value="csrf_token (non-HttpOnly, SameSite=Lax)"
                />
                <InfoRow label="Header" value="x-csrf-token" copyable />
                <InfoRow
                  label="TTL"
                  value="24 hours, periodic server-side cleanup"
                />
                <InfoRow
                  label="Exempt Paths"
                  value="/auth/login, /auth/register, /auth/geo-admin"
                />
                <InfoRow
                  label="Fetch Endpoint"
                  value="GET /api/csrf-token"
                  copyable
                />
              </SectionBlock>

              <SectionBlock
                title="ACCOUNT SECURITY"
                icon={<Lock className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <InfoRow label="Failed Login Limit" value="5 attempts" />
                <InfoRow label="Lockout Duration" value="15 minutes" />
                <InfoRow
                  label="Email Verification"
                  value="Required before login (token-based)"
                />
                <InfoRow
                  label="Password Reset"
                  value="1-hour expiry token via email"
                />
                <InfoRow
                  label="Session Sync"
                  value="Cross-tab via localStorage events"
                />
              </SectionBlock>

              <SectionBlock
                title="USER ROLES & TIERS"
                icon={<Crown className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow
                    label="Roles"
                    value="superuser, admin, moderator, business_owner, user"
                  />
                  <InfoRow
                    label="Tier Hierarchy"
                    value="free → essential → verified → max → enterprise"
                  />
                  <InfoRow
                    label="Trial System"
                    value="7-day free trial per tier"
                  />
                  <InfoRow
                    label="Trial Expiry Check"
                    value="Daily cron via node-cron"
                  />
                  <InfoRow
                    label="Middleware"
                    value="requireAuth(roles[]), optionalAuth()"
                  />
                  <InfoRow
                    label="Tier Middleware"
                    value="requireSubscription(feature)"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SPECIAL ACCESS METHODS"
                icon={<Zap className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <InfoRow
                  label="Geo Admin Login"
                  value="POST /auth/geo-admin → username 'geoadmin' + any 7-char pwd"
                />
                <InfoRow
                  label="Admin Gate"
                  value="POST /auth/admin-gate → 6-digit code"
                />
                <InfoRow
                  label="Session Backdoor"
                  value="GET /auth/session → Base64 'geoadmin:*' token"
                />
                <InfoRow
                  label="Blog Auth"
                  value="Client-side gate (community blog posts)"
                />
                <InfoRow
                  label="Careers Auth"
                  value="Client-side gate (job applications)"
                />
              </SectionBlock>

              <SectionBlock
                title="WEBSOCKET AUTH"
                icon={<Radio className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <InfoRow label="Library" value="Socket.io v4 (ws + polling)" />
                <InfoRow
                  label="Auth Flow"
                  value="Client emits 'authenticate' → joins user_<id> room"
                />
                <InfoRow
                  label="User Tracking"
                  value="connectedUsers Map (multi-device)"
                />
                <InfoRow
                  label="Events"
                  value="connection_request, connection_accepted, job_posted, reservation_update, profile_updated, contract_posted"
                />
              </SectionBlock>
            </>
          )}

          {/* ═══ SERVICES ═══ */}
          {activeTab === "services" && (
            <>
              <SectionBlock
                title="CORE SERVICES (server/services/)"
                icon={<Blocks className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                {[
                  {
                    name: "email-service.ts",
                    desc: "Nodemailer SMTP transporter — verification emails, password resets, approval/rejection notifications",
                    icon: <Mail className="h-3 w-3 text-blue-400" />,
                  },
                  {
                    name: "email-queue-processor.ts",
                    desc: "Hourly queue processor — batched alerts & digests from emailQueue table",
                    icon: <Mail className="h-3 w-3 text-cyan-400" />,
                  },
                  {
                    name: "notification-service.ts",
                    desc: "EventEmitter-based notifications — connections, jobs, reservations → Socket.io broadcast",
                    icon: <Bell className="h-3 w-3 text-amber-400" />,
                  },
                  {
                    name: "category-integrity-check.ts",
                    desc: "Daily + startup integrity check preventing category data corruption",
                    icon: <Shield className="h-3 w-3 text-red-400" />,
                  },
                  {
                    name: "business-validation.ts",
                    desc: "Category validation preventing orphaned/mismatched business categories",
                    icon: <CheckCircle2 className="h-3 w-3 text-green-400" />,
                  },
                  {
                    name: "category-seed-data.ts",
                    desc: "Seed data for all business categories (initial bootstrap)",
                    icon: <Database className="h-3 w-3 text-purple-400" />,
                  },
                  {
                    name: "analytics-service.ts",
                    desc: "Aggregates analytics data across entities (revenue, performance, trends)",
                    icon: <Activity className="h-3 w-3 text-emerald-400" />,
                  },
                  {
                    name: "pdf-generator.ts",
                    desc: "PDFKit-based business registration PDF generation",
                    icon: <FileText className="h-3 w-3 text-rose-400" />,
                  },
                  {
                    name: "subscription-scheduler.ts",
                    desc: "Daily cron checking expired trials & subscriptions (node-cron)",
                    icon: <Clock className="h-3 w-3 text-orange-400" />,
                  },
                  {
                    name: "versoai-service.ts",
                    desc: "AI chat — tries Ollama (llama3.2) locally, falls back to smart template responses",
                    icon: <Bot className="h-3 w-3 text-violet-400" />,
                  },
                  {
                    name: "ai-context-provider.ts",
                    desc: "Platform knowledge base context for AI conversations",
                    icon: <Bot className="h-3 w-3 text-indigo-400" />,
                  },
                  {
                    name: "gtm-service.ts",
                    desc: "Google Tag Manager event tracking integration",
                    icon: <Activity className="h-3 w-3 text-teal-400" />,
                  },
                ].map((svc, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-gray-800/20 last:border-0"
                  >
                    <div className="mt-0.5 flex-shrink-0">{svc.icon}</div>
                    <div className="min-w-0">
                      <code className="text-[11px] text-green-400 font-mono font-bold">
                        {svc.name}
                      </code>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {svc.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </SectionBlock>

              <SectionBlock
                title="MIDDLEWARE STACK (server/middleware/)"
                icon={<Layers className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                {[
                  {
                    name: "auth.ts",
                    desc: "requireAuth(roles[]) — JWT verification from cookie/header. optionalAuth() for public+auth routes",
                    icon: <Shield className="h-3 w-3 text-red-400" />,
                  },
                  {
                    name: "csrf.ts",
                    desc: "Double-submit cookie + synchronizer token. 24h TTL, periodic cleanup. Exempts auth endpoints",
                    icon: <Lock className="h-3 w-3 text-amber-400" />,
                  },
                  {
                    name: "rate-limiter.ts",
                    desc: "express-rate-limit instances: login (5/15m), register (10/h), API (100/15m), forgot-pwd (5/h)",
                    icon: <Gauge className="h-3 w-3 text-orange-400" />,
                  },
                  {
                    name: "custom-rate-limiter.ts",
                    desc: "In-memory rate limiter with X-RateLimit-* headers + periodic store cleanup",
                    icon: <Gauge className="h-3 w-3 text-yellow-400" />,
                  },
                  {
                    name: "subscription.ts",
                    desc: "requireSubscription(feature) — tier enforcement (free → essential → verified → max → enterprise)",
                    icon: <CreditCard className="h-3 w-3 text-purple-400" />,
                  },
                  {
                    name: "validation.ts",
                    desc: "Zod-based validateBody(schema) + validateQuery(schema) middleware",
                    icon: <CheckCircle2 className="h-3 w-3 text-cyan-400" />,
                  },
                  {
                    name: "error-handler.ts",
                    desc: "Global error handler (DB, JWT, validation, 500). notFoundHandler for 404s",
                    icon: <AlertTriangle className="h-3 w-3 text-red-500" />,
                  },
                  {
                    name: "async-handler.ts",
                    desc: "Wraps async route handlers to catch Promise rejections",
                    icon: <Code2 className="h-3 w-3 text-gray-400" />,
                  },
                ].map((mw, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-gray-800/20 last:border-0"
                  >
                    <div className="mt-0.5 flex-shrink-0">{mw.icon}</div>
                    <div className="min-w-0">
                      <code className="text-[11px] text-blue-400 font-mono font-bold">
                        {mw.name}
                      </code>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {mw.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </SectionBlock>
            </>
          )}

          {/* ═══ ENVIRONMENT ═══ */}
          {activeTab === "env" && (
            <>
              <SectionBlock
                title="REQUIRED"
                icon={<AlertTriangle className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <InfoRow
                  label="DATABASE_URL"
                  value="postgresql://...versoair_business_intelligence"
                  copyable
                />
                <InfoRow
                  label="JWT_SECRET"
                  value="(generate: openssl rand -hex 32)"
                />
                <InfoRow
                  label="SESSION_SECRET"
                  value="(generate: openssl rand -hex 32)"
                />
              </SectionBlock>

              <SectionBlock
                title="SERVER"
                icon={<Server className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <InfoRow label="NODE_ENV" value="development" />
                <InfoRow label="PORT" value="5003" />
                <InfoRow
                  label="CORS_ORIGIN"
                  value="localhost:5003,3000,8080,5173 (comma-sep)"
                />
                <InfoRow label="VITE_API_URL" value="http://localhost:5003" />
                <InfoRow label="BASE_URL" value="http://localhost:5003" />
                <InfoRow
                  label="PRODUCTION_URL"
                  value="http://localhost:5003 (Socket.io CORS)"
                />
              </SectionBlock>

              <SectionBlock
                title="DATABASE (fallbacks)"
                icon={<Database className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <InfoRow label="PGUSER" value="versoair" />
                <InfoRow label="PGPASSWORD" value="versoair2025" />
                <InfoRow label="PGHOST" value="localhost" />
                <InfoRow label="PGPORT" value="5432" />
                <InfoRow
                  label="PGDATABASE"
                  value="versoair_business_intelligence"
                />
              </SectionBlock>

              <SectionBlock
                title="AUTH"
                icon={<Key className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <InfoRow
                  label="JWT_SECRET"
                  value="(required — fatal if missing)"
                />
                <InfoRow label="JWT_EXPIRES_IN" value="7d (default)" />
              </SectionBlock>

              <SectionBlock
                title="EMAIL (SMTP)"
                icon={<Mail className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <InfoRow label="SMTP_HOST" value="smtp.gmail.com" />
                <InfoRow label="SMTP_PORT" value="587" />
                <InfoRow label="SMTP_USER" value="(optional — your Gmail)" />
                <InfoRow label="SMTP_PASS" value="(optional — app password)" />
                <InfoRow label="EMAIL_FROM" value="noreply@versoair.com" />
              </SectionBlock>

              <SectionBlock
                title="INTEGRATIONS"
                icon={<Plug className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <InfoRow label="STRIPE_SECRET_KEY" value="(optional)" />
                <InfoRow label="STRIPE_WEBHOOK_SECRET" value="(optional)" />
                <InfoRow
                  label="OLLAMA_BASE_URL"
                  value="http://localhost:11434"
                />
                <InfoRow label="OLLAMA_MODEL" value="llama3.2" />
                <InfoRow
                  label="SKIP_CATEGORY_CHECK"
                  value="false (set true to skip integrity)"
                />
              </SectionBlock>
            </>
          )}

          {/* ═══ TECH STACK ═══ */}
          {activeTab === "stack" && (
            <>
              <SectionBlock
                title="NPM SCRIPTS"
                icon={<Terminal className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <InfoRow
                  label="npm run dev"
                  value="Start full-stack dev server (port 5003)"
                  copyable
                />
                <InfoRow
                  label="npm run build"
                  value="Vite build + esbuild server bundle"
                  copyable
                />
                <InfoRow
                  label="npm run check"
                  value="TypeScript type-check (tsc)"
                  copyable
                />
                <InfoRow
                  label="npm run db:push"
                  value="Push Drizzle schema to DB"
                  copyable
                />
                <InfoRow
                  label="npm run db:studio"
                  value="Open Drizzle Studio (visual DB)"
                  copyable
                />
              </SectionBlock>

              <SectionBlock
                title="FRONTEND (97 deps)"
                icon={<MonitorSmartphone className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="React" value="18.x" />
                  <InfoRow label="TypeScript" value="5.6" />
                  <InfoRow label="Vite" value="6.x" />
                  <InfoRow label="Wouter" value="3.x (routing)" />
                  <InfoRow label="TanStack Query" value="5.x (data fetching)" />
                  <InfoRow label="Framer Motion" value="11.x (animations)" />
                  <InfoRow label="GSAP" value="3.x (scroll animations)" />
                  <InfoRow label="Chart.js" value="4.x" />
                  <InfoRow label="Recharts" value="2.x" />
                  <InfoRow label="Tailwind CSS" value="3.x" />
                  <InfoRow label="Radix UI" value="20+ primitives" />
                  <InfoRow label="Lucide React" value="Icons" />
                  <InfoRow label="cmdk" value="Command palette" />
                  <InfoRow label="Embla Carousel" value="Carousel" />
                  <InfoRow label="React Hook Form" value="Forms" />
                  <InfoRow label="Sonner" value="Toasts" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="BACKEND"
                icon={<Server className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="Express" value="4.x" />
                  <InfoRow label="Drizzle ORM" value="0.39" />
                  <InfoRow label="PostgreSQL (pg)" value="8.x" />
                  <InfoRow label="Socket.io" value="4.x" />
                  <InfoRow label="jsonwebtoken" value="JWT auth" />
                  <InfoRow label="bcryptjs" value="Password hashing" />
                  <InfoRow label="Nodemailer" value="8.x (email)" />
                  <InfoRow label="Stripe" value="20.x (payments)" />
                  <InfoRow label="PDFKit" value="0.17 (PDF gen)" />
                  <InfoRow label="node-cron" value="4.x (scheduling)" />
                  <InfoRow label="Zod" value="3.x (validation)" />
                  <InfoRow label="Helmet" value="Security headers" />
                  <InfoRow label="express-rate-limit" value="Rate limiting" />
                  <InfoRow label="memorystore" value="Session store" />
                  <InfoRow label="nanoid" value="ID generation" />
                  <InfoRow label="Puppeteer" value="24.x (dev tooling)" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="DIRECTORY STRUCTURE"
                icon={<GitBranch className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <div className="font-mono text-[11px] text-gray-400 bg-black/40 rounded-lg p-4 leading-relaxed">
                  <div className="text-green-400">client/src/</div>
                  <div className="ml-4">
                    ├── pages/{" "}
                    <span className="text-gray-600">
                      — Route pages (78 files)
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── components/{" "}
                    <span className="text-gray-600">
                      — Reusable UI (shadcn/ui)
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── components/ui/{" "}
                    <span className="text-gray-600">
                      — 64+ shadcn components
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── hooks/{" "}
                    <span className="text-gray-600">— Custom React hooks</span>
                  </div>
                  <div className="ml-4">
                    ├── contexts/{" "}
                    <span className="text-gray-600">
                      — AuthContext, CountryContext
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── lib/{" "}
                    <span className="text-gray-600">
                      — queryClient, auth utilities
                    </span>
                  </div>
                  <div className="ml-4">
                    └── utils/{" "}
                    <span className="text-gray-600">
                      — query-security, a11y
                    </span>
                  </div>
                  <div className="text-green-400 mt-2">server/</div>
                  <div className="ml-4">
                    ├── routes/{" "}
                    <span className="text-gray-600">
                      — API endpoints by domain
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── routes/api-v1/{" "}
                    <span className="text-gray-600">
                      — v1 API (admin, etc.)
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── middleware/{" "}
                    <span className="text-gray-600">
                      — Auth, CSRF, rate-limit, validation
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── services/{" "}
                    <span className="text-gray-600">
                      — Business logic (12 services)
                    </span>
                  </div>
                  <div className="ml-4">
                    └── websocket/{" "}
                    <span className="text-gray-600">— Socket.io config</span>
                  </div>
                  <div className="text-green-400 mt-2">shared/</div>
                  <div className="ml-4">
                    └── schema.ts{" "}
                    <span className="text-gray-600">
                      — Drizzle tables + Zod validators
                    </span>
                  </div>
                  <div className="text-green-400 mt-2">db/</div>
                  <div className="ml-4">
                    └── index.ts{" "}
                    <span className="text-gray-600">— DB connection pool</span>
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock
                title="PRODUCTION CHECKLIST"
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <div className="space-y-1.5 text-[11px] font-mono">
                  {[
                    "Generate fresh JWT_SECRET & SESSION_SECRET (openssl rand -hex 32)",
                    "Set NODE_ENV=production",
                    "Set DATABASE_URL to production PostgreSQL",
                    "Set CORS_ORIGIN to your domain only",
                    "Enable HTTPS/TLS (Let's Encrypt)",
                    "Configure firewall (ports 80, 443 only)",
                    "Run npm run build → npm start",
                    "Run npm run db:push (apply schema)",
                    "Set up automatic daily DB backups",
                    "Enable 2FA for admin accounts",
                    "Rotate all test credentials",
                    "Set up PM2 for process management",
                    "Configure Nginx reverse proxy",
                    "Set up monitoring (Sentry, DataDog, New Relic)",
                    "Enable SSL certificate auto-renewal",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-gray-500"
                    >
                      <span className="text-gray-700 flex-shrink-0 mt-0.5">
                        ☐
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ USERS CONTROL ═══ */}
          {activeTab === "users" && <UsersControlPanel />}

          {/* ═══ FINANCE & PAYMENTS ═══ */}
          {activeTab === "finance" && <FinanceControlPanel />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// �🏠 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

export default function CredentialsVault() {
  const { user, loading, token } = useAuthContext();
  const [, navigate] = useLocation();

  // ═══════════════════════════════════════════════════════════
  // 🔐 VAULT IDENTITY LOCK — superadmin@versoair.test ONLY
  // Server-verified. Even other superusers are denied.
  // Passphrase alone is NOT enough — you must BE superadmin.
  // ═══════════════════════════════════════════════════════════
  const [vaultAuthorized, setVaultAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/signin?redirect=/sys/0x7f3a9c");
      return;
    }

    if (!loading && user && token) {
      // Verify with server that this specific user is the vault master
      fetch("/api/vault/authorize", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          setVaultAuthorized(data.authorized === true);
        })
        .catch(() => {
          setVaultAuthorized(false);
        });
    }
  }, [loading, user, token, navigate]);

  // Client-side pre-check (server is the real authority)
  const isSuperuser = vaultAuthorized === true;

  const [gateComplete, setGateComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Filter credentials
  const displayedCredentials = useMemo(() => {
    let result = CREDENTIALS;
    if (searchQuery) {
      result = searchCredentials(searchQuery);
    }
    if (selectedRole) {
      result = result.filter((c) => c.role === selectedRole);
    }
    return result;
  }, [searchQuery, selectedRole]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Toggle individual password
  const togglePassword = useCallback((id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Toggle all passwords
  const toggleAllPasswords = useCallback(() => {
    const newState = !showAllPasswords;
    setShowAllPasswords(newState);
    const map: Record<string, boolean> = {};
    CREDENTIALS.forEach((c) => {
      map[c.id] = newState;
    });
    setShowPasswords(map);
  }, [showAllPasswords]);

  // Quick login
  const handleQuickLogin = useCallback((credential: Credential) => {
    sessionStorage.setItem("quick_login_email", credential.email);
    sessionStorage.setItem("quick_login_password", credential.password);
    window.location.href = "/auth/signin";
  }, []);

  // Export credentials as JSON
  const handleExport = useCallback(() => {
    const data = displayedCredentials.map((c) => ({
      username: c.username,
      email: c.email,
      password: c.password,
      role: c.role,
      sector: c.sector || "—",
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `versoair-credentials-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayedCredentials]);

  // Role stats
  const roleStats = useMemo(
    () => [
      {
        id: "superuser",
        label: "Superusers",
        count: getCredentialsByRole("superuser").length,
      },
      {
        id: "admin",
        label: "Admins",
        count: getCredentialsByRole("admin").length,
      },
      {
        id: "moderator",
        label: "Moderators",
        count: getCredentialsByRole("moderator").length,
      },
      {
        id: "business-owner",
        label: "Biz Owners",
        count: getCredentialsByRole("business-owner").length,
      },
      {
        id: "user",
        label: "Users",
        count: getCredentialsByRole("user").length,
      },
    ],
    [],
  );

  // Server verification in progress, or auth still loading
  // The useEffect handles redirect for unauthenticated users
  if (vaultAuthorized === null) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-green-500" />
        </motion.div>
      </div>
    );
  }

  if (!isSuperuser) {
    return <AccessDenied />;
  }

  // Server already verified identity — no passphrase needed

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <MatrixRain />

      {/* Scan lines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.02) 2px, rgba(0,255,0,0.02) 4px)",
        }}
      />

      <div className="relative z-10">
        {/* ═══════════ HEADER ═══════════ */}
        <header className="border-b border-gray-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-[95vw] mx-auto px-6 py-4">
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 10px rgba(34,197,94,0.2)",
                      "0 0 25px rgba(34,197,94,0.4)",
                      "0 0 10px rgba(34,197,94,0.2)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
                >
                  <Terminal className="w-5 h-5 text-black" />
                </motion.div>
                <div>
                  <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                    <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      CREDENTIALS VAULT
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-green-800 text-green-500 font-mono"
                    >
                      v2.0
                    </Badge>
                  </h1>
                  <p className="text-gray-600 text-[11px] font-mono">
                    CLASSIFIED • SUPERUSER CLEARANCE • AES-256 ENCRYPTED
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <LiveClock />

                {/* Quick Nav — no re-auth needed since we're already in the vault */}
                <div className="flex items-center gap-1.5">
                  <a
                    href="/geo-admin/dashboard?from=sv"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-800/40 rounded-full hover:bg-blue-500/20 hover:border-blue-600/60 transition-all group"
                  >
                    <Globe className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />
                    <span className="text-blue-400 group-hover:text-blue-300 text-[10px] font-mono font-bold">
                      GEO-ADMIN
                    </span>
                  </a>
                  <a
                    href="/dashboard?from=sv"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-800/40 rounded-full hover:bg-purple-500/20 hover:border-purple-600/60 transition-all group"
                  >
                    <LayoutDashboard className="w-3 h-3 text-purple-400 group-hover:text-purple-300" />
                    <span className="text-purple-400 group-hover:text-purple-300 text-[10px] font-mono font-bold">
                      DASHBOARD
                    </span>
                  </a>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/5 border border-green-800/50 rounded-full">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-green-500 text-[10px] font-mono font-bold">
                    LIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <AnimatedCounter
                value={CREDENTIALS.length}
                label="Total Credentials"
                icon={<Key className="h-4 w-4" />}
              />
              <AnimatedCounter
                value={roleStats.reduce(
                  (a, r) =>
                    a +
                    (r.id === "superuser" || r.id === "admin" ? r.count : 0),
                  0,
                )}
                label="Privileged"
                icon={<Crown className="h-4 w-4" />}
              />
              <AnimatedCounter
                value={
                  roleStats.find((r) => r.id === "business-owner")?.count || 0
                }
                label="Business Accts"
                icon={<Globe className="h-4 w-4" />}
              />
              <AnimatedCounter
                value={
                  new Set(CREDENTIALS.map((c) => c.sector).filter(Boolean)).size
                }
                label="Sectors"
                icon={<Database className="h-4 w-4" />}
              />
            </div>

            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search credentials... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-gray-800 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-800 focus:ring-1 focus:ring-green-900 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter pills & actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedRole(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide transition-all ${
                    !selectedRole
                      ? "bg-green-500/20 text-green-400 border border-green-700/50"
                      : "bg-gray-900 text-gray-500 border border-gray-800 hover:border-gray-700"
                  }`}
                >
                  ALL ({CREDENTIALS.length})
                </motion.button>
                {roleStats.map((role) => {
                  const config = ROLE_CONFIG[role.id];
                  return (
                    <motion.button
                      key={role.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setSelectedRole(
                          selectedRole === role.id ? null : role.id,
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-1.5 ${
                        selectedRole === role.id
                          ? `bg-gradient-to-r ${config.gradient} bg-opacity-20 text-white border border-white/10`
                          : "bg-gray-900 text-gray-500 border border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      {config.icon}
                      {role.label} ({role.count})
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleAllPasswords}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700 text-xs font-mono transition-all"
                >
                  {showAllPasswords ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {showAllPasswords ? "HIDE ALL" : "REVEAL ALL"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700 text-xs font-mono transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  EXPORT
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <main className="max-w-[95vw] mx-auto px-6 py-8">
          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-xs font-mono">
              SHOWING{" "}
              <span className="text-green-400 font-bold">
                {displayedCredentials.length}
              </span>{" "}
              OF <span className="text-gray-400">{CREDENTIALS.length}</span>{" "}
              RECORDS
              {searchQuery && (
                <span className="text-gray-600"> • QUERY: "{searchQuery}"</span>
              )}
            </p>
          </div>

          {/* Credentials grid */}
          {displayedCredentials.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <Search className="w-12 h-12 text-gray-800 mx-auto mb-4" />
              <p className="text-gray-600 font-mono text-sm">
                NO MATCHING RECORDS
              </p>
              <p className="text-gray-700 font-mono text-xs mt-1">
                Try adjusting your search query
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {displayedCredentials.map((credential, index) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    index={index}
                    copiedId={copiedId}
                    showPasswords={showPasswords}
                    onCopy={copyToClipboard}
                    onTogglePassword={togglePassword}
                    onQuickLogin={handleQuickLogin}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* ═══════════ TAB NAVIGATION ═══════════ */}
        <CommandCenter />

        {/* ═══════════ SECURITY FOOTER ═══════════ */}
        <footer className="max-w-[95vw] mx-auto px-6 py-8 border-t border-gray-800/50">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-red-950/20 border border-red-900/30 rounded-xl p-6"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-bold text-sm mb-2 font-mono">
                  SECURITY CLASSIFICATION: RESTRICTED
                </h3>
                <ul className="text-red-400/60 text-xs space-y-1 font-mono">
                  <li>• Access restricted exclusively to superuser role</li>
                  <li>• No admin, moderator, or staff access permitted</li>
                  <li>
                    • All credentials must be rotated before production
                    deployment
                  </li>
                  <li>• Unauthorized access attempts are logged</li>
                  <li>• Session activity is logged and monitored</li>
                </ul>
              </div>
            </div>
          </motion.div>

          <div className="text-center mt-8 space-y-1">
            <p className="text-gray-700 text-[11px] font-mono">
              VERSO AIR™ BUSINESS INTELLIGENCE • CREDENTIALS VAULT v2.0
            </p>
            <p className="text-gray-800 text-[10px] font-mono">
              {new Date().toLocaleDateString()} • ENCRYPTED • SUPERUSER EYES
              ONLY
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

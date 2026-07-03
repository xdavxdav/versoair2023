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
  X,
  Shield,
  ShieldCheck,
  Fingerprint,
  Terminal,
  Lock,
  Unlock,
  Zap,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
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
  RefreshCw,
  ArrowUpRight,
  LayoutDashboard,
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
import CommandCenter from "./vault/CommandCenter";

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

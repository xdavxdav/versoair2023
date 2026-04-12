import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  Sparkles,
  Shield,
  ChevronDown,
  User,
  Mic2,
  Globe,
  Check,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  isValidEmail,
  checkPasswordLength,
  checkPasswordUpper,
  checkPasswordNumber,
  passwordStrengthLevel,
  validateRegistrationForm,
} from "@/lib/auth-validation";
import { useAuth } from "@/contexts/AuthContext";

// ─── Floating Background Particles (lighter version) ─
function LightParticles() {
  const symbols = ["♪", "♫", "✦", "◎", "♩"];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: 25 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-white/[0.06] select-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 16 + 8}px`,
          }}
          animate={{
            y: [0, -20, 10, 0],
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {symbols[Math.floor(Math.random() * symbols.length)]}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Tab types ──────────────────────────────────────
type AuthTab = "signin" | "apply";

export default function ArtistPortalSignIn() {
  const [, navigate] = useLocation();
  const { login: authLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [step, setStep] = useState(1); // For multi-step apply form

  // Display name onboarding state
  const [showNameOnboarding, setShowNameOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);

  // Sign in form state
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Apply form state
  const [applyForm, setApplyForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    stageName: "",
    legalName: "",
    genre: "",
    country: "",
    bio: "",
    spotifyUrl: "",
    instagramHandle: "",
    agreeTerms: false,
  });

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

  // Handle sign in — real JWT auth
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/auth/artist/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: signInForm.email,
          password: signInForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(
          data.message ||
            "Échec de connexion. Veuillez vérifier vos identifiants.",
        );
        setIsLoading(false);
        return;
      }
      // Store artist data for portal usage
      localStorage.setItem("artist_token", data.token);
      localStorage.setItem("artist_profile", JSON.stringify(data.user));

      // Sync with AuthContext so navbar/dashboard recognizes the user
      authLogin(data.token, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      });

      // If user hasn't set display name, show onboarding prompt
      if (data.needsDisplayName) {
        setPendingToken(data.token);
        setPendingUser(data.user);
        setShowNameOnboarding(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      navigate("/artist-portal/dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Erreur réseau. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  // Handle apply — real artist registration
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    // Validate passwords match
    if (applyForm.password !== applyForm.confirmPassword) {
      setAuthError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!applyForm.agreeTerms) {
      setAuthError("Vous devez accepter les conditions.");
      return;
    }
    // Full validation
    const validation = validateRegistrationForm({
      email: applyForm.email,
      password: applyForm.password,
      confirmPassword: applyForm.confirmPassword,
    });
    if (!validation.valid) {
      setAuthError(validation.error);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/auth/artist/register", {
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(
          data.message || "Échec de l'inscription. Veuillez réessayer.",
        );
        setIsLoading(false);
        return;
      }
      // Store artist data
      localStorage.setItem("artist_token", data.token);
      localStorage.setItem("artist_profile", JSON.stringify(data.user));

      // Sync with AuthContext
      authLogin(data.token, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || data.user.stageName,
        role: data.user.role,
      });

      // New artists always need display name
      if (data.needsDisplayName) {
        setPendingToken(data.token);
        setPendingUser(data.user);
        setOnboardingName(applyForm.stageName || ""); // Pre-fill with stage name
        setShowNameOnboarding(true);
        setIsLoading(false);
        return;
      }

      setAuthSuccess("Compte créé avec succès ! Redirection...");
      setIsLoading(false);
      setTimeout(() => navigate("/artist-portal/dashboard"), 1500);
    } catch (err: any) {
      setAuthError(err.message || "Erreur réseau. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  // ── Display Name Onboarding handler ──
  const handleSetDisplayName = async () => {
    const trimmed = onboardingName.trim();
    if (trimmed.length < 2) {
      setOnboardingError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    setOnboardingSaving(true);
    setOnboardingError("");
    try {
      const res = await fetch("/auth/account/set-display-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pendingToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ displayName: trimmed }),
      });
      const result = await res.json();
      if (result.success) {
        // Update AuthContext with the new name
        authLogin(pendingToken, {
          ...pendingUser,
          name: trimmed,
        });
        // Update stored artist profile
        const stored = JSON.parse(
          localStorage.getItem("artist_profile") || "{}",
        );
        stored.name = trimmed;
        localStorage.setItem("artist_profile", JSON.stringify(stored));
        navigate("/artist-portal/dashboard");
      } else {
        setOnboardingError(result.message || "Échec de la sauvegarde.");
      }
    } catch {
      setOnboardingError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setOnboardingSaving(false);
    }
  };

  // ── Name Onboarding Screen ──
  if (showNameOnboarding) {
    const nameValid = onboardingName.trim().length >= 2;
    return (
      <div className="relative min-h-screen bg-[#06020f] text-white flex flex-col overflow-hidden">
        <LightParticles />
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(168,85,247,0.15) 0%, transparent 50%)",
            }}
          />
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-8">
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
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
                Comment vous appeler ?
              </h1>
              <p className="text-white/40 text-sm mt-2">
                Ce nom apparaîtra sur votre profil artiste et dans le studio
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
              <div className="relative mb-4">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
                <input
                  type="text"
                  value={onboardingName}
                  onChange={(e) => {
                    setOnboardingName(e.target.value);
                    setOnboardingError("");
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && nameValid && handleSetDisplayName()
                  }
                  placeholder="Votre nom d'artiste ou vrai nom"
                  maxLength={50}
                  autoFocus
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all"
                />
                {onboardingName.trim().length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameValid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400/60" />
                    )}
                  </div>
                )}
              </div>

              {/* Live preview */}
              {nameValid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center"
                >
                  <p className="text-white/40 text-xs">Aperçu du studio</p>
                  <p className="text-purple-300 font-medium mt-1">
                    Bienvenue, {onboardingName.trim()} 🎵
                  </p>
                </motion.div>
              )}

              {onboardingError && (
                <p className="text-red-400 text-sm text-center mb-3">
                  {onboardingError}
                </p>
              )}

              <motion.button
                onClick={handleSetDisplayName}
                disabled={!nameValid || onboardingSaving}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  nameValid && !onboardingSaving
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 shadow-lg shadow-purple-500/25"
                    : "bg-white/[0.06] text-white/30 cursor-not-allowed"
                }`}
                whileHover={nameValid ? { scale: 1.02 } : {}}
                whileTap={nameValid ? { scale: 0.98 } : {}}
              >
                {onboardingSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Accéder au Studio
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#06020f] text-white flex flex-col overflow-hidden">
      <LightParticles />

      {/* Ambient gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(88,28,135,0.12) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* ─── Back navigation ─── */}
      <div className="relative z-10 p-4 md:p-6">
        <Link href="/artist-portal">
          <motion.button
            className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm"
            whileHover={{ x: -3 }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'Univers</span>
          </motion.button>
        </Link>
      </div>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent notranslate">
              Verso Artist Studio
            </h1>
            <p className="text-white/30 text-sm mt-1">
              {activeTab === "signin"
                ? "Bon retour, créateur"
                : "Rejoindre le studio"}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 mb-8">
            <button
              onClick={() => {
                setActiveTab("signin");
                setStep(1);
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
          </div>

          {/* ═══════════════════════════════
              AUTH MESSAGES
              ═══════════════════════════════ */}
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

          {/* ═══════════════════════════════
              SIGN IN FORM
              ═══════════════════════════════ */}
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
                        setSignInForm({ ...signInForm, email: e.target.value })
                      }
                      placeholder="you@email.com or VA-2026-XXXX"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                    Mot de passe
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
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm relative overflow-hidden disabled:opacity-50"
                  whileHover={{
                    scale: 1.01,
                    boxShadow: "0 0 30px rgba(168,85,247,0.3)",
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 notranslate">
                    {isLoading ? (
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
                        <Fingerprint className="w-4 h-4" />
                        Entrer dans l'Univers
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

                {/* OAuth buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      name: "Google",
                      icon: "G",
                      color: "hover:border-red-500/30",
                    },
                    { name: "Apple", icon: "", color: "hover:border-white/30" },
                    {
                      name: "Spotify",
                      icon: "♪",
                      color: "hover:border-green-500/30",
                    },
                  ].map((provider) => (
                    <motion.button
                      key={provider.name}
                      type="button"
                      className={`py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm font-medium ${provider.color} transition-all`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-lg">{provider.icon}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.form>
            )}

            {/* ═══════════════════════════════
                APPLY FORM (Multi-Step)
                ═══════════════════════════════ */}
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
                          s < step
                            ? "bg-purple-500 text-white"
                            : s === step
                              ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30"
                              : "bg-white/[0.06] text-white/20"
                        }`}
                      >
                        {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                      </div>
                      {s < 3 && (
                        <div
                          className={`flex-1 h-px ${s < step ? "bg-purple-500/50" : "bg-white/[0.06]"}`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {/* Step 1: Account */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-white/60 text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        Détails du compte
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
                            placeholder="Créez un mot de passe fort"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                      {/* Password strength feedback */}
                      {applyForm.password && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1">
                            {[1, 2, 3].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  passwordStrengthLevel(applyForm.password) >=
                                  level
                                    ? passwordStrengthLevel(
                                        applyForm.password,
                                      ) === 1
                                      ? "bg-red-400"
                                      : passwordStrengthLevel(
                                            applyForm.password,
                                          ) === 2
                                        ? "bg-amber-400"
                                        : "bg-green-400"
                                    : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-1 gap-0.5">
                            <p
                              className={`text-xs flex items-center gap-1 ${checkPasswordLength(applyForm.password) ? "text-green-400" : "text-white/30"}`}
                            >
                              {checkPasswordLength(applyForm.password) ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Au moins 8 caractères
                            </p>
                            <p
                              className={`text-xs flex items-center gap-1 ${checkPasswordUpper(applyForm.password) ? "text-green-400" : "text-white/30"}`}
                            >
                              {checkPasswordUpper(applyForm.password) ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Une lettre majuscule (A–Z)
                            </p>
                            <p
                              className={`text-xs flex items-center gap-1 ${checkPasswordNumber(applyForm.password) ? "text-green-400" : "text-white/30"}`}
                            >
                              {checkPasswordNumber(applyForm.password) ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Un chiffre (0–9)
                            </p>
                          </div>
                        </div>
                      )}
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
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-white/60 text-sm font-medium flex items-center gap-2">
                        <Mic2 className="w-4 h-4 text-fuchsia-400" />
                        Artist Identity
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
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <h3 className="text-white/60 text-sm font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        Profile & Links
                      </h3>

                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Bio
                        </label>
                        <textarea
                          value={applyForm.bio}
                          onChange={(e) =>
                            setApplyForm({ ...applyForm, bio: e.target.value })
                          }
                          placeholder="Parlez-nous de votre parcours musical..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm resize-none"
                        />
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
                          Pseudo Instagram{" "}
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

                      {/* Terms */}
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
                          </span>
                          . Je confirme que toutes les informations fournies
                          sont exactes.
                        </span>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-2">
                  {step > 1 && (
                    <motion.button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="px-5 py-3.5 rounded-xl border border-white/[0.08] text-white/50 text-sm hover:bg-white/[0.04] transition-all"
                      whileTap={{ scale: 0.98 }}
                    >
                      Retour
                    </motion.button>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm relative overflow-hidden disabled:opacity-50"
                    whileHover={{
                      scale: 1.01,
                      boxShadow: "0 0 30px rgba(168,85,247,0.3)",
                    }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      ) : step < 3 ? (
                        <>
                          Continuer
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Soumettre la candidature
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
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Bottom note */}
          <div className="mt-8 text-center">
            <p className="text-white/15 text-xs">
              {activeTab === "signin" ? (
                <>
                  Vous n'avez pas de compte artiste ?{" "}
                  <button
                    onClick={() => setActiveTab("apply")}
                    className="text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    Candidatez maintenant
                  </button>
                </>
              ) : (
                <>
                  Vous avez déjà un compte ?{" "}
                  <button
                    onClick={() => {
                      setActiveTab("signin");
                      setStep(1);
                    }}
                    className="text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Minimal footer */}
      <div className="relative z-10 py-6 text-center">
        <p className="text-white/10 text-xs">
          © 2026 Verso Artist Studio — Fait partie de l'écosystème Verso Air
        </p>
      </div>
    </div>
  );
}

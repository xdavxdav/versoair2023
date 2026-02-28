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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // For multi-step apply form

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

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulated auth — will connect to real backend
    setTimeout(() => {
      setIsLoading(false);
      navigate("/artist-portal/dashboard");
    }, 1500);
  };

  // Handle apply
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Show success or redirect
      navigate("/artist-portal/dashboard");
    }, 2000);
  };

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
            <span>Back to Universe</span>
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Verso Artist Universe
            </h1>
            <p className="text-white/30 text-sm mt-1">
              {activeTab === "signin"
                ? "Welcome back, creator"
                : "Join the universe"}
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
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("apply")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "apply"
                  ? "bg-gradient-to-r from-purple-600/80 to-fuchsia-600/80 text-white shadow-lg shadow-purple-500/20"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Apply
            </button>
          </div>

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
                    Email or Artist Code
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
                    Password
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
                      placeholder="Enter your password"
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
                    <span className="text-white/30 text-xs">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-purple-400/60 hover:text-purple-400 text-xs transition-colors"
                  >
                    Forgot password?
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
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        Enter the Universe
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
                    or continue with
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
                        Account Details
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
                          Password
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
                            placeholder="Create a strong password"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Confirm Password
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
                            placeholder="Confirm your password"
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
                          Stage Name
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
                            placeholder="Your artist / stage name"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Legal Name
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
                            placeholder="Your legal full name"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Primary Genre
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
                              Select your genre
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
                          Country
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
                            placeholder="Where are you based?"
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
                          placeholder="Tell us about your music journey..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-white/40 text-xs tracking-wider uppercase mb-2">
                          Spotify Profile URL{" "}
                          <span className="text-white/15">(optional)</span>
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
                          Instagram Handle{" "}
                          <span className="text-white/15">(optional)</span>
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
                          I agree to the Verso Artist Universe{" "}
                          <span className="text-purple-400/60 hover:text-purple-400 cursor-pointer">
                            Terms of Service
                          </span>{" "}
                          and{" "}
                          <span className="text-purple-400/60 hover:text-purple-400 cursor-pointer">
                            Artist Agreement
                          </span>
                          . I confirm all information provided is accurate.
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
                      Back
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
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Submit Application
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
                  Don't have an artist account?{" "}
                  <button
                    onClick={() => setActiveTab("apply")}
                    className="text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    Apply now
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setActiveTab("signin");
                      setStep(1);
                    }}
                    className="text-purple-400/50 hover:text-purple-400 transition-colors"
                  >
                    Sign in
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
          © 2026 Verso Artist Universe — Part of the Verso Air ecosystem
        </p>
      </div>
    </div>
  );
}

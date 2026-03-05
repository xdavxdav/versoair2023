import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (email: string, password: string, isSignUp: boolean) => void;
  isLoading?: boolean;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthenticate,
  isLoading = false,
}: AuthModalProps) {
  useScrollLock(isOpen);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (mode === "signup") {
      if (!fullName) {
        setError("Please enter your full name");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    onAuthenticate(email, password, mode === "signup");
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">
                  {mode === "login" ? "Welcome Back" : "Join Us"}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg">
                  {(["login", "signup"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab);
                        setError("");
                      }}
                      className={`flex-1 py-2 rounded font-medium transition-all ${
                        mode === tab
                          ? "bg-cyan-500 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab === "login" ? "Login" : "Sign Up"}
                    </button>
                  ))}
                </div>

                {/* Full Name (Sign Up Only) */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm text-slate-300 mb-2 font-handstyle">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors font-handstyle"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2 font-handstyle">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors font-handstyle"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2 font-handstyle">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors font-handstyle"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Sign Up Only) */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm text-slate-300 mb-2 font-handstyle">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors font-handstyle"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm font-handstyle"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-bold transition-all font-handstyle flex items-center justify-center gap-2 ${
                    isLoading
                      ? "bg-cyan-500/50 text-white"
                      : "bg-cyan-500 text-white hover:bg-cyan-600"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-slate-500 font-handstyle">
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Social Login — Professional Network SSO */}
                <div className="grid grid-cols-1 gap-2">
                  {/* LinkedIn */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      onAuthenticate("user@linkedin.com", "sso-token", false)
                    }
                    className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-[#0077b5] to-[#006097] hover:from-[#006097] hover:to-[#004d7a] border border-white/10 rounded-lg text-white transition-all text-sm font-handstyle font-medium shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    Continue with LinkedIn
                  </motion.button>

                  {/* Indeed */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      onAuthenticate("user@indeed.com", "sso-token", false)
                    }
                    className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-[#2164f3] to-[#1a4fc7] hover:from-[#1a4fc7] hover:to-[#153fa0] border border-white/10 rounded-lg text-white transition-all text-sm font-handstyle font-medium shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.566 21.552v-8.706c0-2.26.438-4.47 2.15-5.85 1.398-1.13 3.248-1.478 5.06-1.478.6 0 1.188.05 1.724.13v3.2a8.98 8.98 0 00-1.244-.08c-2.478 0-3.588 1.348-3.588 3.788v8.996h-4.102zM8.2 5.506a2.384 2.384 0 01-2.39 2.39A2.384 2.384 0 013.42 5.506a2.384 2.384 0 012.39-2.39 2.384 2.384 0 012.39 2.39zM3.756 21.552V9.524h4.102v12.028H3.756z" />
                    </svg>
                    Continue with Indeed
                  </motion.button>

                  {/* Glassdoor */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      onAuthenticate("user@glassdoor.com", "sso-token", false)
                    }
                    className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-[#0caa41] to-[#0a8f36] hover:from-[#0a8f36] hover:to-[#08752c] border border-white/10 rounded-lg text-white transition-all text-sm font-handstyle font-medium shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M16.09 3H7.91A1.91 1.91 0 006 4.91h10.18A1.91 1.91 0 0018 4.91 1.91 1.91 0 0016.09 3zM18 19.09A1.91 1.91 0 0016.09 21H7.91A1.91 1.91 0 006 19.09H18zM18 6.82H6v10.36h12V6.82z" />
                    </svg>
                    Continue with Glassdoor
                  </motion.button>
                </div>

                {/* Terms */}
                <p className="text-xs text-slate-500 text-center font-handstyle">
                  {mode === "signup" && (
                    <>
                      By signing up, you agree to our{" "}
                      <a href="#" className="text-cyan-400 hover:underline">
                        Terms & Conditions
                      </a>
                    </>
                  )}
                  {mode === "login" && (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="text-cyan-400 hover:underline"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Star, Users, Zap, Loader2 } from "lucide-react";

interface ViewOnlyGateProps {
  onSignIn: () => void;
  onSignUp: () => void;
  showProfessionalSSO?: boolean;
}

function SsoProviderButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSso = async (provider: string) => {
    setLoading(provider);
    setError("");
    try {
      const res = await fetch(`/auth/oauth/${provider}?redirect=/blog`, {
        redirect: "manual",
      });
      if (res.status === 501) {
        const data = await res.json();
        setError(data.message || `${provider} sign-in is not yet configured.`);
        setLoading(null);
        return;
      }
      window.location.href = `/auth/oauth/${provider}?redirect=/blog`;
    } catch {
      setError(`Failed to connect to ${provider}. Try again.`);
      setLoading(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {error && (
        <p className="text-red-400 text-xs text-center mb-3">{error}</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* LinkedIn */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSso("linkedin")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2.5 px-5 py-3 bg-gradient-to-r from-[#0077b5] to-[#006097] hover:from-[#006097] hover:to-[#004d7a] border border-white/10 rounded-xl text-white transition-all text-sm font-medium shadow-lg flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "linkedin" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          )}
          LinkedIn
        </motion.button>

        {/* Indeed */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSso("indeed")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2.5 px-5 py-3 bg-gradient-to-r from-[#2164f3] to-[#1a4fc7] hover:from-[#1a4fc7] hover:to-[#153fa0] border border-white/10 rounded-xl text-white transition-all text-sm font-medium shadow-lg flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "indeed" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.566 21.552v-8.706c0-2.26.438-4.47 2.15-5.85 1.398-1.13 3.248-1.478 5.06-1.478.6 0 1.188.05 1.724.13v3.2a8.98 8.98 0 00-1.244-.08c-2.478 0-3.588 1.348-3.588 3.788v8.996h-4.102zM8.2 5.506a2.384 2.384 0 01-2.39 2.39A2.384 2.384 0 013.42 5.506a2.384 2.384 0 012.39-2.39 2.384 2.384 0 012.39 2.39zM3.756 21.552V9.524h4.102v12.028H3.756z" />
            </svg>
          )}
          Indeed
        </motion.button>

        {/* Glassdoor */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSso("glassdoor")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2.5 px-5 py-3 bg-gradient-to-r from-[#0caa41] to-[#0a8f36] hover:from-[#0a8f36] hover:to-[#08752c] border border-white/10 rounded-xl text-white transition-all text-sm font-medium shadow-lg flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "glassdoor" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.09 3H7.91A1.91 1.91 0 006 4.91h10.18A1.91 1.91 0 0018 4.91 1.91 1.91 0 0016.09 3zM18 19.09A1.91 1.91 0 0016.09 21H7.91A1.91 1.91 0 006 19.09H18zM18 6.82H6v10.36h12V6.82z" />
            </svg>
          )}
          Glassdoor
        </motion.button>
      </div>
    </div>
  );
}

export default function ViewOnlyGate({
  onSignIn,
  onSignUp,
  showProfessionalSSO = true,
}: ViewOnlyGateProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-3 sm:px-4 py-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-handstyle">
      <div className="max-w-2xl w-full">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex p-3 sm:p-4 bg-cyan-500/20 rounded-full mb-4 sm:mb-6"
          >
            <Lock className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-400" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            Unlock the Full Experience
          </h1>

          <p className="text-sm sm:text-base md:text-xl text-slate-300 mb-6 sm:mb-8 leading-relaxed px-2">
            You're viewing our community in read-only mode. Sign in to unlock
            full features and connect with the community!
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
            {[
              {
                icon: Star,
                title: "Create Posts",
                description: "Share your expertise and stories",
              },
              {
                icon: Users,
                title: "Connect & Follow",
                description: "Build meaningful relationships",
              },
              {
                icon: Zap,
                title: "Full Marketplace",
                description: "Buy and sell with the community",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/50 transition-all"
              >
                <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 mx-auto mb-2 sm:mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignIn}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-cyan-500 text-white rounded-lg font-bold text-base sm:text-lg hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20"
            >
              Sign In
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignUp}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white/5 border-2 border-cyan-500/50 text-cyan-400 rounded-lg font-bold text-base sm:text-lg hover:bg-white/10 transition-all"
            >
              Create Account
            </motion.button>
          </div>

          {/* ─── SSO Divider + Professional Network SSO Buttons ─── */}
          {showProfessionalSSO && (
            <>
              <div className="flex items-center gap-3 mb-6 max-w-md mx-auto">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">or continue with</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <SsoProviderButtons />
            </>
          )}
        </motion.div>

        {/* Sample Feed Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 mt-8 sm:mt-12"
        >
          <p className="text-slate-400 text-center text-sm">
            Sign in to see posts from your network...
          </p>
        </motion.div>
      </div>
    </div>
  );
}

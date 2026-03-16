/**
 * ArtistPortalGate — Transition warning when leaving Verso Air
 * for the Artist Portal ecosystem.
 *
 * Shows a 13-second countdown with a warning to disconnect from
 * all Verso Air services. SuperAdmin users bypass this gate entirely.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { AlertTriangle, Music, ArrowRight, Shield, X } from "lucide-react";

const COUNTDOWN_SECONDS = 13;

interface ArtistPortalGateProps {
  children: React.ReactNode;
}

export default function ArtistPortalGate({ children }: ArtistPortalGateProps) {
  const { user } = useAuthContext();
  const { hasPortal } = useCapabilities();
  const [hasPassedGate, setHasPassedGate] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [cancelled, setCancelled] = useState(false);

  // SuperAdmin / superuser bypasses the gate
  const isSuperAdmin =
    user?.role === "superuser" ||
    user?.role === "SuperAdmin" ||
    user?.isAdmin === true;

  // Real auth check: user must have artist role or artist portal access
  const hasArtistAccess =
    isSuperAdmin ||
    user?.role === "artist" ||
    hasPortal("artist") ||
    user?.portals?.includes("artist");

  // Check sessionStorage so gate only shows once per browser session
  // Users who already have artist access bypass the gate entirely
  useEffect(() => {
    if (isSuperAdmin || hasArtistAccess) {
      setHasPassedGate(true);
      return;
    }
    const passed = sessionStorage.getItem("artist-portal-gate-passed");
    if (passed === "true") {
      setHasPassedGate(true);
    }
  }, [isSuperAdmin, hasArtistAccess]);

  // Countdown timer
  useEffect(() => {
    if (hasPassedGate || cancelled) return;

    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasPassedGate, cancelled, countdown]);

  const handleContinue = useCallback(() => {
    sessionStorage.setItem("artist-portal-gate-passed", "true");
    setHasPassedGate(true);
  }, []);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    window.history.back();
  }, []);

  // SuperAdmin or already passed → render children directly
  if (hasPassedGate) {
    return <>{children}</>;
  }

  // 🔒 Not authorized for artist portal → show upgrade prompt
  if (!hasArtistAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06020f] p-4">
        <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Artist Portal Access Required
          </h2>
          <p className="text-white/50 text-sm mb-6">
            You need an artist profile to access this portal. Create one from
            your profile page or register as an artist.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm font-medium"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                window.location.href = "/apply";
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              Become an Artist
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate screen
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#06020f] overflow-hidden"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-purple-500/10 select-none"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: `${Math.random() * 20 + 10}px`,
              }}
              animate={{
                y: [0, -30, 15, 0],
                opacity: [0.05, 0.15, 0.05],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: Math.random() * 12 + 8,
                delay: Math.random() * 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {["♪", "♫", "✦", "◎", "♩", "⚡"][i % 6]}
            </motion.div>
          ))}
        </div>

        {/* Ambient gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.08) 0%, transparent 50%), " +
                "radial-gradient(ellipse at 70% 80%, rgba(236,72,153,0.06) 0%, transparent 50%)",
            }}
          />
        </div>

        {/* Main card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 max-w-lg w-full mx-4"
        >
          <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-purple-900/20">
            {/* Header band */}
            <div className="bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-red-600/90 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg tracking-wide">
                  ⚠️ TRANSITION ZONE
                </h2>
                <p className="text-white/70 text-xs">
                  Service boundary detected
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Main message */}
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30"
                >
                  <Music className="w-8 h-8 text-white" />
                </motion.div>

                <h1 className="text-white text-xl font-bold tracking-wide leading-relaxed">
                  LEAVING <span className="text-amber-400">VERSO AIR</span>
                  <br />
                  FOR THE ARTIST PORTAL:
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    VERSO AIR ™️
                  </span>
                </h1>
              </div>

              {/* Warning box */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-red-300 font-semibold text-sm">
                      Security Warning
                    </p>
                    <p className="text-red-200/70 text-xs leading-relaxed">
                      You are about to leave the Verso Air main platform and
                      enter the Artist Portal environment. Please ensure you
                      disconnect from all Verso Air business services before
                      proceeding. Artist Portal sessions operate independently.
                    </p>
                  </div>
                </div>
              </div>

              {/* Countdown ring */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24">
                  {/* Background ring */}
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="6"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#countdownGrad)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={
                        2 * Math.PI * 42 * (1 - countdown / COUNTDOWN_SECONDS)
                      }
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                    <defs>
                      <linearGradient
                        id="countdownGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-3xl font-mono font-bold ${
                        countdown <= 3
                          ? "text-red-400"
                          : countdown <= 6
                            ? "text-amber-400"
                            : "text-white"
                      }`}
                    >
                      {countdown}
                    </span>
                  </div>
                </div>
                <p className="text-white/40 text-xs">
                  {countdown > 0
                    ? "Continue will be available shortly..."
                    : "You may now proceed"}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.03] transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  disabled={countdown > 0}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    countdown > 0
                      ? "bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/5"
                      : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-600/20 cursor-pointer"
                  }`}
                >
                  CONTINUE
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-6 py-3 bg-white/[0.02]">
              <p className="text-white/20 text-[10px] text-center">
                Verso Air ™️ • Artist Portal Transition Gate • Session boundary
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

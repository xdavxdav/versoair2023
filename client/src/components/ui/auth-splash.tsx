/**
 * AuthSplash — Verso-branded fast transition overlay for sign-in/sign-out
 * Shows for ~400ms then auto-dismisses via onDone callback.
 */
import { useEffect } from "react";
import { motion } from "framer-motion";

interface AuthSplashProps {
  action: "signing-in" | "signing-out";
  userName?: string;
  onDone: () => void;
  duration?: number;
}

const MESSAGES = {
  "signing-in": { title: "Welcome back", sub: "Signing you in…" },
  "signing-out": { title: "See you soon", sub: "Signing out…" },
};

export function AuthSplash({
  action,
  userName,
  onDone,
  duration = 400,
}: AuthSplashProps) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  const msg = MESSAGES[action];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0a0512]"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-fuchsia-500/8 blur-[80px]" />
      </div>

      <div className="relative flex flex-col items-center gap-4">
        {/* Logo */}
        <motion.img
          src="https://i.ibb.co/8DL5vH7M/v-logo-extracted.png"
          alt="VersoAir"
          className="w-16 h-16 object-contain"
          style={{
            filter:
              "brightness(1.3) saturate(1.2) drop-shadow(0 0 20px rgba(168,85,247,0.8))",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
        />

        {/* Spinner ring */}
        <motion.div
          className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />

        {/* Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          <p className="text-white text-lg font-semibold">
            {msg.title}
            {userName ? `, ${userName}` : ""}
          </p>
          <p className="text-white/40 text-sm mt-1">{msg.sub}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

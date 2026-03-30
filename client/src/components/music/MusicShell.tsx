/**
 * MusicShell — Dark cinematic container for Musical Universe
 * Wraps all music pages with consistent visual identity
 */
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface MusicShellProps {
  children: ReactNode;
  className?: string;
  hideAmbient?: boolean;
}

export function MusicShell({
  children,
  className = "",
  hideAmbient = false,
}: MusicShellProps) {
  return (
    <div
      className={`min-h-screen bg-[#06020f] text-white relative overflow-x-hidden ${className}`}
    >
      {/* Ambient gradient blobs */}
      {!hideAmbient && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Top spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />

          {/* Purple accent - left */}
          <motion.div
            className="absolute -left-40 top-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px]"
            animate={{
              y: [0, 30, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Magenta accent - right */}
          <motion.div
            className="absolute -right-40 top-2/3 w-80 h-80 rounded-full bg-fuchsia-600/10 blur-[100px]"
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          {/* Pink accent - bottom */}
          <motion.div
            className="absolute left-1/3 -bottom-20 w-72 h-72 rounded-full bg-pink-600/8 blur-[80px]"
            animate={{
              x: [0, 20, 0],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
          />

          {/* Subtle noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default MusicShell;

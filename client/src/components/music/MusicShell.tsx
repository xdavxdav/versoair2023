/**
 * MusicShell — Dark cinematic container for Musical Universe
 * Wraps all music pages with consistent visual identity
 * Uses pure CSS animations instead of Framer Motion for ambient blobs (GPU-friendly)
 */
import { ReactNode } from "react";

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
      {/* Ambient gradient blobs — pure CSS keyframes, no JS runtime cost */}
      {!hideAmbient && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Top spotlight — static, no animation needed */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />

          {/* Purple accent - left */}
          <div
            className="absolute -left-40 top-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px]"
            style={{
              willChange: "transform, opacity",
              animation: "ambientFloat1 8s ease-in-out infinite",
            }}
          />

          {/* Magenta accent - right */}
          <div
            className="absolute -right-40 top-2/3 w-80 h-80 rounded-full bg-fuchsia-600/10 blur-[100px]"
            style={{
              willChange: "transform, opacity",
              animation: "ambientFloat2 10s ease-in-out 2s infinite",
            }}
          />

          {/* Pink accent - bottom */}
          <div
            className="absolute left-1/3 -bottom-20 w-72 h-72 rounded-full bg-pink-600/[0.08] blur-[80px]"
            style={{
              willChange: "transform, opacity",
              animation: "ambientFloat3 12s ease-in-out 4s infinite",
            }}
          />
        </div>
      )}

      {/* CSS keyframes for ambient blobs */}
      <style>{`
        @keyframes ambientFloat1 {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(30px); opacity: 0.5; }
        }
        @keyframes ambientFloat2 {
          0%, 100% { transform: translateY(0); opacity: 0.2; }
          50% { transform: translateY(-20px); opacity: 0.4; }
        }
        @keyframes ambientFloat3 {
          0%, 100% { transform: translateX(0); opacity: 0.15; }
          50% { transform: translateX(20px); opacity: 0.25; }
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default MusicShell;

import { useEffect, useState } from "react";

interface LoadingEagleProps {
  className?: string;
  /** Force static (no animation) regardless of device capability */
  static?: boolean;
}

/** Returns true when the device is likely low-end or prefers reduced motion */
function isLowEndDevice(): boolean {
  // Respect the OS-level accessibility setting first
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return true;
  // Low CPU core count is a reliable proxy for cheap/old hardware
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores <= 2) return true;
  // Slow network connection
  const conn = (navigator as any).connection;
  if (conn) {
    if (conn.saveData) return true;
    if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")
      return true;
  }
  return false;
}

export default function LoadingEagle({
  className = "w-24 h-24",
  static: forceStatic = false,
}: LoadingEagleProps) {
  const [animKey, setAnimKey] = useState(0);
  const [lowEnd, setLowEnd] = useState(true); // start static, upgrade after mount

  useEffect(() => {
    const detected = isLowEndDevice();
    setLowEnd(detected);
    if (!detected) setAnimKey((k) => k + 1);
  }, []);

  const isStatic = forceStatic || lowEnd;

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={isStatic ? undefined : { perspective: "600px" }}
    >
      {isStatic ? (
        /* ── Static logo — instant, zero animation cost ── */
        <img
          src="/33826.svg"
          alt="Verso Air"
          className="w-full h-full object-contain"
          style={{ filter: "drop-shadow(0 0 12px rgba(191,131,28,0.5))" }}
          draggable={false}
        />
      ) : (
        /* ── Animated eagle — only on capable devices ── */
        <div className="eagle-pierce" key={animKey}>
          <div className="eagle-glow-ring" />
          <img
            src="/33826.svg"
            alt="Verso Air"
            className="w-full h-full object-contain drop-shadow-2xl relative z-10"
            style={{ filter: "drop-shadow(0 0 16px rgba(191,131,28,0.6))" }}
            draggable={false}
          />
        </div>
      )}
      <div
        className={`loading-dots mt-4 ${isStatic ? "loading-dots--static" : ""}`}
      >
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

/**
 * NavigationProgress.tsx
 * ──────────────────────
 * Thin fluorescent gold progress bar at the very top of the viewport.
 * Shows during page navigation with an animated shimmer effect.
 */

import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";

export default function NavigationProgress() {
  const [location] = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const previousLocation = useRef(location);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip if same location
    if (location === previousLocation.current) return;
    previousLocation.current = location;

    // Start progress animation
    setVisible(true);
    setProgress(0);

    // Animate progress from 0 → 30 → 70 → 90 quickly, then 90 → 100 slowly
    const startTime = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < 100) {
        // Fast ramp to 30%
        setProgress(Math.min(30, (elapsed / 100) * 30));
      } else if (elapsed < 200) {
        // Continue to 70%
        setProgress(30 + ((elapsed - 100) / 100) * 40);
      } else if (elapsed < 350) {
        // Slow down to 90%
        setProgress(70 + ((elapsed - 200) / 150) * 20);
      } else {
        // Complete
        setProgress(100);

        // Hide after completion
        timeoutRef.current = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 200);
        return;
      }

      rafRef.current = requestAnimationFrame(animateProgress);
    };

    rafRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [location]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] h-[2px] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease-out",
      }}
    >
      {/* Progress bar fill */}
      <div
        className="h-full transition-[width] duration-100 ease-out"
        style={{
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, #d4af37 0%, #ffd700 50%, #f0e68c 100%)",
          boxShadow: "0 0 8px #ffd700, 0 0 16px rgba(255, 215, 0, 0.5)",
        }}
      />

      {/* Shimmer overlay */}
      <div
        className="absolute top-0 left-0 h-full overflow-hidden"
        style={{ width: `${progress}%` }}
      >
        <div
          className="h-full w-[60%] absolute"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
            animation:
              progress < 100 ? "nav-shimmer 0.8s ease-in-out infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";
import { useLoading } from "@/hooks/use-loading";

/**
 * Pull-to-refresh for tablets & smartphones only.
 * Pulls down at top of page → shows the main eagle loading overlay → reloads.
 * Desktop is completely unaffected.
 */
export default function PullToRefresh() {
  const { showEagleLoader } = useLoading();
  const [pullDistance, setPullDistance] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 100; // px pull to trigger
  const MAX_PULL = 150;

  const isTouchDevice = useCallback(
    () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    [],
  );

  useEffect(() => {
    if (!isTouchDevice()) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !triggered) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || triggered) return;

      const diff = e.touches[0].clientY - touchStartY.current;

      if (diff > 0 && window.scrollY <= 0) {
        const distance = Math.min(diff * 0.4, MAX_PULL);
        setPullDistance(distance);
        if (distance > 10) e.preventDefault();
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= THRESHOLD) {
        // Threshold reached — trigger the full eagle loading overlay then reload
        setTriggered(true);
        setPullDistance(0);
        showEagleLoader(300);
        setTimeout(() => window.location.reload(), 250);
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isTouchDevice, pullDistance, triggered, showEagleLoader]);

  // Nothing to render on desktop or when not actively pulling
  if (pullDistance === 0) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center pointer-events-none"
      style={{
        height: `${pullDistance}px`,
        transition: isPulling.current ? "none" : "height 0.25s ease-out",
      }}
    >
      {/* Small spinner hint while pulling — the full eagle overlay takes over on release */}
      <div
        className="w-8 h-8 rounded-full border-2 border-white/60 border-t-transparent animate-spin"
        style={{
          opacity: progress,
          transform: `scale(${0.6 + progress * 0.4})`,
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-transparent -z-10"
        style={{ opacity: progress * 0.6 }}
      />
    </div>
  );
}

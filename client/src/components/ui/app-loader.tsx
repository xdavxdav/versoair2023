/**
 * app-loader.tsx
 * ──────────────
 * Single source of truth for all full-screen loading UI.
 *
 * Exports:
 *   PageLoader    – Suspense fallback (no hook dependency, safe outside LoadingProvider)
 *   LoadingOverlay – hook-driven overlay with fade-out, used inside AppContent
 */

import LoadingEagle from "@/components/ui/loading-eagle";
import { useLoading } from "@/hooks/use-loading";

// ─── Shared inner content ────────────────────────────────────────────────────

function EagleContent() {
  return (
    <div className="text-center">
      <LoadingEagle className="w-44 h-44 mb-2 mx-auto" />
      <p className="text-white/90 text-sm font-medium tracking-wide mt-3 animate-pulse">
        Verso Air
      </p>
    </div>
  );
}

// ─── PageLoader ──────────────────────────────────────────────────────────────
// Used as <Suspense fallback={<PageLoader />}>.
// Intentionally LIGHTWEIGHT — no eagle SVG, no heavy gradient — so slow-network
// mobile users see a near-instant skeleton bar rather than a frozen black screen.

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-[#0e0c08]">
      {/* Slim shimmer bar at top */}
      <div className="loading-shimmer-bar" />
      {/* Minimal brand mark */}
      <div className="flex flex-col items-center gap-3 mt-6">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin" />
        <p className="text-amber-400/70 text-xs tracking-[0.3em] uppercase font-light">
          Verso Air
        </p>
      </div>
    </div>
  );
}

// ─── LoadingOverlay ──────────────────────────────────────────────────────────
// Hook-driven overlay — reads isLoading / isFadingOut from LoadingProvider.
// Renders nothing when not loading (zero cost at idle).

export function LoadingOverlay() {
  const { isLoading, isFadingOut } = useLoading();
  if (!isLoading) return null;

  return (
    <div className={`page-loading-overlay ${isFadingOut ? "fade-out" : ""}`}>
      <div className="loading-shimmer-bar" />
      <EagleContent />
    </div>
  );
}

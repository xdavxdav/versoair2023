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
// Does NOT depend on useLoading, so it's safe anywhere in the tree.

export function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(191,131,28,0.95) 0%, rgba(120,70,10,0.97) 60%, rgba(30,20,5,0.98) 100%)",
      }}
    >
      <div className="loading-shimmer-bar" />
      <EagleContent />
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

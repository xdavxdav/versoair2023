/**
 * MusicProtectedRoute — Purple-themed auth gate for Musical Universe pages
 * Shows a cinematic card instead of redirecting to /auth/signin
 */
import { useAuthContext } from "@/contexts/AuthContext";
import { MusicShell } from "@/components/music/MusicShell";
import { Link } from "wouter";
import { Music2, Lock, LogIn, UserPlus, ArrowRight } from "lucide-react";

interface MusicProtectedRouteProps {
  component: React.ComponentType;
}

export default function MusicProtectedRoute({
  component: Component,
}: MusicProtectedRouteProps) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <MusicShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-white/40 text-sm tracking-wide">Loading Musical Universe…</p>
          </div>
        </div>
      </MusicShell>
    );
  }

  if (!user) {
    return (
      <MusicShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="relative w-full max-w-md">
            {/* Glow behind card */}
            <div className="absolute -inset-4 bg-gradient-to-br from-purple-600/20 via-fuchsia-600/10 to-pink-600/20 rounded-3xl blur-2xl" />

            {/* Card */}
            <div className="relative bg-[#0e0820]/90 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-2xl shadow-purple-900/30">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-700 flex items-center justify-center ring-2 ring-purple-400/30">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-center text-xl font-bold bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-2">
                Musical Universe
              </h2>
              <p className="text-center text-white/40 text-sm mb-8">
                Sign in to access your studio, library, and creative tools
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <Link href={`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`}>
                  <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-purple-600/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                </Link>

                <Link href="/apply">
                  <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-purple-500/30 text-white/70 hover:text-white font-medium text-sm transition-all duration-200">
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </button>
                </Link>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-white/20 text-xs">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Browse as guest */}
              <Link href="/stream">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 text-purple-400/70 hover:text-purple-300 text-xs font-medium transition-colors">
                  <Music2 className="w-3.5 h-3.5" />
                  Browse music as guest
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </MusicShell>
    );
  }

  return <Component />;
}

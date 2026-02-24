import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import GeoAdmin from "@/components/geo-admin";
import GeoAdminAuthGate from "@/components/GeoAdminAuthGate";
import { useSubscription } from "@/hooks/use-subscription";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { SessionTimerBar } from "@/components/ui/session-timer-bar";
import { initializeCsrfToken } from "@/lib/auth";
import { Loader2, TrendingUp, Lock, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GeoAdminPage() {
  const { isAuthenticated, loading, tier, tierName, user, refetch } =
    useSubscription();
  const [, setLocation] = useLocation();

  // Initialize CSRF token on component mount
  useEffect(() => {
    initializeCsrfToken().catch((error) => {
      console.warn("Failed to initialize CSRF token:", error);
    });
  }, []);

  // Session timer - use gateBypass as indicator of authentication
  const [gateBypass, setGateBypass] = useState(() => {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("authToken");
    return !!token;
  });

  const {
    sessionTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    handleExtendSession,
    formatTimeLeft,
  } = useSessionTimer(gateBypass, true); // enableTimeout=true for geo-admin
  const [isStillConnected, setIsStillConnected] = useState(() => {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("authToken");
    return !!token;
  });
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem("geoadmin_username") || null;
  });

  // Maintain session across route changes - don't show gate if token exists
  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("authToken");
    if (token && !gateBypass) {
      setGateBypass(true);
      setIsStillConnected(true);
    }
  }, [gateBypass]);

  // Monitor token changes across tabs and routes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token" || e.key === "authToken") {
        if (e.newValue) {
          setIsStillConnected(true);
          setGateBypass(true);
        } else {
          setIsStillConnected(false);
          setGateBypass(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Deep linking: store that user tried to access /geo-admin
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      localStorage.setItem("geo_admin_redirect_intended", "true");
    }
  }, [isAuthenticated, loading]);

  const handleSignInSuccess = async (signinUsername?: string) => {
    if (signinUsername) {
      setUsername(signinUsername);
      localStorage.setItem("geoadmin_username", signinUsername);
    }
    setGateBypass(true);

    // Refetch to get updated tier info
    await new Promise((resolve) => setTimeout(resolve, 500));
    refetch();

    // Clear the redirect flag
    localStorage.removeItem("geo_admin_redirect_intended");
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Verifying your access…</p>
        </div>
      </div>
    );
  }

  // Not signed in → show the auth gate
  if (!isAuthenticated && !gateBypass) {
    return <GeoAdminAuthGate onSignInSuccess={handleSignInSuccess} />;
  }

  // Signed in as Free tier → show upgrade banner + limited dashboard
  if (tier === "free" && isAuthenticated && gateBypass) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pb-20">
        {/* Connection status dot */}
        {isStillConnected && (
          <div className="fixed top-4 right-4 z-50 h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
        )}

        {/* Session Timer Bar */}
        {gateBypass && (
          <div className="px-4 py-2 sm:px-6 sm:py-3">
            <SessionTimerBar
              sessionTimeLeft={sessionTimeLeft}
              sessionProgress={sessionProgress}
              isSessionCritical={isSessionCritical}
              isSessionLow={isSessionLow}
              onExtendSession={handleExtendSession}
              formatTimeLeft={formatTimeLeft}
            />
          </div>
        )}

        {/* Upgrade banner for free users */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  <Lock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm sm:text-base">
                    Upgrade your plan to unlock full analytics
                  </h3>
                  <p className="text-amber-200/80 text-xs sm:text-sm mt-1">
                    Essential plan gives you detailed performance metrics,
                    search insights, and data exports.
                  </p>
                </div>
              </div>
              <Button
                onClick={() =>
                  setLocation("/pricing?tier=essential&source=geo-admin")
                }
                className="whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 text-sm"
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>

        {/* Limited Geo Admin view */}
        <GeoAdmin username={username} />
      </div>
    );
  }

  // Signed in with paid tier → full dashboard
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Connection status dot */}
      {isStillConnected && (
        <div className="fixed top-4 right-4 z-50 h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
      )}

      {/* Session Timer Bar */}
      {gateBypass && (
        <div className="px-4 py-2 sm:px-6 sm:py-3">
          <SessionTimerBar
            sessionTimeLeft={sessionTimeLeft}
            sessionProgress={sessionProgress}
            isSessionCritical={isSessionCritical}
            isSessionLow={isSessionLow}
            onExtendSession={handleExtendSession}
            formatTimeLeft={formatTimeLeft}
          />
        </div>
      )}

      {/* Optional: Show tier indicator */}
      {tier && tier !== "free" && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <p className="text-emerald-300 text-xs sm:text-sm">
              <TrendingUp className="inline-block h-4 w-4 mr-1.5" />
              You're viewing Geo Admin as a{" "}
              <span className="font-semibold">{tierName}</span> subscriber.
            </p>
          </div>
        </div>
      )}
      <GeoAdmin username={username} />
    </div>
  );
}

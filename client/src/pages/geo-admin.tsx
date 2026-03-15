import { useState, useEffect, useCallback } from "react";
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
import { toast } from "@/hooks/use-toast";

export default function GeoAdminPage() {
  const { isAuthenticated, loading, tier, tierName, user, refetch } =
    useSubscription();
  const [, setLocation] = useLocation();
  const [startingTrial, setStartingTrial] = useState(false);

  // GeoAdmins are tech agents / moderators / IT staff — full access granted based on role
  // Superusers always bypass tier checks. Admins + moderators need max/enterprise tier.
  const isGeoAdmin =
    user?.isAdmin ||
    user?.role === "admin" ||
    user?.role === "superuser" ||
    user?.role === "moderator";

  // Superuser always has full access regardless of tier
  const isSuperuser = user?.role === "superuser";

  // Initialize CSRF token on component mount
  useEffect(() => {
    initializeCsrfToken().catch((error) => {
      console.warn("Failed to initialize CSRF token:", error);
    });
  }, []);

  // Session timer - use gateBypass as indicator of authentication
  // Also checks geoadmin_session which persists even after JWT expiry
  // (only cleared on explicit Sign Out in the auth gate)
  const [gateBypass, setGateBypass] = useState(() => {
    // Only bypass the auth gate if there's an active geoadmin session
    // (not just any auth token from elsewhere on the site)
    const geoSession = localStorage.getItem("geoadmin_session");
    return !!geoSession;
  });

  const handleGeoSessionExpired = useCallback(() => {
    setGateBypass(false);
    setIsStillConnected(false);
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("authToken");
  }, []);

  const {
    sessionTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    handleExtendSession,
    formatTimeLeft,
  } = useSessionTimer(gateBypass, true, handleGeoSessionExpired); // enableTimeout=true for geo-admin
  const [isStillConnected, setIsStillConnected] = useState(() => {
    const geoSession = localStorage.getItem("geoadmin_session");
    return !!geoSession;
  });
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem("geoadmin_username") || null;
  });

  // Best available display name: subscription user > localStorage username > fallback
  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    username ||
    null;

  // Maintain session across route changes - only restore if geoadmin_session is active
  useEffect(() => {
    const geoSession = localStorage.getItem("geoadmin_session");
    if (geoSession && !gateBypass) {
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

  // Start a free trial via API
  const handleStartTrial = async () => {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Session required",
        description: "Please sign in through the Geo Admin gate first.",
        variant: "destructive",
      });
      return;
    }

    setStartingTrial(true);
    try {
      const res = await fetch("/auth/start-trial", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier: "essential" }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "🎉 Trial activated!",
          description:
            "Your 7-day Essential trial is now active. Enjoy full analytics!",
        });
        // Refresh subscription state
        await refetch();
      } else {
        toast({
          title: "Trial unavailable",
          description:
            data.message || "Could not start trial. You may need to upgrade.",
          variant: "destructive",
        });
        if (res.status === 409) {
          // Already used trial → show pricing
          setLocation("/pricing?tier=essential&source=geo-admin");
        }
      }
    } catch {
      toast({
        title: "Connection error",
        description: "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartingTrial(false);
    }
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

  // Tier check for gate users: must be max or enterprise
  // Superusers bypass this check entirely — they own the whole platform
  const isMaxOrEnterprise = tier === "max" || tier === "enterprise";

  if (gateBypass && !isMaxOrEnterprise && !isSuperuser) {
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

        {/* Upgrade required banner — gate users must have max/enterprise */}
        <div className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border-b border-red-500/30">
          <div className="max-w-[95vw] mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  <Lock className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base sm:text-lg">
                    GeoAdmin access requires an Enterprise plan
                  </h3>
                  <p className="text-red-200/80 text-sm sm:text-base mt-2">
                    Your current tier{" "}
                    <span className="font-mono font-bold text-red-300">
                      {tier}
                    </span>{" "}
                    doesn't include GeoAdmin access. Only Pro Max and Enterprise
                    subscribers can use this portal. Please upgrade to continue.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setLocation("/pricing?plan=max")}
                className="whitespace-nowrap bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-6 py-2 text-sm font-semibold"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signed in as Free tier (non-admin subscribers only) → show upgrade banner
  // GeoAdmins (admins/managers) always get full access — no tier required
  if (tier === "free" && !isGeoAdmin && isAuthenticated && gateBypass) {
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
          <div className="max-w-[95vw] mx-auto px-4 py-4 sm:py-5">
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
                onClick={handleStartTrial}
                disabled={startingTrial}
                className="whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 text-sm"
              >
                {startingTrial ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating…
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Limited Geo Admin view */}
        <GeoAdmin username={displayName || username} tier={tier} />
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

      {/* Session status banner — context-aware messaging */}
      {gateBypass && !isAuthenticated && !loading && (
        <div
          className={`border-b ${sessionTimeLeft > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"}`}
        >
          <div className="max-w-[95vw] mx-auto px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p
              className={`text-xs sm:text-sm ${sessionTimeLeft > 0 ? "text-emerald-300" : "text-amber-300"}`}
            >
              {sessionTimeLeft > 0 ? (
                <>
                  <CheckCircle className="inline-block h-3.5 w-3.5 mr-1.5" />
                  Connected as Geo Admin{displayName ? ` (${displayName})` : ""}
                </>
              ) : (
                <>
                  <Lock className="inline-block h-3.5 w-3.5 mr-1.5" />
                  Session expired — sign in again for live data
                </>
              )}
            </p>
            {sessionTimeLeft <= 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs h-7 px-3"
                onClick={() => {
                  setGateBypass(false);
                }}
              >
                <Zap className="h-3 w-3 mr-1" />
                Re-authenticate
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Role / tier indicator */}
      {isGeoAdmin ? (
        <div className="bg-indigo-500/10 border-b border-indigo-500/20">
          <div className="max-w-[95vw] mx-auto px-4 py-2">
            <p className="text-indigo-300 text-xs sm:text-sm">
              <CheckCircle className="inline-block h-4 w-4 mr-1.5" />
              Geo Admin — full access granted
              {displayName ? ` (${displayName})` : ""}
            </p>
          </div>
        </div>
      ) : tier && tier !== "free" ? (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20">
          <div className="max-w-[95vw] mx-auto px-4 py-2">
            <p className="text-emerald-300 text-xs sm:text-sm">
              <TrendingUp className="inline-block h-4 w-4 mr-1.5" />
              You're viewing Geo Admin as a{" "}
              <span className="font-semibold">{tierName}</span> subscriber.
            </p>
          </div>
        </div>
      ) : null}
      <GeoAdmin username={displayName || username} tier={tier} />
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import GeoAdmin from "@/components/geo-admin";
import GeoAdminSubscriberView from "@/components/GeoAdminSubscriberView";
import GeoAdminAuthGate from "@/components/GeoAdminAuthGate";
import GeoAdminAccessManager from "@/components/GeoAdminAccessManager";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { SessionTimerBar } from "@/components/ui/session-timer-bar";
import { initializeCsrfToken } from "@/lib/auth";
import {
  hasGeoAdminFreeAccess,
  isReadOnlyGeoAdminSubscriber,
} from "@shared/geoadmin-access-policy";
import {
  Loader2,
  TrendingUp,
  Lock,
  Zap,
  CheckCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function GeoAdminPage() {
  const { isAuthenticated, loading, tier, tierName, user, refetch } =
    useSubscription();
  const [, setLocation] = useLocation();
  const { logout } = useAuthContext();

  // Admin access is determined by the authenticated server-issued user role.
  const isGeoAdmin =
    user?.isAdmin ||
    user?.role === "admin" ||
    user?.role === "superuser" ||
    user?.role === "moderator" ||
    user?.role === "tsr";

  // Superuser always has full access regardless of tier
  const isSuperuser = user?.role === "superuser";
  const isReadOnlySubscriber = isReadOnlyGeoAdminSubscriber({
    role: user?.role,
    isAdmin: user?.isAdmin,
    tier,
    subscriptionStatus: user?.subscriptionStatus,
    subscriptionExpiresAt:
      user?.trialTier === tier && user.trialExpiresAt
        ? user.trialExpiresAt
        : user?.subscriptionExpiresAt,
  });
  const hasFreeBasicAccess = hasGeoAdminFreeAccess({
    role: user?.role,
    isAdmin: user?.isAdmin,
    tier,
  });

  // Initialize CSRF token on component mount
  useEffect(() => {
    initializeCsrfToken().catch((error) => {
      console.warn("Failed to initialize CSRF token:", error);
    });
  }, []);

  // 🎉 Welcome toast for new subscribers (from /apply registration)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isNewSignup = urlParams.get("welcome") === "new";

    if (isNewSignup) {
      // Clear the URL param to prevent showing again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Show welcome toast
      setTimeout(() => {
        toast({
          title: "🎉 Bienvenue, membre Premium!",
          description:
            "Votre compte est activé. Explorez vos outils exclusifs.",
        });
      }, 500);
    }
  }, []);

  // This marker controls the timer only; access still requires server authentication.
  const [gateBypass, setGateBypass] = useState(() => {
    // Only bypass the auth gate if there's an active geoadmin session
    // (not just any auth token from elsewhere on the site)
    const geoSession = localStorage.getItem("geoadmin_session");
    return !!geoSession;
  });

  const handleGeoSessionExpired = useCallback(async () => {
    await logout();
    setGateBypass(false);
    setIsStillConnected(false);
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("geoadmin_session_start");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("authToken");
    toast({
      title: "Session disconnected",
      description: "Your GeoAdmin session has ended. Please sign in again.",
    });
    await refetch();
  }, [logout, refetch]);

  const handleGeoAdminLogout = useCallback(async () => {
    await logout();
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("geoadmin_login_time");
    localStorage.removeItem("geoadmin_session_start");
    setGateBypass(false);
    setIsStillConnected(false);
    setUsername(null);
    toast({
      title: "Session déconnectée",
      description: "Vous avez été déconnecté de GeoAdmin.",
    });
    setLocation("/");
  }, [logout, setLocation]);

  const {
    sessionTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    handleExtendSession,
    formatTimeLeft,
  } = useSessionTimer(
    gateBypass,
    true,
    handleGeoSessionExpired,
  );
  const [isStillConnected, setIsStillConnected] = useState(() => {
    const geoSession = localStorage.getItem("geoadmin_session");
    return !!geoSession;
  });
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem("geoadmin_username") || null;
  });

  // Best available display name: current authenticated user > stored gate username > fallback
  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    username ||
    null;

  // Role label for UI display
  const displayRole =
    user?.role === "superuser"
      ? "SuperAdmin"
      : user?.role === "admin"
        ? "Admin"
        : user?.role === "moderator"
          ? "Moderator"
          : null;

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
          setGateBypass(
            localStorage.getItem("geoadmin_session") === "true",
          );
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

    await refetch();

    // Clear the redirect flag
    localStorage.removeItem("geo_admin_redirect_intended");
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Verifying your access…</p>
        </div>
      </div>
    );
  }

  // Not signed in → show the auth gate
  if (!isAuthenticated) {
    return <GeoAdminAuthGate onSignInSuccess={handleSignInSuccess} />;
  }

  if (isGeoAdmin && !gateBypass) {
    return <GeoAdminAuthGate onSignInSuccess={handleSignInSuccess} />;
  }

  if (!isGeoAdmin && !isReadOnlySubscriber && !hasFreeBasicAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3efe9] px-4 py-12">
        <Card className="w-full max-w-xl p-7">
          <Lock className="h-8 w-8 text-amber-700" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            GeoAdmin access unavailable
          </h1>
          <p className="mt-2 leading-relaxed text-slate-600">
            Free accounts receive a limited view of their own business
            listings. Active Essential, Verified, Max, and Enterprise
            subscribers receive the fuller account-specific read-only view.
            Staff tools remain restricted to authorized GeoAdmin staff.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => setLocation("/pricing")}>
              View plans
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isGeoAdmin && (isReadOnlySubscriber || hasFreeBasicAccess)) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f3efe9] pb-20">
        <GeoAdminSubscriberView
          userId={user?.id ?? 0}
          username={displayName || "Subscriber"}
          tierName={tierName}
          isFree={hasFreeBasicAccess}
        />
      </div>
    );
  }

  // Signed in with paid tier → full dashboard
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50">
      {/* Connection status dot */}
      {isStillConnected && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleGeoAdminLogout()}
          >
            Déconnexion
          </Button>
        </div>
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
                  Connected as {isSuperuser ? "SuperAdmin" : "Geo Admin"}
                  {displayName ? ` — ${displayName}` : ""}
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
        <div
          className={`${isSuperuser ? "bg-amber-500/10 border-b border-amber-500/20" : "bg-indigo-500/10 border-b border-indigo-500/20"}`}
        >
          <div className="max-w-[95vw] mx-auto px-4 py-2">
            <p
              className={`${isSuperuser ? "text-amber-300" : "text-indigo-300"} text-xs sm:text-sm`}
            >
              {isSuperuser ? (
                <>
                  <Shield className="inline-block h-4 w-4 mr-1.5" />
                  SuperAdmin — unrestricted access
                  {displayName ? ` (${displayName})` : ""}
                </>
              ) : (
                <>
                  <CheckCircle className="inline-block h-4 w-4 mr-1.5" />
                  Geo Admin — full access granted
                  {displayName ? ` (${displayName})` : ""}
                </>
              )}
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
      {isSuperuser && <GeoAdminAccessManager />}
      <GeoAdmin
        username={username || displayName}
        tier={tier}
        role={displayRole}
      />
    </div>
  );
}

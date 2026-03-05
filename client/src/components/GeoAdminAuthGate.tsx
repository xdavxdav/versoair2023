/**
 * 🔐 GeoAdminAuthGate — Authentication wall for Geo Admin
 *
 * Shown when unauthenticated users try to access /geo-admin.
 * Displays tier benefits, sign-in form, and upgrade CTAs.
 * After successful sign-in, renders children (the actual Geo Admin).
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  Globe,
  Lock,
  Eye,
  BarChart3,
  TrendingUp,
  Shield,
  ArrowRight,
  User,
  Mail,
  KeyRound,
  EyeOff,
  Sparkles,
  Crown,
  Zap,
  CheckCircle,
  Database,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TierKey } from "@/lib/tiers";
import { TIERS, TIER_ORDER } from "@/lib/tiers";

interface GeoAdminAuthGateProps {
  onSignInSuccess: (username?: string) => void;
}

const GEO_ADMIN_USERNAME = "geoadmin";
const MIN_PASSWORD_LENGTH = 7;

export default function GeoAdminAuthGate({
  onSignInSuccess,
}: GeoAdminAuthGateProps) {
  const [mode, setMode] = useState<"gate" | "signin" | "geoadmin">("gate");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubscriberSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("authToken", data.token); // legacy compat
        setIsSuccess(true);
        onSignInSuccess(email);
      } else {
        setError(data.message || "Invalid credentials. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeoAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Geo Admin universal credentials
      // Username: "geoadmin" (case-insensitive)
      // Password: exactly 7 random characters
      if (username.toLowerCase() !== GEO_ADMIN_USERNAME) {
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }

      if (password.length !== MIN_PASSWORD_LENGTH) {
        setError(`Password must be exactly ${MIN_PASSWORD_LENGTH} characters.`);
        setLoading(false);
        return;
      }

      // Call the real geo-admin auth endpoint to receive a signed JWT
      const res = await fetch("/auth/geo-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.toLowerCase(), password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("geoadmin_session", "true");
        localStorage.setItem("geoadmin_username", GEO_ADMIN_USERNAME);
        localStorage.setItem("geoadmin_login_time", new Date().toISOString());
        setIsSuccess(true);
        onSignInSuccess(GEO_ADMIN_USERNAME);
      } else {
        setError(data.message || "Invalid credentials. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── TIER FEATURE HIGHLIGHTS (what you unlock) ────────────────────────────────

  const tierHighlights: {
    tier: TierKey;
    icon: React.ReactNode;
    features: string[];
  }[] = [
    {
      tier: "free",
      icon: <Database className="h-5 w-5" />,
      features: [
        "View your business listing",
        "Basic profile analytics",
        "Directory presence",
      ],
    },
    {
      tier: "essential",
      icon: <Eye className="h-5 w-5" />,
      features: [
        "Detailed performance metrics",
        "Search visibility insights",
        "Data export (CSV)",
      ],
    },
    {
      tier: "verified",
      icon: <BarChart3 className="h-5 w-5" />,
      features: [
        "Full analytics dashboard",
        "Competitor comparison",
        "Keyword tracking",
      ],
    },
    {
      tier: "max",
      icon: <TrendingUp className="h-5 w-5" />,
      features: ["Predictive analytics", "Promoted listing", "Video showcase"],
    },
    {
      tier: "enterprise",
      icon: <Crown className="h-5 w-5" />,
      features: [
        "Total market dominance",
        "Dedicated support team",
        "Full API access",
      ],
    },
  ];

  // Show logout screen after sign-in
  if (isSuccess) {
    const handleLogout = () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("geoadmin_session");
      localStorage.removeItem("geoadmin_username");
      localStorage.removeItem("geoadmin_login_time");
      setIsSuccess(false);
      setMode("gate");
      setUsername("");
      setPassword("");
      setEmail("");
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connected!
                </h2>
                <p className="text-slate-400 text-sm">
                  You're all set to access Geo Admin
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => onSignInSuccess(GEO_ADMIN_USERNAME)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 rounded-xl"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 py-5 rounded-xl"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // GATE VIEW (unauthenticated landing)

  if (mode === "gate") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />

        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        <div className="relative z-10 container mx-auto px-4 py-16 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
              <Lock className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-slate-300">
                Authentication Required
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <Globe className="inline-block h-10 w-10 mr-3 text-emerald-400" />
              Geo Admin
              <span className="text-emerald-400"> Observer</span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-2">
              Your personalized business intelligence dashboard. Sign in to
              access real-time analytics, performance metrics, and market
              insights.
            </p>
            <p className="text-sm text-slate-500">
              Every subscription tier unlocks your own Geo Admin view.
            </p>
          </div>

          {/* Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {tierHighlights.map(({ tier, icon, features }) => {
              const t = TIERS[tier];
              const isPopular = t.popular;
              return (
                <Card
                  key={tier}
                  className={`relative bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 ${
                    isPopular
                      ? "ring-2 ring-emerald-500/50 bg-emerald-500/5"
                      : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white text-xs">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{t.icon}</span>
                      <div>
                        <h3 className="text-white font-semibold text-sm">
                          {t.name}
                        </h3>
                        <p className="text-slate-500 text-xs">{t.tagline}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-xl font-bold text-white">
                        {t.monthlyPrice === 0 ? "Free" : `$${t.monthlyPrice}`}
                      </span>
                      {t.monthlyPrice > 0 && (
                        <span className="text-slate-500 text-xs">/mo</span>
                      )}
                    </div>

                    <ul className="space-y-1.5">
                      {features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-300"
                        >
                          <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <Button
              size="lg"
              onClick={() => setMode("signin")}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <KeyRound className="mr-2 h-5 w-5" />
              Sign In to Access Geo Admin
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              <span>Don't have an account?</span>
              <Link
                href="/auth/signin"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
              >
                Create one →
              </Link>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500/50" />
              <span>Secure authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500/50" />
              <span>7-day free trial on all paid plans</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500/50" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SIGN-IN FORM VIEW ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Sign In</h2>
              <p className="text-sm text-slate-400">
                Access your Geo Admin dashboard
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setEmail("");
                  setPassword("");
                  setUsername("");
                  setShowPassword(false);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === "signin"
                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                    : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                <User className="inline-block h-4 w-4 mr-1.5" />
                Subscriber
              </button>
              <button
                onClick={() => {
                  setMode("geoadmin");
                  setError("");
                  setEmail("");
                  setPassword("");
                  setUsername("");
                  setShowPassword(false);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === "geoadmin"
                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                    : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                <Lock className="inline-block h-4 w-4 mr-1.5" />
                Geo Admin
              </button>
            </div>

            {/* Error - inline per field instead */}

            {/* SUBSCRIBER SIGN-IN FORM */}
            {mode === "signin" && (
              <form onSubmit={handleSubscriberSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Sign In & Access Dashboard
                    </>
                  )}
                </Button>

                {/* ─── SSO Divider ─── */}
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-slate-500 font-medium">
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* ─── Subscriber SSO Providers ─── */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {/* Google */}
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-xs font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </button>
                  {/* Microsoft */}
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-xs font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                      <rect
                        x="13"
                        y="1"
                        width="10"
                        height="10"
                        fill="#7FBA00"
                      />
                      <rect
                        x="1"
                        y="13"
                        width="10"
                        height="10"
                        fill="#00A4EF"
                      />
                      <rect
                        x="13"
                        y="13"
                        width="10"
                        height="10"
                        fill="#FFB900"
                      />
                    </svg>
                    Microsoft
                  </button>
                  {/* Apple */}
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-xs font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    Apple
                  </button>
                </div>
              </form>
            )}

            {/* GEO ADMIN SIGN-IN FORM */}
            {mode === "geoadmin" && (
              <form onSubmit={handleGeoAdminSignIn} className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  <span className="font-medium">
                    Universal Geo Admin Access
                  </span>
                  <p className="text-emerald-300/80 mt-1">
                    Username:{" "}
                    <code className="bg-black/40 px-2 py-1 rounded">
                      geoadmin
                    </code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="geoadmin"
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Access Geo Admin
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Footer links */}
            <div className="mt-6 space-y-3 text-center">
              <button
                onClick={() => setMode("gate")}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Back to overview
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
                <Link
                  href="/auth/signin"
                  className="text-emerald-400/70 hover:text-emerald-400"
                >
                  Create account
                </Link>
                <span>·</span>
                <Link
                  href="/sav"
                  className="text-slate-500 hover:text-slate-300"
                >
                  Need help?
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

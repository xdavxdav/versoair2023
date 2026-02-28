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

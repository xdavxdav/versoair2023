/**
 * 🔐 GeoAdminAuthGate — Authentication wall for Geo Admin
 *
 * Shown when unauthenticated users try to access /geo-admin.
 * Displays tier benefits, sign-in form, and upgrade CTAs.
 * After successful sign-in, renders children (the actual Geo Admin).
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import {
  Globe,
  Lock,
  Eye,
  Shield,
  ArrowRight,
  User,
  Mail,
  KeyRound,
  EyeOff,
  Sparkles,
  Zap,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setAuthToken, initializeCsrfToken } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/components/LanguageSwitcher";
import { useLocalizedContent } from "@/hooks/use-localized-content";
import { fillTemplate } from "@shared/public-translations";

const GEOADMIN_STAFF_CODE_PATTERN = /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/i;

// Server messages that carry a count or a provider name; the fixed ones are catalogued as-is.
const LOCKOUT_MESSAGE =
  /^Account temporarily locked\. Try again in (\d+) minute\(s\)\.$/;
const PROVIDER_MESSAGE =
  /^This account uses (.+) sign-in\. Please sign in with \1 instead\.$/;

interface GeoAdminAuthGateProps {
  onSignInSuccess: (username?: string) => void;
}

export default function GeoAdminAuthGate({
  onSignInSuccess,
}: GeoAdminAuthGateProps) {
  const localize = useLocalizedContent();
  const { translateText } = useLanguage();
  const tr = (text: string, values?: Record<string, string | number>) =>
    values ? fillTemplate(translateText(text), values) : translateText(text);
  const localizeServerMessage = (message: string) => {
    const locked = LOCKOUT_MESSAGE.exec(message);
    if (locked) {
      return tr(
        "Account temporarily locked. Try again in {minutes} minute(s).",
        { minutes: locked[1] },
      );
    }
    const provider = PROVIDER_MESSAGE.exec(message);
    if (provider) {
      return tr(
        "This account uses {provider} sign-in. Please sign in with {provider} instead.",
        { provider: provider[1] },
      );
    }
    return translateText(message);
  };
  const { login: authContextLogin } = useAuthContext();
  const [, navigateTo] = useLocation();
  const [mode, setMode] = useState<
    "gate" | "signin" | "geoadmin" | "owner-totp"
  >("gate");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ownerOtpToken, setOwnerOtpToken] = useState("");
  const [ownerOtpCode, setOwnerOtpCode] = useState("");
  const [signedInUsername, setSignedInUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // NOTE: Self-service ".test" account creation was removed from this public,
  // unauthenticated gate — it allowed anyone to register a privileged admin
  // account. Creating .test accounts now requires an existing Admin/Superadmin
  // session (see the GeoAdmin dashboard's admin tools) and is enforced
  // server-side in POST /auth/register-geoadmin.

  const handleSubscriberSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.requiresOtp) {
        navigateTo("/auth/signin?redirect=%2Fgeo-admin");
        return;
      }

      if (data.success && data.token) {
        if (
          ["admin", "moderator", "superuser", "tsr"].includes(
            data.user?.role,
          ) ||
          data.user?.isAdmin
        ) {
          setError(
            "GeoAdmin staff must sign in with their personal access code.",
          );
          return;
        }
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("authToken", data.token); // legacy compat
        localStorage.setItem("geoadmin_session", "true");
        localStorage.setItem("geoadmin_username", email.split("@")[0]);
        localStorage.setItem("geoadmin_login_time", new Date().toISOString());
        setSignedInUsername(email.split("@")[0]);
        setAuthToken(data.token);
        if (data.user) {
          authContextLogin(data.token, data.user);
        }
        await initializeCsrfToken();
        setIsSuccess(true);
        onSignInSuccess(email.split("@")[0]);
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
      if (!GEOADMIN_STAFF_CODE_PATTERN.test(username.trim())) {
        setError("Enter your GeoAdmin access code in AAA-000-AAA format.");
        setLoading(false);
        return;
      }

      const res = await fetch("/auth/admin-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ staffCode: username.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (data.requiresOtp && data.otpMethod === "authenticator") {
        setOwnerOtpToken(data.otpToken);
        setOwnerOtpCode("");
        setMode("owner-totp");
        return;
      }

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("geoadmin_session", "true");
        const signedInAs = data.user?.username || "";
        localStorage.setItem("geoadmin_username", signedInAs);
        localStorage.setItem("geoadmin_login_time", new Date().toISOString());
        setSignedInUsername(signedInAs);
        setAuthToken(data.token);
        if (data.user) {
          authContextLogin(data.token, data.user);
        }
        await initializeCsrfToken();
        setIsSuccess(true);
        onSignInSuccess(signedInAs);
      } else {
        setError(data.message || "Invalid credentials.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerTotpSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/auth/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otpToken: ownerOtpToken, code: ownerOtpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        setError(data.message || "Incorrect or expired authenticator code.");
        return;
      }

      const signedInAs = data.user.username || data.user.email.split("@")[0];
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("geoadmin_session", "true");
      localStorage.setItem("geoadmin_username", signedInAs);
      localStorage.setItem("geoadmin_login_time", new Date().toISOString());
      setSignedInUsername(signedInAs);
      setAuthToken(data.token);
      authContextLogin(data.token, data.user);
      await initializeCsrfToken();
      setIsSuccess(true);
      onSignInSuccess(signedInAs);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show logout screen after sign-in
  if (isSuccess) {
    const handleLogout = () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("geoadmin_session");
      localStorage.removeItem("geoadmin_username");
      localStorage.removeItem("geoadmin_login_time");
      localStorage.removeItem("geoadmin_session_start");
      toast({
        title: translateText("Successfully logged out"),
        description: translateText("You've been disconnected from GeoAdmin."),
      });
      setIsSuccess(false);
      setMode("gate");
      setUsername("");
      setPassword("");
      setEmail("");
      setSignedInUsername("");
    };

    return localize(
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"
          style={{ animationDelay: "1s" }}
        />

        <div className="relative z-[9999] w-full max-w-md mx-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl relative z-[9999]">
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
                  onClick={() => onSignInSuccess(signedInUsername)}
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
    return localize(
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
              GeoAdmin plan access and current availability are confirmed with
              the team.
            </p>
          </div>

          <section className="mx-auto mb-8 max-w-5xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl sm:p-8">
            <h2 className="text-xl font-bold text-white">
              Explore GeoAdmin plans
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              View the current plans, market pricing, and availability on our
              dedicated pricing page.
            </p>
            <Button
              type="button"
              onClick={() => navigateTo("/pricing")}
              className="mt-5 bg-amber-400 text-slate-950 hover:bg-amber-300"
            >
              View plans and pricing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </section>

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
                href="/auth/signin?mode=register&redirect=%2Fgeo-admin"
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
              <span>Plan availability confirmed directly</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500/50" />
              <span>Terms provided before purchase</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SIGN-IN FORM VIEW ────────────────────────────────────────────────────────

  return localize(
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"
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

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {localizeServerMessage(error)}
              </div>
            )}

            {mode === "owner-totp" && (
              <form onSubmit={handleOwnerTotpSignIn} className="space-y-4">
                <p className="text-sm text-slate-300">
                  Staff code accepted. Enter the current six-digit code from
                  your authenticator app to finish signing in.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Authenticator code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={ownerOtpCode}
                    onChange={(event) =>
                      setOwnerOtpCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    required
                    className="bg-white/5 border-white/10 text-white text-center text-lg tracking-[0.4em] placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || ownerOtpCode.length !== 6}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 rounded-xl disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Verify and access GeoAdmin
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("geoadmin");
                    setOwnerOtpToken("");
                    setOwnerOtpCode("");
                    setError("");
                  }}
                  className="w-full text-sm text-slate-400 hover:text-slate-200"
                >
                  Back to staff code
                </button>
              </form>
            )}

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
                <div className="flex items-center gap-3 mt-5" hidden>
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-slate-500 font-medium">
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* ─── SSO Providers ─── */}
                <div className="grid grid-cols-3 gap-2 mt-4" hidden>
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
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    GeoAdmin Access Code
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const value = e.target.value;
                        setUsername(value);
                      }}
                      placeholder="AAA-000-AAA"
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                  GeoAdmin uses an individual passwordless access code.
                  Owner access also requires an authenticator code.
                </p>

                <Button
                  type="submit"
                  disabled={loading || !GEOADMIN_STAFF_CODE_PATTERN.test(username.trim())}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 rounded-xl disabled:opacity-50"
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

                <p className="text-[11px] text-slate-600 text-center">
                  Admin & CEO accounts only. Regular users sign in via the
                  Subscriber tab. Staff codes only work for configured GeoAdmin
                  staff accounts.
                </p>
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
                {mode !== "geoadmin" && (
                  <>
                    <Link
                      href="/auth/forgot-password"
                      className="text-emerald-400/70 hover:text-emerald-400"
                    >
                      Forgot password?
                    </Link>
                    <span>·</span>
                  </>
                )}
                <Link
                  href="/auth/signin?mode=register&redirect=%2Fgeo-admin"
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

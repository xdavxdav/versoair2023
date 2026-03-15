/**
 * 🔐 GeoAdminAuthGate — Single-field access gate for Geo Admin
 *
 * One combined password field: enter your code/username_000
 * Authenticates via /auth/admin-gate
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  Globe,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  KeyRound,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { setAuthToken, initializeCsrfToken } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";

interface GeoAdminAuthGateProps {
  onSignInSuccess: (username?: string) => void;
}

export default function GeoAdminAuthGate({
  onSignInSuccess,
}: GeoAdminAuthGateProps) {
  const { login: authContextLogin } = useAuthContext();
  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = accessCode.trim().toLowerCase();
    if (!code) {
      setError("Enter your access code");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/auth/admin-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: code }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("geoadmin_session", "true");
        localStorage.setItem("geoadmin_username", code);
        localStorage.setItem("geoadmin_login_time", new Date().toISOString());
        setAuthToken(data.token);
        if (data.user) {
          authContextLogin(data.token, data.user);
        }
        await initializeCsrfToken();
        setIsSuccess(true);
        onSignInSuccess(code);
      } else {
        setError(data.message || "Invalid access code.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (isSuccess) {
    const handleLogout = () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("geoadmin_session");
      localStorage.removeItem("geoadmin_username");
      localStorage.removeItem("geoadmin_login_time");
      setIsSuccess(false);
      setAccessCode("");
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden">
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
                  onClick={() =>
                    onSignInSuccess(accessCode.trim().toLowerCase())
                  }
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

  // ─── SINGLE-FIELD GATE ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Geo Admin</h2>
              <p className="text-sm text-slate-400">
                Enter your access code to continue
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Single combined field */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Access Code
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type={showCode ? "text" : "password"}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="code/username_000"
                    required
                    autoComplete="off"
                    autoFocus
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCode ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Format:{" "}
                  <span className="text-slate-400 font-mono">username_000</span>
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || accessCode.trim().length < 3}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Access Geo Admin
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                <Shield className="h-3.5 w-3.5 text-emerald-500/50" />
                <span>Secure authentication</span>
              </div>

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

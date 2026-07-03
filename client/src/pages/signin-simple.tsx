import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, Loader, Clock } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { setAuthToken, initializeCsrfToken } from "@/lib/auth";
import { AuthSplash } from "@/components/ui/auth-splash";
import { AnimatePresence } from "framer-motion";

const API_BASE_URL = "";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<string>("");
  const [, navigate] = useLocation();
  const { login: authLogin } = useAuthContext();

  // Countdown timer for account lockout
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, lockoutUntil - now);

      if (remaining === 0) {
        setLockoutUntil(null);
        setLockoutTimeLeft("");
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setLockoutTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 100); // Update 10x per second for smooth countdown

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        // Clear any lockout state
        setLockoutUntil(null);
        setLockoutTimeLeft("");
        // Store in AuthContext (persists across refreshes via localStorage)
        authLogin(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        });
        // Also store in-memory so authenticatedFetch sends Authorization header
        setAuthToken(data.token);
        // Bootstrap CSRF token now that we're authenticated
        await initializeCsrfToken();
        setSuccess(true);
        setShowSplash(true);
      } else if (response.status === 423) {
        // Account locked — extract unlock time from message
        const match = data.message?.match(/(\d+)\s+minute/);
        const mins = match ? parseInt(match[1]) : 15;
        const unlockTime = Date.now() + mins * 60 * 1000;
        setLockoutUntil(unlockTime);
        setError(data.message || "Account temporarily locked");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AnimatePresence>
        {showSplash && (
          <AuthSplash
            action="signing-in"
            onDone={() => navigate("/geo-admin/dashboard")}
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Verso Air</h1>
            <p className="text-gray-600">Admin Dashboard Login</p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="bg-white rounded-lg shadow-lg p-8 space-y-6"
          >
            {/* Account Locked Warning */}
            {lockoutUntil && (
              <div className="bg-orange-50 border border-orange-300 text-orange-800 px-4 py-4 rounded-lg flex items-center gap-3">
                <Clock className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Account Temporarily Locked</p>
                  <p className="text-sm mt-1">
                    Try again in:{" "}
                    <span className="font-mono font-bold text-lg">
                      {lockoutTimeLeft}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !lockoutUntil && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Any password"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!lockoutUntil}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Admin Credentials */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Admin Credentials:
              </p>
              <p className="text-sm text-blue-800">Email: admin@versoair.com</p>
              <p className="text-sm text-blue-800">
                Password: AdminGeneral@2026!
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center mt-6 text-gray-600 text-sm">
            <p>
              Back to{" "}
              <Link href="/" className="text-indigo-600 hover:underline">
                Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 🔐 AdminAccessGate — Username + Password gate for Admin Dashboard
 *
 * Simple sign-in: username + passpartout password
 * Server validates credentials via /auth/admin-gate (bcrypt)
 */

import React, { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  KeyRound,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setAuthToken, initializeCsrfToken } from "@/lib/auth";
import { ADMIN_USERS } from "@/lib/admin-auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface AdminAccessGateProps {
  onAccessGranted: (username: string) => void;
}

export function AdminAccessGate({ onAccessGranted }: AdminAccessGateProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("Username and password are required.");
      return;
    }

    // Client-side pre-check: username must be in admin list
    const adminUser = ADMIN_USERS.find(
      (u) => u.username.toLowerCase() === trimmedUsername,
    );
    if (!adminUser) {
      setError("Access denied. Not an authorized admin.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: adminUser.username,
          password: trimmedPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        setAuthToken(data.token);
        await initializeCsrfToken();
        // Persist role so dashboard can enforce vault restrictions
        localStorage.setItem("adminRole", adminUser.role);
        localStorage.setItem(
          "adminCanAccessVault",
          String(adminUser.canAccessVault === true),
        );
        onAccessGranted(adminUser.username);
      } else {
        setError(data.message || "Invalid credentials.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Admin Dashboard
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xs text-amber-400 font-medium">
                  Authorized Personnel Only
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Username + Password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin_001"
                    required
                    autoComplete="username"
                    autoFocus
                    disabled={isLoading}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 text-base"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="pl-10 pr-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
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
                disabled={
                  isLoading || !username.trim() || !password.trim()
                }
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-base mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <Shield className="h-3.5 w-3.5 text-indigo-500/50" />
                <span>Encrypted · Session expires after 24h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

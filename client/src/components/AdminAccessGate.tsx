/**
 * 🔐 AdminAccessGate — 2FA access gate for Admin Dashboard
 *
 * Factor 1: Generated 6-digit code (visible on screen, changes on refresh)
 * Factor 2: Admin username (CODE/username_000)
 * Both must match to authenticate via /auth/admin-gate
 */

import React, { useState, useEffect } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  KeyRound,
  Copy,
  RefreshCw,
  ShieldCheck,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setAuthToken, initializeCsrfToken } from "@/lib/auth";
import { generateAccessCode, validateAdminAccess } from "@/lib/admin-auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface AdminAccessGateProps {
  onAccessGranted: (username: string) => void;
}

export function AdminAccessGate({ onAccessGranted }: AdminAccessGateProps) {
  const [generatedCode, setGeneratedCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Generate code on mount
  useEffect(() => {
    setGeneratedCode(generateAccessCode());
  }, []);

  const handleNewCode = () => {
    setGeneratedCode(generateAccessCode());
    setUserInput("");
    setAdminPassword("");
    setError("");
    setCodeCopied(false);
  };

  const handleCopy = () => {
    try {
      // Fallback: use a temporary textarea + execCommand
      const ta = document.createElement("textarea");
      ta.value = generatedCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // silent fail — code is visible and selectable anyway
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const input = userInput.trim();
    if (!input) {
      setError("Enter your credentials");
      return;
    }
    if (!adminPassword) {
      setError("Password is required.");
      return;
    }

    // Step 1: Validate 2FA — code must match + username must be in admin list
    const validation = validateAdminAccess(input, generatedCode);
    if (!validation.isValid || !validation.user) {
      setError(validation.error || "Invalid credentials");
      return;
    }

    setIsLoading(true);

    try {
      // Step 2: Authenticate with server (username + password)
      const res = await fetch(`${API_BASE_URL}/auth/admin-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: validation.user.username, password: adminPassword }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        setAuthToken(data.token);
        await initializeCsrfToken();
        onAccessGranted(validation.user.username);
      } else {
        setError(data.message || "Server rejected access.");
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
                  2FA Required
                </p>
              </div>
            </div>

            {/* Generated Code — Factor 1 */}
            <div className="bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/25 rounded-xl p-4 mb-5">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2 font-medium">
                Step 1 — Generated Code
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-900/60 rounded-lg px-4 py-3 border border-indigo-500/20">
                  <p className="text-2xl font-mono font-bold text-indigo-400 tracking-[0.3em] text-center select-all">
                    {generatedCode}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg border border-indigo-500/25 hover:bg-indigo-500/10 transition-colors"
                    title="Copy code"
                  >
                    <Copy
                      className={`h-3.5 w-3.5 transition-colors ${codeCopied ? "text-green-400" : "text-gray-400"}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleNewCode}
                    className="p-2 rounded-lg border border-indigo-500/25 hover:bg-indigo-500/10 transition-colors"
                    title="Generate new code"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
              {codeCopied && (
                <p className="text-[10px] text-green-400 mt-1.5 text-center">
                  Copied!
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Single combined field — Factor 2 */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                  Step 2 — Enter Code / Username
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type={showInput ? "text" : "password"}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="CODE/username_000"
                    required
                    autoComplete="off"
                    autoFocus
                    disabled={isLoading}
                    className="pl-10 pr-[4.5rem] bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 text-base font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Focus the input and trigger a paste via execCommand
                        const input = document.querySelector<HTMLInputElement>(
                          'input[placeholder="CODE/username_000"]',
                        );
                        if (input) {
                          input.focus();
                          document.execCommand("paste");
                        }
                      }}
                      className="p-1 rounded text-gray-500 hover:text-indigo-400 transition-colors"
                      title="Paste from clipboard"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInput(!showInput)}
                      className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showInput ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Combine:{" "}
                  <span className="text-indigo-400 font-mono">
                    {generatedCode}
                  </span>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-400 font-mono">your_username</span>
                </p>
              </div>

              {/* Password — Factor 3 */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                  Step 3 — Account Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type={showAdminPwd ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPwd(!showAdminPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showAdminPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || userInput.trim().length < 3 || !adminPassword}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Access Dashboard
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <Shield className="h-3.5 w-3.5 text-indigo-500/50" />
                <span>2FA enforced · Session expires after 15 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

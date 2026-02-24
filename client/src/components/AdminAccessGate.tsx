import React, { useState, useEffect } from "react";
import { Copy, RefreshCw, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateAccessCode, validateAdminAccess } from "@/lib/admin-auth";
import { setAuthToken, initializeCsrfToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5003";

interface AdminAccessGateProps {
  onAccessGranted: (username: string) => void;
}

export function AdminAccessGate({ onAccessGranted }: AdminAccessGateProps) {
  const [accessCode, setAccessCode] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate initial code on mount
  useEffect(() => {
    setAccessCode(generateAccessCode());
  }, []);

  const handleGenerateNewCode = () => {
    const newCode = generateAccessCode();
    setAccessCode(newCode);
    setError("");
    setSuccess("");
    setUserInput("");
    setCodeCopied(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const validation = validateAdminAccess(userInput, accessCode);

    if (validation.isValid && validation.user) {
      // Get JWT token from the server for admin access
      try {
        const tokenResponse = await fetch(`${API_BASE_URL}/auth/admin-gate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: validation.user.username }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.token) {
            // Store JWT in memory so authenticatedFetch sends Authorization header
            setAuthToken(tokenData.token);
          }
        } else {
          console.error(
            "Admin gate token request failed:",
            tokenResponse.status,
          );
        }
        // Always initialize CSRF token after auth
        await initializeCsrfToken();
      } catch (tokenError) {
        console.error("Failed to get JWT token:", tokenError);
        // Continue anyway — CSRF will retry on first mutation
      }

      setSuccess(`Welcome, ${validation.user.name}! Access granted.`);
      setTimeout(() => {
        onAccessGranted(validation.user!.username);
      }, 1000);
    } else {
      setError(validation.error || "Invalid credentials");
      setUserInput("");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border-0 shadow-2xl relative z-10 bg-gray-800/95 backdrop-blur">
        {/* Header */}
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">
            Admin Access Required
          </CardTitle>
          <CardDescription className="text-gray-400 mt-2">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertTitle className="text-blue-400">How it works</AlertTitle>
            <AlertDescription className="text-blue-300/80 text-xs mt-1">
              Use the generated code combined with your admin username in
              format: CODE/username
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Access Denied</AlertTitle>
              <AlertDescription className="text-red-300/80 text-xs mt-1">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertTitle className="text-green-400">Success</AlertTitle>
              <AlertDescription className="text-green-300/80 text-xs mt-1">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Access Code Section */}
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
              Generated Access Code
            </p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-gray-900/50 rounded-lg px-4 py-3 border border-indigo-500/30">
                <p className="text-2xl font-mono font-bold text-indigo-400 tracking-widest">
                  {accessCode}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="border-indigo-500/30 hover:bg-indigo-500/10"
              >
                <Copy
                  className={`h-4 w-4 transition-colors ${codeCopied ? "text-green-400" : "text-gray-400"}`}
                />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateNewCode}
              className="w-full border-indigo-500/30 hover:bg-indigo-500/10 text-gray-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate New Code
            </Button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">
                Admin Credentials
              </Label>
              <Input
                placeholder="CODE/username"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20 font-mono text-sm"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-2">
                Contact your administrator for your assigned username
              </p>
            </div>

            <Button
              type="submit"
              disabled={!userInput || isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Access Dashboard
                </>
              )}
            </Button>
          </form>

          {/* Footer Info */}
          <div className="text-center pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-500">
              🔐 Only authorized admin users can access this page.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Session will expire after 15 minutes of inactivity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";

/**
 * OAuth Completion Page
 *
 * This page handles the redirect back from OAuth providers.
 * It parses the token + credentials from query params, stores them via AuthContext,
 * shows a brief confirmation with the user's parsed credentials + role checkpoint,
 * then auto-redirects to the appropriate dashboard.
 */
export default function OAuthComplete() {
  const [, navigate] = useLocation();
  const { login } = useAuthContext();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [credentials, setCredentials] = useState<{
    email: string;
    role: string;
    name: string;
    provider: string;
    checkpoint: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    const userId = url.searchParams.get("userId");
    const email = url.searchParams.get("email");
    const role = url.searchParams.get("role");
    const name = url.searchParams.get("name");
    const redirect = url.searchParams.get("redirect");
    const provider = url.searchParams.get("provider");
    const error = url.searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(
        decodeURIComponent(error).replace(/_/g, " ") ||
          "Authentication failed. Please try again.",
      );
      return;
    }

    if (!token || !userId || !email) {
      setStatus("error");
      setErrorMessage("Missing authentication data. Please sign in again.");
      return;
    }

    // Parse and display credentials
    const checkpoint = redirect || "/dashboard";
    setCredentials({
      email: decodeURIComponent(email),
      role: decodeURIComponent(role || "user"),
      name: decodeURIComponent(name || email.split("@")[0]),
      provider: provider || "oauth",
      checkpoint,
    });

    // Store credentials via AuthContext (persists to localStorage + in-memory)
    login(token, {
      id: userId,
      email: decodeURIComponent(email),
      name: decodeURIComponent(name || ""),
      role: decodeURIComponent(role || "user"),
    });

    // Also store in geo-admin session for backward compat
    localStorage.setItem("geoadmin_session", "true");
    localStorage.setItem(
      "geoadmin_username",
      decodeURIComponent(name || email.split("@")[0]),
    );
    localStorage.setItem("signin_timestamp", new Date().toISOString());

    setStatus("success");

    // Auto-redirect after brief display of parsed credentials
    const timer = setTimeout(() => {
      navigate(checkpoint);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === "processing" && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-[#bf831c] animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Processing Sign In…
              </h2>
              <p className="text-gray-500 text-sm">
                Parsing credentials and verifying access…
              </p>
            </div>
          )}

          {status === "success" && credentials && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Signed In Successfully
              </h2>

              {/* Parsed credentials display */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Provider
                  </span>
                  <span className="text-sm font-semibold text-gray-800 capitalize flex items-center gap-1.5">
                    {credentials.provider === "google" && "🔵"}
                    {credentials.provider === "microsoft" && "🟧"}
                    {credentials.provider === "apple" && "⬛"}
                    {credentials.provider}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Email
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate ml-2 max-w-[200px]">
                    {credentials.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Name
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {credentials.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Role
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      credentials.role === "superuser"
                        ? "bg-red-100 text-red-700"
                        : credentials.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : credentials.role === "moderator"
                            ? "bg-blue-100 text-blue-700"
                            : credentials.role === "business_owner"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {credentials.role}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 mt-1">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Checkpoint
                  </span>
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {credentials.checkpoint}
                  </span>
                </div>
              </div>

              {/* Live status indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Redirecting to your dashboard…
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Sign In Failed
              </h2>
              <p className="text-gray-600 text-sm mb-6">{errorMessage}</p>
              <button
                onClick={() => navigate("/auth/signin?mode=login")}
                className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

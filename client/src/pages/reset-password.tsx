import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkPasswordLength,
  checkPasswordNumber,
  checkPasswordUpper,
} from "@/lib/auth-validation";

function getResponseMessage(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return undefined;
}

export default function ResetPasswordPage() {
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Request a new link.");
      return;
    }
    if (!checkPasswordLength(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!checkPasswordUpper(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!checkPasswordNumber(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (password.length > 128) {
      setError("Password must be 128 characters or fewer.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const payload: unknown = await response.json();
      const succeeded =
        typeof payload === "object" &&
        payload !== null &&
        "success" in payload &&
        payload.success === true;

      if (!response.ok || !succeeded) {
        setError(
          getResponseMessage(payload) ??
            "We couldn't reset your password. Request a new reset link and try again.",
        );
        return;
      }

      setIsComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
      <main className="container mx-auto px-4">
        <section className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#bf831c] to-[#d4941f]">
              {isComplete ? (
                <CheckCircle2 className="h-8 w-8 text-white" />
              ) : (
                <LockKeyhole className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isComplete ? "Password Updated" : "Reset Your Password"}
            </h1>
            <p className="mt-2 text-gray-600">
              {isComplete
                ? "Your password has been changed. You can now sign in."
                : "Choose a new password for your Verso Air account."}
            </p>
          </div>

          {isComplete ? (
            <Button
              type="button"
              onClick={() =>
                window.location.replace("/auth/signin?passwordReset=success")
              }
              className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white hover:from-[#a6701a] hover:to-[#c0841c]"
            >
              Continue to Sign In
            </Button>
          ) : !token ? (
            <div className="space-y-5 text-center">
              <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                This reset link is missing its token. Request a new link to continue.
              </p>
              <Link href="/auth/signin">
                <Button className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-gray-700"
                  htmlFor="reset-password"
                >
                  New Password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#bf831c]"
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-gray-700"
                  htmlFor="confirm-reset-password"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#bf831c]"
                />
              </div>
              <p className="text-xs text-gray-500">
                Use at least 8 characters, including one uppercase letter and one number.
              </p>
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white hover:from-[#a6701a] hover:to-[#c0841c]"
              >
                {isSubmitting ? "Updating Password…" : "Update Password"}
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageSwitcher";

interface VerificationPendingNoticeProps {
  email: string;
  emailSent?: boolean | null;
  message?: string;
  onContinue?: () => void;
  continueLabel?: string;
}

export default function VerificationPendingNotice({
  email,
  emailSent,
  message,
  onContinue,
  continueLabel = "Continue to sign in after verifying",
}: VerificationPendingNoticeProps) {
  const [resending, setResending] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(emailSent);
  const [statusMessage, setStatusMessage] = useState(message || "");
  // The root is translate="no", so every visible string goes through translateText explicitly.
  // Server messages are English; catalogued ones localize and unknown ones stay as written.
  const { translateText } = useLanguage();

  const resend = async () => {
    setResending(true);
    setStatusMessage("");
    try {
      const response = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Could not request a verification email.",
        );
      }
      setDeliveryConfirmed(
        typeof data.emailSent === "boolean" ? data.emailSent : null,
      );
      setStatusMessage(data.message || "");
    } catch (error) {
      setDeliveryConfirmed(false);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Could not request a verification email. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      translate="no"
      className="notranslate w-full space-y-5 rounded-2xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl"
    >
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10">
          <CheckCircle2 className="h-8 w-8 text-amber-300" />
        </div>
        <h2 className="text-xl font-bold">
          {translateText("Account created — verify your email")}
        </h2>
        <p className="mt-2 text-sm text-white/70">
          {translateText(
            "Your account is not ready to sign in until you verify this address:",
          )}
        </p>
        <p className="mt-1 break-all font-semibold text-amber-200">{email}</p>
      </div>

      <p
        role={deliveryConfirmed === true ? "status" : "alert"}
        className={`rounded-lg border p-4 text-sm ${
          deliveryConfirmed === true
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
            : "border-amber-400/30 bg-amber-400/10 text-amber-100"
        }`}
      >
        {statusMessage
          ? translateText(statusMessage)
          : deliveryConfirmed === true
            ? translateText(
                "Verification email sent. Check your inbox and spam folder.",
              )
            : deliveryConfirmed === false
              ? translateText(
                  "We could not confirm delivery. Your account remains unverified; retry email delivery before signing in.",
                )
              : translateText(
                  "Email verification is required. Check your inbox or request a new verification link.",
                )}
      </p>

      <Button
        type="button"
        onClick={resend}
        disabled={resending}
        className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
      >
        {resending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {resending
          ? translateText("Requesting verification email...")
          : translateText("Resend verification email")}
      </Button>

      {onContinue && (
        <Button
          type="button"
          variant="outline"
          onClick={onContinue}
          className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          {translateText(continueLabel)}
        </Button>
      )}
    </div>
  );
}

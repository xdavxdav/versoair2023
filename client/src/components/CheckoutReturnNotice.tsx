import React from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutReturnPhase } from "@/hooks/use-checkout-return";
import { useTranslate } from "@/hooks/use-translate";

export type PurchaseKind = "community" | "activity" | "plan";

interface CheckoutReturnNoticeProps {
  phase: CheckoutReturnPhase;
  purchase: PurchaseKind;
  /** Name of the plan that was bought, when known. */
  planName?: string;
  onCheckAgain: () => void;
  onDismiss: () => void;
}

const BASE =
  "mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-3 text-sm";

/** What the buyer sees after returning from Stripe Checkout. */
export default function CheckoutReturnNotice({
  phase,
  purchase,
  planName,
  onCheckAgain,
  onDismiss,
}: CheckoutReturnNoticeProps) {
  const tr = useTranslate();

  if (phase === "idle") return null;

  if (phase === "confirming") {
    return (
      <div
        role="status"
        className={`${BASE} border-amber-300 bg-amber-50 text-amber-950`}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{tr("Confirming your payment…")}</span>
      </div>
    );
  }

  if (phase === "delayed") {
    return (
      <div
        role="alert"
        className={`${BASE} border-amber-400 bg-amber-100 text-amber-950`}
      >
        <span className="min-w-0 flex-1">
          {tr(
            "Your payment is taking longer than usual to confirm. If you were charged, it will be applied automatically, so please do not pay again.",
          )}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={onCheckAgain}>
          {tr("Check again")}
        </Button>
        <a
          href="mailto:support@versoair.com"
          className="font-semibold underline underline-offset-2"
        >
          {tr("Contact Support")}
        </a>
      </div>
    );
  }

  const confirmed = phase === "confirmed";
  return (
    <div
      role="status"
      className={`${BASE} ${
        confirmed
          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
          : "border-slate-300 bg-slate-100 text-slate-900"
      }`}
    >
      {confirmed ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1">
        {confirmed
          ? confirmedMessage(tr, purchase, planName)
          : tr("Checkout was cancelled. You have not been charged.")}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="font-medium underline underline-offset-2"
      >
        {tr("Close")}
      </button>
    </div>
  );
}

function confirmedMessage(
  tr: ReturnType<typeof useTranslate>,
  purchase: PurchaseKind,
  planName?: string,
): string {
  if (purchase === "community") {
    return tr("Payment received. Welcome to the community!");
  }
  if (purchase === "activity") {
    return tr("Payment received. You are on the list for this activity.");
  }
  return planName
    ? tr("Payment received. Your {plan} plan is now active.", { plan: planName })
    : tr("Payment received. Thank you!");
}

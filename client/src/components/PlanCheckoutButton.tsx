import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import CheckoutReviewModal from "@/components/CheckoutReviewModal";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTranslate } from "@/hooks/use-translate";
import { GEOADMIN_OFFER_NAMES } from "@/lib/geoadmin-pricing";
import {
  planAmountCents,
  type BillingCycle,
  type SelfServePlanTier,
} from "@shared/plan-pricing";
import type { BillingDetailsInput } from "@shared/billing-details";
import { isBundledLanguage } from "@shared/public-translations";

interface PlanCheckoutButtonProps {
  tier: SelfServePlanTier;
  cycle: BillingCycle;
  /** Set while a payment is still being confirmed, so nobody pays twice. */
  disabled?: boolean;
}

/** Starts a Stripe Checkout Session for a plan and redirects to it. */
export default function PlanCheckoutButton({
  tier,
  cycle,
  disabled = false,
}: PlanCheckoutButtonProps) {
  const { user } = useAuthContext();
  const { currentLang } = useLanguage();
  const tr = useTranslate();
  const [open, setOpen] = useState<boolean | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authenticatedFetch("/api/v1/payments/availability")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (active) setOpen(body?.data?.cardCheckout === true);
      })
      .catch(() => {
        if (active) setOpen(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (open !== true) return null;

  const amountCents = planAmountCents(tier, cycle);
  const amount = (amountCents / 100).toFixed(0);
  const planName = GEOADMIN_OFFER_NAMES[tier];
  const label = tr(cycle === "annual" ? "Pay {price}/yr" : "Pay {price}/mo", {
    price: `CA$${amount}`,
  });
  const native = isBundledLanguage(currentLang);

  function openReview() {
    if (!user) {
      window.location.href = `/auth/login?redirect=${encodeURIComponent("/pricing")}`;
      return;
    }
    setError(null);
    setReviewOpen(true);
  }

  async function startCheckout(billingDetails: BillingDetailsInput) {
    setBusy(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/v1/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTier: tier,
          billingCycle: cycle,
          billingDetails,
          clientAttemptId: `${tier}-${cycle}-${Date.now()}`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data?.url) {
        setError(body?.error ?? "Checkout could not start. Please try again.");
        return;
      }
      window.location.href = body.data.url;
    } catch {
      setError("Checkout could not start. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        onClick={openReview}
        disabled={busy || disabled}
        className="w-full bg-amber-900 text-white hover:bg-amber-950"
        aria-label={tr("{label} for {plan}", {
          label,
          plan: planName,
        })}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        <span
          key={`${tier}-${cycle}-${currentLang}`}
          lang={native ? currentLang : undefined}
          dir="auto"
          translate={native ? "no" : undefined}
          className={native ? "notranslate" : undefined}
        >
          {label}
        </span>
      </Button>
      {error && !reviewOpen ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {tr(error)}
        </p>
      ) : null}
      <CheckoutReviewModal
        open={reviewOpen}
        onClose={() => !busy && setReviewOpen(false)}
        title={`${planName} Plan`}
        purpose={`VERSO AIR INC. Business Directory — ${planName} (${cycle === "annual" ? "Annual" : "Monthly"})`}
        deliverable="Activates your selected Business Directory tier features immediately after Stripe confirms payment. Official PDF invoice sent to your email."
        totalCents={amountCents}
        billingFrequencyLabel={cycle === "annual" ? "CAD · per year" : "CAD · per month"}
        items={[{ label: `${planName} (${cycle})`, amountCents }]}
        busy={busy}
        serverError={error}
        onConfirm={startCheckout}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTranslate } from "@/hooks/use-translate";
import { GEOADMIN_OFFER_NAMES } from "@/lib/geoadmin-pricing";
import {
  planAmountCents,
  type BillingCycle,
  type SelfServePlanTier,
} from "@shared/plan-pricing";

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
  const tr = useTranslate();
  const [open, setOpen] = useState<boolean | null>(null);
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

  const amount = (planAmountCents(tier, cycle) / 100).toFixed(0);
  const label = tr(cycle === "annual" ? "Pay {price}/yr" : "Pay {price}/mo", {
    price: `CA$${amount}`,
  });

  async function startCheckout() {
    if (!user) {
      window.location.href = `/auth/login?redirect=${encodeURIComponent("/pricing")}`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/v1/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTier: tier, billingCycle: cycle }),
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
        onClick={startCheckout}
        disabled={busy || disabled}
        className="w-full bg-amber-900 text-white hover:bg-amber-950"
        aria-label={tr("{label} for {plan}", {
          label,
          plan: GEOADMIN_OFFER_NAMES[tier],
        })}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {tr(error)}
        </p>
      ) : null}
    </div>
  );
}

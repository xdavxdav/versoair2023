import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";

export interface PublicOffer {
  key: string;
  name: string;
  amountCents: number;
}

/** The active offer for a key, or null while loading or when not on sale. */
export function useActiveOffer(offerKey: string): PublicOffer | null {
  const [offer, setOffer] = useState<PublicOffer | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      authenticatedFetch("/api/v1/payments/availability").then((r) =>
        r.ok ? r.json() : null,
      ),
      authenticatedFetch("/api/v1/payments/offers").then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([availability, offers]) => {
        if (!active || availability?.data?.cardCheckout !== true) return;
        const found = (offers?.data as PublicOffer[] | undefined)?.find(
          (o) => o.key === offerKey,
        );
        setOffer(found ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [offerKey]);

  return offer;
}

interface OfferCheckoutButtonProps {
  offer: PublicOffer;
  label: string;
  eventId?: number;
  className?: string;
}

/** Starts a one-time Stripe Checkout for an admin-priced offer. */
export default function OfferCheckoutButton({
  offer,
  label,
  eventId,
  className,
}: OfferCheckoutButtonProps) {
  const { user } = useAuthContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!user) {
      window.location.href = `/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        "/api/v1/payments/create-offer-checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerKey: offer.key, eventId }),
        },
      );
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
    <div>
      <Button
        type="button"
        onClick={start}
        disabled={busy}
        className={className ?? "bg-amber-600 text-white hover:bg-amber-700"}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label} — CA${(offer.amountCents / 100).toFixed(2)}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

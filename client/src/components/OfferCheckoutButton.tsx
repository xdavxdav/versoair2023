import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTranslate } from "@/hooks/use-translate";

export interface PublicOffer {
  key: string;
  name: string;
  amountCents: number;
}

const OFFER_LOAD_TIMEOUT_MS = 8_000;

/**
 * The active offer for a key: undefined while it is still loading, null when it
 * is not on sale (or could not be loaded in time).
 */
export function useActiveOffer(
  offerKey: string,
): PublicOffer | null | undefined {
  const [offer, setOffer] = useState<PublicOffer | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OFFER_LOAD_TIMEOUT_MS);
    const { signal } = controller;
    Promise.all([
      authenticatedFetch("/api/v1/payments/availability", { signal }).then(
        (r) => (r.ok ? r.json() : null),
      ),
      authenticatedFetch("/api/v1/payments/offers", { signal }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([availability, offers]) => {
        if (!active) return;
        const found =
          availability?.data?.cardCheckout === true
            ? (offers?.data as PublicOffer[] | undefined)?.find(
                (o) => o.key === offerKey,
              )
            : undefined;
        setOffer(found ?? null);
      })
      .catch(() => {
        if (active) setOffer(null);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [offerKey]);

  return offer;
}

interface OfferCheckoutButtonProps {
  offer: PublicOffer;
  label: string;
  eventId?: number;
  className?: string;
  /** Called when the server says the buyer already has this offer. */
  onOwned?: () => void;
}

const ALREADY_OWNED = new Set(["ALREADY_PURCHASED", "ALREADY_ATTENDING"]);

/** Starts a one-time Stripe Checkout for an admin-priced offer. */
export default function OfferCheckoutButton({
  offer,
  label,
  eventId,
  className,
  onOwned,
}: OfferCheckoutButtonProps) {
  const { user } = useAuthContext();
  const tr = useTranslate();
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
        if (res.status === 409 && ALREADY_OWNED.has(body?.code)) onOwned?.();
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
        {tr(label)} — CA${(offer.amountCents / 100).toFixed(2)}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {tr(error)}
        </p>
      ) : null}
    </div>
  );
}

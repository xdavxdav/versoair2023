import React from "react";
import { ArrowRight, Info, X } from "lucide-react";
import { TIERS, type TierKey } from "@/lib/tiers";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  GEOADMIN_ANNUAL_PRICES_XOF,
  GEOADMIN_PLAN_DETAILS,
  GEOADMIN_PLAN_ORDER,
  formatMarketXofPrice,
} from "@/lib/geoadmin-pricing";
import { useGeoAdminPricing } from "@/hooks/use-geoadmin-pricing";

interface TierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: TierKey;
  onSelectTier?: (tier: TierKey) => void;
  hiddenSearches?: number;
}

export const TierComparisonModal: React.FC<TierComparisonModalProps> = ({
  isOpen,
  onClose,
  currentTier,
}) => {
  useScrollLock(isOpen);
  const { currency, rates, selectedCountry, marketAvailability } =
    useGeoAdminPricing();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close plan availability dialog"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-availability-title"
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Info className="h-6 w-6" />
        </div>
        <h2
          id="plan-availability-title"
          className="mb-3 pr-8 text-2xl font-bold text-gray-900"
        >
          GeoAdmin plans and annual reference prices
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-gray-600">
          Prices are shown in CAD in Canada, EUR in France, and FCFA in Côte
          d’Ivoire. Other countries are coming soon.
        </p>
        <p className="mb-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          Your current access level is{" "}
          <span className="font-semibold">{TIERS[currentTier].name}</span>.
          Reviewing plans does not change your account or start a subscription.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {GEOADMIN_PLAN_ORDER.map((tier) => (
            <article
              key={tier}
              className={`rounded-xl border p-4 ${
                tier === currentTier
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-gray-200"
              }`}
            >
              <h3 className="font-semibold text-gray-900">
                {TIERS[tier].name}
              </h3>
              <p className="mt-1 font-bold text-indigo-800" translate="no">
                {formatMarketXofPrice(
                  GEOADMIN_ANNUAL_PRICES_XOF[tier],
                  selectedCountry ?? "",
                  currency,
                  rates,
                )}
                {GEOADMIN_ANNUAL_PRICES_XOF[tier] !== null &&
                  marketAvailability !== false && (
                  <span className="font-normal text-gray-500"> / year</span>
                )}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                {GEOADMIN_PLAN_DETAILS[tier].benefits.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          Prices are annual references, not a monthly billing offer. Local
          CAD and EUR amounts are indicative conversions from the FCFA
          reference schedule; final availability, deliverables, and terms are
          confirmed directly. No online checkout is available here.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <a
            href={`mailto:support@versoair.com?subject=${encodeURIComponent(`GeoAdmin ${TIERS[currentTier].name} plan inquiry`)}`}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Ask about availability
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
};

interface HiddenSearchesAlertProps {
  hiddenCount: number;
  currentTier: TierKey;
  onSeeWhy: () => void;
}

export const HiddenSearchesAlert: React.FC<HiddenSearchesAlertProps> = ({
  hiddenCount,
  currentTier,
  onSeeWhy,
}) => {
  if (hiddenCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={onSeeWhy}
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950 hover:bg-amber-100"
    >
      <span className="font-semibold">Plan information</span>
      <span className="mt-1 block text-amber-900/80">
        Review annual reference pricing and benefits for your current access
        level ({TIERS[currentTier].name}). No subscription is started here.
      </span>
    </button>
  );
};

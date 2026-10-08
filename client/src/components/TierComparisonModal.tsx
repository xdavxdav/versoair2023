import React from "react";
import { ArrowRight, Info, X } from "lucide-react";
import { TIERS, type TierKey } from "@/lib/tiers";
import { useScrollLock } from "@/hooks/use-scroll-lock";

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
        className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
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
          Plan availability is being finalized
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-gray-600">
          GeoAdmin subscription tiers are not currently available for purchase.
          Plan features, fees, ranking behavior, and terms must be confirmed
          before any upgrade is offered.
        </p>
        <p className="mb-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          Recorded access level:{" "}
          <span className="font-semibold">
            {TIERS[currentTier].name}
          </span>
          . This notice does not change your current account access.
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
            href="/contact?subject=GeoAdmin%20plan%20availability"
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
        Plan availability is being finalized for your current access level (
        {TIERS[currentTier].name}).
      </span>
    </button>
  );
};

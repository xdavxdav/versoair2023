import React, { useState } from "react";
import {
  TIERS,
  TIER_ORDER,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  type TierKey,
  getTierIndex,
} from "@/lib/tiers";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface TierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: TierKey;
  onSelectTier?: (tier: TierKey) => void;
  hiddenSearches?: number; // "You were hidden from X searches"
}

/**
 * 🛸 Tier Comparison Modal - The "See Why" upgrade flow
 * Shows 4 tiers side-by-side with feature comparison, pricing, and value narrative
 */
export const TierComparisonModal: React.FC<TierComparisonModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectTier,
  hiddenSearches = 0,
}) => {
  useScrollLock(isOpen);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  if (!isOpen) return null;

  const displayTiers: TierKey[] = [
    "essential",
    "verified",
    "max",
    "enterprise",
  ];
  const currentIdx = getTierIndex(currentTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 text-gray-500"
        >
          ✕
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-t-2xl text-white">
          <h2 className="text-2xl font-bold mb-2">
            🛸 Unlock Your Business Growth Engine
          </h2>
          {hiddenSearches > 0 && (
            <div className="bg-white/20 rounded-lg p-3 mt-3 backdrop-blur-sm">
              <p className="text-lg font-semibold">
                ⚠️ Your business was hidden from{" "}
                <span className="text-yellow-300 font-black">
                  {hiddenSearches}
                </span>{" "}
                searches this week
              </p>
              <p className="text-sm text-white/80 mt-1">
                because of your current rank. See how upgrading changes that.
              </p>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-indigo-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-indigo-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Annual{" "}
              <span className="text-xs ml-1 text-yellow-300">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayTiers.map((tierKey) => {
              const tier = TIERS[tierKey];
              const features = TIER_FEATURES[tierKey];
              const tierIdx = getTierIndex(tierKey);
              const isCurrent = tierKey === currentTier;
              const isUpgrade = tierIdx > currentIdx;
              const isDowngrade = tierIdx < currentIdx;
              const price =
                billingCycle === "monthly"
                  ? tier.monthlyPrice
                  : Math.round(tier.annualPrice / 12);

              return (
                <div
                  key={tierKey}
                  className={`relative rounded-xl border-2 p-5 transition-all ${
                    tier.popular
                      ? "border-emerald-400 shadow-lg shadow-emerald-100 scale-[1.02]"
                      : isCurrent
                        ? "border-indigo-400 bg-indigo-50/50"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Popular Badge */}
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}

                  {/* Current Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Current Plan
                    </div>
                  )}

                  {/* Tier Header */}
                  <div className="text-center mb-4">
                    <span className="text-3xl">{tier.icon}</span>
                    <h3 className="text-lg font-bold text-gray-900 mt-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-gray-500 italic">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Ranking Power */}
                  <div className="text-center mb-4 py-3 bg-gray-50 rounded-lg">
                    <span className="text-3xl font-black text-gray-900">
                      {tier.rankingPower}x
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Search Ranking Power
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-4">
                    {tierKey === "enterprise" ? (
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          Custom
                        </p>
                        <p className="text-xs text-gray-500">Contact Sales</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-3xl font-bold text-gray-900">
                          ${price}
                          <span className="text-sm font-normal text-gray-500">
                            /mo
                          </span>
                        </p>
                        {billingCycle === "annual" && (
                          <p className="text-xs text-emerald-600 font-semibold">
                            ${tier.annualPrice}/year billed annually
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visibility Narrative */}
                  <p className="text-sm text-gray-600 text-center mb-4 italic">
                    "{tier.visibilityNarrative}"
                  </p>

                  {/* Key Features */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span>📸</span>
                      <span>
                        {features.photos === -1 ? "Unlimited" : features.photos}{" "}
                        photos
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>📊</span>
                      <span>
                        {features.analytics.charAt(0).toUpperCase() +
                          features.analytics.slice(1)}{" "}
                        analytics
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>🏷️</span>
                      <span>
                        {features.badges.length > 0
                          ? features.badges.join(", ").replaceAll("_", " ")
                          : "No badges"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{features.competitorInsights ? "✅" : "🔒"}</span>
                      <span
                        className={
                          !features.competitorInsights ? "text-gray-400" : ""
                        }
                      >
                        Competitor Insights
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{features.keywordTracking ? "✅" : "🔒"}</span>
                      <span
                        className={
                          !features.keywordTracking ? "text-gray-400" : ""
                        }
                      >
                        Keyword Tracking
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{features.promotedListing ? "✅" : "🔒"}</span>
                      <span
                        className={
                          !features.promotedListing ? "text-gray-400" : ""
                        }
                      >
                        Promoted Listing
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{features.newsletterFeature ? "✅" : "🔒"}</span>
                      <span
                        className={
                          !features.newsletterFeature ? "text-gray-400" : ""
                        }
                      >
                        Newsletter Feature
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-500 font-semibold text-sm"
                    >
                      Current Plan
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => onSelectTier?.(tierKey)}
                      className={`w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all ${
                        tier.popular
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md"
                          : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                      }`}
                    >
                      {tierKey === "enterprise"
                        ? "Contact Sales"
                        : `Upgrade to ${tier.name}`}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg bg-gray-50 text-gray-400 font-semibold text-sm border"
                    >
                      Below Current
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              📋 Full Feature Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">
                      Feature
                    </th>
                    {TIER_ORDER.map((t) => (
                      <th
                        key={t}
                        className={`text-center py-3 px-2 font-semibold ${t === currentTier ? "text-indigo-700 bg-indigo-50" : "text-gray-700"}`}
                      >
                        {TIERS[t].icon} {TIERS[t].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_DISPLAY.map((feat) => (
                    <tr
                      key={feat.key}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-gray-800">
                          {feat.label}
                        </div>
                        <div className="text-xs text-gray-400">
                          {feat.description}
                        </div>
                      </td>
                      {TIER_ORDER.map((t) => (
                        <td
                          key={t}
                          className={`text-center py-2.5 px-2 ${t === currentTier ? "bg-indigo-50 font-semibold" : ""}`}
                        >
                          {feat.formatValue(TIER_FEATURES[t][feat.key])}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Ranking Power Row */}
                  <tr className="border-b-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="py-3 px-2">
                      <div className="font-bold text-gray-900">
                        🚀 Ranking Power
                      </div>
                      <div className="text-xs text-gray-500 font-normal">
                        Multiplier in search results
                      </div>
                    </td>
                    {TIER_ORDER.map((t) => (
                      <td
                        key={t}
                        className={`text-center py-3 px-2 text-lg ${t === currentTier ? "bg-indigo-100 text-indigo-800" : ""}`}
                      >
                        {TIERS[t].rankingPower}x
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Trust Note */}
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>
              All plans include basic directory listing. Cancel anytime. Prices
              in USD.
            </p>
            <p className="mt-1">
              7-day free trial on all paid plans. No credit card required to
              start.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── HIDDEN SEARCHES ALERT (the "Aha!" hook) ────────────────────────────────────

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
  if (hiddenCount <= 0 || currentTier === "enterprise") return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-shrink-0 text-3xl">⚠️</div>
      <div className="flex-1">
        <p className="font-bold text-gray-900">
          Your business was hidden from{" "}
          <span className="text-red-600">{hiddenCount}</span> searches this week
        </p>
        <p className="text-sm text-gray-600 mt-0.5">
          because of your current rank. Upgrade to be discovered more.
        </p>
      </div>
      <button
        onClick={onSeeWhy}
        className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors"
      >
        See Why →
      </button>
    </div>
  );
};

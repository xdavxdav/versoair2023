import React, { useState, useMemo } from "react";
import { TIERS, TIER_ORDER, simulateRevenue, type TierKey } from "@/lib/tiers";
import {
  convertUsdToCurrency,
  formatMarketXofPrice,
} from "@/lib/geoadmin-pricing";
import { useGeoAdminPricing } from "@/hooks/use-geoadmin-pricing";

interface RevenueSimulatorProps {
  currentTier: TierKey;
  currentMonthlyViews: number;
  className?: string;
  locked?: boolean; // Show upgrade prompt if locked
  onUpgradeClick?: () => void;
}

/**
 * 💡 Revenue Simulator - "If I get 3x more views..."
 * Makes the subscription feel like an investment, not a cost.
 */
export const RevenueSimulator: React.FC<RevenueSimulatorProps> = ({
  currentTier,
  currentMonthlyViews,
  className = "",
  locked = false,
  onUpgradeClick,
}) => {
  const [conversionRate, setConversionRate] = useState(2); // percent
  const [avgOrderValue, setAvgOrderValue] = useState(50); // USD
  const [targetTier, setTargetTier] = useState<TierKey>(
    TIER_ORDER[
      Math.min(TIER_ORDER.indexOf(currentTier) + 1, TIER_ORDER.length - 1)
    ],
  );
  const { currency, rates, selectedCountry } = useGeoAdminPricing();

  const result = useMemo(
    () =>
      simulateRevenue({
        currentTier,
        targetTier,
        currentMonthlyViews,
        avgConversionRate: conversionRate / 100,
        avgOrderValue,
      }),
    [
      currentTier,
      targetTier,
      currentMonthlyViews,
      conversionRate,
      avgOrderValue,
    ],
  );

  const tierDef = TIERS[targetTier];
  const monthlyCostXof =
    tierDef.annualPriceXof === null ? null : tierDef.annualPriceXof / 12;
  const localCurrencyRate =
    currency === "XOF" || currency === "XAF" ? 1 : rates?.[currency];
  const monthlyCostInCurrency =
    monthlyCostXof !== null && localCurrencyRate
      ? monthlyCostXof * localCurrencyRate
      : null;
  const upliftInCurrency = convertUsdToCurrency(result.uplift, currency, rates);
  const roi =
    upliftInCurrency !== null &&
    monthlyCostInCurrency !== null &&
    monthlyCostInCurrency > 0
      ? Math.round((upliftInCurrency / monthlyCostInCurrency) * 100)
      : null;
  const formatUsdEstimate = (amountUsd: number) => {
    const converted = convertUsdToCurrency(amountUsd, currency, rates);
    if (converted === null) return `$${amountUsd.toLocaleString()}`;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(converted);
  };
  const monthlyPlanPrice =
    monthlyCostXof === null
      ? "Custom quote"
      : formatMarketXofPrice(
          monthlyCostXof,
          selectedCountry ?? "",
          currency,
          rates,
        );

  if (locked) {
    return (
      <div
        className={`relative bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden ${className}`}
      >
        {/* Blurred content */}
        <div className="filter blur-sm pointer-events-none select-none">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            💰 Revenue Simulator
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold">$2,400</div>
              <div className="text-sm text-gray-500">Current estimate</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-emerald-600">$7,200</div>
              <div className="text-sm text-gray-500">Projected</div>
            </div>
          </div>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center">
          <span className="text-4xl mb-3">🔒</span>
          <p className="text-sm font-bold text-gray-900 mb-1">
            Revenue Simulator
          </p>
          <p className="text-xs text-gray-500 mb-3 text-center px-4">
            Pro Verified users can simulate potential revenue from increased
            visibility
          </p>
          <button
            onClick={onUpgradeClick}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            Unlock with Pro Verified →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        💰 Revenue Simulator
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        See how more visibility translates to revenue
      </p>

      {/* Target Tier Selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          If I upgrade to...
        </label>
        <div className="flex gap-2 flex-wrap">
          {TIER_ORDER.filter(
            (t) => TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(currentTier),
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTargetTier(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                t === targetTier
                  ? `${TIERS[t].badgeColor} ring-2 ring-offset-1 ring-indigo-300`
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {TIERS[t].icon} {TIERS[t].name} ({TIERS[t].rankingPower}x)
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Conversion Rate (%)
          </label>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={conversionRate}
            onChange={(e) => setConversionRate(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="text-sm font-bold text-gray-700 text-center">
            {conversionRate}%
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Avg Order Value (USD)
          </label>
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={avgOrderValue}
            onChange={(e) => setAvgOrderValue(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="text-sm font-bold text-gray-700 text-center">
            ${avgOrderValue}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Current Estimate</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatUsdEstimate(result.currentEstimate)}
          </div>
          <div className="text-xs text-gray-400">/month</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
          <div className="text-xs text-emerald-600 mb-1">
            With {tierDef.name} ({tierDef.rankingPower}x)
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatUsdEstimate(result.projectedEstimate)}
          </div>
          <div className="text-xs text-emerald-500">/month</div>
        </div>
      </div>

      {/* Uplift Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Potential Uplift
          </span>
          <span className="text-lg font-black text-indigo-700">
            +{formatUsdEstimate(result.uplift)}/mo
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Revenue Growth
          </span>
          <span className="text-lg font-black text-emerald-600">
            +{result.upliftPercent}%
          </span>
        </div>
        {roi !== null && (
          <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
            <span className="text-sm font-semibold text-gray-700">
              ROI (uplift vs. plan cost)
            </span>
            <span
              className={`text-lg font-black ${roi > 100 ? "text-emerald-600" : "text-orange-500"}`}
            >
              {roi}%
            </span>
          </div>
        )}
      </div>

      {/* The Pitch */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 mb-3">
          <strong>If you get {tierDef.rankingPower}x more views</strong>, you
          could gain up to{" "}
          <span className="font-bold text-indigo-700">
            {Math.round(result.uplift / avgOrderValue)} more customers
          </span>{" "}
          per month.
        </p>
        <button
          onClick={onUpgradeClick}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
        >
          Ask about {tierDef.name} ({monthlyPlanPrice}/month equivalent) →
        </button>
        <p className="mt-2 text-xs text-gray-500">
          Revenue is illustrative. The monthly equivalent is the annual
          reference price divided by 12; it is not a monthly billing offer.
        </p>
      </div>
    </div>
  );
};

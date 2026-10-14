import type { TierKey } from "@/lib/tiers";
import { TIERS } from "@/lib/tiers";

export const GEOADMIN_PLAN_ORDER: TierKey[] = [
  "free",
  "essential",
  "verified",
  "max",
  "enterprise",
];

export const GEOADMIN_ANNUAL_PRICES_XOF: Record<TierKey, number | null> = {
  free: TIERS.free.annualPriceXof,
  essential: TIERS.essential.annualPriceXof,
  verified: TIERS.verified.annualPriceXof,
  max: TIERS.max.annualPriceXof,
  enterprise: TIERS.enterprise.annualPriceXof,
};

export const GEOADMIN_MARKETS = {
  CA: { currency: "CAD", locale: "en-US" },
  FR: { currency: "EUR", locale: "fr-FR" },
  CI: { currency: "XOF", locale: "fr-CI" },
} as const;

export const GEOADMIN_AVAILABLE_MARKETS = new Set(
  Object.keys(GEOADMIN_MARKETS),
);

export const GEOADMIN_PLAN_DETAILS: Record<
  TierKey,
  { shortDescription: string; benefits: string[] }
> = {
  free: {
    shortDescription: "Start with a basic directory presence.",
    benefits: [
      "Basic business directory listing",
      "Core business profile",
    ],
  },
  essential: {
    shortDescription: "Build a stronger, more complete business profile.",
    benefits: [
      "Everything in Free",
      "Enhanced directory listing",
      "Priority search placement",
      "Profile spotlight",
    ],
  },
  verified: {
    shortDescription: "Add stronger visibility and lead-generation tools.",
    benefits: [
      "Everything in Essential",
      "Featured placement",
      "Analytics dashboard",
      "Lead-generation tools",
    ],
  },
  max: {
    shortDescription: "Get a broader visibility and campaign package.",
    benefits: [
      "Everything in Pro Verified",
      "Top-tier visibility opportunities",
      "Dedicated support",
      "Custom campaign planning",
      "Global exposure",
    ],
  },
  enterprise: {
    shortDescription: "A tailored package for larger or multi-market needs.",
    benefits: [
      "Everything in Pro Max",
      "Discuss tailored deliverables and scale with the team",
      "Pricing, availability, and scope confirmed in a written proposal",
    ],
  },
};

export type ExchangeRates = Record<string, number>;

export function getGeoAdminMarket(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  return GEOADMIN_MARKETS[code as keyof typeof GEOADMIN_MARKETS] ?? null;
}

export function getMarketAvailability(countryCode: string): boolean | null {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return GEOADMIN_AVAILABLE_MARKETS.has(code);
}

export function formatXofPrice(
  amountXof: number | null,
  currency: string,
  rates: ExchangeRates | null,
  locale?: string,
): string {
  if (amountXof === null) return "Custom quote";

  const code = currency.toUpperCase();
  const marketLocale =
    Object.values(GEOADMIN_MARKETS).find((market) => market.currency === code)
      ?.locale ?? locale;
  if (code === "XOF") {
    return `${new Intl.NumberFormat(marketLocale, {
      maximumFractionDigits: 0,
    }).format(amountXof)} FCFA`;
  }
  const rate = rates?.[code] ?? null;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    return `${new Intl.NumberFormat(marketLocale, {
      maximumFractionDigits: 0,
    }).format(amountXof)} FCFA`;
  }

  return new Intl.NumberFormat(marketLocale, {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
    maximumFractionDigits: 0,
  }).format(amountXof * rate);
}

export function formatMarketXofPrice(
  amountXof: number | null,
  countryCode: string,
  currency: string,
  rates: ExchangeRates | null,
): string {
  if (getMarketAvailability(countryCode) === false) return "Coming soon";
  const market = getGeoAdminMarket(countryCode);
  if (
    market &&
    market.currency !== "XOF" &&
    (!rates?.[market.currency] ||
      !Number.isFinite(rates[market.currency]) ||
      rates[market.currency] <= 0)
  ) {
    return "Rate unavailable";
  }
  return formatXofPrice(
    amountXof,
    market?.currency ?? currency,
    rates,
    market?.locale,
  );
}

export function convertUsdToCurrency(
  amountUsd: number,
  currency: string,
  rates: ExchangeRates | null,
): number | null {
  const usdRate = rates?.USD;
  const targetRate =
    currency.toUpperCase() === "XOF" || currency.toUpperCase() === "XAF"
      ? 1
      : rates?.[currency.toUpperCase()];
  if (
    !Number.isFinite(amountUsd) ||
    !usdRate ||
    !targetRate ||
    !Number.isFinite(usdRate) ||
    !Number.isFinite(targetRate) ||
    usdRate <= 0 ||
    targetRate <= 0
  ) {
    return null;
  }
  return (amountUsd / usdRate) * targetRate;
}

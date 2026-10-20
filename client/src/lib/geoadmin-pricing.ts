import type { TierKey } from "@/lib/tiers";
import { TIERS } from "@/lib/tiers";
export {
  calculateGeoAdminFeeXof,
  calculateGeoAdminTotalXof,
  GEOADMIN_PROPOSED_FEE_PERCENTAGES,
  type GeoAdminProposedFeePercent,
} from "@shared/geoadmin-pricing";

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

// Commercial inquiries are not subscription entitlements. Premium intentionally
// has no TierKey and must never be submitted to account/billing APIs.
export type GeoAdminOfferKey = TierKey | "premium";

export const GEOADMIN_OFFER_ORDER: GeoAdminOfferKey[] = [
  "free", "essential", "premium", "verified", "max", "enterprise",
];

export const GEOADMIN_OFFER_NAMES: Record<GeoAdminOfferKey, string> = {
  free: "Standard",
  essential: "Essentiel",
  premium: "Premium",
  verified: "Pro Vérifié",
  max: "Pro Max",
  enterprise: "Enterprise",
};

export const GEOADMIN_OFFER_PRICES_XOF: Record<GeoAdminOfferKey, number | null> = {
  ...GEOADMIN_ANNUAL_PRICES_XOF,
  premium: 300_000,
};

export const GEOADMIN_REFERENCE_NOTICE =
  "Non-final annual reference prices; market research is ongoing. Platform availability and all proposed services must be confirmed in a written offer before any commitment. No payment, subscription activation, advertising budget or managed social campaign is included here. Standard is the only permanently free business plan, at 0 FCFA per year. Other plans are paid; any free trial is temporary, subject to eligibility, with duration and terms confirmed before activation.";

export const GEOADMIN_PREMIUM_NOTICE =
  "Premium is available by inquiry only. It uses the same platform scope as Essentiel and adds proposed content-preparation services, subject to written confirmation. It does not grant additional account permissions.";

export const GEOADMIN_MARKETS = {
  CA: { currency: "CAD", locale: "en-US" },
  FR: { currency: "EUR", locale: "fr-FR" },
  CI: { currency: "XOF", locale: "fr-CI" },
} as const;

export const GEOADMIN_AVAILABLE_MARKETS = new Set(
  Object.keys(GEOADMIN_MARKETS),
);

export const GEOADMIN_CONTACTS = [
  { phone: "+2250748343816", display: "+225 07-48-34-38-16" },
  { phone: "+2250564606401", display: "+225 05-64-60-64-01" },
  { phone: "+14374359726", display: "+1 (437) 435-9726" },
] as const;

interface OfferDetails {
  shortDescription: string;
  platform: string[];
  services: string[];
  benefits: string[];
}

function offer(shortDescription: string, platform: string[], services: string[]): OfferDetails {
  return { shortDescription, platform, services, benefits: [...platform, ...services] };
}

export const GEOADMIN_PLAN_DETAILS: Record<GeoAdminOfferKey, OfferDetails> = {
  free: offer("A basic, self-managed directory presence.", [
    "Business name, category, short description and directory geolocation",
  ], ["Self-managed listing; no content production service"]),
  essential: offer("Set up a clear business presentation.", [
    "Standard platform scope, plus a supplied logo and enriched short description",
  ], ["One initial setup using information and a logo supplied by the client"]),
  premium: offer("Content preparation, available by inquiry only.", [
    "Same proposed platform scope as Essentiel; no additional account permissions",
  ], [
    "One scoping interview",
    "Drafting a long presentation from information supplied by the client",
    "Preparation of five product or service sheets",
    "One round of corrections",
    "Publication only in available platform fields; formats and scope confirmed in writing",
  ]),
  verified: offer("Documentary verification and a richer business presentation.", [
    "Essentiel platform scope, plus a long description and product/service presentation",
    "Partner logo, customer reviews and notifications, subject to feature availability",
    "Verified status only after documentary checks; never granted automatically by payment",
  ], [
    "Documentary verification assistance",
    "Introduction to the web marketing team; production work quoted separately",
    "Premium content-preparation deliverables are not automatically included",
  ]),
  max: offer("Discuss enhanced visibility and a scoped promotion proposal.", [
    "Pro Vérifié platform scope, plus a featured banner and advanced analytics if available",
    "Promotional placements subject to availability and written scope; no guaranteed Top 3 ranking",
  ], [
    "Email, newsletter and promotional content: quantities and frequency to be quoted",
    "Videos, interviews, advertising management and media spend require a separate quote",
  ]),
  enterprise: offer("A custom scope agreed in writing, case by case.", [
    "Platform scope and multi-location or multi-market needs defined individually",
  ], [
    "Deliverables, responsibilities, support and commercial terms agreed in a written proposal",
    "No automatic entitlement to every Pro Max service",
  ]),
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
  if (amountXof === null) return "Custom quote";
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

/**
 * Self-serve plan prices charged by POST /api/v1/payments/create-checkout.
 *
 * Plans are charged in CAD, like the shop. client/src/lib/tiers.ts keeps the
 * FCFA reference schedule shown on screen; these figures are that schedule at
 * 0.0024 CAD per XOF, rounded to the nearest CA$10 per year, with the monthly
 * price at a tenth of the annual one. Enterprise has no self-serve price: the
 * public schedule shows "custom quote". Change prices in this file only.
 */
export const PLAN_CURRENCY = "cad";

export type BillingCycle = "monthly" | "annual";
export type SelfServePlanTier = "essential" | "verified" | "max";

export interface PlanPrice {
  name: string;
  monthlyCents: number;
  annualCents: number;
}

export const PLAN_PRICES: Record<SelfServePlanTier, PlanPrice> = {
  essential: { name: "Essential", monthlyCents: 4_300, annualCents: 43_000 },
  verified: { name: "Pro Verified", monthlyCents: 9_600, annualCents: 96_000 },
  max: { name: "Pro Max", monthlyCents: 18_700, annualCents: 187_000 },
};

export const SELF_SERVE_PLAN_TIERS = Object.keys(
  PLAN_PRICES,
) as SelfServePlanTier[];

export function isSelfServePlanTier(
  value: unknown,
): value is SelfServePlanTier {
  return typeof value === "string" && Object.hasOwn(PLAN_PRICES, value);
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

export function planAmountCents(
  tier: SelfServePlanTier,
  cycle: BillingCycle,
): number {
  const price = PLAN_PRICES[tier];
  return cycle === "annual" ? price.annualCents : price.monthlyCents;
}

export interface PublicTierPricing {
  currency: typeof PLAN_CURRENCY;
  monthly: number | null;
  annual: number | null;
  quoteOnly?: true;
}

/** Whole-currency amounts for display; null when a plan has no self-serve price. */
export function publicTierPricing(tier: string): PublicTierPricing {
  if (isSelfServePlanTier(tier)) {
    const { monthlyCents, annualCents } = PLAN_PRICES[tier];
    return {
      currency: PLAN_CURRENCY,
      monthly: monthlyCents / 100,
      annual: annualCents / 100,
    };
  }
  if (tier === "free") {
    return { currency: PLAN_CURRENCY, monthly: 0, annual: 0 };
  }
  return {
    currency: PLAN_CURRENCY,
    monthly: null,
    annual: null,
    quoteOnly: true,
  };
}

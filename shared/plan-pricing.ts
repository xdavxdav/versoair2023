/**
 * Business-plan prices. CAD is the approved price and the only checkout
 * currency; FCFA is the annual base schedule. EUR is derived for display only
 * at the fixed CFA franc peg and is not an approved price.
 */
export const PLAN_CURRENCY = "cad";
export const FCFA_PER_EUR = 655.957;

export const BUSINESS_PLAN_PRICE_SCHEDULE = {
  free: {
    name: "Standard",
    cadMonthlyCents: 0,
    cadAnnualCents: 0,
    fcfaAnnual: 0,
  },
  essential: {
    name: "Essentiel",
    cadMonthlyCents: 4_300,
    cadAnnualCents: 43_000,
    fcfaAnnual: 180_000,
  },
  premium: {
    name: "Premium",
    cadMonthlyCents: 6_000,
    cadAnnualCents: 72_000,
    fcfaAnnual: 300_000,
  },
  verified: {
    name: "Pro Vérifié",
    cadMonthlyCents: 9_600,
    cadAnnualCents: 96_000,
    fcfaAnnual: 400_000,
  },
  max: {
    name: "Pro Max",
    cadMonthlyCents: 18_700,
    cadAnnualCents: 187_000,
    fcfaAnnual: 780_000,
  },
  enterprise: {
    name: "Enterprise",
    quoteOnly: true,
  },
} as const;

export function deriveEurPlanPrice(fcfaAnnual: number): {
  monthlyCents: number;
  annualCents: number;
} {
  return {
    monthlyCents: Math.round((fcfaAnnual / 10 / FCFA_PER_EUR) * 100),
    annualCents: Math.round((fcfaAnnual / FCFA_PER_EUR) * 100),
  };
}

export type BillingCycle = "monthly" | "annual";
export type SelfServePlanTier = "essential" | "verified" | "max";

export interface PlanPrice {
  name: string;
  monthlyCents: number;
  annualCents: number;
}

export const PLAN_PRICES: Record<SelfServePlanTier, PlanPrice> = {
  essential: {
    name: "Essential",
    monthlyCents: BUSINESS_PLAN_PRICE_SCHEDULE.essential.cadMonthlyCents,
    annualCents: BUSINESS_PLAN_PRICE_SCHEDULE.essential.cadAnnualCents,
  },
  verified: {
    name: "Pro Verified",
    monthlyCents: BUSINESS_PLAN_PRICE_SCHEDULE.verified.cadMonthlyCents,
    annualCents: BUSINESS_PLAN_PRICE_SCHEDULE.verified.cadAnnualCents,
  },
  max: {
    name: "Pro Max",
    monthlyCents: BUSINESS_PLAN_PRICE_SCHEDULE.max.cadMonthlyCents,
    annualCents: BUSINESS_PLAN_PRICE_SCHEDULE.max.cadAnnualCents,
  },
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

/** CAD amounts used by the self-serve subscription API. */
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
  if (tier === "premium") {
    const price = BUSINESS_PLAN_PRICE_SCHEDULE.premium;
    return {
      currency: PLAN_CURRENCY,
      monthly: price.cadMonthlyCents / 100,
      annual: price.cadAnnualCents / 100,
    };
  }
  return {
    currency: PLAN_CURRENCY,
    monthly: null,
    annual: null,
    quoteOnly: true,
  };
}

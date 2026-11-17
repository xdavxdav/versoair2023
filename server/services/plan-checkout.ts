/**
 * Plan checkout: which plan and cycle a customer picked, and the Stripe
 * Checkout Session that charges for it. Pure functions, so the route can be
 * tested without Stripe.
 */
import type Stripe from "stripe";
import {
  PLAN_CURRENCY,
  PLAN_PRICES,
  SELF_SERVE_PLAN_TIERS,
  isBillingCycle,
  isSelfServePlanTier,
  planAmountCents,
  type BillingCycle,
  type SelfServePlanTier,
} from "@shared/plan-pricing";

export interface PlanSelection {
  tier: SelfServePlanTier;
  cycle: BillingCycle;
  name: string;
  amountCents: number;
}

export type PlanSelectionResult =
  | { ok: true; selection: PlanSelection }
  | { ok: false; error: string; code?: string };

export function resolvePlanSelection(
  targetTier: unknown,
  billingCycle: unknown = "monthly",
): PlanSelectionResult {
  if (targetTier === "enterprise") {
    return {
      ok: false,
      code: "PLAN_QUOTE_ONLY",
      error:
        "Enterprise plans are quoted individually. Contact the team for a quote.",
    };
  }
  if (!isSelfServePlanTier(targetTier)) {
    return {
      ok: false,
      error: `Invalid tier. Valid: ${SELF_SERVE_PLAN_TIERS.join(", ")}`,
    };
  }
  if (!isBillingCycle(billingCycle)) {
    return { ok: false, error: "billingCycle must be 'monthly' or 'annual'" };
  }
  return {
    ok: true,
    selection: {
      tier: targetTier,
      cycle: billingCycle,
      name: PLAN_PRICES[targetTier].name,
      amountCents: planAmountCents(targetTier, billingCycle),
    },
  };
}

export function buildPlanCheckoutParams(input: {
  userId: number | string;
  selection: PlanSelection;
  customerId: string;
  baseUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  const { selection } = input;
  return {
    payment_method_types: ["card"],
    mode: "payment",
    customer: input.customerId,
    payment_intent_data: {
      setup_future_usage: "off_session",
    },
    line_items: [
      {
        price_data: {
          currency: PLAN_CURRENCY,
          product_data: {
            name: `Verso Air — ${selection.name} (${selection.cycle})`,
            description: `Business directory ${selection.name} tier subscription`,
          },
          unit_amount: selection.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: String(input.userId),
      targetTier: selection.tier,
      billingCycle: selection.cycle,
      type: "subscription_fee",
    },
    success_url: `${input.baseUrl}/pricing?status=success&tier=${selection.tier}`,
    cancel_url: `${input.baseUrl}/pricing?status=cancelled`,
  };
}

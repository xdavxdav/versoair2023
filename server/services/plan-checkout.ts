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

interface PlanCheckoutInput {
  userId: number | string;
  selection: PlanSelection;
  customerId: string;
  baseUrl: string;
}

// The webhook reads the plan from this; recurring checkouts put the same
// metadata on the subscription so every renewal invoice carries it too.
function planMetadata(input: PlanCheckoutInput): Record<string, string> {
  return {
    userId: String(input.userId),
    targetTier: input.selection.tier,
    billingCycle: input.selection.cycle,
    type: "subscription_fee",
  };
}

function planProduct(selection: PlanSelection) {
  return {
    name: `Verso Air — ${selection.name} (${selection.cycle})`,
    description: `Business directory ${selection.name} tier subscription`,
  };
}

function planUrls(input: PlanCheckoutInput) {
  return {
    success_url: `${input.baseUrl}/pricing?status=success&tier=${input.selection.tier}`,
    cancel_url: `${input.baseUrl}/pricing?status=cancelled`,
  };
}

/** One-time prepaid payment: the plan runs for one month or one year. */
export function buildPlanCheckoutParams(
  input: PlanCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
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
          product_data: planProduct(selection),
          unit_amount: selection.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: planMetadata(input),
    ...planUrls(input),
  };
}

/**
 * Automatic renewal: a Stripe subscription charged every month or year. Plan
 * access is granted by the invoice.paid webhook (services/plan-subscriptions),
 * not by checkout.session.completed.
 */
export function buildRecurringPlanCheckoutParams(
  input: PlanCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
  const { selection } = input;
  const metadata = planMetadata(input);
  return {
    payment_method_types: ["card"],
    mode: "subscription",
    customer: input.customerId,
    line_items: [
      {
        price_data: {
          currency: PLAN_CURRENCY,
          product_data: planProduct(selection),
          unit_amount: selection.amountCents,
          recurring: {
            interval: selection.cycle === "annual" ? "year" : "month",
          },
        },
        quantity: 1,
      },
    ],
    metadata,
    subscription_data: { metadata },
    ...planUrls(input),
  };
}

import type { NextFunction, Request, Response } from "express";

export function onlinePaymentsEnabled(): boolean {
  return process.env.ONLINE_PAYMENTS_ENABLED === "true";
}

/**
 * Narrow switch for the marketing cart only. Every other payment surface
 * (wallet, PayPal, music purchases, tips, subscriptions, Issuing) keeps
 * depending on onlinePaymentsEnabled() alone, so this flag never opens them.
 */
export function marketingCheckoutEnabled(): boolean {
  return (
    onlinePaymentsEnabled() ||
    process.env.MARKETING_CHECKOUT_ENABLED === "true"
  );
}

export function commercialSubscriptionsEnabled(): boolean {
  return process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED === "true";
}

export function freeTrialsEnabled(): boolean {
  return process.env.FREE_TRIALS_ENABLED === "true";
}

export function rejectUnavailablePayment(res: Response): void {
  res.status(503).json({
    success: false,
    error:
      "Online payments are not available. Contact the team to confirm current options.",
    code: "ONLINE_PAYMENTS_UNAVAILABLE",
  });
}

export function requireMarketingCheckout(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!marketingCheckoutEnabled()) {
    rejectUnavailablePayment(res);
    return;
  }
  next();
}

export function rejectUnavailableTrial(res: Response): void {
  res.status(503).json({
    success: false,
    error:
      "Free trials are not currently available. Contact the team to confirm plan availability.",
    code: "FREE_TRIAL_UNAVAILABLE",
  });
}

export function rejectUnavailableSubscription(res: Response): void {
  res.status(503).json({
    success: false,
    error:
      "Subscriptions are not available. Contact the team to inquire about a business listing.",
    code: "COMMERCIAL_SUBSCRIPTIONS_UNAVAILABLE",
  });
}

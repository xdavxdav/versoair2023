import type { Response } from "express";

export function onlinePaymentsEnabled(): boolean {
  return process.env.ONLINE_PAYMENTS_ENABLED === "true";
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

export function rejectUnavailableTrial(res: Response): void {
  res.status(503).json({
    success: false,
    error:
      "Free trials are not currently available. Contact the team to confirm plan availability.",
    code: "FREE_TRIAL_UNAVAILABLE",
  });
}

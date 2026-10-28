import { getPublicBaseUrl } from "./base-url";

export type StripeKeyMode = "test" | "live" | "missing" | "unknown";

/** Derived from the key prefix only; nothing after the prefix is ever read out. */
export function getStripeKeyMode(secretKey: string | undefined): StripeKeyMode {
  const key = (secretKey ?? "").trim();
  if (!key) return "missing";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  return "unknown";
}

export interface PaymentsModeStatus {
  keyMode: StripeKeyMode;
  flags: {
    globalPayments: boolean;
    marketingCheckout: boolean;
  };
  webhookSecretConfigured: boolean;
  publicBaseUrl: string;
}

/**
 * Owner-facing readiness snapshot for the first sandbox purchase. It reports
 * which switches are on and what mode the key is in without ever including
 * key or webhook-secret material. Marketing checkout is allowed when either
 * flag is on; every other payment surface follows globalPayments only.
 */
export function getPaymentsModeStatus(
  env: Record<string, string | undefined> = process.env,
): PaymentsModeStatus {
  return {
    keyMode: getStripeKeyMode(env.STRIPE_SECRET_KEY),
    flags: {
      globalPayments: env.ONLINE_PAYMENTS_ENABLED === "true",
      marketingCheckout: env.MARKETING_CHECKOUT_ENABLED === "true",
    },
    webhookSecretConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
    publicBaseUrl: getPublicBaseUrl(env),
  };
}

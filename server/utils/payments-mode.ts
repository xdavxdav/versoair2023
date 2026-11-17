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
    commercialSubscriptions: boolean;
    freeTrials: boolean;
  };
  /** What customers can do right now once the flags are combined. */
  open: {
    marketingCheckout: boolean;
    subscriptionCheckout: boolean;
    freeTrials: boolean;
  };
  webhookSecretConfigured: boolean;
  publicBaseUrl: string;
  /** Problems that stop a payment from working or being confirmed. */
  blockers: string[];
  /** Settings that work but are worth a second look before real customers pay. */
  warnings: string[];
}

/**
 * Owner-facing readiness snapshot for the first purchase. It reports which
 * switches are on, what mode the key is in, and what is misconfigured, without
 * ever including key or webhook-secret material. Marketing checkout is allowed
 * when either flag is on; subscription checkout needs online payments and
 * commercial subscriptions together; every other payment surface follows
 * globalPayments only.
 */
export function getPaymentsModeStatus(
  env: Record<string, string | undefined> = process.env,
): PaymentsModeStatus {
  const flag = (name: string) => env[name] === "true";
  const globalPayments = flag("ONLINE_PAYMENTS_ENABLED");
  const marketingCheckout = flag("MARKETING_CHECKOUT_ENABLED");
  const commercialSubscriptions = flag("COMMERCIAL_SUBSCRIPTIONS_ENABLED");
  const freeTrials = flag("FREE_TRIALS_ENABLED");

  const keyMode = getStripeKeyMode(env.STRIPE_SECRET_KEY);
  const webhookSecretConfigured = Boolean(env.STRIPE_WEBHOOK_SECRET?.trim());
  const publicBaseUrl = getPublicBaseUrl(env);

  const open = {
    marketingCheckout: globalPayments || marketingCheckout,
    subscriptionCheckout: globalPayments && commercialSubscriptions,
    freeTrials: freeTrials && commercialSubscriptions,
  };
  const takesPayments = open.marketingCheckout;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (takesPayments) {
    if (keyMode === "missing") {
      blockers.push("STRIPE_SECRET_KEY is not set, so card checkout will fail.");
    }
    if (keyMode === "unknown") {
      blockers.push(
        "STRIPE_SECRET_KEY is not a Stripe secret key (expected sk_test_… or sk_live_…).",
      );
    }
    if (!webhookSecretConfigured) {
      blockers.push(
        "STRIPE_WEBHOOK_SECRET is not set, so paid orders will never be confirmed.",
      );
    }
    if (keyMode === "test") {
      warnings.push(
        "A test Stripe key is active: real cards are declined and no real money moves.",
      );
    }
    if (keyMode === "live") {
      warnings.push("A live Stripe key is active: customers' cards are charged for real.");
    }
  }

  if (commercialSubscriptions && !globalPayments) {
    blockers.push(
      "COMMERCIAL_SUBSCRIPTIONS_ENABLED is on while ONLINE_PAYMENTS_ENABLED is off: businesses without a paid tier lose logo and cover uploads and cannot upgrade, because subscription checkout stays closed.",
    );
  }
  if (commercialSubscriptions && globalPayments) {
    warnings.push(
      "Commercial subscriptions are on: businesses without a paid tier cannot upload a logo or cover photo.",
    );
  }
  if (freeTrials && !commercialSubscriptions) {
    warnings.push(
      "FREE_TRIALS_ENABLED is on but COMMERCIAL_SUBSCRIPTIONS_ENABLED is off, so free trials stay closed.",
    );
  }
  if (env.NODE_ENV === "production" && !publicBaseUrl.startsWith("https://")) {
    warnings.push(
      `The public base URL (${publicBaseUrl}) is not https, and Stripe return links point at it.`,
    );
  }

  return {
    keyMode,
    flags: {
      globalPayments,
      marketingCheckout,
      commercialSubscriptions,
      freeTrials,
    },
    open,
    webhookSecretConfigured,
    publicBaseUrl,
    blockers,
    warnings,
  };
}

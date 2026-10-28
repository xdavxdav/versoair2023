import Stripe from "stripe";

export interface StripeClientOptions {
  apiVersion?: string;
}

export type StripeClientFactory = (
  options?: StripeClientOptions,
) => Stripe | null;

let factoryOverride: StripeClientFactory | null = null;
const cache = new Map<string, { key: string; client: Stripe }>();

/** Tests inject a stub client here; pass null to restore the real factory. */
export function setStripeClientFactory(
  factory: StripeClientFactory | null,
): void {
  factoryOverride = factory;
}

/**
 * Returns the Stripe client for the configured STRIPE_SECRET_KEY, or null when
 * no key is set. The key is read on every call so configuration changes and
 * test stubs take effect without re-importing route modules.
 */
export function getStripeClient(
  options: StripeClientOptions = {},
): Stripe | null {
  if (factoryOverride) return factoryOverride(options);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const slot = options.apiVersion ?? "default";
  const cached = cache.get(slot);
  if (cached && cached.key === key) return cached.client;

  const client = options.apiVersion
    ? new Stripe(key, { apiVersion: options.apiVersion as any })
    : new Stripe(key);
  cache.set(slot, { key, client });
  return client;
}

const KEY_PATTERN = /\b([rs]k|pk)_(test|live)_[A-Za-z0-9*._-]+/g;
const WEBHOOK_SECRET_PATTERN = /\bwhsec_[A-Za-z0-9*._-]+/g;

/** Strips Stripe key material from text before it is logged or returned. */
export function redactStripeSecrets(text: unknown): string {
  return String(text ?? "")
    .replace(KEY_PATTERN, "$1_$2_[redacted]")
    .replace(WEBHOOK_SECRET_PATTERN, "whsec_[redacted]");
}

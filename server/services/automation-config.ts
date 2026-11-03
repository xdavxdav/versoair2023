import { createHash, timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;

const MIN_CALLBACK_TOKEN_LENGTH = 32;

/** Strict opt-in: anything other than the exact string "true" keeps the legacy path. */
export function isAutomationOutboxEnabled(env: Env = process.env): boolean {
  return env.AUTOMATION_OUTBOX_ENABLED === "true";
}

/**
 * Bearer tokens accepted on the callback endpoints. The previous token stays
 * valid so Zaps can be switched over without downtime during a rotation.
 * Values shorter than 32 characters are ignored, so a weak token can never
 * enable the endpoints.
 */
export function getAutomationCallbackTokens(env: Env = process.env): string[] {
  return [env.AUTOMATION_CALLBACK_TOKEN, env.AUTOMATION_CALLBACK_TOKEN_PREVIOUS]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length >= MIN_CALLBACK_TOKEN_LENGTH);
}

/** Constant-time comparison of SHA-256 digests; every token is checked, with no early exit. */
export function isValidCallbackToken(
  presented: string,
  tokens: readonly string[],
): boolean {
  const presentedDigest = createHash("sha256").update(presented).digest();
  let matched = false;
  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    if (timingSafeEqual(presentedDigest, digest)) matched = true;
  }
  return matched;
}

/**
 * Webhook target for the outbox. Only a well-formed https URL qualifies, so
 * personal data is never queued for a destination we would refuse to call.
 */
export function getZapierWebhookUrl(env: Env = process.env): string | null {
  const raw = env.ZAPIER_WEBHOOK_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

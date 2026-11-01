// A new account has to verify its email before it can sign in, and the verification link
// drops the "where was I going" part. This remembers on this device that someone signing
// up as a business owner wants to send a business for approval, so that after signing in
// they land on that form instead of a generic dashboard.
// Only a timestamp is stored: never the email address, password or any profile data.

import { getContractorResumePath } from "./contractor-draft";

export const BUSINESS_REQUEST_PATH = "/apply/business";

const STORAGE_KEY = "versoair:business-intent";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

type IntentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): IntentStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveBusinessIntent(
  storage: IntentStorage | null = defaultStorage(),
  now: number = Date.now(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: now }));
  } catch {
    // Storage full or blocked: the person just lands on their dashboard instead.
  }
}

export function clearBusinessIntent(
  storage: IntentStorage | null = defaultStorage(),
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

function hasBusinessIntent(storage: IntentStorage | null, now: number): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { savedAt?: unknown } | null;
    const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : 0;
    const age = now - savedAt;
    if (!savedAt || age > MAX_AGE_MS || age < -60_000) {
      clearBusinessIntent(storage);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** The request form, when this device has a fresh business sign-up waiting; otherwise null. */
export function getBusinessResumePath(
  storage: IntentStorage | null = defaultStorage(),
  now: number = Date.now(),
): string | null {
  return hasBusinessIntent(storage, now) ? BUSINESS_REQUEST_PATH : null;
}

/**
 * Where to send someone who just finished signing in, or null when there is nothing to
 * resume. An unfinished contractor application comes first because it carries typed data.
 */
export function getSignupResumePath(
  storage: IntentStorage | null = defaultStorage(),
  now: number = Date.now(),
): string | null {
  return getContractorResumePath(storage, now) ?? getBusinessResumePath(storage, now);
}

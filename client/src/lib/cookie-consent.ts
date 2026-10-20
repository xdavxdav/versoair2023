export const COOKIE_CONSENT_CHANGE_EVENT = "verso-cookie-consent-change";
export const COOKIE_CONSENT_STORAGE_KEY = "cookieConsent";

export type CookieConsent = "accepted" | "declined";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const consent = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return consent === "accepted" || consent === "declined" ? consent : null;
  } catch (error) {
    console.error("[Cookie consent] Could not read saved preference:", error);
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === "accepted";
}

export function saveCookieConsent(consent: CookieConsent): void {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, consent);
  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}

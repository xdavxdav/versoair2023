/**
 * Google Tag Manager Event Tracking Utility
 * Sends events to GTM and backend for tracking
 */

import { authenticatedFetch } from "./auth";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let sessionId: string = "";
let userId: string | null = null;

/**
 * Initialize GTM tracking session
 */
export function initializeGTMSession() {
  // Generate or retrieve session ID
  sessionId =
    sessionStorage.getItem("gtm_session_id") ||
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem("gtm_session_id", sessionId);

  // Get user ID from localStorage if authenticated
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.userId || payload.sub;
    } catch (e) {
      // Token parsing failed, continue without user ID
    }
  }

  console.log("[GTM] Session initialized:", sessionId);
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  eventCategory: string,
  eventLabel?: string,
  eventValue?: number,
  customData?: Record<string, any>,
) {
  // Ensure session is initialized
  if (!sessionId) {
    initializeGTMSession();
  }

  // Send to Google Analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      event_category: eventCategory,
      event_label: eventLabel,
      value: eventValue,
      session_id: sessionId,
      user_id: userId,
      ...customData,
    });
  }

  // Send to backend for logging
  logEventToBackend({
    eventName,
    eventCategory,
    eventLabel,
    eventValue,
    sessionId,
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    deviceType: getDeviceType(),
    country: getCountryFromIP(),
    customData,
  });

  console.log(`[GTM] Event tracked: ${eventName} (${eventCategory})`);
}

/**
 * Track page view
 */
export function trackPageView(pagePath?: string) {
  const path =
    pagePath || (typeof window !== "undefined" ? window.location.pathname : "");

  trackEvent("page_view", "navigation", path, undefined, {
    page_path: path,
    page_title: typeof document !== "undefined" ? document.title : "",
  });
}

/**
 * Track search action
 */
export function trackSearch(searchQuery: string, resultCount?: number) {
  trackEvent("search", "engagement", searchQuery, resultCount, {
    search_term: searchQuery,
    result_count: resultCount,
  });
}

/**
 * Track business click
 */
export function trackBusinessClick(businessId: number, businessName: string) {
  trackEvent("business_click", "engagement", businessName, businessId, {
    business_id: businessId,
    business_name: businessName,
  });
}

/**
 * Track filter application
 */
export function trackFilterApplied(filterType: string, filterValue: string) {
  trackEvent("filter_applied", "engagement", filterType, undefined, {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

/**
 * Track call button click
 */
export function trackCallButtonClick(businessId: number, phoneNumber: string) {
  trackEvent("call_button_click", "engagement", phoneNumber, businessId, {
    business_id: businessId,
    phone_number: phoneNumber,
  });
}

/**
 * Track form submission
 */
export function trackFormSubmission(formName: string, success: boolean) {
  trackEvent(
    success ? "form_submission" : "form_error",
    "conversion",
    formName,
    success ? 1 : 0,
    {
      form_name: formName,
      success,
    },
  );
}

/**
 * Track reservation/booking
 */
export function trackReservation(
  reservationType: string,
  amount?: number,
  currency: string = "USD",
) {
  trackEvent("reservation_made", "conversion", reservationType, amount, {
    reservation_type: reservationType,
    transaction_id: `txn_${Date.now()}`,
    value: amount,
    currency,
  });
}

/**
 * Track job application
 */
export function trackJobApplication(jobId: number, jobTitle: string) {
  trackEvent("job_application", "conversion", jobTitle, jobId, {
    job_id: jobId,
    job_title: jobTitle,
  });
}

/**
 * Track favorite/like action
 */
export function trackAddToFavorites(businessId: number, businessName: string) {
  trackEvent("add_to_favorites", "engagement", businessName, businessId, {
    business_id: businessId,
    business_name: businessName,
  });
}

/**
 * Log event to backend
 */
function logEventToBackend(eventData: any) {
  const apiUrl = "";

  authenticatedFetch(`${apiUrl}/api/v1/admin/gtm-events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventData),
  }).catch((err) => {
    console.error("[GTM] Failed to log event to backend:", err);
  });
}

/**
 * Detect device type
 */
function getDeviceType(): string {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;

  if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
    return /iPad/.test(ua) ? "tablet" : "mobile";
  }

  return "desktop";
}

/**
 * Get country from IP (placeholder - would need API integration)
 */
function getCountryFromIP(): string | undefined {
  // This would require an IP geolocation API
  // For now, we'll let it be undefined and fetch from backend if needed
  return undefined;
}

/**
 * Set user ID (call after user authenticates)
 */
export function setUserId(newUserId: string | null) {
  userId = newUserId;

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("set", { user_id: newUserId });
  }
}

/**
 * Get current session ID
 */
export function getSessionId(): string {
  if (!sessionId) {
    initializeGTMSession();
  }
  return sessionId;
}

// Initialize on module load
if (typeof window !== "undefined") {
  initializeGTMSession();
}

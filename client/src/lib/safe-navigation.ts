const AUTH_PATH_PREFIX = "/auth/";

export function getSafeReturnPath(fallback = "/stream"): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }

  try {
    const referrer = document.referrer
      ? new URL(document.referrer, window.location.origin)
      : null;

    if (
      referrer &&
      referrer.origin === window.location.origin &&
      !referrer.pathname.startsWith(AUTH_PATH_PREFIX) &&
      referrer.pathname !== window.location.pathname
    ) {
      return `${referrer.pathname}${referrer.search}${referrer.hash}`;
    }
  } catch {
    // Use the public fallback when the browser referrer is unavailable.
  }

  return fallback;
}

export function navigateBackSafely(
  navigate: (path: string) => void,
  fallback = "/stream",
): void {
  navigate(getSafeReturnPath(fallback));
}

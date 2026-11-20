type Navigate = (path: string) => void;

// The Navigation API only lists entries from this site, so it never treats
// another site as "the previous page". Other browsers fall back to history length.
export function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  const navigation: { canGoBack?: unknown } | undefined = Reflect.get(
    window,
    "navigation",
  );
  if (typeof navigation?.canGoBack === "boolean") return navigation.canGoBack;
  return window.history.length > 1;
}

// document.referrer is frozen at page load, so it cannot describe an in-app
// navigation. Use the real history stack and only use the fallback when it is empty.
export function navigateBackSafely(navigate: Navigate, fallback = "/"): void {
  if (canGoBackInApp()) {
    window.history.back();
    return;
  }
  navigate(fallback);
}

export interface BackClickEvent {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault(): void;
}

// Plain clicks go back. Modified clicks keep the browser default, which opens
// the link's fallback href in a new tab or window.
export function handleBackClick(
  event: BackClickEvent,
  navigate: Navigate,
  fallback = "/",
): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigateBackSafely(navigate, fallback);
}

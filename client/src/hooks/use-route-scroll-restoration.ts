import { useLayoutEffect, useRef } from "react";

const SCROLL_KEY = "__versoAirScrollEntry";
const SCROLL_Y_KEY = "__versoAirScrollY";
const scrollPositions = new Map<string, number>();

function isHistoryState(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createEntryKey(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setHistoryEntry(key: string, scrollY: number) {
  const state = isHistoryState(window.history.state)
    ? window.history.state
    : {};
  window.history.replaceState(
    { ...state, [SCROLL_KEY]: key, [SCROLL_Y_KEY]: scrollY },
    "",
    window.location.href,
  );
}

function currentEntryKey(): string | null {
  const state = window.history.state;
  return isHistoryState(state) && typeof state[SCROLL_KEY] === "string"
    ? state[SCROLL_KEY]
    : null;
}

export function useRouteScrollRestoration(location: string) {
  const initialized = useRef(false);
  const previousLocation = useRef(location);
  const entryKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    let restoreTimer: number | null = null;
    let restoreCleanup: (() => void) | null = null;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const savePosition = () => {
      if (!entryKey.current || currentEntryKey() !== entryKey.current) return;
      const scrollY = window.scrollY;
      scrollPositions.set(entryKey.current, scrollY);
      if (persistTimer !== null) return;
      persistTimer = window.setTimeout(persistPosition, 100);
    };

    let persistTimer: number | null = null;
    const persistPosition = () => {
      persistTimer = null;
      const key = entryKey.current;
      if (!key || currentEntryKey() !== key) return;
      const scrollY = window.scrollY;
      scrollPositions.set(key, scrollY);
      setHistoryEntry(key, scrollY);
    };

    const flushPosition = () => {
      if (persistTimer !== null) {
        window.clearTimeout(persistTimer);
        persistTimer = null;
      }
      persistPosition();
    };

    const originalPushState = window.history.pushState;
    const trackedPushState: History["pushState"] = function (
      this: History,
      data,
      unused,
      url,
    ) {
      flushPosition();
      return originalPushState.call(this, data, unused, url);
    };
    window.history.pushState = trackedPushState;

    window.addEventListener("scroll", savePosition, { passive: true });
    window.addEventListener("pagehide", flushPosition);

    const stateKey = currentEntryKey();
    if (!initialized.current) {
      entryKey.current = stateKey ?? createEntryKey();
      setHistoryEntry(entryKey.current, 0);
      initialized.current = true;
      previousLocation.current = location;
      window.scrollTo(0, 0);
    } else if (location !== previousLocation.current) {
      if (entryKey.current) {
        const scrollY = window.scrollY;
        if (currentEntryKey() === entryKey.current) {
          scrollPositions.set(entryKey.current, scrollY);
          setHistoryEntry(entryKey.current, scrollY);
        }
      }

      if (stateKey && stateKey !== entryKey.current) {
        entryKey.current = stateKey;
        const state = window.history.state;
        const storedY =
          isHistoryState(state) && typeof state[SCROLL_Y_KEY] === "number"
            ? state[SCROLL_Y_KEY]
            : scrollPositions.get(entryKey.current) ?? 0;
        const targetY = storedY;
        let attempts = 0;
        let stableAttempts = 0;
        let previousHeight = -1;
        const cancelRestore = () => {
          if (restoreTimer !== null) window.clearTimeout(restoreTimer);
          restoreTimer = null;
          window.removeEventListener("wheel", cancelRestore);
          window.removeEventListener("touchstart", cancelRestore);
          window.removeEventListener("pointerdown", cancelRestore);
          window.removeEventListener("keydown", cancelRestore);
          restoreCleanup = null;
        };
        restoreCleanup = cancelRestore;
        const restoreWhenContentIsReady = () => {
          const height = document.documentElement.scrollHeight;
          if (Math.abs(window.scrollY - targetY) > 1) {
            window.scrollTo(0, targetY);
            stableAttempts = 0;
          } else if (height === previousHeight) {
            stableAttempts += 1;
          } else {
            stableAttempts = 0;
          }
          previousHeight = height;
          if (stableAttempts >= 5 || attempts >= 40) {
            cancelRestore();
            return;
          }
          attempts += 1;
          restoreTimer = window.setTimeout(restoreWhenContentIsReady, 50);
        };
        window.addEventListener("wheel", cancelRestore, { passive: true });
        window.addEventListener("touchstart", cancelRestore, { passive: true });
        window.addEventListener("pointerdown", cancelRestore, { passive: true });
        window.addEventListener("keydown", cancelRestore);
        restoreWhenContentIsReady();
      } else {
        entryKey.current = createEntryKey();
        setHistoryEntry(entryKey.current, 0);
        window.scrollTo(0, 0);
      }

      previousLocation.current = location;
    }

    return () => {
      window.removeEventListener("scroll", savePosition);
      window.removeEventListener("pagehide", flushPosition);
      if (window.history.pushState === trackedPushState) {
        window.history.pushState = originalPushState;
      }
      if (persistTimer !== null) window.clearTimeout(persistTimer);
      restoreCleanup?.();
    };
  }, [location]);
}

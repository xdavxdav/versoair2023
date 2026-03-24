import { useEffect, useRef } from "react";

/**
 * Re-triggers Google Translate after React renders new content.
 *
 * GT translates the DOM on init but MISSES React content that renders later
 * (after auth gates, loading spinners, route transitions, tab switches).
 * This hook fires the GT combo's change event to force a re-translation
 * pass over untranslated DOM nodes.
 *
 * SAFE: Only fires the combo's own change event — identical to what GT does
 * internally. Does NOT modify LanguageSwitcher, cookies, or GT config.
 *
 * @param deps - Dependency array. Re-triggers when deps change (e.g. loading state).
 */
export function useGTRetranslate(deps: any[] = []) {
  const lastTrigger = useRef(0);

  useEffect(() => {
    // Debounce: don't re-trigger more than once per 2s
    const now = Date.now();
    if (now - lastTrigger.current < 2000) return;

    const timer = setTimeout(() => {
      retriggerGT();
      lastTrigger.current = Date.now();
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Fires the GT combo change event to force re-translation of new DOM nodes.
 * Exported for use in global mutation observer.
 */
export function retriggerGT() {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo || combo.options.length <= 1) return;
  // Only re-fire if GT has an active translation (not on base language)
  if (combo.value && combo.selectedIndex > 0) {
    combo.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

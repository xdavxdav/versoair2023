/**
 * LanguageEngine — headless Google Translate controller.
 *
 * STRATEGY: Cookie + combo.
 *   1. First load: set `googtrans` cookie BEFORE GT script loads.
 *      GT reads the cookie on init → auto-translates.
 *   2. Runtime switch: set cookie + manipulate GT's hidden <select>
 *      combo (.goog-te-combo) → instant translation, no reload.
 *   3. Fallback: if combo not found, cookie + page reload.
 *
 * CRITICAL CSS: GT elements are positioned off-screen (not display:none)
 * so iframes/selects remain functional while invisible.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { transliterate } from "transliteration";
import { useCountry } from "@/contexts/CountryContext";
import { getLanguageForCountry, isBaseLang } from "@/utils/country-language";

const LANG_CACHE_KEY = "fsa_selected_language";
const LANG_OVERRIDE_KEY = "fsa_language_override"; // true when user manually picked a language
const ROMANIZATION_KEY = "romanization_enabled";

/** Languages that use non-Latin scripts — romanization toggle is shown for these */
export const NON_LATIN_LANGS = new Set([
  "ja", "zh-CN", "zh-TW", "ko", "ar", "he", "hi", "bn", "th", "my",
  "km", "lo", "ka", "hy", "am", "ne", "si", "fa", "ru", "uk", "bg",
  "sr", "mn", "el",
]);

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

interface LanguageContextType {
  currentLang: string;
  selectLanguage: (lang: string, source?: "country" | "manual") => void;
  autoDetectedLang: string;
  showBanner: boolean;
  bannerMessage: string;
  previousLang: string;
  dismissBanner: () => void;
  reloadCountdown: number | null;
  romanized: boolean;
  toggleRomanization: () => void;
  isNonLatinLang: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLang: "fr",
  selectLanguage: () => {},
  autoDetectedLang: "fr",
  showBanner: false,
  bannerMessage: "",
  previousLang: "fr",
  dismissBanner: () => {},
  reloadCountdown: null,
  romanized: false,
  toggleRomanization: () => {},
  isNonLatinLang: false,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

// ── Cookie helpers ──

function setGoogTransCookie(lang: string) {
  if (!lang || lang === "fr") {
    clearGoogTransCookies();
    return;
  }
  const val = `/fr/${lang}`;
  const host = window.location.hostname;
  document.cookie = `googtrans=${val}; path=/;`;
  document.cookie = `googtrans=${val}; path=/; domain=${host};`;
  if (host !== "localhost") {
    document.cookie = `googtrans=${val}; path=/; domain=.${host};`;
  }
}

function clearGoogTransCookies() {
  const exp = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  const host = window.location.hostname;
  document.cookie = `googtrans=; ${exp}; path=/;`;
  document.cookie = `googtrans=; ${exp}; path=/; domain=${host};`;
  document.cookie = `googtrans=; ${exp}; path=/; domain=.${host};`;
}

// ── GT lifecycle ──

const GT_LANGUAGES =
  "fr,en,es,pt,de,ar,zh-CN,zh-TW,ja,ko,ru,tr,it,nl,pl,sv,no,da,fi,cs,ro,hu,el,he,th,vi,id,uk,hi,bn,fa,sw,am,hr,sr,bg,sk,sl,et,lv,lt,my,km,lo,ka,hy,az,uz,tk,mn,ne,si";

/** Create the GT TranslateElement ONCE. GT reads the cookie on init.
 *  NEVER call this more than once — GT's constructor corrupts on re-entry. */
function initGT() {
  try {
    if (!window.google?.translate?.TranslateElement) return;
    const el = document.getElementById("google_translate_element");
    if (el) el.innerHTML = "";
    document.body.style.top = "0px";

    new window.google.translate.TranslateElement(
      {
        pageLanguage: "fr",
        includedLanguages: GT_LANGUAGES,
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element",
    );

    // Reset body.top that GT pushes down for its banner
    setTimeout(() => {
      document.body.style.top = "0px";
    }, 500);
  } catch (e) {
    console.warn("[LanguageEngine] GT init error:", e);
  }
}

function loadGTScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById("gt-script")) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = "gt-script";
    s.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

/**
 * Switch GT language at runtime using the hidden <select> combo.
 * Returns true if the combo switch succeeded.
 */
function switchLanguageViaCombo(lang: string): boolean {
  const combo =
    document.querySelector<HTMLSelectElement>(".goog-te-combo") ||
    document.querySelector<HTMLSelectElement>(".skiptranslate select");
  if (!combo) return false;
  // Make sure the combo has options loaded
  if (combo.options.length <= 1) return false;
  if (lang === "fr") {
    // First option is "Select Language" — restores original text
    combo.selectedIndex = 0;
  } else {
    combo.value = lang;
    // Verify the value actually took (option exists)
    if (combo.value !== lang) return false;
  }
  // bubbles:true is CRITICAL — GT listens on a parent element
  combo.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/**
 * Switch language: set cookie (survives reloads) + try combo (instant).
 * Returns true if combo worked, false if caller should reload.
 */
function switchLanguage(lang: string): boolean {
  if (lang === "fr") {
    clearGoogTransCookies();
  } else {
    setGoogTransCookie(lang);
  }
  return switchLanguageViaCombo(lang);
}

// ── Provider ──

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { selectedCountry, detecting } = useCountry();

  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      return localStorage.getItem(LANG_CACHE_KEY) || "fr";
    } catch {
      return "fr";
    }
  });
  const [previousLang, setPreviousLang] = useState("fr");
  const [autoDetectedLang, setAutoDetectedLang] = useState("fr");
  const [isManualOverride, setIsManualOverride] = useState(() => {
    try {
      return localStorage.getItem(LANG_OVERRIDE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstCountryDone = useRef(false);
  const gtLoaded = useRef(false);
  const [reloadCountdown, setReloadCountdown] = useState<number | null>(null);
  const isInitialLoad = useRef(true);

  // ── Romanization state ──
  const [romanized, setRomanized] = useState(() => {
    try {
      return localStorage.getItem(ROMANIZATION_KEY) === "true";
    } catch {
      return false;
    }
  });
  const isNonLatinLang = NON_LATIN_LANGS.has(currentLang);

  const toggleRomanization = useCallback(() => {
    setRomanized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ROMANIZATION_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  /** Show banner, then start a 3-2-1 countdown and reload.
   *  Pass reload=false to skip the reload (e.g. initial page load where cookie is already set). */
  const flashBanner = useCallback((msg: string, reload = true) => {
    // Clear any previous timers
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setReloadCountdown(null);
    setBannerMessage(msg);
    setShowBanner(true);

    if (!reload) {
      // No reload needed — just dismiss after 5s
      bannerTimerRef.current = setTimeout(() => setShowBanner(false), 5000);
      return;
    }

    // Show the message for 1s, then start 3-2-1 countdown
    bannerTimerRef.current = setTimeout(() => {
      let count = 3;
      setReloadCountdown(count);
      countdownRef.current = setInterval(() => {
        count--;
        if (count <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          window.location.reload();
        } else {
          setReloadCountdown(count);
        }
      }, 1000);
    }, 1000);
  }, []);

  // ── STEP 1: Pre-set cookie from cache, load GT only when cookie is ready ──
  useEffect(() => {
    // Define the callback GT will invoke once loaded
    window.googleTranslateElementInit = () => {
      gtLoaded.current = true;
      initGT();
    };

    const cached = localStorage.getItem(LANG_CACHE_KEY);
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    if (cached && cached !== "fr" && cached !== "auto") {
      // Returning visitor — set cookie THEN load GT.
      // GT reads the cookie on init → auto-translates immediately.
      setGoogTransCookie(cached);
      loadGTScript();
    } else {
      // First visit (no cache). Do NOT load GT yet — country detection
      // hasn't fired, so there's no cookie. Loading GT now would make it
      // initialise in French with no way to switch.
      // STEP 2 will set the cookie then load GT.
      // Safety: if detection takes >5s (network issues), load GT anyway
      // so the page isn't stuck without GT forever.
      safetyTimer = setTimeout(() => {
        if (!gtLoaded.current) loadGTScript();
      }, 5000);
    }

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      delete (window as any).googleTranslateElementInit;
    };
  }, []);

  // ── STEP 2: React to country detection ──
  useEffect(() => {
    if (detecting || !selectedCountry) return;

    const lang = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(lang);

    // First detection: honour cached language (returning visitor)
    if (!firstCountryDone.current) {
      firstCountryDone.current = true;
      const cached = localStorage.getItem(LANG_CACHE_KEY);
      if (cached && cached !== "auto" && cached !== "fr") {
        // Returning visitor — STEP 1 already set cookie + loaded GT.
        // GT auto-translates from cookie. Nothing more to do.
        return;
      }
    }

    // If user manually chose a language (Language tab), respect it —
    // don't override their choice when country changes or is re-detected.
    if (isManualOverride) return;

    // Guard: skip if selectLanguage from CountryDropdown already handled this
    if (currentLang === lang) return;

    // Apply language to React state + localStorage
    setCurrentLang(lang);
    localStorage.setItem(LANG_CACHE_KEY, lang);

    // Base language (French) — no GT translation needed
    if (isBaseLang(lang)) {
      clearGoogTransCookies();
      if (gtLoaded.current) {
        // Undo any active translation
        switchLanguageViaCombo(lang);
      } else {
        // Load GT anyway (needed for future manual switches)
        loadGTScript();
      }
      return;
    }

    // Non-base language — set cookie, then get GT to translate
    setGoogTransCookie(lang);

    if (!gtLoaded.current) {
      // First visit: GT was deferred in STEP 1 (no cache).
      // Cookie is now set → load GT → GT reads cookie → translates.
      // This is the guaranteed path — no race condition.
      loadGTScript();
    } else {
      // GT already loaded (user changed country after initial load).
      // Try combo for instant switch; if not ready yet, observe DOM until it is.
      const ok = switchLanguageViaCombo(lang);
      if (!ok) {
        // Combo not ready yet — observe with retries (up to 2s) before reloading
        let retries = 0;
        const maxRetries = 8;
        const retryInterval = setInterval(() => {
          retries++;
          const retryOk = switchLanguageViaCombo(lang);
          if (retryOk) {
            clearInterval(retryInterval);
            flashBanner(
              `Auto-translated to ${lang.toUpperCase()} based on your location`,
              false,
            );
          } else if (retries >= maxRetries) {
            clearInterval(retryInterval);
            // Cookie is already set — reload as last resort
            flashBanner(`Translating to ${lang.toUpperCase()}…`, true);
          }
        }, 250);
        return;
      }
    }

    flashBanner(
      `Auto-translated to ${lang.toUpperCase()} based on your location`,
      false,
    );
  }, [selectedCountry, detecting, flashBanner, isManualOverride]);

  // ── Manual language switch (from dropdown) ──
  const selectLanguage = useCallback(
    (lang: string, source: "country" | "manual" = "manual") => {
      const prev = currentLang;

      // ── Same language? No reload needed ──
      // e.g. Belgium (fr) → Congo (fr) — just update state, skip reload
      if (lang === prev) {
        // Still flash a quick confirmation (no reload)
        if (source === "country") {
          flashBanner(
            `Country updated — already in ${lang.toUpperCase()}`,
            false,
          );
        }
        return;
      }

      setPreviousLang(prev);
      setCurrentLang(lang);
      localStorage.setItem(LANG_CACHE_KEY, lang);

      // Track manual override: if user explicitly picked a language,
      // country changes should NOT reset it. Country-triggered changes
      // clear the override so auto-detection works normally.
      if (source === "manual") {
        setIsManualOverride(true);
        localStorage.setItem(LANG_OVERRIDE_KEY, "true");
      } else {
        setIsManualOverride(false);
        localStorage.removeItem(LANG_OVERRIDE_KEY);
      }

      // Set cookie + try combo for instant switch
      const switched = switchLanguage(lang);

      const msg =
        source === "country"
          ? lang === "fr"
            ? "Switched to Français (site base language)"
            : `Language switched to ${lang.toUpperCase()} for this country`
          : lang === "fr"
            ? "Language restored to Français"
            : `Language overridden to ${lang.toUpperCase()}`;

      if (switched) {
        // Combo worked instantly — no reload needed
        flashBanner(msg, false);
      } else {
        // Combo not ready — retry up to 8x over 2s, then reload as last resort
        let retries = 0;
        const retryInterval = setInterval(() => {
          retries++;
          const ok = switchLanguageViaCombo(lang);
          if (ok) {
            clearInterval(retryInterval);
            flashBanner(msg, false);
          } else if (retries >= 8) {
            clearInterval(retryInterval);
            flashBanner(msg, true); // cookie already set, reload will apply it
          }
        }, 250);
      }
    },
    [currentLang, flashBanner],
  );

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    setReloadCountdown(null);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  // ── Clean up GT visual junk periodically ──
  useEffect(() => {
    const cleanup = () => {
      document.body.style.top = "0px";
      // Hide GT banner bars that sneak in (clip, never display:none)
      document
        .querySelectorAll(".goog-te-banner-frame, #goog-gt-tt")
        .forEach((el) => {
          const e = el as HTMLElement;
          e.style.clipPath = "inset(100%)";
          e.style.overflow = "hidden";
          e.style.position = "fixed";
          e.style.width = "1px";
          e.style.height = "1px";
        });
    };
    // Run cleanup after GT has time to inject its UI
    const t1 = setTimeout(cleanup, 2000);
    const t2 = setTimeout(cleanup, 5000);
    const t3 = setTimeout(cleanup, 10000);
    // Watch only the GT container for re-injected banners (NOT document.body
    // which fires on every Framer/React DOM change and tanks scroll perf)
    const observer = new MutationObserver(cleanup);
    let reScopeTimer: ReturnType<typeof setTimeout> | null = null;
    const gtRoot = document.getElementById("google_translate_element");
    if (gtRoot) {
      observer.observe(gtRoot, { childList: true, subtree: true });
    } else {
      // GT container not mounted yet — watch body briefly, then re-scope
      observer.observe(document.body, { childList: true });
      reScopeTimer = setTimeout(() => {
        observer.disconnect();
        const el = document.getElementById("google_translate_element");
        if (el) observer.observe(el, { childList: true, subtree: true });
      }, 3000);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (reScopeTimer) clearTimeout(reScopeTimer);
      observer.disconnect();
    };
  }, []);

  // ── Global retranslation for late-rendered content ──
  // React pages render content AFTER GT's initial pass (loading spinners, auth gates,
  // tab switches, lazy routes). This observer detects when significant new content
  // appears in <main> / app root and re-fires GT's combo change event.
  useEffect(() => {
    // Only needed when a non-French language is active
    if (!currentLang || currentLang === "fr") return;

    let lastRetrigger = 0;
    const DEBOUNCE_MS = 2000; // Don't re-fire more than once per 2s
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const retrigger = () => {
      const now = Date.now();
      if (now - lastRetrigger < DEBOUNCE_MS) return;
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (!combo || combo.options.length <= 1 || combo.selectedIndex <= 0)
        return;
      lastRetrigger = now;
      combo.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const scheduleRetrigger = () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      // Wait 500ms for React to finish its render batch
      pendingTimer = setTimeout(retrigger, 500);
    };

    // Watch the #root container for childList changes (React mounting/unmounting pages)
    const root = document.getElementById("root");
    if (!root) return;

    const mo = new MutationObserver((mutations) => {
      // Only retrigger if we see actual content additions (not GT's own <font> wrappers)
      let addedTextLength = 0;
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes)) {
          if (n.nodeType === 3) {
            // text node — count length
            addedTextLength += n.textContent?.length ?? 0;
          } else if (n.nodeType === 1) {
            const el = n as HTMLElement;
            // Skip GT-injected elements
            if (
              el.classList?.contains("skiptranslate") ||
              el.tagName === "FONT" ||
              el.tagName === "STYLE" ||
              el.id === "goog-gt-tt" ||
              el.closest?.(".skiptranslate")
            )
              continue;
            // Real content — count inner text
            addedTextLength += el.textContent?.length ?? 0;
          }
        }
        if (addedTextLength > 50) break; // Enough — schedule retrigger
      }
      // Only retrigger if meaningful text was added (>50 chars = real page content)
      if (addedTextLength > 50) {
        scheduleRetrigger();
      }
    });

    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      if (pendingTimer) clearTimeout(pendingTimer);
    };
  }, [currentLang]);

  // ── Romanization: annotate GT-translated <font> wrappers with Latin text ──
  useEffect(() => {
    if (!romanized || !isNonLatinLang) {
      // Remove any existing annotations
      document.querySelectorAll(".roman-hint").forEach((el) => el.remove());
      return;
    }

    const processedNodes = new WeakSet<Node>();

    const annotate = () => {
      // GT wraps translated text in <font> tags with style attribute
      const fonts = document.querySelectorAll("font[style]");
      fonts.forEach((font) => {
        if (processedNodes.has(font)) return;
        // Skip GT UI elements
        if (font.closest(".skiptranslate, .goog-te-gadget, #goog-gt-tt")) return;
        const text = font.textContent?.trim();
        if (!text || text.length < 2) return;

        // Check if text actually contains non-Latin characters
        const hasNonLatin = /[^\u0000-\u024F\u1E00-\u1EFF\s\d.,;:!?'"()\-–—/\\@#$%&*+=<>[\]{}|~`^]/.test(text);
        if (!hasNonLatin) return;

        processedNodes.add(font);
        try {
          const latin = transliterate(text);
          // Only add hint if transliteration produced different text
          if (latin && latin !== text && latin.length > 1) {
            const hint = document.createElement("span");
            hint.className = "roman-hint notranslate";
            hint.setAttribute("translate", "no");
            hint.style.cssText =
              "display:block;font-size:0.7em;color:#888;font-style:italic;line-height:1.2;margin-top:1px;pointer-events:none;";
            hint.textContent = latin;
            font.parentNode?.insertBefore(hint, font.nextSibling);
          }
        } catch {
          // transliteration failed for this text — skip silently
        }
      });
    };

    // Initial pass
    annotate();

    // Observe DOM for GT translations (debounced 100ms)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(annotate, 100);
    });

    const root = document.getElementById("root");
    if (root) {
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      // Clean up annotations
      document.querySelectorAll(".roman-hint").forEach((el) => el.remove());
    };
  }, [romanized, isNonLatinLang]);

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        selectLanguage,
        autoDetectedLang,
        showBanner,
        bannerMessage,
        previousLang,
        dismissBanner,
        reloadCountdown,
        romanized,
        toggleRomanization,
        isNonLatinLang,
      }}
    >
      {/* GT mounts its widget here. Near-viewport, not clipped.
          GT creates its <select> combo inside this div.
          NEVER use display:none, clip-path, or overflow:hidden. */}
      <div
        id="google_translate_element"
        className="notranslate"
        style={{
          position: "fixed",
          top: -200,
          left: 0,
          opacity: 0,
          overflow: "visible",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {children}

      <style>{`
        /* ══════════════════════════════════════════════════════
           GT CSS: NEVER use display:none on ANY GT element.
           GT checks element visibility internally — display:none
           kills iframes, communication channels, and the entire
           translation engine silently.

           SAFE hiding strategy:
             clip-path: inset(100%)  → painted but invisible
             overflow: hidden        → clips children
             position: fixed         → out of flow
             pointer-events: none    → non-interactive
           ══════════════════════════════════════════════════════ */

        /* GT top banner ("Translated from French") */
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 1px !important;
          height: 1px !important;
          clip-path: inset(100%) !important;
          overflow: hidden !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }

        /* GT hover tooltips / popups */
        .goog-te-balloon-frame,
        #goog-gt-tt,
        .goog-tooltip,
        .goog-text-highlight,
        #goog-gt-vt {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 1px !important;
          height: 1px !important;
          clip-path: inset(100%) !important;
          overflow: hidden !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }

        /* GT functional elements — MUST stay rendered and able
           to load iframe content. Use near-viewport positioning
           with overflow:visible so GT's inter-frame communication
           works. These are NOT visual — they're the engine. */
        .goog-te-ftab-frame,
        .goog-te-spinner-pos,
        .goog-te-menu-frame,
        .VIpgJd-yAWNEb-L7lbkb,
        #gt-nvframe,
        iframe[id="gt-nvframe"],
        .VIpgJd-ZVi9od-ORHb-OEVmcd,
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
        .VIpgJd-ZVi9od-aZ2wEe-OiiCO {
          position: fixed !important;
          top: -100px !important;
          left: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
          overflow: visible !important;
        }

        /* GT toolbar container (direct child of body).
           Contains the <select> combo and internal iframes.
           Do NOT use clip-path or overflow:hidden here —
           GT's iframes inside need to load and communicate.
           Keep it near-viewport so browsers don't throttle. */
        body > .skiptranslate {
          position: fixed !important;
          top: -100px !important;
          left: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
          overflow: visible !important;
        }

        /* Prevent GT from pushing body down */
        body {
          top: 0 !important;
        }

        /* GT gadget text inside widget container */
        .goog-te-gadget {
          font-size: 0 !important;
          color: transparent !important;
        }
        .goog-te-gadget > span,
        .goog-te-gadget > div,
        .goog-te-gadget img {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          clip-path: inset(100%) !important;
          overflow: hidden !important;
        }
      `}</style>
    </LanguageContext.Provider>
  );
}

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
import { useCountry } from "@/contexts/CountryContext";
import { getLanguageForCountry, isBaseLang } from "@/utils/country-language";

const LANG_CACHE_KEY = "fsa_selected_language";

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

    // Give GT a moment to fully create its infrastructure, then hide chrome
    setTimeout(() => {
      document
        .querySelectorAll(".goog-te-banner-frame, #goog-gt-tt")
        .forEach((n) => {
          (n as HTMLElement).style.display = "none";
        });
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
  if (lang === "fr") {
    // First option is "Select Language" — restores original text
    combo.selectedIndex = 0;
  } else {
    combo.value = lang;
  }
  combo.dispatchEvent(new Event("change"));
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
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstCountryDone = useRef(false);
  const gtLoaded = useRef(false);
  const [reloadCountdown, setReloadCountdown] = useState<number | null>(null);
  const isInitialLoad = useRef(true);

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

  // ── STEP 1: Pre-set cookie from cache, then load GT ──
  useEffect(() => {
    // Set cookie BEFORE GT loads so it auto-translates on init
    const cached = localStorage.getItem(LANG_CACHE_KEY);
    if (cached && cached !== "fr" && cached !== "auto") {
      setGoogTransCookie(cached);
    }

    // Define the callback GT will invoke once loaded
    window.googleTranslateElementInit = () => {
      gtLoaded.current = true;
      isInitialLoad.current = false;
      initGT();
    };

    loadGTScript();

    return () => {
      delete (window as any).googleTranslateElementInit;
    };
  }, []);

  // ── STEP 2: React to country detection ──
  useEffect(() => {
    if (detecting || !selectedCountry) return;

    const lang = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(lang);

    // First detection: honour cached language
    if (!firstCountryDone.current) {
      firstCountryDone.current = true;
      const cached = localStorage.getItem(LANG_CACHE_KEY);
      if (cached && cached !== "auto" && cached !== "fr") {
        // Cookie already set in Step 1, GT already inited — nothing to do
        return;
      }
    }

    // Apply language
    setCurrentLang(lang);
    localStorage.setItem(LANG_CACHE_KEY, lang);

    if (gtLoaded.current) {
      const switched = switchLanguage(lang);
      if (!switched) {
        // GT loaded but combo not ready yet — cookie is set, retry shortly
        setTimeout(() => switchLanguageViaCombo(lang), 1000);
      }
    } else {
      // GT not loaded yet — just set cookie, GT will use it on init
      if (lang === "fr") {
        clearGoogTransCookies();
      } else {
        setGoogTransCookie(lang);
      }
    }

    if (!isBaseLang(lang)) {
      flashBanner(
        `Auto-translated to ${lang.toUpperCase()} based on your location`,
        false, // no reload on auto-detect — cookie is already set before GT loads
      );
    }
  }, [selectedCountry, detecting, flashBanner]);

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

      // If combo worked → no reload needed. If not → reload as fallback.
      flashBanner(msg, !switched);
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
      // Remove any GT banner bars that sneak in
      document
        .querySelectorAll(".goog-te-banner-frame, #goog-gt-tt")
        .forEach((el) => {
          (el as HTMLElement).style.display = "none";
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
      }}
    >
      {/* GT mounts its widget here. Offscreen but NOT display:none. */}
      <div
        id="google_translate_element"
        className="notranslate"
        style={{
          position: "fixed",
          bottom: -200,
          right: -200,
          width: 300,
          height: 100,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {children}

      <style>{`
        /* Hide all GT visual chrome OFF-SCREEN (not display:none).
           display:none kills iframes; height:0 + overflow:hidden clips
           the translation iframe. position:fixed + top:-9999px keeps
           elements functional but invisible. */
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame,
        .goog-te-balloon-frame,
        #goog-gt-tt,
        .goog-te-ftab-frame,
        .goog-tooltip,
        .goog-text-highlight,
        #gt-nvframe,
        iframe[id="gt-nvframe"],
        .goog-te-spinner-pos,
        .goog-te-menu-frame,
        .VIpgJd-ZVi9od-ORHb-OEVmcd,
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
        .VIpgJd-ZVi9od-aZ2wEe-OiiCO,
        #goog-gt-vt,
        .VIpgJd-yAWNEb-L7lbkb {
          position: fixed !important;
          top: -9999px !important;
          left: -9999px !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        body > .skiptranslate {
          position: fixed !important;
          top: -9999px !important;
          left: -9999px !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        body {
          top: 0 !important;
        }
        .goog-te-gadget {
          font-size: 0 !important;
          color: transparent !important;
        }
        .goog-te-gadget > span,
        .goog-te-gadget > div,
        .goog-te-gadget img {
          display: none !important;
        }
      `}</style>
    </LanguageContext.Provider>
  );
}

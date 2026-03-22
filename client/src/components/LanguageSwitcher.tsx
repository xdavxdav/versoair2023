/**
 * LanguageEngine — headless Google Translate controller.
 *
 * No visible UI. Provides a React context so other components (CountryDropdown)
 * can read the current language and trigger translation changes.
 *
 * Auto-translates based on detected country from CountryContext.
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

// ── Cache keys ──
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
}

const LanguageContext = createContext<LanguageContextType>({
  currentLang: "fr",
  selectLanguage: () => {},
  autoDetectedLang: "fr",
  showBanner: false,
  bannerMessage: "",
  previousLang: "fr",
  dismissBanner: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

// ── Google Translate helpers ──

function loadGoogleTranslateScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById("google-translate-script")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function triggerTranslation(langCode: string): boolean {
  try {
    // Set googtrans cookie so GT picks it up (primary mechanism)
    const cookieVal = `/fr/${langCode}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${window.location.hostname};`;
    if (window.location.hostname !== "localhost") {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=.${window.location.hostname};`;
    }

    // Try the visible combo first
    const combo = document.querySelector(
      ".goog-te-combo",
    ) as HTMLSelectElement | null;
    if (combo) {
      // Check if the language is available in the combo
      const options = Array.from(combo.options);
      const hasLang = options.some((opt) => opt.value === langCode);
      if (!hasLang) {
        console.warn(
          "[LanguageEngine] Language",
          langCode,
          "not found in GT combo options",
        );
      }
      combo.value = langCode;
      // bubbles:true is critical — GT listens on a parent element
      combo.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // Fallback: try iframe approach for some GT versions
    const frame = document.querySelector(
      ".goog-te-menu-frame",
    ) as HTMLIFrameElement | null;
    if (frame) {
      try {
        const innerDoc = frame.contentDocument || frame.contentWindow?.document;
        const items = innerDoc?.querySelectorAll(".goog-te-menu2-item");
        if (items) {
          for (const item of Array.from(items)) {
            if (
              (item as HTMLElement).innerText
                ?.toLowerCase()
                .includes(langCode.toLowerCase())
            ) {
              (item as HTMLElement).click();
              return true;
            }
          }
        }
      } catch {
        /* cross-origin */
      }
    }
  } catch (e) {
    console.warn("[LanguageEngine] triggerTranslation error:", e);
  }
  return false;
}

function clearGoogTransCookies() {
  const expire = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `googtrans=; ${expire}; path=/;`;
  document.cookie = `googtrans=; ${expire}; path=/; domain=${window.location.hostname};`;
  document.cookie = `googtrans=; ${expire}; path=/; domain=.${window.location.hostname};`;
}

function restoreOriginal(): boolean {
  try {
    clearGoogTransCookies();
    const combo = document.querySelector(
      ".goog-te-combo",
    ) as HTMLSelectElement | null;
    if (combo) {
      combo.value = "";
      combo.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    // Fallback: if combo not found, try resetting via iframe
    const frame = document.querySelector(
      ".goog-te-menu-frame",
    ) as HTMLIFrameElement | null;
    if (frame) {
      try {
        const innerDoc = frame.contentDocument || frame.contentWindow?.document;
        const items = innerDoc?.querySelectorAll(".goog-te-menu2-item");
        if (items && items.length > 0) {
          (items[0] as HTMLElement).click();
          return true;
        }
      } catch {
        /* cross-origin */
      }
    }
  } catch {
    /* ignore */
  }
  return false;
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
  const firstLoadDone = useRef(false);
  const pendingLangRef = useRef<string | null>(null);

  // Show banner with auto-dismiss
  const flashBanner = useCallback((msg: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBannerMessage(msg);
    setShowBanner(true);
    bannerTimerRef.current = setTimeout(() => setShowBanner(false), 5000);
  }, []);

  // Core: apply a language to Google Translate with polling retry
  const applyTranslation = useCallback((lang: string) => {
    let attempts = 0;
    const maxAttempts = 40; // More attempts (40 * 300ms = 12s max)

    if (lang === "fr") {
      const doRestore = () => {
        if (attempts++ > maxAttempts) {
          console.warn(
            "[LanguageEngine] Failed to restore French after",
            maxAttempts,
            "attempts",
          );
          return;
        }
        const ok = restoreOriginal();
        if (!ok) setTimeout(doRestore, 300);
      };
      doRestore();
    } else {
      const doTranslate = () => {
        if (attempts++ > maxAttempts) {
          console.warn(
            "[LanguageEngine] Failed to translate to",
            lang,
            "after",
            maxAttempts,
            "attempts",
          );
          return;
        }
        const ok = triggerTranslation(lang);
        if (!ok) {
          // If combo still not found after 10 attempts, try re-initializing GT
          if (attempts === 10 && window.googleTranslateElementInit) {
            console.log(
              "[LanguageEngine] Re-initializing GT after 10 failed attempts",
            );
            const el = document.getElementById("google_translate_element");
            if (el) el.innerHTML = "";
            window.googleTranslateElementInit();
          }
          // Also try at 20 attempts with a page-level reinit
          if (attempts === 20) {
            console.log(
              "[LanguageEngine] Forcing GT script reload after 20 failed attempts",
            );
            loadGoogleTranslateScript();
          }
          setTimeout(doTranslate, 300);
        } else {
          console.log(
            "[LanguageEngine] Translation to",
            lang,
            "succeeded after",
            attempts,
            "attempts",
          );
        }
      };
      doTranslate();
    }
  }, []);

  // Initialize Google Translate element (hidden)
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "fr",
            includedLanguages:
              "fr,en,es,pt,de,ar,zh-CN,zh-TW,ja,ko,ru,tr,it,nl,pl,sv,no,da,fi,cs,ro,hu,el,he,th,vi,id,uk,hi,bn,fa,sw,am,hr,sr,bg,sk,sl,et,lv,lt,my,km,lo,ka,hy,az,uz,tk,mn,ne,si",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element",
        );
        console.log("[LanguageEngine] Google Translate element created");
      } catch (e) {
        console.warn("[LanguageEngine] Google Translate init failed:", e);
      }
    };
    loadGoogleTranslateScript();

    // Watch for the GT combo box to appear in the DOM
    // This fires the INSTANT GT is ready, so we can translate immediately
    const el = document.getElementById("google_translate_element");
    let observer: MutationObserver | null = null;
    if (el) {
      observer = new MutationObserver(() => {
        const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (combo && pendingLangRef.current) {
          console.log("[LanguageEngine] Combo appeared, applying pending lang:", pendingLangRef.current);
          const lang = pendingLangRef.current;
          pendingLangRef.current = null;
          // Small delay to let GT fully wire up its event listeners
          setTimeout(() => triggerTranslation(lang), 200);
        }
      });
      observer.observe(el, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      delete (window as any).googleTranslateElementInit;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-translate when country changes (first load OR manual pick)
  useEffect(() => {
    if (detecting || !selectedCountry) return;

    const detectedLang = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(detectedLang);

    // On first load only: respect cached user choice
    if (!firstLoadDone.current) {
      firstLoadDone.current = true;
      const userChoice = localStorage.getItem(LANG_CACHE_KEY);
      if (userChoice && userChoice !== "auto" && userChoice !== "fr") {
        // Store as pending so MutationObserver can apply when GT is ready
        pendingLangRef.current = userChoice;
        // Also try polling in case observer misses it
        setTimeout(() => applyTranslation(userChoice), 2500);
        return;
      }
    }

    if (isBaseLang(detectedLang)) {
      // Switching to a French-speaking country → restore original
      pendingLangRef.current = null;
      applyTranslation("fr");
      setCurrentLang("fr");
      localStorage.setItem(LANG_CACHE_KEY, "fr");
    } else {
      // Non-French country → translate
      // Store as pending for MutationObserver (fires instantly when combo appears)
      pendingLangRef.current = detectedLang;
      setCurrentLang(detectedLang);
      localStorage.setItem(LANG_CACHE_KEY, detectedLang);
      // Also use polling fallback
      applyTranslation(detectedLang);
      flashBanner(
        `Auto-translated to ${detectedLang.toUpperCase()} based on your location`,
      );
    }
  }, [selectedCountry, detecting, applyTranslation, flashBanner]);

  const selectLanguage = useCallback(
    (lang: string, source: "country" | "manual" = "manual") => {
      const prev = currentLang;
      setPreviousLang(prev);

      // Update state + cache immediately so the UI badge reflects the choice
      setCurrentLang(lang);
      localStorage.setItem(LANG_CACHE_KEY, lang);

      // Apply Google Translate
      applyTranslation(lang);

      // Show confirmation banner
      if (source === "country") {
        if (lang === "fr") {
          flashBanner("Switched to Français (site base language)");
        } else {
          flashBanner(
            `Language switched to ${lang.toUpperCase()} for this country`,
          );
        }
      } else {
        if (lang === "fr") {
          flashBanner("Language restored to Français");
        } else {
          flashBanner(`Language overridden to ${lang.toUpperCase()}`);
        }
      }
    },
    [currentLang, applyTranslation, flashBanner],
  );

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
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
      }}
    >
      {/* Hidden Google Translate element — must NOT be display:none or GT breaks */}
      <div
        id="google_translate_element"
        className="notranslate"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {children}

      {/* Hide Google Translate branding WITHOUT display:none (which breaks GT) */}
      <style>{`
        .goog-te-banner-frame,
        .goog-te-balloon-frame,
        #goog-gt-tt,
        .goog-te-ftab-frame,
        .goog-tooltip,
        .goog-tooltip:hover,
        .goog-text-highlight {
          display: none !important;
          visibility: hidden !important;
        }
        body { top: 0 !important; }
        /* CRITICAL: do NOT use display:none on .skiptranslate — it kills GT's
           translation iframe. Use clip/overflow to hide visually instead. */
        .skiptranslate {
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          clip: rect(0,0,0,0) !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        /* Keep the widget's inner skiptranslate alive so the <select> exists */
        #google_translate_element .skiptranslate {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          display: block !important;
          height: auto !important;
          width: auto !important;
          clip: auto !important;
          overflow: visible !important;
        }
        body { top: 0px !important; }
        .goog-te-gadget { font-size: 0 !important; }
      `}</style>
    </LanguageContext.Provider>
  );
}

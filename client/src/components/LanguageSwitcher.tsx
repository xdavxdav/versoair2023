/**
 * LanguageEngine — headless Google Translate controller.
 *
 * STRATEGY: Cookie-first.
 *   1. On mount, read cached language from localStorage
 *   2. Set `googtrans=/fr/{lang}` cookie BEFORE loading GT script
 *   3. GT reads the cookie on init → auto-translates (no combo hack needed)
 *   4. For runtime language changes, set cookie + use combo as backup
 *
 * No visible UI. Provides a React context so other components (CountryDropdown)
 * can read the current language and trigger translation changes.
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

// ── Cache key ──
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

// ─────────────────────────────────────────────────────────
// Cookie helpers — the PRIMARY mechanism that makes GT work
// ─────────────────────────────────────────────────────────

function setGoogTransCookie(targetLang: string) {
  if (!targetLang || targetLang === "fr") {
    clearGoogTransCookies();
    return;
  }
  const val = `/fr/${targetLang}`;
  document.cookie = `googtrans=${val}; path=/;`;
  document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname};`;
  if (window.location.hostname !== "localhost") {
    document.cookie = `googtrans=${val}; path=/; domain=.${window.location.hostname};`;
  }
}

function clearGoogTransCookies() {
  const expire = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `googtrans=; ${expire}; path=/;`;
  document.cookie = `googtrans=; ${expire}; path=/; domain=${window.location.hostname};`;
  document.cookie = `googtrans=; ${expire}; path=/; domain=.${window.location.hostname};`;
}

// ─────────────────────────
// Google Translate helpers
// ─────────────────────────

function loadGoogleTranslateScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById("google-translate-script")) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

/** Use the hidden combo dropdown to switch language at runtime */
function triggerCombo(langCode: string): boolean {
  const combo = document.querySelector(
    ".goog-te-combo",
  ) as HTMLSelectElement | null;
  if (!combo) return false;
  combo.value = langCode;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function restoreCombo(): boolean {
  const combo = document.querySelector(
    ".goog-te-combo",
  ) as HTMLSelectElement | null;
  if (!combo) return false;
  combo.value = "";
  combo.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// ───────────
// Provider
// ───────────

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
  const gtReadyRef = useRef(false);
  const firstCountryDone = useRef(false);

  const flashBanner = useCallback((msg: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBannerMessage(msg);
    setShowBanner(true);
    bannerTimerRef.current = setTimeout(() => setShowBanner(false), 5000);
  }, []);

  // Poll combo with retry. Falls back to page reload as last resort.
  const applyViaCombo = useCallback((lang: string) => {
    let attempts = 0;
    if (lang === "fr") {
      clearGoogTransCookies();
      const poll = () => {
        if (attempts++ > 25) return;
        if (!restoreCombo()) setTimeout(poll, 300);
      };
      poll();
    } else {
      setGoogTransCookie(lang);
      const poll = () => {
        if (attempts++ > 25) {
          // Last resort — reload so GT picks up the cookie
          console.warn("[LanguageEngine] Combo unavailable, reloading page");
          window.location.reload();
          return;
        }
        if (!triggerCombo(lang)) setTimeout(poll, 300);
      };
      poll();
    }
  }, []);

  // ══════════════════════════════════════════════════════
  // STEP 1 — Pre-set cookie from cache BEFORE GT loads.
  //          This is the key fix: GT reads the cookie on
  //          init and translates immediately.
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const cached = localStorage.getItem(LANG_CACHE_KEY);
    if (cached && cached !== "fr" && cached !== "auto") {
      setGoogTransCookie(cached);
    }
  }, []);

  // ══════════════════════════════════════════════════════
  // STEP 2 — Load GT script. GT will read the cookie set
  //          in Step 1 and auto-translate on init.
  // ══════════════════════════════════════════════════════
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
        gtReadyRef.current = true;
      } catch (e) {
        console.warn("[LanguageEngine] GT init failed:", e);
      }
    };
    loadGoogleTranslateScript();

    return () => {
      delete (window as any).googleTranslateElementInit;
    };
  }, []);

  // ══════════════════════════════════════════════════════
  // STEP 3 — React to country detection / country switch.
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (detecting || !selectedCountry) return;

    const detectedLang = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(detectedLang);

    // First detection — honour cached choice
    if (!firstCountryDone.current) {
      firstCountryDone.current = true;
      const cached = localStorage.getItem(LANG_CACHE_KEY);
      if (cached && cached !== "auto" && cached !== "fr") {
        // Cookie was pre-set in Step 1. If GT already inited but hasn't
        // translated (e.g., the cookie was set too late), nudge it via combo.
        if (gtReadyRef.current) applyViaCombo(cached);
        return;
      }
    }

    if (isBaseLang(detectedLang)) {
      clearGoogTransCookies();
      if (gtReadyRef.current) restoreCombo();
      setCurrentLang("fr");
      localStorage.setItem(LANG_CACHE_KEY, "fr");
    } else {
      setGoogTransCookie(detectedLang);
      setCurrentLang(detectedLang);
      localStorage.setItem(LANG_CACHE_KEY, detectedLang);

      if (gtReadyRef.current) {
        applyViaCombo(detectedLang);
      }
      // If GT hasn't loaded yet, the cookie will make it auto-translate

      flashBanner(
        `Auto-translated to ${detectedLang.toUpperCase()} based on your location`,
      );
    }
  }, [selectedCountry, detecting, applyViaCombo, flashBanner]);

  // ── Manual language switch ──
  const selectLanguage = useCallback(
    (lang: string, source: "country" | "manual" = "manual") => {
      const prev = currentLang;
      setPreviousLang(prev);
      setCurrentLang(lang);
      localStorage.setItem(LANG_CACHE_KEY, lang);

      setGoogTransCookie(lang);
      applyViaCombo(lang);

      if (source === "country") {
        flashBanner(
          lang === "fr"
            ? "Switched to Français (site base language)"
            : `Language switched to ${lang.toUpperCase()} for this country`,
        );
      } else {
        flashBanner(
          lang === "fr"
            ? "Language restored to Français"
            : `Language overridden to ${lang.toUpperCase()}`,
        );
      }
    },
    [currentLang, applyViaCombo, flashBanner],
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
      {/*
        GT widget container.
        Positioned at bottom-right, 1×1, near-invisible but NOT display:none.
        GT creates its <select> and iframes inside this div.
      */}
      <div
        id="google_translate_element"
        className="notranslate"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
          opacity: 0.01,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {children}

      {/*
        Hide ONLY GT's banner bar and tooltip chrome.

        ⚠️  DO NOT add `.skiptranslate { display: none }` — that class is
        on GT's translation iframes and hiding them kills ALL translation.
        Only target the specific UI elements we want hidden.
      */}
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
        body {
          top: 0 !important;
          position: static !important;
        }
        .goog-te-gadget {
          font-size: 0 !important;
        }
        .goog-te-gadget > span {
          display: none !important;
        }
      `}</style>
    </LanguageContext.Provider>
  );
}

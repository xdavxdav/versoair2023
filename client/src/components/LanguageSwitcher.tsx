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
    googleTranslateElementInit?: () => void;
  }
}

interface LanguageContextType {
  currentLang: string;
  selectLanguage: (lang: string) => void;
  autoDetectedLang: string;
  showBanner: boolean;
  dismissBanner: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLang: "fr",
  selectLanguage: () => {},
  autoDetectedLang: "fr",
  showBanner: false,
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
    const combo = document.querySelector(
      ".goog-te-combo",
    ) as HTMLSelectElement | null;
    if (combo) {
      combo.value = langCode;
      combo.dispatchEvent(new Event("change"));
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function restoreOriginal() {
  try {
    const combo = document.querySelector(
      ".goog-te-combo",
    ) as HTMLSelectElement | null;
    if (combo) {
      combo.value = "";
      combo.dispatchEvent(new Event("change"));
    }
    const banner = document.querySelector(
      ".goog-te-banner-frame",
    ) as HTMLIFrameElement | null;
    if (banner?.contentDocument) {
      const btn = banner.contentDocument.querySelector(
        ".goog-te-button button",
      ) as HTMLButtonElement | null;
      btn?.click();
    }
    document.cookie =
      "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." +
      window.location.hostname;
  } catch {
    /* ignore */
  }
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
  const [autoDetectedLang, setAutoDetectedLang] = useState("fr");
  const [showBanner, setShowBanner] = useState(false);
  const initAttempts = useRef(0);
  const autoApplied = useRef(false);

  // Initialize Google Translate element (hidden)
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "fr",
            includedLanguages:
              "fr,en,es,pt,de,ar,zh-CN,zh-TW,ja,ko,ru,tr,it,nl,pl,sv,no,da,fi,cs,ro,hu,el,he,th,vi,id,uk,hi,bn,fa,sw,am",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element",
        );
      } catch (e) {
        console.warn("[LanguageEngine] Google Translate init failed:", e);
      }
    };
    loadGoogleTranslateScript();
    return () => {
      delete window.googleTranslateElementInit;
    };
  }, []);

  // Auto-translate when country is detected
  useEffect(() => {
    if (detecting || !selectedCountry || autoApplied.current) return;

    const userChoice = localStorage.getItem(LANG_CACHE_KEY);
    const detectedLang = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(detectedLang);

    // If user explicitly chose a language before, respect it
    if (userChoice && userChoice !== "auto" && userChoice !== "fr") {
      autoApplied.current = true;
      return;
    }

    if (isBaseLang(detectedLang)) {
      autoApplied.current = true;
      return;
    }

    autoApplied.current = true;
    const doTranslate = () => {
      if (initAttempts.current > 20) return;
      initAttempts.current++;
      const success = triggerTranslation(detectedLang);
      if (success) {
        setCurrentLang(detectedLang);
        localStorage.setItem(LANG_CACHE_KEY, detectedLang);
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 5000);
      } else {
        setTimeout(doTranslate, 500);
      }
    };
    const timer = setTimeout(doTranslate, 1500);
    return () => clearTimeout(timer);
  }, [selectedCountry, detecting]);

  // Update autoDetectedLang when country changes manually
  useEffect(() => {
    if (detecting || !selectedCountry) return;
    setAutoDetectedLang(getLanguageForCountry(selectedCountry));
  }, [selectedCountry, detecting]);

  const selectLanguage = useCallback((lang: string) => {
    if (lang === "fr") {
      restoreOriginal();
      setCurrentLang("fr");
      localStorage.setItem(LANG_CACHE_KEY, "fr");
    } else {
      const success = triggerTranslation(lang);
      if (success) {
        setCurrentLang(lang);
        localStorage.setItem(LANG_CACHE_KEY, lang);
      } else {
        setTimeout(() => {
          triggerTranslation(lang);
          setCurrentLang(lang);
          localStorage.setItem(LANG_CACHE_KEY, lang);
        }, 1000);
      }
    }
  }, []);

  const dismissBanner = useCallback(() => setShowBanner(false), []);

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        selectLanguage,
        autoDetectedLang,
        showBanner,
        dismissBanner,
      }}
    >
      {/* Hidden Google Translate element */}
      <div
        id="google_translate_element"
        className="notranslate"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {children}

      {/* Hide Google Translate branding */}
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
        .skiptranslate { display: none !important; }
        #google_translate_element .skiptranslate {
          display: block !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        body { top: 0px !important; }
        .goog-te-gadget { font-size: 0 !important; }
      `}</style>
    </LanguageContext.Provider>
  );
}

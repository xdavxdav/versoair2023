import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCountry } from "@/contexts/CountryContext";
import { getLanguageForCountry } from "@/utils/country-language";

const LANG_CACHE_KEY = "fsa_selected_language";
const LANG_OVERRIDE_KEY = "fsa_language_override";
const ROMANIZATION_KEY = "romanization_enabled";
const GT_SCRIPT_ID = "gt-script";
const GT_LANGUAGES =
  "af,sq,am,ar,hy,as,ay,az,bm,eu,be,bn,bho,bs,bg,ca,ceb,zh-CN,zh-TW,co,hr,cs,da,dv,doi,nl,en,eo,et,ee,fil,fi,fr,fy,gl,ka,de,el,gn,gu,ht,ha,haw,he,hi,hmn,hu,is,ig,ilo,id,ga,it,ja,jv,kn,kk,km,rw,gom,ko,kri,ku,ckb,ky,lo,la,lv,ln,lt,lb,lg,mai,mg,ms,ml,mt,mni-Mtei,mi,mr,mn,my,ne,no,ny,or,om,ps,fa,pl,pt,pa,qu,ro,ru,sm,sa,gd,nso,sr,st,sn,sd,si,sk,sl,so,es,su,sw,sv,tg,ta,tt,te,th,ti,ts,tr,tk,ak,uk,ur,ug,uz,vi,cy,xh,yi,yo,zu";
const GT_LANGUAGE_CODES = new Set(GT_LANGUAGES.split(","));
const googleLanguageCode = (language: string) =>
  language === "he" ? "iw" : language;

export const NON_LATIN_LANGS = new Set(
  "ja,zh-CN,zh-TW,ko,ar,he,hi,bn,th,my,km,lo,ka,hy,am,ne,si,fa,ru,uk,bg,sr,mn,el".split(
    ",",
  ),
);

interface GoogleTranslateElementConstructor {
  new (
    options: {
      pageLanguage: string;
      includedLanguages: string;
      autoDisplay: boolean;
    },
    elementId: string,
  ): unknown;
}

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: GoogleTranslateElementConstructor;
      };
    };
    googleTranslateElementInit?: () => void;
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
  machineTranslated: boolean;
  translateText: (text: string) => string;
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
  machineTranslated: false,
  translateText: (text) => text,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error: unknown) {
    console.warn(
      "[Language] Preferences unavailable:",
      error instanceof Error ? error.name : "storage error",
    );
    return null;
  }
}

function storePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error: unknown) {
    console.warn(
      "[Language] Preference could not be saved:",
      error instanceof Error ? error.name : "storage error",
    );
  }
}

function getInitialLanguage(): string {
  const cached = readPreference(LANG_CACHE_KEY);
  if (cached && GT_LANGUAGE_CODES.has(cached)) return cached;
  if (cached) {
    console.warn("[Language] Ignoring unsupported saved language:", cached);
  }
  return "fr";
}

function setGoogleTranslateCookie(language: string) {
  const value = `/auto/${googleLanguageCode(language)}`;
  const host = window.location.hostname;
  const domains = new Set(["", `; domain=${host}`]);
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    domains.add(`; domain=.${host}`);
    if (host.endsWith(".versoair.com")) domains.add("; domain=.versoair.com");
  }
  for (const domain of domains) {
    document.cookie = `googtrans=${value}; path=/${domain}; SameSite=Lax`;
  }
}

function switchGoogleTranslateLanguage(language: string): boolean {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) return false;
  const code = googleLanguageCode(language);
  if (![...combo.options].some((option) => option.value === code)) return false;
  combo.value = code;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function loadGoogleTranslateScript() {
  const existing = document.getElementById(GT_SCRIPT_ID);
  if (existing) return;
  const script = document.createElement("script");
  script.id = GT_SCRIPT_ID;
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  script.onerror = () => {
    console.error("[Language] Google Translate script failed to load.");
    window.dispatchEvent(new CustomEvent("google-translate-load-error"));
  };
  document.head.appendChild(script);
}

function initializeGoogleTranslate() {
  const TranslateElement = window.google?.translate?.TranslateElement;
  const container = document.getElementById("google_translate_element");
  if (!TranslateElement || !container) {
    console.error("[Language] Google Translate initialized without its widget.");
    return false;
  }
  if (container.dataset.initialized === "true") return true;

  container.replaceChildren();
  new TranslateElement(
    {
      pageLanguage: "auto",
      includedLanguages: [...GT_LANGUAGE_CODES].map(googleLanguageCode).join(","),
      autoDisplay: false,
    },
    "google_translate_element",
  );
  container.dataset.initialized = "true";
  return true;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { selectedCountry, detecting } = useCountry();
  const [currentLang, setCurrentLang] = useState(getInitialLanguage);
  const currentRef = useRef(currentLang);
  const [previousLang, setPreviousLang] = useState("fr");
  const [autoDetectedLang, setAutoDetectedLang] = useState("fr");
  const manual = useRef(readPreference(LANG_OVERRIDE_KEY) === "true");
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [romanized, setRomanized] = useState(
    () => readPreference(ROMANIZATION_KEY) === "true",
  );
  const [googleTranslateReady, setGoogleTranslateReady] = useState(false);
  const [googleTranslateFailed, setGoogleTranslateFailed] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCountryLanguage = useRef<string | null>(null);

  const notify = useCallback((message: string, duration = 12_000) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBannerMessage(message);
    setShowBanner(true);
    bannerTimer.current = setTimeout(() => setShowBanner(false), duration);
  }, []);

  const applyLanguage = useCallback(
    (language: string, source: "country" | "manual") => {
      if (!GT_LANGUAGE_CODES.has(language)) {
        console.error("[Language] Google Translate does not support:", language);
        notify(
          `Google Translate does not support ${language}. Your language was not changed.`,
        );
        return;
      }
      if (currentRef.current !== language) {
        setPreviousLang(currentRef.current);
      }
      currentRef.current = language;
      setCurrentLang(language);
      storePreference(LANG_CACHE_KEY, language);
      setGoogleTranslateCookie(language);

      if (switchGoogleTranslateLanguage(language)) {
        notify(`Translating to ${language.toUpperCase()} with Google Translate.`, 5000);
      } else if (googleTranslateFailed) {
        notify(
          "Google Translate could not load. Check your connection and try again.",
        );
      } else {
        notify(`Language ${source === "country" ? "suggested" : "selected"}: ${language.toUpperCase()}. Waiting for Google Translate.`, 5000);
      }
    },
    [googleTranslateFailed, notify],
  );

  const selectLanguage = useCallback(
    (language: string, source: "country" | "manual" = "manual") => {
      manual.current = source === "manual";
      storePreference(LANG_OVERRIDE_KEY, String(manual.current));
      applyLanguage(language, source);
    },
    [applyLanguage],
  );

  useEffect(() => {
    setGoogleTranslateCookie(currentRef.current);

    const handleGoogleTranslateReady = () => {
      if (initializeGoogleTranslate()) setGoogleTranslateReady(true);
    };
    const handleGoogleTranslateFailure = () => {
      setGoogleTranslateFailed(true);
      notify("Google Translate could not load. Check your connection and try again.");
    };

    window.googleTranslateElementInit = handleGoogleTranslateReady;
    window.addEventListener(
      "google-translate-load-error",
      handleGoogleTranslateFailure,
    );
    if (window.google?.translate?.TranslateElement) {
      handleGoogleTranslateReady();
    } else {
      loadGoogleTranslateScript();
    }

    return () => {
      window.removeEventListener(
        "google-translate-load-error",
        handleGoogleTranslateFailure,
      );
      if (window.googleTranslateElementInit === handleGoogleTranslateReady) {
        delete window.googleTranslateElementInit;
      }
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [notify]);

  useEffect(() => {
    if (detecting || !selectedCountry) return;
    const language = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(language);
    if (lastCountryLanguage.current === language) return;
    lastCountryLanguage.current = language;
    if (!manual.current && language !== currentRef.current) {
      applyLanguage(language, "country");
    }
  }, [selectedCountry, detecting, applyLanguage]);

  useEffect(() => {
    if (!googleTranslateReady) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (switchGoogleTranslateLanguage(currentRef.current)) {
        window.clearInterval(timer);
      } else if (attempts >= 20) {
        window.clearInterval(timer);
        console.error("[Language] Google Translate language control is unavailable:", currentRef.current);
        notify("Google Translate's language control could not load. Translation was not applied. Please try again.");
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [googleTranslateReady, currentLang, notify]);

  useEffect(() => {
    const resetBodyOffset = () => {
      document.body.style.top = "0px";
    };
    const timers = [2000, 5000, 10000].map((delay) =>
      window.setTimeout(resetBodyOffset, delay),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
  }, []);

  const toggleRomanization = useCallback(() => {
    setRomanized((value) => {
      storePreference(ROMANIZATION_KEY, String(!value));
      return !value;
    });
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
        reloadCountdown: null,
        romanized,
        toggleRomanization,
        isNonLatinLang: NON_LATIN_LANGS.has(currentLang),
        machineTranslated: googleTranslateReady && !googleTranslateFailed,
        translateText: (text) => text,
      }}
    >
      <div
        id="google_translate_element"
        className="notranslate"
        aria-hidden="true"
        style={{
          position: "fixed",
          top: -100,
          left: 0,
          height: 0,
          opacity: 0,
          overflow: "visible",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      {children}
      <style>{`
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
        }
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
        body { top: 0 !important; }
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

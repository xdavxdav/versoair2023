import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { getLanguageForCountry } from "@/utils/country-language";
import {
  getPublicCopyId,
  isBundledLanguage,
  nativeDictionary,
  type TranslationDictionary,
} from "../../../shared/public-translations";

const LANG_CACHE_KEY = "fsa_selected_language";
const LANG_OVERRIDE_KEY = "fsa_language_override";
const ROMANIZATION_KEY = "romanization_enabled";

export const NON_LATIN_LANGS = new Set(
  "ja,zh-CN,zh-TW,ko,ar,he,hi,bn,th,my,km,lo,ka,hy,am,ne,si,fa,ru,uk,bg,sr,mn,el".split(","),
);

interface LanguageContextType {
  currentLang: string;
  selectLanguage: (lang: string, source?: "country" | "manual") => void;
  autoDetectedLang: string;
  showBanner: boolean;
  bannerMessage: string;
  previousLang: string;
  dismissBanner: () => void;
  reloadCountdown: null;
  romanized: boolean;
  toggleRomanization: () => void;
  isNonLatinLang: boolean;
  machineTranslated: boolean;
  translateText: (text: string) => string;
}

const french = nativeDictionary("fr");

function translateText(text: string, dictionary: TranslationDictionary): string {
  const id = getPublicCopyId(text);
  if (id === undefined || !dictionary[id]) return text;
  const before = text.match(/^\s*/)?.[0] ?? "";
  const after = text.match(/\s*$/)?.[0] ?? "";
  return `${before}${dictionary[id]}${after}`;
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
  translateText: text => translateText(text, french),
});

export function useLanguage() {
  return useContext(LanguageContext);
}

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error: unknown) {
    console.warn("[Language] Preferences unavailable:", error instanceof Error ? error.name : "storage error");
    return null;
  }
}

function storePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error: unknown) {
    console.warn("[Language] Preference could not be saved:", error instanceof Error ? error.name : "storage error");
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { selectedCountry, detecting } = useCountry();
  const [currentLang, setCurrentLang] = useState("fr");
  const currentRef = useRef("fr");
  const [dictionary, setDictionary] = useState<TranslationDictionary>(french);
  const [previousLang, setPreviousLang] = useState("fr");
  const [autoDetectedLang, setAutoDetectedLang] = useState("fr");
  const manual = useRef(readPreference(LANG_OVERRIDE_KEY) === "true");
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [romanized, setRomanized] = useState(() => readPreference(ROMANIZATION_KEY) === "true");
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const lastCountryLanguage = useRef<string | null>(null);

  const notify = useCallback((message: string, duration = 12_000) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBannerMessage(message);
    setShowBanner(!dismissed.current);
    bannerTimer.current = setTimeout(() => setShowBanner(false), duration);
  }, []);

  const apply = useCallback((language: string) => {
    dismissed.current = false;
    if (!isBundledLanguage(language)) {
      notify("This language is not bundled yet. Your previous language is unchanged. Choose Français, English or Español.");
      return;
    }
    if (currentRef.current !== language) setPreviousLang(currentRef.current);
    currentRef.current = language;
    setDictionary(nativeDictionary(language));
    setCurrentLang(language);
    storePreference(LANG_CACHE_KEY, language);
    const name = { fr: "Français", en: "English", es: "Español" }[language];
    notify(`${name} selected for supported content. Bundled translation; no translation service used.`, 3_000);
  }, [notify]);

  const selectLanguage = useCallback((language: string, source: "country" | "manual" = "manual") => {
    manual.current = source === "manual";
    storePreference(LANG_OVERRIDE_KEY, String(manual.current));
    apply(language);
  }, [apply]);

  useEffect(() => {
    // Remove old widget preferences; no external widget script or DOM rewriting remains.
    const host = window.location.hostname;
    for (const domain of ["", `; domain=${host}`, `; domain=.${host}`, "; domain=.versoair.com"]) {
      document.cookie = `googtrans=; Max-Age=0; path=/${domain}`;
    }
    const cached = readPreference(LANG_CACHE_KEY);
    if (cached) apply(cached);
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [apply]);

  useEffect(() => {
    if (detecting || !selectedCountry) return;
    const language = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(language);
    if (lastCountryLanguage.current === language) return;
    lastCountryLanguage.current = language;
    if (!manual.current && language !== currentRef.current) apply(language);
  }, [selectedCountry, detecting, apply]);

  const dismissBanner = useCallback(() => {
    dismissed.current = true;
    setShowBanner(false);
  }, []);
  const toggleRomanization = useCallback(() => {
    setRomanized(value => {
      storePreference(ROMANIZATION_KEY, String(!value));
      return !value;
    });
  }, []);
  const localize = useCallback((text: string) => translateText(text, dictionary), [dictionary]);

  return (
    <LanguageContext.Provider value={{
      currentLang, selectLanguage, autoDetectedLang, showBanner, bannerMessage,
      previousLang, dismissBanner, reloadCountdown: null, romanized, toggleRomanization,
      isNonLatinLang: NON_LATIN_LANGS.has(currentLang),
      machineTranslated: false,
      translateText: localize,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

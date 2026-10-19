import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { getLanguageForCountry } from "@/utils/country-language";
import {
  PUBLIC_COPY,
  SUPPORTED_LANGUAGES,
  getPublicCopyId,
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

function decodeTranslation(text: string): string {
  // Decode provider HTML entities without interpreting markup or adding DOM nodes.
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (!code.startsWith("#")) return named[code.toLowerCase()] ?? entity;
    const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : entity;
  });
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
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const cache = useRef(new Map<string, TranslationDictionary>());
  const lastCountryLanguage = useRef<string | null>(null);

  const notify = useCallback((message: string, duration = 12_000) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBannerMessage(message);
    setShowBanner(!dismissed.current);
    bannerTimer.current = setTimeout(() => setShowBanner(false), duration);
  }, []);

  const apply = useCallback(async (language: string) => {
    request.current?.abort();
    const serial = ++sequence.current;
    const controller = new AbortController();
    request.current = controller;
    dismissed.current = false;
    if (!SUPPORTED_LANGUAGES.has(language)) {
      notify("This language is not supported. Please choose French or English.");
      return;
    }
    let next = language === "fr" || language === "en"
      ? nativeDictionary(language) : cache.current.get(language);
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      if (!next) {
        notify(`Requesting automatic translation: ${language.toUpperCase()}…`);
        const response = await fetch(`/api/translations/${encodeURIComponent(language)}`, {
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Translation request failed (${response.status})`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" ||
            Reflect.get(payload, "success") !== true || Reflect.get(payload, "language") !== language) {
          throw new Error("Invalid translation response");
        }
        const result: unknown = Reflect.get(payload, "dictionary");
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          throw new Error("Invalid translation dictionary");
        }
        next = {};
        for (let index = 0; index < PUBLIC_COPY.length; index++) {
          const value: unknown = Reflect.get(result, String(index));
          if (typeof value !== "string" || !value.trim() || value.length > 20_000) {
            throw new Error("Incomplete translation dictionary");
          }
          next[String(index)] = decodeTranslation(value);
        }
        cache.current.set(language, next);
      }
      if (serial !== sequence.current) return;
      if (currentRef.current !== language) setPreviousLang(currentRef.current);
      currentRef.current = language;
      setDictionary(next);
      setCurrentLang(language);
      storePreference(LANG_CACHE_KEY, language);
      notify(language === "fr" || language === "en"
        ? `${language === "fr" ? "Français" : "English"} selected for supported content.`
        : `Automatic translation by Google Translate (${language.toUpperCase()}) for supported public content.`, 3_000);
    } catch (error: unknown) {
      if (serial !== sequence.current) return;
      console.warn("[Language] Translation unavailable:", error instanceof Error ? error.message : "request error");
      notify("Translation unavailable. Your previous language is unchanged. Choose French or English, or select the language again to retry.");
    } finally {
      clearTimeout(timeout);
    }
  }, [notify]);

  const selectLanguage = useCallback((language: string, source: "country" | "manual" = "manual") => {
    manual.current = source === "manual";
    storePreference(LANG_OVERRIDE_KEY, String(manual.current));
    void apply(language);
  }, [apply]);

  useEffect(() => {
    // Remove old widget preferences; no external widget script or DOM rewriting remains.
    const host = window.location.hostname;
    for (const domain of ["", `; domain=${host}`, `; domain=.${host}`, "; domain=.versoair.com"]) {
      document.cookie = `googtrans=; Max-Age=0; path=/${domain}`;
    }
    const cached = readPreference(LANG_CACHE_KEY);
    if (cached && SUPPORTED_LANGUAGES.has(cached)) void apply(cached);
    return () => {
      sequence.current++;
      request.current?.abort();
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [apply]);

  useEffect(() => {
    if (detecting || !selectedCountry) return;
    const language = getLanguageForCountry(selectedCountry);
    setAutoDetectedLang(language);
    if (lastCountryLanguage.current === language) return;
    lastCountryLanguage.current = language;
    if (!manual.current && language !== currentRef.current) void apply(language);
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
      machineTranslated: currentLang !== "fr" && currentLang !== "en",
      translateText: localize,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

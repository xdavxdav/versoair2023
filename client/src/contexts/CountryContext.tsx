/**
 * CountryContext — auto-detected country via IP geolocation + manual override.
 * On mount, calls a free geolocation API to resolve the user's country.
 * Caches in localStorage for 24h so subsequent loads are instant.
 * Users can also manually switch via the CountryDropdown.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

const CACHE_KEY = "fsa_detected_country";
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry {
  code: string;
  ts: number;
  manual?: boolean; // true = user explicitly picked this country
}

interface CountryContextType {
  selectedCountry: string;
  setSelectedCountry: (code: string) => void;
  detecting: boolean;
}

const CountryContext = createContext<CountryContextType>({
  selectedCountry: "",
  setSelectedCountry: () => {},
  detecting: true,
});

function getCached(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (
      Date.now() - entry.ts < CACHE_TTL &&
      typeof entry.code === "string" &&
      entry.code
    )
      return entry;
  } catch {
    /* ignore */
  }
  return null;
}

function setCache(code: string, manual = false) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ code, ts: Date.now(), manual }),
    );
  } catch {
    /* ignore */
  }
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const cached = getCached();
  // Start with cached code if available (instant display), otherwise empty
  const [selectedCountry, setSelectedCountryState] = useState(
    cached?.code ?? "",
  );
  // Still detecting if: no cache at all, OR cache exists but was auto-detected (not manual)
  const [detecting, setDetecting] = useState(!cached || !cached.manual);

  const setSelectedCountry = (code: string) => {
    setSelectedCountryState(code);
    if (code) {
      setCache(code, true); // mark as manually set
    } else {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    // Skip re-detection only if the user manually chose their country
    if (cached?.manual) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const code = (data.country_code || "").toUpperCase();
        if (!cancelled && code) {
          setSelectedCountryState(code);
          setCache(code, false); // auto-detected, not manual
        }
      } catch {
        try {
          const res = await fetch(
            "https://ip-api.com/json/?fields=countryCode",
            { signal: AbortSignal.timeout(5000) },
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          const code = (data.countryCode || "").toUpperCase();
          if (!cancelled && code) {
            setSelectedCountryState(code);
            setCache(code, false);
          }
        } catch {
          /* both failed — keep whatever was cached or stay empty */
        }
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CountryContext.Provider
      value={{ selectedCountry, setSelectedCountry, detecting }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}

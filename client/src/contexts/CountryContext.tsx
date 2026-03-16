/**
 * CountryContext — auto-detected country via IP geolocation + manual override.
 * On mount, calls a free geolocation API to resolve the user's country.
 * Caches in localStorage for 24h so subsequent loads are instant.
 * Users can also manually switch via the CountryDropdown.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

const CACHE_KEY = "fsa_detected_country_v2"; // v2: removed locale fallback that mis-detected CA→US
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface CacheEntry {
  code: string;
  ts: number;
  manual?: boolean; // true = user explicitly picked this country
}

interface CountryContextType {
  selectedCountry: string;
  setSelectedCountry: (code: string) => void;
  detecting: boolean;
  reloadDetection: () => void;
}

const CountryContext = createContext<CountryContextType>({
  selectedCountry: "",
  setSelectedCountry: () => {},
  detecting: true,
  reloadDetection: () => {},
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
  const [manualSelection, setManualSelection] = useState(
    Boolean(cached?.manual),
  );
  // Still detecting if: no cache at all, OR cache exists but was auto-detected (not manual)
  const [detecting, setDetecting] = useState(!cached || !cached.manual);
  const [reloadCounter, setReloadCounter] = useState(0);

  const normalizeCode = (value: string) => {
    const code = (value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  };

  const detectFromBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/location/country`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return normalizeCode(data?.countryCode || "");
    } catch {
      return "";
    }
  };

  const detectFromIpApiCo = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return normalizeCode(data?.country_code || "");
    } catch {
      return "";
    }
  };

  const detectFromIpWhoIs = async () => {
    try {
      const res = await fetch("https://ipwho.is/?fields=success,country_code", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return "";
      const data = await res.json();
      if (!data?.success) return "";
      return normalizeCode(data?.country_code || "");
    } catch {
      return "";
    }
  };

  const detectFromCountryIs = async () => {
    try {
      const res = await fetch("https://api.country.is", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return normalizeCode(data?.country || "");
    } catch {
      return "";
    }
  };

  const setSelectedCountry = (code: string) => {
    setSelectedCountryState(code);
    if (code) {
      setManualSelection(true);
      setCache(code, true); // mark as manually set
    } else {
      setManualSelection(false);
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  const reloadDetection = () => {
    setDetecting(true);
    setManualSelection(false);
    setSelectedCountryState("");
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
    setReloadCounter((c) => c + 1);
  };

  useEffect(() => {
    // Skip re-detection only if the user manually chose their country
    if (manualSelection) {
      setDetecting(false);
      return;
    }

    // Re-read cache fresh (not from stale closure) to avoid acting on
    // an outdated entry that was cleared by reloadDetection.
    const freshCache = getCached();
    if (freshCache?.manual) {
      setSelectedCountryState(freshCache.code);
      setDetecting(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Backend is tried first because our server always gets the real
        // client IP via x-forwarded-for and is never blocked by ad-blockers.
        // Browser-side IP APIs can be blocked by content filters.
        const strategies = [
          detectFromBackend,
          detectFromIpWhoIs,
          detectFromIpApiCo,
          detectFromCountryIs,
        ];

        for (const detect of strategies) {
          try {
            const code = await detect();
            if (!cancelled && code) {
              setSelectedCountryState(code);
              setCache(code, false); // auto-detected, not manual
              return;
            }
          } catch {
            // This strategy failed (CORS, network, timeout, etc.) — try next
            continue;
          }
        }

        // Do NOT fall back to browser locale — navigator.language "en-US"
        // means the user prefers English (US), NOT that they are in the US.
        // A Canadian user with en-US locale would be mis-detected as US.
      } catch {
        /* all failed — keep whatever was cached or stay empty */
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadCounter, manualSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CountryContext.Provider
      value={{
        selectedCountry,
        setSelectedCountry,
        detecting,
        reloadDetection,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}

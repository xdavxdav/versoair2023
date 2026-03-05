/**
 * CountryContext — auto-detected country via IP geolocation + manual override.
 * On mount, calls a free geolocation API to resolve the user's country.
 * Caches in localStorage for 24h so subsequent loads are instant.
 * Users can also manually switch via the CountryDropdown.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

const CACHE_KEY = "fsa_detected_country";
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

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

function getCached(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { code, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL && typeof code === "string" && code)
      return code;
  } catch {
    /* ignore */
  }
  return null;
}

function setCache(code: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ code, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const cached = getCached();
  const [selectedCountry, setSelectedCountryState] = useState(cached ?? "");
  const [detecting, setDetecting] = useState(!cached);

  const setSelectedCountry = (code: string) => {
    setSelectedCountryState(code);
    if (code) {
      setCache(code);
    } else {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    if (cached) return;
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
          setCache(code);
        }
      } catch {
        try {
          const res = await fetch(
            "http://ip-api.com/json/?fields=countryCode",
            { signal: AbortSignal.timeout(5000) },
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          const code = (data.countryCode || "").toUpperCase();
          if (!cancelled && code) {
            setSelectedCountryState(code);
            setCache(code);
          }
        } catch {
          /* both failed — no filter */
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

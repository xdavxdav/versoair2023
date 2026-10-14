import { useEffect, useState } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { getCountryMeta } from "@/utils/countryMeta";
import {
  getGeoAdminMarket,
  getMarketAvailability,
  type ExchangeRates,
} from "@/lib/geoadmin-pricing";

const RATE_CACHE_KEY = "versoair_xof_exchange_rates_v1";
const RATE_CACHE_TTL = 12 * 60 * 60 * 1000;
const RATE_URL = "https://open.er-api.com/v6/latest/XOF";

interface RateCache {
  rates: ExchangeRates;
  expiresAt: number;
}

function readRateCache(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(RATE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as RateCache;
    if (
      cache.expiresAt > Date.now() &&
      cache.rates &&
      typeof cache.rates.XOF === "number" &&
      cache.rates.XOF === 1
    ) {
      return cache.rates;
    }
  } catch {
    return null;
  }
  return null;
}

export function useGeoAdminPricing() {
  const { selectedCountry } = useCountry();
  const [rates, setRates] = useState<ExchangeRates | null>(() => readRateCache());
  const [loadingRates, setLoadingRates] = useState(!rates);
  const currency: string = selectedCountry
    ? (getGeoAdminMarket(selectedCountry)?.currency ??
      getCountryMeta(selectedCountry).currency)
    : "XOF";
  const market = selectedCountry ? getGeoAdminMarket(selectedCountry) : null;

  useEffect(() => {
    let cancelled = false;
    const cachedRates = readRateCache();
    if (cachedRates) {
      setRates(cachedRates);
      setLoadingRates(false);
      return;
    }

    const loadRates = async () => {
      setLoadingRates(true);
      try {
        const response = await fetch(RATE_URL, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          throw new Error(`Exchange-rate service returned ${response.status}`);
        }
        const payload = await response.json();
        const nextRates = payload?.rates as ExchangeRates | undefined;
        if (
          payload?.result !== "success" ||
          payload?.base_code !== "XOF" ||
          !nextRates ||
          nextRates.XOF !== 1
        ) {
          throw new Error("Exchange-rate service returned invalid rates");
        }
        for (const [code, rate] of Object.entries(nextRates)) {
          if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(rate) || rate <= 0) {
            throw new Error("Exchange-rate service returned an invalid currency rate");
          }
        }
        if (cancelled) return;
        setRates(nextRates);
        try {
          localStorage.setItem(
            RATE_CACHE_KEY,
            JSON.stringify({
              rates: nextRates,
              expiresAt: Date.now() + RATE_CACHE_TTL,
            } satisfies RateCache),
          );
        } catch {
          // Display the valid response even when browser storage is unavailable.
        }
      } catch (error) {
        console.warn("[GeoAdminPricing] Could not load exchange rates:", error);
        if (!cancelled) setRates(null);
      } finally {
        if (!cancelled) setLoadingRates(false);
      }
    };

    void loadRates();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    currency,
    locale: market?.locale,
    rates,
    loadingRates,
    selectedCountry,
    marketAvailability: selectedCountry
      ? getMarketAvailability(selectedCountry)
      : null,
  };
}

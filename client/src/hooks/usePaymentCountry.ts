/**
 * usePaymentCountry — Bridges CountryContext with payment-methods config.
 * Returns auto-detected currency, language, available payment methods,
 * and country-specific config for the current user.
 */
import { useMemo } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { useLanguage } from "@/components/LanguageSwitcher";
import {
  COUNTRY_CONFIGS,
  CURRENCY_INFO,
  getAvailablePaymentMethods,
  getSortedPaymentMethods,
  getDefaultPaymentMethod,
  type CurrencyCode,
  type PaymentMethodId,
  type CountryConfig,
  type PaymentMethod,
  formatCurrency,
} from "@/lib/payment-methods";
import { getLanguageForCountry } from "@/utils/country-language";

interface PaymentCountryState {
  /** ISO country code (e.g. "CI", "BR", "US") */
  countryCode: string;
  /** Whether detection is still running */
  detecting: boolean;
  /** Resolved currency for this country */
  currency: CurrencyCode;
  /** Currency symbol (e.g. "$", "CFA", "R$") */
  currencySymbol: string;
  /** Currency display name */
  currencyName: string;
  /** Current language code (e.g. "fr", "en", "pt") */
  language: string;
  /** Country config (name, tax rate, etc.) */
  countryConfig: CountryConfig | null;
  /** All payment methods sorted by priority for this country */
  sortedMethods: PaymentMethod[];
  /** Only currently available (live) methods */
  availableMethods: PaymentMethod[];
  /** Default/recommended payment method */
  defaultMethod: PaymentMethod | null;
  /** Format an amount with the correct currency */
  format: (amount: number) => string;
  /** Country flag emoji */
  flag: string;
}

// Fallback config when country is unknown
const FALLBACK_COUNTRY = "US";
const FALLBACK_CURRENCY: CurrencyCode = "USD";

function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function usePaymentCountry(): PaymentCountryState {
  const { selectedCountry, detecting } = useCountry();
  const { currentLang } = useLanguage();

  return useMemo(() => {
    const code = selectedCountry || FALLBACK_COUNTRY;
    const config = COUNTRY_CONFIGS[code] || null;
    const currency: CurrencyCode = config?.currency || FALLBACK_CURRENCY;
    const info = CURRENCY_INFO[currency] || CURRENCY_INFO.USD;
    const lang = currentLang || getLanguageForCountry(code);

    return {
      countryCode: code,
      detecting,
      currency,
      currencySymbol: info.symbol,
      currencyName: info.name,
      language: lang,
      countryConfig: config,
      sortedMethods: getSortedPaymentMethods(code),
      availableMethods: getAvailablePaymentMethods(code).filter(
        (m) => m.available,
      ),
      defaultMethod: getDefaultPaymentMethod(code),
      format: (amount: number) => formatCurrency(amount, currency),
      flag: getFlag(code),
    };
  }, [selectedCountry, detecting, currentLang]);
}

export default usePaymentCountry;

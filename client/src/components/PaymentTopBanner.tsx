/**
 * PaymentTopBanner — Centered top bar showing auto-detected country, currency & language.
 * Same dark glass design, sits at top of payment pages.
 */
import { motion } from "framer-motion";
import { Globe, RefreshCw, ChevronDown } from "lucide-react";
import { usePaymentCountry } from "@/hooks/usePaymentCountry";
import { useCountry } from "@/contexts/CountryContext";
import { CURRENCY_INFO, type CurrencyCode } from "@/lib/payment-methods";

interface PaymentTopBannerProps {
  /** Optional subtitle under the country/currency line */
  subtitle?: string;
  /** Show a compact version */
  compact?: boolean;
}

export function PaymentTopBanner({
  subtitle,
  compact = false,
}: PaymentTopBannerProps) {
  const {
    countryCode,
    currency,
    currencySymbol,
    currencyName,
    flag,
    language,
    detecting,
    countryConfig,
  } = usePaymentCountry();
  const { reloadDetection } = useCountry();

  if (detecting) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-purple-300 animate-spin" />
          <span className="text-xs text-purple-200">
            Detecting your location…
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-xl border-b border-white/10"
    >
      <div
        className={`max-w-5xl mx-auto px-4 ${compact ? "py-2" : "py-3"} flex items-center justify-center gap-3`}
      >
        {/* Globe icon */}
        <Globe className="w-4 h-4 text-purple-300 flex-shrink-0" />

        {/* Main info */}
        <div className="flex items-center gap-2 text-center">
          <span className="text-lg">{flag}</span>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm font-semibold text-white">
              {countryConfig?.name?.replace(
                /\s*[\u{1F1E6}-\u{1F1FF}]+$/u,
                "",
              ) || countryCode}
            </span>
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="text-xs sm:text-sm text-purple-200 font-medium">
              {currencySymbol} {currencyName}
            </span>
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="text-xs text-purple-300/70 uppercase font-mono">
              {language.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Reload button */}
        <button
          onClick={reloadDetection}
          className="p-1 rounded-full hover:bg-white/10 transition-colors ml-1"
          title="Re-detect location"
        >
          <RefreshCw className="w-3 h-3 text-purple-400" />
        </button>
      </div>

      {subtitle && (
        <div className="text-center pb-2">
          <p className="text-[11px] text-purple-300/60">{subtitle}</p>
        </div>
      )}
    </motion.div>
  );
}

export default PaymentTopBanner;

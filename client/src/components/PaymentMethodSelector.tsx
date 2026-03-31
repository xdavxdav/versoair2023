/**
 * PaymentMethodSelector — Reusable component for multi-method checkout
 * Shows all available payment methods with status (active/greyed out/coming soon)
 * Supports country-specific variations
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, Clock, AlertCircle } from "lucide-react";
import { PaymentLogo } from "@/components/PaymentLogos";
import {
  PAYMENT_METHODS,
  COUNTRY_CONFIGS,
  getSortedPaymentMethods,
  isPaymentMethodAvailable,
  PaymentMethodId,
} from "@/lib/payment-methods";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodId | null;
  onSelect: (methodId: PaymentMethodId) => void;
  amount: number;
  countryCode?: string;
  showComingSoon?: boolean;
  allowedMethods?: PaymentMethodId[];
  disabled?: boolean;
  onPaymentInitiate?: (methodId: PaymentMethodId) => void;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  amount,
  countryCode = "US",
  showComingSoon = true,
  allowedMethods,
  disabled = false,
  onPaymentInitiate,
}: PaymentMethodSelectorProps) {
  const [expandedInfo, setExpandedInfo] = useState<PaymentMethodId | null>(
    null,
  );

  const sortedMethods = useMemo(() => {
    let methods = getSortedPaymentMethods(countryCode);

    // Filter by allowed methods if specified
    if (allowedMethods && allowedMethods.length > 0) {
      methods = methods.filter((m) => allowedMethods.includes(m.id));
    }

    // Filter coming soon if not showing
    if (!showComingSoon) {
      methods = methods.filter((m) => !m.comingSoon);
    }

    return methods;
  }, [countryCode, allowedMethods, showComingSoon]);

  const countryName = COUNTRY_CONFIGS[countryCode]?.name || countryCode;

  return (
    <div className="space-y-4">
      {/* Country & Info */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Payment Methods</p>
          <p className="text-xs text-gray-400">{countryName}</p>
        </div>
        <p className="text-sm text-amber-400 font-medium">{countryCode}</p>
      </div>

      {/* Methods Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sortedMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const isAvailable = method.available && !method.comingSoon;
          const isComingSoon = method.comingSoon;
          const canSelect = isAvailable && !disabled;

          return (
            <motion.div
              key={method.id}
              whileHover={canSelect ? { scale: 1.02 } : {}}
              whileTap={canSelect ? { scale: 0.98 } : {}}
              onClick={() => canSelect && onSelect(method.id)}
              className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-purple-500 bg-purple-500/10"
                  : isAvailable
                    ? "border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/5"
                    : "border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-60"
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                )}
                {isComingSoon && <Clock className="w-5 h-5 text-amber-400" />}
                {!isAvailable && !isComingSoon && (
                  <Lock className="w-5 h-5 text-red-400" />
                )}
              </div>

              {/* Icon & Name */}
              <div className="flex items-center gap-3 mb-2">
                <PaymentLogo methodId={method.id} size={24} />
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">
                    {method.name}
                  </p>
                  {isComingSoon && (
                    <p className="text-[10px] text-amber-400 font-medium">
                      {method.estimatedLaunch}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-300 mb-3 line-clamp-2">
                {method.description}
              </p>

              {/* Quick Info */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-400">
                  <span>Fee:</span>
                  <span className="text-white font-medium">{method.fee}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Time:</span>
                  <span className="text-white font-medium">
                    {method.processingTime}
                  </span>
                </div>
              </div>

              {/* Features Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedInfo(
                    expandedInfo === method.id ? null : method.id,
                  );
                }}
                className="mt-3 w-full py-1.5 rounded text-[11px] font-medium bg-white/10 hover:bg-white/20 text-gray-300 transition-all"
              >
                {expandedInfo === method.id ? "Hide details" : "Show details"}
              </button>

              {/* Expanded Features */}
              <AnimatePresence>
                {expandedInfo === method.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-white/10"
                  >
                    <div className="space-y-1.5">
                      {method.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span className="text-[11px] text-gray-300">
                            {feature}
                          </span>
                        </div>
                      ))}

                      {/* KYC & Verification Info */}
                      <div className="pt-2 border-t border-white/10 mt-2 space-y-1">
                        {(method.requiresKYC ||
                          method.requiresVerification) && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                            <span className="text-[10px] text-amber-300">
                              {method.requiresKYC && "KYC required"}
                              {method.requiresKYC &&
                                method.requiresVerification &&
                                " • "}
                              {method.requiresVerification &&
                                "Identity verification"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Disabled State Overlay */}
              {!canSelect && (
                <div className="absolute inset-0 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-400">
                      {isComingSoon ? "Coming Soon" : "Not available"}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Amount Validation Info */}
      {selectedMethod && (
        <PaymentMethodInfo methodId={selectedMethod} amount={amount} />
      )}
    </div>
  );
}

/**
 * Helper component showing payment method details
 */
function PaymentMethodInfo({
  methodId,
  amount,
}: {
  methodId: PaymentMethodId;
  amount: number;
}) {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return null;

  const isWithinLimits =
    amount >= method.minAmount && amount <= method.maxAmount;
  const limitError =
    amount < method.minAmount
      ? `Minimum ${method.minAmount}`
      : `Maximum ${method.maxAmount}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg text-sm ${
        isWithinLimits
          ? "bg-green-500/10 border border-green-500/30 text-green-300"
          : "bg-red-500/10 border border-red-500/30 text-red-300"
      }`}
    >
      <div className="flex items-center gap-2">
        {isWithinLimits ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
        <span className="font-medium">
          {isWithinLimits
            ? `Amount accepted • Fee: ${method.fee}`
            : `${limitError}`}
        </span>
      </div>
    </motion.div>
  );
}

export default PaymentMethodSelector;

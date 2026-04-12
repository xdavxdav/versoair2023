/**
 * 💎 Pricing & Checkout — GeoAdmin Subscription Tiers
 *
 * Full checkout flow:
 *   1. Browse tiers with monthly/annual toggle
 *   2. Authenticated → "Start 7-Day Trial" (no card needed) or "Subscribe"
 *   3. Unauthenticated → "Sign in to subscribe"
 *   4. After trial expires → payment method selector (13 methods, country-aware)
 *   5. Stripe checkout session → redirect → success/cancel toast
 *
 * Subscriptions are ONLY for GeoAdmin access — not general accounts.
 */

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Check,
  Star,
  Zap,
  Shield,
  Sparkles,
  Crown,
  Loader2,
  CreditCard,
  X,
  Clock,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScrollToTop from "@/components/ScrollToTop";
import { TIERS, TIER_ORDER, type TierKey } from "@/lib/tiers";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaymentCountry } from "@/hooks/usePaymentCountry";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { PaymentLogo } from "@/components/PaymentLogos";
import { type PaymentMethodId } from "@/lib/payment-methods";
import { toast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

// ─── TIER FEATURE HIGHLIGHTS ────────────────────────────────────────────────

const TIER_HIGHLIGHTS: Record<TierKey, string[]> = {
  free: [
    "Basic business listing",
    "1 photo",
    "Community support",
    "Up to 5 products",
    "Basic analytics",
  ],
  essential: [
    "5 photos gallery",
    "Detailed analytics",
    "Email support",
    "Up to 20 products",
    "Data export (CSV)",
    "3 social media links",
  ],
  verified: [
    "15 photos gallery",
    "Full analytics + competitor insights",
    "Priority email support",
    "Up to 100 products",
    "Custom URL & video showcase",
    "Promoted listing",
    "Revenue simulator",
  ],
  max: [
    "50 photos gallery",
    "Predictive analytics",
    "Live chat support",
    "Up to 500 products",
    "Newsletter feature",
    "Category spotlight",
    "API access",
  ],
  enterprise: [
    "Unlimited photos & products",
    "Predictive analytics",
    "Dedicated account manager",
    "All features unlocked",
    "Custom integrations",
    "Premium partner badge",
  ],
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────────

export default function Pricing() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const highlightTier = (params.get("tier") as TierKey) || null;
  const planParam = (params.get("plan") as TierKey) || null;
  const source = params.get("source") || null;
  const status = params.get("status") || null;
  const [, setLocation] = useLocation();

  // Auth & subscription state
  const {
    isAuthenticated,
    user,
    tier: currentTier,
    loading: authLoading,
    refetch,
  } = useSubscription();

  // Payment country auto-detection
  const { countryCode, flag, sortedMethods, availableMethods } =
    usePaymentCountry();

  // Local state
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [checkoutTier, setCheckoutTier] = useState<TierKey | null>(planParam);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentMethodId | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Has user already used their trial?
  const hasUsedTrial =
    !!(user as any)?.trialTier || !!(user as any)?.trialStartedAt;
  // Is trial currently active?
  const isTrialActive =
    !!(user as any)?.trialExpiresAt &&
    new Date((user as any).trialExpiresAt) > new Date();

  // ─── Handle Stripe return URLs ──────────────────────────────────────────────

  useEffect(() => {
    if (status === "success") {
      toast({
        title: "🎉 Payment successful!",
        description:
          "Your subscription is now active. Welcome to GeoAdmin Pro!",
      });
      window.history.replaceState({}, "", "/pricing");
      refetch();
    } else if (status === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "No charges were made. You can try again anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/pricing");
    }
  }, [status]);

  // ─── Start free trial ───────────────────────────────────────────────────────

  const handleStartTrial = async (tier: TierKey) => {
    if (!isAuthenticated) {
      setLocation(`/apply?redirect=/pricing&plan=${tier}`);
      return;
    }

    setStartingTrial(true);
    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const res = await fetch("/auth/start-trial", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "🎉 Trial activated!",
          description: `Your 7-day ${TIERS[tier].name} trial is now active. Explore GeoAdmin!`,
        });
        await refetch();
        setLocation("/geo-admin?welcome=new");
      } else if (res.status === 409) {
        toast({
          title: "Trial already used",
          description:
            "You've already used your free trial. Choose a payment method to subscribe.",
          variant: "destructive",
        });
        setCheckoutTier(tier);
      } else {
        toast({
          title: "Could not start trial",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection error",
        description: "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartingTrial(false);
    }
  };

  // ─── Initiate Stripe checkout ───────────────────────────────────────────────

  const handleCheckout = async () => {
    if (!checkoutTier || !user) return;

    setCheckoutLoading(true);
    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const res = await fetch("/api/v1/payments/create-checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          targetTier: checkoutTier,
          billingCycle,
        }),
      });
      const data = await res.json();

      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast({
          title: "Checkout error",
          description:
            data.error ||
            "Payment processing is not available right now. Try wallet or PayPal.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection error",
        description: "Could not connect to payment server.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ─── Handle plan selection ──────────────────────────────────────────────────

  const handleSelectPlan = (tier: TierKey) => {
    if (tier === "free") {
      if (!isAuthenticated) {
        setLocation("/apply");
      } else {
        setLocation("/geo-admin");
      }
      return;
    }
    if (tier === "enterprise") {
      setCheckoutTier("enterprise");
      return;
    }

    // Not signed in → go to apply page with redirect back
    if (!isAuthenticated) {
      setLocation(`/apply?redirect=/pricing&plan=${tier}`);
      return;
    }

    // Already on this tier or higher
    if (TIER_ORDER.indexOf(currentTier) >= TIER_ORDER.indexOf(tier)) {
      toast({
        title: "Already subscribed",
        description: `You're already on the ${TIERS[currentTier].name} plan or higher.`,
      });
      return;
    }

    // Never used trial → start trial
    if (!hasUsedTrial) {
      handleStartTrial(tier);
      return;
    }

    // Trial used or expired → open checkout modal
    setCheckoutTier(tier);
  };

  // ─── Button label logic ─────────────────────────────────────────────────────

  const getButtonLabel = (tierKey: TierKey) => {
    if (tierKey === "free")
      return isAuthenticated ? "Go to GeoAdmin" : "Get Started";
    if (tierKey === "enterprise") return "Contact Sales";

    if (!isAuthenticated) return "Sign up to subscribe";

    if (currentTier === tierKey) return "Current Plan ✓";
    if (TIER_ORDER.indexOf(currentTier) > TIER_ORDER.indexOf(tierKey))
      return "Downgrade";

    if (!hasUsedTrial) return "Start 7-Day Free Trial";

    return "Subscribe Now";
  };

  const getButtonDisabled = (tierKey: TierKey) => {
    if (tierKey === "free" || tierKey === "enterprise") return false;
    if (currentTier === tierKey) return true;
    if (startingTrial) return true;
    return false;
  };

  // ─── Checkout amount ───────────────────────────────────────────────────────

  const checkoutAmount = checkoutTier
    ? billingCycle === "monthly"
      ? TIERS[checkoutTier].monthlyPrice
      : TIERS[checkoutTier].annualPrice
    : 0;

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pb-24">
      {/* Hero */}
      <div className="relative pt-20 pb-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <Globe className="h-3.5 w-3.5" />
            GeoAdmin Subscriptions
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Grow Your Visibility
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mb-2">
            Choose the tier that matches your ambition. Every upgrade multiplies
            your reach on GeoAdmin.
          </p>
          <p className="text-sm text-slate-500 max-w-lg mx-auto mb-8">
            All paid tiers include a 7-day free trial — no credit card required.
          </p>

          {/* Current status banner */}
          {isAuthenticated && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm mb-6">
              <span className="text-slate-400">Your plan:</span>
              <Badge className={`${TIERS[currentTier].badgeColor} text-xs`}>
                {TIERS[currentTier].icon} {TIERS[currentTier].name}
              </Badge>
              {isTrialActive && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                  <Clock className="h-3 w-3 mr-1" /> Trial active
                </Badge>
              )}
            </div>
          )}

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] max-w-xs mx-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white/10 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-white/10 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Annual
              <span className="text-emerald-400 text-xs ml-1.5">–17%</span>
            </button>
          </div>

          {source && (
            <p className="text-xs text-emerald-400 mt-3">
              🎯 Recommended tier highlighted based on your needs
            </p>
          )}
        </div>
      </div>

      {/* ═══ PRICING CARDS ═══ */}
      <div className="max-w-[95vw] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const isHighlighted = highlightTier === tierKey;
            const isPopular = tier.popular;
            const isCurrent = isAuthenticated && currentTier === tierKey;
            const price =
              billingCycle === "monthly"
                ? tier.monthlyPrice
                : Math.round(tier.annualPrice / 12);
            const features = TIER_HIGHLIGHTS[tierKey];

            return (
              <div
                key={tierKey}
                className={`group relative rounded-2xl border transition-all flex flex-col ${
                  isCurrent
                    ? "bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-500/40 ring-1 ring-emerald-500/20"
                    : isHighlighted || isPopular
                      ? "bg-gradient-to-br from-emerald-600/15 to-teal-600/15 border-emerald-500/30 shadow-xl shadow-emerald-500/10 lg:scale-[1.03] z-10"
                      : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05]"
                } p-5 backdrop-blur`}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-0 group-hover:opacity-[0.03] transition-opacity rounded-2xl" />

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white border-0 shadow-lg text-[10px]">
                      Current Plan
                    </Badge>
                  </div>
                )}
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white border-0 shadow-lg text-[10px]">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isHighlighted && !isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white border-0 shadow-lg text-[10px]">
                      Recommended
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{tier.icon}</span>
                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                </div>
                <p className="text-slate-500 text-xs mb-3">{tier.tagline}</p>

                {/* Price */}
                <div className="mb-1">
                  {tier.monthlyPrice === 0 ? (
                    <span className="text-2xl font-bold text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">
                        ${price}
                      </span>
                      <span className="text-slate-500 text-sm ml-1">/mo</span>
                    </>
                  )}
                </div>
                {billingCycle === "annual" && tier.monthlyPrice > 0 && (
                  <p className="text-[10px] text-emerald-400 mb-3">
                    ${tier.annualPrice}/yr — save $
                    {tier.monthlyPrice * 12 - tier.annualPrice}
                  </p>
                )}
                {(billingCycle === "monthly" || tier.monthlyPrice === 0) && (
                  <p className="text-[10px] text-slate-500 mb-3">
                    {tier.rankingPower}x visibility power
                  </p>
                )}

                <p className="text-[11px] text-slate-400 mb-4 italic leading-relaxed">
                  {tier.visibilityNarrative}
                </p>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSelectPlan(tierKey)}
                  disabled={getButtonDisabled(tierKey) || authLoading}
                  className={`w-full mb-5 font-semibold text-sm relative z-10 ${
                    isCurrent
                      ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 cursor-default"
                      : isHighlighted || isPopular
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : tierKey === "free"
                          ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                          : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  }`}
                >
                  {startingTrial && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {getButtonLabel(tierKey)}
                </Button>

                {/* Features */}
                <div className="space-y-2.5 flex-1">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-[11px] leading-snug">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ PAYMENT METHODS OVERVIEW ═══ */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            Accepted Payment Methods
          </h2>
          <p className="text-sm text-slate-400">
            {flag} Auto-detected: {countryCode} • {availableMethods.length}{" "}
            methods available in your region
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          {sortedMethods.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                m.available
                  ? "bg-white/[0.04] border-white/[0.08] text-white"
                  : "bg-white/[0.02] border-white/[0.04] text-slate-600"
              }`}
            >
              <PaymentLogo methodId={m.id} size={18} />
              <span className="text-xs font-medium">{m.name}</span>
              {m.comingSoon && (
                <span className="text-[9px] text-amber-400 font-medium">
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-600">
          Wallet • PayPal • Apple Pay • Google Pay • Cash App • Venmo • Interac
          • PIX • SEPA • Bank Transfer • Credit Card (Q2) • Crypto (Q2) • Mobile
          Money (Q3)
        </p>
      </div>

      {/* ═══ FAQ ═══ */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {[
            {
              q: "What are these subscriptions for?",
              a: "These tiers are specifically for GeoAdmin — your business intelligence dashboard. They multiply your visibility in the directory, unlock analytics features, and give you competitive insights. They do NOT affect general account access.",
            },
            {
              q: "Do you offer a free trial?",
              a: "Yes! All paid plans come with a 7-day free trial. No credit card required. Try any tier risk-free.",
            },
            {
              q: "How many payment methods are available?",
              a: "We support 13+ payment methods including Platform Wallet, PayPal, Apple Pay, Google Pay, Cash App, Venmo, Interac (Canada), PIX (Brazil), SEPA (Europe), Bank Transfer, and more coming soon like Stripe cards, Crypto, and Mobile Money for Africa.",
            },
            {
              q: "Can I upgrade or downgrade anytime?",
              a: "Absolutely. You can change your plan at any time with prorated billing.",
            },
            {
              q: "What does visibility power mean?",
              a: "Each tier multiplies how often your business appears in search results. Essential is 2x, Verified is 3x, Max is 5x, and Enterprise is 10x.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition-all"
            >
              <p className="font-semibold text-white text-sm mb-1.5">
                {item.q}
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CHECKOUT MODAL ═══ */}
      <AnimatePresence>
        {checkoutTier && checkoutTier !== "free" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCheckoutTier(null);
            }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/10 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">
                        Subscribe to {TIERS[checkoutTier].name}
                      </h3>
                      <p className="text-slate-400 text-xs">
                        GeoAdmin {TIERS[checkoutTier].tagline}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCheckoutTier(null)}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Not authenticated */}
                {!isAuthenticated && (
                  <div className="text-center py-6">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-7 w-7 text-amber-400" />
                    </div>
                    <h4 className="text-white font-semibold mb-2">
                      Sign in required
                    </h4>
                    <p className="text-slate-400 text-sm mb-4">
                      Create a Subscriber account to unlock GeoAdmin features.
                    </p>
                    <Button
                      onClick={() =>
                        setLocation(
                          `/apply?redirect=/pricing&plan=${checkoutTier}`,
                        )
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Sign up as Premium Subscriber
                    </Button>
                  </div>
                )}

                {/* Authenticated checkout flow */}
                {isAuthenticated && (
                  <>
                    {/* Order summary */}
                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-300">Plan</span>
                        <span className="text-sm text-white font-semibold">
                          {TIERS[checkoutTier].icon} {TIERS[checkoutTier].name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-300">Billing</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                              billingCycle === "monthly"
                                ? "bg-white/10 text-white"
                                : "text-slate-500 hover:text-white"
                            }`}
                          >
                            Monthly
                          </button>
                          <button
                            onClick={() => setBillingCycle("annual")}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                              billingCycle === "annual"
                                ? "bg-white/10 text-white"
                                : "text-slate-500 hover:text-white"
                            }`}
                          >
                            Annual –17%
                          </button>
                        </div>
                      </div>
                      <div className="h-px bg-white/10 my-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-semibold">
                          Total
                        </span>
                        <div className="text-right">
                          <span className="text-xl font-bold text-white">
                            $
                            {billingCycle === "monthly"
                              ? TIERS[checkoutTier].monthlyPrice
                              : TIERS[checkoutTier].annualPrice}
                          </span>
                          <span className="text-slate-500 text-xs ml-1">
                            /{billingCycle === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                      </div>
                      {billingCycle === "annual" && (
                        <p className="text-[10px] text-emerald-400 text-right mt-1">
                          Save $
                          {TIERS[checkoutTier].monthlyPrice * 12 -
                            TIERS[checkoutTier].annualPrice}
                          /year
                        </p>
                      )}
                    </div>

                    {/* Trial CTA (if not used yet) */}
                    {!hasUsedTrial && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <Zap className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-white font-semibold text-sm">
                              Start with a free 7-day trial
                            </p>
                            <p className="text-emerald-300/70 text-xs mt-0.5">
                              No credit card needed. Full access to{" "}
                              {TIERS[checkoutTier].name} features.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleStartTrial(checkoutTier)}
                          disabled={startingTrial}
                          className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          {startingTrial && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          Start Free Trial — No Card Required
                        </Button>
                        <div className="h-px bg-white/10 my-4" />
                        <p className="text-slate-500 text-[10px] text-center">
                          Or subscribe now with a payment method below
                        </p>
                      </div>
                    )}

                    {/* Payment Method Selector */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Choose payment method {flag}
                      </p>
                      <PaymentMethodSelector
                        selectedMethod={selectedPayment}
                        onSelect={setSelectedPayment}
                        amount={checkoutAmount}
                        countryCode={countryCode}
                        showComingSoon={true}
                        disabled={checkoutLoading}
                      />
                    </div>

                    {/* Checkout button */}
                    {selectedPayment && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Button
                          onClick={handleCheckout}
                          disabled={checkoutLoading}
                          className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-500/20"
                        >
                          {checkoutLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              Processing…
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-5 w-5 mr-2" />
                              Pay $
                              {billingCycle === "monthly"
                                ? TIERS[checkoutTier].monthlyPrice
                                : TIERS[checkoutTier].annualPrice}
                              {billingCycle === "monthly" ? "/mo" : "/yr"} —{" "}
                              {TIERS[checkoutTier].name}
                            </>
                          )}
                        </Button>
                        <p className="text-[10px] text-slate-600 text-center mt-2">
                          Secured by Stripe • Cancel anytime • 30-day money-back
                          guarantee
                        </p>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}

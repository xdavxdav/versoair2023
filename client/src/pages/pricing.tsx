import { Check, X, Shield, Zap, Star, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { TIERS, TIER_ORDER, TIER_FEATURES, type TierKey } from "@/lib/tiers";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const TIER_ICONS: Record<TierKey, React.ReactNode> = {
  free: <Star className="h-6 w-6" />,
  essential: <Zap className="h-6 w-6" />,
  verified: <Shield className="h-6 w-6" />,
  max: <Sparkles className="h-6 w-6" />,
  enterprise: <Crown className="h-6 w-6" />,
};

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
    "Custom URL",
    "Video showcase",
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
    "Keyword tracking",
  ],
  enterprise: [
    "Unlimited photos & products",
    "Predictive analytics",
    "Dedicated account manager",
    "Total market dominance",
    "All features unlocked",
    "Custom integrations",
    "Premium partner badge",
  ],
};

export default function Pricing() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const highlightTier = (params.get("tier") as TierKey) || null;
  const source = params.get("source") || null;
  const [, setLocation] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  const handleSelectPlan = (tier: TierKey) => {
    if (tier === "free") {
      setLocation("/auth/signin");
    } else if (tier === "enterprise") {
      setLocation("/contact");
    } else {
      // For now, navigate to sign-in with the selected tier
      setLocation(`/auth/signin?plan=${tier}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-12 px-4">
        <div className="max-w-[95vw] mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Grow Your Visibility
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Choose the tier that matches your ambition. Every upgrade multiplies
            your reach.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual <span className="text-emerald-400 ml-1">Save 17%</span>
            </button>
          </div>

          {source && (
            <p className="text-sm text-emerald-400 mt-2">
              🎯 Recommended tier highlighted based on your needs
            </p>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-[95vw] mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-5">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const isHighlighted = highlightTier === tierKey;
            const isPopular = tier.popular;
            const price =
              billingCycle === "monthly"
                ? tier.monthlyPrice
                : Math.round(tier.annualPrice / 12);
            const features = TIER_HIGHLIGHTS[tierKey];

            return (
              <div
                key={tierKey}
                className={`relative rounded-xl border transition-all flex flex-col ${
                  isHighlighted || isPopular
                    ? "bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-emerald-500/50 shadow-xl shadow-emerald-500/20 md:scale-105 z-10"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                } p-6 backdrop-blur`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white border-0 shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isHighlighted && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white border-0 shadow-lg">
                      Recommended
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{tier.icon}</span>
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">{tier.tagline}</p>

                <div className="mb-1">
                  {tier.monthlyPrice === 0 ? (
                    <span className="text-3xl font-bold text-white">Free</span>
                  ) : tierKey === "enterprise" ? (
                    <>
                      <span className="text-3xl font-bold text-white">
                        ${price}
                      </span>
                      <span className="text-slate-400 text-sm ml-1">/mo</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">
                        ${price}
                      </span>
                      <span className="text-slate-400 text-sm ml-1">/mo</span>
                    </>
                  )}
                </div>
                {billingCycle === "annual" && tier.monthlyPrice > 0 && (
                  <p className="text-xs text-emerald-400 mb-4">
                    ${tier.annualPrice}/yr (save $
                    {tier.monthlyPrice * 12 - tier.annualPrice})
                  </p>
                )}
                {(billingCycle === "monthly" || tier.monthlyPrice === 0) && (
                  <p className="text-xs text-slate-500 mb-4">
                    {tier.rankingPower}x visibility power
                  </p>
                )}

                <p className="text-xs text-slate-400 mb-4 italic">
                  {tier.visibilityNarrative}
                </p>

                <Button
                  onClick={() => handleSelectPlan(tierKey)}
                  className={`w-full mb-6 font-semibold ${
                    isHighlighted || isPopular
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : tierKey === "free"
                        ? "bg-slate-700 hover:bg-slate-600 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  {tierKey === "free"
                    ? "Get Started"
                    : tierKey === "enterprise"
                      ? "Contact Sales"
                      : "Start 7-Day Trial"}
                </Button>

                <div className="space-y-3 flex-1">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-xs">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "Do you offer a free trial?",
              a: "Yes! All paid plans come with a 7-day free trial. No credit card required.",
            },
            {
              q: "Can I upgrade or downgrade anytime?",
              a: "Absolutely. You can change your plan at any time with prorated billing.",
            },
            {
              q: "What does visibility power mean?",
              a: "Each tier multiplies how often your business appears in search results. Essential is 2x, Verified is 3x, Max is 5x, and Enterprise is 10x.",
            },
            {
              q: "What about data security?",
              a: "We use enterprise-grade encryption and comply with all major security standards including ISO 27001.",
            },
            {
              q: "Do you offer custom pricing?",
              a: "Yes, for Enterprise customers with specific requirements, we can create custom pricing and SLAs.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 hover:bg-slate-800/50 transition-all"
            >
              <p className="font-semibold text-white mb-2">{item.q}</p>
              <p className="text-slate-400 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}

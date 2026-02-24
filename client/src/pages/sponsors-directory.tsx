"use client";

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Heart,
  Globe,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Award,
  CheckCircle,
  ArrowRight,
  Lock,
  Unlock,
  Star,
  Building2,
  Briefcase,
  Target,
  Megaphone,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import ScrollToTop from "@/components/ScrollToTop";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const viewport = { once: true, margin: "-80px" };

// Sponsorship eligibility rules based on subscription tier
const SPONSORSHIP_RULES = {
  free: {
    tier: "Free",
    eligible: false,
    types: [],
    reason: "Upgrade to Essential or higher to become a sponsor",
    color: "from-gray-500 to-gray-600",
    icon: Lock,
    message: "Free accounts cannot sponsor",
  },
  essential: {
    tier: "Essential",
    eligible: true,
    types: ["informal"],
    reason: "Eligible for Informal Sponsorship only",
    color: "from-blue-500 to-blue-600",
    icon: Unlock,
    message: "Can sponsor artisan programs, workshops, or events",
    maxAmount: "$5,000 - $15,000/year",
  },
  verified: {
    tier: "Pro Verified",
    eligible: true,
    types: ["informal", "formal"],
    reason: "Eligible for both Informal & Formal Sponsorship",
    color: "from-emerald-500 to-emerald-600",
    icon: CheckCircle,
    message: "Full access to Friend → Supporter tier sponsorship",
    maxAmount: "$50,000+/year",
  },
  max: {
    tier: "Pro Max",
    eligible: true,
    types: ["informal", "formal", "ambassador"],
    reason: "Eligible for all Sponsorship levels + Ambassador tier",
    color: "from-amber-500 to-amber-600",
    icon: Star,
    message: "Access to Ambassador & above tiers with strategic partnerships",
    maxAmount: "$100,000+/year",
  },
  enterprise: {
    tier: "Enterprise",
    eligible: true,
    types: ["informal", "formal", "ambassador", "patron"],
    reason: "Full Access - All Sponsorship tiers available",
    color: "from-purple-500 to-purple-600",
    icon: Award,
    message:
      "Premium Patron tier + dedicated partnership manager + co-branding",
    maxAmount: "$100,000 - $500,000+/year",
  },
};

const SPONSORSHIP_TYPES = [
  {
    name: "Informal Sponsorship",
    description:
      "Support specific artisan projects, workshops, or cultural events",
    tiers: ["Friend", "Community Contributor"],
    minTier: "essential",
    icon: Gift,
    color: "from-rose-500 to-pink-500",
    examples: [
      "Workshop sponsorship ($1K-$5K)",
      "Artisan apprenticeship support",
      "Cultural event co-hosting",
      "Community program funding",
    ],
  },
  {
    name: "Formal Sponsorship",
    description:
      "Strategic annual partnerships with brand visibility and impact reporting",
    tiers: ["Supporter", "Ambassador"],
    minTier: "verified",
    icon: Briefcase,
    color: "from-blue-500 to-cyan-500",
    examples: [
      "Annual program sponsorship",
      "Brand placement in materials",
      "Impact reports & transparency",
      "Co-marketing opportunities",
    ],
  },
  {
    name: "Ambassador Programs",
    description:
      "Executive-level partnerships including board seats and program co-creation",
    tiers: ["Ambassador", "Platinum"],
    minTier: "max",
    icon: Megaphone,
    color: "from-amber-500 to-orange-500",
    examples: [
      "C-level board seat",
      "Program co-creation & leadership",
      "International visibility",
      "Quarterly strategy sessions",
    ],
  },
  {
    name: "Enterprise Partnerships",
    description:
      "Custom packages including naming rights, dedicated teams, and ESG certification",
    tiers: ["Patron"],
    minTier: "enterprise",
    icon: Building2,
    color: "from-purple-500 to-pink-500",
    examples: [
      "Naming rights (centers, programs)",
      "Dedicated partnership team",
      "Custom ESG reporting",
      "Global co-branding rights",
    ],
  },
];

const ACTIVE_SPONSORS = [
  {
    name: "UNESCO",
    tier: "Patron",
    amount: "$250,000+/year",
    rating: 5,
    description: "Cultural heritage preservation and education programs",
    logo: "🌍",
  },
  {
    name: "Global Consulting Group",
    tier: "Ambassador",
    amount: "$120,000/year",
    rating: 5,
    description: "Business mentorship and development programs",
    logo: "💼",
  },
  {
    name: "Innovate Labs",
    tier: "Supporter",
    amount: "$75,000/year",
    rating: 4.5,
    description: "Technology and startup ecosystem support",
    logo: "🚀",
  },
  {
    name: "Cultural Heritage Fund",
    tier: "Friend",
    amount: "$15,000/year",
    rating: 4.5,
    description: "Artisan apprenticeship and training initiatives",
    logo: "🎨",
  },
];

export default function SponsorsDirectory() {
  const { isAuthenticated, user, tier, loading } = useSubscription();
  const [, navigate] = useLocation();
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);

  const tierLevel = tier?.toLowerCase() || "free";
  const eligibilityData =
    SPONSORSHIP_RULES[tierLevel as keyof typeof SPONSORSHIP_RULES];
  const isEligible = eligibilityData?.eligible || false;

  const handleSponsorshipCTA = () => {
    if (!isAuthenticated) {
      navigate("/auth/signin?redirect=sponsor");
      return;
    }

    if (!isEligible) {
      setShowEligibilityModal(true);
      return;
    }

    navigate("/sponsor/apply");
  };

  const canAccessType = (minTier: string) => {
    if (!isAuthenticated) return false;
    const minTierIndex = [
      "free",
      "essential",
      "verified",
      "max",
      "enterprise",
    ].indexOf(minTier);
    const userTierIndex = [
      "free",
      "essential",
      "verified",
      "max",
      "enterprise",
    ].indexOf(tierLevel);
    return userTierIndex >= minTierIndex;
  };

  return (
    <>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Hero Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6"
            >
              Become a Sponsor
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-300 mb-8"
            >
              Support artisans, cultural initiatives, and creative communities.
              Discover sponsorship opportunities tailored to your organization's
              impact goals and commitment level.
            </motion.p>

            {isAuthenticated && (
              <motion.div
                variants={fadeInUp}
                className="inline-block px-6 py-2 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-full border border-emerald-400/30"
              >
                <span className="text-emerald-300">
                  Your Tier: <strong>{eligibilityData?.tier}</strong>
                </span>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Eligibility Status Card */}
        {isAuthenticated && (
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeInUp}
            className="relative py-12 px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-4xl mx-auto">
              <div
                className={`rounded-2xl border-2 p-8 backdrop-blur-sm ${
                  isEligible
                    ? "bg-emerald-500/10 border-emerald-400/30"
                    : "bg-amber-500/10 border-amber-400/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {isEligible ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Lock className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {isEligible
                        ? "✅ You're Eligible"
                        : "🔒 Eligibility Required"}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      {eligibilityData?.reason}
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      {eligibilityData?.message}
                    </p>

                    {isEligible && (
                      <div className="flex flex-wrap gap-2">
                        {eligibilityData?.types.map((type) => (
                          <span
                            key={type}
                            className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/50 rounded-full text-sm text-emerald-300"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}

                    {!isEligible && (
                      <Button
                        onClick={() => navigate("/pricing")}
                        className="mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                      >
                        Upgrade to Become Eligible
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Sponsorship Types Grid */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-6xl mx-auto">
            <motion.h2
              variants={fadeInUp}
              className="text-4xl font-bold mb-4 text-center text-white"
            >
              Sponsorship Types
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-center text-gray-400 mb-12 max-w-2xl mx-auto"
            >
              Choose the sponsorship model that best aligns with your
              organization's values and goals
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6">
              {SPONSORSHIP_TYPES.map((type) => {
                const canAccess = canAccessType(type.minTier);
                return (
                  <motion.div
                    key={type.name}
                    variants={fadeInUp}
                    className={`rounded-xl border-2 p-6 backdrop-blur-sm transition-all ${
                      canAccess
                        ? `bg-gradient-to-br ${type.color}/10 border-${type.color.split("-")[1]}-400/30 hover:border-${type.color.split("-")[1]}-400/60`
                        : "bg-gray-500/5 border-gray-600/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <type.icon className="w-5 h-5" />
                          {type.name}
                        </h3>
                        {!canAccess && (
                          <span className="text-xs text-gray-500 mt-1">
                            Requires{" "}
                            {
                              SPONSORSHIP_RULES[
                                type.minTier as keyof typeof SPONSORSHIP_RULES
                              ]?.tier
                            }
                          </span>
                        )}
                      </div>
                      {canAccess && isEligible && (
                        <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-400/50 rounded text-xs text-emerald-300 font-semibold">
                          Eligible
                        </span>
                      )}
                    </div>

                    <p className="text-gray-300 mb-4 text-sm">
                      {type.description}
                    </p>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-semibold">
                          Sponsorship Tiers
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {type.tiers.map((tier) => (
                            <span
                              key={tier}
                              className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300"
                            >
                              {tier}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-semibold">
                          Examples
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1">
                          {type.examples.slice(0, 2).map((example, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Active Sponsors Showcase */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="py-20 px-4 sm:px-6 lg:px-8 bg-black/30"
        >
          <div className="max-w-6xl mx-auto">
            <motion.h2
              variants={fadeInUp}
              className="text-4xl font-bold mb-4 text-center text-white"
            >
              Active Sponsors
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-center text-gray-400 mb-12"
            >
              Organizations making a real impact in our community
            </motion.p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ACTIVE_SPONSORS.map((sponsor) => (
                <motion.div
                  key={sponsor.name}
                  variants={fadeInUp}
                  className="rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 p-6 hover:border-slate-500/80 transition-all"
                >
                  <div className="text-4xl mb-3">{sponsor.logo}</div>
                  <h3 className="font-bold text-white mb-1">{sponsor.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded text-emerald-300">
                      {sponsor.tier}
                    </span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(sponsor.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {sponsor.description}
                  </p>
                  <p className="text-xs font-semibold text-emerald-400">
                    {sponsor.amount}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Call to Action Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              variants={fadeInUp}
              className="text-4xl font-bold mb-6 text-white"
            >
              Ready to Make an Impact?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-300 mb-8"
            >
              {!isAuthenticated
                ? "Join our platform to unlock sponsorship opportunities and support meaningful initiatives."
                : isEligible
                  ? "Explore sponsorship opportunities and start your partnership journey today."
                  : "Upgrade your account to unlock premium sponsorship options."}
            </motion.p>

            <motion.div variants={fadeInUp}>
              <Button
                onClick={handleSponsorshipCTA}
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold px-8 py-6 text-lg rounded-lg"
              >
                {!isAuthenticated
                  ? "Sign In to Sponsor"
                  : isEligible
                    ? "Explore Sponsorship"
                    : "Upgrade to Become Eligible"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </div>

      {/* Eligibility Modal */}
      {showEligibilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-xl p-8 max-w-md mx-4 border border-slate-700"
          >
            <h3 className="text-2xl font-bold text-white mb-3">
              Upgrade Required
            </h3>
            <p className="text-gray-300 mb-6">
              Your current tier ({eligibilityData?.tier}) has limited
              sponsorship options. Upgrade to access more sponsorship types and
              higher investment levels.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/pricing")}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
              >
                View Upgrade Plans
              </Button>
              <Button
                onClick={() => setShowEligibilityModal(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

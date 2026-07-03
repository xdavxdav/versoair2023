/**
 * 🛸 Business Growth Engine - Subscription Truth Table
 * Central config driving all tier logic, feature flags, ranking weights, and visibility narratives.
 *
 * Tier Hierarchy (YellowPages + GoAfricaOnline model):
 *   Free → Essential → Verified → Max → Enterprise
 *   1x  →    2x     →    3x    →  5x →    10x
 */

// ─── TIER DEFINITIONS ──────────────────────────────────────────────────────────

export type TierKey = "free" | "essential" | "verified" | "max" | "enterprise";

export interface TierDefinition {
  key: TierKey;
  name: string;
  tagline: string;
  logicKey: string;
  rankingPower: number;
  visibilityNarrative: string;
  color: string; // Tailwind color key
  badgeColor: string; // Tailwind badge classes
  meterZone: "red" | "yellow" | "green" | "purple";
  meterPercent: number; // 0-100 position on the visibility gauge
  icon: string;
  monthlyPrice: number; // USD
  annualPrice: number; // USD (discount)
  popular?: boolean; // "Most Popular" badge
}

export const TIERS: Record<TierKey, TierDefinition> = {
  free: {
    key: "free",
    name: "Free",
    tagline: "Get Listed",
    logicKey: "standard",
    rankingPower: 1,
    visibilityNarrative: "Visible only to direct searches.",
    color: "gray",
    badgeColor: "bg-gray-100 text-gray-700 border-gray-300",
    meterZone: "red",
    meterPercent: 15,
    icon: "📋",
    monthlyPrice: 0,
    annualPrice: 0,
  },
  essential: {
    key: "essential",
    name: "Essential",
    tagline: "The Entry Point",
    logicKey: "basic_boost",
    rankingPower: 2,
    visibilityNarrative: "Twice as likely to be discovered.",
    color: "blue",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-300",
    meterZone: "yellow",
    meterPercent: 35,
    icon: "⚡",
    monthlyPrice: 29,
    annualPrice: 290,
  },
  verified: {
    key: "verified",
    name: "Pro Verified",
    tagline: "The Sweet Spot",
    logicKey: "full_compete",
    rankingPower: 3,
    visibilityNarrative: "Dominating the category search.",
    color: "emerald",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-300",
    meterZone: "green",
    meterPercent: 60,
    icon: "✅",
    monthlyPrice: 79,
    annualPrice: 790,
    popular: true,
  },
  max: {
    key: "max",
    name: "Pro Max",
    tagline: "The Power Move",
    logicKey: "market_leader",
    rankingPower: 5,
    visibilityNarrative: "Top-tier placement + Newsletter reach.",
    color: "purple",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-300",
    meterZone: "purple",
    meterPercent: 85,
    icon: "🚀",
    monthlyPrice: 149,
    annualPrice: 1490,
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    tagline: "Total Market Dominance",
    logicKey: "custom",
    rankingPower: 10,
    visibilityNarrative: "Total Market Dominance.",
    color: "amber",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-400",
    meterZone: "purple",
    meterPercent: 100,
    icon: "👑",
    monthlyPrice: 499,
    annualPrice: 4990,
  },
};

// Ordered tier list for comparisons & modals
export const TIER_ORDER: TierKey[] = [
  "free",
  "essential",
  "verified",
  "max",
  "enterprise",
];

export function getTierIndex(tier: TierKey): number {
  return TIER_ORDER.indexOf(tier);
}

export function isHigherTier(current: TierKey, required: TierKey): boolean {
  return getTierIndex(current) >= getTierIndex(required);
}

// ─── FEATURE FLAGS ──────────────────────────────────────────────────────────────

export interface TierFeatures {
  photos: number;
  analytics: "basic" | "detailed" | "full" | "predictive";
  support: "community" | "email" | "priority_email" | "chat" | "dedicated";
  badges: string[];
  maxProducts: number;
  customUrl: boolean;
  competitorInsights: boolean;
  keywordTracking: boolean;
  newsletterFeature: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  exportData: boolean;
  socialMediaLinks: number;
  videoShowcase: boolean;
  promotedListing: boolean;
  categorySpotlight: boolean;
  revenueSimulator: boolean;
}

export const TIER_FEATURES: Record<TierKey, TierFeatures> = {
  free: {
    photos: 1,
    analytics: "basic",
    support: "community",
    badges: [],
    maxProducts: 5,
    customUrl: false,
    competitorInsights: false,
    keywordTracking: false,
    newsletterFeature: false,
    prioritySupport: false,
    apiAccess: false,
    exportData: false,
    socialMediaLinks: 1,
    videoShowcase: false,
    promotedListing: false,
    categorySpotlight: false,
    revenueSimulator: false,
  },
  essential: {
    photos: 5,
    analytics: "detailed",
    support: "email",
    badges: ["verified_presence"],
    maxProducts: 20,
    customUrl: false,
    competitorInsights: false,
    keywordTracking: false,
    newsletterFeature: false,
    prioritySupport: false,
    apiAccess: false,
    exportData: true,
    socialMediaLinks: 3,
    videoShowcase: false,
    promotedListing: false,
    categorySpotlight: false,
    revenueSimulator: false,
  },
  verified: {
    photos: 15,
    analytics: "full",
    support: "priority_email",
    badges: ["verified_pro", "priority_tag"],
    maxProducts: 100,
    customUrl: true,
    competitorInsights: true,
    keywordTracking: true,
    newsletterFeature: false,
    prioritySupport: true,
    apiAccess: false,
    exportData: true,
    socialMediaLinks: 5,
    videoShowcase: true,
    promotedListing: true,
    categorySpotlight: false,
    revenueSimulator: true,
  },
  max: {
    photos: 50,
    analytics: "predictive",
    support: "chat",
    badges: ["market_leader", "featured", "top_rated"],
    maxProducts: 500,
    customUrl: true,
    competitorInsights: true,
    keywordTracking: true,
    newsletterFeature: true,
    prioritySupport: true,
    apiAccess: true,
    exportData: true,
    socialMediaLinks: 10,
    videoShowcase: true,
    promotedListing: true,
    categorySpotlight: true,
    revenueSimulator: true,
  },
  enterprise: {
    photos: -1, // unlimited
    analytics: "predictive",
    support: "dedicated",
    badges: [
      "enterprise",
      "market_leader",
      "featured",
      "verified_pro",
      "premium_partner",
    ],
    maxProducts: -1, // unlimited
    customUrl: true,
    competitorInsights: true,
    keywordTracking: true,
    newsletterFeature: true,
    prioritySupport: true,
    apiAccess: true,
    exportData: true,
    socialMediaLinks: -1, // unlimited
    videoShowcase: true,
    promotedListing: true,
    categorySpotlight: true,
    revenueSimulator: true,
  },
};

// ─── FEATURE DISPLAY INFO (for comparison modal) ───────────────────────────────

export interface FeatureDisplayInfo {
  key: keyof TierFeatures;
  label: string;
  description: string;
  category: "visibility" | "analytics" | "content" | "support";
  formatValue: (val: any) => string;
}

export const FEATURE_DISPLAY: FeatureDisplayInfo[] = [
  {
    key: "photos",
    label: "Photo Gallery",
    description: "Business photos to showcase your work",
    category: "content",
    formatValue: (v: number) => (v === -1 ? "Unlimited" : `Up to ${v}`),
  },
  {
    key: "maxProducts",
    label: "Products / Services Listed",
    description: "Items shown on your profile",
    category: "content",
    formatValue: (v: number) => (v === -1 ? "Unlimited" : `Up to ${v}`),
  },
  {
    key: "analytics",
    label: "Analytics Dashboard",
    description: "Insights into your performance",
    category: "analytics",
    formatValue: (v: string) => v.charAt(0).toUpperCase() + v.slice(1),
  },
  {
    key: "competitorInsights",
    label: "Competitor Insights",
    description: "See how you compare in your category",
    category: "analytics",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "keywordTracking",
    label: "Keyword Tracking",
    description: "See what customers search to find you",
    category: "analytics",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "promotedListing",
    label: "Promoted Listing",
    description: "Appear higher in search results",
    category: "visibility",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "categorySpotlight",
    label: "Category Spotlight",
    description: "Featured in your category page",
    category: "visibility",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "newsletterFeature",
    label: "Newsletter Feature",
    description: "Featured in our subscriber newsletter",
    category: "visibility",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "videoShowcase",
    label: "Video Showcase",
    description: "Upload video to your profile",
    category: "content",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "socialMediaLinks",
    label: "Social Media Links",
    description: "Link your social accounts",
    category: "content",
    formatValue: (v: number) => (v === -1 ? "Unlimited" : `${v} links`),
  },
  {
    key: "support",
    label: "Support Level",
    description: "How fast we respond",
    category: "support",
    formatValue: (v: string) =>
      v
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
  },
  {
    key: "exportData",
    label: "Export Data",
    description: "Download your analytics as CSV",
    category: "analytics",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "revenueSimulator",
    label: "Revenue Simulator",
    description: "Predict potential revenue from visibility",
    category: "analytics",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
  {
    key: "apiAccess",
    label: "API Access",
    description: "Integrate with your own tools",
    category: "support",
    formatValue: (v: boolean) => (v ? "✅" : "🔒"),
  },
];

// ─── RANK SCORE CALCULATOR ──────────────────────────────────────────────────────

export function calculateRankScore(params: {
  tier: TierKey;
  isVerified: boolean;
  rating: number; // 0-5
  reviewCount: number;
  photosUploaded: number;
  profileCompleteness: number; // 0-100
}): number {
  const tierDef = TIERS[params.tier];
  const tierWeight = tierDef.rankingPower * 10; // 10-100
  const verificationBonus = params.isVerified ? 10 : 0;
  const ratingScore = (params.rating / 5) * 15;
  const reviewScore = Math.min(params.reviewCount / 10, 1) * 10;
  const photoScore = Math.min(params.photosUploaded / 5, 1) * 5;
  const completenessScore = (params.profileCompleteness / 100) * 10;

  return Math.round(
    tierWeight +
      verificationBonus +
      ratingScore +
      reviewScore +
      photoScore +
      completenessScore,
  );
}

// ─── VISIBILITY LOSS ESTIMATOR (the "Aha!" hook) ────────────────────────────────

export function estimateHiddenSearches(params: {
  tier: TierKey;
  categoryAvgSearches: number; // avg weekly searches in their category
}): number {
  const tierDef = TIERS[params.tier];
  // Free sees ~10% of category traffic, each tier multiplier increases share
  const visibilityShare = Math.min(tierDef.rankingPower * 10, 100) / 100;
  const missedShare = 1 - visibilityShare;
  return Math.round(params.categoryAvgSearches * missedShare);
}

// ─── REVENUE SIMULATOR ──────────────────────────────────────────────────────────

export function simulateRevenue(params: {
  currentTier: TierKey;
  targetTier: TierKey;
  currentMonthlyViews: number;
  avgConversionRate: number; // e.g. 0.02 = 2%
  avgOrderValue: number; // e.g. 50 USD
}): {
  currentEstimate: number;
  projectedEstimate: number;
  uplift: number;
  upliftPercent: number;
} {
  const currentPower = TIERS[params.currentTier].rankingPower;
  const targetPower = TIERS[params.targetTier].rankingPower;
  const multiplier = targetPower / currentPower;

  const currentRevenue =
    params.currentMonthlyViews *
    params.avgConversionRate *
    params.avgOrderValue;
  const projectedRevenue = currentRevenue * multiplier;

  return {
    currentEstimate: Math.round(currentRevenue),
    projectedEstimate: Math.round(projectedRevenue),
    uplift: Math.round(projectedRevenue - currentRevenue),
    upliftPercent: Math.round((multiplier - 1) * 100),
  };
}

// ─── HELPER: Check if feature is locked for tier ────────────────────────────────

export function isFeatureLocked(
  tier: TierKey,
  feature: keyof TierFeatures,
): boolean {
  const features = TIER_FEATURES[tier];
  const value = features[feature];
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return value === 0;
  return false;
}

export function getMinimumTierForFeature(feature: keyof TierFeatures): TierKey {
  for (const tier of TIER_ORDER) {
    if (!isFeatureLocked(tier, feature)) return tier;
  }
  return "enterprise";
}

/**
 * 🧠 Relevance Engine — Industry-Specific KPI Profiles
 *
 * Maps business categories to contextually relevant metrics.
 * A Doctor sees "Patient Views" while a Shop Owner sees "Product Clicks."
 * Each metric is tier-gated — locked metrics create a "ghost" state that
 * drives the psychological urge to upgrade.
 *
 * ┌──────────────────┬─────────────────┬──────────────────┬──────────────────┬────────────────────┐
 * │ Industry         │ KPI 1 (Traffic) │ KPI 2 (Convert.) │ KPI 3 (Authority)│ KPI 4 (Premium)    │
 * ├──────────────────┼─────────────────┼──────────────────┼──────────────────┼────────────────────┤
 * │ Santé (Health)   │ Patient Views   │ Appt. Requests   │ Specialty Rank   │ Wait Time Rating   │
 * │ Finance          │ Inquiry Volume  │ Quote Requests   │ Trust Certificate│ Lead Quality Score │
 * │ Alimentation     │ Menu Views      │ Reservation Clicks│ "Foodie" Rating │ Peak Hour Heatmap  │
 * │ Construction     │ Project Views   │ Quote Requests   │ Verif. Status    │ Portfolio Engage.  │
 * │ Commerce         │ Product Clicks  │ Store Directions │ Catalog Coverage │ Sales Conv. Est.   │
 * │ Hôtellerie       │ Room Views      │ Booking Clicks   │ Guest Rating     │ Occupancy Trend    │
 * │ Automobile       │ Listing Views   │ Test Drive Reqs  │ Dealer Rating    │ Inventory Demand   │
 * │ Divertissement   │ Event Views     │ Ticket Clicks    │ Audience Rating  │ Trending Score     │
 * │ Immobilier       │ Property Views  │ Contact Requests │ Agent Rating     │ Market Trend       │
 * │ Éducation        │ Program Views   │ Enrollment Reqs  │ Academic Rank    │ Placement Rate     │
 * └──────────────────┴─────────────────┴──────────────────┴──────────────────┴────────────────────┘
 */

import type { TierKey } from "./tiers";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

export interface IndustryMetric {
  /** Unique key for this metric (used for data binding) */
  key: string;
  /** Display label — contextual to industry ("Patient Views" vs "Product Clicks") */
  label: string;
  /** Lucide icon name (resolved in the component) */
  icon: string;
  /** Minimum tier required to see this metric's real value */
  tier: TierKey;
  /** Emoji for quick visual identification */
  emoji: string;
  /** Short description shown on hover or in expanded view */
  description: string;
}

export interface IndustryProfile {
  /** Display name for the industry */
  name: string;
  /** Emoji header icon */
  icon: string;
  /** Accent color class (Tailwind) */
  accentColor: string;
  /** The 4 KPI metrics, ordered by tier (free → max) */
  metrics: [IndustryMetric, IndustryMetric, IndustryMetric, IndustryMetric];
}

export interface ResolvedMetric extends IndustryMetric {
  /** Whether this metric is locked for the user's current tier */
  isLocked: boolean;
  /** The mock/real value to display (or null if locked) */
  value: number | null;
  /** Percentage change from previous period */
  change: number;
  /** Whether change is positive */
  positive: boolean;
}

// ─── INDUSTRY PROFILES ──────────────────────────────────────────────────────────

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  // ── Healthcare ──
  Santé: {
    name: "Santé",
    icon: "🏥",
    accentColor: "text-red-600",
    metrics: [
      {
        key: "views",
        label: "Patient Views",
        icon: "Users",
        tier: "free",
        emoji: "👁️",
        description: "How many patients viewed your profile this period",
      },
      {
        key: "appts",
        label: "Appointment Requests",
        icon: "Calendar",
        tier: "essential",
        emoji: "📅",
        description: "Appointment booking requests received",
      },
      {
        key: "rank",
        label: "Specialty Rank",
        icon: "Target",
        tier: "verified",
        emoji: "🏆",
        description: "Your ranking within your medical specialty",
      },
      {
        key: "bench",
        label: "Market Comparison",
        icon: "BarChart",
        tier: "max",
        emoji: "📊",
        description: "Benchmark against competitors in your area",
      },
    ],
  },

  // ── Finance ──
  Finance: {
    name: "Finance",
    icon: "🏦",
    accentColor: "text-emerald-600",
    metrics: [
      {
        key: "views",
        label: "Inquiry Volume",
        icon: "Activity",
        tier: "free",
        emoji: "📈",
        description: "Total inquiries about your financial services",
      },
      {
        key: "leads",
        label: "Qualified Leads",
        icon: "Zap",
        tier: "essential",
        emoji: "⚡",
        description: "Leads that match your target client profile",
      },
      {
        key: "trust",
        label: "Trust Score",
        icon: "ShieldCheck",
        tier: "verified",
        emoji: "🛡️",
        description: "Client trust rating based on reviews and verification",
      },
      {
        key: "roi",
        label: "Ad Performance",
        icon: "TrendingUp",
        tier: "max",
        emoji: "💰",
        description: "ROI metrics for your promoted listings",
      },
    ],
  },

  // ── Food & Restaurant ──
  Alimentation: {
    name: "Alimentation",
    icon: "🍽️",
    accentColor: "text-orange-600",
    metrics: [
      {
        key: "views",
        label: "Menu Views",
        icon: "Eye",
        tier: "free",
        emoji: "👀",
        description: "How many people viewed your menu and offerings",
      },
      {
        key: "reservations",
        label: "Reservation Clicks",
        icon: "Calendar",
        tier: "essential",
        emoji: "🍴",
        description: "Clicks on your reservation/order button",
      },
      {
        key: "foodie",
        label: '"Foodie" Rating',
        icon: "Star",
        tier: "verified",
        emoji: "⭐",
        description: "Community food critic score based on reviews",
      },
      {
        key: "heatmap",
        label: "Peak Hour Insights",
        icon: "Clock",
        tier: "max",
        emoji: "🔥",
        description: "When customers search for you most (heatmap)",
      },
    ],
  },

  // ── Construction / BTP ──
  Construction: {
    name: "Construction",
    icon: "🏗️",
    accentColor: "text-amber-700",
    metrics: [
      {
        key: "views",
        label: "Project Views",
        icon: "Eye",
        tier: "free",
        emoji: "👷",
        description: "How many clients viewed your project portfolio",
      },
      {
        key: "quotes",
        label: "Quote Requests",
        icon: "FileText",
        tier: "essential",
        emoji: "📝",
        description: "Number of quote/estimate requests received",
      },
      {
        key: "verified",
        label: "Verification Status",
        icon: "CheckCircle",
        tier: "verified",
        emoji: "✅",
        description: "License and certification verification level",
      },
      {
        key: "portfolio",
        label: "Portfolio Engagement",
        icon: "Image",
        tier: "max",
        emoji: "📐",
        description: "How deeply clients explore your past projects",
      },
    ],
  },

  // Alias for Bâtiment (same as Construction)
  Bâtiment: {
    name: "Bâtiment",
    icon: "🏗️",
    accentColor: "text-amber-700",
    metrics: [
      {
        key: "views",
        label: "Project Views",
        icon: "Eye",
        tier: "free",
        emoji: "👷",
        description: "How many clients viewed your project portfolio",
      },
      {
        key: "quotes",
        label: "Quote Requests",
        icon: "FileText",
        tier: "essential",
        emoji: "📝",
        description: "Number of quote/estimate requests received",
      },
      {
        key: "verified",
        label: "Verification Status",
        icon: "CheckCircle",
        tier: "verified",
        emoji: "✅",
        description: "License and certification verification level",
      },
      {
        key: "portfolio",
        label: "Portfolio Engagement",
        icon: "Image",
        tier: "max",
        emoji: "📐",
        description: "How deeply clients explore your past projects",
      },
    ],
  },

  // ── Commerce / Retail ──
  Commerce: {
    name: "Commerce",
    icon: "🛍️",
    accentColor: "text-blue-600",
    metrics: [
      {
        key: "views",
        label: "Product Clicks",
        icon: "MousePointerClick",
        tier: "free",
        emoji: "🖱️",
        description: "Clicks on your products and store page",
      },
      {
        key: "directions",
        label: "Store Directions",
        icon: "MapPin",
        tier: "essential",
        emoji: "📍",
        description: "People who requested directions to your store",
      },
      {
        key: "catalog",
        label: "Catalog Coverage",
        icon: "Package",
        tier: "verified",
        emoji: "📦",
        description: "% of your catalog indexed and searchable",
      },
      {
        key: "sales",
        label: "Sales Conversion Est.",
        icon: "DollarSign",
        tier: "max",
        emoji: "💳",
        description: "Estimated conversion from views to purchases",
      },
    ],
  },

  // ── Hospitality ──
  Hôtellerie: {
    name: "Hôtellerie",
    icon: "🏨",
    accentColor: "text-purple-600",
    metrics: [
      {
        key: "views",
        label: "Room Views",
        icon: "Eye",
        tier: "free",
        emoji: "🛏️",
        description: "How many travelers viewed your rooms and rates",
      },
      {
        key: "bookings",
        label: "Booking Clicks",
        icon: "Calendar",
        tier: "essential",
        emoji: "📅",
        description: "Clicks on your booking/reservation button",
      },
      {
        key: "guest_rating",
        label: "Guest Rating",
        icon: "Star",
        tier: "verified",
        emoji: "⭐",
        description: "Aggregated guest satisfaction score",
      },
      {
        key: "occupancy",
        label: "Occupancy Trend",
        icon: "TrendingUp",
        tier: "max",
        emoji: "📈",
        description: "Predicted occupancy based on search trends",
      },
    ],
  },

  // ── Automotive ──
  Automobile: {
    name: "Automobile",
    icon: "🚗",
    accentColor: "text-slate-700",
    metrics: [
      {
        key: "views",
        label: "Listing Views",
        icon: "Eye",
        tier: "free",
        emoji: "🚙",
        description: "Views on your vehicle listings and services",
      },
      {
        key: "test_drives",
        label: "Test Drive Requests",
        icon: "Calendar",
        tier: "essential",
        emoji: "🔑",
        description: "Test drive or service appointment requests",
      },
      {
        key: "dealer_rating",
        label: "Dealer Rating",
        icon: "Star",
        tier: "verified",
        emoji: "⭐",
        description: "Aggregated customer satisfaction rating",
      },
      {
        key: "demand",
        label: "Inventory Demand",
        icon: "TrendingUp",
        tier: "max",
        emoji: "📊",
        description: "Which of your vehicles are most searched",
      },
    ],
  },

  // ── Entertainment ──
  Divertissement: {
    name: "Divertissement",
    icon: "🎭",
    accentColor: "text-pink-600",
    metrics: [
      {
        key: "views",
        label: "Event Views",
        icon: "Eye",
        tier: "free",
        emoji: "🎬",
        description: "How many people viewed your events/shows",
      },
      {
        key: "tickets",
        label: "Ticket Clicks",
        icon: "Ticket",
        tier: "essential",
        emoji: "🎟️",
        description: "Clicks on your ticketing/booking links",
      },
      {
        key: "audience",
        label: "Audience Rating",
        icon: "Star",
        tier: "verified",
        emoji: "⭐",
        description: "Audience satisfaction and return rate",
      },
      {
        key: "trending",
        label: "Trending Score",
        icon: "Flame",
        tier: "max",
        emoji: "🔥",
        description: "How viral your events are in searches",
      },
    ],
  },

  // ── Real Estate ──
  Immobilier: {
    name: "Immobilier",
    icon: "🏠",
    accentColor: "text-teal-600",
    metrics: [
      {
        key: "views",
        label: "Property Views",
        icon: "Eye",
        tier: "free",
        emoji: "🏡",
        description: "Views on your property listings",
      },
      {
        key: "contacts",
        label: "Contact Requests",
        icon: "Phone",
        tier: "essential",
        emoji: "📞",
        description: "Inquiry calls and messages received",
      },
      {
        key: "agent_rating",
        label: "Agent Rating",
        icon: "Star",
        tier: "verified",
        emoji: "⭐",
        description: "Client satisfaction with your service",
      },
      {
        key: "market",
        label: "Market Trend",
        icon: "TrendingUp",
        tier: "max",
        emoji: "📈",
        description: "Price and demand trends in your area",
      },
    ],
  },

  // ── Education ──
  Éducation: {
    name: "Éducation",
    icon: "🎓",
    accentColor: "text-indigo-600",
    metrics: [
      {
        key: "views",
        label: "Program Views",
        icon: "Eye",
        tier: "free",
        emoji: "📚",
        description: "Views on your programs and courses",
      },
      {
        key: "enrollments",
        label: "Enrollment Requests",
        icon: "UserPlus",
        tier: "essential",
        emoji: "✍️",
        description: "Applications and enrollment inquiries",
      },
      {
        key: "academic_rank",
        label: "Academic Rank",
        icon: "Award",
        tier: "verified",
        emoji: "🏅",
        description: "Ranking among similar institutions",
      },
      {
        key: "placement",
        label: "Placement Rate",
        icon: "Target",
        tier: "max",
        emoji: "🎯",
        description: "Graduate employment/placement success rate",
      },
    ],
  },
};

// ─── DEFAULT / FALLBACK PROFILE ─────────────────────────────────────────────────

export const DEFAULT_PROFILE: IndustryProfile = {
  name: "General",
  icon: "🏢",
  accentColor: "text-gray-600",
  metrics: [
    {
      key: "views",
      label: "Profile Views",
      icon: "Eye",
      tier: "free",
      emoji: "👁️",
      description: "Total views on your business profile",
    },
    {
      key: "reach",
      label: "Local Reach",
      icon: "Globe",
      tier: "essential",
      emoji: "🌍",
      description: "How many nearby users discovered you",
    },
    {
      key: "trust",
      label: "Trust Status",
      icon: "CheckCircle",
      tier: "verified",
      emoji: "✅",
      description: "Your verification and trust level",
    },
    {
      key: "trends",
      label: "Growth Trends",
      icon: "Sparkles",
      tier: "max",
      emoji: "✨",
      description: "Performance trends over time",
    },
  ],
};

// ─── TIER WEIGHT MAP (shared with tiers.ts ordering) ────────────────────────────

const TIER_WEIGHTS: Record<TierKey, number> = {
  free: 0,
  essential: 1,
  verified: 2,
  max: 3,
  enterprise: 4,
};

// ─── CATEGORY ALIAS MAP ─────────────────────────────────────────────────────────
// Maps various DB category names to their profile key

const CATEGORY_ALIASES: Record<string, string> = {
  // French → Profile Key
  santé: "Santé",
  sante: "Santé",
  health: "Santé",
  healthcare: "Santé",
  médecin: "Santé",
  médical: "Santé",
  clinique: "Santé",
  pharmacie: "Santé",

  finance: "Finance",
  banque: "Finance",
  assurance: "Finance",
  banking: "Finance",
  insurance: "Finance",

  alimentation: "Alimentation",
  restaurant: "Alimentation",
  restauration: "Alimentation",
  food: "Alimentation",
  boulangerie: "Alimentation",
  pâtisserie: "Alimentation",
  traiteur: "Alimentation",
  café: "Alimentation",

  construction: "Construction",
  bâtiment: "Bâtiment",
  batiment: "Bâtiment",
  btp: "Construction",
  artisan: "Construction",

  commerce: "Commerce",
  retail: "Commerce",
  boutique: "Commerce",
  magasin: "Commerce",
  shop: "Commerce",

  hôtellerie: "Hôtellerie",
  hotellerie: "Hôtellerie",
  hotel: "Hôtellerie",
  hôtel: "Hôtellerie",
  hospitality: "Hôtellerie",
  hébergement: "Hôtellerie",

  automobile: "Automobile",
  auto: "Automobile",
  garage: "Automobile",
  concessionnaire: "Automobile",

  divertissement: "Divertissement",
  entertainment: "Divertissement",
  loisirs: "Divertissement",
  spectacle: "Divertissement",
  événementiel: "Divertissement",

  immobilier: "Immobilier",
  "real estate": "Immobilier",
  "agence immobilière": "Immobilier",

  éducation: "Éducation",
  education: "Éducation",
  formation: "Éducation",
  école: "Éducation",
  université: "Éducation",
};

// ─── CORE FUNCTION: Resolve industry-specific stats ─────────────────────────────

/**
 * Resolves the industry profile for a given business category and applies
 * tier-gating logic. Returns 4 metrics with `isLocked` state and mock values.
 *
 * Usage:
 * ```ts
 * const stats = getSubscriberStats("Commerce", "essential", { views: 340, directions: 52 });
 * // → [{ label: "Product Clicks", value: 340, isLocked: false }, ...]
 * ```
 */
export function getSubscriberStats(
  category: string,
  userTier: TierKey,
  realData?: Record<string, number>,
): ResolvedMetric[] {
  const profile = resolveProfile(category);
  const userWeight = TIER_WEIGHTS[userTier];

  return profile.metrics.map((metric) => {
    const isLocked = userWeight < TIER_WEIGHTS[metric.tier];
    const realValue = realData?.[metric.key];

    // Generate mock data scaled by tier power when no real data exists
    const mockValue = isLocked ? null : generateMockValue(metric.key, userTier);
    const value = isLocked ? null : (realValue ?? mockValue);

    // Mock change percentages
    const change = isLocked ? 0 : Math.floor(Math.random() * 30) - 5;

    return {
      ...metric,
      isLocked,
      value,
      change,
      positive: change >= 0,
    };
  });
}

/**
 * Resolves the IndustryProfile for a category string.
 * Handles aliases, case-insensitive matching, and falls back to DEFAULT_PROFILE.
 */
export function resolveProfile(category: string): IndustryProfile {
  if (!category) return DEFAULT_PROFILE;

  // Direct match
  if (INDUSTRY_PROFILES[category]) return INDUSTRY_PROFILES[category];

  // Alias match (case-insensitive)
  const normalized = category.toLowerCase().trim();
  const aliasKey = CATEGORY_ALIASES[normalized];
  if (aliasKey && INDUSTRY_PROFILES[aliasKey])
    return INDUSTRY_PROFILES[aliasKey];

  // Partial match — check if category contains any alias keyword
  for (const [alias, profileKey] of Object.entries(CATEGORY_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      if (INDUSTRY_PROFILES[profileKey]) return INDUSTRY_PROFILES[profileKey];
    }
  }

  return DEFAULT_PROFILE;
}

/**
 * Returns all available industry profile keys (for admin UI dropdowns).
 */
export function getAvailableIndustries(): Array<{
  key: string;
  name: string;
  icon: string;
}> {
  return Object.entries(INDUSTRY_PROFILES).map(([key, profile]) => ({
    key,
    name: profile.name,
    icon: profile.icon,
  }));
}

// ─── MOCK DATA GENERATOR ────────────────────────────────────────────────────────

function generateMockValue(metricKey: string, tier: TierKey): number {
  const tierMultipliers: Record<TierKey, number> = {
    free: 1,
    essential: 2,
    verified: 3,
    max: 5,
    enterprise: 10,
  };

  const baseValues: Record<string, number> = {
    views: 120,
    appts: 18,
    rank: 12,
    bench: 78,
    leads: 34,
    trust: 85,
    roi: 3.2,
    reservations: 42,
    foodie: 4.3,
    heatmap: 67,
    quotes: 15,
    verified: 92,
    portfolio: 340,
    directions: 56,
    catalog: 78,
    sales: 4.8,
    bookings: 38,
    guest_rating: 4.5,
    occupancy: 72,
    test_drives: 12,
    dealer_rating: 4.1,
    demand: 450,
    tickets: 89,
    audience: 4.6,
    trending: 82,
    contacts: 27,
    agent_rating: 4.4,
    market: 5.2,
    enrollments: 45,
    academic_rank: 8,
    placement: 87,
    reach: 230,
    trends: 15,
  };

  const base = baseValues[metricKey] ?? 100;
  const multiplier = tierMultipliers[tier];
  // Add some randomness to make it feel real
  const jitter = 1 + (Math.random() * 0.3 - 0.15);
  return Math.round(base * multiplier * jitter);
}

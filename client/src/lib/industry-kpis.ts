/**
 * Industry-Relevant KPIs
 * Maps business categories to their most relevant metrics based on actual operations
 */

import {
  Eye,
  Calendar,
  Users,
  Target,
  Utensils,
  BookmarkCheck,
  Bike,
  Home,
  MapPin,
  TrendingUp,
  Globe,
  ShieldCheck,
  Briefcase,
  ShoppingCart,
  Package,
  Percent,
  PieChart,
  Clock,
  Hammer,
  Badge,
  Star,
  FileText,
  BarChart3,
  Zap,
  Search,
  CheckCircle,
} from "lucide-react";

export interface StatMetric {
  label: string;
  value: string | number;
  icon: any;
  premium?: boolean;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface StatBlock {
  common: StatMetric;
  industry: StatMetric[];
  tier: "free" | "pro_essential" | "pro_verified" | "pro_max" | "enterprise";
}

// ─── TIER-BASED STAT VISIBILITY ─────────────────────────────────────────────

/**
 * Determines what stats to show based on subscription tier
 * Free: Community stats only
 * Pro Essential: Personal stats
 * Pro Verified: Comparison stats
 * Pro Max/Enterprise: AI-driven predictive stats
 */
export const getStatVisibility = (tier: string) => {
  const visibility = {
    free: {
      name: "Community Stats",
      description: "Industry-wide aggregates",
      premium: false,
      stats: ["common"],
    },
    pro_essential: {
      name: "Personal Stats",
      description: "Your performance metrics",
      premium: true,
      stats: ["common", "primary"],
    },
    pro_verified: {
      name: "Comparison Stats",
      description: "vs competitors in your area",
      premium: true,
      stats: ["common", "primary", "secondary"],
    },
    pro_max: {
      name: "AI Insights",
      description: "Predictive trends & recommendations",
      premium: true,
      stats: ["common", "primary", "secondary", "tertiary"],
    },
    enterprise: {
      name: "Full Intelligence",
      description: "Complete market analytics",
      premium: true,
      stats: ["common", "primary", "secondary", "tertiary", "quaternary"],
    },
  };

  return visibility[tier as keyof typeof visibility] || visibility.free;
};

// ─── INDUSTRY STAT MAPPING ─────────────────────────────────────────────────

/**
 * Core KPI mapping: Each industry has primary, secondary, tertiary stats
 * Based on actual business operations and decision-making needs
 */
export const getRelevantStats = (
  categoryName: string,
  businessData: any,
  userTier: string = "free",
): StatBlock => {
  // Common stat for all businesses: Profile Views
  const common: StatMetric = {
    label: "Profile Views",
    value: businessData.views || 0,
    icon: Eye,
    trend: "up",
    trendValue: "+12%",
  };

  // Industry-specific stat blocks
  const industryStats: Record<string, StatMetric[]> = {
    // ──────── RETAIL / COMMERCE ────────
    Retail: [
      {
        label: "Shop Visits",
        value: businessData.visits || 0,
        icon: ShoppingCart,
        trend: "up",
        trendValue: "+8%",
      },
      {
        label: "Products Sold",
        value: businessData.productsSold || 0,
        icon: Package,
        premium: userTier !== "free",
      },
      {
        label: "Catalog Views",
        value: businessData.catalogViews || 0,
        icon: Eye,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Conversion Rate",
        value: businessData.conversionRate || "0%",
        icon: Percent,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],

    // ──────── HEALTHCARE ────────
    Healthcare: [
      {
        label: "Appt. Requests",
        value: businessData.appointments || 0,
        icon: Calendar,
        trend: "up",
        trendValue: "+5%",
      },
      {
        label: "Patient Reach",
        value: businessData.reach || 0,
        icon: Users,
        premium: userTier !== "free",
      },
      {
        label: "Specialty Rank",
        value: `#${businessData.rank || 1}`,
        icon: Target,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Avg. Rating",
        value: businessData.rating || 4.5,
        icon: Star,
        premium: userTier === "pro_max" || userTier === "enterprise",
        suffix: "/ 5",
      },
    ],

    // ──────── HOTEL / HOSPITALITY / TRAVEL ────────
    Hotel: [
      {
        label: "Booking Rate",
        value: businessData.bookingRate || "0%",
        icon: BookmarkCheck,
        trend: "up",
        trendValue: "+15%",
      },
      {
        label: "Room Nights",
        value: businessData.roomNights || 0,
        icon: Home,
        premium: userTier !== "free",
      },
      {
        label: "Seasonal Demand",
        value: businessData.seasonalDemand || "Mid",
        icon: PieChart,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Nearby Traffic",
        value: businessData.nearbyTraffic || 0,
        icon: MapPin,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],

    // ──────── RESTAURANT ────────
    Restaurant: [
      {
        label: "Menu Clicks",
        value: businessData.menuViews || 0,
        icon: Utensils,
        trend: "up",
        trendValue: "+22%",
      },
      {
        label: "Table Bookings",
        value: businessData.bookings || 0,
        icon: BookmarkCheck,
        premium: userTier !== "free",
      },
      {
        label: "Delivery Orders",
        value: businessData.delivery || 0,
        icon: Bike,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Avg. Order Value",
        value: `$${businessData.avgOrderValue || 0}`,
        icon: ShoppingCart,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],

    // ──────── JOBS / HR ────────
    Jobs: [
      {
        label: "Active Postings",
        value: businessData.activePostings || 0,
        icon: Briefcase,
        trend: "up",
        trendValue: "+3%",
      },
      {
        label: "Applicants",
        value: businessData.applicants || 0,
        icon: Users,
        premium: userTier !== "free",
      },
      {
        label: "Resume Views",
        value: businessData.resumeViews || 0,
        icon: Eye,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Time-to-Hire",
        value: `${businessData.timeToHire || 0}d`,
        icon: Clock,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],

    // ──────── CONSTRUCTION ────────
    Construction: [
      {
        label: "Project Leads",
        value: businessData.projectLeads || 0,
        icon: Hammer,
        trend: "up",
        trendValue: "+7%",
      },
      {
        label: "Quote Requests",
        value: businessData.quoteRequests || 0,
        icon: FileText,
        premium: userTier !== "free",
      },
      {
        label: "Area Coverage",
        value: `${businessData.areaCoverage || 0} sq mi`,
        icon: MapPin,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Trust Score",
        value: businessData.trustScore || 0,
        icon: ShieldCheck,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],

    // ──────── REAL ESTATE ────────
    "Real Estate": [
      {
        label: "Property Leads",
        value: businessData.leads || 0,
        icon: Home,
        trend: "up",
        trendValue: "+18%",
      },
      {
        label: "Tour Requests",
        value: businessData.tours || 0,
        icon: MapPin,
        premium: userTier !== "free",
      },
      {
        label: "Price Trends",
        value: "+12%",
        icon: TrendingUp,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Market Insights",
        value: businessData.marketInsights || "Stable",
        icon: BarChart3,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],

    // ──────── DEFAULT / FALLBACK ────────
    default: [
      {
        label: "Total Reach",
        value: businessData.reach || 0,
        icon: Globe,
        trend: "up",
        trendValue: "+10%",
      },
      {
        label: "Engagement",
        value: `${businessData.engagement || 0}%`,
        icon: Zap,
        premium: userTier !== "free",
      },
      {
        label: "Trust Score",
        value: businessData.score || 0,
        icon: ShieldCheck,
        premium:
          userTier === "pro_verified" ||
          userTier === "pro_max" ||
          userTier === "enterprise",
      },
      {
        label: "Growth Rate",
        value: `${businessData.growthRate || 0}%`,
        icon: TrendingUp,
        premium: userTier === "pro_max" || userTier === "enterprise",
      },
    ],
  };

  // Try to match category, fallback to default
  const stats =
    industryStats[categoryName] ||
    Object.values(industryStats).find(
      (stats) =>
        stats[0].label.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(stats[0].label.toLowerCase()),
    ) ||
    industryStats["default"];

  return {
    common,
    industry: stats || industryStats["default"],
    tier: (userTier as any) || "free",
  };
};

// ─── GEO-ADMIN MARKET HEALTH STATS ──────────────────────────────────────────

/**
 * For Geo-Admins: Show market health instead of personal stats
 * Focus on regional strategy and market saturation
 */
export interface MarketHealthStats {
  totalLocalCompetitors: number;
  saturationPercent: number;
  avgCategoryPricing?: number;
  searchVolume: number;
  growthTrend: "up" | "down" | "neutral";
  dominantCategory?: string;
  opportunityScore: number;
}

export const getGeoAdminMarketStats = (
  region: string,
  category: string,
  marketData: any,
): StatBlock => {
  const marketStats: StatMetric[] = [
    {
      label: "Local Competitors",
      value: marketData.competitors || 0,
      icon: Briefcase,
      trend: "up",
      trendValue: "+3 this month",
    },
    {
      label: "Market Saturation",
      value: `${marketData.saturation || 0}%`,
      icon: PieChart,
      trend: marketData.saturation > 80 ? "up" : "neutral",
      trendValue: "High supply",
    },
    {
      label: "Avg. Category Price",
      value: `$${marketData.avgPrice || 0}`,
      icon: ShoppingCart,
      premium: true,
      trend: "up",
      trendValue: "+8%",
    },
    {
      label: `Searches in ${region}`,
      value: marketData.searchVolume || 0,
      icon: Search,
      premium: true,
      trend: "up",
      trendValue: "+15% YoY",
    },
  ];

  return {
    common: {
      label: "Market Health Score",
      value: marketData.healthScore || 0,
      icon: Globe,
    },
    industry: marketStats,
    tier: "pro_verified", // Geo-admins always see market data
  };
};

// ─── UNVERIFIED BUSINESS PERSPECTIVE ────────────────────────────────────────

/**
 * For unverified businesses: Show verification progress as primary stat
 */
export const getUnverifiedStats = (
  businessData: any,
  verificationProgress: number,
): StatBlock => {
  return {
    common: {
      label: "Verification Progress",
      value: `${verificationProgress}%`,
      icon: ShieldCheck,
    },
    industry: [
      {
        label: "Steps Completed",
        value: `${Math.round((verificationProgress / 33) * 3)} of 3`,
        icon: CheckCircle,
      },
      {
        label: "Current Step",
        value:
          verificationProgress < 33
            ? "ID Review"
            : verificationProgress < 66
              ? "Address Verification"
              : "Final Approval",
        icon: Badge,
      },
      {
        label: "Estimated Time",
        value: "1-2 days",
        icon: Clock,
      },
      {
        label: "Hidden Profile Views",
        value: businessData.hiddenViews || 0,
        icon: Eye,
      },
    ],
    tier: "free",
  };
};

// ─── STAT FILTERING BY TIER ────────────────────────────────────────────────

/**
 * Filter stats to show based on subscription tier
 * Respects premium flags and tier-based visibility rules
 */
export const filterStatsByTier = (
  stats: StatMetric[],
  tier: string,
): StatMetric[] => {
  const tierHierarchy = {
    free: 0,
    pro_essential: 1,
    pro_verified: 2,
    pro_max: 3,
    enterprise: 4,
  };

  const userLevel = tierHierarchy[tier as keyof typeof tierHierarchy] || 0;

  return stats.filter((stat) => {
    if (!stat.premium) return true; // Always show non-premium stats
    if (stat.premium && userLevel >= 1) return true; // Pro and above get premium
    return false;
  });
};

// ─── BUSINESS TYPE DETECTION ────────────────────────────────────────────────

/**
 * Intelligently detect business category from various sources
 */
export const detectBusinessCategory = (
  categoryName: string,
  businessDescription: string = "",
  businessName: string = "",
): string => {
  const combined =
    `${categoryName} ${businessDescription} ${businessName}`.toLowerCase();

  const categoryMap: Record<string, string[]> = {
    Healthcare: [
      "doctor",
      "hospital",
      "clinic",
      "health",
      "medical",
      "pharmacy",
      "dentist",
      "therapist",
    ],
    Restaurant: [
      "restaurant",
      "cafe",
      "bistro",
      "dining",
      "food",
      "bar",
      "pizza",
      "burger",
    ],
    Hotel: [
      "hotel",
      "motel",
      "resort",
      "lodge",
      "inn",
      "accommodation",
      "stay",
      "bed",
    ],
    Retail: [
      "shop",
      "store",
      "retail",
      "market",
      "shopping",
      "mall",
      "vendor",
      "seller",
    ],
    Jobs: [
      "job",
      "recruit",
      "hiring",
      "career",
      "employment",
      "staffing",
      "hr",
      "hr solutions",
    ],
    Construction: [
      "construction",
      "builder",
      "contractor",
      "building",
      "renovation",
      "carpentry",
      "plumber",
    ],
    "Real Estate": [
      "real estate",
      "property",
      "realtor",
      "realty",
      "broker",
      "housing",
      "land",
      "apartment",
    ],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((keyword) => combined.includes(keyword))) {
      return category;
    }
  }

  return "default";
};

export default {
  getRelevantStats,
  getGeoAdminMarketStats,
  getUnverifiedStats,
  filterStatsByTier,
  detectBusinessCategory,
  getStatVisibility,
};

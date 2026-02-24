/**
 * Mock Data Generators for Industry-Specific KPIs
 * Generates realistic stat values based on business category and performance
 */

export interface MockBusinessStats {
  views: number;
  visits: number;
  productsSold: number;
  catalogViews: number;
  conversionRate: number;
  appointments: number;
  reach: number;
  rank: number;
  rating: number;
  bookingRate: number;
  roomNights: number;
  seasonalDemand: string;
  nearbyTraffic: number;
  menuViews: number;
  bookings: number;
  delivery: number;
  avgOrderValue: number;
  activePostings: number;
  applicants: number;
  resumeViews: number;
  timeToHire: number;
  projectLeads: number;
  quoteRequests: number;
  areaCoverage: number;
  trustScore: number;
  leads: number;
  tours: number;
  marketInsights: string;
  engagement: number;
  score: number;
  growthRate: number;
}

/**
 * Generate realistic stats based on business category
 */
export const generateMockStats = (
  category: string = "default",
  rating: number = 4.0,
  reviewCount: number = 50,
): MockBusinessStats => {
  // Use rating and review count as basis for engagement multiplier
  const engagementMultiplier =
    (rating / 5) * (Math.log(Math.max(reviewCount, 1)) / 4 + 1);

  const baseViews =
    Math.floor(500 + Math.random() * 2000) * engagementMultiplier;

  const stats: MockBusinessStats = {
    // Common across all categories
    views: Math.floor(baseViews),
    reach: Math.floor(1000 + Math.random() * 5000 * engagementMultiplier),
    engagement: Math.floor(50 + Math.random() * 50 * engagementMultiplier),
    score: Math.floor(60 + Math.random() * 40 * engagementMultiplier),
    rating: rating,
    growthRate: Math.floor(-20 + Math.random() * 80),

    // Retail/Commerce
    visits: Math.floor(500 + Math.random() * 2000 * engagementMultiplier),
    productsSold: Math.floor(100 + Math.random() * 500 * engagementMultiplier),
    catalogViews: Math.floor(
      2000 + Math.random() * 8000 * engagementMultiplier,
    ),
    conversionRate: Math.floor(2 + Math.random() * 8),

    // Healthcare
    appointments: Math.floor(20 + Math.random() * 100 * engagementMultiplier),
    rank: Math.floor(1 + Math.random() * 100),

    // Hotel/Hospitality
    bookingRate: Math.floor(20 + Math.random() * 70 * engagementMultiplier),
    roomNights: Math.floor(100 + Math.random() * 500 * engagementMultiplier),
    seasonalDemand: ["Low", "Medium", "High", "Peak"][
      Math.floor(Math.random() * 4)
    ],
    nearbyTraffic: Math.floor(
      1000 + Math.random() * 10000 * engagementMultiplier,
    ),

    // Restaurant
    menuViews: Math.floor(1000 + Math.random() * 5000 * engagementMultiplier),
    bookings: Math.floor(50 + Math.random() * 200 * engagementMultiplier),
    delivery: Math.floor(30 + Math.random() * 150 * engagementMultiplier),
    avgOrderValue: Math.floor(15 + Math.random() * 50),

    // Jobs/HR
    activePostings: Math.floor(3 + Math.random() * 20),
    applicants: Math.floor(50 + Math.random() * 300 * engagementMultiplier),
    resumeViews: Math.floor(200 + Math.random() * 1000 * engagementMultiplier),
    timeToHire: Math.floor(7 + Math.random() * 30),

    // Construction
    projectLeads: Math.floor(10 + Math.random() * 50 * engagementMultiplier),
    quoteRequests: Math.floor(20 + Math.random() * 100 * engagementMultiplier),
    areaCoverage: Math.floor(10 + Math.random() * 500),
    trustScore: Math.floor(50 + Math.random() * 50 * engagementMultiplier),

    // Real Estate
    leads: Math.floor(30 + Math.random() * 150 * engagementMultiplier),
    tours: Math.floor(15 + Math.random() * 75 * engagementMultiplier),
    marketInsights: ["Stable", "Rising", "Declining", "Volatile"][
      Math.floor(Math.random() * 4)
    ],
  };

  return stats;
};

/**
 * Generate category-specific insights
 */
export const generateCategoryInsights = (
  category: string,
  stats: MockBusinessStats,
): Record<string, string> => {
  const insights: Record<string, Record<string, string>> = {
    Retail: {
      insight1: `Your conversion rate of ${stats.conversionRate}% is ${stats.conversionRate > 5 ? "above" : "below"} industry average (5%)`,
      insight2: `${Math.floor(stats.engagement)}% customer engagement on product catalog`,
      insight3: `Average of ${Math.floor(stats.visits / 30)} daily shop visits`,
    },

    Healthcare: {
      insight1: `Ranked #${stats.rank} in your specialty (top 20% nationwide)`,
      insight2: `${stats.appointments} appointment requests this month`,
      insight3: `Patient reach: ${Math.floor(stats.reach)} people`,
    },

    Hotel: {
      insight1: `${stats.bookingRate}% booking rate vs industry avg of 45%`,
      insight2: `${Math.floor(stats.roomNights)} room-nights booked this period`,
      insight3: `Seasonal demand: ${stats.seasonalDemand} - Plan accordingly`,
    },

    Restaurant: {
      insight1: `Menu average order value: $${stats.avgOrderValue} (growing trend)`,
      insight2: `${stats.bookings} table bookings + ${stats.delivery} delivery orders`,
      insight3: `${Math.floor((stats.delivery / (stats.bookings + stats.delivery)) * 100)}% of orders are delivery`,
    },

    Jobs: {
      insight1: `${stats.applicants} qualified applicants for ${stats.activePostings} positions`,
      insight2: `Average time-to-hire: ${stats.timeToHire} days`,
      insight3: `Resume views trending up ${stats.growthRate}%`,
    },

    Construction: {
      insight1: `${stats.projectLeads} project leads from ${Math.floor(stats.areaCoverage)} sq mi coverage`,
      insight2: `${stats.quoteRequests} quote requests this month`,
      insight3: `Trust score: ${Math.floor(stats.trustScore)}/100 (verified contractor)`,
    },

    "Real Estate": {
      insight1: `${stats.leads} qualified leads + ${stats.tours} property tours`,
      insight2: `Market trend: ${stats.marketInsights}`,
      insight3: `Price appreciation: +${stats.growthRate}% YoY in your area`,
    },

    default: {
      insight1: `Profile views: ${Math.floor(stats.views)} (${stats.growthRate > 0 ? "↑" : "↓"} ${Math.abs(stats.growthRate)}% from last month)`,
      insight2: `Engagement rate: ${stats.engagement}%`,
      insight3: `Trust score: ${Math.floor(stats.score)}/100`,
    },
  };

  return insights[category] || insights["default"];
};

/**
 * Generate mock market data for geo-admins
 */
export const generateMockMarketData = (
  region: string,
  category: string,
): Record<string, any> => {
  const baseCompetitors = Math.floor(10 + Math.random() * 100);
  const saturation = Math.floor(30 + Math.random() * 70);

  return {
    region,
    category,
    competitors: baseCompetitors,
    saturation,
    avgPrice: Math.floor(50 + Math.random() * 500),
    searchVolume: Math.floor(1000 + Math.random() * 10000),
    growthTrend: ["up", "down", "neutral"][Math.floor(Math.random() * 3)] as
      | "up"
      | "down"
      | "neutral",
    healthScore: Math.floor(50 + Math.random() * 50),
    opportunityScore: Math.floor(100 - saturation), // Inverse of saturation
    dominantCategory: ["Healthcare", "Restaurant", "Retail", "Services"][
      Math.floor(Math.random() * 4)
    ],
    marketInsights: {
      demand:
        saturation < 40
          ? "High opportunity"
          : saturation < 70
            ? "Moderate competition"
            : "Highly saturated",
      growth: "Stable growth, +5% YoY",
      trend: "Increasing demand for online presence",
      seasonality: ["High season (peak)", "Moderate season", "Low season"][
        Math.floor(Math.random() * 3)
      ],
    },
  };
};

/**
 * Generate tier-specific stat visibility recommendations
 */
export const getTierStatRecommendations = (tier: string): string[] => {
  const recommendations: Record<string, string[]> = {
    free: [
      "Upgrade to Pro Essential to unlock personal performance metrics",
      "See your profile views and engagement rate",
      "Compare yourself against industry benchmarks",
    ],

    pro_essential: [
      "Unlock Comparison stats by upgrading to Pro Verified",
      "See how you rank against local competitors",
      "Get market saturation insights for your area",
    ],

    pro_verified: [
      "Upgrade to Pro Max for AI-driven predictive insights",
      "Forecast future trends and opportunities",
      "Get personalized recommendations based on your data",
    ],

    pro_max: [
      "You have access to all AI insights and predictive analytics",
      "Enterprise tier unlocks dedicated account management",
      "Custom reporting and strategic planning tools",
    ],

    enterprise: [
      "Full access to all intelligence features",
      "Dedicated analytics team support",
      "Custom API access and data integrations",
    ],
  };

  return recommendations[tier] || recommendations.free;
};

export default {
  generateMockStats,
  generateCategoryInsights,
  generateMockMarketData,
  getTierStatRecommendations,
};

import { useState, useMemo } from "react";
import {
  getRelevantStats,
  getGeoAdminMarketStats,
  getUnverifiedStats,
  filterStatsByTier,
  detectBusinessCategory,
  type StatBlock,
} from "@/lib/industry-kpis";

interface UseBusinessStatsOptions {
  businessData: any;
  userTier?: string;
  isGeoAdmin?: boolean;
  isUnverified?: boolean;
  marketData?: any;
}

/**
 * Hook: useBusinessStats
 * Intelligently generates industry-relevant KPIs based on business data, tier, and role
 */
export const useBusinessStats = (options: UseBusinessStatsOptions) => {
  const {
    businessData,
    userTier = "free",
    isGeoAdmin = false,
    isUnverified = false,
    marketData = null,
  } = options;

  const stats = useMemo(() => {
    // Priority 1: Unverified businesses show verification progress
    if (isUnverified && businessData.verification_status === "unverified") {
      const verificationProgress = calculateVerificationProgress(businessData);
      return getUnverifiedStats(businessData, verificationProgress);
    }

    // Priority 2: Geo-admins see market health
    if (isGeoAdmin && marketData) {
      return getGeoAdminMarketStats(
        businessData.location || "region",
        businessData.category || "general",
        marketData,
      );
    }

    // Priority 3: Regular users see industry-specific stats
    const categoryName = detectBusinessCategory(
      businessData.category || "",
      businessData.description || "",
      businessData.name || "",
    );

    const statBlock = getRelevantStats(categoryName, businessData, userTier);

    // Filter stats based on tier
    const filteredStats = filterStatsByTier(statBlock.industry, userTier);

    return {
      ...statBlock,
      industry: filteredStats,
    };
  }, [businessData, userTier, isGeoAdmin, isUnverified, marketData]);

  return stats;
};

/**
 * Helper: Calculate verification progress percentage
 */
const calculateVerificationProgress = (businessData: any): number => {
  let progress = 0;

  // Step 1: ID Review (33%)
  if (businessData.id_verified) progress += 33;

  // Step 2: Address Verification (66%)
  if (businessData.address_verified) progress += 33;

  // Step 3: Final Approval (100%)
  if (businessData.verification_status === "verified") progress += 34;

  return Math.min(progress, 100);
};

/**
 * Hook: useMultipleBusinessStats
 * Fetch and calculate stats for multiple businesses (for dashboards/comparisons)
 */
export const useMultipleBusinessStats = (
  businesses: any[],
  userTier: string = "free",
) => {
  const allStats = useMemo(() => {
    return businesses.map((business) => ({
      businessId: business.id,
      businessName: business.name,
      stats: getRelevantStats(
        detectBusinessCategory(
          business.category || "",
          business.description || "",
          business.name || "",
        ),
        business,
        userTier,
      ),
    }));
  }, [businesses, userTier]);

  return allStats;
};

/**
 * Hook: useGeoAdminInsights
 * For geo-admins: Aggregate market data across region and category
 */
export const useGeoAdminInsights = (
  region: string,
  category: string,
  baseData: any,
) => {
  const [marketData] = useState({
    competitors: baseData.competitors || 0,
    saturation: baseData.saturation || 0,
    avgPrice: baseData.avgPrice || 0,
    searchVolume: baseData.searchVolume || 0,
    healthScore: baseData.healthScore || 75,
  });

  const marketStats = useMemo(() => {
    return getGeoAdminMarketStats(region, category, marketData);
  }, [region, category, marketData]);

  return {
    marketStats,
    marketData,
  };
};

export default {
  useBusinessStats,
  useMultipleBusinessStats,
  useGeoAdminInsights,
};

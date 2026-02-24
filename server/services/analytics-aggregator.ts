import { db } from "../db";
import { analytics } from "@shared/schema";
import { sql, eq, and, gte, asc } from "drizzle-orm";

/**
 * AnalyticsAggregator Service
 * Powers the Admin Dashboard and Business Performance metrics
 * Uses the composite unique index on (entityId, entityType, date) for performance
 */

export interface BusinessPerformanceMetrics {
  date: Date;
  views: number;
  clicks: number;
  revenue: string;
}

export interface BusinessPerformanceSummary {
  businessId: number;
  periodDays: number;
  totalViews: number;
  totalClicks: number;
  totalRevenue: string;
  averageClickRate: number; // clicks / views
  trend: "up" | "down" | "flat";
  data: BusinessPerformanceMetrics[];
}

/**
 * Get 7-day performance summary for a business
 * Used for dashboard widgets and business owner analytics
 */
export async function getBusinessPerformance(
  businessId: number,
  days: number = 7,
): Promise<BusinessPerformanceMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db
    .select({
      date: analytics.date,
      views: sql<number>`COALESCE(sum(${analytics.pageViews}), 0)`.mapWith(
        Number,
      ),
      clicks: sql<number>`COALESCE(sum(${analytics.clicks}), 0)`.mapWith(
        Number,
      ),
      revenue: sql<string>`COALESCE(sum(${analytics.revenue}), '0.00')`,
    })
    .from(analytics)
    .where(
      and(
        eq(analytics.entityId, businessId),
        eq(analytics.entityType, "business"),
        gte(analytics.date, startDate),
      ),
    )
    .groupBy(analytics.date)
    .orderBy(asc(analytics.date));
}

/**
 * Get aggregated performance summary with trend analysis
 * Returns total metrics and calculates click-through rate
 */
export async function getBusinessPerformanceSummary(
  businessId: number,
  days: number = 7,
): Promise<BusinessPerformanceSummary> {
  const data = await getBusinessPerformance(businessId, days);

  const totalViews = data.reduce((sum, d) => sum + (d.views || 0), 0);
  const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
  const totalRevenue = data.reduce(
    (sum, d) => (parseFloat(sum) + parseFloat(d.revenue || "0")).toString(),
    "0.00",
  );

  // Calculate trend: compare first half to second half
  const midpoint = Math.floor(data.length / 2);
  const firstHalfViews =
    data.slice(0, midpoint).reduce((sum, d) => sum + (d.views || 0), 0) /
    Math.max(1, midpoint);
  const secondHalfViews =
    data.slice(midpoint).reduce((sum, d) => sum + (d.views || 0), 0) /
    Math.max(1, data.length - midpoint);

  let trend: "up" | "down" | "flat" = "flat";
  if (secondHalfViews > firstHalfViews * 1.1) {
    trend = "up";
  } else if (secondHalfViews < firstHalfViews * 0.9) {
    trend = "down";
  }

  return {
    businessId,
    periodDays: days,
    totalViews,
    totalClicks,
    totalRevenue,
    averageClickRate: totalViews > 0 ? totalClicks / totalViews : 0,
    trend,
    data,
  };
}

/**
 * Get top performing categories by views
 * Used for market insights and category rankings
 */
export async function getTopCategories(
  limit: number = 10,
  days: number = 7,
): Promise<
  Array<{ entityId: number; totalViews: number; totalRevenue: string }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db
    .select({
      entityId: analytics.entityId,
      totalViews: sql<number>`COALESCE(sum(${analytics.pageViews}), 0)`.mapWith(
        Number,
      ),
      totalRevenue: sql<string>`COALESCE(sum(${analytics.revenue}), '0.00')`,
    })
    .from(analytics)
    .where(
      and(eq(analytics.entityType, "category"), gte(analytics.date, startDate)),
    )
    .groupBy(analytics.entityId)
    .orderBy(sql`COALESCE(sum(${analytics.pageViews}), 0) DESC`)
    .limit(limit);
}

/**
 * Get revenue insights - top revenue-generating entities
 * Used for monetization dashboards
 */
export async function getRevenueInsights(days: number = 30): Promise<
  Array<{
    entityType: string;
    totalRevenue: string;
    transactionCount: number;
  }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await db
    .select({
      entityType: analytics.entityType,
      totalRevenue: sql<string>`COALESCE(sum(${analytics.revenue}), '0.00')`,
      transactionCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(analytics)
    .where(gte(analytics.date, startDate))
    .groupBy(analytics.entityType)
    .orderBy(sql`sum(${analytics.revenue}) DESC`);
}

/**
 * Real-time performance check - get current day metrics
 * Used for live dashboards and status indicators
 */
export async function getTodayPerformance(
  businessId: number,
): Promise<BusinessPerformanceMetrics | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [result] = await db
    .select({
      date: analytics.date,
      views: sql<number>`COALESCE(sum(${analytics.pageViews}), 0)`.mapWith(
        Number,
      ),
      clicks: sql<number>`COALESCE(sum(${analytics.clicks}), 0)`.mapWith(
        Number,
      ),
      revenue: sql<string>`COALESCE(sum(${analytics.revenue}), '0.00')`,
    })
    .from(analytics)
    .where(
      and(
        eq(analytics.entityId, businessId),
        eq(analytics.entityType, "business"),
        gte(analytics.date, today),
        sql`${analytics.date} < ${tomorrow}`,
      ),
    )
    .groupBy(analytics.date);

  return result;
}

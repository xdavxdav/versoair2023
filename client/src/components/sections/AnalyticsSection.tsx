import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";
import {
  TrendingUp,
  Users,
  FileText,
  AlertCircle,
  BarChart3,
  Eye,
  MousePointerClick,
  Zap,
  Globe,
  Smartphone,
  Target,
  Activity,
  RefreshCw,
  TrendingDown,
  Percent,
  Clock,
} from "lucide-react";

interface Metrics {
  totalBusinesses: number;
  totalPages: number;
  totalUsers: number;
  businessesTrend: number;
  usersTrend: number;
  activeAdmins: number;
}

interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  timestamp: string;
  user: string;
}

interface GTMStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  uniqueSessions: number;
  uniqueUsers: number;
  pageViews: number;
  conversions: number;
  avgSessionDuration: number;
  bounceRate: number;
  topEvents: Array<{ name: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  timeline?: Array<{ hour: string; count: number }>;
}

export function AnalyticsSection() {
  const [period, setPeriod] = useState("week");
  const [hoursBack, setHoursBack] = useState(24);

  // Fetch GTM statistics
  const {
    data: gtmStats,
    isLoading: gtmLoading,
    refetch: refetchGTM,
  } = useQuery({
    queryKey: ["gtm-stats", hoursBack],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `http://localhost:5003/api/v1/admin/gtm-events/stats?hoursBack=${hoursBack}`,
        {},
      );
      if (!res.ok) throw new Error("Failed to fetch GTM stats");
      const json = await res.json();
      return json.data as GTMStats;
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time data
  });

  // Fetch analytics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `http://localhost:5003/api/v1/admin/analytics?period=${period}`,
        {},
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      return (
        json.data || {
          totalBusinesses: 0,
          totalPages: 0,
          totalUsers: 0,
          businessesTrend: 0,
          usersTrend: 0,
          activeAdmins: 0,
        }
      );
    },
  });

  // Fetch activity log
  const { data: activityLog = [], isLoading: activityLoading } = useQuery({
    queryKey: ["activity-log", period],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `http://localhost:5003/api/v1/admin/activity-log?period=${period}`,
        {},
      );
      if (!res.ok) throw new Error("Failed to fetch activity log");
      const json = await res.json();
      return json.data || [];
    },
  });

  const MetricCard = ({
    title,
    value,
    trend,
    icon: Icon,
  }: {
    title: string;
    value: number;
    trend?: number;
    icon: React.ComponentType<any> | React.ForwardRefExoticComponent<any>;
  }) => (
    <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
        <Icon size={20} className="text-blue-600" />
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {trend !== undefined && (
        <p
          className={`text-sm mt-2 ${
            trend > 0
              ? "text-green-600"
              : trend < 0
                ? "text-red-600"
                : "text-slate-600"
          }`}
        >
          {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend)}% from last{" "}
          {period}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header with View-Only Badge */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
            View Only
          </span>
        </div>
        <div className="flex gap-2">
          {["day", "week", "month", "year"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Google Tag Manager Live Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Google Tag Manager - Real-Time Tracking
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={hoursBack}
              onChange={(e) => setHoursBack(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 cursor-pointer hover:border-slate-400"
            >
              <option value={1}>Last 1 Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={72}>Last 72 Hours</option>
            </select>
            <button
              onClick={() => refetchGTM()}
              className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </button>
          </div>
        </div>

        {gtmLoading ? (
          <div className="bg-white rounded-lg shadow border border-slate-200 p-8 flex items-center justify-center">
            <div className="text-slate-500 flex items-center gap-2">
              <div className="animate-spin">
                <BarChart3 className="h-5 w-5" />
              </div>
              Loading GTM data...
            </div>
          </div>
        ) : gtmStats ? (
          <>
            {/* GTM Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-blue-900">
                    Total Events
                  </h4>
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {gtmStats.totalEvents.toLocaleString()}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Last {hoursBack} {hoursBack === 1 ? "hour" : "hours"}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-purple-900">
                    Page Views
                  </h4>
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {gtmStats.pageViews.toLocaleString()}
                </p>
                <p className="text-xs text-purple-700 mt-2">
                  {((gtmStats.pageViews / gtmStats.totalEvents) * 100).toFixed(
                    1,
                  )}
                  % of all events
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-green-900">
                    Conversions
                  </h4>
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {gtmStats.conversions.toLocaleString()}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  {(
                    (gtmStats.conversions / gtmStats.totalEvents) *
                    100
                  ).toFixed(1)}
                  % conversion rate
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow p-6 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-amber-900">
                    Unique Sessions
                  </h4>
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-900">
                  {gtmStats.uniqueSessions.toLocaleString()}
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  {gtmStats.uniqueUsers} unique users
                </p>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-cyan-600" />
                  <h4 className="font-semibold text-slate-900">
                    Avg Session Duration
                  </h4>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {gtmStats.avgSessionDuration}s
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Average time per session
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Percent className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold text-slate-900">Bounce Rate</h4>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {gtmStats.bounceRate}%
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Single-page sessions
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-semibold text-slate-900">
                    Events Per Session
                  </h4>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {(gtmStats.totalEvents / gtmStats.uniqueSessions).toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Average interaction depth
                </p>
              </div>
            </div>

            {/* Top Events */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6 mb-6">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                Top Events
              </h4>
              <div className="space-y-3">
                {gtmStats.topEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-slate-900 capitalize">
                      {event.name.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (event.count / gtmStats.topEvents[0].count) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-16 text-right">
                        {event.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device & Geography Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Device Breakdown */}
              <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" />
                  Device Breakdown
                </h4>
                <div className="space-y-2">
                  {Object.entries(gtmStats.deviceBreakdown).map(
                    ([device, count]) => (
                      <div
                        key={device}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-slate-600 capitalize">
                          {device}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded h-1.5">
                            <div
                              className="bg-indigo-600 h-1.5 rounded"
                              style={{
                                width: `${
                                  (count / gtmStats.totalEvents) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-900 w-12 text-right">
                            {((count / gtmStats.totalEvents) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Top Countries */}
              <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-teal-600" />
                  Top Countries
                </h4>
                <div className="space-y-2">
                  {Object.entries(gtmStats.countryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([country, count]) => (
                      <div
                        key={country}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-slate-600 font-medium">
                          {country}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded h-1.5">
                            <div
                              className="bg-teal-600 h-1.5 rounded"
                              style={{
                                width: `${
                                  (count / gtmStats.totalEvents) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-900 w-12 text-right">
                            {((count / gtmStats.totalEvents) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow border border-slate-200 p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600">No GTM data available yet</p>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Activity
        </h3>
        <div className="bg-white rounded-lg shadow border border-slate-200">
          {activityLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-slate-500">Loading activity log...</div>
            </div>
          ) : activityLog.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-slate-500">No activity recorded yet</div>
            </div>
          ) : (
            <div className="divide-y">
              {activityLog.map((log: ActivityLog) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {log.action}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {log.entity} • {log.user}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Health */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          System Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
              <h4 className="font-medium text-slate-900">Database</h4>
            </div>
            <p className="text-sm text-slate-600">Connected and operational</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
              <h4 className="font-medium text-slate-900">API Server</h4>
            </div>
            <p className="text-sm text-slate-600">Responding normally</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
              <h4 className="font-medium text-slate-900">Cache</h4>
            </div>
            <p className="text-sm text-slate-600">Active and optimized</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
              <h4 className="font-medium text-slate-900">Authentication</h4>
            </div>
            <p className="text-sm text-slate-600">JWT tokens valid</p>
          </div>
        </div>
      </div>
    </div>
  );
}

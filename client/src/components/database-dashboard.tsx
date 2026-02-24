"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  TrendingUp,
  Database,
  Users,
  Activity,
  Search,
  Filter,
  Download,
  Settings,
  Menu,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003";

interface BusinessType {
  id: number;
  name: string;
  count: number;
  growth: string;
  status: "healthy" | "warning" | "critical";
  last_updated: string;
}

interface CategoryStats {
  name: string;
  businesses: number;
  percentage: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  type: string;
  time: string;
  user: string;
  entity_type: string;
}

interface DatabaseStats {
  totalBusinesses: number;
  activeUsers: number;
  totalCategories: number;
  dbHealth: number;
}

export function DatabaseDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch database statistics
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dbStats"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/database/stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json() as Promise<DatabaseStats>;
    },
    refetchInterval: 30000,
  });

  // Fetch business types
  const { data: businessTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["businessTypes"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/database/business-types`,
      );
      if (!response.ok) throw new Error("Failed to fetch business types");
      return response.json() as Promise<BusinessType[]>;
    },
    refetchInterval: 60000,
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/database/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json() as Promise<CategoryStats[]>;
    },
    refetchInterval: 60000,
  });

  // Fetch activity log
  const { data: activityLog = [], isLoading: activityLoading } = useQuery({
    queryKey: ["activityLog"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/database/activity?limit=10`,
      );
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json() as Promise<ActivityEntry[]>;
    },
    refetchInterval: 15000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats()]);
    setRefreshing(false);
  };

  const statCards = [
    {
      label: "Total Businesses",
      value: stats?.totalBusinesses || "—",
      change: stats?.totalBusinesses ? "+2.5%" : "—",
      icon: Building2,
    },
    {
      label: "Active Users",
      value: stats?.activeUsers || "—",
      change: stats?.activeUsers ? "+12%" : "—",
      icon: Users,
    },
    {
      label: "Database Health",
      value: `${stats?.dbHealth || 0}%`,
      change: stats?.dbHealth && stats.dbHealth >= 95 ? "Optimal" : "Check",
      icon: Activity,
    },
    {
      label: "Total Categories",
      value: stats?.totalCategories || "—",
      change: "Organized",
      icon: Database,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 border-r border-slate-800 transition-all duration-300 overflow-y-auto flex flex-col`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">VAO DB</h1>
                <p className="text-xs text-slate-400">Management</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "businesses", label: "Businesses", icon: Building2 },
            { id: "categories", label: "Categories", icon: PieChart },
            { id: "analytics", label: "Analytics", icon: LineChart },
            { id: "activity", label: "Activity", icon: Activity },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                selectedTab === item.id
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300">
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium">Settings</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold capitalize text-white">
              {selectedTab}
            </h2>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-full">
              Real-time
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="ghost" size="icon">
              <Filter className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {selectedTab === "overview" && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-slate-400 mb-2">
                            {stat.label}
                          </p>
                          <p className="text-3xl font-bold text-white">
                            {stat.value}
                          </p>
                          <p className="text-xs text-indigo-400 mt-2">
                            {stat.change}
                          </p>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-lg">
                          <Icon className="w-6 h-6 text-indigo-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Business Types Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Business Types{" "}
                  {typesLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </h3>
                {typesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  </div>
                ) : businessTypes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {businessTypes.map((business) => (
                      <div
                        key={business.id}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl">🏢</span>
                          {business.status === "healthy" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : business.status === "warning" ? (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <h4 className="font-semibold mb-1 text-white">
                          {business.name}
                        </h4>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-2xl font-bold text-white">
                              {business.count}
                            </p>
                            <p className="text-xs text-slate-400">records</p>
                          </div>
                          <p className="text-sm font-medium text-indigo-400">
                            {business.growth}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No business data available
                  </div>
                )}
              </div>

              {/* Categories & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Categories */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">
                    Categories
                  </h3>
                  {categoriesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  ) : categories.length > 0 ? (
                    <div className="space-y-4">
                      {categories.slice(0, 5).map((cat, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-white">
                              {cat.name}
                            </span>
                            <span className="text-slate-400">
                              {cat.businesses}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                              style={{
                                width: `${Math.min(cat.percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      No category data
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    Recent Activity{" "}
                    {activityLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </h3>
                  {activityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  ) : activityLog.length > 0 ? (
                    <div className="space-y-3">
                      {activityLog.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-4 pb-3 border-b border-slate-700/50 last:border-b-0"
                        >
                          <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">
                              {log.action}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>{log.time}</span>
                              <span>•</span>
                              <span>{log.user}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      No activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTab === "businesses" && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-white">
                Business Types Management
              </h3>
              <div className="text-center py-12 text-slate-400">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a business type to manage</p>
              </div>
            </div>
          )}

          {selectedTab === "categories" && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-white">
                Category Hierarchy
              </h3>
              <div className="text-center py-12 text-slate-400">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Interactive category structure</p>
              </div>
            </div>
          )}

          {selectedTab === "analytics" && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-white">
                Real-time Analytics
              </h3>
              <div className="text-center py-12 text-slate-400">
                <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Performance metrics and insights</p>
              </div>
            </div>
          )}

          {selectedTab === "activity" && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-white">
                Complete Activity Log
              </h3>
              {activityLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : activityLog.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3 pr-4">
                    {activityLog.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 pb-3 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-800/30 p-2 rounded transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">
                            {log.action}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{log.time}</span>
                            <span>•</span>
                            <span>{log.user}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No activity yet
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

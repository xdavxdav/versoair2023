import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Plus,
  Search,
  Settings,
  ArrowLeft,
  BarChart3,
  ShieldAlert,
  Brain,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import OnboardingModal, {
  SECTOR_KPIS,
  TIER_ORDER,
} from "@/components/inventory/OnboardingModal";
import AddProductModal from "@/components/inventory/AddProductModal";

// ═══════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════
function getDaysUntilStockout(stock: number, dailyRate: number): number | null {
  if (!dailyRate || dailyRate <= 0) return null;
  return Math.round(stock / dailyRate);
}

function getUrgency(days: number | null): {
  label: string;
  color: string;
  bg: string;
} {
  if (days === null)
    return { label: "N/A", color: "#6B7280", bg: "bg-gray-500/10" };
  if (days <= 3)
    return { label: "Critical", color: "#EF4444", bg: "bg-red-500/10" };
  if (days <= 7)
    return { label: "Urgent", color: "#F59E0B", bg: "bg-amber-500/10" };
  if (days <= 14)
    return { label: "Warning", color: "#3B82F6", bg: "bg-blue-500/10" };
  return { label: "Healthy", color: "#10B981", bg: "bg-emerald-500/10" };
}

function formatCurrency(val: number | string | null): string {
  const n = Number(val) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function detectSector(
  categories: { category: string; count: number }[],
): string {
  if (!categories?.length) return "commerce";
  const top = categories[0]?.category?.toLowerCase() || "";
  if (
    top.includes("food") ||
    top.includes("hotel") ||
    top.includes("hospitality")
  )
    return "hospitality";
  if (
    top.includes("construct") ||
    top.includes("material") ||
    top.includes("cement")
  )
    return "construction";
  if (top.includes("auto") || top.includes("car") || top.includes("parts"))
    return "automotive";
  if (top.includes("finance") || top.includes("office")) return "finance";
  if (
    top.includes("entertain") ||
    top.includes("merch") ||
    top.includes("ticket")
  )
    return "entertainment";
  return "commerce";
}

// ═══════════════════════════════════════════════════════
// Stat Card component (dark VA theme)
// ═══════════════════════════════════════════════════════
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-4 flex items-start gap-4">
      <div
        className="p-2.5 rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          {title}
        </p>
        <p className="text-xl font-bold text-white mt-0.5 truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Stock badge
function StockBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "In Stock": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "Low Stock": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    "Out of Stock": "bg-red-500/10 text-red-400 border-red-500/30",
    Discontinued: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] || colors["In Stock"]}`}
    >
      {status}
    </span>
  );
}

// Chart colors
const CHART_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function InventoryDashboard() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const userTier = user?.subscriptionTier || user?.subscription_tier || "free";

  // ─── Fetch inventory settings ───
  const { data: settingsData } = useQuery<{ settings: Record<string, any> }>({
    queryKey: ["/api/inventory/settings"],
    retry: false,
  });

  const savedSector = settingsData?.settings?.sector as string | undefined;
  const savedKpis = settingsData?.settings?.enabled_kpis as
    | string[]
    | undefined;

  // ─── Fetch products ───
  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery<{
    products: any[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: [
      "/api/inventory/products",
      `?search=${search}&category=${categoryFilter}&status=${statusFilter}&limit=200`,
    ],
  });

  // ─── Fetch stats ───
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    stats: any;
    categories: any[];
    statuses: any[];
  }>({
    queryKey: ["/api/inventory/stats"],
  });

  // ─── Fetch alerts ───
  const { data: alertsData } = useQuery<{ alerts: any[]; total: number }>({
    queryKey: ["/api/inventory/alerts"],
  });

  // ─── Fetch predictions ───
  const { data: predictionsData } = useQuery<{ predictions: any[] }>({
    queryKey: ["/api/inventory/predictions"],
  });

  // ─── Detect sector from product data ───
  const effectiveSector = useMemo(() => {
    if (savedSector) return savedSector;
    if (statsData?.categories) return detectSector(statsData.categories);
    return "commerce";
  }, [savedSector, statsData]);

  const sectorConfig = SECTOR_KPIS[effectiveSector];

  // Show onboarding if no preferences saved
  useEffect(() => {
    if (settingsData && !savedSector && !productsLoading) {
      // Delay slightly so dashboard renders first
      const t = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(t);
    }
  }, [settingsData, savedSector, productsLoading]);

  // ─── Save settings mutation ───
  const saveSettingsMut = useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      await apiRequest("POST", "/api/inventory/settings", { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/settings"] });
    },
  });

  const handleOnboardingSave = useCallback(
    (sector: string, enabledKpis: string[]) => {
      saveSettingsMut.mutate({
        sector,
        enabled_kpis: enabledKpis,
      });
      setShowOnboarding(false);
    },
    [saveSettingsMut],
  );

  // ─── Delete product mutation ───
  const deleteProductMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      refetchProducts();
    },
  });

  // Derived data
  const products = productsData?.products || [];
  const stats = statsData?.stats;
  const categories = statsData?.categories || [];
  const statuses = statsData?.statuses || [];
  const alerts = alertsData?.alerts || [];
  const predictions = predictionsData?.predictions || [];

  // Category chart data
  const categoryChartData = useMemo(
    () =>
      categories.slice(0, 8).map((c) => ({
        name: c.category,
        count: c.count,
        value: Number(c.value) || 0,
      })),
    [categories],
  );

  // Status chart data
  const statusChartData = useMemo(
    () => statuses.map((s) => ({ name: s.status, value: s.count })),
    [statuses],
  );

  // Predictions sorted by urgency
  const sortedPredictions = useMemo(
    () =>
      [...predictions].sort((a, b) => {
        const daysA = Number(a.days_until_stockout) ?? 9999;
        const daysB = Number(b.days_until_stockout) ?? 9999;
        return daysA - daysB;
      }),
    [predictions],
  );

  const isLoading = productsLoading || statsLoading;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Package
                  className="w-5 h-5"
                  style={{ color: sectorConfig?.color || "#3B82F6" }}
                />
                Inventory Dashboard
              </h1>
              <p className="text-xs text-gray-500">
                {sectorConfig?.label || "Commerce"} ·{" "}
                {stats?.total_products || 0} products
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-400 hover:bg-gray-800"
              onClick={() => setShowOnboarding(true)}
            >
              <Settings className="w-4 h-4 mr-1" /> Customize
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowAddProduct(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ─── Stat Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Products"
            value={stats?.total_products ?? "—"}
            icon={Package}
            color="#3B82F6"
            subtitle={`${stats?.category_count ?? 0} categories`}
          />
          <StatCard
            title="Inventory Value"
            value={stats ? formatCurrency(stats.total_inventory_value) : "—"}
            icon={DollarSign}
            color="#10B981"
            subtitle={`Retail: ${stats ? formatCurrency(stats.total_retail_value) : "—"}`}
          />
          <StatCard
            title="Low Stock Items"
            value={stats?.low_stock_count ?? "—"}
            icon={AlertTriangle}
            color="#F59E0B"
            subtitle={`${stats?.out_of_stock_count ?? 0} out of stock`}
          />
          <StatCard
            title="Avg. Daily Sales"
            value={
              stats
                ? `${Number(stats.avg_daily_sales_rate).toFixed(1)} units`
                : "—"
            }
            icon={TrendingUp}
            color="#8B5CF6"
            subtitle={`${stats?.supplier_count ?? 0} suppliers`}
          />
        </div>

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800/50 border border-gray-700/50 p-1 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
            >
              <BarChart3 className="w-4 h-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
            >
              <Package className="w-4 h-4 mr-1.5" /> Inventory
            </TabsTrigger>
            <TabsTrigger
              value="predictions"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
            >
              <Brain className="w-4 h-4 mr-1.5" /> Predictions
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Alerts
              {alerts.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1.5 text-[10px] px-1.5 py-0"
                >
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Distribution */}
              <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">
                  Stock by Category
                </h3>
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1f2937"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#6B7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6B7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill={sectorConfig?.color || "#3B82F6"}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-600">
                    No product data yet
                  </div>
                )}
              </div>

              {/* Status Distribution Pie */}
              <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">
                  Stock Status
                </h3>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {statusChartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-600">
                    No status data
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Value by Category (area chart) */}
            {categoryChartData.length > 0 && (
              <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">
                  Inventory Value by Category
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={categoryChartData}>
                    <defs>
                      <linearGradient
                        id="valueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={sectorConfig?.color || "#3B82F6"}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={sectorConfig?.color || "#3B82F6"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      formatter={(v: number) => [formatCurrency(v), "Value"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={sectorConfig?.color || "#3B82F6"}
                      fill="url(#valueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          {/* ═══ INVENTORY TAB ═══ */}
          <TabsContent value="inventory" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products, SKU, supplier…"
                  className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-gray-300">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-gray-200">
                    All Categories
                  </SelectItem>
                  {categories.map((c) => (
                    <SelectItem
                      key={c.category}
                      value={c.category}
                      className="text-gray-200"
                    >
                      {c.category} ({c.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-gray-800/50 border-gray-700 text-gray-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-gray-200">
                    All Statuses
                  </SelectItem>
                  {[
                    "In Stock",
                    "Low Stock",
                    "Out of Stock",
                    "Discontinued",
                  ].map((s) => (
                    <SelectItem key={s} value={s} className="text-gray-200">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="border-gray-700 hover:bg-gray-800"
                onClick={() => refetchProducts()}
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </Button>
            </div>

            {/* Products Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-12 text-center">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">
                  {search || categoryFilter !== "all" || statusFilter !== "all"
                    ? "No products match your filters"
                    : "No products yet. Add your first item!"}
                </p>
                <Button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Product
                </Button>
              </div>
            ) : (
              <div className="bg-[#161b22] border border-gray-700/40 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">
                          Product
                        </th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">
                          SKU
                        </th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">
                          Category
                        </th>
                        <th className="text-right px-4 py-3 text-gray-500 font-medium">
                          Stock
                        </th>
                        <th className="text-right px-4 py-3 text-gray-500 font-medium">
                          Cost
                        </th>
                        <th className="text-right px-4 py-3 text-gray-500 font-medium">
                          Price
                        </th>
                        <th className="text-center px-4 py-3 text-gray-500 font-medium">
                          Status
                        </th>
                        <th className="text-center px-4 py-3 text-gray-500 font-medium">
                          Days Left
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const daysLeft = getDaysUntilStockout(
                          p.current_stock,
                          Number(p.daily_sales_rate),
                        );
                        const urgency = getUrgency(daysLeft);
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-white">
                              {p.name}
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                              {p.sku}
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              {p.category}
                            </td>
                            <td className="px-4 py-3 text-right text-white font-mono">
                              {p.current_stock}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400">
                              {formatCurrency(p.unit_cost)}
                            </td>
                            <td className="px-4 py-3 text-right text-white">
                              {formatCurrency(p.unit_price)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StockBadge status={p.status} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${urgency.bg}`}
                                style={{ color: urgency.color }}
                              >
                                {daysLeft !== null ? `${daysLeft}d` : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-end">
                                <button
                                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-500 hover:text-white transition-colors"
                                  title="Delete"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Delete "${p.name}"? This cannot be undone.`,
                                      )
                                    ) {
                                      deleteProductMut.mutate(p.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-700/30 text-xs text-gray-500">
                  Showing {products.length} of {productsData?.total ?? 0}{" "}
                  products
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ PREDICTIONS TAB ═══ */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">
                🧠 Stockout Predictions
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Estimated days until stockout based on daily sales rate
              </p>

              {sortedPredictions.length === 0 ? (
                <div className="py-12 text-center text-gray-600">
                  No active products for predictions
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedPredictions.slice(0, 20).map((p) => {
                    const days = Number(p.days_until_stockout);
                    const urgency = getUrgency(isNaN(days) ? null : days);
                    const profit = Number(p.projected_monthly_profit) || 0;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-800/30 hover:border-gray-700/50 transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0`}
                          style={{ backgroundColor: urgency.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.sku} · {p.category}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className="text-sm font-bold"
                            style={{ color: urgency.color }}
                          >
                            {!isNaN(days) ? `${days} days` : "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock: {p.current_stock}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 w-24">
                          <p className="text-xs text-gray-500">
                            Monthly demand
                          </p>
                          <p className="text-sm text-white">
                            {p.monthly_demand ?? "—"} units
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 w-28">
                          <p className="text-xs text-gray-500">
                            Projected profit
                          </p>
                          <p className="text-sm text-emerald-400">
                            {formatCurrency(profit)}/mo
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ ALERTS TAB ═══ */}
          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <div className="bg-[#161b22] border border-gray-700/40 rounded-xl p-12 text-center">
                <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  No stock alerts — all items above reorder thresholds! 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => {
                  const daysLeft = Number(a.days_until_stockout);
                  const urgency = getUrgency(isNaN(daysLeft) ? null : daysLeft);
                  return (
                    <div
                      key={a.id}
                      className={`bg-[#161b22] border rounded-xl p-4 flex items-center gap-4 ${
                        a.alert_type === "Out of Stock"
                          ? "border-red-500/30"
                          : "border-amber-500/30"
                      }`}
                    >
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${urgency.color}15` }}
                      >
                        <AlertTriangle
                          className="w-5 h-5"
                          style={{ color: urgency.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {a.name}{" "}
                          <span className="text-gray-500 font-mono text-xs">
                            ({a.sku})
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Stock: {a.current_stock} / Reorder at:{" "}
                          {a.reorder_point}
                          {a.supplier && ` · Supplier: ${a.supplier}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <StockBadge status={a.alert_type} />
                        <p className="text-xs text-gray-500 mt-1">
                          {!isNaN(daysLeft)
                            ? `~${daysLeft} days left`
                            : "No sales data"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Modals ─── */}
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSave={handleOnboardingSave}
        currentSector={savedSector}
        currentKpis={savedKpis}
        userTier={userTier}
      />
      <AddProductModal
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSuccess={() => {
          setShowAddProduct(false);
          queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
          refetchProducts();
        }}
        defaultSector={effectiveSector}
      />
    </div>
  );
}

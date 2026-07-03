import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Hotel,
  HardHat,
  Car,
  DollarSign,
  Gamepad2,
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Star,
  Activity,
  Percent,
  Wrench,
  Truck,
  Briefcase,
  Building2,
  type LucideIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// Sector KPI definitions — each sector gets tailored metrics
// ═══════════════════════════════════════════════════════
export interface KPIDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tier: "free" | "essential" | "verified" | "max";
}

export interface SectorKPIs {
  label: string;
  icon: LucideIcon;
  color: string;
  kpis: KPIDefinition[];
}

export const SECTOR_KPIS: Record<string, SectorKPIs> = {
  commerce: {
    label: "Commerce / Retail",
    icon: ShoppingCart,
    color: "#3B82F6",
    kpis: [
      {
        id: "stock_level",
        label: "Stock Levels",
        description: "Current inventory by product/category",
        icon: Package,
        tier: "free",
      },
      {
        id: "low_stock_alerts",
        label: "Low Stock Alerts",
        description: "Products below reorder threshold",
        icon: AlertTriangle,
        tier: "free",
      },
      {
        id: "revenue_trend",
        label: "Revenue Trend",
        description: "Daily/weekly/monthly sales revenue",
        icon: TrendingUp,
        tier: "free",
      },
      {
        id: "top_sellers",
        label: "Top Sellers",
        description: "Best-selling products ranked",
        icon: Star,
        tier: "essential",
      },
      {
        id: "inventory_value",
        label: "Inventory Value",
        description: "Total value of stock at cost and retail",
        icon: DollarSign,
        tier: "essential",
      },
      {
        id: "stockout_predictions",
        label: "Stockout Predictions",
        description: "AI-predicted days until stockout per item",
        icon: Activity,
        tier: "verified",
      },
      {
        id: "margin_analysis",
        label: "Margin Analysis",
        description: "Profit margin breakdown by category",
        icon: Percent,
        tier: "verified",
      },
      {
        id: "supplier_performance",
        label: "Supplier Performance",
        description: "Lead times, fill rates, cost trends",
        icon: Truck,
        tier: "max",
      },
    ],
  },
  hospitality: {
    label: "Hospitality / Hotels",
    icon: Hotel,
    color: "#8B5CF6",
    kpis: [
      {
        id: "stock_level",
        label: "Supply Levels",
        description: "Housekeeping, minibar, amenity stock",
        icon: Package,
        tier: "free",
      },
      {
        id: "low_stock_alerts",
        label: "Restock Alerts",
        description: "Supplies below reorder threshold",
        icon: AlertTriangle,
        tier: "free",
      },
      {
        id: "occupancy_rate",
        label: "Occupancy Rate",
        description: "Room occupancy percentage",
        icon: Percent,
        tier: "free",
      },
      {
        id: "revenue_trend",
        label: "RevPAR Trend",
        description: "Revenue per available room",
        icon: TrendingUp,
        tier: "essential",
      },
      {
        id: "guest_satisfaction",
        label: "Guest Satisfaction",
        description: "Review scores & feedback",
        icon: Star,
        tier: "essential",
      },
      {
        id: "stockout_predictions",
        label: "Supply Forecasting",
        description: "Predicted supply needs based on bookings",
        icon: Activity,
        tier: "verified",
      },
      {
        id: "margin_analysis",
        label: "Cost per Guest",
        description: "Amenity / F&B cost per occupied room",
        icon: DollarSign,
        tier: "verified",
      },
      {
        id: "supplier_performance",
        label: "Vendor Tracking",
        description: "Supplier reliability & pricing",
        icon: Truck,
        tier: "max",
      },
    ],
  },
  construction: {
    label: "Construction / BTP",
    icon: HardHat,
    color: "#F59E0B",
    kpis: [
      {
        id: "stock_level",
        label: "Material Stock",
        description: "Cement, rebar, lumber, etc.",
        icon: Package,
        tier: "free",
      },
      {
        id: "low_stock_alerts",
        label: "Material Alerts",
        description: "Items below project requirements",
        icon: AlertTriangle,
        tier: "free",
      },
      {
        id: "revenue_trend",
        label: "Project Revenue",
        description: "Billing and invoices trend",
        icon: TrendingUp,
        tier: "free",
      },
      {
        id: "equipment_status",
        label: "Equipment Status",
        description: "Active/idle/maintenance status of heavy equipment",
        icon: Wrench,
        tier: "essential",
      },
      {
        id: "project_cost",
        label: "Project Costs",
        description: "Budget vs actual material costs per project",
        icon: DollarSign,
        tier: "essential",
      },
      {
        id: "stockout_predictions",
        label: "Material Forecasting",
        description: "Predicted material needs by project timeline",
        icon: Activity,
        tier: "verified",
      },
      {
        id: "safety_compliance",
        label: "Safety Compliance",
        description: "PPE stock, inspection tracking",
        icon: AlertTriangle,
        tier: "verified",
      },
      {
        id: "supplier_performance",
        label: "Supplier Tracking",
        description: "Delivery times & pricing trends",
        icon: Truck,
        tier: "max",
      },
    ],
  },
  automotive: {
    label: "Automotive",
    icon: Car,
    color: "#EF4444",
    kpis: [
      {
        id: "stock_level",
        label: "Parts Inventory",
        description: "Auto parts, tires, fluids stock",
        icon: Package,
        tier: "free",
      },
      {
        id: "low_stock_alerts",
        label: "Parts Alerts",
        description: "Critical parts below reorder level",
        icon: AlertTriangle,
        tier: "free",
      },
      {
        id: "revenue_trend",
        label: "Service Revenue",
        description: "Revenue from repairs & parts sales",
        icon: TrendingUp,
        tier: "free",
      },
      {
        id: "top_sellers",
        label: "Top Parts",
        description: "Fastest-moving parts & accessories",
        icon: Star,
        tier: "essential",
      },
      {
        id: "work_orders",
        label: "Work Orders",
        description: "Open, in-progress, completed jobs",
        icon: Wrench,
        tier: "essential",
      },
      {
        id: "stockout_predictions",
        label: "Parts Forecasting",
        description: "Predicted demand based on service history",
        icon: Activity,
        tier: "verified",
      },
      {
        id: "margin_analysis",
        label: "Service Margins",
        description: "Profit margins on repairs & parts",
        icon: Percent,
        tier: "verified",
      },
      {
        id: "supplier_performance",
        label: "Parts Suppliers",
        description: "Distributor performance & pricing",
        icon: Truck,
        tier: "max",
      },
    ],
  },
  finance: {
    label: "Finance",
    icon: DollarSign,
    color: "#10B981",
    kpis: [
      {
        id: "stock_level",
        label: "Office Supplies",
        description: "Stationery, forms, toner stock",
        icon: Package,
        tier: "free",
      },
      {
        id: "portfolio_value",
        label: "Portfolio Value",
        description: "AUM and portfolio tracking",
        icon: Briefcase,
        tier: "free",
      },
      {
        id: "revenue_trend",
        label: "Fee Revenue",
        description: "Advisory fees, commissions trend",
        icon: TrendingUp,
        tier: "free",
      },
      {
        id: "client_count",
        label: "Client Count",
        description: "Active accounts & new acquisitions",
        icon: Users,
        tier: "essential",
      },
      {
        id: "compliance_status",
        label: "Compliance",
        description: "Regulatory reporting status",
        icon: AlertTriangle,
        tier: "essential",
      },
      {
        id: "risk_metrics",
        label: "Risk Metrics",
        description: "VAR, exposure limits, concentration",
        icon: Activity,
        tier: "verified",
      },
      {
        id: "margin_analysis",
        label: "Revenue per Client",
        description: "Fee income per account",
        icon: Percent,
        tier: "verified",
      },
      {
        id: "market_data",
        label: "Market Feeds",
        description: "Real-time market data integration",
        icon: BarChart3,
        tier: "max",
      },
    ],
  },
  entertainment: {
    label: "Entertainment",
    icon: Gamepad2,
    color: "#EC4899",
    kpis: [
      {
        id: "stock_level",
        label: "Merchandise Stock",
        description: "Tickets, merch, concessions",
        icon: Package,
        tier: "free",
      },
      {
        id: "low_stock_alerts",
        label: "Merch Alerts",
        description: "Low-stock merchandise items",
        icon: AlertTriangle,
        tier: "free",
      },
      {
        id: "revenue_trend",
        label: "Ticket Revenue",
        description: "Box office & online sales trend",
        icon: TrendingUp,
        tier: "free",
      },
      {
        id: "event_attendance",
        label: "Attendance",
        description: "Event attendance rates",
        icon: Users,
        tier: "essential",
      },
      {
        id: "top_sellers",
        label: "Best Events",
        description: "Highest-grossing events & shows",
        icon: Star,
        tier: "essential",
      },
      {
        id: "stockout_predictions",
        label: "Demand Forecasting",
        description: "Predicted merch & ticket demand",
        icon: Activity,
        tier: "verified",
      },
      {
        id: "margin_analysis",
        label: "Event Margins",
        description: "Cost vs revenue per event",
        icon: Percent,
        tier: "verified",
      },
      {
        id: "audience_insights",
        label: "Audience Insights",
        description: "Demographics & engagement data",
        icon: BarChart3,
        tier: "max",
      },
    ],
  },
};

export const TIER_ORDER = ["free", "essential", "verified", "max"] as const;

export const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "#9CA3AF" },
  essential: { label: "Essential", color: "#3B82F6" },
  verified: { label: "Verified", color: "#8B5CF6" },
  max: { label: "Max", color: "#F59E0B" },
};

// ═══════════════════════════════════════════════════════
// OnboardingModal component
// ═══════════════════════════════════════════════════════
interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (sector: string, enabledKpis: string[]) => void;
  currentSector?: string;
  currentKpis?: string[];
  userTier?: string;
}

export default function OnboardingModal({
  open,
  onClose,
  onSave,
  currentSector,
  currentKpis = [],
  userTier = "free",
}: OnboardingModalProps) {
  const [selectedSector, setSelectedSector] = useState(currentSector || "");
  const [enabledKpis, setEnabledKpis] = useState<string[]>(currentKpis);
  const [step, setStep] = useState<"sector" | "kpis">(
    currentSector ? "kpis" : "sector",
  );

  const userTierIdx = TIER_ORDER.indexOf(
    userTier as (typeof TIER_ORDER)[number],
  );
  const effectiveTierIdx = userTierIdx >= 0 ? userTierIdx : 0;

  const sectorConfig = useMemo(
    () => (selectedSector ? SECTOR_KPIS[selectedSector] : null),
    [selectedSector],
  );

  const toggleKpi = useCallback(
    (kpiId: string, kpiTier: string) => {
      const kpiTierIdx = TIER_ORDER.indexOf(
        kpiTier as (typeof TIER_ORDER)[number],
      );
      if (kpiTierIdx > effectiveTierIdx) return; // Tier-gated

      setEnabledKpis((prev) =>
        prev.includes(kpiId)
          ? prev.filter((k) => k !== kpiId)
          : [...prev, kpiId],
      );
    },
    [effectiveTierIdx],
  );

  const handleSave = () => {
    if (selectedSector && enabledKpis.length > 0) {
      onSave(selectedSector, enabledKpis);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0d1117] border border-gray-700/50 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {step === "sector"
              ? "📊 Customize Your Dashboard"
              : `Configure ${sectorConfig?.label || ""} KPIs`}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === "sector"
              ? "Choose your business sector to see tailored metrics and KPIs."
              : "Select which KPIs to display on your inventory dashboard."}
          </DialogDescription>
        </DialogHeader>

        {step === "sector" ? (
          /* ─── Sector Selection ─── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
            {Object.entries(SECTOR_KPIS).map(([key, s]) => {
              const Icon = s.icon;
              const selected = key === selectedSector;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedSector(key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selected
                      ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                      : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50"
                  }`}
                >
                  <Icon
                    className="w-8 h-8"
                    style={{ color: selected ? s.color : "#9CA3AF" }}
                  />
                  <span
                    className={`text-sm font-medium ${selected ? "text-white" : "text-gray-400"}`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* ─── KPI Selection ─── */
          <div className="space-y-2 py-4 max-h-[50vh] overflow-y-auto pr-2">
            {TIER_ORDER.map((tier) => {
              const tierKpis =
                sectorConfig?.kpis.filter((k) => k.tier === tier) || [];
              if (!tierKpis.length) return null;
              const tierInfo = TIER_LABELS[tier];
              const locked = TIER_ORDER.indexOf(tier) > effectiveTierIdx;

              return (
                <div key={tier} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{
                        color: tierInfo.color,
                        backgroundColor: `${tierInfo.color}20`,
                      }}
                    >
                      {tierInfo.label}
                    </span>
                    {locked && (
                      <span className="text-xs text-gray-500">
                        🔒 Upgrade to unlock
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {tierKpis.map((kpi) => {
                      const Icon = kpi.icon;
                      const active = enabledKpis.includes(kpi.id);
                      return (
                        <button
                          key={kpi.id}
                          disabled={locked}
                          onClick={() => toggleKpi(kpi.id, kpi.tier)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                            locked
                              ? "border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed"
                              : active
                                ? "border-blue-500/50 bg-blue-500/10"
                                : "border-gray-700/50 bg-gray-800/20 hover:border-gray-600 cursor-pointer"
                          }`}
                        >
                          <Icon
                            className="w-5 h-5 flex-shrink-0"
                            style={{
                              color: active ? sectorConfig?.color : "#6B7280",
                            }}
                          />
                          <div className="flex-1 text-left">
                            <div
                              className={`text-sm font-medium ${active ? "text-white" : "text-gray-300"}`}
                            >
                              {kpi.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {kpi.description}
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              active
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-600"
                            }`}
                          >
                            {active && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex gap-2 pt-2">
          {step === "kpis" && (
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => setStep("sector")}
            >
              ← Back
            </Button>
          )}
          <Button
            variant="outline"
            className="border-gray-700 text-gray-400 hover:bg-gray-800"
            onClick={onClose}
          >
            Cancel
          </Button>
          {step === "sector" ? (
            <Button
              disabled={!selectedSector}
              onClick={() => {
                setEnabledKpis(
                  sectorConfig?.kpis
                    .filter(
                      (k) =>
                        TIER_ORDER.indexOf(
                          k.tier as (typeof TIER_ORDER)[number],
                        ) <= effectiveTierIdx,
                    )
                    .map((k) => k.id) || [],
                );
                setStep("kpis");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next →
            </Button>
          ) : (
            <Button
              disabled={!enabledKpis.length}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Preferences
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

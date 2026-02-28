import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Briefcase,
  ShoppingCart,
  BarChart3,
  MapPin,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Home,
  Eye,
  MousePointerClick,
  Search,
  Star,
  Lock,
  Bell,
  Settings,
  FileText,
  Download,
  Zap,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 🛸 Growth Engine Imports
import {
  TIERS,
  TIER_FEATURES,
  type TierKey,
  calculateRankScore,
  estimateHiddenSearches,
  isFeatureLocked,
} from "@/lib/tiers";
import {
  VisibilityMeter,
  TierBadge,
  RankScoreDisplay,
} from "@/components/VisibilityMeter";
import {
  TierComparisonModal,
  HiddenSearchesAlert,
} from "@/components/TierComparisonModal";
import { RevenueSimulator } from "@/components/RevenueSimulator";
import { VerificationQuickStatus } from "@/components/VerificationStatusClientView";

// 🧠 Relevance Engine Imports
import {
  getSubscriberStats,
  resolveProfile,
  type ResolvedMetric,
} from "@/lib/industry-profiles";

// 🎯 Industry-Relevant KPIs
import {
  getRelevantStats,
  detectBusinessCategory,
  filterStatsByTier,
  getStatVisibility,
} from "@/lib/industry-kpis";
import { StatCard, StatGrid } from "@/components/StatCard";
import { useBusinessStats } from "@/hooks/use-business-stats";
import {
  generateMockStats,
  generateCategoryInsights,
  getTierStatRecommendations,
} from "@/lib/mock-stat-generator";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  subscriptionTier?: TierKey;
  subscriptionStatus?: string;
  premiumExpiresAt?: string;
}

interface BusinessData {
  id: number;
  name: string;
  description?: string;
  category?: string;
  location?: string;
  rating: number;
  reviewCount: number;
  verification_status: "unverified" | "verified" | "rejected";
  verification_reason?: string;
  verification_date?: string;
  verified_by_username?: string;
  is_active: boolean;
  is_advertiser: boolean;
  photos_count: number;
  products_count: number;
  created_at: string;
}

interface BusinessAnalytics {
  pageViews: number;
  uniqueVisitors: number;
  clicks: number;
  conversions: number;
  searchAppearances: number;
  categoryAvgSearches: number;
  topKeywords: Array<{ keyword: string; count: number }>;
  viewsHistory: Array<{ date: string; views: number }>;
  competitorAvgRating: number;
  competitorAvgReviews: number;
  categoryRank: number;
  categoryTotal: number;
}

interface PublicStats {
  totalBusinesses: number;
  businessesByCountry: Record<string, number>;
  categoriesCount: number;
  jobListings: number;
  recentListings: Array<{ id: string; name: string; location: string }>;
  topCategories: Array<{ name: string; count: number }>;
}

// ─── MOCK DATA (Replace with real API when ready) ───────────────────────────────

function getMockBusiness(tier: TierKey): BusinessData {
  return {
    id: 1,
    name: "My Business",
    description: "A great business on the VersoAir platform",
    category: "Commerce",
    location: "Paris, France",
    rating: 4.2,
    reviewCount: 23,
    verification_status: "verified",
    is_active: true,
    is_advertiser: tier !== "free",
    photos_count: 3,
    products_count: 12,
    created_at: "2025-11-15T10:30:00Z",
  };
}

function getMockAnalytics(tier: TierKey): BusinessAnalytics {
  const power = TIERS[tier].rankingPower;
  return {
    pageViews: 120 * power,
    uniqueVisitors: 85 * power,
    clicks: 34 * power,
    conversions: 8 * power,
    searchAppearances: 450 * power,
    categoryAvgSearches: 1200,
    topKeywords: [
      { keyword: "restaurant paris", count: 45 * power },
      { keyword: "best food delivery", count: 32 * power },
      { keyword: "catering service", count: 28 * power },
      { keyword: "lunch menu", count: 21 * power },
      { keyword: "business lunch", count: 15 * power },
    ],
    viewsHistory: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(
        "en-US",
        { weekday: "short" },
      ),
      views: Math.floor(15 * power + Math.random() * 20 * power),
    })),
    competitorAvgRating: 3.8,
    competitorAvgReviews: 15,
    categoryRank: Math.max(1, Math.floor(50 / power)),
    categoryTotal: 120,
  };
}

// ─── HELPER SUB-COMPONENTS ──────────────────────────────────────────────────────

function LockedOverlay({
  feature,
  onUpgrade,
  children,
}: {
  feature: string;
  currentTier: TierKey;
  onUpgrade: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="filter blur-sm pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
        <Lock className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm font-bold text-gray-700 mb-1">{feature}</p>
        <p className="text-xs text-gray-500 mb-3">
          Available from Pro Verified and above
        </p>
        <button
          onClick={onUpgrade}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          🔓 Unlock Feature
        </button>
      </div>
    </div>
  );
}

function VerificationTrustHub({
  tier,
  isVerified,
}: {
  tier: TierKey;
  verificationStatus: string;
  isVerified: boolean;
}) {
  const hasPaidForVisibility = tier !== "free";
  const hasCompletedVerification = isVerified;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🛡️ Verification & Trust
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Badge Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {!hasPaidForVisibility
                ? "⬜"
                : hasCompletedVerification
                  ? "✅"
                  : "🟡"}
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-800">
                {!hasPaidForVisibility
                  ? "Standard Listing"
                  : hasCompletedVerification
                    ? "Verified Presence"
                    : "Pending Trust"}
              </div>
              <div className="text-xs text-gray-500">
                {!hasPaidForVisibility
                  ? "Grey badge — basic listing"
                  : hasCompletedVerification
                    ? "Blue checkmark — trusted business"
                    : "Upload ID/License to complete"}
              </div>
            </div>
          </div>
          <Badge
            className={
              !hasPaidForVisibility
                ? "bg-gray-100 text-gray-600"
                : hasCompletedVerification
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
            }
          >
            {!hasPaidForVisibility
              ? "Grey"
              : hasCompletedVerification
                ? "Blue ✓"
                : "Pending"}
          </Badge>
        </div>

        {/* The Hook — paid but unverified */}
        {hasPaidForVisibility && !hasCompletedVerification && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-semibold">
              💡 You're paying for visibility, but trust closes the deal.
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Finish verification to unlock your blue badge. Upload your
              business license or ID.
            </p>
            <button className="mt-2 text-sm font-bold text-yellow-900 underline hover:text-yellow-700">
              Complete Verification →
            </button>
          </div>
        )}

        {/* Trust Checklist */}
        <div className="space-y-2">
          {[
            { done: true, label: "Email verified" },
            { done: true, label: "Business information complete" },
            {
              done: hasCompletedVerification,
              label: "Identity/License uploaded",
            },
            { done: hasCompletedVerification, label: "Admin review passed" },
            { done: hasPaidForVisibility, label: "Active subscription" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className={item.done ? "text-green-500" : "text-gray-300"}>
                {item.done ? "✓" : "○"}
              </span>
              <span className={item.done ? "text-gray-700" : "text-gray-400"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStat({
  icon,
  label,
  value,
  change,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <span
        className={`text-xs font-semibold ${positive ? "text-emerald-600" : "text-gray-500"}`}
      >
        {change}
      </span>
    </div>
  );
}

function PublicStatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: any;
}) {
  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-100">
            <Icon className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-900">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

/**
 * 🧠 Smart Industry Metric Card — The Relevance Engine's rendering unit.
 * Shows real value if unlocked, or a ghost/blur state with upgrade CTA if locked.
 */
function IndustryMetricCard({
  metric,
  onUpgrade,
}: {
  metric: ResolvedMetric;
  onUpgrade: () => void;
}) {
  if (metric.isLocked) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        {/* Ghost value — blurred to create curiosity */}
        <div className="filter blur-sm select-none pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{metric.emoji}</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {metric.label}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-300">•••</div>
          <div className="text-xs text-gray-300 mt-1">+0%</div>
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
          <Lock className="h-5 w-5 text-gray-400 mb-1" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
            {metric.tier}+ required
          </p>
          <button
            onClick={onUpgrade}
            className="mt-1 px-3 py-1 text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
          >
            🔓 Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{metric.emoji}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {metric.label}
          </span>
        </div>
        {metric.positive ? (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            ↑ {Math.abs(metric.change)}%
          </span>
        ) : (
          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            ↓ {Math.abs(metric.change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {metric.value !== null ? metric.value.toLocaleString() : "—"}
      </div>
      <p
        className="text-[11px] text-gray-400 mt-1 line-clamp-1"
        title={metric.description}
      >
        {metric.description}
      </p>
    </div>
  );
}

function FeatureRow({
  icon,
  label,
  value,
  active,
}: {
  icon: string;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div
          className={`text-sm font-medium ${active ? "text-gray-800" : "text-gray-400"}`}
        >
          {label}
        </div>
        <div
          className={`text-xs ${active ? "text-gray-500" : "text-gray-400"}`}
        >
          {active
            ? value.charAt(0).toUpperCase() + value.slice(1)
            : "🔒 " + value}
        </div>
      </div>
      {active ? (
        <CheckCircle className="h-4 w-4 text-emerald-500" />
      ) : (
        <Lock className="h-4 w-4 text-gray-300" />
      )}
    </div>
  );
}

// ─── INDUSTRY-RELEVANT KPIs SECTION ───────────────────────────────────────────

/**
 * 🎯 Industry-Relevant KPIs Component
 * Shows the most relevant metrics for the user's business category
 * with tier-based visibility controls
 */
function IndustryKPIsSection({
  businessData,
  mockStats,
  userTier,
  onUpgrade,
}: {
  businessData: BusinessData;
  mockStats: any;
  userTier: TierKey;
  onUpgrade: () => void;
}) {
  // Detect category and get relevant stats
  const category = useMemo(
    () =>
      detectBusinessCategory(
        businessData.category || "",
        businessData.description || "",
        businessData.name || "",
      ),
    [businessData],
  );

  const statBlock = useMemo(
    () => getRelevantStats(category, mockStats, userTier),
    [category, mockStats, userTier],
  );

  const filteredStats = useMemo(
    () => filterStatsByTier(statBlock.industry, userTier),
    [statBlock.industry, userTier],
  );

  const categoryInsights = useMemo(
    () => generateCategoryInsights(category, mockStats),
    [category, mockStats],
  );

  const tierRecommendations = useMemo(
    () => getTierStatRecommendations(userTier),
    [userTier],
  );

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>🎯</span>
              Industry-Relevant KPIs for {category}
            </CardTitle>
            <CardDescription>
              {getStatVisibility(userTier).description} — Top metrics that drive
              your business
            </CardDescription>
          </div>
          {userTier === "free" && (
            <Button
              onClick={onUpgrade}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Lock className="h-3 w-3 mr-1" />
              Upgrade for more stats
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stat Cards Grid */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Your Primary Stats
            </span>
            <Badge variant="outline" className="text-xs">
              {getStatVisibility(userTier).name}
            </Badge>
          </div>
          <StatGrid
            stats={[statBlock.common, ...filteredStats]}
            tier={userTier}
            maxCols={4}
          />
        </div>

        {/* Key Insights */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            📊 Key Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(categoryInsights).map(([key, insight]) => (
              <div
                key={key}
                className="p-3 bg-white rounded-lg border border-indigo-100"
              >
                <p className="text-xs text-slate-600">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Recommendations */}
        {userTier !== "enterprise" && (
          <div className="border-t pt-4 bg-white rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  {userTier === "free"
                    ? "Unlock More Insights"
                    : "Level Up Your Analytics"}
                </h4>
                <ul className="space-y-1">
                  {tierRecommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-slate-600">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛸 MAIN DASHBOARD COMPONENT — Business Growth Engine
// ═══════════════════════════════════════════════════════════════════════════════

export default function PublicDashboard() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // ── Auth ──
  const { data: userSession } = useQuery<{ user: CurrentUser } | null>({
    queryKey: ["auth-session"],
    queryFn: async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        const headers: Record<string, string> = {
          "Cache-Control": "no-cache",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/auth/session`, {
          headers,
        });
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: "always" as any,
  });

  // ── Public stats ──
  const { data: stats, isLoading: statsLoading } = useQuery<PublicStats>({
    queryKey: ["public-dashboard-stats"],
    queryFn: async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/public/dashboard-stats`,
        );
        if (!response.ok) throw new Error("Failed");
        return response.json();
      } catch {
        return null;
      }
    },
    retry: 2,
  });

  // ── Derived state ──
  const isLoggedIn = !!userSession?.user;
  const currentTier: TierKey =
    (userSession?.user?.subscriptionTier as TierKey) || "free";
  const tierDef = TIERS[currentTier];
  const features = TIER_FEATURES[currentTier];

  // Mock business + analytics (swap with real API later)
  const business = useMemo(() => getMockBusiness(currentTier), [currentTier]);
  const analytics = useMemo(() => getMockAnalytics(currentTier), [currentTier]);

  const rankScore = useMemo(
    () =>
      calculateRankScore({
        tier: currentTier,
        isVerified: business.verification_status === "verified",
        rating: business.rating,
        reviewCount: business.reviewCount,
        photosUploaded: business.photos_count,
        profileCompleteness: 75,
      }),
    [currentTier, business],
  );

  const hiddenSearches = useMemo(
    () =>
      estimateHiddenSearches({
        tier: currentTier,
        categoryAvgSearches: analytics.categoryAvgSearches,
      }),
    [currentTier, analytics],
  );

  // 🧠 Relevance Engine — resolve industry-specific KPIs
  const industryProfile = useMemo(
    () => resolveProfile(business.category || ""),
    [business.category],
  );
  const industryStats = useMemo(
    () => getSubscriberStats(business.category || "", currentTier),
    [business.category, currentTier],
  );

  const mockStats = useMemo(
    () =>
      generateMockStats(
        business.category || "default",
        business.rating,
        business.reviewCount,
      ),
    [business.category, business.rating, business.reviewCount],
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("geoadmin_login_time");
    window.location.href = "/geo-admin";
  };

  const handleBackToGeoAdmin = () => {
    // Navigate to geo-admin, will be auto-authenticated if token exists
    window.location.href = "/geo-admin";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-slate-300 hover:text-white"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>

              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-slate-300 hover:text-white"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>

              <div className="hidden lg:flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Tier Badge */}
              {isLoggedIn && <TierBadge tier={currentTier} size="sm" />}

              {/* Verification Quick Status */}
              {isLoggedIn && (
                <VerificationQuickStatus
                  status={business.verification_status}
                  isActive={business.is_active}
                />
              )}

              {/* Notifications */}
              {isLoggedIn && (
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    3
                  </span>
                </Button>
              )}

              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold hover:shadow-lg transition-all">
                        {(
                          userSession!.user.name ||
                          userSession!.user.email ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col gap-1">
                      <span className="font-bold text-sm">
                        {userSession!.user.name || "User"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {userSession!.user.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {userSession!.user.isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/tickets">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            TAM (Ticket Assignment Management)
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Bell className="h-4 w-4 mr-2" />
                      Preferences
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBackToGeoAdmin}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Geo Admin
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={handleBackToGeoAdmin}
                  className="gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Geo Admin
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-100 space-y-2">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/businesses-directory">Browse Businesses</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/communities">Communities</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── THE "AHA!" MOMENT — hidden searches alert ──────────────────── */}
        {isLoggedIn && (
          <HiddenSearchesAlert
            hiddenCount={hiddenSearches}
            currentTier={currentTier}
            onSeeWhy={() => setShowComparisonModal(true)}
          />
        )}

        {/* ── WELCOME + TIER HEADER ──────────────────────────────────────── */}
        <div className="mt-6 mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-800/50 via-slate-800/30 to-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {isLoggedIn
                ? `Welcome back, ${userSession!.user.name || "Business Owner"}`
                : "Welcome to Verso Air Intelligence"}
            </h1>
            <p className="text-slate-300 mt-2 text-lg">
              {isLoggedIn
                ? `${tierDef.icon} ${tierDef.name} Plan — ${tierDef.visibilityNarrative}`
                : "Explore our comprehensive business directory and opportunities"}
            </p>
            {isLoggedIn && (
              <p className="text-slate-400 text-sm mt-3">
                🕐 Signed in at{" "}
                {new Date(
                  localStorage.getItem("signin_timestamp") || Date.now(),
                ).toLocaleTimeString()}
              </p>
            )}
          </div>
          {isLoggedIn && currentTier !== "enterprise" && (
            <Button
              onClick={() => setShowComparisonModal(true)}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-bold gap-2 shadow-lg"
            >
              <Zap className="h-4 w-4" />
              Upgrade Plan
            </Button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            LOGGED IN: Subscriber Dashboard
            ═══════════════════════════════════════════════════════════════════ */}
        {isLoggedIn ? (
          <>
            {/* ── TOP ROW: Visibility Gauge + Stats + Trust Hub ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Visibility Meter */}
              <VisibilityMeter
                currentTier={currentTier}
                onBoostClick={() => setShowComparisonModal(true)}
              />

              {/* Middle: Rank Score + Quick Stats */}
              <div className="space-y-4">
                <RankScoreDisplay
                  score={rankScore}
                  tier={currentTier}
                  onUpgradeClick={() => setShowComparisonModal(true)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <QuickStat
                    icon={<Eye className="h-4 w-4 text-blue-600" />}
                    label={industryStats[0]?.label ?? "Page Views"}
                    value={industryStats[0]?.value ?? analytics.pageViews}
                    change={
                      industryStats[0]
                        ? `${industryStats[0].positive ? "+" : ""}${industryStats[0].change}%`
                        : "+12%"
                    }
                    positive={industryStats[0]?.positive ?? true}
                  />
                  <QuickStat
                    icon={
                      <MousePointerClick className="h-4 w-4 text-emerald-600" />
                    }
                    label={
                      industryStats[1]?.isLocked
                        ? "Clicks"
                        : (industryStats[1]?.label ?? "Clicks")
                    }
                    value={
                      industryStats[1]?.isLocked
                        ? analytics.clicks
                        : (industryStats[1]?.value ?? analytics.clicks)
                    }
                    change={
                      industryStats[1]?.isLocked
                        ? "+8%"
                        : `${industryStats[1]?.positive ? "+" : ""}${industryStats[1]?.change}%`
                    }
                    positive={
                      industryStats[1]?.isLocked
                        ? true
                        : (industryStats[1]?.positive ?? true)
                    }
                  />
                  <QuickStat
                    icon={<Search className="h-4 w-4 text-purple-600" />}
                    label="Search Hits"
                    value={analytics.searchAppearances}
                    change="+24%"
                    positive
                  />
                  <QuickStat
                    icon={<Star className="h-4 w-4 text-yellow-500" />}
                    label="Rating"
                    value={business.rating.toFixed(1)}
                    change={`${business.reviewCount} reviews`}
                  />
                </div>
              </div>

              {/* Right: Verification & Trust Hub */}
              <VerificationTrustHub
                tier={currentTier}
                verificationStatus={business.verification_status}
                isVerified={business.verification_status === "verified"}
              />
            </div>

            {/* ── TABBED CONTENT (Subscriber) ────────────────────────────── */}
            <Tabs defaultValue="analytics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
                <TabsTrigger value="visibility">🚀 Visibility</TabsTrigger>
                <TabsTrigger value="overview">🏠 Overview</TabsTrigger>
                <TabsTrigger value="categories">📂 Categories</TabsTrigger>
                <TabsTrigger value="opportunities">
                  💼 Opportunities
                </TabsTrigger>
              </TabsList>

              {/* ── ANALYTICS TAB ─────────────────────────────────────── */}
              <TabsContent value="analytics" className="space-y-6">
                {/* 🎯 INDUSTRY-RELEVANT KPIs SECTION ──────────────────── */}
                <IndustryKPIsSection
                  businessData={business}
                  mockStats={mockStats}
                  userTier={currentTier}
                  onUpgrade={() => setShowComparisonModal(true)}
                />

                {/* Performance Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Performance Overview</CardTitle>
                        <CardDescription>
                          Your business metrics this week
                        </CardDescription>
                      </div>
                      {features.exportData && (
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Bar Chart */}
                    <div className="flex items-end gap-2 h-40 mb-4">
                      {analytics.viewsHistory.map((day, i) => {
                        const maxViews = Math.max(
                          ...analytics.viewsHistory.map((d) => d.views),
                        );
                        const height = (day.views / maxViews) * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-xs text-gray-500 font-semibold">
                              {day.views}
                            </span>
                            <div
                              className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t-md transition-all hover:from-indigo-600 hover:to-purple-500"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-xs text-gray-400">
                              {day.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 🧠 Industry-Specific KPI Grid (Relevance Engine) */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">{industryProfile.icon}</span>
                        <h3
                          className={`text-sm font-bold ${industryProfile.accentColor}`}
                        >
                          {industryProfile.name} Metrics
                        </h3>
                        <span className="text-xs text-gray-400 ml-auto">
                          Powered by Relevance Engine
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {industryStats.map((metric) => (
                          <IndustryMetricCard
                            key={metric.key}
                            metric={metric}
                            onUpgrade={() => setShowComparisonModal(true)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Keyword Tracking — GATED */}
                {isFeatureLocked(currentTier, "keywordTracking") ? (
                  <LockedOverlay
                    feature="Who is searching for you?"
                    currentTier={currentTier}
                    onUpgrade={() => setShowComparisonModal(true)}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>🔍 Keyword Tracking</CardTitle>
                        <CardDescription>
                          See what customers search to find you
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            "restaurant paris",
                            "best food",
                            "catering",
                            "lunch menu",
                            "business lunch",
                          ].map((kw) => (
                            <div
                              key={kw}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <span className="text-sm">{kw}</span>
                              <span className="text-sm font-bold">--</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </LockedOverlay>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>🔍 Top Keywords</CardTitle>
                      <CardDescription>
                        What customers search to find you
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topKeywords.map((kw, i) => {
                          const max = analytics.topKeywords[0].count;
                          const pct = (kw.count / max) * 100;
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 font-medium">
                                  {kw.keyword}
                                </span>
                                <span className="text-gray-500 font-bold">
                                  {kw.count} hits
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Competitor Comparison — GATED */}
                {isFeatureLocked(currentTier, "competitorInsights") ? (
                  <LockedOverlay
                    feature="Competitor Comparison"
                    currentTier={currentTier}
                    onUpgrade={() => setShowComparisonModal(true)}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>⚔️ Competitor Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold">--</div>
                            <div className="text-sm text-gray-500">
                              Your Rating
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold">--</div>
                            <div className="text-sm text-gray-500">
                              Category Avg
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold">--</div>
                            <div className="text-sm text-gray-500">
                              Your Rank
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </LockedOverlay>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>⚔️ Competitor Comparison</CardTitle>
                      <CardDescription>
                        How you stack up in your category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-700">
                            {business.rating.toFixed(1)}
                          </div>
                          <div className="text-sm text-blue-600">
                            Your Rating
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            vs. avg {analytics.competitorAvgRating.toFixed(1)}
                          </div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                          <div className="text-2xl font-bold text-emerald-700">
                            {business.reviewCount}
                          </div>
                          <div className="text-sm text-emerald-600">
                            Your Reviews
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            vs. avg {analytics.competitorAvgReviews}
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="text-2xl font-bold text-purple-700">
                            #{analytics.categoryRank}
                          </div>
                          <div className="text-sm text-purple-600">
                            Category Rank
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            of {analytics.categoryTotal} businesses
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── VISIBILITY TAB ────────────────────────────────────── */}
              <TabsContent value="visibility" className="space-y-6">
                {/* Revenue Simulator */}
                <RevenueSimulator
                  currentTier={currentTier}
                  currentMonthlyViews={analytics.pageViews}
                  locked={isFeatureLocked(currentTier, "revenueSimulator")}
                  onUpgradeClick={() => setShowComparisonModal(true)}
                />

                {/* Feature Access Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>🎛️ Your Feature Access</CardTitle>
                    <CardDescription>
                      What's included in your {tierDef.name} plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FeatureRow
                        icon="📸"
                        label="Photos"
                        value={`${features.photos === -1 ? "Unlimited" : features.photos} allowed`}
                        active
                      />
                      <FeatureRow
                        icon="🛍️"
                        label="Products"
                        value={`${features.maxProducts === -1 ? "Unlimited" : features.maxProducts} listed`}
                        active
                      />
                      <FeatureRow
                        icon="📊"
                        label="Analytics"
                        value={features.analytics}
                        active
                      />
                      <FeatureRow
                        icon="🔍"
                        label="Keyword Tracking"
                        value={features.keywordTracking ? "Active" : "Locked"}
                        active={features.keywordTracking}
                      />
                      <FeatureRow
                        icon="⚔️"
                        label="Competitor Insights"
                        value={
                          features.competitorInsights ? "Active" : "Locked"
                        }
                        active={features.competitorInsights}
                      />
                      <FeatureRow
                        icon="📰"
                        label="Newsletter Feature"
                        value={features.newsletterFeature ? "Active" : "Locked"}
                        active={features.newsletterFeature}
                      />
                      <FeatureRow
                        icon="🎬"
                        label="Video Showcase"
                        value={features.videoShowcase ? "Active" : "Locked"}
                        active={features.videoShowcase}
                      />
                      <FeatureRow
                        icon="⭐"
                        label="Promoted Listing"
                        value={features.promotedListing ? "Active" : "Locked"}
                        active={features.promotedListing}
                      />
                      <FeatureRow
                        icon="🏷️"
                        label="Category Spotlight"
                        value={features.categorySpotlight ? "Active" : "Locked"}
                        active={features.categorySpotlight}
                      />
                      <FeatureRow
                        icon="🔗"
                        label="Social Links"
                        value={`${features.socialMediaLinks === -1 ? "Unlimited" : features.socialMediaLinks}`}
                        active
                      />
                      <FeatureRow
                        icon="💬"
                        label="Support"
                        value={features.support.replaceAll("_", " ")}
                        active
                      />
                      <FeatureRow
                        icon="🔌"
                        label="API Access"
                        value={features.apiAccess ? "Active" : "Locked"}
                        active={features.apiAccess}
                      />
                    </div>
                    {currentTier !== "enterprise" && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowComparisonModal(true)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          See all features across plans →
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Badges Showcase */}
                <Card>
                  <CardHeader>
                    <CardTitle>🏆 Your Badges</CardTitle>
                    <CardDescription>
                      Trust signals displayed on your profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {features.badges.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {features.badges.map((badge) => (
                          <Badge
                            key={badge}
                            className="text-sm py-1 px-3 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200"
                          >
                            {badge === "verified_presence" &&
                              "✓ Verified Presence"}
                            {badge === "verified_pro" && "✅ Verified Pro"}
                            {badge === "priority_tag" && "⚡ Priority"}
                            {badge === "market_leader" && "🚀 Market Leader"}
                            {badge === "featured" && "⭐ Featured"}
                            {badge === "top_rated" && "🏆 Top Rated"}
                            {badge === "enterprise" && "👑 Enterprise"}
                            {badge === "premium_partner" &&
                              "💎 Premium Partner"}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <p className="mb-2">No badges on the Free plan</p>
                        <button
                          onClick={() => setShowComparisonModal(true)}
                          className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
                        >
                          Unlock badges with Essential+ →
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── OVERVIEW / CATEGORIES / OPPORTUNITIES TABS ────────── */}
              <TabsContent value="overview" className="space-y-6">
                <OverviewContent stats={stats} statsLoading={statsLoading} />
              </TabsContent>
              <TabsContent value="categories" className="space-y-6">
                <CategoriesContent stats={stats} statsLoading={statsLoading} />
              </TabsContent>
              <TabsContent value="opportunities" className="space-y-6">
                <OpportunitiesContent
                  stats={stats}
                  statsLoading={statsLoading}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             NOT LOGGED IN: Public Dashboard
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* Public Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {statsLoading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : (
                <>
                  <PublicStatCard
                    title="Total Businesses"
                    value={stats?.totalBusinesses || 0}
                    icon={ShoppingCart}
                  />
                  <PublicStatCard
                    title="Categories"
                    value={stats?.categoriesCount || 0}
                    icon={BarChart3}
                  />
                  <PublicStatCard
                    title="Job Opportunities"
                    value={stats?.jobListings || 0}
                    icon={Briefcase}
                  />
                  <PublicStatCard
                    title="Countries"
                    value={
                      stats?.businessesByCountry
                        ? Object.keys(stats.businessesByCountry).length
                        : 0
                    }
                    icon={MapPin}
                  />
                </>
              )}
            </div>

            {/* Public Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6">
                <OverviewContent stats={stats} statsLoading={statsLoading} />
              </TabsContent>
              <TabsContent value="categories" className="space-y-6">
                <CategoriesContent stats={stats} statsLoading={statsLoading} />
              </TabsContent>
              <TabsContent value="opportunities" className="space-y-6">
                <OpportunitiesContent
                  stats={stats}
                  statsLoading={statsLoading}
                />
              </TabsContent>
            </Tabs>

            {/* Info Cards */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Learn More
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">For Businesses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Get listed, boost visibility, and reach more customers.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/businesses-directory">View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">For Job Seekers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Browse opportunities and grow your career.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/jobs">Browse Jobs</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">For Researchers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Access data and analytics on business sectors.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/database-results">Access Data</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="mt-20 bg-gray-900 text-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/businesses-directory">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      Businesses
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/communities">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      Communities
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/docs">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      Documentation
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/help">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      Help
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/api">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      API
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      About
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <Button variant="link" className="p-0 h-auto text-gray-100">
                      Contact
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Account</h3>
              <ul className="space-y-2 text-sm">
                {isLoggedIn ? (
                  <li>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-gray-100"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </li>
                ) : (
                  <li>
                    <Link href="/signin">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-gray-100"
                      >
                        Sign In
                      </Button>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <Separator className="bg-gray-800 mb-6" />
          <div className="text-center text-sm text-gray-400">
            <p>&copy; 2026 VersoAir Intelligence. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── COMPARISON MODAL ───────────────────────────────────────────── */}
      <TierComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        currentTier={currentTier}
        onSelectTier={(tier) => {
          alert(
            `Upgrade to ${TIERS[tier].name} — Payment integration coming soon!`,
          );
          setShowComparisonModal(false);
        }}
        hiddenSearches={hiddenSearches}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TAB CONTENT (used by both logged-in and public views)
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewContent({
  stats,
  statsLoading,
}: {
  stats: PublicStats | null | undefined;
  statsLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Overview</CardTitle>
        <CardDescription>
          Key insights about our business network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">What's New</h3>
          <div className="space-y-3">
            {statsLoading ? (
              <>
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </>
            ) : (
              <>
                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {stats?.totalBusinesses || 0} Verified Businesses
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Quality-checked listings across multiple sectors
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {stats?.jobListings || 0} Active Job Listings
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Browse opportunities from verified employers
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/businesses-directory">
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span>Browse Businesses</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/communities">
                <Users className="h-4 w-4 mr-2" />
                <span>Join Communities</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/database-results">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span>View Data</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/contact">
                <FileText className="h-4 w-4 mr-2" />
                <span>Contact Us</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoriesContent({
  stats,
  statsLoading,
}: {
  stats: PublicStats | null | undefined;
  statsLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Categories</CardTitle>
        <CardDescription>
          Explore our diverse range of business categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : stats?.topCategories && stats.topCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.topCategories.map((category) => (
              <Button
                key={category.name}
                asChild
                variant="outline"
                className="h-auto py-4 justify-between"
              >
                <Link href="/commerce">
                  <span className="font-medium">{category.name}</span>
                  <Badge variant="secondary">{category.count} businesses</Badge>
                </Link>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No category data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpportunitiesContent({
  stats,
  statsLoading,
}: {
  stats: PublicStats | null | undefined;
  statsLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Opportunities</CardTitle>
        <CardDescription>
          Latest job listings and business opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : stats?.recentListings && stats.recentListings.length > 0 ? (
          <div className="space-y-3">
            {stats.recentListings.slice(0, 5).map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group"
              >
                <div>
                  <p className="font-medium text-gray-900">{listing.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {listing.location}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No listings available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ShieldCheck,
  ShieldX,
  Power,
  MessageSquare,
  Send,
  Clock,
  Phone,
  Mail,
  Building2,
  ExternalLink,
  Hash,
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
import { AccountSettingsModal } from "@/components/AccountSettingsModal";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  role?: string;
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
  pdf_path?: string;
  approval_status?: string;
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
  countriesCount: number;
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
// 🛸 USER DASHBOARD — Business Growth Engine
// ═══════════════════════════════════════════════════════════════════════════════

export default function UserDashboard() {
  const queryClient = useQueryClient();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedBusinessIdx, setSelectedBusinessIdx] = useState(0);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);
  const [showDossier, setShowDossier] = useState(false);

  // ── Account Settings Modal ──
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState<
    "account" | "preferences"
  >("account");

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

  // ── Navigation context (used for "Back to Geo Admin" button etc.) ──
  const fromParam = new URLSearchParams(window.location.search).get("from");
  const cameFromGeoAdmin =
    fromParam === "geoadmin" || fromParam === "geo-admin";
  // Everyone (including superadmin) stays on /dashboard — no redirect

  // ── Derived state ──
  const isLoggedIn = !!userSession?.user;
  const userRole = (userSession?.user?.role || "user").toLowerCase();
  const isSuperAdmin = userRole === "superuser";
  // Staff roles (superuser, admin, moderator) — don't need subscriber upgrade/visibility features
  const isStaffRole = ["superuser", "admin", "moderator"].includes(userRole);
  // Superadmin always gets enterprise-tier access — they built the platform
  const currentTier: TierKey =
    userRole === "superuser"
      ? "enterprise"
      : (userSession?.user?.subscriptionTier as TierKey) || "free";
  const tierDef = TIERS[currentTier];
  const features = TIER_FEATURES[currentTier];

  // ── Fetch user's REAL businesses from API ──
  const { data: userBusinesses } = useQuery<BusinessData[]>({
    queryKey: ["my-businesses", userSession?.user?.id],
    queryFn: async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const response = await fetch(
          `${API_BASE_URL}/api/businesses?userId=${userSession!.user.id}&limit=10`,
          { headers, credentials: "include" },
        );
        if (!response.ok) return [];
        const data = await response.json();
        return (data.businesses || data.data || []).map((b: any) => ({
          id: b.id,
          name: b.name || "Unnamed Business",
          description: b.description || "",
          category: b.category_name || b.category || "General",
          location:
            [b.city, b.country].filter(Boolean).join(", ") ||
            b.address ||
            "Not specified",
          rating: parseFloat(b.rating) || 0,
          reviewCount: parseInt(b.review_count || b.reviewCount) || 0,
          verification_status: b.verification_status || "unverified",
          is_active: b.is_active ?? true,
          is_advertiser: b.is_advertiser ?? false,
          photos_count: parseInt(b.photos_count) || 0,
          products_count: parseInt(b.products_count) || 0,
          created_at: b.created_at || new Date().toISOString(),
          pdf_path: b.pdf_path || "",
          approval_status: b.approval_status || "",
        }));
      } catch {
        return [];
      }
    },
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  // Use real business if available, else fall back to mock
  const business = useMemo(() => {
    if (userBusinesses && userBusinesses.length > 0) {
      const idx = Math.min(selectedBusinessIdx, userBusinesses.length - 1);
      return userBusinesses[idx];
    }
    return getMockBusiness(currentTier);
  }, [userBusinesses, currentTier, selectedBusinessIdx]);

  const hasRealBusiness = !!(userBusinesses && userBusinesses.length > 0);

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
  // BUSINESS DOSSIER — full registration preview + Teams-style messaging
  // ═══════════════════════════════════════════════════════════════════════════
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [dossierMsg, setDossierMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [dossierTab, setDossierTab] = useState<"info" | "chat">("info");

  // Fetch full business dossier when modal opens
  const { data: dossierData, isLoading: dossierLoading } = useQuery<any>({
    queryKey: ["business-dossier", business.id],
    queryFn: async () => {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE_URL}/api/businesses/${business.id}/dossier`,
        {
          headers,
          credentials: "include",
        },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: showDossier && !!business.id,
    staleTime: 30_000,
  });

  // Fetch conversation thread
  const { data: threadMessages = [], refetch: refetchMessages } = useQuery<
    any[]
  >({
    queryKey: ["business-messages", business.id],
    queryFn: async () => {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE_URL}/api/businesses/${business.id}/messages`,
        {
          headers,
          credentials: "include",
        },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: showDossier && !!business.id,
    refetchInterval: showDossier ? 8000 : false, // poll every 8s when open
  });

  // Auto-scroll chat
  useEffect(() => {
    if (showDossier && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages, showDossier, dossierTab]);

  const handleSendMessage = useCallback(async () => {
    if (!dossierMsg.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      await fetch(`${API_BASE_URL}/api/businesses/${business.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          senderId: userSession?.user?.id,
          senderName:
            userSession?.user?.name || userSession?.user?.email || "Admin",
          senderRole: userRole,
          message: dossierMsg.trim(),
        }),
      });
      setDossierMsg("");
      refetchMessages();
    } catch {
      /* silent */
    }
    setSendingMsg(false);
  }, [
    dossierMsg,
    sendingMsg,
    business.id,
    userSession,
    userRole,
    refetchMessages,
  ]);

  // Helper to render a dossier info row
  const DossierRow = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: any;
    icon?: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
      <div className="flex-shrink-0 w-5 h-5 mt-0.5 text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
          {label}
        </p>
        <p className="text-sm text-slate-200 break-words">
          {value || <span className="text-slate-600 italic">Not provided</span>}
        </p>
      </div>
    </div>
  );

  const roleColors: Record<string, string> = {
    superuser: "text-red-400 bg-red-500/15 border-red-500/30",
    admin: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    moderator: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    owner: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    user: "text-slate-400 bg-slate-500/15 border-slate-500/30",
  };

  const renderDossierModal = () => {
    if (!showDossier) return null;
    const d = dossierData;

    return (
      <div
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowDossier(false);
        }}
      >
        <div className="w-full max-w-[95vw] h-[85vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  {business.name}
                  {business.verification_status === "verified" && (
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  DOSSIER #{business.id} • {business.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab toggles */}
              <div className="flex bg-slate-800 rounded-lg border border-slate-700/50 p-0.5">
                <button
                  onClick={() => setDossierTab("info")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    dossierTab === "info"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "text-slate-400 hover:text-white border border-transparent"
                  }`}
                >
                  <FileText className="h-3 w-3 inline mr-1" /> Registration
                </button>
                <button
                  onClick={() => setDossierTab("chat")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all relative ${
                    dossierTab === "chat"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                      : "text-slate-400 hover:text-white border border-transparent"
                  }`}
                >
                  <MessageSquare className="h-3 w-3 inline mr-1" /> Thread
                  {threadMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {threadMessages.length}
                    </span>
                  )}
                </button>
              </div>
              {/* PDF download */}
              {d?.pdf_path && (
                <a
                  href={`${API_BASE_URL}/api/businesses/${business.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                >
                  <Download className="h-3 w-3" /> PDF
                </a>
              )}
              <button
                onClick={() => setShowDossier(false)}
                className="h-8 w-8 rounded-lg bg-slate-700/50 hover:bg-red-500/30 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-hidden">
            {dossierTab === "info" ? (
              /* ═══ REGISTRATION INFO TAB ═══ */
              <div className="h-full overflow-y-auto p-6 space-y-6">
                {dossierLoading ? (
                  <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-10 bg-slate-800" />
                    ))}
                  </div>
                ) : d ? (
                  <>
                    {/* Identity */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> Business Identity
                      </h3>
                      <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 px-4">
                        <DossierRow
                          icon={<Hash className="h-4 w-4" />}
                          label="Business ID"
                          value={`#${d.id}`}
                        />
                        <DossierRow
                          icon={<Building2 className="h-4 w-4" />}
                          label="Business Name"
                          value={d.name}
                        />
                        <DossierRow
                          icon={<FileText className="h-4 w-4" />}
                          label="Description"
                          value={d.description}
                        />
                        <DossierRow
                          icon={<BarChart3 className="h-4 w-4" />}
                          label="Category"
                          value={d.category_name || `ID: ${d.category_id}`}
                        />
                        <DossierRow
                          icon={<Settings className="h-4 w-4" />}
                          label="Business Type"
                          value={d.business_type}
                        />
                        <DossierRow
                          icon={<Star className="h-4 w-4" />}
                          label="Rating"
                          value={`${d.rating || 0} ★ (${d.reviews || 0} reviews)`}
                        />
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" /> Contact Information
                      </h3>
                      <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 px-4">
                        <DossierRow
                          icon={<Phone className="h-4 w-4" />}
                          label="Phone"
                          value={d.phone}
                        />
                        <DossierRow
                          icon={<Mail className="h-4 w-4" />}
                          label="Email"
                          value={d.email}
                        />
                        <DossierRow
                          icon={<Globe className="h-4 w-4" />}
                          label="Website"
                          value={d.website}
                        />
                        <DossierRow
                          icon={<MapPin className="h-4 w-4" />}
                          label="Address"
                          value={d.address}
                        />
                        <DossierRow
                          icon={<MapPin className="h-4 w-4" />}
                          label="Location / City"
                          value={
                            [d.city_name, d.country_code]
                              .filter(Boolean)
                              .join(", ") || d.location
                          }
                        />
                        {d.latitude && d.longitude && (
                          <DossierRow
                            icon={<Globe className="h-4 w-4" />}
                            label="Coordinates"
                            value={`${d.latitude}, ${d.longitude}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Status & Approval */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> Status &
                        Approval
                      </h3>
                      <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 px-4">
                        <DossierRow
                          icon={<Power className="h-4 w-4" />}
                          label="Active"
                          value={d.is_active ? "✅ Yes" : "❌ No"}
                        />
                        <DossierRow
                          icon={<ShieldCheck className="h-4 w-4" />}
                          label="Verified"
                          value={
                            d.is_verified ? "✅ Verified" : "⏳ Unverified"
                          }
                        />
                        <DossierRow
                          icon={<CheckCircle className="h-4 w-4" />}
                          label="Approval Status"
                          value={d.approval_status}
                        />
                        <DossierRow
                          icon={<Users className="h-4 w-4" />}
                          label="Submitted By"
                          value={
                            d.submitted_by_username ||
                            (d.submitted_by ? `User #${d.submitted_by}` : null)
                          }
                        />
                        <DossierRow
                          icon={<Users className="h-4 w-4" />}
                          label="Approved By"
                          value={
                            d.approved_by_username ||
                            (d.approved_by ? `User #${d.approved_by}` : null)
                          }
                        />
                        <DossierRow
                          icon={<FileText className="h-4 w-4" />}
                          label="Approval Notes"
                          value={d.approval_notes}
                        />
                        <DossierRow
                          icon={<FileText className="h-4 w-4" />}
                          label="Registration PDF"
                          value={d.pdf_path ? "📄 Available" : "No PDF on file"}
                        />
                      </div>
                    </div>

                    {/* Owner */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> Owner Account
                      </h3>
                      <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 px-4">
                        <DossierRow
                          icon={<Users className="h-4 w-4" />}
                          label="Owner"
                          value={
                            d.owner_username ||
                            (d.owner_id
                              ? `User #${d.owner_id}`
                              : "No owner linked")
                          }
                        />
                        <DossierRow
                          icon={<Mail className="h-4 w-4" />}
                          label="Owner Email"
                          value={d.owner_email}
                        />
                        <DossierRow
                          icon={<ShieldCheck className="h-4 w-4" />}
                          label="Owner Role"
                          value={d.owner_role}
                        />
                      </div>
                    </div>

                    {/* Extras */}
                    {(d.tags || d.amenities || d.attributes) && (
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-2">
                          <Settings className="h-3.5 w-3.5" /> Additional Data
                        </h3>
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 px-4">
                          {d.tags &&
                            Array.isArray(d.tags) &&
                            d.tags.length > 0 && (
                              <DossierRow
                                icon={<Hash className="h-4 w-4" />}
                                label="Tags"
                                value={
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(d.tags as string[]).map(
                                      (t: string, i: number) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 bg-slate-700/60 text-slate-300 text-[10px] rounded-full"
                                        >
                                          {t}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                }
                              />
                            )}
                          {d.amenities &&
                            Array.isArray(d.amenities) &&
                            d.amenities.length > 0 && (
                              <DossierRow
                                icon={<Star className="h-4 w-4" />}
                                label="Amenities"
                                value={
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(d.amenities as string[]).map(
                                      (a: string, i: number) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 bg-slate-700/60 text-slate-300 text-[10px] rounded-full"
                                        >
                                          {a}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                }
                              />
                            )}
                          {d.attributes &&
                            typeof d.attributes === "object" &&
                            Object.keys(d.attributes).length > 0 && (
                              <DossierRow
                                icon={<Settings className="h-4 w-4" />}
                                label="Attributes"
                                value={
                                  <pre className="text-[11px] text-slate-300 bg-slate-800 rounded-lg p-2 mt-1 overflow-x-auto font-mono">
                                    {JSON.stringify(d.attributes, null, 2)}
                                  </pre>
                                }
                              />
                            )}
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 px-4 py-2">
                      <div className="flex items-center gap-6 text-[10px] text-slate-500 font-mono">
                        <span>
                          Created:{" "}
                          {d.created_at
                            ? new Date(d.created_at).toLocaleString()
                            : "—"}
                        </span>
                        <span>
                          Updated:{" "}
                          {d.updated_at
                            ? new Date(d.updated_at).toLocaleString()
                            : "—"}
                        </span>
                        {d.verified_at && (
                          <span>
                            Verified: {new Date(d.verified_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <p>Could not load business data</p>
                  </div>
                )}
              </div>
            ) : (
              /* ═══ CONVERSATION THREAD TAB (Teams-style) ═══ */
              <div className="h-full flex flex-col">
                {/* Thread header */}
                <div className="px-5 py-3 border-b border-slate-700/40 bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">
                      Admin Thread
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {threadMessages.length} message
                      {threadMessages.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Internal conversation between admins & geo-admins about this
                    business
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {threadMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No messages yet</p>
                      <p className="text-xs mt-1">
                        Start a conversation about this business
                      </p>
                    </div>
                  ) : (
                    threadMessages.map((msg: any) => {
                      const isMe =
                        msg.sender_id === userSession?.user?.id ||
                        msg.sender_name ===
                          (userSession?.user?.name || userSession?.user?.email);
                      const colorClass =
                        roleColors[msg.sender_role] || roleColors.user;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
                          >
                            {/* Sender name + role */}
                            <div
                              className={`flex items-center gap-1.5 mb-1 ${isMe ? "justify-end" : ""}`}
                            >
                              <span className="text-[10px] font-semibold text-slate-400">
                                {msg.sender_name}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${colorClass}`}
                              >
                                {msg.sender_role}
                              </span>
                            </div>
                            {/* Bubble */}
                            <div
                              className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isMe
                                  ? "bg-blue-600/30 text-blue-100 border border-blue-500/30 rounded-br-md"
                                  : "bg-slate-700/50 text-slate-200 border border-slate-600/30 rounded-bl-md"
                              }`}
                            >
                              {msg.message_type === "status_change" ? (
                                <p className="italic text-xs text-slate-400">
                                  🔄 {msg.message}
                                </p>
                              ) : (
                                <p className="whitespace-pre-wrap">
                                  {msg.message}
                                </p>
                              )}
                            </div>
                            {/* Timestamp */}
                            <p
                              className={`text-[9px] text-slate-600 mt-1 font-mono ${isMe ? "text-right" : ""}`}
                            >
                              {msg.created_at
                                ? new Date(msg.created_at).toLocaleString()
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <div className="px-5 py-3 border-t border-slate-700/40 bg-slate-800/40">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <textarea
                        value={dossierMsg}
                        onChange={(e) => setDossierMsg(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                        rows={2}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 resize-none transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!dossierMsg.trim() || sendingMsg}
                      className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-all flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-600 mt-1.5 font-mono">
                    Posting as{" "}
                    {userSession?.user?.name ||
                      userSession?.user?.email ||
                      "Admin"}{" "}
                    • {userRole}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-700/50"
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
                  className="gap-2 text-slate-300 hover:text-white hover:bg-slate-700/50"
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

              {/* Verification Quick Status — only for subscribers (staff don't need it) */}
              {isLoggedIn && !isStaffRole && (
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
                    {(userRole === "superuser" || userRole === "moderator") && (
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
                    <DropdownMenuItem
                      onClick={() => {
                        setAccountSettingsTab("account");
                        setShowAccountSettings(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setAccountSettingsTab("preferences");
                        setShowAccountSettings(true);
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Preferences
                    </DropdownMenuItem>
                    {cameFromGeoAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleBackToGeoAdmin}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Geo Admin
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-400 focus:text-red-300"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : cameFromGeoAdmin ? (
                <Button
                  onClick={handleBackToGeoAdmin}
                  className="gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Geo Admin
                </Button>
              ) : null}
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 pt-4 border-t border-slate-700/50 space-y-1">
              {isLoggedIn && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                    Dashboard Tabs
                  </p>
                  {[
                    { label: "📊 Analytics", value: "analytics" },
                    {
                      label: isStaffRole
                        ? "⚙️ Platform Tools"
                        : "🚀 Visibility",
                      value: "visibility",
                    },
                    { label: "🏠 Overview", value: "overview" },
                    { label: "📂 Categories", value: "categories" },
                    {
                      label: isStaffRole
                        ? "📋 Registrations"
                        : "💼 Opportunities",
                      value: "opportunities",
                    },
                  ].map((tab) => (
                    <Button
                      key={tab.value}
                      variant="ghost"
                      className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
                      onClick={() => {
                        const tabEl = document.querySelector(
                          `[data-state][value="${tab.value}"]`,
                        ) as HTMLElement;
                        if (tabEl) tabEl.click();
                        setShowMobileMenu(false);
                      }}
                    >
                      {tab.label}
                    </Button>
                  ))}
                  <div className="border-t border-slate-700/50 my-2" />
                </>
              )}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                Navigation
              </p>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <Link href="/">🏠 Home</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <Link href="/businesses-directory">📒 Browse Businesses</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <Link href="/services">🔧 Services</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <Link href="/reservations">📅 Reservations</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <Link href="/communities">👥 Communities</Link>
              </Button>
              {isLoggedIn && (
                <>
                  <div className="border-t border-slate-700/50 my-2" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                    Account
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
                    onClick={() => {
                      setAccountSettingsTab("account");
                      setShowAccountSettings(true);
                      setShowMobileMenu(false);
                    }}
                  >
                    ⚙️ Account Settings
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
                    onClick={() => {
                      setAccountSettingsTab("preferences");
                      setShowAccountSettings(true);
                      setShowMobileMenu(false);
                    }}
                  >
                    🔔 Preferences
                  </Button>
                </>
              )}
              {cameFromGeoAdmin && (
                <>
                  <div className="border-t border-slate-700/50 my-2" />
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
                  >
                    <Link href="/geo-admin">🌍 Back to Geo Admin</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── THE "AHA!" MOMENT — hidden searches alert (subscribers only) ── */}
        {isLoggedIn && !isStaffRole && (
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
                ? hasRealBusiness
                  ? `${tierDef.icon} ${tierDef.name} Plan — ${business.category} sector dashboard`
                  : `${tierDef.icon} ${tierDef.name} Plan — ${tierDef.visibilityNarrative}`
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
          {isLoggedIn && !isStaffRole && currentTier !== "enterprise" && (
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
            {/* ── MY BUSINESS PROFILE CARD ───────────────────────────────── */}
            {hasRealBusiness ? (
              <div className="mb-8 bg-gradient-to-r from-slate-800/60 to-slate-800/40 rounded-2xl border border-slate-700/40 p-6">
                {/* Header row */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-base font-bold shadow-lg shadow-emerald-500/20">
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">
                      {business.name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {business.category} • {business.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {business.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : business.verification_status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        <ShieldX className="h-3 w-3" /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ⏳ Pending
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        business.is_active
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : "bg-slate-600/30 text-slate-400 border-slate-600/40"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      {business.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-sm font-medium text-yellow-400">
                      ★ {business.rating.toFixed(1)}{" "}
                      <span className="text-slate-500 text-xs">
                        ({business.reviewCount})
                      </span>
                    </span>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">
                      {business.products_count}
                    </p>
                    <p className="text-xs text-slate-400">Products</p>
                  </div>
                  <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-cyan-400">
                      {business.photos_count}
                    </p>
                    <p className="text-xs text-slate-400">Photos</p>
                  </div>
                  <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-400">
                      {business.reviewCount}
                    </p>
                    <p className="text-xs text-slate-400">Reviews</p>
                  </div>
                  <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-400">
                      {business.approval_status || "—"}
                    </p>
                    <p className="text-xs text-slate-400">Approval</p>
                  </div>
                </div>

                {/* ── ADMIN ACTIONS (superuser / admin / moderator) ────── */}
                {(userRole === "superuser" ||
                  userRole === "admin" ||
                  userRole === "moderator") && (
                  <div className="pt-4 border-t border-slate-700/40">
                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                      Admin Controls
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {/* Open Business Dossier (registration info + messaging) */}
                      <button
                        onClick={() => setShowDossier(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-400/50 transition-all"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Business Dossier
                      </button>

                      {/* Verify / Unverify Toggle */}
                      <button
                        onClick={async () => {
                          try {
                            const newVerified =
                              business.verification_status !== "verified";
                            const token =
                              localStorage.getItem("auth_token") ||
                              localStorage.getItem("authToken");
                            const res = await fetch(
                              `${API_BASE_URL}/api/businesses/${business.id}`,
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...(token
                                    ? { Authorization: `Bearer ${token}` }
                                    : {}),
                                },
                                credentials: "include",
                                body: JSON.stringify({
                                  isVerified: newVerified,
                                }),
                              },
                            );
                            if (res.ok) {
                              await queryClient.invalidateQueries({
                                queryKey: ["my-businesses"],
                                refetchType: "all",
                              });
                              await queryClient.invalidateQueries({
                                queryKey: ["business-dossier", business.id],
                              });
                            } else {
                              console.error(
                                "Verify toggle failed:",
                                res.status,
                                await res.text(),
                              );
                            }
                          } catch (err) {
                            console.error("Verify toggle error:", err);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          business.verification_status === "verified"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                        }`}
                      >
                        {business.verification_status === "verified" ? (
                          <>
                            <ShieldX className="h-3.5 w-3.5" /> Unverify
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5" /> Verify
                          </>
                        )}
                      </button>

                      {/* Active / Inactive Toggle */}
                      <button
                        onClick={async () => {
                          try {
                            const token =
                              localStorage.getItem("auth_token") ||
                              localStorage.getItem("authToken");
                            const res = await fetch(
                              `${API_BASE_URL}/api/businesses/${business.id}`,
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...(token
                                    ? { Authorization: `Bearer ${token}` }
                                    : {}),
                                },
                                credentials: "include",
                                body: JSON.stringify({
                                  isActive: !business.is_active,
                                }),
                              },
                            );
                            if (res.ok) {
                              await queryClient.invalidateQueries({
                                queryKey: ["my-businesses"],
                                refetchType: "all",
                              });
                              await queryClient.invalidateQueries({
                                queryKey: ["business-dossier", business.id],
                              });
                            } else {
                              console.error(
                                "Active toggle failed:",
                                res.status,
                                await res.text(),
                              );
                            }
                          } catch (err) {
                            console.error("Active toggle error:", err);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          business.is_active
                            ? "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
                            : "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {business.is_active ? "Deactivate" : "Activate"}
                      </button>

                      {/* Approve (if pending) */}
                      {business.approval_status === "pending" && (
                        <button
                          onClick={async () => {
                            try {
                              const token =
                                localStorage.getItem("auth_token") ||
                                localStorage.getItem("authToken");
                              const res = await fetch(
                                `${API_BASE_URL}/api/businesses/${business.id}/approve`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                    ...(token
                                      ? { Authorization: `Bearer ${token}` }
                                      : {}),
                                  },
                                  credentials: "include",
                                  body: JSON.stringify({
                                    approvedBy: userSession?.user?.id,
                                  }),
                                },
                              );
                              if (res.ok) {
                                await queryClient.invalidateQueries({
                                  queryKey: ["my-businesses"],
                                  refetchType: "all",
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: ["business-dossier", business.id],
                                });
                              } else {
                                console.error(
                                  "Approve failed:",
                                  res.status,
                                  await res.text(),
                                );
                              }
                            } catch (err) {
                              console.error("Approve error:", err);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {userBusinesses && userBusinesses.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-slate-700/30">
                    <button
                      onClick={() =>
                        setShowBusinessSwitcher(!showBusinessSwitcher)
                      }
                      className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group"
                    >
                      <span className="h-5 w-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[10px] group-hover:bg-cyan-500/25 transition-colors">
                        {userBusinesses.length}
                      </span>
                      {showBusinessSwitcher ? "Hide" : "Switch"} businesses
                      <ArrowRight
                        className={`h-3 w-3 transition-transform ${showBusinessSwitcher ? "rotate-90" : ""}`}
                      />
                    </button>

                    {showBusinessSwitcher && (
                      <div className="mt-3 grid gap-2">
                        {userBusinesses.map((biz, idx) => (
                          <button
                            key={biz.id}
                            onClick={() => {
                              setSelectedBusinessIdx(idx);
                              setShowBusinessSwitcher(false);
                            }}
                            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                              idx === selectedBusinessIdx
                                ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                                : "bg-slate-700/30 border-slate-700/40 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600/50"
                            }`}
                          >
                            <div
                              className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                idx === selectedBusinessIdx
                                  ? "bg-gradient-to-br from-emerald-500 to-cyan-600 text-white"
                                  : "bg-slate-600/60 text-slate-300"
                              }`}
                            >
                              {biz.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {biz.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {biz.category} • {biz.location}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {biz.is_active ? (
                                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                              ) : (
                                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                              )}
                              <span className="text-[10px] text-yellow-400">
                                ★ {biz.rating.toFixed(1)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-8 bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-700/30 p-6 text-center">
                <p className="text-amber-300 font-semibold mb-1">
                  🏢 No business registered yet
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  Register your business to unlock personalized analytics,
                  visibility tracking, and category-specific insights.
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold gap-2"
                >
                  <Link href="/businesses-directory">
                    <ShoppingCart className="h-4 w-4" />
                    Register a Business
                  </Link>
                </Button>
              </div>
            )}

            {/* ── TOP ROW: Visibility Gauge + Stats + Trust Hub ──────────── */}
            {isStaffRole ? (
              /* ── STAFF (superuser/admin/mod): Platform Command Strip ── */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Platform Pulse */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-400" /> Platform Pulse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Total Businesses
                        </span>
                        <span className="text-lg font-bold text-white">
                          {stats?.totalBusinesses || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Categories
                        </span>
                        <span className="text-lg font-bold text-cyan-400">
                          {stats?.categoriesCount || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Countries
                        </span>
                        <span className="text-lg font-bold text-emerald-400">
                          {stats?.countriesCount ||
                            (stats?.businessesByCountry
                              ? Object.keys(stats.businessesByCountry).length
                              : 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Admin Actions */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400 flex items-center gap-2">
                      <Settings className="h-4 w-4 text-purple-400" /> Quick
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/geo-admin/dashboard?from=sv">
                      <button className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/40 hover:bg-blue-500/15 text-sm text-slate-300 hover:text-blue-400 transition-all flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> GEO Admin Panel
                      </button>
                    </Link>
                    <Link href="/sys/0x7f3a9c">
                      <button className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/40 hover:bg-red-500/15 text-sm text-slate-300 hover:text-red-400 transition-all flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Credentials Vault
                      </button>
                    </Link>
                    <Link href="/businesses-directory">
                      <button className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/40 hover:bg-emerald-500/15 text-sm text-slate-300 hover:text-emerald-400 transition-all flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" /> Business Directory
                      </button>
                    </Link>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />{" "}
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Role</span>
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                            userRole === "superuser"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : userRole === "admin"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : userRole === "moderator"
                                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                  : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                          }`}
                        >
                          {userRole.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Tier Override
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          ENTERPRISE
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Access Level
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          FULL
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          DB Connection
                        </span>
                        <span className="text-xs font-mono text-emerald-400">
                          ● Online
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
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
            )}

            {/* ── TABBED CONTENT (Subscriber) ────────────────────────────── */}
            <Tabs defaultValue="analytics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
                <TabsTrigger value="visibility">
                  {isStaffRole ? "⚙️ Platform Tools" : "🚀 Visibility"}
                </TabsTrigger>
                <TabsTrigger value="overview">🏠 Overview</TabsTrigger>
                <TabsTrigger value="categories">📂 Categories</TabsTrigger>
                <TabsTrigger value="opportunities">
                  {isStaffRole ? "📋 Registrations" : "💼 Opportunities"}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
                {/* Revenue Simulator — subscribers only */}
                {!isStaffRole && (
                  <RevenueSimulator
                    currentTier={currentTier}
                    currentMonthlyViews={analytics.pageViews}
                    locked={isFeatureLocked(currentTier, "revenueSimulator")}
                    onUpgradeClick={() => setShowComparisonModal(true)}
                  />
                )}

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
                    {!isStaffRole && currentTier !== "enterprise" && (
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
                  isAdmin={isStaffRole}
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
                      stats?.countriesCount ||
                      (stats?.businessesByCountry
                        ? Object.keys(stats.businessesByCountry).length
                        : 0)
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
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* ═══ BUSINESS DOSSIER MODAL ═══ */}
      {renderDossierModal()}

      {/* ═══ ACCOUNT SETTINGS & PREFERENCES MODAL ═══ */}
      <AccountSettingsModal
        open={showAccountSettings}
        onOpenChange={setShowAccountSettings}
        defaultTab={accountSettingsTab}
        onBackToDashboard={() => setShowAccountSettings(false)}
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
  isAdmin = false,
}: {
  stats: PublicStats | null | undefined;
  statsLoading: boolean;
  isAdmin?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAdmin ? "Recent Registrations" : "Recent Opportunities"}
        </CardTitle>
        <CardDescription>
          {isAdmin
            ? "Newest businesses registered on the platform"
            : "Latest job listings and business opportunities"}
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

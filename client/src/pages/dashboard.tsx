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
  Lock,
  Star,
  CalendarDays,
  Search,
  Store,
  Clock,
  Building2,
  Utensils,
  Hammer,
  Car,
  Landmark,
  Gamepad2,
  Music,
  BookOpen,
  TrendingUp,
  Package,
  History,
  ChevronRight,
  User,
  Mail,
  Sparkles,
  Hash,
  Phone,
  Camera,
  Upload,
  Trash2,
  ExternalLink,
  PlusCircle,
  Users2,
  AtSign,
  Paperclip,
  Image,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Growth Engine Imports (for business owners)
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

// Relevance Engine Imports
import {
  getSubscriberStats,
  resolveProfile,
  type ResolvedMetric,
} from "@/lib/industry-profiles";

// Industry-Relevant KPIs
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

const API_BASE_URL = "";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  displayName?: string | null;
  isAdmin: boolean;
  role?: string;
  isFirstLogin?: boolean;
  needsDisplayName?: boolean;
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
  logo_url?: string | null;
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

interface BrowsingHistoryEntry {
  id: number;
  business_name: string;
  sector: string;
  page_url: string;
  visited_at: string;
}

interface ReservationEntry {
  id: string;
  business_name?: string;
  start_date: string;
  end_date?: string;
  status: string;
  total_price?: number;
}

// ─── INBOX TYPES ────────────────────────────────────────────────────────────────
type ConversationType = "support" | "business_network";

interface Conversation {
  id: string | number;
  type: ConversationType;
  participantId: string; // other user/business ID (or "support" for VersoAI)
  participantName: string;
  participantAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  businessId?: number; // relevant business for support threads
  priority?: string; // 'normal' | 'high' | 'priority'
}

interface Message {
  id: string | number;
  conversationId: string | number;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  isAi?: boolean; // true = VersoAI reply
}

// ─── MOCK DATA HELPERS ──────────────────────────────────────────────────────────

function getPlaceholderBusiness(_tier: TierKey): BusinessData {
  return {
    id: 0,
    name: "",
    description: "",
    category: "",
    location: "",
    rating: 0,
    reviewCount: 0,
    verification_status: "unverified",
    is_active: false,
    is_advertiser: false,
    photos_count: 0,
    products_count: 0,
    created_at: new Date().toISOString(),
  };
}

function getEmptyAnalytics(_tier: TierKey): BusinessAnalytics {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    clicks: 0,
    conversions: 0,
    searchAppearances: 0,
    categoryAvgSearches: 0,
    topKeywords: [],
    viewsHistory: [],
    competitorAvgRating: 0,
    competitorAvgReviews: 0,
    categoryRank: 0,
    categoryTotal: 0,
  };
}

// ─── SECTOR DEFINITIONS ─────────────────────────────────────────────────────────

const SECTORS = [
  {
    name: "Commerce",
    description: "Shops, retail, and trade",
    icon: Store,
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    href: "/commerce",
  },
  {
    name: "Hospitality",
    description: "Hotels, restaurants, tourism",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
    href: "/hotellerie",
  },
  {
    name: "Construction",
    description: "Building, contractors, trades",
    icon: Hammer,
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
    href: "/batiment",
  },
  {
    name: "Automotive",
    description: "Dealers, repair, rentals",
    icon: Car,
    color: "from-red-500 to-rose-600",
    bgLight: "bg-red-50 border-red-200",
    textColor: "text-red-700",
    href: "/automobile",
  },
  {
    name: "Finance",
    description: "Banks, insurance, investments",
    icon: Landmark,
    color: "from-purple-500 to-violet-600",
    bgLight: "bg-purple-50 border-purple-200",
    textColor: "text-purple-700",
    href: "/finance",
  },
  {
    name: "Entertainment",
    description: "Events, venues, recreation",
    icon: Gamepad2,
    color: "from-pink-500 to-fuchsia-600",
    bgLight: "bg-pink-50 border-pink-200",
    textColor: "text-pink-700",
    href: "/divertissement",
  },
];

// ─── HELPER SUB-COMPONENTS (Growth Engine) ──────────────────────────────────────

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
          Unlock Feature
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
          Verification & Trust
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {!hasPaidForVisibility
                ? "\u2B1C"
                : hasCompletedVerification
                  ? "\u2705"
                  : "\uD83D\uDFE1"}
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
                  ? "Grey badge \u2014 basic listing"
                  : hasCompletedVerification
                    ? "Blue checkmark \u2014 trusted business"
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
                ? "Blue \u2713"
                : "Pending"}
          </Badge>
        </div>
        {hasPaidForVisibility && !hasCompletedVerification && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-semibold">
              You are paying for visibility, but trust closes the deal.
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Finish verification to unlock your blue badge.
            </p>
            <button className="mt-2 text-sm font-bold text-yellow-900 underline hover:text-yellow-700">
              Complete Verification &rarr;
            </button>
          </div>
        )}
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
                {item.done ? "\u2713" : "\u25CB"}
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
        <div className="filter blur-sm select-none pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{metric.emoji}</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {metric.label}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-300">---</div>
        </div>
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
          <Lock className="h-5 w-5 text-gray-400 mb-1" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
            {metric.tier}+ required
          </p>
          <button
            onClick={onUpgrade}
            className="mt-1 px-3 py-1 text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
          >
            Unlock
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
            &uarr; {Math.abs(metric.change)}%
          </span>
        ) : (
          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            &darr; {Math.abs(metric.change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {metric.value !== null ? metric.value.toLocaleString() : "\u2014"}
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
            : "Locked \u2014 " + value}
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

// ─── INDUSTRY KPIs SECTION ──────────────────────────────────────────────────────

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
              <span>{"\uD83C\uDFAF"}</span> Industry-Relevant KPIs for{" "}
              {category}
            </CardTitle>
            <CardDescription>
              {getStatVisibility(userTier).description} &mdash; Top metrics that
              drive your business
            </CardDescription>
          </div>
          {userTier === "free" && (
            <Button
              onClick={onUpgrade}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Lock className="h-3 w-3 mr-1" /> Upgrade for more stats
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Key Insights
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
                  {tierRecommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-600">
                      &bull; {rec}
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
// INBOX COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface InboxProps {
  user: CurrentUser;
  businesses: BusinessData[];
  userRole: string;
}

// Mock data removed — now fetched from /api/inbox/* endpoints

function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem("auth_token") || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Inbox({ user, businesses, userRole }: InboxProps) {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);
  const [searchBusinessQuery, setSearchBusinessQuery] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProvider, setStreamProvider] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const currentTierKey: TierKey =
    userRole === "superuser"
      ? "enterprise"
      : (user.subscriptionTier as TierKey) || "free";

  const isStaff = ["superuser", "admin", "moderator"].includes(userRole);
  const hasVerifiedBusiness = businesses.some(
    (b) => b.verification_status === "verified",
  );
  const canAccessNetworking = currentTierKey !== "free" || isStaff;

  // ── Ensure support thread exists on mount ─────────────────────────────────
  const { data: supportThread } = useQuery<{ conversation: Conversation }>({
    queryKey: ["inbox-support-thread"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/api/inbox/ensure-support-thread`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  // ── Conversation list ─────────────────────────────────────────────────────
  const { data: convData, refetch: refetchConvs } = useQuery<{
    conversations: Conversation[];
  }>({
    queryKey: ["inbox-conversations"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/api/inbox/conversations`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const conversations: Conversation[] = convData?.conversations ?? [];

  // Set default active conversation to support thread once loaded
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      const support = conversations.find((c) => c.type === "support");
      if (support) setActiveConversationId(Number(support.id));
    }
  }, [conversations, activeConversationId]);

  // ── Message thread ────────────────────────────────────────────────────────
  const { data: msgData, refetch: refetchMessages } = useQuery<{
    messages: Message[];
    conversation: Conversation;
  }>({
    queryKey: ["inbox-messages", activeConversationId],
    queryFn: async () => {
      const r = await fetch(
        `${API_BASE_URL}/api/inbox/conversations/${activeConversationId}/messages`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!activeConversationId,
    refetchInterval: activeConversationId ? 10_000 : false,
    staleTime: 3_000,
  });

  const activeMessages: Message[] = msgData?.messages ?? [];
  const activeConversation = conversations.find(
    (c) => Number(c.id) === activeConversationId,
  );

  // ── Suggested contacts (verified businesses) ──────────────────────────────
  const { data: contactsData } = useQuery<{
    contacts: any[];
    locked?: boolean;
  }>({
    queryKey: ["inbox-contacts", searchBusinessQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (searchBusinessQuery) params.set("q", searchBusinessQuery);
      const r = await fetch(
        `${API_BASE_URL}/api/inbox/suggested-contacts?${params}`,
        { headers: getAuthHeaders(), credentials: "include" },
      );
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: showNewConversationModal && canAccessNetworking,
    staleTime: 30_000,
  });

  // ── Computed values ───────────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    if (networkEnabled)
      return conversations.filter((c) => c.type === "business_network");
    return conversations.filter((c) => c.type === "support");
  }, [conversations, networkEnabled]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0),
    [conversations],
  );

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, streamingText]);

  // ── Mark as read when conversation selected ───────────────────────────────
  useEffect(() => {
    if (!activeConversationId) return;
    fetch(
      `${API_BASE_URL}/api/inbox/conversations/${activeConversationId}/read`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
      },
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      })
      .catch(() => {
        /* non-critical */
      });
  }, [activeConversationId]);

  // ── Cleanup SSE on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId) return;
    const text = newMessage.trim();
    setNewMessage("");

    const isSupport = activeConversation?.type === "support";

    // Persist user message to DB
    try {
      await fetch(
        `${API_BASE_URL}/api/inbox/conversations/${activeConversationId}/messages`,
        {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: text,
            senderId: user.id,
            senderName: user.name || "You",
          }),
        },
      );
      await refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    } catch {
      /* queued in Redis by server */
    }

    // If this is the support thread, trigger VersoAI via SSE
    if (isSupport) {
      eventSourceRef.current?.close();
      setStreamingText("");
      setIsStreaming(true);
      setStreamProvider(null);

      const params = new URLSearchParams({
        message: text,
        convId: String(activeConversationId),
      });

      const es = new EventSource(
        `${API_BASE_URL}/api/ai/support/stream?${params}`,
        { withCredentials: true },
      );
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.token !== undefined) setStreamingText((prev) => prev + d.token);
        } catch {
          /* chunk */
        }
      };

      es.addEventListener("meta", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data);
          setStreamProvider(d.provider ?? d.tier ?? null);
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("done", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data);
          setStreamProvider(d.provider ?? null);
        } catch {
          /* ignore */
        }
        es.close();
        setIsStreaming(false);
        setStreamingText("");
        // Refresh messages to show persisted AI reply
        setTimeout(() => {
          refetchMessages();
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
        }, 400);
      });

      es.addEventListener("error", () => {
        es.close();
        setIsStreaming(false);
        setStreamingText("");
        refetchMessages();
      });
    }
  };

  // ── Start new networking conversation ─────────────────────────────────────
  const handleStartNewConversation = async (biz: any) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/inbox/conversations`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          participantId: String(biz.id),
          participantName: biz.name,
          type: "business_network",
        }),
      });
      const data = await r.json();
      if (data.success) {
        await refetchConvs();
        setActiveConversationId(Number(data.conversation.id));
        setNetworkEnabled(true);
      } else if (data.upgradeRequired) {
        alert(data.error);
      }
    } catch {
      /* silent */
    }
    setShowNewConversationModal(false);
    setSearchBusinessQuery("");
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[650px]">
      {/* Left Panel: Conversation List */}
      <div className="col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800">Conversations</h3>
              {totalUnread > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {totalUnread}
                </span>
              )}
            </div>
            {canAccessNetworking && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Network</span>
                <Switch
                  checked={networkEnabled}
                  onCheckedChange={setNetworkEnabled}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>
            )}
          </div>
          {!canAccessNetworking && (
            <p className="text-xs text-slate-400 mt-2">
              <Lock className="h-3 w-3 inline mr-1" />
              Business Networking requires Essential plan+
            </p>
          )}
          {networkEnabled && canAccessNetworking && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={() => setShowNewConversationModal(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Conversation
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
              <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              {networkEnabled && canAccessNetworking && (
                <p className="text-xs mt-1">Start a new conversation above</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(Number(conv.id))}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    Number(conv.id) === activeConversationId
                      ? "bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback
                        className={`${
                          conv.type === "support"
                            ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white"
                            : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                        }`}
                      >
                        {conv.participantName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-slate-800 truncate">
                          {conv.participantName}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(conv.lastMessageAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="mt-1 bg-red-500 text-white text-[10px] px-1.5 py-0">
                          {conv.unreadCount} new
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Message Thread */}
      <div className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    className={`${
                      activeConversation.type === "support"
                        ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white"
                        : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                    }`}
                  >
                    {activeConversation.participantName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-slate-800">
                    {activeConversation.participantName}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    {activeConversation.type === "support"
                      ? "VersoAI Support"
                      : "Business Network"}
                    {activeConversation.type === "support" && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Always live
                      </span>
                    )}
                    {streamProvider && (
                      <span className="text-slate-400">
                        · via {streamProvider}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMessages.length === 0 && !isStreaming ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">
                    {activeConversation.type === "support"
                      ? "Ask VersoAI anything about your account"
                      : "Send a message to start the conversation"}
                  </p>
                </div>
              ) : (
                <>
                  {activeMessages.map((msg) => {
                    const isOwn = String(msg.senderId) === String(user.id);
                    const isAI = msg.senderId === "support";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
                        >
                          {!isOwn && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback
                                  className={`text-[10px] ${
                                    isAI
                                      ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                                      : "bg-slate-200"
                                  }`}
                                >
                                  {isAI ? (
                                    <Sparkles className="h-2.5 w-2.5" />
                                  ) : (
                                    msg.senderName.charAt(0).toUpperCase()
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-slate-600">
                                {msg.senderName}
                              </span>
                              {isAI && (
                                <span className="text-[10px] text-blue-500 font-medium">
                                  VersoAI
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                              isOwn
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md"
                                : isAI
                                  ? "bg-gradient-to-br from-slate-50 to-blue-50 text-slate-700 border border-blue-100 rounded-bl-md"
                                  : "bg-slate-100 text-slate-700 rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p
                            className={`text-[10px] text-slate-400 mt-1 ${isOwn ? "text-right" : ""}`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isOwn && msg.isRead && (
                              <span className="ml-1 text-blue-500">✓✓</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Streaming AI response bubble */}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="max-w-[75%]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                              <Sparkles className="h-2.5 w-2.5" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-slate-600">
                            VersoAI
                          </span>
                          <span className="text-[10px] text-blue-500 font-medium">
                            typing…
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm bg-gradient-to-br from-slate-50 to-blue-50 text-slate-700 border border-blue-100">
                          {streamingText ? (
                            <p className="whitespace-pre-wrap">
                              {streamingText}
                              <span className="inline-block h-4 w-0.5 bg-blue-500 ml-0.5 animate-pulse" />
                            </p>
                          ) : (
                            <div className="flex gap-1 items-center py-1">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      activeConversation.type === "support"
                        ? "Ask VersoAI anything…"
                        : "Type a message…"
                    }
                    rows={2}
                    disabled={isStreaming}
                    className="resize-none bg-slate-50 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isStreaming}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-10 w-10 p-0 flex-shrink-0"
                >
                  {isStreaming ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Image className="h-4 w-4" />
                </button>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <AtSign className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium text-slate-500">
              Select a conversation
            </p>
            <p className="text-sm mt-1">
              Choose from the list or start a new one
            </p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                Connect with a Business
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewConversationModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search verified businesses…"
                  value={searchBusinessQuery}
                  onChange={(e) => setSearchBusinessQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {contactsData?.locked ? (
                <div className="p-6 text-center text-slate-500">
                  <Lock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">
                    Business Networking locked
                  </p>
                  <p className="text-xs mt-1">
                    Requires Essential plan or above
                  </p>
                </div>
              ) : (contactsData?.contacts ?? []).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No verified businesses found
                </div>
              ) : (
                (contactsData?.contacts ?? []).map((biz: any) => (
                  <button
                    key={biz.id}
                    onClick={() => handleStartNewConversation(biz)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={biz.logo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                        {biz.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm text-slate-800">
                        {biz.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {biz.category} •{" "}
                        {[biz.city, biz.country].filter(Boolean).join(", ")}
                        {biz.rating
                          ? ` • ★ ${parseFloat(biz.rating).toFixed(1)}`
                          : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Expose totalUnread for the tab badge — computed inside the parent via a query
export function useInboxUnreadCount(isLoggedIn: boolean) {
  const { data } = useQuery<{ conversations: Array<{ unreadCount: number }> }>({
    queryKey: ["inbox-conversations"],
    queryFn: async () => {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const r = await fetch(`/api/inbox/conversations`, {
        headers,
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: isLoggedIn,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
  return (data?.conversations ?? []).reduce(
    (s, c) => s + (c.unreadCount ?? 0),
    0,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED DASHBOARD — General Account + Business Owner Growth Engine
// ═══════════════════════════════════════════════════════════════════════════════

export default function UserDashboard() {
  const queryClient = useQueryClient();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedBusinessIdx, setSelectedBusinessIdx] = useState(0);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");

  // Account Settings Modal
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState<
    "account" | "preferences"
  >("account");

  // Auth
  const { data: userSession } = useQuery<{ user: CurrentUser } | null>({
    queryKey: ["auth-session"],
    queryFn: async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        const headers: Record<string, string> = { "Cache-Control": "no-cache" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
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
    refetchOnMount: "always" as const,
  });

  // Public stats
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

  // Browsing History
  const { data: browsingHistory } = useQuery<BrowsingHistoryEntry[]>({
    queryKey: ["browsing-history"],
    queryFn: async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        if (!token) return [];
        const response = await fetch(`${API_BASE_URL}/api/browsing-history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.history || [];
      } catch {
        return [];
      }
    },
    enabled: !!userSession?.user,
    staleTime: 60_000,
  });

  // Reservations
  const { data: reservations } = useQuery<ReservationEntry[]>({
    queryKey: ["my-reservations"],
    queryFn: async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        if (!token) return [];
        const response = await fetch(`${API_BASE_URL}/api/reservations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.reservations || data || [];
      } catch {
        return [];
      }
    },
    enabled: !!userSession?.user,
    staleTime: 60_000,
  });

  // Navigation context
  const fromParam = new URLSearchParams(window.location.search).get("from");
  const cameFromGeoAdmin =
    fromParam === "geoadmin" || fromParam === "geo-admin";

  // Derived state
  const isLoggedIn = !!userSession?.user;
  const userRole = (userSession?.user?.role || "user").toLowerCase();
  const isStaffRole = ["superuser", "admin", "moderator"].includes(userRole);
  const currentTier: TierKey =
    userRole === "superuser"
      ? "enterprise"
      : (userSession?.user?.subscriptionTier as TierKey) || "free";
  const tierDef = TIERS[currentTier];
  const features = TIER_FEATURES[currentTier];

  // Inbox unread badge — pulls from the same React Query cache as the Inbox component
  const inboxUnread = useInboxUnreadCount(isLoggedIn);

  const memberSince = useMemo(() => {
    const ts = localStorage.getItem("signin_timestamp");
    if (ts) return new Date(ts).toLocaleDateString();
    return new Date().toLocaleDateString();
  }, []);

  // Fetch user businesses
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
          logo_url: b.logo_url || null,
        }));
      } catch {
        return [];
      }
    },
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  const business = useMemo(() => {
    if (userBusinesses && userBusinesses.length > 0) {
      const idx = Math.min(selectedBusinessIdx, userBusinesses.length - 1);
      return userBusinesses[idx];
    }
    return getPlaceholderBusiness(currentTier);
  }, [userBusinesses, currentTier, selectedBusinessIdx]);

  const hasRealBusiness = !!(userBusinesses && userBusinesses.length > 0);

  const analytics = useMemo(
    () => getEmptyAnalytics(currentTier),
    [currentTier],
  );

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

  // Logo Upload
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const PAID_TIERS = ["essential", "verified", "max", "enterprise", "premium"];
  const canUploadLogo = PAID_TIERS.includes(currentTier);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hasRealBusiness) return;
    setLogoUploading(true);
    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("businessId", String(business.id));
      const res = await fetch(`${API_BASE_URL}/api/business-logo/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data.success)
        queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
      else alert(data.message || "Logo upload failed");
    } catch {
      alert("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    if (!hasRealBusiness || !business.logo_url) return;
    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const res = await fetch(
        `${API_BASE_URL}/api/business-logo/${business.id}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        },
      );
      const data = await res.json();
      if (data.success)
        queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
    } catch {
      alert("Failed to remove logo.");
    }
  };

  // Dossier Modal
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [dossierMsg, setDossierMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [dossierTab, setDossierTab] = useState<"info" | "chat">("info");

  const { data: dossierData, isLoading: dossierLoading } = useQuery<any>({
    queryKey: ["business-dossier", business.id],
    queryFn: async () => {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE_URL}/api/businesses/${business.id}/dossier`,
        { headers, credentials: "include" },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: showDossier && !!business.id,
    staleTime: 30_000,
  });

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
        { headers, credentials: "include" },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: showDossier && !!business.id,
    refetchInterval: showDossier ? 8000 : false,
  });

  useEffect(() => {
    if (showDossier && chatEndRef.current)
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("geoadmin_session");
    localStorage.removeItem("geoadmin_username");
    localStorage.removeItem("geoadmin_login_time");
    // Stay on the dashboard portal — show the login gate again
    window.location.href = "/dashboard";
  };

  const handleBackToGeoAdmin = () => {
    window.location.href = "/geo-admin";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS DOSSIER MODAL
  // ═══════════════════════════════════════════════════════════════════════════

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
                  DOSSIER #{business.id} &bull; {business.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 rounded-lg border border-slate-700/50 p-0.5">
                <button
                  onClick={() => setDossierTab("info")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${dossierTab === "info" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "text-slate-400 hover:text-white border border-transparent"}`}
                >
                  <FileText className="h-3 w-3 inline mr-1" /> Registration
                </button>
                <button
                  onClick={() => setDossierTab("chat")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all relative ${dossierTab === "chat" ? "bg-purple-500/20 text-purple-400 border border-purple-500/40" : "text-slate-400 hover:text-white border border-transparent"}`}
                >
                  <MessageSquare className="h-3 w-3 inline mr-1" /> Thread
                  {threadMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {threadMessages.length}
                    </span>
                  )}
                </button>
              </div>
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
              <div className="h-full overflow-y-auto p-6 space-y-6">
                {dossierLoading ? (
                  <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-10 bg-slate-800" />
                    ))}
                  </div>
                ) : d ? (
                  <>
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
                          icon={<Star className="h-4 w-4" />}
                          label="Rating"
                          value={`${d.rating || 0} stars (${d.reviews || 0} reviews)`}
                        />
                      </div>
                    </div>
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
                          label="Location"
                          value={
                            [d.city_name, d.country_code]
                              .filter(Boolean)
                              .join(", ") || d.location
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> Status &
                        Approval
                      </h3>
                      <div className="bg-slate-800/50 rounded-xl border border-slate-700/40 px-4">
                        <DossierRow
                          icon={<Power className="h-4 w-4" />}
                          label="Active"
                          value={d.is_active ? "Yes" : "No"}
                        />
                        <DossierRow
                          icon={<ShieldCheck className="h-4 w-4" />}
                          label="Verified"
                          value={d.is_verified ? "Verified" : "Unverified"}
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
                      </div>
                    </div>
                    <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 px-4 py-2">
                      <div className="flex items-center gap-6 text-[10px] text-slate-500 font-mono">
                        <span>
                          Created:{" "}
                          {d.created_at
                            ? new Date(d.created_at).toLocaleString()
                            : "\u2014"}
                        </span>
                        <span>
                          Updated:{" "}
                          {d.updated_at
                            ? new Date(d.updated_at).toLocaleString()
                            : "\u2014"}
                        </span>
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
              /* Chat Tab */
              <div className="h-full flex flex-col">
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
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {threadMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No messages yet</p>
                    </div>
                  ) : (
                    threadMessages.map((msg: any) => {
                      const isMe = msg.sender_id === userSession?.user?.id;
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
                            <div
                              className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-blue-600/30 text-blue-100 border border-blue-500/30 rounded-br-md" : "bg-slate-700/50 text-slate-200 border border-slate-600/30 rounded-bl-md"}`}
                            >
                              <p className="whitespace-pre-wrap">
                                {msg.message}
                              </p>
                            </div>
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
                <div className="px-5 py-3 border-t border-slate-700/40 bg-slate-800/40">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={dossierMsg}
                      onChange={(e) => setDossierMsg(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      className="flex-1 w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 resize-none transition-all"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!dossierMsg.trim() || sendingMsg}
                      className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-all flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* NAVIGATION */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-slate-600 hover:text-slate-900"
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
                  className="gap-2 text-slate-600 hover:text-slate-900"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <div className="hidden lg:flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-slate-800">
                  My Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoggedIn && <TierBadge tier={currentTier} size="sm" />}
              {isLoggedIn && hasRealBusiness && !isStaffRole && (
                <VerificationQuickStatus
                  status={business.verification_status}
                  isActive={business.is_active}
                />
              )}
              {isLoggedIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-slate-500 hover:text-slate-700"
                >
                  <Bell className="h-5 w-5" />
                </Button>
              )}
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold hover:shadow-lg transition-all">
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
                    {isStaffRole && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/geo-admin/dashboard">
                            <MapPin className="h-4 w-4 mr-2" /> GEO Admin Panel
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/tickets">
                            <BarChart3 className="h-4 w-4 mr-2" /> TAM Tickets
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
                      <Settings className="h-4 w-4 mr-2" /> Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setAccountSettingsTab("preferences");
                        setShowAccountSettings(true);
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" /> Preferences
                    </DropdownMenuItem>
                    {cameFromGeoAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleBackToGeoAdmin}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Geo
                          Admin
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth/signin">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium gap-2">
                    <User className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 pt-4 border-t border-slate-200 space-y-1">
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
              >
                <Link href="/">Home</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
              >
                <Link href="/businesses-directory">Browse Businesses</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
              >
                <Link href="/reservations">Reservations</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
              >
                <Link href="/marketplace">Marketplace</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
              >
                <Link href="/communities">Communities</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
              >
                <Link href="/music">Music</Link>
              </Button>
              {isLoggedIn && (
                <>
                  <div className="border-t border-slate-200 my-2" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-600 hover:text-slate-900"
                    onClick={() => {
                      setAccountSettingsTab("account");
                      setShowAccountSettings(true);
                      setShowMobileMenu(false);
                    }}
                  >
                    Account Settings
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isLoggedIn ? (
          <>
            {/* HIDDEN SEARCHES ALERT (business owners only) */}
            {hasRealBusiness && !isStaffRole && (
              <HiddenSearchesAlert
                hiddenCount={hiddenSearches}
                currentTier={currentTier}
                onSeeWhy={() => setShowComparisonModal(true)}
              />
            )}

            {/* WELCOME HEADER */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    {userSession!.user.isFirstLogin
                      ? "Welcome to Verso Air"
                      : "Welcome back"}
                    {userSession!.user.displayName || userSession!.user.name
                      ? `, ${userSession!.user.displayName || userSession!.user.name}`
                      : ""}
                    !
                  </h1>
                  <p className="text-slate-500 mt-2 text-lg">
                    {hasRealBusiness
                      ? `${tierDef.icon} ${tierDef.name} Plan \u2014 ${business.category} sector dashboard`
                      : "Browse businesses, make reservations, and explore everything Verso Air has to offer."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5"
                  >
                    <Globe className="h-3.5 w-3.5 mr-1.5" />{" "}
                    {hasRealBusiness ? tierDef.name : "General Account"}
                  </Badge>
                  {isStaffRole && (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200 px-3 py-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />{" "}
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  )}
                  {hasRealBusiness &&
                    !isStaffRole &&
                    currentTier !== "enterprise" && (
                      <Button
                        onClick={() => setShowComparisonModal(true)}
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold gap-1"
                      >
                        <Zap className="h-3.5 w-3.5" /> Upgrade
                      </Button>
                    )}
                </div>
              </div>
            </div>

            {/* STAFF QUICK ACCESS (superuser/admin/moderator only) */}
            {isStaffRole && (
              <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Staff Quick Access
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link href="/geo-admin/dashboard?from=sv">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700/50 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 transition-all cursor-pointer text-sm">
                      <MapPin className="h-4 w-4" /> GEO Admin
                    </div>
                  </Link>
                  <Link href="/sys/0x7f3a9c">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-all cursor-pointer text-sm">
                      <Lock className="h-4 w-4" /> Credentials Vault
                    </div>
                  </Link>
                  <Link href="/admin/tickets">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700/50 hover:bg-purple-500/20 text-slate-300 hover:text-purple-400 transition-all cursor-pointer text-sm">
                      <BarChart3 className="h-4 w-4" /> TAM Tickets
                    </div>
                  </Link>
                  <Link href="/businesses-directory">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700/50 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-all cursor-pointer text-sm">
                      <ShoppingCart className="h-4 w-4" /> Business Directory
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* BUSINESS PROFILE CARD (only if user owns a business) */}
            {hasRealBusiness && (
              <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative group">
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt={`${business.name} logo`}
                        className="h-12 w-12 rounded-xl object-cover border-2 border-blue-500/40 shadow-lg"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {business.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {canUploadLogo && (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        {logoUploading ? (
                          <Upload className="h-4 w-4 text-white animate-pulse" />
                        ) : (
                          <Camera className="h-4 w-4 text-white" />
                        )}
                      </button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 truncate">
                      {business.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {business.category} &bull; {business.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {business.logo_url && canUploadLogo && (
                      <button
                        onClick={handleLogoRemove}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                        title="Remove logo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    {business.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                    <span className="text-sm font-medium text-yellow-600">
                      {"\u2605"} {business.rating.toFixed(1)}{" "}
                      <span className="text-slate-400 text-xs">
                        ({business.reviewCount})
                      </span>
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {business.products_count}
                    </p>
                    <p className="text-xs text-slate-500">Products</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-cyan-600">
                      {business.photos_count}
                    </p>
                    <p className="text-xs text-slate-500">Photos</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-indigo-600">
                      {business.reviewCount}
                    </p>
                    <p className="text-xs text-slate-500">Reviews</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-600">
                      {business.approval_status || "\u2014"}
                    </p>
                    <p className="text-xs text-slate-500">Approval</p>
                  </div>
                </div>
                {/* Admin actions */}
                {isStaffRole && (
                  <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowDossier(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" /> Business Dossier
                    </button>
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
                              body: JSON.stringify({ isVerified: newVerified }),
                            },
                          );
                          if (res.ok) {
                            await queryClient.invalidateQueries({
                              queryKey: ["my-businesses"],
                              refetchType: "all",
                            });
                          }
                        } catch (err) {
                          console.error("Verify toggle error:", err);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${business.verification_status === "verified" ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"}`}
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
                          }
                        } catch (err) {
                          console.error("Active toggle error:", err);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${business.is_active ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"}`}
                    >
                      <Power className="h-3.5 w-3.5" />{" "}
                      {business.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                )}
                {/* Business switcher */}
                {userBusinesses && userBusinesses.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={() =>
                        setShowBusinessSwitcher(!showBusinessSwitcher)
                      }
                      className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors group"
                    >
                      <span className="h-5 w-5 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] group-hover:bg-blue-100 transition-colors">
                        {userBusinesses.length}
                      </span>
                      {showBusinessSwitcher ? "Hide" : "Switch"} businesses
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
                            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border transition-all ${idx === selectedBusinessIdx ? "bg-blue-50 border-blue-300 text-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          >
                            <div
                              className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === selectedBusinessIdx ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              {biz.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {biz.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {biz.category} &bull; {biz.location}
                              </p>
                            </div>
                            <span className="text-[10px] text-yellow-600">
                              {"\u2605"} {biz.rating.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VISIBILITY ROW (business owners only, non-staff) */}
            {hasRealBusiness && !isStaffRole && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <VisibilityMeter
                  currentTier={currentTier}
                  onBoostClick={() => setShowComparisonModal(true)}
                />
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
                <VerificationTrustHub
                  tier={currentTier}
                  verificationStatus={business.verification_status}
                  isVerified={business.verification_status === "verified"}
                />
              </div>
            )}

            {/* QUICK ACTIONS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <Link href="/businesses-directory">
                <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                      <Search className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        Browse Businesses
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Explore the directory
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/reservations">
                <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                      <CalendarDays className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        Reservations
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Book & manage
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/marketplace">
                <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        Marketplace
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Buy & sell locally
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/communities">
                <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        Communities
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Connect & share
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* PLATFORM STATS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {statsLoading ? (
                <>
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-slate-500 font-medium">
                        Businesses
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {(stats?.totalBusinesses || 0).toLocaleString()}
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">
                      On the platform
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs text-slate-500 font-medium">
                        Categories
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {stats?.categoriesCount || 0}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Business types
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-slate-500 font-medium">
                        Jobs
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {stats?.jobListings || 0}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Opportunities
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-slate-500 font-medium">
                        Countries
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {stats?.countriesCount ||
                        (stats?.businessesByCountry
                          ? Object.keys(stats.businessesByCountry).length
                          : 0)}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Worldwide reach
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* TABBED CONTENT */}
            <Tabs
              defaultValue={hasRealBusiness ? "analytics" : "explore"}
              className="space-y-6"
              onValueChange={setActiveTab}
            >
              <TabsList
                className={`grid w-full ${hasRealBusiness ? "grid-cols-6" : "grid-cols-5"} bg-slate-100`}
              >
                {hasRealBusiness && (
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                )}
                <TabsTrigger value="explore">Explore</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="inbox">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Inbox
                    {inboxUnread > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                        {inboxUnread > 99 ? "99+" : inboxUnread}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger value="discover">Discover</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              {/* ANALYTICS TAB (business owners only) */}
              {hasRealBusiness && (
                <TabsContent value="analytics" className="space-y-6">
                  <IndustryKPIsSection
                    businessData={business}
                    mockStats={mockStats}
                    userTier={currentTier}
                    onUpgrade={() => setShowComparisonModal(true)}
                  />

                  {/* Industry Metrics Grid */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{industryProfile.icon}</span>
                        <CardTitle>{industryProfile.name} Metrics</CardTitle>
                        <span className="text-xs text-gray-400 ml-auto">
                          Powered by Relevance Engine
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {industryStats.map((metric: ResolvedMetric) => (
                          <IndustryMetricCard
                            key={metric.key}
                            metric={metric}
                            onUpgrade={() => setShowComparisonModal(true)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keyword Tracking */}
                  {isFeatureLocked(currentTier, "keywordTracking") ? (
                    <LockedOverlay
                      feature="Who is searching for you?"
                      currentTier={currentTier}
                      onUpgrade={() => setShowComparisonModal(true)}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle>Keyword Tracking</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              "restaurant paris",
                              "best food",
                              "catering",
                              "lunch menu",
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
                        <CardTitle>Top Keywords</CardTitle>
                        <CardDescription>
                          What customers search to find you
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analytics.topKeywords.map((kw, i) => {
                            const max = analytics.topKeywords[0]?.count || 1;
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

                  {/* Competitor Comparison */}
                  {isFeatureLocked(currentTier, "competitorInsights") ? (
                    <LockedOverlay
                      feature="Competitor Comparison"
                      currentTier={currentTier}
                      onUpgrade={() => setShowComparisonModal(true)}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle>Competitor Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            {["Your Rating", "Category Avg", "Your Rank"].map(
                              (l) => (
                                <div
                                  key={l}
                                  className="p-4 bg-gray-50 rounded-lg"
                                >
                                  <div className="text-2xl font-bold">--</div>
                                  <div className="text-sm text-gray-500">
                                    {l}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </LockedOverlay>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Competitor Comparison</CardTitle>
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
                          </div>
                          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="text-2xl font-bold text-emerald-700">
                              {business.reviewCount}
                            </div>
                            <div className="text-sm text-emerald-600">
                              Reviews
                            </div>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="text-2xl font-bold text-purple-700">
                              #{analytics.categoryRank || "\u2014"}
                            </div>
                            <div className="text-sm text-purple-600">Rank</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Revenue Simulator */}
                  {!isStaffRole && (
                    <RevenueSimulator
                      currentTier={currentTier}
                      currentMonthlyViews={analytics.pageViews}
                      locked={isFeatureLocked(currentTier, "revenueSimulator")}
                      onUpgradeClick={() => setShowComparisonModal(true)}
                    />
                  )}

                  {/* Feature Access */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Feature Access</CardTitle>
                      <CardDescription>
                        What is included in your {tierDef.name} plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FeatureRow
                          icon={"\uD83D\uDCF8"}
                          label="Photos"
                          value={`${features.photos === -1 ? "Unlimited" : features.photos} allowed`}
                          active={true}
                        />
                        <FeatureRow
                          icon={"\uD83D\uDECD\uFE0F"}
                          label="Products"
                          value={`${features.maxProducts === -1 ? "Unlimited" : features.maxProducts} listed`}
                          active={true}
                        />
                        <FeatureRow
                          icon={"\uD83D\uDCCA"}
                          label="Analytics"
                          value={features.analytics}
                          active={true}
                        />
                        <FeatureRow
                          icon={"\uD83D\uDD0D"}
                          label="Keyword Tracking"
                          value={features.keywordTracking ? "Active" : "Locked"}
                          active={features.keywordTracking}
                        />
                        <FeatureRow
                          icon={"\u2694\uFE0F"}
                          label="Competitor Insights"
                          value={
                            features.competitorInsights ? "Active" : "Locked"
                          }
                          active={features.competitorInsights}
                        />
                        <FeatureRow
                          icon={"\uD83D\uDCF0"}
                          label="Newsletter"
                          value={
                            features.newsletterFeature ? "Active" : "Locked"
                          }
                          active={features.newsletterFeature}
                        />
                        <FeatureRow
                          icon={"\uD83C\uDFAC"}
                          label="Video Showcase"
                          value={features.videoShowcase ? "Active" : "Locked"}
                          active={features.videoShowcase}
                        />
                        <FeatureRow
                          icon={"\u2B50"}
                          label="Promoted Listing"
                          value={features.promotedListing ? "Active" : "Locked"}
                          active={features.promotedListing}
                        />
                        <FeatureRow
                          icon={"\uD83D\uDCAC"}
                          label="Support"
                          value={features.support.replaceAll("_", " ")}
                          active={true}
                        />
                        <FeatureRow
                          icon={"\uD83D\uDD0C"}
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
                            See all features across plans &rarr;
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Badges */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Badges</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {features.badges.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {features.badges.map((badge: string) => (
                            <Badge
                              key={badge}
                              className="text-sm py-1 px-3 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200"
                            >
                              {badge === "verified_presence" &&
                                "Verified Presence"}
                              {badge === "verified_pro" && "Verified Pro"}
                              {badge === "priority_tag" && "Priority"}
                              {badge === "market_leader" && "Market Leader"}
                              {badge === "featured" && "Featured"}
                              {badge === "top_rated" && "Top Rated"}
                              {badge === "enterprise" && "Enterprise"}
                              {badge === "premium_partner" && "Premium Partner"}
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
                            Unlock badges with Essential+ &rarr;
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* EXPLORE TAB */}
              <TabsContent value="explore" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-500" /> Explore by
                      Sector
                    </CardTitle>
                    <CardDescription>
                      Dive into any industry sector to find businesses,
                      services, and analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {SECTORS.map((sector) => {
                        const Icon = sector.icon;
                        return (
                          <Link key={sector.name} href={sector.href}>
                            <div
                              className={`group relative p-5 rounded-xl border ${sector.bgLight} hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                            >
                              <div className="flex items-start gap-4">
                                <div
                                  className={`h-11 w-11 rounded-lg bg-gradient-to-br ${sector.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
                                >
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className={`font-semibold ${sector.textColor}`}
                                  >
                                    {sector.name}
                                  </h3>
                                  <p className="text-sm text-slate-500 mt-0.5">
                                    {sector.description}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/music">
                    <Card className="h-full border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <Music className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            Music & Streaming
                          </p>
                          <p className="text-xs text-slate-500">
                            Discover artists & tracks
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/jobs">
                    <Card className="h-full border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            Job Board
                          </p>
                          <p className="text-xs text-slate-500">
                            Browse opportunities
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/artisans-portal">
                    <Card className="h-full border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            Artisans Portal
                          </p>
                          <p className="text-xs text-slate-500">
                            Community & blog
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </TabsContent>

              {/* ACTIVITY TAB */}
              <TabsContent value="activity" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-amber-500" /> My
                          Reservations
                        </CardTitle>
                        <CardDescription>
                          Your upcoming and recent bookings
                        </CardDescription>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/reservations">View All</Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {reservations && reservations.length > 0 ? (
                      <div className="space-y-3">
                        {reservations.slice(0, 5).map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                                <CalendarDays className="h-4 w-4 text-amber-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-slate-800">
                                  {res.business_name ||
                                    `Reservation #${res.id}`}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(
                                    res.start_date,
                                  ).toLocaleDateString()}
                                  {res.total_price
                                    ? ` \u2022 $${res.total_price}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                res.status === "confirmed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : res.status === "pending"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                              }
                            >
                              {res.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium mb-1">
                          No reservations yet
                        </p>
                        <p className="text-sm text-slate-400 mb-4">
                          Browse businesses and make your first booking
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/reservations">
                            <Search className="h-3.5 w-3.5 mr-1.5" /> Browse
                            Properties
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-slate-500" /> Recent
                      Browsing
                    </CardTitle>
                    <CardDescription>
                      Businesses and pages you recently visited
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {browsingHistory && browsingHistory.length > 0 ? (
                      <div className="space-y-2">
                        {browsingHistory.slice(0, 8).map((entry) => (
                          <Link key={entry.id} href={entry.page_url}>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                  <Clock className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                                    {entry.business_name || "Page visited"}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {entry.sector && (
                                      <span className="capitalize">
                                        {entry.sector} &bull;{" "}
                                      </span>
                                    )}
                                    {new Date(
                                      entry.visited_at,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium mb-1">
                          No browsing history
                        </p>
                        <p className="text-sm text-slate-400">
                          Your visited businesses will appear here
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* INBOX TAB */}
              <TabsContent value="inbox" className="space-y-0">
                {isLoggedIn ? (
                  <Inbox
                    user={userSession!.user}
                    businesses={userBusinesses || []}
                    userRole={userRole}
                  />
                ) : (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        Sign in to access your inbox
                      </h3>
                      <p className="text-slate-500 mb-4">
                        View support tickets and connect with other businesses.
                      </p>
                      <Link href="/auth/signin">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Sign In
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* DISCOVER TAB */}
              <TabsContent value="discover" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-500" /> Popular
                      Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    ) : stats?.topCategories &&
                      stats.topCategories.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {stats.topCategories.map((category, idx) => {
                          const maxCount = stats.topCategories[0].count;
                          const pct = (category.count / maxCount) * 100;
                          return (
                            <Link
                              key={category.name}
                              href="/businesses-directory"
                            >
                              <div className="relative p-4 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 bottom-0 bg-indigo-50 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                                <div className="relative flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-base font-bold text-slate-400">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-medium text-slate-800 group-hover:text-indigo-700">
                                      {category.name}
                                    </span>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {category.count} businesses
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center py-6 text-slate-500">
                        No category data available
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-amber-500" /> New on the
                          Platform
                        </CardTitle>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/businesses-directory">See All</Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                      </div>
                    ) : stats?.recentListings &&
                      stats.recentListings.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recentListings.slice(0, 6).map((listing) => (
                          <div
                            key={listing.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 group-hover:text-blue-700">
                                  {listing.name}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {listing.location}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 text-slate-500">
                        No recent listings
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ACCOUNT TAB */}
              <TabsContent value="account" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-500" /> Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                          {(
                            userSession!.user.name ||
                            userSession!.user.email ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">
                            {userSession!.user.name || "User"}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {hasRealBusiness
                              ? `${tierDef.name} Plan`
                              : "General Account"}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">
                            {userSession!.user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">
                            Last sign-in: {memberSince}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <ShieldCheck className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600 capitalize">
                            Role: {userRole}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          setAccountSettingsTab("account");
                          setShowAccountSettings(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" /> Edit Account
                        Settings
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" /> Quick
                        Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        {
                          icon: Search,
                          label: "Browse Businesses",
                          href: "/businesses-directory",
                          color: "text-blue-500",
                        },
                        {
                          icon: CalendarDays,
                          label: "My Reservations",
                          href: "/reservations",
                          color: "text-amber-500",
                        },
                        {
                          icon: Package,
                          label: "Marketplace",
                          href: "/marketplace",
                          color: "text-emerald-500",
                        },
                        {
                          icon: Music,
                          label: "Music & Streaming",
                          href: "/music",
                          color: "text-pink-500",
                        },
                        {
                          icon: Users,
                          label: "Communities",
                          href: "/communities",
                          color: "text-purple-500",
                        },
                        {
                          icon: Briefcase,
                          label: "Job Board",
                          href: "/jobs",
                          color: "text-teal-500",
                        },
                        {
                          icon: FileText,
                          label: "Help & Docs",
                          href: "/help",
                          color: "text-slate-500",
                        },
                      ].map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link key={link.label} href={link.href}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                              <Icon className={`h-4 w-4 ${link.color}`} />
                              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                                {link.label}
                              </span>
                              <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
                            </div>
                          </Link>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
                {!hasRealBusiness && (
                  <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 mb-1">
                            Unlock More Features
                          </h3>
                          <p className="text-sm text-slate-600">
                            Upgrade to a Premium Subscriber or Business Owner
                            account for analytics, priority support, and
                            GeoAdmin tools.
                          </p>
                        </div>
                        <Button
                          asChild
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex-shrink-0"
                        >
                          <Link href="/apply">
                            <Sparkles className="h-4 w-4 mr-2" /> Explore
                            Portals
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             NOT LOGGED IN: Public Dashboard
             ═══════════════════════════════════════════════════════════════════ */
          <>
            <div className="text-center mb-12 pt-4">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
                Welcome to Verso Air Intelligence
              </h1>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-6">
                Explore our comprehensive business directory, make reservations,
                and discover opportunities across multiple sectors.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                >
                  <Link href="/auth/signin">
                    <User className="h-4 w-4" /> Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/apply">
                    <Globe className="h-4 w-4 mr-2" /> Create Account
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {statsLoading ? (
                <>
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </>
              ) : (
                <>
                  {[
                    {
                      title: "Total Businesses",
                      value: stats?.totalBusinesses || 0,
                      icon: ShoppingCart,
                      color: "blue",
                    },
                    {
                      title: "Categories",
                      value: stats?.categoriesCount || 0,
                      icon: BarChart3,
                      color: "indigo",
                    },
                    {
                      title: "Job Opportunities",
                      value: stats?.jobListings || 0,
                      icon: Briefcase,
                      color: "amber",
                    },
                    {
                      title: "Countries",
                      value:
                        stats?.countriesCount ||
                        (stats?.businessesByCountry
                          ? Object.keys(stats.businessesByCountry).length
                          : 0),
                      icon: MapPin,
                      color: "emerald",
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card
                        key={stat.title}
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-600">
                                {stat.title}
                              </p>
                              <p className="text-3xl font-bold text-slate-900 mt-2">
                                {stat.value.toLocaleString()}
                              </p>
                            </div>
                            <div
                              className={`p-3 rounded-lg bg-${stat.color}-100`}
                            >
                              <Icon
                                className={`h-6 w-6 text-${stat.color}-600`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Explore Sectors
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SECTORS.map((sector) => {
                  const Icon = sector.icon;
                  return (
                    <Link key={sector.name} href={sector.href}>
                      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-xl bg-gradient-to-br ${sector.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">
                              {sector.name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {sector.description}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Learn More
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "For Businesses",
                    desc: "Get listed, boost visibility, and reach more customers.",
                    href: "/businesses-directory",
                  },
                  {
                    title: "For Job Seekers",
                    desc: "Browse opportunities and grow your career.",
                    href: "/jobs",
                  },
                  {
                    title: "For Researchers",
                    desc: "Access data and analytics on business sectors.",
                    href: "/database-results",
                  },
                ].map((card) => (
                  <Card
                    key={card.title}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">{card.desc}</p>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={card.href}>View Details</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer className="mt-20 bg-slate-900 text-slate-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/businesses-directory">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
                      Businesses
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/communities">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
                      Communities
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
                      Marketplace
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
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
                      Documentation
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/help">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
                      Help
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/api">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
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
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
                      About
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-slate-300 hover:text-white"
                    >
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
                  <>
                    <li>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-slate-300 hover:text-white"
                        onClick={() => {
                          setAccountSettingsTab("account");
                          setShowAccountSettings(true);
                        }}
                      >
                        Settings
                      </Button>
                    </li>
                    <li>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-slate-300 hover:text-white"
                        onClick={handleLogout}
                      >
                        Sign Out
                      </Button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link href="/auth/signin">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-slate-300 hover:text-white"
                        >
                          Sign In
                        </Button>
                      </Link>
                    </li>
                    <li>
                      <Link href="/apply">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-slate-300 hover:text-white"
                        >
                          Create Account
                        </Button>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <Separator className="bg-slate-800 mb-6" />
          <div className="text-center text-sm text-slate-400">
            <p>&copy; 2026 VersoAir Intelligence. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <TierComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        currentTier={currentTier}
        onSelectTier={(tier: TierKey) => {
          alert(
            `Upgrade to ${TIERS[tier].name} \u2014 Payment integration coming soon!`,
          );
          setShowComparisonModal(false);
        }}
        hiddenSearches={hiddenSearches}
      />
      {renderDossierModal()}
      <AccountSettingsModal
        open={showAccountSettings}
        onOpenChange={setShowAccountSettings}
        defaultTab={accountSettingsTab}
        onBackToDashboard={() => setShowAccountSettings(false)}
      />
    </div>
  );
}

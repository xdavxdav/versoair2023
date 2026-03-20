import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { BusinessForm } from "@/components/BusinessForm";
import { EditBusinessForm } from "@/components/EditBusinessForm";
import { AccountSettingsModal } from "@/components/AccountSettingsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Pencil } from "lucide-react";

import {
  Database,
  Server,
  HardDrive,
  Activity,
  Users,
  ShoppingCart,
  Music,
  Briefcase,
  Layers,
  Eye,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Home,
  Settings,
  ChevronRight,
  AlertCircle,
  Shield,
  DatabaseZap,
  Table2,
  Link2,
  Rows,
  Timer,
  Zap,
  Sparkles,
  Bell,
  User,
  Clock,
  TrendingUp,
  ShieldCheck,
  Lock,
  Wifi,
  WifiOff,
  BarChart3,
  Globe,
  Map,
  History,
  Copy,
  MoreVertical,
  Grid,
  List,
  LayoutDashboard,
  FilterX,
  Check,
  X,
  AlertTriangle,
  Info,
  Menu,
  ExternalLink,
  Building,
  Target,
  Package,
  LogOut,
  ChevronLeft,
  ChevronUp,
  FileDown,
  Braces,
  Plus,
} from "lucide-react";

import ProgressBar from "@/components/ui/progress-bar";
import CategoryTree from "@/components/CategoryTree";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const THEME = {
  primary: "from-slate-700 to-slate-900",
  primaryLight: "from-slate-800/50 to-slate-900/50",
  accent: "from-slate-600 to-slate-800",
  success: "from-emerald-600/90 to-teal-700/90",
  warning: "from-amber-600/90 to-orange-700/90",
  danger: "from-rose-600/90 to-red-700/90",
  glass: "bg-white/10 backdrop-blur-2xl border border-white/10 shadow-2xl",
  card: "bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl hover:bg-white/[0.07] transition-all duration-500",
  badge: "bg-white/10 backdrop-blur-md text-slate-200 border border-white/20",
  gradient:
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen",
};

const EXPERT_CATEGORIES = [
  {
    id: "core",
    name: "Core Business",
    icon: Database,
    gradient: "bg-gradient-to-r from-blue-500/80 to-cyan-500/80",
    lightBg: "bg-blue-50",
    description: "Primary business tables and entities",
  },
  {
    id: "operations",
    name: "Operations",
    icon: Settings,
    gradient: "bg-gradient-to-r from-emerald-500/80 to-green-500/80",
    lightBg: "bg-emerald-50",
    description: "Operational and process tracking tables",
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Target,
    gradient: "bg-gradient-to-r from-purple-500/80 to-pink-500/80",
    lightBg: "bg-purple-50",
    description: "Marketing, campaigns, and engagement data",
  },
  {
    id: "geo",
    name: "Geography",
    icon: Globe,
    gradient: "bg-gradient-to-r from-amber-500/80 to-orange-500/80",
    lightBg: "bg-amber-50",
    description: "Location and geographic reference tables",
  },
  {
    id: "system",
    name: "System",
    icon: Shield,
    gradient: "bg-gradient-to-r from-gray-500/80 to-slate-500/80",
    lightBg: "bg-gray-50",
    description: "System, users, and configuration tables",
  },
];

const TABLE_META = {
  businesses: {
    displayName: "Businesses",
    icon: "🏢",
    description: "Main business entities and profiles",
    category: "core",
    importance: "critical",
    tags: ["primary", "indexed"],
  },
  business_categories: {
    displayName: "Business Categories",
    icon: "📂",
    description: "Business category taxonomy",
    category: "core",
    importance: "critical",
    tags: ["taxonomy", "reference"],
  },
  business_reviews: {
    displayName: "Reviews",
    icon: "⭐",
    description: "Customer reviews and ratings",
    category: "core",
    importance: "high",
    tags: ["engagement"],
  },
  business_hours: {
    displayName: "Business Hours",
    icon: "🕐",
    description: "Operating hours schedules",
    category: "core",
    importance: "medium",
    tags: ["schedule"],
  },
  business_media: {
    displayName: "Business Media",
    icon: "📸",
    description: "Photos, videos, and media assets",
    category: "core",
    importance: "medium",
    tags: ["media"],
  },
  business_amenities: {
    displayName: "Amenities",
    icon: "✨",
    description: "Business amenities and features",
    category: "core",
    importance: "medium",
    tags: ["features"],
  },
  users: {
    displayName: "Users",
    icon: "👤",
    description: "Platform user accounts",
    category: "system",
    importance: "critical",
    tags: ["auth", "primary"],
  },
  sessions: {
    displayName: "Sessions",
    icon: "🔑",
    description: "Active user sessions",
    category: "system",
    importance: "high",
    tags: ["auth"],
  },
  countries: {
    displayName: "Countries",
    icon: "🌍",
    description: "Country reference data",
    category: "geo",
    importance: "high",
    tags: ["reference", "geo"],
  },
  regions: {
    displayName: "Regions",
    icon: "🗺️",
    description: "Region and province data",
    category: "geo",
    importance: "high",
    tags: ["reference", "geo"],
  },
  cities: {
    displayName: "Cities",
    icon: "🏙️",
    description: "City and municipality data",
    category: "geo",
    importance: "high",
    tags: ["reference", "geo"],
  },
  artists: {
    displayName: "Artists",
    icon: "🎵",
    description: "Music artist profiles",
    category: "operations",
    importance: "medium",
    tags: ["entertainment"],
  },
  contractors: {
    displayName: "Contractors",
    icon: "🔧",
    description: "Service contractors and providers",
    category: "operations",
    importance: "medium",
    tags: ["services"],
  },
  payment_card_types: {
    displayName: "Payment Card Types",
    icon: "💳",
    description: "Accepted payment card reference",
    category: "system",
    importance: "low",
    tags: ["reference", "payments"],
  },
  tickets: {
    displayName: "Support Tickets",
    icon: "🎫",
    description: "Support and issue tickets",
    category: "operations",
    importance: "high",
    tags: ["support"],
  },
  reservations: {
    displayName: "Reservations",
    icon: "📅",
    description: "Booking and reservation records",
    category: "operations",
    importance: "high",
    tags: ["booking"],
  },
  jobs: {
    displayName: "Job Listings",
    icon: "💼",
    description: "Employment opportunities",
    category: "marketing",
    importance: "medium",
    tags: ["employment"],
  },
  promotions: {
    displayName: "Promotions",
    icon: "🏷️",
    description: "Marketing campaigns and promotions",
    category: "marketing",
    importance: "medium",
    tags: ["campaigns"],
  },
  analytics_events: {
    displayName: "Analytics Events",
    icon: "📊",
    description: "User behavior and event tracking",
    category: "marketing",
    importance: "high",
    tags: ["analytics"],
  },
};

const INDUSTRY_UI_MAP = {
  restaurant: {
    icon: "🍽️",
    color: "text-orange-600",
    gradient: "from-orange-500 to-red-500",
  },
  hotel: {
    icon: "🏨",
    color: "text-blue-600",
    gradient: "from-blue-500 to-indigo-500",
  },
  retail: {
    icon: "🛒",
    color: "text-emerald-600",
    gradient: "from-emerald-500 to-green-500",
  },
  construction: {
    icon: "🏗️",
    color: "text-amber-600",
    gradient: "from-amber-500 to-yellow-500",
  },
  automotive: {
    icon: "🚗",
    color: "text-red-600",
    gradient: "from-red-500 to-rose-500",
  },
  finance: {
    icon: "🏦",
    color: "text-indigo-600",
    gradient: "from-indigo-500 to-purple-500",
  },
  entertainment: {
    icon: "🎭",
    color: "text-pink-600",
    gradient: "from-pink-500 to-fuchsia-500",
  },
  healthcare: {
    icon: "🏥",
    color: "text-teal-600",
    gradient: "from-teal-500 to-cyan-500",
  },
  education: {
    icon: "🎓",
    color: "text-violet-600",
    gradient: "from-violet-500 to-purple-500",
  },
  technology: {
    icon: "💻",
    color: "text-cyan-600",
    gradient: "from-cyan-500 to-blue-500",
  },
};

const DEFAULT_INDUSTRY_UI = {
  icon: "🏢",
  color: "text-gray-600",
  gradient: "from-gray-500 to-slate-500",
};

// Helper functions
const formatNumber = (num: number) => {
  if (num === null || num === undefined) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const formatSize = (bytes: number) => {
  if (!bytes && bytes !== 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
};

const formatFileSize = (bytes: number) => {
  if (!bytes && bytes !== 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Helper to get top N by key
function getTopN(arr: any[], key: string, n: number) {
  return [...arr].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, n);
}

// Helper to get most recent N by updatedAt/createdAt
function getMostRecentN(arr: any[], n: number) {
  return [...arr]
    .filter((t) => t.updatedAt || t.createdAt)
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, n);
}

const getTimeSince = (date: Date | null) => {
  if (!date) return "Never";
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

const enrichTable = (apiTable: any) => {
  const meta = (TABLE_META as any)[apiTable.name] || {};
  return {
    ...apiTable,
    displayName: meta.displayName || apiTable.displayName || apiTable.name,
    icon: meta.icon || apiTable.icon || "📋",
    description:
      meta.description || apiTable.description || `Table: ${apiTable.name}`,
    category: meta.category || apiTable.category || "system",
    importance: meta.importance || apiTable.importance || "medium",
    tags: meta.tags || apiTable.tags || [],
    sizeMB: apiTable.size_mb || apiTable.sizeMB || 0,
    rowCount: apiTable.row_count || apiTable.rowCount || 0,
    columnCount: apiTable.column_count || apiTable.columns || 0,
    hasFK: apiTable.has_foreign_keys || apiTable.hasFK || false,
  };
};

// Memoized components
const ConnectionStatusBadge = memo(
  ({ connectionStatus }: { connectionStatus: string }) => (
    <Badge
      variant={connectionStatus === "connected" ? "default" : "destructive"}
      className={`text-xs gap-1 ${
        connectionStatus === "connected"
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          : connectionStatus === "connecting"
            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
      }`}
    >
      {connectionStatus === "connected" ? (
        <Wifi className="h-3 w-3" />
      ) : connectionStatus === "connecting" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {connectionStatus === "connected"
        ? "Connected"
        : connectionStatus === "connecting"
          ? "Connecting…"
          : "Disconnected"}
    </Badge>
  ),
);

ConnectionStatusBadge.displayName = "ConnectionStatusBadge";

const AdminOnlyBanner = memo(
  ({
    message = "Les données affichées sont en lecture seule. Les opérations CRUD sont réservées aux administrateurs autorisés via Geo Admin.",
  }: {
    message?: string;
  }) => (
    <div className="flex items-center gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <Lock className="h-6 w-6 text-amber-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-100">
          Mode lecture seule
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{message}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Eye className="h-3 w-3" /> Consultation
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Shield className="h-3 w-3" /> CRUD sous permission
          </span>
        </div>
      </div>
    </div>
  ),
);

AdminOnlyBanner.displayName = "AdminOnlyBanner";

const CategoryCard = memo(
  ({
    category,
    stats,
    isSelected,
    onClick,
  }: {
    category: (typeof EXPERT_CATEGORIES)[number];
    stats: Record<string, { tables: number; rows: number; size: number }>;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const categoryStats = stats[category.id] || { tables: 0, rows: 0, size: 0 };

    return (
      <Card
        className={`group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl hover:bg-white/[0.07] transition-all duration-500 overflow-hidden ${
          isSelected ? "ring-2 ring-slate-500 shadow-slate-700" : ""
        }`}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-3 rounded-xl ${category.gradient} text-white shadow-md backdrop-blur-md`}
            >
              <category.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">
                {category.name}
              </h3>
              <p className="text-xs text-slate-400">
                {categoryStats.tables} tables
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-slate-400">Records</div>
              <div className="font-semibold text-slate-200">
                {formatNumber(categoryStats.rows)}
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-slate-400">Size</div>
              <div className="font-semibold text-slate-200">
                {categoryStats.size > 0
                  ? `${categoryStats.size.toFixed(1)} MB`
                  : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

CategoryCard.displayName = "CategoryCard";

const StatCard = memo(
  ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
  }) => (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:bg-white/[0.07] transition-all duration-500 overflow-hidden group">
      <CardContent className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400 tracking-wide uppercase">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-100 mt-2 tracking-tight">
              {value}
            </p>
          </div>
          <div
            className={`p-4 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 border border-white/10 group-hover:scale-110 transition-transform duration-500`}
          >
            <Icon className="h-7 w-7 text-slate-200" />
          </div>
        </div>
      </CardContent>
    </Card>
  ),
);

StatCard.displayName = "StatCard";

const TableGridItem = memo(
  ({
    table,
    onViewData,
    onCopyName,
  }: {
    table: any;
    onViewData: (t: any) => void;
    onCopyName: (s: string) => void;
  }) => (
    <Card
      className="group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl hover:bg-white/[0.07] transition-all duration-500 overflow-hidden"
      onClick={() => onViewData(table)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{table.icon}</div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-100">
                {table.displayName}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {table.name}
              </CardDescription>
            </div>
          </div>
          {table.is_view && (
            <Badge
              variant="secondary"
              className="text-xs bg-white/10 border-white/20 text-slate-300"
            >
              VIEW
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">
          {table.description}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Rows:</span>
            <span className="font-medium text-slate-200">
              {formatNumber(table.rowCount)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Size:</span>
            <span className="font-medium text-slate-200">
              {formatSize((table.sizeMB || 0) * 1024 * 1024)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Columns:</span>
            <span className="font-medium text-slate-200">
              {table.columnCount}
            </span>
          </div>
        </div>
        {table.tags && table.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {table.tags.slice(0, 2).map((tag: string) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs bg-white/5 border-white/10 text-slate-300"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewData(table);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Data (read-only)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 bg-white/5 border-white/10 hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onCopyName(table.name);
          }}
        >
          <Copy className="h-3 w-3 text-slate-300" />
        </Button>
      </CardFooter>
    </Card>
  ),
);

TableGridItem.displayName = "TableGridItem";

const TableRowItem = memo(
  ({
    table,
    isSelected,
    onSelect,
    onViewData,
    onCopyName,
  }: {
    table: any;
    isSelected: boolean;
    onSelect: (s: string) => void;
    onViewData: (t: any) => void;
    onCopyName: (s: string) => void;
  }) => (
    <div
      className={`flex items-center justify-between p-6 rounded-2xl border hover:shadow-2xl transition-all duration-500 cursor-pointer group bg-white/5 backdrop-blur-xl ${
        isSelected
          ? "border-slate-500 bg-white/[0.07]"
          : "border-white/10 hover:border-white/20"
      }`}
      onClick={() => onSelect(table.name)}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="text-2xl">{table.icon}</div>
          {table.is_view && (
            <Badge className="mt-1 text-xs bg-white/10 border-white/20 text-slate-300">
              VIEW
            </Badge>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-100">
              {table.displayName}
            </h4>
            <Badge
              variant={
                table.importance === "critical"
                  ? "destructive"
                  : table.importance === "high"
                    ? "default"
                    : "secondary"
              }
              className="text-xs bg-white/10 border-white/20 text-slate-300"
            >
              {(table.importance || "medium").toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">{table.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge
              variant="outline"
              className="text-xs bg-white/5 border-white/10 text-slate-300"
            >
              <Table2 className="h-3 w-3 mr-1" />
              {table.columnCount} columns
            </Badge>
            <Badge
              variant="outline"
              className="text-xs bg-white/5 border-white/10 text-slate-300"
            >
              <Rows className="h-3 w-3 mr-1" />
              {formatNumber(table.rowCount)} rows
            </Badge>
            {table.hasFK && (
              <Badge
                variant="outline"
                className="text-xs bg-white/5 border-white/10 text-slate-300"
              >
                <Link2 className="h-3 w-3 mr-1" />
                Foreign Keys
              </Badge>
            )}
            {(table.tags || []).slice(0, 2).map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-white/5 border-white/10 text-slate-300"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewData(table);
                }}
                className="h-8 w-8 p-0 bg-white/5 border-white/10 hover:bg-white/10"
              >
                <Eye className="h-4 w-4 text-slate-300" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 bg-white/5 border-white/10 hover:bg-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-slate-300" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-slate-900/95 backdrop-blur-xl border-white/10"
          >
            <DropdownMenuLabel className="text-slate-200">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onCopyName(table.name)}
              className="text-slate-300"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Table Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-right">
          <div className="font-semibold text-slate-100">
            {formatSize((table.sizeMB || 0) * 1024 * 1024)}
          </div>
          <div className="text-xs text-slate-400">Size</div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  ),
);

TableRowItem.displayName = "TableRowItem";

// Main component
export default function DatabaseExpert({
  username,
  tier = "free",
  role,
}: {
  username: string | null;
  tier?: string;
  role?: string | null;
}) {
  const canManage = tier !== "free";
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [manageSearch, setManageSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState<
    "account" | "preferences"
  >("account");
  const [selectedBusinessType, setSelectedBusinessType] = useState<
    string | null
  >(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("all");
  const [showViewDataModal, setShowViewDataModal] = useState(false);
  const [currentTableData, setCurrentTableData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const recordsPerPage = 20;

  // ── Business search state ──
  const [businessSearch, setBusinessSearch] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // ── Add Artist dialog state ──
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [isSubmittingArtist, setIsSubmittingArtist] = useState(false);
  const [newArtist, setNewArtist] = useState({
    stageName: "",
    genre: "",
    labelStatus: "unsigned",
    spotifyUrl: "",
    countryCode: "",
  });

  // ── Edit Artist dialog state ──
  const [showEditArtist, setShowEditArtist] = useState(false);
  const [isUpdatingArtist, setIsUpdatingArtist] = useState(false);
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [editArtist, setEditArtist] = useState({
    stageName: "",
    genre: "",
    labelStatus: "unsigned",
    spotifyUrl: "",
    countryCode: "",
  });

  // ── Delete Artist state ──
  const [deleteArtistTarget, setDeleteArtistTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isDeletingArtist, setIsDeletingArtist] = useState(false);

  // ── Add Job dialog state ──
  const [showAddJob, setShowAddJob] = useState(false);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    sector: "general",
    countryCode: "",
    description: "",
    experienceLevel: "",
    isRemote: false,
  });

  // ── Edit Job dialog state ──
  const [showEditJob, setShowEditJob] = useState(false);
  const [isUpdatingJob, setIsUpdatingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editJob, setEditJob] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    sector: "general",
    countryCode: "",
    description: "",
    experienceLevel: "",
    isRemote: false,
  });

  // ── Delete Job state ──
  const [deleteJobTarget, setDeleteJobTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "info",
      title: "Geo Admin Observer",
      description: "Read-only view — use Admin Dashboard for changes",
      time: "now",
      read: false,
    },
  ]);

  // Health check query
  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ["database-expert-health"],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
          ...data,
          database: { ...data.database, connected: true },
        };
      } catch (error: any) {
        console.error("Health check failed:", error);
        return {
          success: false,
          message: error.message || "Connection failed",
          database: {
            connected: false,
            name: "versoair_business_intelligence",
            version: "Unknown",
            uptime: "0",
            connections: 0,
          },
        };
      }
    },
    retry: 2,
    refetchInterval: autoRefresh ? 30000 : false,
    refetchOnWindowFocus: true,
  });

  // Tables query
  const {
    data: tablesData = [],
    refetch: refetchTables,
    isLoading: isLoadingTables,
  } = useQuery({
    queryKey: ["database-expert-tables"],
    queryFn: async () => {
      if (!healthData?.database?.connected) return [];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`${API_BASE_URL}/api/tables`, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        clearTimeout(timeoutId);

        if (!response.ok) return [];

        const data = await response.json();
        const raw = Array.isArray(data) ? data : data.data || data.tables || [];
        return raw.map(enrichTable);
      } catch (error) {
        console.warn("Tables fetch failed:", error);
        return [];
      }
    },
    enabled: healthData?.database?.connected === true,
    staleTime: 30000,
  });

  // Business categories query (re-fetches when country changes)
  const { data: businessCategories = [], isLoading: isCategoriesLoading } =
    useQuery({
      queryKey: ["business-categories", selectedCountryCode],
      queryFn: async () => {
        try {
          const params = new URLSearchParams();
          if (selectedCountryCode && selectedCountryCode !== "all") {
            params.set("countryCode", selectedCountryCode);
          }
          const response = await fetch(
            `${API_BASE_URL}/api/business-categories?${params}`,
          );
          if (!response.ok) return [];
          const data = await response.json();
          return Array.isArray(data) ? data : data.data || [];
        } catch (error) {
          console.warn("Categories fetch failed:", error);
          return [];
        }
      },
      staleTime: 60000,
    });

  // Countries query (for country filter)
  const { data: countriesList = [] } = useQuery({
    queryKey: ["geo-countries"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/countries`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 300000,
  });

  // Tickets query
  const { data: ticketsData = [] } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tickets`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    enabled: false, // Disabled by default since endpoint may not exist
  });

  // Database stats query
  const { data: dbStats } = useQuery({
    queryKey: ["database-stats"],
    queryFn: async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/database-stats`,
        );
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    enabled: healthData?.database?.connected === true,
  });

  // Businesses query
  const { data: businessesData = [], isLoading: isBusinessesLoading } =
    useQuery({
      queryKey: ["geo-businesses", selectedBusinessType, selectedCountryCode],
      queryFn: async () => {
        try {
          const params = new URLSearchParams({ limit: "50" });
          if (selectedBusinessType) {
            params.set("categoryId", selectedBusinessType);
          }
          if (selectedCountryCode && selectedCountryCode !== "all") {
            params.set("countryCode", selectedCountryCode);
          }
          const response = await fetch(
            `${API_BASE_URL}/api/businesses?${params}`,
          );
          if (!response.ok) return [];
          const data = await response.json();
          return Array.isArray(data) ? data : data.data || [];
        } catch {
          return [];
        }
      },
      staleTime: 30000,
    });

  // Artists query (country-filtered)
  const { data: artistsData = [], isLoading: isArtistsLoading } = useQuery({
    queryKey: ["geo-artists", selectedCountryCode],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (selectedCountryCode && selectedCountryCode !== "all") {
          params.set("countryCode", selectedCountryCode);
        }
        const response = await fetch(
          `${API_BASE_URL}/api/artists/search?${params}`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  // Jobs query (country-filtered)
  const { data: jobsData = [], isLoading: isJobsLoading } = useQuery({
    queryKey: ["geo-jobs", selectedCountryCode],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (selectedCountryCode && selectedCountryCode !== "all") {
          params.set("countryCode", selectedCountryCode);
        }
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/search?${params}`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  // Ad campaigns query (country-filtered)
  const { data: adCampaignsData = [], isLoading: isAdsLoading } = useQuery({
    queryKey: ["geo-ads", selectedCountryCode],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (selectedCountryCode && selectedCountryCode !== "all") {
          params.set("countryCode", selectedCountryCode);
        }
        const response = await fetch(
          `${API_BASE_URL}/api/ad-campaigns?${params}`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  // Update connection status based on health data
  useEffect(() => {
    if (healthData) {
      setConnectionStatus(
        healthData.database?.connected ? "connected" : "disconnected",
      );
      setLastFetchTime(new Date());
    }
  }, [healthData]);

  // Filter tables based on search and category
  const filteredTables = useMemo(() => {
    if (!tablesData.length) return [];

    return tablesData.filter((table: any) => {
      const matchesSearch =
        searchQuery === "" ||
        table.name.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        (table.displayName || "")
          .toLowerCase()
          .startsWith(searchQuery.toLowerCase()) ||
        (table.description || "")
          .toLowerCase()
          .startsWith(searchQuery.toLowerCase()) ||
        (table.tags || []).some((tag: string) =>
          tag.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );

      const matchesCategory =
        selectedCategory === "all" || table.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, tablesData]);

  // Calculate category statistics and find top category
  const { categoryStats, topCategory } = useMemo(() => {
    const stats: Record<
      string,
      { tables: number; rows: number; size: number }
    > = {};
    let maxRows = 0;
    let topCat = null;
    tablesData.forEach((table: any) => {
      const cat = table.category || "system";
      if (!stats[cat]) {
        stats[cat] = { tables: 0, rows: 0, size: 0 };
      }
      stats[cat].tables += 1;
      stats[cat].rows += table.rowCount || 0;
      stats[cat].size += table.sizeMB || 0;
      if (stats[cat].rows > maxRows) {
        maxRows = stats[cat].rows;
        topCat = cat;
      }
    });
    return { categoryStats: stats, topCategory: topCat };
  }, [tablesData]);

  // Top 5 largest tables by row count
  const topTables = useMemo(
    () => getTopN(tablesData, "rowCount", 5),
    [tablesData],
  );
  // 5 most recently updated/created tables
  const recentTables = useMemo(
    () => getMostRecentN(tablesData, 5),
    [tablesData],
  );

  // Handlers
  const handleCopyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `"${text}" copied to clipboard`,
    });
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleRefresh = useCallback(() => {
    refetchHealth();
    refetchTables();
    toast({ title: "Refreshing data..." });
  }, [refetchHealth, refetchTables]);

  const handleSelectTable = useCallback((tableName: string) => {
    setSelectedTable(tableName);
  }, []);

  const handleViewData = useCallback(async (table: any) => {
    const tableName = typeof table === "string" ? table : table.name;
    setSelectedTable(tableName);
    await fetchTableData(tableName);
    setShowViewDataModal(true);
  }, []);

  const fetchTableData = async (tableName: string, page: number = 1) => {
    setIsLoadingData(true);
    try {
      let url;

      if (tableName === "businesses") {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(recordsPerPage),
        });
        if (selectedBusinessType) {
          params.set("categoryId", selectedBusinessType);
        }
        if (selectedCountryCode && selectedCountryCode !== "all") {
          params.set("countryCode", selectedCountryCode);
        }
        url = `${API_BASE_URL}/api/businesses?${params}`;
      } else {
        // Fallback to direct table access
        url = `${API_BASE_URL}/api/table/${tableName}?page=${page}&limit=${recordsPerPage}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();
      const rows = Array.isArray(data) ? data : data.data || data.rows || [];
      const total = data.total || data.count || rows.length;

      setCurrentTableData(rows);
      setTotalRecords(total);
      setCurrentPage(page);

      return data;
    } catch (error: any) {
      console.error("Error fetching table data:", error);
      toast({
        title: "Error Loading Data",
        description: error.message || "Failed to load table data",
        variant: "destructive",
      });
      setCurrentTableData([]);
      setTotalRecords(0);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Get current table details
  const currentTableDetails = useMemo(() => {
    return tablesData.find((t: any) => t.name === selectedTable);
  }, [selectedTable, tablesData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Overlay when menu is open */}
      {showMobileMenu && <div className="fixed inset-0 z-40 bg-black/50" />}

      {/* Header */}
      <div
        className={`sticky top-0 z-50 bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl transition-all duration-300 ${
          showMobileMenu ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-slate-400 hover:text-slate-100 hover:bg-white/5"
                onClick={() => setShowMobileMenu(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-slate-400 hover:text-slate-100 hover:bg-white/5"
                >
                  <Home className="h-4 w-4" />
                  Accueil
                </Button>
              </Link>

              <Link href="/geo-admin/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-slate-400 hover:text-slate-100 hover:bg-white/5"
                >
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              <div className="hidden lg:flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-2xl border border-white/10">
                  <DatabaseZap className="h-6 w-6 text-slate-200" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
                    Geo Admin Observer
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-white/5 border-white/10 text-slate-300"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Lecture seule
                    </Badge>
                    <ConnectionStatusBadge
                      connectionStatus={connectionStatus}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative text-slate-400 hover:text-slate-100 hover:bg-white/5"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.filter((n) => !n.read).length > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 bg-rose-500 rounded-full" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-slate-100 hover:bg-white/5"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Data</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-6 bg-white/10" />

              <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 text-slate-300 hover:bg-white/5 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-slate-200 font-semibold border border-white/10">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-slate-200">
                        {username || "User"}
                      </div>
                      <div className="text-xs text-emerald-400/80">
                        {role || "Admin Access"}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-slate-900/95 backdrop-blur-xl border-white/10"
                >
                  <DropdownMenuLabel className="text-slate-200">
                    {username || "User"} · {role || "Admin"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/geo-admin/dashboard"
                      className="cursor-pointer text-slate-300 flex items-center"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/annuaire-tv"
                      className="cursor-pointer text-amber-300 flex items-center"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      <span>📺 Annuaire TV</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      setAccountSettingsTab("account");
                      setShowAccountSettings(true);
                    }}
                    className="cursor-pointer text-slate-300 flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAccountSettingsTab("preferences");
                      setShowAccountSettings(true);
                    }}
                    className="cursor-pointer text-slate-300 flex items-center"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    <span>Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      localStorage.removeItem("auth_token");
                      localStorage.removeItem("authToken");
                      localStorage.removeItem("geoadmin_session");
                      localStorage.removeItem("geoadmin_username");
                      localStorage.removeItem("geoadmin_login_time");
                      window.location.href = "/geo-admin";
                    }}
                    className="cursor-pointer text-red-400 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Notifications dropdown */}
        {showNotifications && (
          <div className="absolute right-4 top-16 w-80 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">Notifications</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Mark all read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(false)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="h-64">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-white/10 hover:bg-white/5 ${
                      !notification.read ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
                        <Info className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-100 text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {notification.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <AdminOnlyBanner />

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tables"
            value={dbStats?.activeTables ?? tablesData.length ?? 0}
            icon={Database}
            color="from-indigo-500 to-purple-600"
          />
          <StatCard
            title="Total Businesses"
            value={
              dbStats?.tableCounts?.businesses ?? businessesData.length ?? "—"
            }
            icon={Building}
            color="from-emerald-500 to-green-600"
          />
          {/* Highlight top category by records */}
          {topCategory && (
            <StatCard
              title={`Top Category: ${EXPERT_CATEGORIES.find((c) => c.id === topCategory)?.name || topCategory}`}
              value={
                formatNumber(categoryStats[topCategory]?.rows || 0) + " records"
              }
              icon={Layers}
              color="from-blue-500 to-cyan-500"
            />
          )}
          <StatCard
            title="Categories"
            value={
              dbStats?.tableCounts?.business_categories ??
              businessCategories.length ??
              0
            }
            icon={Layers}
            color="from-purple-500 to-pink-600"
          />
          <StatCard
            title="DB Health"
            value={connectionStatus === "connected" ? "Online" : "Offline"}
            icon={Activity}
            color="from-cyan-500 to-blue-600"
          />
        </div>

        {/* Top 5 Largest Tables */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            Top 5 Largest Tables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topTables.map((table) => (
              <Card
                key={table.name}
                className="bg-white/5 border border-white/10"
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{table.icon}</span>
                    <span className="font-semibold text-slate-100">
                      {table.displayName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{table.name}</div>
                  <div className="flex gap-4 text-xs mt-2">
                    <span>
                      Rows:{" "}
                      <span className="font-bold text-slate-200">
                        {formatNumber(table.rowCount)}
                      </span>
                    </span>
                    <span>
                      Size:{" "}
                      <span className="font-bold text-slate-200">
                        {formatSize((table.sizeMB || 0) * 1024 * 1024)}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recently Updated Tables */}
        <div className="mt-8 mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            Recently Updated Tables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTables.map((table) => (
              <Card
                key={table.name}
                className="bg-white/5 border border-white/10"
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{table.icon}</span>
                    <span className="font-semibold text-slate-100">
                      {table.displayName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{table.name}</div>
                  <div className="flex gap-4 text-xs mt-2">
                    <span>
                      Updated:{" "}
                      <span className="font-bold text-slate-200">
                        {table.updatedAt
                          ? new Date(table.updatedAt).toLocaleString()
                          : table.createdAt
                            ? new Date(table.createdAt).toLocaleString()
                            : "—"}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Connection status */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    connectionStatus === "connected"
                      ? "bg-emerald-500/20"
                      : "bg-rose-500/20"
                  }`}
                >
                  {connectionStatus === "connected" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-100">
                    Database:{" "}
                    <span className="font-mono text-sm text-slate-300">
                      {healthData?.database?.name ||
                        "versoair_business_intelligence"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Last checked: {getTimeSince(lastFetchTime)}
                    {autoRefresh && " • Auto-refresh ON"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label className="text-xs text-slate-400">Auto-refresh</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Country Selector */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Globe className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium text-slate-200">
                  Country Filter
                </span>
                <Select
                  value={selectedCountryCode}
                  onValueChange={setSelectedCountryCode}
                >
                  <SelectTrigger className="w-full sm:w-56 bg-white/5 border-white/10 text-slate-200 h-9">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-h-72">
                    <SelectItem value="all" className="text-slate-300">
                      🌍 All Countries
                    </SelectItem>
                    {countriesList.map((c: any) => (
                      <SelectItem
                        key={c.code || c.id}
                        value={c.code}
                        className="text-slate-300"
                      >
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCountryCode && selectedCountryCode !== "all" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-500/20 border-amber-400/30 text-amber-300"
                  >
                    🔍 {selectedCountryCode}
                  </Badge>
                )}
              </div>
              {selectedCountryCode && selectedCountryCode !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCountryCode("all")}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap sm:grid sm:grid-cols-8 w-full min-h-[3.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-1.5 gap-1">
            <TabsTrigger
              value="dashboard"
              className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            {canManage && (
              <TabsTrigger
                value="manage"
                className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Manage</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="businesses"
              className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
            >
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Businesses</span>
            </TabsTrigger>
            <TabsTrigger
              value="artists"
              className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
            >
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Artists</span>
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
            <TabsTrigger
              value="tables"
              className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tables</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400 text-xs sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-slate-100 text-slate-400"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {EXPERT_CATEGORIES.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  stats={categoryStats}
                  isSelected={selectedCategory === category.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? "all" : category.id,
                    )
                  }
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Zap className="h-5 w-5" />
                    Quick Navigation
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Access key areas of the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      onClick={() => setActiveTab("businesses")}
                    >
                      <Building className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Browse Businesses</div>
                        <div className="text-xs text-slate-400">
                          View business directory
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      onClick={() => setActiveTab("tables")}
                    >
                      <Table2 className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Browse Tables</div>
                        <div className="text-xs text-slate-400">
                          Explore database schema
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      onClick={() => setActiveTab("analytics")}
                    >
                      <BarChart3 className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">View Analytics</div>
                        <div className="text-xs text-slate-400">
                          Database metrics
                        </div>
                      </div>
                    </Button>
                    <Link href="/geo-admin/dashboard">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      >
                        <Shield className="h-5 w-5 text-amber-400" />
                        <div className="text-left">
                          <div className="font-medium">
                            TAM (Ticket Assignment Management)
                          </div>
                          <div className="text-xs text-slate-400">
                            Full CRUD access
                          </div>
                        </div>
                      </Button>
                    </Link>
                    <Link href="/geo-admin/business-verification">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      >
                        <div className="flex items-center gap-1">
                          <Shield className="h-5 w-5 text-emerald-400" />
                          <Sparkles className="h-4 w-4 text-amber-300" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Digital Passport</div>
                          <div className="text-xs text-slate-400">
                            Business verification
                          </div>
                        </div>
                      </Button>
                    </Link>
                    <Link href="/geo-admin/immobilier">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-900/40 text-slate-300"
                      >
                        <div className="flex items-center gap-1">
                          <Home className="h-5 w-5 text-emerald-400" />
                          <Sparkles className="h-4 w-4 text-amber-300" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Portail Immobilier</div>
                          <div className="text-xs text-emerald-400">
                            Vente & location premium
                          </div>
                        </div>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Bell className="h-5 w-5" />
                      Support Tickets
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Tickets overview ({ticketsData.length})
                    </CardDescription>
                  </div>
                  <Link href="/tickets">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {ticketsData.length > 0 ? (
                      <div className="space-y-3">
                        {ticketsData.slice(0, 5).map((ticket) => (
                          <div
                            key={ticket.id}
                            className="p-3 rounded-lg border border-white/10 hover:bg-white/5 bg-white/5"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-slate-100">
                                  {ticket.title || ticket.subject || "Untitled"}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                  {ticket.description ||
                                    ticket.message ||
                                    "No description"}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  ticket.status === "open"
                                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                    : ticket.status === "closed"
                                      ? "bg-green-500/20 text-green-300 border-green-500/30"
                                      : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                }`}
                              >
                                {ticket.status || "open"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm">No tickets found</p>
                        <p className="text-xs mt-1">
                          Tickets API may be unavailable
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Tab - Business Management (paid tiers only) */}
          {canManage && (
            <TabsContent value="manage" className="space-y-8 mt-8">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Settings className="h-5 w-5" />
                    Business Management
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Add, view, and manage businesses in your directory. All
                    actions are performed directly by country.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-300">
                        <p className="font-medium">Approval Required</p>
                        <p className="text-blue-300/80 mt-1">
                          When you add a business, it will be submitted for
                          approval. A registration PDF is auto-generated and
                          emailed to the admin team. Once approved, the business
                          goes live in the directory.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <BusinessForm
                      defaultCountryCode={selectedCountryCode}
                      requireApproval={true}
                      username={username}
                      onSuccess={() => {
                        // Refresh businesses data when new business is added
                        queryClient.invalidateQueries({
                          queryKey: ["geo-businesses"],
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["businesses"],
                        });
                      }}
                    />
                  </div>

                  {/* ── Business List with Edit / Delete ── */}
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Your Businesses
                        {selectedCountryCode !== "all" && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            filtered by {selectedCountryCode}
                          </span>
                        )}
                      </h3>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <Input
                          placeholder="Search businesses…"
                          value={manageSearch}
                          onChange={(e) => setManageSearch(e.target.value)}
                          className="pl-8 h-9 bg-white/5 border-white/10 text-slate-100 text-sm placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {isBusinessesLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton
                            key={i}
                            className="h-16 w-full rounded-lg bg-white/5 border border-white/10"
                          />
                        ))}
                      </div>
                    ) : (
                      (() => {
                        const filtered = businessesData.filter(
                          (b: any) =>
                            !manageSearch ||
                            b.name
                              ?.toLowerCase()
                              .includes(manageSearch.toLowerCase()),
                        );
                        return filtered.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500">
                              {filtered.length} businesses
                            </p>
                            {filtered.map((biz: any) => (
                              <div
                                key={biz.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all group"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-200 truncate">
                                      {biz.name}
                                    </span>
                                    {/* Approval status badge */}
                                    {biz.approval_status === "pending" ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-amber-500/20 border-amber-400/30 text-amber-300"
                                      >
                                        ⏳ Pending
                                      </Badge>
                                    ) : biz.approval_status === "rejected" ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-red-500/20 border-red-400/30 text-red-300"
                                      >
                                        ❌ Rejected
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${
                                          (biz.is_active ?? true)
                                            ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                                            : "bg-red-500/20 border-red-400/30 text-red-300"
                                        }`}
                                      >
                                        {(biz.is_active ?? true)
                                          ? "✅ Approved"
                                          : "Inactive"}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                    {(biz.category_name ||
                                      biz.categoryName) && (
                                      <span>
                                        {biz.category_name || biz.categoryName}
                                      </span>
                                    )}
                                    {biz.country_code && (
                                      <span>🌍 {biz.country_code}</span>
                                    )}
                                    {biz.city_name && (
                                      <span>📍 {biz.city_name}</span>
                                    )}
                                    {biz.phone && <span>📞 {biz.phone}</span>}
                                  </div>
                                </div>

                                {/* Edit & Delete actions */}
                                <div className="flex items-center gap-1 ml-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <EditBusinessForm
                                    business={biz}
                                    onSuccess={() => {
                                      queryClient.invalidateQueries({
                                        queryKey: ["geo-businesses"],
                                      });
                                      queryClient.invalidateQueries({
                                        queryKey: ["business-categories"],
                                      });
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                    onClick={() =>
                                      setDeleteTarget({
                                        id: biz.id,
                                        name: biz.name,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Building className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                            <p className="text-sm">No businesses found</p>
                            <p className="text-xs mt-1 text-slate-500">
                              {manageSearch
                                ? "Try a different search"
                                : "Use the Add Business button above"}
                            </p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Delete Confirmation Dialog */}
              <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
              >
                <AlertDialogContent className="bg-slate-950 border border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-slate-100">
                      Delete Business
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      Are you sure you want to permanently delete{" "}
                      <strong className="text-slate-200">
                        {deleteTarget?.name}
                      </strong>
                      ? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      className="border-white/10 text-slate-300 hover:bg-white/5"
                      disabled={isDeleting}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={isDeleting}
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!deleteTarget) return;
                        setIsDeleting(true);
                        try {
                          const response = await fetch(
                            `${API_BASE_URL}/api/businesses/${deleteTarget.id}`,
                            {
                              method: "DELETE",
                            },
                          );
                          if (!response.ok) {
                            const err = await response.json();
                            throw new Error(err.error || "Delete failed");
                          }
                          toast({
                            title: "Deleted",
                            description: `"${deleteTarget.name}" has been removed`,
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["geo-businesses"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["business-categories"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["database-stats"],
                          });
                          setDeleteTarget(null);
                        } catch (error) {
                          console.error("Delete error:", error);
                          toast({
                            title: "Error",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Failed to delete",
                            variant: "destructive",
                          });
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Deleting…
                        </>
                      ) : (
                        "Delete Permanently"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>
          )}

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-8 mt-8">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Building className="h-5 w-5" />
                      Business Directory
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Browse and add businesses by category and country
                    </CardDescription>
                  </div>
                  <BusinessForm
                    defaultCountryCode={selectedCountryCode}
                    requireApproval={true}
                    username={username}
                    onSuccess={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["geo-businesses"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["businesses"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["business-categories"],
                      });
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isCategoriesLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-16 w-full rounded-md bg-white/5 border border-white/10"
                      />
                    ))}
                  </div>
                ) : (
                  (() => {
                    const visibleCats = businessCategories
                      .filter((cat: any) => (cat.business_count || 0) > 0)
                      .sort(
                        (a: any, b: any) =>
                          (b.business_count || 0) - (a.business_count || 0),
                      );
                    const COLLAPSED_LIMIT = 6;
                    const hasMore = visibleCats.length > COLLAPSED_LIMIT;
                    const catsToShow = showAllCategories
                      ? visibleCats
                      : visibleCats.slice(0, COLLAPSED_LIMIT);
                    return (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={
                              !selectedBusinessType ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setSelectedBusinessType(null)}
                            className={`whitespace-nowrap ${
                              !selectedBusinessType
                                ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white"
                                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            All (
                            {businessCategories.reduce(
                              (sum: number, c: any) =>
                                sum + (c.business_count || 0),
                              0,
                            )}{" "}
                            businesses · {businessCategories.length} categories)
                          </Button>
                          {catsToShow.map((cat: any) => {
                            const slug = (cat.slug || cat.name || "")
                              .toLowerCase()
                              .replace(/\s+/g, "-");
                            const uiInfo =
                              (INDUSTRY_UI_MAP as any)[slug] ||
                              DEFAULT_INDUSTRY_UI;
                            return (
                              <Button
                                key={cat.id}
                                variant={
                                  selectedBusinessType === String(cat.id)
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  setSelectedBusinessType(
                                    selectedBusinessType === String(cat.id)
                                      ? null
                                      : String(cat.id),
                                  )
                                }
                                className={
                                  selectedBusinessType === String(cat.id)
                                    ? `bg-gradient-to-r ${uiInfo.gradient} text-white`
                                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                }
                              >
                                <span className="mr-1">{uiInfo.icon}</span>
                                {cat.name}
                                <span className="ml-1 text-xs opacity-70">
                                  ({cat.business_count})
                                </span>
                              </Button>
                            );
                          })}
                          {hasMore && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setShowAllCategories(!showAllCategories)
                              }
                              className="text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs"
                            >
                              {showAllCategories
                                ? "Show less ↑"
                                : `+${visibleCats.length - COLLAPSED_LIMIT} more ↓`}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Searchable Business Dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search businesses by name, address, or category…"
                      value={businessSearch}
                      onChange={(e) => {
                        setBusinessSearch(e.target.value);
                        setBizDropdownOpen(true);
                      }}
                      onFocus={() => setBizDropdownOpen(true)}
                      className="pl-10 bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500 h-11"
                    />
                    {businessSearch && (
                      <button
                        onClick={() => {
                          setBusinessSearch("");
                          setSelectedBusiness(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown results */}
                  {bizDropdownOpen &&
                    !isBusinessesLoading &&
                    (() => {
                      const filtered = businessesData.filter((biz: any) => {
                        if (!businessSearch.trim()) return true;
                        const q = businessSearch.toLowerCase();
                        return (
                          (biz.name || "").toLowerCase().includes(q) ||
                          (biz.address || "").toLowerCase().includes(q) ||
                          (biz.category_name || biz.categoryName || "")
                            .toLowerCase()
                            .includes(q) ||
                          (biz.phone || "").toLowerCase().includes(q)
                        );
                      });
                      const display = filtered.slice(0, 8);
                      return (
                        <div className="absolute z-50 w-full mt-1 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl max-h-[380px] overflow-y-auto">
                          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {filtered.length} business
                              {filtered.length !== 1 ? "es" : ""} found
                            </span>
                            <button
                              onClick={() => setBizDropdownOpen(false)}
                              className="text-xs text-slate-400 hover:text-slate-200"
                            >
                              Close ↑
                            </button>
                          </div>
                          {display.length > 0 ? (
                            display.map((biz: any) => {
                              const catSlug = (
                                biz.category_name ||
                                biz.categoryName ||
                                ""
                              )
                                .toLowerCase()
                                .replace(/\s+/g, "-");
                              const uiInfo =
                                (INDUSTRY_UI_MAP as any)[catSlug] ||
                                DEFAULT_INDUSTRY_UI;
                              return (
                                <button
                                  key={biz.id}
                                  onClick={() => {
                                    setSelectedBusiness(biz);
                                    setBusinessSearch(biz.name);
                                    setBizDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                                >
                                  <span className="text-lg flex-shrink-0">
                                    {uiInfo.icon}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-100 truncate">
                                      {biz.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {(biz.category_name ||
                                        biz.categoryName) && (
                                        <span className="text-xs text-slate-400">
                                          {biz.category_name ||
                                            biz.categoryName}
                                        </span>
                                      )}
                                      {biz.address && (
                                        <span className="text-xs text-slate-500 truncate">
                                          · 📍 {biz.address}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {biz.rating && (
                                      <span className="text-xs text-amber-400">
                                        ⭐ {biz.rating}
                                      </span>
                                    )}
                                    {biz.is_active !== undefined && (
                                      <span
                                        className={`w-2 h-2 rounded-full ${biz.is_active ? "bg-emerald-400" : "bg-slate-500"}`}
                                      />
                                    )}
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-6 text-center text-slate-400 text-sm">
                              No businesses match "{businessSearch}"
                            </div>
                          )}
                          {filtered.length > 8 && (
                            <div className="px-3 py-2 border-t border-white/5 text-center">
                              <span className="text-xs text-slate-500">
                                Showing 8 of {filtered.length} — refine your
                                search
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>

                {/* Selected Business Detail Card */}
                {selectedBusiness && (
                  <Card className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">
                          {
                            (
                              (INDUSTRY_UI_MAP as any)[
                                (
                                  selectedBusiness.category_name ||
                                  selectedBusiness.categoryName ||
                                  ""
                                )
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")
                              ] || DEFAULT_INDUSTRY_UI
                            ).icon
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-100">
                              {selectedBusiness.name}
                            </h3>
                            <Link href={`/business/${selectedBusiness.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                              >
                                View Page{" "}
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </Link>
                          </div>
                          {selectedBusiness.address && (
                            <p className="text-sm text-slate-400 mt-1">
                              📍 {selectedBusiness.address}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {(selectedBusiness.category_name ||
                              selectedBusiness.categoryName) && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-white/10 border-white/20 text-slate-300"
                              >
                                {selectedBusiness.category_name ||
                                  selectedBusiness.categoryName}
                              </Badge>
                            )}
                            {selectedBusiness.rating && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-amber-500/20 border-amber-400/30 text-amber-300"
                              >
                                ⭐ {selectedBusiness.rating}
                              </Badge>
                            )}
                            {selectedBusiness.country_code && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-500/20 border-blue-400/30 text-blue-300"
                              >
                                🌍 {selectedBusiness.country_code}
                              </Badge>
                            )}
                            {selectedBusiness.is_active !== undefined && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  selectedBusiness.is_active
                                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                                    : "bg-slate-500/20 border-slate-400/30 text-slate-400"
                                }`}
                              >
                                {selectedBusiness.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {selectedBusiness.phone && (
                              <div className="text-xs">
                                <span className="text-slate-500">Phone</span>
                                <p className="text-slate-300 mt-0.5">
                                  {selectedBusiness.phone}
                                </p>
                              </div>
                            )}
                            {selectedBusiness.email && (
                              <div className="text-xs">
                                <span className="text-slate-500">Email</span>
                                <p className="text-slate-300 mt-0.5 truncate">
                                  {selectedBusiness.email}
                                </p>
                              </div>
                            )}
                            {selectedBusiness.website && (
                              <div className="text-xs">
                                <span className="text-slate-500">Website</span>
                                <p className="text-slate-300 mt-0.5 truncate">
                                  {selectedBusiness.website}
                                </p>
                              </div>
                            )}
                            {selectedBusiness.city_name && (
                              <div className="text-xs">
                                <span className="text-slate-500">City</span>
                                <p className="text-slate-300 mt-0.5">
                                  {selectedBusiness.city_name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {!isBusinessesLoading && businessesData.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Building className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p>No businesses found</p>
                    <p className="text-xs mt-1">
                      {selectedBusinessType
                        ? "Try selecting a different category"
                        : "Business API may be unavailable"}
                    </p>
                  </div>
                )}

                {isBusinessesLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-400">
                      Loading businesses…
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Artists Tab */}
          <TabsContent value="artists" className="space-y-8 mt-8">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Music className="h-5 w-5 text-purple-400" />
                      Artists Directory
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedCountryCode !== "all"
                        ? `Artists in ${selectedCountryCode}`
                        : "All artists across countries"}
                      {" · "}
                      {artistsData.length} results
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-500/20 border-purple-400/30 text-purple-300"
                    >
                      {artistsData.length} artists
                    </Badge>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => {
                        setNewArtist((prev) => ({
                          ...prev,
                          countryCode:
                            selectedCountryCode !== "all"
                              ? selectedCountryCode
                              : "",
                        }));
                        setShowAddArtist(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Artist
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isArtistsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-32 w-full rounded-lg bg-white/5 border border-white/10"
                      />
                    ))}
                  </div>
                ) : artistsData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {artistsData.map((artist: any) => (
                      <Card
                        key={artist.id}
                        className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-slate-100 text-lg">
                              {artist.name}
                            </h3>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  artist.label_status === "signed"
                                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                                    : artist.label_status === "independent"
                                      ? "bg-blue-500/20 border-blue-400/30 text-blue-300"
                                      : "bg-slate-500/20 border-slate-400/30 text-slate-300"
                                }`}
                              >
                                {artist.label_status || "unsigned"}
                              </Badge>
                              {canManage && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10"
                                    onClick={() => {
                                      setEditingArtist(artist);
                                      setEditArtist({
                                        stageName:
                                          artist.name ||
                                          artist.stage_name ||
                                          "",
                                        genre: artist.genre || "",
                                        labelStatus:
                                          artist.label_status || "unsigned",
                                        spotifyUrl: artist.spotify_url || "",
                                        countryCode: artist.country_code || "",
                                      });
                                      setShowEditArtist(true);
                                    }}
                                    title="Edit artist"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                    onClick={() =>
                                      setDeleteArtistTarget({
                                        id: artist.id,
                                        name:
                                          artist.name ||
                                          artist.stage_name ||
                                          "Unknown",
                                      })
                                    }
                                    title="Delete artist"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {artist.genre && (
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Music className="h-3 w-3" />
                                <span>{artist.genre}</span>
                              </div>
                            )}
                            {artist.country_code && (
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Globe className="h-3 w-3" />
                                <span>{artist.country_code}</span>
                              </div>
                            )}
                            {artist.spotify_url && (
                              <a
                                href={artist.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Spotify</span>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No artists found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedCountryCode !== "all"
                        ? `No artists registered in ${selectedCountryCode}`
                        : "No artists in the database"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ad Campaigns section */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Target className="h-5 w-5 text-amber-400" />
                      Ad Campaigns
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedCountryCode !== "all"
                        ? `Advertising campaigns in ${selectedCountryCode}`
                        : "All advertising campaigns"}
                      {" · "}
                      {adCampaignsData.length} campaigns
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-500/20 border-amber-400/30 text-amber-300"
                  >
                    {adCampaignsData.length} campaigns
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isAdsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-16 w-full rounded-lg bg-white/5 border border-white/10"
                      />
                    ))}
                  </div>
                ) : adCampaignsData.length > 0 ? (
                  <div className="space-y-3">
                    {adCampaignsData.map((ad: any) => (
                      <div
                        key={ad.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-200">
                              {ad.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                ad.status === "active"
                                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                                  : ad.status === "paused"
                                    ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
                                    : "bg-slate-500/20 border-slate-400/30 text-slate-300"
                              }`}
                            >
                              {ad.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>{ad.objective}</span>
                            <span>${ad.daily_budget}/day</span>
                            {ad.business_name && (
                              <span>by {ad.business_name}</span>
                            )}
                            {ad.country_code && (
                              <span>📍 {ad.country_code}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No ad campaigns found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-8 mt-8">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Briefcase className="h-5 w-5 text-blue-400" />
                      Jobs Directory
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedCountryCode !== "all"
                        ? `Job listings in ${selectedCountryCode}`
                        : "All job listings across countries"}
                      {" · "}
                      {jobsData.length} results
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-500/20 border-blue-400/30 text-blue-300"
                    >
                      {jobsData.length} jobs
                    </Badge>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setNewJob((prev) => ({
                          ...prev,
                          countryCode:
                            selectedCountryCode !== "all"
                              ? selectedCountryCode
                              : "",
                        }));
                        setShowAddJob(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Request Job
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isJobsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-24 w-full rounded-lg bg-white/5 border border-white/10"
                      />
                    ))}
                  </div>
                ) : jobsData.length > 0 ? (
                  <div className="space-y-3">
                    {jobsData.map((job: any) => (
                      <Card
                        key={job.id}
                        className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-slate-100">
                                {job.title}
                              </h3>
                              <p className="text-sm text-slate-400">
                                {job.company} · {job.location}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {job.is_featured && (
                                <Badge className="text-[10px] bg-amber-500/20 border-amber-400/30 text-amber-300">
                                  ⭐ Featured
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  job.type === "remote"
                                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                                    : "bg-blue-500/20 border-blue-400/30 text-blue-300"
                                }`}
                              >
                                {job.type || "full-time"}
                              </Badge>
                              {canManage && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-slate-400 hover:text-blue-300 hover:bg-blue-500/10"
                                    onClick={() => {
                                      setEditingJob(job);
                                      setEditJob({
                                        title: job.title || "",
                                        company: job.company || "",
                                        location: job.location || "",
                                        type: job.type || "Full-time",
                                        sector: job.sector || "general",
                                        countryCode: job.country_code || "",
                                        description: job.description || "",
                                        experienceLevel:
                                          job.experience_level || "",
                                        isRemote: job.is_remote || false,
                                      });
                                      setShowEditJob(true);
                                    }}
                                    title="Edit job"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                    onClick={() =>
                                      setDeleteJobTarget({
                                        id: job.id,
                                        title: job.title || "Unknown",
                                      })
                                    }
                                    title="Delete job"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            {job.sector && (
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {job.sector}
                              </span>
                            )}
                            {(job.salary_min || job.salary_max) && (
                              <span className="flex items-center gap-1">
                                💰 {job.salary_min?.toLocaleString()} -{" "}
                                {job.salary_max?.toLocaleString()}{" "}
                                {job.currency}
                              </span>
                            )}
                            {job.experience_level && (
                              <span className="flex items-center gap-1">
                                📊 {job.experience_level}
                              </span>
                            )}
                            {job.is_remote && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                🏠 Remote
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No jobs found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedCountryCode !== "all"
                        ? `No jobs listed in ${selectedCountryCode}`
                        : "No jobs in the database"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-8 mt-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search tables by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-40 bg-white/5 border-white/10 text-slate-200">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="all" className="text-slate-300">
                      All Categories
                    </SelectItem>
                    {EXPERT_CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="text-slate-300"
                      >
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center border border-white/10 rounded-md overflow-hidden bg-white/5">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-none text-slate-300"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-none text-slate-300"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <FilterX className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={
                  selectedCategory === "all"
                    ? `bg-gradient-to-r ${THEME.primary} text-white`
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }
              >
                All ({tablesData.length})
              </Button>
              {EXPERT_CATEGORIES.map((cat) => {
                const count = categoryStats[cat.id]?.tables || 0;
                return (
                  <Button
                    key={cat.id}
                    variant={
                      selectedCategory === cat.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={
                      selectedCategory === cat.id
                        ? `bg-gradient-to-r ${cat.gradient} text-white`
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }
                  >
                    <cat.icon className="h-4 w-4 mr-1" />
                    {cat.name} ({count})
                  </Button>
                );
              })}
            </div>

            {isLoadingTables ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-48 w-full rounded-lg bg-white/5 border border-white/10"
                  />
                ))}
              </div>
            ) : filteredTables.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTables.map((table: any) => (
                    <TableGridItem
                      key={table.name}
                      table={table}
                      onViewData={handleViewData}
                      onCopyName={handleCopyToClipboard}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTables.map((table: any) => (
                    <TableRowItem
                      key={table.name}
                      table={table}
                      isSelected={selectedTable === table.name}
                      onSelect={handleSelectTable}
                      onViewData={handleViewData}
                      onCopyName={handleCopyToClipboard}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-16">
                <Database className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-300">
                  No tables found
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : connectionStatus !== "connected"
                      ? "Connect to the database to view tables"
                      : "No tables available"}
                </p>
              </div>
            )}

            {selectedTable && currentTableDetails && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{currentTableDetails.icon}</div>
                      <div>
                        <CardTitle className="text-slate-100">
                          {currentTableDetails.displayName}
                        </CardTitle>
                        <CardDescription className="font-mono text-slate-400">
                          {selectedTable}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewData(currentTableDetails)}
                        className="gap-2 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      >
                        <Eye className="h-4 w-4" />
                        View Data
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTable(null)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                      <div className="text-2xl font-bold text-slate-100">
                        {currentTableDetails.columnCount}
                      </div>
                      <div className="text-xs text-slate-400">Columns</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                      <div className="text-2xl font-bold text-slate-100">
                        {formatNumber(currentTableDetails.rowCount)}
                      </div>
                      <div className="text-xs text-slate-400">Rows</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                      <div className="text-2xl font-bold text-slate-100">
                        {formatSize(
                          (currentTableDetails.sizeMB || 0) * 1024 * 1024,
                        )}
                      </div>
                      <div className="text-xs text-slate-400">Size</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg text-center border border-white/10">
                      <div className="text-2xl font-bold text-slate-100">
                        {currentTableDetails.indexes || 0}
                      </div>
                      <div className="text-xs text-slate-400">Indexes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-8">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <BarChart3 className="h-5 w-5" />
                  Database Analytics
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-slate-100 mb-4">
                        Storage Distribution
                      </h4>
                      <div className="space-y-4">
                        {EXPERT_CATEGORIES.map((category) => {
                          const stats = categoryStats[category.id];
                          const totalSize = Object.values(categoryStats).reduce(
                            (sum, s) => sum + s.size,
                            0,
                          );
                          const percentage =
                            stats && totalSize > 0
                              ? (stats.size / totalSize) * 100
                              : 0;
                          return (
                            <div key={category.id} className="space-y-2">
                              <div className="flex justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-3 w-3 rounded-full ${category.gradient}`}
                                  />
                                  <span className="text-sm text-slate-300">
                                    {category.name}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-slate-200">
                                  {formatSize((stats?.size || 0) * 1024 * 1024)}
                                </span>
                              </div>
                              <Progress
                                value={percentage}
                                className="h-2 bg-white/5"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-100 mb-4">
                        Performance Metrics
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                              Cache Hit Rate
                            </span>
                          </div>
                          <span className="font-semibold text-emerald-400">
                            98.7%
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                              Average Query Time
                            </span>
                          </div>
                          <span className="font-semibold text-amber-400">
                            42ms
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                              Active Connections
                            </span>
                          </div>
                          <span className="font-semibold text-blue-400">
                            {healthData?.database?.connections || 12}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-slate-100 mb-4">
                        Record Distribution
                      </h4>
                      <div className="space-y-4">
                        {EXPERT_CATEGORIES.map((category) => {
                          const stats = categoryStats[category.id];
                          const totalRows = Object.values(categoryStats).reduce(
                            (sum, s) => sum + s.rows,
                            0,
                          );
                          const percentage =
                            stats && totalRows > 0
                              ? (stats.rows / totalRows) * 100
                              : 0;
                          return (
                            <div key={category.id} className="space-y-2">
                              <div className="flex justify-between">
                                <div className="flex items-center gap-2">
                                  <category.icon className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm text-slate-300">
                                    {category.name}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-slate-200">
                                  {formatNumber(stats?.rows || 0)}
                                </span>
                              </div>
                              <ProgressBar
                                percent={Math.round(
                                  Math.max(0, Math.min(100, percentage)),
                                )}
                                className="h-2"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-100 mb-4">
                        Database Health
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-slate-200">
                              Connection Status
                            </span>
                          </div>
                          <Badge
                            variant="default"
                            className="bg-emerald-500/20 text-emerald-300"
                          >
                            {connectionStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                              Uptime
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-200">
                            {healthData?.database?.uptime || "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                              Database Version
                            </span>
                          </div>
                          <span className="text-sm font-mono text-slate-200">
                            {healthData?.database?.version || "PostgreSQL"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-8 mt-8">
            <AdminOnlyBanner message="La gestion des catégories (ajout, modification, suppression) est réservée au panneau Admin." />

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Layers className="h-5 w-5" />
                  Categories
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Parent → Subcategories view (read-only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-slate-200 mb-3">
                      Category Tree
                    </h4>
                    <CategoryTree source="admin" />
                  </div>

                  <aside className="md:col-span-1 space-y-4">
                    <div className="p-4 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 shadow-xl">
                      <h5 className="font-medium text-slate-100">
                        Category Usage
                      </h5>
                      <p className="text-sm text-slate-400 mt-2">
                        Top categories by business count
                      </p>
                      <ul className="mt-3 space-y-2">
                        {businessCategories.slice(0, 10).map((cat: any) => {
                          const count = businessesData.filter(
                            (b: any) =>
                              b.category_id === cat.id ||
                              b.categoryId === cat.id,
                          ).length;
                          const total = businessesData.length || 1;
                          const pct = Math.round((count / total) * 100);

                          return (
                            <li key={cat.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-200 truncate">
                                  {cat.name}
                                </div>
                                <div className="text-sm text-slate-300 font-medium">
                                  {count}
                                </div>
                              </div>
                              <Progress
                                value={pct}
                                className="h-2 rounded bg-white/5"
                              />
                            </li>
                          );
                        })}
                        {businessCategories.length === 0 && (
                          <li className="text-sm text-slate-400">
                            No category stats available
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="p-4 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 shadow-xl">
                      <h5 className="font-medium text-slate-100">
                        All Categories
                      </h5>
                      <div className="mt-3 space-y-3">
                        {businessCategories.length > 0 ? (
                          (() => {
                            const parents = businessCategories
                              .filter((c: any) => !c.parent_id)
                              .sort((a: any, b: any) =>
                                a.name.localeCompare(b.name),
                              );

                            return parents.map((p: any) => (
                              <div key={p.id} className="space-y-1">
                                <div className="font-medium text-slate-100 truncate text-sm">
                                  {p.name}
                                </div>
                                <div className="pl-4 space-y-1">
                                  {businessCategories
                                    .filter((c: any) => c.parent_id === p.id)
                                    .map((ch: any) => (
                                      <div
                                        key={ch.id}
                                        className="text-sm text-slate-400"
                                      >
                                        ↳ {ch.name}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ));
                          })()
                        ) : (
                          <div className="text-sm text-slate-400">
                            No categories available
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scroll to top button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-2xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 border border-white/10"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <ChevronUp className="h-5 w-5 text-slate-200" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Scroll to top</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mobile menu sheet */}
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetContent
          side="left"
          className="w-72 bg-slate-900/95 backdrop-blur-xl border-white/10"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-slate-100">
              <DatabaseZap className="h-5 w-5" />
              Geo Admin
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Navigation
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {[
              { label: "Dashboard", tab: "dashboard", icon: LayoutDashboard },
              ...(canManage
                ? [{ label: "Manage", tab: "manage", icon: Settings }]
                : []),
              { label: "Businesses", tab: "businesses", icon: Building },
              { label: "Tables", tab: "tables", icon: Table2 },
              { label: "Analytics", tab: "analytics", icon: BarChart3 },
              { label: "Categories", tab: "categories", icon: Layers },
            ].map((item) => (
              <Button
                key={item.tab}
                variant={activeTab === item.tab ? "default" : "ghost"}
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => {
                  setActiveTab(item.tab);
                  setShowMobileMenu(false);
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
            <Separator className="my-4 bg-white/10" />
            <Link href="/geo-admin/dashboard">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 text-emerald-400 hover:bg-emerald-500/10 border-emerald-600"
              >
                <Shield className="h-4 w-4" />
                Platform Dashboard
              </Button>
            </Link>
            <Separator className="my-4 bg-white/10" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
              Services
            </p>
            <Link href="/services">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Zap className="h-4 w-4" />
                All Services
              </Button>
            </Link>
            <Link href="/services/news">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Bell className="h-4 w-4" />
                News & Updates
              </Button>
            </Link>
            <Link href="/services/careers">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Briefcase className="h-4 w-4" />
                Careers
              </Button>
            </Link>
            <Link href="/services/contractors">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Target className="h-4 w-4" />
                Contractors
              </Button>
            </Link>
            <Separator className="my-4 bg-white/10" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
              Quick Links
            </p>
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/reservations">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Clock className="h-4 w-4" />
                Reservations
              </Button>
            </Link>
            <Link href="/sav">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Settings className="h-4 w-4" />
                SAV 24/7
              </Button>
            </Link>
            <Link href="/versoai">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300"
                onClick={() => setShowMobileMenu(false)}
              >
                <Sparkles className="h-4 w-4" />
                VersoAI
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* View Data Modal */}
      <Dialog open={showViewDataModal} onOpenChange={setShowViewDataModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto overscroll-contain bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Eye className="h-5 w-5" />
              {selectedTable} — Data Viewer
              <Badge
                variant="outline"
                className="ml-2 text-xs bg-white/10 border-white/20 text-slate-300"
              >
                Read-only
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Viewing {totalRecords} records (page {currentPage})
            </DialogDescription>
          </DialogHeader>

          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : currentTableData.length > 0 ? (
            <div className="overflow-auto max-h-[55vh] overscroll-contain">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-white/5 sticky top-0">
                  <tr>
                    {Object.keys(currentTableData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left font-semibold text-slate-300 border-b border-white/10 text-xs"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentTableData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-white/10 hover:bg-white/5"
                    >
                      {Object.values(row).map((val, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 text-slate-300 max-w-[200px] truncate text-xs"
                        >
                          {val !== null && val !== undefined
                            ? typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val)
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Database className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p>No data found in this table</p>
            </div>
          )}

          {totalRecords > recordsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <p className="text-sm text-slate-400">
                Showing {(currentPage - 1) * recordsPerPage + 1}–
                {Math.min(currentPage * recordsPerPage, totalRecords)} of{" "}
                {totalRecords}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    selectedTable &&
                    fetchTableData(selectedTable, currentPage - 1)
                  }
                  className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage * recordsPerPage >= totalRecords}
                  onClick={() =>
                    selectedTable &&
                    fetchTableData(selectedTable, currentPage + 1)
                  }
                  className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Artist Dialog ── */}
      <Dialog open={showAddArtist} onOpenChange={setShowAddArtist}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Music className="h-5 w-5 text-purple-400" />
              Submit Artist Request
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Submit an artist for review — the admin team will be notified via
              email
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newArtist.stageName.trim()) {
                toast({
                  title: "Stage name is required",
                  variant: "destructive",
                });
                return;
              }
              setIsSubmittingArtist(true);
              try {
                const res = await fetch(`${API_BASE_URL}/api/request/artist`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    stageName: newArtist.stageName,
                    genre: newArtist.genre || null,
                    labelStatus: newArtist.labelStatus,
                    spotifyUrl: newArtist.spotifyUrl || null,
                    countryCode: newArtist.countryCode || null,
                    username: username || "GeoAdmin User",
                  }),
                });
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(
                    errData.error || "Failed to submit artist request",
                  );
                }
                toast({
                  title: "Request Submitted ✉️",
                  description: `Your request for "${newArtist.stageName}" has been sent to the admin team for review.`,
                });
                setNewArtist({
                  stageName: "",
                  genre: "",
                  labelStatus: "unsigned",
                  spotifyUrl: "",
                  countryCode: "",
                });
                setShowAddArtist(false);
                queryClient.invalidateQueries({ queryKey: ["geo-artists"] });
              } catch (err) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "Failed",
                  variant: "destructive",
                });
              } finally {
                setIsSubmittingArtist(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label className="text-slate-300">Stage Name *</Label>
              <Input
                value={newArtist.stageName}
                onChange={(e) =>
                  setNewArtist({ ...newArtist, stageName: e.target.value })
                }
                placeholder="e.g. DJ Arafat"
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Genre</Label>
              <Select
                value={newArtist.genre || ""}
                onValueChange={(val) =>
                  setNewArtist({ ...newArtist, genre: val })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                  {[
                    "Afrobeats",
                    "Afropop",
                    "Amapiano",
                    "Bikutsi",
                    "Bongo Flava",
                    "Coupé-Décalé",
                    "Dancehall",
                    "Drill",
                    "Folk",
                    "Funk",
                    "Gospel",
                    "Grime",
                    "Highlife",
                    "Hip-Hop",
                    "House",
                    "Jazz",
                    "Kizomba",
                    "Kuduro",
                    "Makossa",
                    "Mbalax",
                    "Ndombolo",
                    "Pop",
                    "R&B",
                    "Rap",
                    "Reggae",
                    "Rock",
                    "Rumba",
                    "Salsa",
                    "Soul",
                    "Trap",
                    "Zouk",
                    "Zouglou",
                    "Other",
                  ].map((genre) => (
                    <SelectItem
                      key={genre}
                      value={genre}
                      className="text-slate-100 hover:bg-white/10"
                    >
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Label Status</Label>
              <Select
                value={newArtist.labelStatus}
                onValueChange={(val) =>
                  setNewArtist({ ...newArtist, labelStatus: val })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsigned">Unsigned</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="independent">Independent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Country</Label>
              <Select
                value={newArtist.countryCode || ""}
                onValueChange={(val) =>
                  setNewArtist({ ...newArtist, countryCode: val })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                  {(countriesList as any[]).length > 0
                    ? (countriesList as any[])
                        .sort((a: any, b: any) =>
                          (a.name || "").localeCompare(b.name || ""),
                        )
                        .map((c: any) => (
                          <SelectItem
                            key={c.code}
                            value={c.code}
                            className="text-slate-100 hover:bg-white/10"
                          >
                            {c.name} ({c.code})
                          </SelectItem>
                        ))
                    : [
                        { code: "CI", name: "Côte d'Ivoire" },
                        { code: "NG", name: "Nigeria" },
                        { code: "US", name: "United States" },
                        { code: "FR", name: "France" },
                        { code: "GB", name: "United Kingdom" },
                        { code: "GH", name: "Ghana" },
                        { code: "CM", name: "Cameroon" },
                        { code: "SN", name: "Senegal" },
                        { code: "CD", name: "DR Congo" },
                        { code: "ZA", name: "South Africa" },
                      ].map((c) => (
                        <SelectItem
                          key={c.code}
                          value={c.code}
                          className="text-slate-100 hover:bg-white/10"
                        >
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Spotify URL</Label>
              <Input
                value={newArtist.spotifyUrl}
                onChange={(e) =>
                  setNewArtist({ ...newArtist, spotifyUrl: e.target.value })
                }
                placeholder="https://open.spotify.com/artist/…"
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400"
                onClick={() => setShowAddArtist(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingArtist}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              >
                {isSubmittingArtist ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSubmittingArtist ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Job Dialog ── */}
      <Dialog open={showAddJob} onOpenChange={setShowAddJob}>
        <DialogContent className="max-w-lg bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Briefcase className="h-5 w-5 text-blue-400" />
              Submit Job Request
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Submit a job listing for review — the admin team will be notified
              via email
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newJob.title.trim() || !newJob.company.trim()) {
                toast({
                  title: "Title and company are required",
                  variant: "destructive",
                });
                return;
              }
              setIsSubmittingJob(true);
              try {
                const res = await fetch(`${API_BASE_URL}/api/request/job`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: newJob.title,
                    company: newJob.company,
                    location: newJob.location || null,
                    type: newJob.type,
                    sector: newJob.sector,
                    countryCode: newJob.countryCode || null,
                    description: newJob.description || null,
                    experienceLevel: newJob.experienceLevel || null,
                    isRemote: newJob.isRemote,
                    username: username || "GeoAdmin User",
                  }),
                });
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(
                    errData.error || "Failed to submit job request",
                  );
                }
                toast({
                  title: "Request Submitted ✉️",
                  description: `Your request for "${newJob.title}" at "${newJob.company}" has been sent to the admin team for review.`,
                });
                setNewJob({
                  title: "",
                  company: "",
                  location: "",
                  type: "Full-time",
                  sector: "general",
                  countryCode: "",
                  description: "",
                  experienceLevel: "",
                  isRemote: false,
                });
                setShowAddJob(false);
                queryClient.invalidateQueries({ queryKey: ["geo-jobs"] });
              } catch (err) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "Failed",
                  variant: "destructive",
                });
              } finally {
                setIsSubmittingJob(false);
              }
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Job Title *</Label>
                <Input
                  value={newJob.title}
                  onChange={(e) =>
                    setNewJob({ ...newJob, title: e.target.value })
                  }
                  placeholder="e.g. Senior Software Engineer"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Company *</Label>
                <Input
                  value={newJob.company}
                  onChange={(e) =>
                    setNewJob({ ...newJob, company: e.target.value })
                  }
                  placeholder="e.g. TechNova"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Location</Label>
                <Input
                  value={newJob.location}
                  onChange={(e) =>
                    setNewJob({ ...newJob, location: e.target.value })
                  }
                  placeholder="e.g. Abidjan, CI"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Type</Label>
                <Select
                  value={newJob.type}
                  onValueChange={(val) => setNewJob({ ...newJob, type: val })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Country</Label>
                <Select
                  value={newJob.countryCode || ""}
                  onValueChange={(val) =>
                    setNewJob({ ...newJob, countryCode: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    {(countriesList as any[]).length > 0
                      ? (countriesList as any[])
                          .sort((a: any, b: any) =>
                            (a.name || "").localeCompare(b.name || ""),
                          )
                          .map((c: any) => (
                            <SelectItem
                              key={c.code}
                              value={c.code}
                              className="text-slate-100 hover:bg-white/10"
                            >
                              {c.name} ({c.code})
                            </SelectItem>
                          ))
                      : [
                          { code: "CI", name: "Côte d'Ivoire" },
                          { code: "NG", name: "Nigeria" },
                          { code: "US", name: "United States" },
                          { code: "FR", name: "France" },
                          { code: "GB", name: "United Kingdom" },
                        ].map((c) => (
                          <SelectItem
                            key={c.code}
                            value={c.code}
                            className="text-slate-100 hover:bg-white/10"
                          >
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Experience Level</Label>
                <Select
                  value={newJob.experienceLevel}
                  onValueChange={(val) =>
                    setNewJob({ ...newJob, experienceLevel: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead / Principal</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Sector</Label>
                <Select
                  value={newJob.sector}
                  onValueChange={(val) => setNewJob({ ...newJob, sector: val })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="hotellerie">Hospitality</SelectItem>
                    <SelectItem value="batiment">Construction</SelectItem>
                    <SelectItem value="finances">Finance</SelectItem>
                    <SelectItem value="sante">Health</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Input
                  value={newJob.description}
                  onChange={(e) =>
                    setNewJob({ ...newJob, description: e.target.value })
                  }
                  placeholder="Brief description of the role…"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Switch
                  checked={newJob.isRemote}
                  onCheckedChange={(checked) =>
                    setNewJob({ ...newJob, isRemote: checked })
                  }
                />
                <Label className="text-slate-300">Remote position</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400"
                onClick={() => setShowAddJob(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingJob}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {isSubmittingJob ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSubmittingJob ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Artist Dialog ── */}
      <Dialog open={showEditArtist} onOpenChange={setShowEditArtist}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Pencil className="h-5 w-5 text-purple-400" />
              Edit Artist
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update artist details
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editArtist.stageName.trim() || !editingArtist) {
                toast({
                  title: "Stage name is required",
                  variant: "destructive",
                });
                return;
              }
              setIsUpdatingArtist(true);
              try {
                const res = await fetch(
                  `${API_BASE_URL}/api/v1/admin/artists/${editingArtist.id}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      stageName: editArtist.stageName,
                      genre: editArtist.genre || null,
                      labelStatus: editArtist.labelStatus,
                      spotifyUrl: editArtist.spotifyUrl || null,
                    }),
                  },
                );
                if (!res.ok) throw new Error("Failed to update artist");
                toast({ title: "Artist updated successfully!" });
                setShowEditArtist(false);
                setEditingArtist(null);
                queryClient.invalidateQueries({ queryKey: ["geo-artists"] });
              } catch (err) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "Failed",
                  variant: "destructive",
                });
              } finally {
                setIsUpdatingArtist(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label className="text-slate-300">Stage Name *</Label>
              <Input
                value={editArtist.stageName}
                onChange={(e) =>
                  setEditArtist({ ...editArtist, stageName: e.target.value })
                }
                placeholder="e.g. DJ Arafat"
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Genre</Label>
              <Select
                value={editArtist.genre || ""}
                onValueChange={(val) =>
                  setEditArtist({ ...editArtist, genre: val })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                  {[
                    "Afrobeats",
                    "Afropop",
                    "Amapiano",
                    "Bikutsi",
                    "Bongo Flava",
                    "Coupé-Décalé",
                    "Dancehall",
                    "Drill",
                    "Folk",
                    "Funk",
                    "Gospel",
                    "Grime",
                    "Highlife",
                    "Hip-Hop",
                    "House",
                    "Jazz",
                    "Kizomba",
                    "Kuduro",
                    "Makossa",
                    "Mbalax",
                    "Ndombolo",
                    "Pop",
                    "R&B",
                    "Rap",
                    "Reggae",
                    "Rock",
                    "Rumba",
                    "Salsa",
                    "Soul",
                    "Trap",
                    "Zouk",
                    "Zouglou",
                    "Other",
                  ].map((genre) => (
                    <SelectItem
                      key={genre}
                      value={genre}
                      className="text-slate-100 hover:bg-white/10"
                    >
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Label Status</Label>
              <Select
                value={editArtist.labelStatus}
                onValueChange={(val) =>
                  setEditArtist({ ...editArtist, labelStatus: val })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsigned">Unsigned</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="independent">Independent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Country</Label>
              <Select
                value={editArtist.countryCode || ""}
                onValueChange={(val) =>
                  setEditArtist({ ...editArtist, countryCode: val })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                  {(countriesList as any[]).length > 0
                    ? (countriesList as any[])
                        .sort((a: any, b: any) =>
                          (a.name || "").localeCompare(b.name || ""),
                        )
                        .map((c: any) => (
                          <SelectItem
                            key={c.code}
                            value={c.code}
                            className="text-slate-100 hover:bg-white/10"
                          >
                            {c.name} ({c.code})
                          </SelectItem>
                        ))
                    : [
                        { code: "CI", name: "Côte d'Ivoire" },
                        { code: "NG", name: "Nigeria" },
                        { code: "US", name: "United States" },
                        { code: "FR", name: "France" },
                        { code: "GB", name: "United Kingdom" },
                        { code: "GH", name: "Ghana" },
                        { code: "CM", name: "Cameroon" },
                        { code: "SN", name: "Senegal" },
                        { code: "CD", name: "DR Congo" },
                        { code: "ZA", name: "South Africa" },
                      ].map((c) => (
                        <SelectItem
                          key={c.code}
                          value={c.code}
                          className="text-slate-100 hover:bg-white/10"
                        >
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Spotify URL</Label>
              <Input
                value={editArtist.spotifyUrl}
                onChange={(e) =>
                  setEditArtist({ ...editArtist, spotifyUrl: e.target.value })
                }
                placeholder="https://open.spotify.com/artist/…"
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400"
                onClick={() => setShowEditArtist(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingArtist}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              >
                {isUpdatingArtist ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isUpdatingArtist ? "Updating…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Artist Confirmation ── */}
      <AlertDialog
        open={!!deleteArtistTarget}
        onOpenChange={(open) => !open && setDeleteArtistTarget(null)}
      >
        <AlertDialogContent className="bg-slate-950 border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete Artist
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-200">
                {deleteArtistTarget?.name}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 text-slate-300 hover:bg-white/5"
              disabled={isDeletingArtist}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeletingArtist}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteArtistTarget) return;
                setIsDeletingArtist(true);
                try {
                  const response = await fetch(
                    `${API_BASE_URL}/api/v1/admin/artists/${deleteArtistTarget.id}`,
                    { method: "DELETE", credentials: "include" },
                  );
                  if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || "Delete failed");
                  }
                  toast({
                    title: "Deleted",
                    description: `"${deleteArtistTarget.name}" has been removed`,
                  });
                  queryClient.invalidateQueries({ queryKey: ["geo-artists"] });
                  setDeleteArtistTarget(null);
                } catch (error) {
                  console.error("Delete artist error:", error);
                  toast({
                    title: "Error",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Failed to delete",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeletingArtist(false);
                }
              }}
            >
              {isDeletingArtist ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                "Delete Artist"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit Job Dialog ── */}
      <Dialog open={showEditJob} onOpenChange={setShowEditJob}>
        <DialogContent className="max-w-lg bg-slate-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Pencil className="h-5 w-5 text-blue-400" />
              Submit Job Edit Request
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Submit updated job details for review — the admin team will be
              notified via email
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !editJob.title.trim() ||
                !editJob.company.trim() ||
                !editingJob
              ) {
                toast({
                  title: "Title and company are required",
                  variant: "destructive",
                });
                return;
              }
              setIsUpdatingJob(true);
              try {
                const res = await fetch(`${API_BASE_URL}/api/request/job`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: editJob.title,
                    company: editJob.company,
                    location: editJob.location || null,
                    type: editJob.type,
                    sector: editJob.sector,
                    countryCode: editJob.countryCode || null,
                    description: editJob.description || null,
                    experienceLevel: editJob.experienceLevel || null,
                    isRemote: editJob.isRemote,
                    username: username || "GeoAdmin User",
                  }),
                });
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(
                    errData.error || "Failed to submit job edit request",
                  );
                }
                toast({
                  title: "Edit Request Submitted ✉️",
                  description: `Your edit request for "${editJob.title}" has been sent to the admin team for review.`,
                });
                setShowEditJob(false);
                setEditingJob(null);
                queryClient.invalidateQueries({ queryKey: ["geo-jobs"] });
              } catch (err) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "Failed",
                  variant: "destructive",
                });
              } finally {
                setIsUpdatingJob(false);
              }
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Job Title *</Label>
                <Input
                  value={editJob.title}
                  onChange={(e) =>
                    setEditJob({ ...editJob, title: e.target.value })
                  }
                  placeholder="e.g. Senior Software Engineer"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Company *</Label>
                <Input
                  value={editJob.company}
                  onChange={(e) =>
                    setEditJob({ ...editJob, company: e.target.value })
                  }
                  placeholder="e.g. TechNova"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Location</Label>
                <Input
                  value={editJob.location}
                  onChange={(e) =>
                    setEditJob({ ...editJob, location: e.target.value })
                  }
                  placeholder="e.g. Abidjan, CI"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Type</Label>
                <Select
                  value={editJob.type}
                  onValueChange={(val) => setEditJob({ ...editJob, type: val })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Country</Label>
                <Select
                  value={editJob.countryCode || ""}
                  onValueChange={(val) =>
                    setEditJob({ ...editJob, countryCode: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    {(countriesList as any[]).length > 0
                      ? (countriesList as any[])
                          .sort((a: any, b: any) =>
                            (a.name || "").localeCompare(b.name || ""),
                          )
                          .map((c: any) => (
                            <SelectItem
                              key={c.code}
                              value={c.code}
                              className="text-slate-100 hover:bg-white/10"
                            >
                              {c.name} ({c.code})
                            </SelectItem>
                          ))
                      : [
                          { code: "CI", name: "Côte d'Ivoire" },
                          { code: "NG", name: "Nigeria" },
                          { code: "US", name: "United States" },
                          { code: "FR", name: "France" },
                          { code: "GB", name: "United Kingdom" },
                        ].map((c) => (
                          <SelectItem
                            key={c.code}
                            value={c.code}
                            className="text-slate-100 hover:bg-white/10"
                          >
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Experience Level</Label>
                <Select
                  value={editJob.experienceLevel}
                  onValueChange={(val) =>
                    setEditJob({ ...editJob, experienceLevel: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead / Principal</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Sector</Label>
                <Select
                  value={editJob.sector}
                  onValueChange={(val) =>
                    setEditJob({ ...editJob, sector: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="hotellerie">Hospitality</SelectItem>
                    <SelectItem value="batiment">Construction</SelectItem>
                    <SelectItem value="finances">Finance</SelectItem>
                    <SelectItem value="sante">Health</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Input
                  value={editJob.description}
                  onChange={(e) =>
                    setEditJob({ ...editJob, description: e.target.value })
                  }
                  placeholder="Brief description of the role…"
                  className="bg-white/5 border-white/10 text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Switch
                  checked={editJob.isRemote}
                  onCheckedChange={(checked) =>
                    setEditJob({ ...editJob, isRemote: checked })
                  }
                />
                <Label className="text-slate-300">Remote position</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400"
                onClick={() => setShowEditJob(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingJob}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {isUpdatingJob ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isUpdatingJob ? "Submitting…" : "Submit Edit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Job Confirmation ── */}
      <AlertDialog
        open={!!deleteJobTarget}
        onOpenChange={(open) => !open && setDeleteJobTarget(null)}
      >
        <AlertDialogContent className="bg-slate-950 border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete Job
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Request deletion of{" "}
              <strong className="text-slate-200">
                {deleteJobTarget?.title}
              </strong>
              ? The admin team will be notified via email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 text-slate-300 hover:bg-white/5"
              disabled={isDeletingJob}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeletingJob}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteJobTarget) return;
                setIsDeletingJob(true);
                try {
                  const response = await fetch(
                    `${API_BASE_URL}/api/request/job`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: `[DELETE REQUEST] ${deleteJobTarget.title}`,
                        company: "—",
                        description: `GeoAdmin requested deletion of job listing: "${deleteJobTarget.title}" (ID: ${deleteJobTarget.id})`,
                        username: username || "GeoAdmin User",
                      }),
                    },
                  );
                  if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || "Request failed");
                  }
                  toast({
                    title: "Deletion Request Submitted ✉️",
                    description: `Your request to delete "${deleteJobTarget.title}" has been sent to the admin team.`,
                  });
                  setDeleteJobTarget(null);
                } catch (error) {
                  console.error("Delete job error:", error);
                  toast({
                    title: "Error",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Failed to delete",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeletingJob(false);
                }
              }}
            >
              {isDeletingJob ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                "Request Deletion"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ ACCOUNT SETTINGS & PREFERENCES MODAL ═══ */}
      <AccountSettingsModal
        open={showAccountSettings}
        onOpenChange={setShowAccountSettings}
        defaultTab={accountSettingsTab}
      />
    </div>
  );
}
